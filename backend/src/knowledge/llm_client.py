"""DeepSeek Responses API client for concise structured role outputs."""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI

from .config import KnowledgeSettings, load_settings


class APIKeyMissingError(RuntimeError):
    pass


class ModelOutputError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class ModelResult:
    value: dict[str, Any]
    usage: dict[str, int]
    response_id: str | None = None


class DeepSeekClient:
    def __init__(
        self,
        settings: KnowledgeSettings | None = None,
        *,
        client: Any | None = None,
    ) -> None:
        self.settings = settings or load_settings()
        if client is None and not self.settings.api_key:
            raise APIKeyMissingError(
                "DEEPSEEK_API_KEY is missing. Set it in the local .env file or process environment."
            )
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
        role: str,
        prompt: str,
        data: dict[str, Any],
        max_output_tokens: int = 5000,
        temperature: float = 0.2,
    ) -> ModelResult:
        if role not in {"research", "creative", "verifier"}:
            raise ValueError(f"Unknown knowledge role: {role}")
        instructions = self._read_prompt(role)
        input_text = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
        try:
            response = await self._client.responses.create(
                model=self.settings.model,
                instructions=f"{instructions}\n\nCurrent task:\n{prompt}",
                input=input_text,
                text={"format": {"type": "json_object"}},
                reasoning={"effort": "none"},
                max_output_tokens=max_output_tokens,
                temperature=temperature,
                store=False,
            )
        except APITimeoutError as exc:
            raise RuntimeError(f"DeepSeek {role} request timed out") from exc
        except APIConnectionError as exc:
            raise RuntimeError(f"Could not connect to DeepSeek for {role}") from exc
        except APIStatusError as exc:
            raise RuntimeError(
                f"DeepSeek {role} request failed with HTTP {exc.status_code}: {exc.message}"
            ) from exc

        output_text = self._extract_output_text(response)
        if not output_text:
            output = _field(response, "output", []) or []
            output_types = [_field(item, "type", "unknown") for item in output]
            content_types = [
                _field(part, "type", "unknown")
                for item in output
                for part in (_field(item, "content", []) or [])
            ]
            incomplete = _field(response, "incomplete_details") or {}
            error = _field(response, "error") or {}
            raise ModelOutputError(
                "DeepSeek returned no final JSON text "
                f"(status={_field(response, 'status', 'unknown')}, "
                f"output_types={output_types}, content_types={content_types}, "
                f"incomplete_reason={_field(incomplete, 'reason', 'none')}, "
                f"error_type={_field(error, 'type', 'none')})"
            )
        try:
            value = json.loads(output_text)
        except json.JSONDecodeError as exc:
            usage = _field(response, "usage") or {}
            incomplete = _field(response, "incomplete_details") or {}
            raise ModelOutputError(
                f"DeepSeek {role} returned invalid JSON "
                f"(status={_field(response, 'status', 'unknown')}, "
                f"output_chars={len(output_text)}, "
                f"output_tokens={_field(usage, 'output_tokens', 'unknown')}, "
                f"incomplete_reason={_field(incomplete, 'reason', 'none')}, "
                f"parse_error={exc.msg})"
            ) from exc
        if not isinstance(value, dict):
            raise ModelOutputError(f"DeepSeek {role} output must be a JSON object")

        raw_usage = getattr(response, "usage", None)
        usage = {
            key: int(getattr(raw_usage, key, 0) or 0)
            for key in ("input_tokens", "output_tokens", "total_tokens")
        }
        return ModelResult(
            value=value,
            usage=usage,
            response_id=getattr(response, "id", None),
        )

    async def close(self) -> None:
        if self._owns_client:
            await self._client.close()

    @staticmethod
    def _extract_output_text(response: Any) -> str:
        direct = _field(response, "output_text", "")
        if isinstance(direct, str) and direct.strip():
            return direct
        for item in _field(response, "output", []) or []:
            if _field(item, "type") != "message":
                continue
            for content in _field(item, "content", []) or []:
                if _field(content, "type") == "output_text":
                    value = _field(content, "text", "")
                    if isinstance(value, str) and value.strip():
                        return value
        return ""

    @staticmethod
    def _read_prompt(role: str) -> str:
        prompt_path = Path(__file__).resolve().parent / "prompts" / f"{role}.system.txt"
        return prompt_path.read_text(encoding="utf-8")


def _field(value: Any, name: str, default: Any = None) -> Any:
    if isinstance(value, dict):
        return value.get(name, default)
    return getattr(value, name, default)
