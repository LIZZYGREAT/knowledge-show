"""HTTP request models and per-request DeepSeek client setup."""

from __future__ import annotations

import asyncio
from dataclasses import replace
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr, StringConstraints
from typing_extensions import Annotated

from knowledge.config import load_settings
from knowledge.llm_client import DeepSeekClient
from knowledge.search_client import DeepSeekSearchClient
from knowledge.service import RunOptions
from script.llm import DeepSeekScriptClient
from workflow.service import WorkflowOptions


LocalKey = Annotated[str, StringConstraints(min_length=1, max_length=512)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreateProjectBody(StrictModel):
    user_input: dict[str, Any]


class ModelTestBody(StrictModel):
    api_key: Annotated[SecretStr, Field(min_length=1, max_length=512)]


class StartJobBody(StrictModel):
    target: Literal["script"] = "script"
    api_key: Annotated[SecretStr, Field(min_length=1, max_length=512)]
    regenerate: bool = False


class DirectionBody(StrictModel):
    direction_id: LocalKey
    expected_project_revision: int = Field(ge=1)


class RuntimeServices:
    """Per-request model clients; credentials live only until the job finishes."""

    def __init__(self, api_key: str) -> None:
        settings = replace(load_settings(), api_key=api_key)
        self.knowledge = DeepSeekClient(settings)
        self.search = DeepSeekSearchClient(settings)
        self.script = DeepSeekScriptClient(settings)

    def workflow_options(
        self,
        *,
        regenerate: bool = False,
        knowledge_export_dir: str | Path | None = None,
        script_export_dir: str | Path | None = None,
    ) -> WorkflowOptions:
        return WorkflowOptions(
            mode="real",
            regenerate_script=regenerate,
            knowledge_options=RunOptions(
                mode="real",
                clients={"llm": self.knowledge, "search": self.search},
            ),
            script_client=self.script,
            knowledge_export_dir=knowledge_export_dir,
            script_export_dir=script_export_dir,
        )

    async def close(self) -> None:
        await asyncio.gather(
            self.knowledge.close(), self.search.close(), self.script.close()
        )


async def test_model_connection(api_key: str) -> bool:
    services = RuntimeServices(api_key)
    try:
        response = await services.script.generate_json(
            instructions='Return the JSON object {"connected": true}.',
            data={"purpose": "explicit low-cost connection test"},
            max_output_tokens=32,
        )
        return response.value.get("connected") is True
    finally:
        await services.close()
