"""DeepSeek Search and Fetch clients with URL checks, deduplication, and bounded retries."""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from urllib.parse import urlsplit, urlunsplit
from typing import Any

import httpx

from .config import KnowledgeSettings, load_settings


class SearchAPIError(RuntimeError):
    pass


class FetchAPIError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class SearchHit:
    title: str
    url: str
    summary: str
    snippet: str = ""
    authority: int | None = None
    rerank_score: float | None = None
    published_at: str | None = None
    query: str = ""


@dataclass(frozen=True, slots=True)
class FetchPage:
    title: str
    content: str
    url: str


def normalize_url(url: str) -> str:
    parts = urlsplit(url.strip())
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        raise ValueError("source URL must use HTTP or HTTPS and include a host")
    if parts.username is not None or parts.password is not None:
        raise ValueError("source URL cannot include a username or password")
    host = parts.hostname.lower()
    port = parts.port
    netloc = host if port is None or (parts.scheme == "http" and port == 80) or (
        parts.scheme == "https" and port == 443
    ) else f"{host}:{port}"
    path = parts.path or "/"
    return urlunsplit((parts.scheme.lower(), netloc, path, parts.query, ""))


class DeepSeekSearchClient:
    RETRYABLE_STATUS = {408, 429}

    def __init__(
        self,
        settings: KnowledgeSettings | None = None,
        *,
        client: httpx.AsyncClient | None = None,
        retries: int = 1,
    ) -> None:
        self.settings = settings or load_settings()
        if not self.settings.api_key and client is None:
            raise RuntimeError(
                "DEEPSEEK_API_KEY is missing. Set it in the local .env file or process environment."
            )
        self._client = client or httpx.AsyncClient(
            timeout=self.settings.timeout_seconds,
            headers={
                "Authorization": f"Bearer {self.settings.api_key}",
                "Content-Type": "application/json",
            },
        )
        self._owns_client = client is None
        self._retries = max(0, min(retries, 2))
        self._seen_urls: set[str] = set()

    async def search(
        self,
        query: str,
        *,
        original_question: str | None = None,
        count: int = 5,
    ) -> list[SearchHit]:
        clean_query = query.strip()
        if not 1 <= len(clean_query) <= 128:
            raise ValueError("Search query must contain between 1 and 128 characters")
        if not 1 <= count <= 50:
            raise ValueError("Search result count must be between 1 and 50")
        request_body: dict[str, Any] = {"query": clean_query, "count": count}
        if original_question:
            request_body["ori_question"] = original_question[:128]
        payload = await self._post("search", request_body)
        results = payload.get("results")
        if not isinstance(results, list):
            raise SearchAPIError("DeepSeek Search response did not include a results array")
        hits: list[SearchHit] = []
        for item in results:
            if not isinstance(item, dict) or not item.get("url"):
                continue
            normalized = normalize_url(str(item["url"]))
            if normalized in self._seen_urls:
                continue
            self._seen_urls.add(normalized)
            hits.append(
                SearchHit(
                    title=str(item.get("title") or normalized),
                    url=normalized,
                    summary=str(item.get("summary") or ""),
                    snippet=str(item.get("snippet") or ""),
                    authority=_int_or_none(item.get("authority")),
                    rerank_score=_float_or_none(item.get("rerank_score")),
                    published_at=str(item["date"]) if item.get("date") else None,
                    query=clean_query,
                )
            )
        return hits

    async def fetch(self, url: str) -> FetchPage:
        normalized = normalize_url(url)
        if len(normalized) > 8192:
            raise ValueError("source URL must be no longer than 8192 characters")
        payload = await self._post("fetch", {"url": normalized})
        content = payload.get("content")
        if not isinstance(content, str) or not content.strip():
            raise FetchAPIError(f"DeepSeek Fetch returned no readable content for {normalized}")
        return FetchPage(
            title=str(payload.get("title") or normalized),
            content=content,
            url=normalized,
        )

    async def close(self) -> None:
        if self._owns_client:
            await self._client.aclose()

    async def _post(self, operation: str, body: dict[str, Any]) -> dict[str, Any]:
        endpoint = f"{self.settings.base_url}/v1/tools/{operation}"
        last_error: Exception | None = None
        for attempt in range(self._retries + 1):
            try:
                response = await self._client.post(endpoint, json=body)
            except httpx.TimeoutException as exc:
                last_error = exc
                if attempt < self._retries:
                    await asyncio.sleep(0.2 * (attempt + 1))
                    continue
                raise (SearchAPIError if operation == "search" else FetchAPIError)(
                    f"DeepSeek {operation.title()} request timed out"
                ) from exc
            except httpx.HTTPError as exc:
                raise (SearchAPIError if operation == "search" else FetchAPIError)(
                    f"Could not connect to DeepSeek {operation.title()} API"
                ) from exc

            if response.is_success:
                try:
                    value = response.json()
                except ValueError as exc:
                    raise (SearchAPIError if operation == "search" else FetchAPIError)(
                        f"DeepSeek {operation.title()} returned invalid JSON"
                    ) from exc
                if not isinstance(value, dict):
                    raise (SearchAPIError if operation == "search" else FetchAPIError)(
                        f"DeepSeek {operation.title()} response must be an object"
                    )
                return value

            error_message = _response_error_message(response)
            error_type = SearchAPIError if operation == "search" else FetchAPIError
            if response.status_code in self.RETRYABLE_STATUS or response.status_code >= 500:
                last_error = error_type(
                    f"DeepSeek {operation.title()} failed with HTTP {response.status_code}: {error_message}"
                )
                if attempt < self._retries:
                    await asyncio.sleep(0.2 * (attempt + 1))
                    continue
            raise error_type(
                f"DeepSeek {operation.title()} failed with HTTP {response.status_code}: {error_message}"
            )
        raise SearchAPIError(f"DeepSeek {operation.title()} request failed: {last_error}")


def _response_error_message(response: httpx.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.reason_phrase
    error = payload.get("error") if isinstance(payload, dict) else None
    message = error.get("message") if isinstance(error, dict) else None
    return str(message or response.reason_phrase)


def _int_or_none(value: Any) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


def _float_or_none(value: Any) -> float | None:
    try:
        return float(value) if value is not None else None
    except (TypeError, ValueError):
        return None
