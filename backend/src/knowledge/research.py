"""Research claims from model knowledge, reproducible derivations, and fetched sources."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, ValidationError, field_validator

from .config import KnowledgeSettings, load_settings
from .models import Claim, ClaimEvidence, ClaimStatus, Provenance, ResearchTask, Source
from .search_client import DeepSeekSearchClient, SearchAPIError, SearchHit


class ResearchClaimDraft(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    content: str = Field(min_length=1, validation_alias=AliasChoices("content", "claim"))
    explanation: str = ""
    conditions: list[str] = Field(default_factory=list)
    related_concepts: list[str] = Field(default_factory=list)
    depends_on: list[int | str] = Field(
        default_factory=list,
        validation_alias=AliasChoices("depends_on", "dependencies"),
    )
    provenance: Literal["model_generated", "derivation"] = "model_generated"
    derivation_steps: str = Field(
        default="",
        validation_alias=AliasChoices("derivation_steps", "derivation"),
    )


class ResearchTaskDraft(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    question: str = Field(min_length=1, max_length=128)
    purpose: str = Field(min_length=1, validation_alias=AliasChoices("purpose", "reason"))
    claim_indices: list[int] = Field(default_factory=list)


class ResearchPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: str = Field(min_length=1)
    claims: list[ResearchClaimDraft] = Field(min_length=1)
    search_tasks: list[ResearchTaskDraft] = Field(default_factory=list)
    discoveries: list[str] = Field(default_factory=list)


class SourceClaimReview(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    claim_index: int = Field(ge=0)
    source_index: int = Field(ge=0)
    relation: str = Field(
        validation_alias=AliasChoices("relation", "verdict")
    )
    excerpt: str = ""
    locator: str = ""

    @field_validator("relation")
    @classmethod
    def normalize_relation(cls, value: str) -> str:
        text = value.strip().casefold().replace("-", "_").replace(" ", "_")
        if any(token in text for token in ("contradict", "conflict", "refut", "否定", "冲突", "矛盾")):
            return "conflicts"
        if any(token in text for token in ("not_support", "unsupported", "irrelevant", "no_support", "不支持", "无关")):
            return "partially_supports"
        if any(token in text for token in ("partial", "weak", "some", "limited", "部分", "有限")):
            return "partially_supports"
        if "support" in text or "支持" in text or "confirm" in text or "一致" in text:
            return "supports"
        return "partially_supports"


class SourceReview(BaseModel):
    model_config = ConfigDict(extra="ignore")

    reviews: list[SourceClaimReview] = Field(default_factory=list)
    summary: str = ""


@dataclass
class ResearchResult:
    claims: list[Claim]
    evidence_by_claim: dict[str, list[dict[str, Any]]]
    internal_evidence: list[ClaimEvidence]
    sources: list[Source]
    source_contents: dict[str, str]
    tasks: list[ResearchTask]
    open_issues: list[dict[str, str]] = field(default_factory=list)
    usage: list[dict[str, int]] = field(default_factory=list)
    summary: str = ""
    search_count: int = 0
    fetch_count: int = 0


class ResearchAgent:
    def __init__(
        self,
        llm: Any,
        search: DeepSeekSearchClient | Any | None,
        *,
        settings: KnowledgeSettings | None = None,
        on_event: Any = None,
        run_id: str = "RUN_UNKNOWN",
        max_searches: int = 3,
        max_fetches: int = 3,
    ) -> None:
        self.llm = llm
        self.search = search
        self.settings = settings or load_settings()
        self.on_event = on_event
        self.run_id = run_id
        self.max_searches = max_searches
        self.max_fetches = max_fetches

    async def execute(self, project_id: str, brief: dict[str, Any]) -> ResearchResult:
        await self._event("research", "started", "Research 正在结合 Brief 与内部知识提出可核验主张。")
        result = ResearchResult(
            claims=[],
            evidence_by_claim={},
            internal_evidence=[],
            sources=[],
            source_contents={},
            tasks=[],
        )
        prompt = (
            "Review the ProjectState.brief and prior claims. Return concise claims and only the key "
            "facts needed to explain one short video. Do not make a long encyclopedia list. For each "
            "claim include: content, explanation, conditions (array), related_concepts (array), "
            "depends_on (array of zero-based integer indices into this claims array), provenance "
            "(model_generated or derivation), and derivation_steps. A derivation is not a citation; "
            "show checkable steps. For facts needing a source, create focused search_tasks with "
            "question (1-128 characters), purpose, and claim_indices (integer indices). Do not search "
            "just to repeat a basic definition. Include user must_include and must_avoid constraints. "
            "Use exactly this JSON shape and key spelling; do not add fields: "
            '{"summary":"...","claims":[{"content":"...","explanation":"...",'
            '"conditions":[],"related_concepts":[],"depends_on":[],"provenance":"model_generated",'
            '"derivation_steps":""}],"search_tasks":[{"question":"...","purpose":"...",'
            '"claim_indices":[]}],"discoveries":[]}. At most 8 claims and 2 focused search tasks.'
        )
        initial = await self.llm.generate_json(
            role="research",
            prompt=prompt,
            data={"brief": brief, "prior_claims": []},
        )
        try:
            plan = ResearchPlan.model_validate(initial.value)
        except ValidationError as exc:
            raise ValueError(_validation_summary("Research", exc)) from exc
        result.usage.append(initial.usage)
        result.summary = plan.summary
        result.claims = self._make_claims(project_id, plan.claims)
        result.evidence_by_claim = {claim.id: [] for claim in result.claims}

        for claim_index, draft in enumerate(plan.claims):
            if draft.provenance == "derivation" and draft.derivation_steps.strip():
                claim = result.claims[claim_index]
                evidence = self._derivation_evidence(project_id, claim, draft.derivation_steps)
                result.evidence_by_claim[claim.id].append(evidence[0])
                result.internal_evidence.append(evidence[1])

        result.tasks = self._make_tasks(project_id, plan.search_tasks, result.claims)
        if result.tasks:
            await self._run_search(project_id, brief, plan, result)
        await self._event(
            "research",
            "completed",
            f"Research 建立 {len(result.claims)} 条初步主张，读取 {len(result.sources)} 个外部来源。",
            stats={"claims": len(result.claims), "sources": len(result.sources)},
        )
        return result

    def _make_claims(self, project_id: str, drafts: list[ResearchClaimDraft]) -> list[Claim]:
        claim_ids = [stable_id("CLM_", project_id, draft.content) for draft in drafts]
        claims: list[Claim] = []
        for index, draft in enumerate(drafts):
            dependencies = []
            for dependency in draft.depends_on:
                dependency_index = _dependency_index(dependency, index, drafts)
                if dependency_index < 0 or dependency_index >= len(claim_ids) or dependency_index == index:
                    raise ValueError(f"Research claim {index} contains an invalid dependency index")
                dependencies.append(claim_ids[dependency_index])
            claims.append(
                Claim(
                    id=claim_ids[index],
                    project_id=project_id,
                    content=draft.content,
                    explanation=draft.explanation,
                    conditions=draft.conditions,
                    related_concepts=draft.related_concepts,
                    depends_on=dependencies,
                    provenance=Provenance(draft.provenance),
                    status=ClaimStatus.CANDIDATE,
                )
            )
        return claims

    def _make_tasks(
        self,
        project_id: str,
        drafts: list[ResearchTaskDraft],
        claims: list[Claim],
    ) -> list[ResearchTask]:
        result = []
        for draft in drafts:
            if any(index >= len(claims) for index in draft.claim_indices):
                raise ValueError("Research task references a missing claim index")
            result.append(
                ResearchTask(
                    id=stable_id("TASK_", project_id, draft.question),
                    project_id=project_id,
                    question=draft.question,
                    initiated_by="research",
                    purpose=draft.purpose,
                    related_claim_ids=[claims[index].id for index in draft.claim_indices],
                )
            )
        return result

    def _derivation_evidence(
        self, project_id: str, claim: Claim, steps: str
    ) -> tuple[dict[str, Any], ClaimEvidence]:
        evidence_id = stable_id("EVD_", project_id, f"{claim.id}:{steps}")
        public = {
            "id": evidence_id,
            "kind": "mathematical_derivation",
            "title": f"可复核推导：{claim.content[:72]}",
            "details": steps,
        }
        internal = ClaimEvidence(
            id=evidence_id,
            project_id=project_id,
            claim_id=claim.id,
            evidence_kind="mathematical_derivation",
            derivation_steps=steps,
            relation="supports",
        )
        return public, internal

    async def _run_search(
        self,
        project_id: str,
        brief: dict[str, Any],
        plan: ResearchPlan,
        result: ResearchResult,
    ) -> None:
        if self.search is None:
            result.open_issues.append(
                {"issue": "研究提出了外部资料需求，但 Search 客户端不可用。", "recommendation": "检查密钥与 Search 配置。"}
            )
            return

        hits: list[SearchHit] = []
        for task in result.tasks[: self.max_searches]:
            result.search_count += 1
            await self._event(
                "search", "started", f"检索：{task.question}", stats={"query": task.question}
            )
            try:
                task_hits = await self.search.search(
                    task.question,
                    original_question=brief["user_input"].get("focus")
                    or brief["user_input"]["topic"],
                    count=5,
                )
            except SearchAPIError as exc:
                result.open_issues.append(
                    {"issue": f"Search 失败：{task.question}", "recommendation": str(exc)}
                )
                await self._event("search", "failed", f"Search 失败：{task.question}", error=str(exc))
                continue
            hits.extend(task_hits)
            await self._event(
                "search", "completed", f"Search 找到 {len(task_hits)} 个来源线索。",
                stats={"query": task.question, "results": len(task_hits)},
            )

        chosen = self._select_hits(hits)[: self.max_fetches]
        for hit in chosen:
            result.fetch_count += 1
            await self._event(
                "fetch", "started", f"读取来源：{hit.title}", stats={"url": hit.url}
            )
            try:
                page = await self.search.fetch(hit.url)
            except Exception as exc:
                result.open_issues.append(
                    {"issue": f"Fetch 失败：{hit.title}", "recommendation": str(exc)}
                )
                await self._event("fetch", "failed", f"Fetch 失败：{hit.title}", error=str(exc))
                continue
            source = self._save_source(project_id, hit, page.title, page.content)
            result.sources.append(source)
            result.source_contents[source.id] = page.content
            await self._event(
                "fetch", "completed", f"已读取来源正文：{page.title}",
                stats={"url": page.url, "characters": len(page.content)},
            )

        if not result.sources:
            return
        await self._attach_source_evidence(brief, plan, result)

    @staticmethod
    def _select_hits(hits: list[SearchHit]) -> list[SearchHit]:
        unique: dict[str, SearchHit] = {}
        for hit in hits:
            unique.setdefault(hit.url, hit)
        return sorted(
            unique.values(),
            key=lambda hit: (hit.authority if hit.authority is not None else -1,
                             hit.rerank_score if hit.rerank_score is not None else -1.0),
            reverse=True,
        )

    def _save_source(
        self, project_id: str, hit: SearchHit, title: str, content: str
    ) -> Source:
        content_hash = hashlib.sha256(content.encode("utf-8")).hexdigest()
        source_id = stable_id("SRC_", project_id, hit.url)
        folder = self.settings.data_dir / project_id / "sources"
        folder.mkdir(parents=True, exist_ok=True)
        body_path = folder / f"{source_id}.md"
        body_path.write_text(content, encoding="utf-8")
        return Source(
            id=source_id,
            project_id=project_id,
            url=hit.url,
            title=title,
            summary=hit.summary,
            content_path=str(body_path),
            query=hit.query,
            retrieval_method=Provenance.EXTERNAL_SOURCE,
            content_hash=content_hash,
            authority=hit.authority,
            rerank_score=hit.rerank_score,
            published_at=hit.published_at,
        )

    async def _attach_source_evidence(
        self, brief: dict[str, Any], plan: ResearchPlan, result: ResearchResult
    ) -> None:
        source_blocks = [
            {
                "title": source.title,
                "url": source.url,
                "content": result.source_contents[source.id][:15_000],
            }
            for source in result.sources
        ]
        review_result = await self.llm.generate_json(
            role="research",
            prompt=(
                "For each initial claim, check whether an actual fetched source directly supports it, "
                "partly supports it, or conflicts with it. Return a concise exact excerpt that occurs "
                "verbatim in that source. If no source supports a claim, omit it from reviews. Do not "
                "treat search summaries or your own knowledge as source evidence. Use source_index and "
                "claim_index starting at zero. Use verdict values supports, partially_supports, or "
                "conflicts. Return JSON with reviews and summary."
            ),
            data={
                "brief": brief,
                "claims": [claim.model_dump(mode="json") for claim in result.claims],
                "source_pages": source_blocks,
            },
        )
        try:
            reviewed = SourceReview.model_validate(review_result.value)
        except ValidationError as exc:
            raise ValueError(_validation_summary("Research source review", exc)) from exc
        result.usage.append(review_result.usage)
        for review in reviewed.reviews:
            if review.claim_index >= len(result.claims) or review.source_index >= len(result.sources):
                continue
            source = result.sources[review.source_index]
            content = result.source_contents[source.id]
            if not review.excerpt.strip() or _normalize_text(review.excerpt) not in _normalize_text(content):
                result.open_issues.append(
                    {
                        "issue": f"{result.claims[review.claim_index].id} 没有可定位的原文片段。",
                        "recommendation": "保留待核验状态，不将搜索摘要当作证据。",
                    }
                )
                continue
            claim = result.claims[review.claim_index]
            evidence_id = stable_id(
                "EVD_", claim.project_id, f"{claim.id}:{source.id}:{review.excerpt}"
            )
            public_evidence = {
                "id": evidence_id,
                "kind": "external_source",
                "title": source.title,
                "locator": source.url,
                "details": f"原文片段：{review.excerpt.strip()}",
            }
            internal_evidence = ClaimEvidence(
                id=evidence_id,
                project_id=claim.project_id,
                claim_id=claim.id,
                evidence_kind="external_source",
                source_id=source.id,
                locator=review.locator or source.url,
                excerpt=review.excerpt,
                relation=review.relation,
            )
            result.evidence_by_claim[claim.id].append(public_evidence)
            result.internal_evidence.append(internal_evidence)
            if review.relation == "supports":
                claim.provenance = Provenance.EXTERNAL_SOURCE

    async def _event(
        self,
        phase: str,
        event_type: str,
        summary: str,
        *,
        stats: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> None:
        if self.on_event is None:
            return
        event = {
            "run_id": self.run_id,
            "phase": phase,
            "event_type": event_type,
            "summary": summary,
            "stats": stats or {},
        }
        if error:
            event["error"] = error
        callback_result = self.on_event(event)
        if hasattr(callback_result, "__await__"):
            await callback_result


def stable_id(prefix: str, project_id: str, value: str) -> str:
    digest = hashlib.sha256(f"{project_id}\0{value}".encode("utf-8")).hexdigest()[:16]
    return f"{prefix}{digest}"


def _normalize_text(value: str) -> str:
    return " ".join(value.split()).casefold()


def _dependency_index(
    reference: int | str, current: int, drafts: list[ResearchClaimDraft]
) -> int:
    if isinstance(reference, int):
        return reference
    label = _normalize_text(reference)
    match = re.fullmatch(r"(?:claim\s*)?(\d+)", label)
    if match:
        return int(match.group(1))
    label_tokens = set(re.findall(r"[a-z0-9_]+", label))
    candidates: list[tuple[float, int]] = []
    for index, draft in enumerate(drafts):
        if index == current:
            continue
        target = _normalize_text(f"{draft.content} {draft.derivation_steps}")
        if label and label in target:
            return index
        target_tokens = set(re.findall(r"[a-z0-9_]+", target))
        if label_tokens:
            score = len(label_tokens & target_tokens) / len(label_tokens)
            candidates.append((score, index))
    candidates.sort(reverse=True)
    if candidates and candidates[0][0] >= 0.6 and (
        len(candidates) == 1 or candidates[0][0] > candidates[1][0]
    ):
        return candidates[0][1]
    raise ValueError(f"Research dependency label could not be matched: {reference[:80]}")


def _validation_summary(role: str, error: ValidationError) -> str:
    details = error.errors(include_input=False)[:5]
    brief = "; ".join(
        f"{'.'.join(map(str, item['loc']))}: {item['msg']}" for item in details
    )
    remainder = max(0, error.error_count() - len(details))
    suffix = f" (and {remainder} more shape errors)" if remainder else ""
    return f"{role} response shape did not match the required fields: {brief}{suffix}"
