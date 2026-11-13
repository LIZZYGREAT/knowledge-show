import asyncio
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest

from knowledge.config import KnowledgeSettings, load_settings
from knowledge.llm_client import APIKeyMissingError, DeepSeekClient
from knowledge.search_client import (
    DeepSeekSearchClient,
    FetchAPIError,
    SearchAPIError,
    normalize_url,
)


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
