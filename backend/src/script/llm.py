"""Small DeepSeek Responses API client for the script writer prompt."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI

from knowledge.config import KnowledgeSettings, load_settings


class ScriptModelError(RuntimeError):
    """The upstream model request failed before a usable script was returned."""


class ScriptOutputError(ValueError):
    """The model response could not be parsed as one JSON object."""

    def __init__(
        self,
        message: str,
        *,
        raw_output: str = "",
        usage: dict[str, int] | None = None,
    ):
        super().__init__(message)
        self.raw_output = raw_output
        self.usage = usage or _empty_usage()


@dataclass(frozen=True, slots=True)
class ScriptModelResult:
    value: dict[str, Any]
    usage: dict[str, int]


def read_script_instructions() -> str:
    prompt_path = Path(__file__).resolve().parent / "prompts" / "script_writer.md"
    content = prompt_path.read_text(encoding="utf-8")
    marker = "## 系统提示词\n"
    start = content.find(marker)
    if start < 0:
        raise RuntimeError("script_writer.md is missing its system prompt section")
    start += len(marker)
    end = content.find("\n## ", start)
    instructions = content[start:] if end < 0 else content[start:end]
    if not instructions.strip():
        raise RuntimeError("script_writer.md system prompt is empty")
    return instructions.strip()


class DeepSeekScriptClient:
    """Uses the task's settings and never persists its API key."""

    def __init__(
        self,
        settings: KnowledgeSettings | None = None,
        *,
        client: Any | None = None,
    ) -> None:
        self.settings = settings or load_settings()
        if client is None and not self.settings.api_key:
            raise ScriptModelError("DeepSeek API key is required for script generation")
        self._client = client or AsyncOpenAI(
            api_key=self.settings.api_key,
            base_url=self.settings.base_url,
            timeout=self.settings.timeout_seconds,
            max_retries=0,
        )
        self._owns_client = client is None

    async def generate_json(
        self,
        *,
        instructions: str,
        data: dict[str, Any],
        max_output_tokens: int = 16000,
    ) -> ScriptModelResult:
        try:
            response = await self._client.responses.create(
                model=self.settings.model,
                instructions=instructions,
                input=json.dumps(data, ensure_ascii=False, separators=(",", ":")),
                text={"format": {"type": "json_object"}},
                reasoning={"effort": "none"},
                max_output_tokens=max_output_tokens,
                temperature=0.2,
                store=False,
            )
        except APITimeoutError as exc:
            raise ScriptModelError("DeepSeek script request timed out") from exc
        except APIConnectionError as exc:
            raise ScriptModelError(
                "Could not connect to DeepSeek for script generation"
            ) from exc
        except APIStatusError as exc:
            if exc.status_code in {401, 403}:
                raise ScriptModelError("DeepSeek rejected the API key") from exc
            if exc.status_code == 429:
                raise ScriptModelError("DeepSeek is temporarily rate limited") from exc
            raise ScriptModelError(
                f"DeepSeek script request failed with HTTP {exc.status_code}"
            ) from exc

        usage = _response_usage(response)
        output = _output_text(response)
        if not output:
            raise ScriptOutputError("DeepSeek returned no script JSON", usage=usage)
        try:
            value = json.loads(output)
        except json.JSONDecodeError as exc:
            raise ScriptOutputError(
                f"DeepSeek returned invalid script JSON ({exc.msg})",
                raw_output=output,
                usage=usage,
            ) from exc
        if not isinstance(value, dict):
            raise ScriptOutputError(
                "DeepSeek script output must be a JSON object",
                raw_output=output,
                usage=usage,
            )
        return ScriptModelResult(value=value, usage=usage)

    async def close(self) -> None:
        if self._owns_client:
            await self._client.close()


def _field(value: Any, name: str, default: Any = None) -> Any:
    return (
        value.get(name, default)
        if isinstance(value, dict)
        else getattr(value, name, default)
    )


def _output_text(response: Any) -> str:
    direct = _field(response, "output_text", "")
    if isinstance(direct, str) and direct.strip():
        return direct
    for item in _field(response, "output", []) or []:
        if _field(item, "type") != "message":
            continue
        for part in _field(item, "content", []) or []:
            if _field(part, "type") == "output_text":
                content = _field(part, "text", "")
                if isinstance(content, str) and content.strip():
                    return content
    return ""


def _empty_usage() -> dict[str, int]:
    return {"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}


def _response_usage(response: Any) -> dict[str, int]:
    raw = _field(response, "usage") or {}
    result = {
        name: int(_field(raw, name, 0) or 0)
        for name in ("input_tokens", "output_tokens", "total_tokens")
    }
    if not result["total_tokens"]:
        result["total_tokens"] = result["input_tokens"] + result["output_tokens"]
    return result
