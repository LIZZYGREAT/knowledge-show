import asyncio
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from pydantic import BaseModel

from knowledge.config import KnowledgeSettings, load_settings
from knowledge.llm_client import (
    APIKeyMissingError,
    DeepSeekClient,
    ModelOutputError,
    ModelResult,
    generate_validated_json,
)
from knowledge.search_client import (
    DeepSeekSearchClient,
    FetchAPIError,
    SearchAPIError,
    normalize_url,
)
from knowledge.service import ModelCallBudget


def settings(api_key="test-key"):
    return KnowledgeSettings(
        api_key=api_key,
        base_url="https://api.deepseek.com",
        model="deepseek-flash",
        timeout_seconds=5,
        data_dir=Path("/tmp/knowledge-data"),
        export_dir=Path("/tmp/knowledge-exports"),
    )


def test_settings_reads_local_env_without_exposing_key(monkeypatch):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "local-test-key")
    result = load_settings()

    assert result.api_key == "local-test-key"
    assert result.model == "deepseek-flash"


def test_missing_key_is_an_explicit_error():
    with pytest.raises(APIKeyMissingError, match="DEEPSEEK_API_KEY"):
        DeepSeekClient(settings(api_key=None))


def test_responses_api_client_returns_json_and_token_usage():
    class Responses:
        async def create(self, **kwargs):
            assert kwargs["model"] == "deepseek-flash"
            assert kwargs["store"] is False
            assert kwargs["text"] == {"format": {"type": "json_object"}}
            assert kwargs["reasoning"] == {"effort": "none"}
            return SimpleNamespace(
                output_text='{"answer": "ok"}',
                usage=SimpleNamespace(input_tokens=10, output_tokens=5, total_tokens=15),
                id="resp-test",
            )

    fake_client = SimpleNamespace(responses=Responses())
    result = asyncio.run(
        DeepSeekClient(settings(), client=fake_client).generate_json(
            role="research", prompt="Return JSON", data={"topic": "x"}
        )
    )

    assert result.value == {"answer": "ok"}
    assert result.usage["total_tokens"] == 15
    assert result.response_id == "resp-test"


def test_responses_api_client_extracts_text_from_message_items():
    class Responses:
        async def create(self, **kwargs):
            return {
                "id": "resp-nested",
                "output_text": "",
                "output": [
                    {"type": "reasoning", "summary": [{"text": "private"}]},
                    {
                        "type": "message",
                        "content": [{"type": "output_text", "text": "{\"answer\":true}"}],
                    },
                ],
                "usage": {"input_tokens": 1, "output_tokens": 2, "total_tokens": 3},
            }

    result = asyncio.run(
        DeepSeekClient(settings(), client=SimpleNamespace(responses=Responses())).generate_json(
            role="research", prompt="Return JSON", data={"topic": "x"}
        )
    )

    assert result.value == {"answer": True}


class _Answer(BaseModel):
    answer: str


def test_structured_output_syntax_error_gets_one_repair_and_aggregates_usage():
    class Client:
        def __init__(self):
            self.outputs = [
                ModelOutputError(
                    "invalid JSON",
                    raw_output="{",
                    usage={"input_tokens": 2, "output_tokens": 3, "total_tokens": 5},
                ),
                ModelResult(
                    {"answer": "fixed"},
                    {"input_tokens": 7, "output_tokens": 11, "total_tokens": 18},
                ),
            ]
            self.calls = []

        async def generate_json(self, **kwargs):
            self.calls.append(kwargs)
            output = self.outputs.pop(0)
            if isinstance(output, Exception):
                raise output
            return output

    client = Client()
    budget = ModelCallBudget(client, limit=2)
    parsed, usage = asyncio.run(
        generate_validated_json(
            budget,
            _Answer,
            role="research",
            prompt="Return one answer.",
            data={"topic": "test"},
        )
    )

    assert parsed.answer == "fixed"
    assert len(client.calls) == budget.calls == 2
    assert usage == budget.usage == {
        "input_tokens": 9,
        "output_tokens": 14,
        "total_tokens": 23,
    }
    assert "untrusted data" in client.calls[1]["prompt"]
    assert client.calls[1]["data"]["invalid_output"] == "{"


def test_structured_output_field_error_gets_one_bounded_repair():
    class Client:
        def __init__(self):
            self.calls = 0

        async def generate_json(self, **kwargs):
            self.calls += 1
            value = {"other": "bad shape"} if self.calls == 1 else {"answer": "valid"}
            return ModelResult(
                value,
                {"input_tokens": 1, "output_tokens": 2, "total_tokens": 3},
            )

    client = Client()
    parsed, usage = asyncio.run(
        generate_validated_json(
            ModelCallBudget(client, limit=2),
            _Answer,
            role="creative",
            prompt="Return the answer field.",
            data={"topic": "test"},
        )
    )

    assert parsed.answer == "valid"
    assert client.calls == 2
    assert usage["total_tokens"] == 6


def test_structured_output_repair_respects_model_call_budget():
    class Client:
        def __init__(self):
            self.calls = 0

        async def generate_json(self, **kwargs):
            self.calls += 1
            return ModelResult(
                {"other": "bad shape"},
                {"input_tokens": 1, "output_tokens": 1, "total_tokens": 2},
            )

    client = Client()
    budget = ModelCallBudget(client, limit=1)
    with pytest.raises(RuntimeError, match=r"model-call limit \(1\)"):
        asyncio.run(
            generate_validated_json(
                budget,
                _Answer,
                role="verifier",
                prompt="Return an answer.",
                data={"topic": "test"},
            )
        )

    assert client.calls == budget.calls == 1
    assert budget.usage["total_tokens"] == 2


def test_failed_output_repair_keeps_token_usage_for_both_model_calls():
    class Client:
        def __init__(self):
            self.calls = 0

        async def generate_json(self, **kwargs):
            self.calls += 1
            raise ModelOutputError(
                "invalid JSON",
                raw_output="{",
                usage={
                    "input_tokens": self.calls,
                    "output_tokens": 2,
                    "total_tokens": self.calls + 2,
                },
            )

    client = Client()
    budget = ModelCallBudget(client, limit=2)
    with pytest.raises(ModelOutputError, match="invalid JSON"):
        asyncio.run(
            generate_validated_json(
                budget,
                _Answer,
                role="research",
                prompt="Return an answer.",
                data={"topic": "test"},
            )
        )

    assert client.calls == budget.calls == 2
    assert budget.usage == {
        "input_tokens": 3,
        "output_tokens": 4,
        "total_tokens": 7,
    }


def test_http_failure_is_not_retried_as_output_repair():
    class Client:
        def __init__(self):
            self.calls = 0

        async def generate_json(self, **kwargs):
            self.calls += 1
            raise RuntimeError("DeepSeek request failed with HTTP 401")

    client = Client()
    with pytest.raises(RuntimeError, match="HTTP 401"):
        asyncio.run(
            generate_validated_json(
                ModelCallBudget(client, limit=3),
                _Answer,
                role="research",
                prompt="Return an answer.",
                data={"topic": "test"},
            )
        )

    assert client.calls == 1


def test_search_parses_fields_and_deduplicates_urls():
    calls = []

    async def handler(request):
        calls.append(request)
        return httpx.Response(
            200,
            json={
                "results": [
                    {
                        "title": "A source",
                        "url": "https://example.com/page#section",
                        "summary": "Source summary",
                        "snippet": "Snippet",
                        "authority": 3,
                        "rerank_score": 2.1,
                        "date": None,
                    },
                    {"title": "Duplicate", "url": "https://EXAMPLE.com/page"},
                ]
            },
        )

    client = httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        headers={"Authorization": "Bearer test-key"},
    )
    search = DeepSeekSearchClient(settings(), client=client)
    hits = asyncio.run(search.search("specific question", original_question="why?"))
    asyncio.run(client.aclose())

    assert len(hits) == 1
    assert hits[0].url == "https://example.com/page"
    assert hits[0].authority == 3
    assert calls[0].headers["authorization"] == "Bearer test-key"
    assert "test-key" not in repr(hits)


def test_fetch_validates_url_and_reports_missing_content():
    async def handler(request):
        return httpx.Response(200, json={"title": "Empty", "content": ""})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    search = DeepSeekSearchClient(settings(), client=client)
    with pytest.raises(ValueError, match="cannot include"):
        asyncio.run(search.fetch("https://user:pass@example.com/article"))
    with pytest.raises(FetchAPIError, match="no readable content"):
        asyncio.run(search.fetch("https://example.com/article"))
    asyncio.run(client.aclose())


def test_search_rejects_invalid_query_and_surfaces_http_errors():
    async def handler(request):
        return httpx.Response(401, json={"error": {"message": "invalid key"}})

    client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    search = DeepSeekSearchClient(settings(), client=client, retries=0)
    with pytest.raises(ValueError, match="between 1 and 128"):
        asyncio.run(search.search("  "))
    with pytest.raises(SearchAPIError, match="HTTP 401: invalid key"):
        asyncio.run(search.search("why?"))
    asyncio.run(client.aclose())


def test_normalize_url_rejects_non_http_scheme():
    with pytest.raises(ValueError, match="HTTP or HTTPS"):
        normalize_url("file:///etc/passwd")
