"""Creative exploration that derives viewing directions from research claims."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, ValidationError, model_validator

from .models import CreativeLead, ResearchTask
from .research import ResearchResult, stable_id


class DurationFitDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Literal["adequate", "thin", "dense", "uncertain"]
    reason: str = Field(min_length=1)


class VisualPotentialDraft(BaseModel):
    model_config = ConfigDict(extra="forbid")

    level: Literal["high", "medium", "low", "unknown"]
    reason: str = Field(min_length=1)


class CreativeTaskDraft(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    question: str = Field(min_length=1, max_length=500)
    purpose: str = Field(min_length=1, validation_alias=AliasChoices("purpose", "why_it_matters"))
    claim_indices: list[int] = Field(
        default_factory=list,
        validation_alias=AliasChoices("claim_indices", "related_claim_indices"),
    )
    candidate_index: int | None = Field(default=None, ge=0)
    gap_to_resolve: str = ""


class CandidateDraft(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    title: str = Field(min_length=1)
    core_question: str = Field(min_length=1)
    hook: str = Field(min_length=1)
    learning_goal: str = Field(min_length=1)
    claim_indices: list[int] = Field(
        min_length=1,
        validation_alias=AliasChoices("claim_indices", "related_claim_indices"),
    )
    required_claim_indices: list[int] = Field(
        default_factory=list,
        validation_alias=AliasChoices("required_claim_indices", "essential_claim_indices"),
    )
    recommendation_reason: str = Field(min_length=1)
    duration_fit: DurationFitDraft
    visual_potential: VisualPotentialDraft | None = None
    recommended: bool = False

    @model_validator(mode="before")
    @classmethod
    def normalize_summary_fields(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            return value
        data = dict(value)
        if "recommended" not in data and "is_recommended" in data:
            data["recommended"] = data["is_recommended"]
        duration = data.get("duration_fit")
        if isinstance(duration, str):
            status = _duration_status(duration)
            data["duration_fit"] = {"status": status, "reason": duration}
        elif isinstance(duration, dict):
            reason = str(duration.get("reason") or duration.get("评估") or "")
            status_text = str(duration.get("status") or duration.get("适配") or "")
            data["duration_fit"] = {
                "status": _duration_status(f"{status_text} {reason}"),
                "reason": reason or status_text or "模型未给出时长适配说明。",
            }
        visual = data.get("visual_potential")
        if isinstance(visual, str):
            data["visual_potential"] = {
                "level": _visual_level(visual),
                "reason": visual,
            }
        elif isinstance(visual, dict):
            reason = str(visual.get("reason") or visual.get("说明") or "")
            level_text = str(visual.get("level") or visual.get("等级") or "")
            data["visual_potential"] = {
                "level": _visual_level(f"{level_text} {reason}"),
                "reason": reason or level_text or "模型未给出视觉潜力说明。",
            }
        return data


class CreativeOutput(BaseModel):
    model_config = ConfigDict(extra="ignore")

    candidates: list[CandidateDraft] = Field(min_length=1)
    research_tasks: list[CreativeTaskDraft] = Field(default_factory=list)
    summary: str = Field(min_length=1)

    @model_validator(mode="after")
    def has_single_recommendation(self) -> "CreativeOutput":
        if sum(candidate.recommended for candidate in self.candidates) != 1:
            raise ValueError("exactly one candidate must be marked recommended")
        return self


@dataclass
class CreativeResult:
    candidates: list[CandidateDraft]
    leads: list[CreativeLead]
    research_tasks: list[ResearchTask]
    usage: dict[str, int]
    summary: str


class CreativeAgent:
    def __init__(
        self, llm: Any, *, on_event: Any = None, run_id: str = "RUN_UNKNOWN", store: Any = None
    ) -> None:
        self.llm = llm
        self.on_event = on_event
        self.run_id = run_id
        self.store = store

    async def propose(
        self,
        project_id: str,
        brief: dict[str, Any],
        research: ResearchResult,
        *,
        existing: CreativeResult | None = None,
        resolved_tasks: list[ResearchTask] | None = None,
        verification_feedback: dict[str, Any] | None = None,
    ) -> CreativeResult:
        await self._event("creative", "started", "Creative 正在从知识关系中寻找观看主线。")
        data = {
            "brief": brief,
            "claims": [
                {
                    "index": index,
                    "content": claim.content,
                    "explanation": claim.explanation,
                    "conditions": claim.conditions,
                    "depends_on_indices": _dependency_indices(claim, research.claims),
                    "provenance": claim.provenance.value,
                    "available_evidence": research.evidence_by_claim.get(claim.id, []),
                }
                for index, claim in enumerate(research.claims)
            ],
            "open_research_tasks": [
                task.model_dump(mode="json")
                for task in research.tasks
                if task.status.value == "open"
            ],
        }
        if existing is not None:
            data["existing_directions"] = [
                candidate.model_dump(mode="json") for candidate in existing.candidates
            ]
            data["resolved_research_tasks"] = [
                task.model_dump(mode="json") for task in (resolved_tasks or [])
            ]
        if verification_feedback is not None:
            data["verification_feedback"] = verification_feedback
        prompt = (
            "Revise only the affected candidate using the verifier feedback. Preserve its useful core. "
            "Correct a fact_problem with the smallest necessary change; remove or weaken a minor_or_optional "
            "detail without changing the whole direction. Do not invent evidence or start another research "
            "task. Keep required_claim_indices to the minimum claims essential to the core question; "
            "unverified optional claims may remain outside that list or be removed. Return the same candidate "
            "JSON shape and exactly one recommendation."
            if verification_feedback is not None
            else "Refine the existing candidate directions using the newly resolved research tasks. "
            "Keep their useful core question and viewing value when the new evidence still supports it. "
            "Change only directions affected by the added knowledge, connect new claims only when they "
            "improve the learning arc, and remove claims that no longer fit. Do not start a further "
            "research loop in this refinement. Return the same candidate JSON shape and one recommendation."
            if existing is not None
            else "Produce one or more materially different candidate directions. They must answer "
            "the user's topic and focus, honor must_include and must_avoid, and use the actual "
            "knowledge relationships as the source of interest. For each direction give a core "
            "question, hook, learning goal, recommendation reason, duration fit, visual potential, "
            "all relevant claim indices, and which claims are essential. Mark only the minimum claims "
            "needed for the core question in required_claim_indices; supporting or optional claims "
            "must not become essential merely because they are related. A candidate must have at least "
            "one essential claim. You may propose a concrete research_tasks item only for a "
            "specific fact gap that materially affects a candidate; include its claim indices. Do "
            "not write a scene list, script, timing, character, shot, or animation method. Mark "
            "exactly one direction recommended. Return JSON with candidates, research_tasks, summary. "
            "Use candidates fields: title, core_question, hook, learning_goal, claim_indices, "
            "required_claim_indices, recommendation_reason, duration_fit as an object with status "
            "and reason, visual_potential as an object with level and reason, and recommended "
            "as a boolean. Do not include IDs. Research task fields are question, purpose, "
            "claim_indices, and candidate_index."
        )
        if existing is not None:
            prompt += (
                " Exact top-level JSON keys: candidates, research_tasks, summary. Each candidate must "
                "contain title, core_question, hook, learning_goal, claim_indices (integer array), "
                "required_claim_indices (integer array), recommendation_reason, duration_fit "
                "({status, reason}), visual_potential ({level, reason}), and recommended (boolean). "
                "Use only claim indices supplied in the data. Mark exactly one candidate recommended. "
                "When no further task is warranted, return research_tasks as an empty array."
            )
        output = await self.llm.generate_json(
            role="creative",
            prompt=prompt,
            data=data,
        )
        try:
            parsed = CreativeOutput.model_validate(output.value)
        except ValidationError as exc:
            raise ValueError(_validation_summary(exc)) from exc
        leads: list[CreativeLead] = []
        for candidate in parsed.candidates:
            self._validate_indices(candidate.claim_indices, len(research.claims), "candidate")
            required = candidate.required_claim_indices or candidate.claim_indices
            self._validate_indices(required, len(research.claims), "required claim")
            if not set(required).issubset(candidate.claim_indices):
                raise ValueError("required_claim_indices must be a subset of claim_indices")
            related_ids = [research.claims[index].id for index in candidate.claim_indices]
            leads.append(
                CreativeLead(
                    id=stable_id("LEAD_", project_id, candidate.core_question),
                    project_id=project_id,
                    core_question=candidate.core_question,
                    learning_goal=candidate.learning_goal,
                    knowledge_connection="；".join(
                        research.claims[index].content for index in candidate.claim_indices
                    ),
                    cognitive_change=candidate.hook,
                    related_claim_ids=related_ids,
                    open_questions=[],
                )
            )

        tasks = []
        for draft in parsed.research_tasks:
            self._validate_indices(draft.claim_indices, len(research.claims), "research task")
            candidate_index = draft.candidate_index
            if candidate_index is None:
                related = set(draft.claim_indices)
                overlap = [len(related & set(candidate.claim_indices)) for candidate in parsed.candidates]
                candidate_index = max(range(len(overlap)), key=overlap.__getitem__)
            if candidate_index >= len(leads):
                raise ValueError("research task references a missing creative lead")
            tasks.append(
                ResearchTask(
                    id=stable_id("TASK_", project_id, draft.question),
                    project_id=project_id,
                    question=draft.question,
                    initiated_by="creative",
                    purpose=draft.purpose,
                    related_creative_id=leads[candidate_index].id,
                    related_claim_ids=[research.claims[index].id for index in draft.claim_indices],
                )
            )
            if draft.gap_to_resolve:
                tasks[-1].purpose = f"{draft.purpose} 待解决缺口：{draft.gap_to_resolve}"
        await self._event(
            "creative", "completed", f"Creative 形成 {len(parsed.candidates)} 个候选，提出 {len(tasks)} 个补研问题。",
            stats={"candidates": len(parsed.candidates), "research_tasks": len(tasks)},
        )
        if self.store is not None:
            for lead in leads:
                self.store.save_lead(lead)
            tasks = [self.store.save_task(task) for task in tasks]
        return CreativeResult(
            candidates=parsed.candidates,
            leads=leads,
            research_tasks=tasks,
            usage=output.usage,
            summary=parsed.summary,
        )

    @staticmethod
    def _validate_indices(indices: list[int], total: int, label: str) -> None:
        if len(set(indices)) != len(indices) or any(index < 0 or index >= total for index in indices):
            raise ValueError(f"{label} contains a missing or duplicate claim index")

    async def _event(
        self,
        phase: str,
        event_type: str,
        summary: str,
        *,
        stats: dict[str, int] | None = None,
    ) -> None:
        if self.on_event is None:
            return
        result = self.on_event(
            {
                "run_id": self.run_id,
                "phase": phase,
                "event_type": event_type,
                "summary": summary,
                "stats": stats or {},
            }
        )
        if hasattr(result, "__await__"):
            await result


def _dependency_indices(claim: Any, claims: list[Any]) -> list[int]:
    id_to_index = {item.id: index for index, item in enumerate(claims)}
    return [id_to_index[item] for item in claim.depends_on if item in id_to_index]


def _duration_status(value: str) -> str:
    text = value.casefold()
    if any(
        marker in text
        for marker in ("不确定", "需再评估", "待评估", "信息不足", "uncertain", "insufficient data")
    ):
        return "uncertain"
    if any(
        marker in text
        for marker in ("偏紧", "过短", "时间不足", "时长不足", "内容不足", "too short", "thin")
    ):
        return "thin"
    if any(marker in text for marker in ("偏密", "过密", "too dense", "dense")):
        return "dense"
    if any(marker in text for marker in ("足够", "合适", "适合", "adequate", "可行", "suitable")):
        return "adequate"
    return "uncertain"


def _visual_level(value: str) -> str:
    text = value.casefold()
    if any(marker in text for marker in ("强", "高", "high")):
        return "high"
    if any(marker in text for marker in ("低", "low")):
        return "low"
    if any(marker in text for marker in ("未知", "不确定", "unknown")):
        return "unknown"
    if any(marker in text for marker in ("中等", "适中", "medium", "moderate")):
        return "medium"
    return "unknown"


def _validation_summary(error: ValidationError) -> str:
    details = error.errors(include_input=False)[:5]
    brief = "; ".join(
        f"{'.'.join(map(str, item['loc']))}: {item['msg']}" for item in details
    )
    remainder = max(0, error.error_count() - len(details))
    suffix = f" (and {remainder} more shape errors)" if remainder else ""
    return f"Creative response shape did not match the required fields: {brief}{suffix}"
