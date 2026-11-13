"""Local configuration for DeepSeek and knowledge-layer data paths."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


def repository_root() -> Path:
    return Path(__file__).resolve().parents[3]


@dataclass(frozen=True, slots=True)
class KnowledgeSettings:
    api_key: str | None
    base_url: str
    model: str
    timeout_seconds: float
    data_dir: Path
    export_dir: Path


def load_settings() -> KnowledgeSettings:
    root = repository_root()
    load_dotenv(root / ".env")
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip() or None
    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-flash").strip()
    timeout_seconds = float(os.getenv("DEEPSEEK_TIMEOUT_SECONDS", "60"))
    if timeout_seconds <= 0:
        raise ValueError("DEEPSEEK_TIMEOUT_SECONDS must be greater than zero")
    data_dir = Path(os.getenv("KNOWLEDGE_DATA_DIR", ".local/knowledge-data"))
    export_dir = Path(os.getenv("KNOWLEDGE_EXPORT_DIR", ".local/knowledge-exports"))
    if not data_dir.is_absolute():
        data_dir = root / data_dir
    if not export_dir.is_absolute():
        export_dir = root / export_dir
    return KnowledgeSettings(
        api_key=api_key,
        base_url=base_url,
        model=model,
        timeout_seconds=timeout_seconds,
        data_dir=data_dir,
        export_dir=export_dir,
    )
