"""Small internal records shared by Research, Creative, Verifier, and storage."""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class InternalRecord(BaseModel):
    model_config = ConfigDict(extra="forbid", validate_assignment=True)


class TaskStatus(StrEnum):
    OPEN = "open"
    COMPLETED = "completed"
    BLOCKED = "blocked"
    REJECTED = "rejected"


class ClaimStatus(StrEnum):
    CANDIDATE = "candidate"
    VERIFIED = "verified"
    NEEDS_REVIEW = "needs_review"
    REJECTED = "rejected"


class Provenance(StrEnum):
    MODEL_GENERATED = "model_generated"
    EXTERNAL_SOURCE = "external_source"
    DERIVATION = "derivation"
    USER_MATERIAL = "user_material"


class ResearchTask(InternalRecord):
    id: str
    project_id: str
    question: str = Field(min_length=1)
    initiated_by: str = Field(pattern="^(research|creative|verifier)$")
    purpose: str = Field(min_length=1)
    related_creative_id: str | None = None
    related_claim_ids: list[str] = Field(default_factory=list)
    status: TaskStatus = TaskStatus.OPEN


class Source(InternalRecord):
    id: str
    project_id: str
    url: str | None = None
    title: str = Field(min_length=1)
    summary: str = ""
    content_path: str | None = None
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    query: str = ""
    retrieval_method: Provenance = Provenance.EXTERNAL_SOURCE
    content_hash: str | None = None


class Claim(InternalRecord):
    id: str
    project_id: str
    content: str = Field(min_length=1)
    explanation: str = ""
    conditions: list[str] = Field(default_factory=list)
    related_concepts: list[str] = Field(default_factory=list)
    depends_on: list[str] = Field(default_factory=list)
    provenance: Provenance = Provenance.MODEL_GENERATED
    status: ClaimStatus = ClaimStatus.CANDIDATE


class ClaimEvidence(InternalRecord):
    id: str
    project_id: str
    claim_id: str
    evidence_kind: str = Field(pattern="^(external_source|mathematical_derivation|user_material)$")
    source_id: str | None = None
    locator: str | None = None
    excerpt: str = ""
    derivation_steps: str = ""
    relation: str = Field(default="supports", pattern="^(supports|partially_supports|conflicts)$")


class CreativeLead(InternalRecord):
    id: str
    project_id: str
    core_question: str = Field(min_length=1)
    learning_goal: str = Field(min_length=1)
    knowledge_connection: str = ""
    cognitive_change: str = ""
    related_claim_ids: list[str] = Field(default_factory=list)
    open_questions: list[str] = Field(default_factory=list)


class Issue(InternalRecord):
    id: str
    project_id: str
    object_kind: str = Field(pattern="^(claim|source|creative_lead|package)$")
    object_id: str
    issue: str = Field(min_length=1)
    recommendation: str = Field(min_length=1)
    assigned_to: str = Field(pattern="^(research|creative|verifier)$")
    status: str = Field(default="open", pattern="^(open|resolved|rejected)$")
    resolution: str = ""


class Run(InternalRecord):
    id: str
    project_id: str
    input_summary: str
    mode: str = Field(pattern="^(mock|real)$")
    status: str = Field(default="running", pattern="^(running|completed|failed)$")
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    package_artifact_id: str | None = None
    package_revision: int | None = None
    human_rating: str | None = Field(
        default=None, pattern="^(usable|needs_adjustment|unusable)$"
    )
    human_note: str = ""


class RunEvent(InternalRecord):
    id: str
    run_id: str
    phase: str = Field(pattern="^(brief|research|search|fetch|creative|verifier|delivery|complete)$")
    event_type: str = Field(pattern="^(started|progress|completed|failed)$")
    summary: str = Field(min_length=1)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    elapsed_ms: int | None = Field(default=None, ge=0)
    stats: dict[str, int | float | str] = Field(default_factory=dict)
    error: str | None = None
