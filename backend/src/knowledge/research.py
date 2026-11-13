"""Research claims from model knowledge, reproducible derivations, and fetched sources."""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field, ValidationError, field_validator

from .config import KnowledgeSettings, load_settings
from .models import Claim, ClaimEvidence, ClaimStatus, Provenance, ResearchTask, Source, TaskStatus
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
    provenance: Literal["model_generated", "derivation", "external_source", "user_material"] = "model_generated"
    derivation_steps: str = Field(
        default="",
        validation_alias=AliasChoices("derivation_steps", "derivation"),
    )

    @field_validator("explanation", "derivation_steps", mode="before")
    @classmethod
    def normalize_optional_claim_text(cls, value: Any) -> str:
        return "" if value is None else str(value)

    @field_validator("conditions", "related_concepts", "depends_on", mode="before")
    @classmethod
    def normalize_optional_claim_lists(cls, value: Any) -> Any:
        return [] if value is None else value

    @field_validator("provenance", mode="before")
    @classmethod
    def normalize_provenance(cls, value: Any) -> str:
        """Treat unrecognized model labels as model-only; labels never create evidence."""
        text = str(value or "").strip().casefold().replace("-", "_").replace(" ", "_")
        if text in {"derivation", "derived", "推导", "数学推导"}:
            return "derivation"
        if text in {"external_source", "external", "source", "外部来源", "来源"}:
            return "external_source"
        if text in {"user_material", "user", "用户材料"}:
            return "user_material"
        return "model_generated"


class ResearchTaskDraft(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    question: str = Field(
        min_length=1,
        max_length=500,
        validation_alias=AliasChoices("question", "query", "search_query", "研究问题"),
    )
    purpose: str = Field(
        min_length=1,
        validation_alias=AliasChoices("purpose", "reason", "why_it_matters", "目的"),
    )
    claim_indices: list[int] = Field(default_factory=list)

    @field_validator("claim_indices", mode="before")
    @classmethod
    def normalize_claim_indices(cls, value: Any) -> Any:
        return [] if value is None else value


class ResearchPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: str = Field(min_length=1)
    claims: list[ResearchClaimDraft] = Field(min_length=1)
    search_tasks: list[ResearchTaskDraft] = Field(default_factory=list)
    discoveries: list[str | dict[str, Any]] = Field(default_factory=list)

    @field_validator("discoveries", mode="before")
    @classmethod
    def normalize_discoveries(cls, value: Any) -> Any:
        return [] if value is None else value


class SourceClaimReview(BaseModel):
    model_config = ConfigDict(extra="ignore", populate_by_name=True)

    claim_index: int = Field(ge=0)
    source_index: int = Field(ge=0)
    relation: str = Field(
        validation_alias=AliasChoices("relation", "verdict")
    )
    excerpt: str = ""
    locator: str = ""

    @field_validator("excerpt", "locator", mode="before")
    @classmethod
    def normalize_optional_source_text(cls, value: Any) -> str:
        return "" if value is None else str(value)

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
        store: Any = None,
        force_refresh: bool = False,
    ) -> None:
        self.llm = llm
        self.search = search
        self.settings = settings or load_settings()
        self.on_event = on_event
        self.run_id = run_id
        self.max_searches = max_searches
        self.max_fetches = max_fetches
        self.store = store
        self.force_refresh = force_refresh

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
        search_question = brief["user_input"].get("focus") or brief["user_input"]["topic"]
        prior_claims = self._load_prior_claims(project_id, search_question)
        prompt = (
            "Review the ProjectState.brief and prior claims. Reuse a relevant prior claim when its "
            "content and conditions still fit; do not duplicate it or silently change its conditions. "
            "Return concise claims and only the key "
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
            data={"brief": brief, "prior_claims": prior_claims},
        )
        try:
            plan = ResearchPlan.model_validate(initial.value)
        except ValidationError as exc:
            raise ValueError(_validation_summary("Research", exc)) from exc
        result.usage.append(initial.usage)
        result.summary = plan.summary
        result.claims, plan = await self._make_claims_with_dependency_repair(
            project_id, plan, result.usage
        )
        result.evidence_by_claim = {claim.id: [] for claim in result.claims}

        if self.store is not None:
            for claim in result.claims:
                saved_claim = self.store.get_claim(project_id, claim.id)
                if saved_claim is None:
                    continue
                claim.status = saved_claim.status
                claim.provenance = saved_claim.provenance
                for evidence in self.store.list_evidence(project_id, claim_id=claim.id):
                    result.internal_evidence.append(evidence)
                    result.evidence_by_claim[claim.id].append(self._public_evidence(evidence))
                    if evidence.source_id:
                        source = self.store.get_source(project_id, evidence.source_id)
                        if source and all(item.id != source.id for item in result.sources):
                            result.sources.append(source)
                            content = self.store.read_source_content(project_id, source.id)
                            if content is not None:
                                result.source_contents[source.id] = content

        for claim_index, draft in enumerate(plan.claims):
            if draft.provenance == "derivation" and draft.derivation_steps.strip():
                claim = result.claims[claim_index]
                evidence = self._derivation_evidence(project_id, claim, draft.derivation_steps)
                result.evidence_by_claim[claim.id].append(evidence[0])
                result.internal_evidence.append(evidence[1])

        result.tasks = self._make_tasks(project_id, plan.search_tasks, result.claims)
        if self.store is not None:
            result.tasks = [self.store.save_task(task) for task in result.tasks]
        if result.tasks:
            await self._run_search(project_id, brief, plan, result)
        if self.store is not None:
            self.store.save_claims(result.claims)
            for source in result.sources:
                self.store.save_source(source)
            for evidence in result.internal_evidence:
                self.store.save_evidence(evidence)
            for task in result.tasks:
                self.store.save_task(task)
        await self._event(
            "research",
            "completed",
            f"Research 建立 {len(result.claims)} 条初步主张，读取 {len(result.sources)} 个外部来源。",
            stats={"claims": len(result.claims), "sources": len(result.sources)},
        )
        return result

    async def resolve_creative_tasks(
        self,
        project_id: str,
        brief: dict[str, Any],
        result: ResearchResult,
        tasks: list[ResearchTask],
    ) -> bool:
        """Resolve Creative's concrete gaps once, using stored evidence before new research."""
        any_supported_result = False
        for task in tasks:
            await self._event(
                "research", "started", f"定向补研：{task.question}",
                stats={"initiated_by": "creative"},
            )
            matched_ids: list[str] = []
            if self.store is not None:
                for related_id in task.related_claim_ids:
                    detail = self.store.get_claim_and_evidence(
                        related_id, project_id=project_id
                    )
                    if (
                        detail
                        and detail["claim"].status == ClaimStatus.VERIFIED
                        and any(item.relation == "supports" for item in detail["evidence"])
                    ):
                        self._include_stored_claim(
                            result, detail["claim"], detail["evidence"]
                        )
                        matched_ids.append(related_id)
                for match in self.store.search_claims(
                    task.question,
                    filters={"status": "verified"},
                    project_id=project_id,
                    limit=8,
                ):
                    evidence = match["evidence"]
                    if match["claim"].id in matched_ids:
                        continue
                    if not any(item.relation == "supports" for item in evidence):
                        continue
                    self._include_stored_claim(result, match["claim"], evidence)
                    matched_ids.append(match["claim"].id)
                    for related in self.store.get_related_claims(
                        match["claim"].id, project_id=project_id
                    ):
                        detail = self.store.get_claim_and_evidence(
                            related.id, project_id=project_id
                        )
                        if detail:
                            self._include_stored_claim(result, detail["claim"], detail["evidence"])
                            matched_ids.append(related.id)

            supported = bool(matched_ids)
            if not supported:
                prior_claims = self._load_prior_claims(project_id, task.question)
                output = await self.llm.generate_json(
                    role="research",
                    prompt=(
                        "Resolve this specific Creative research gap. Search relevant saved claims first, "
                        "then add only the smallest useful knowledge claims. State conditions and show "
                        "reproducible derivation steps where possible. Request external sources only for "
                        "facts that need them. Do not force evidence to support the proposed direction. "
                        "Return exactly this JSON shape: {summary, claims, search_tasks, discoveries}. "
                        "Each claim has content, explanation, conditions (array), related_concepts (array), "
                        "depends_on (zero-based indices within claims), provenance (only model_generated or "
                        "derivation), and derivation_steps. Each search_tasks item has question, purpose, "
                        "and claim_indices (zero-based indices within claims). Discoveries is an array of "
                        "short strings. Use no other provenance values. Return at most 8 claims and 2 tasks."
                    ),
                    data={
                        "brief": brief,
                        "research_task": task.model_dump(mode="json"),
                        "related_claims": [
                            claim.model_dump(mode="json")
                            for claim in result.claims
                            if claim.id in task.related_claim_ids
                        ],
                        "prior_claims": prior_claims,
                    },
                )
                try:
                    plan = ResearchPlan.model_validate(output.value)
                except ValidationError as exc:
                    raise ValueError(_validation_summary("Research follow-up", exc)) from exc
                result.usage.append(output.usage)
                new_claims, plan = await self._make_claims_with_dependency_repair(
                    project_id, plan, result.usage
                )
                task_claim_ids: list[str] = []
                for index, claim in enumerate(new_claims):
                    existing = next((item for item in result.claims if item.id == claim.id), None)
                    if existing is None:
                        result.claims.append(claim)
                        result.evidence_by_claim[claim.id] = []
                        existing = claim
                    task_claim_ids.append(existing.id)
                    draft = plan.claims[index]
                    if draft.provenance == "derivation" and draft.derivation_steps.strip():
                        public, internal = self._derivation_evidence(
                            project_id, existing, draft.derivation_steps
                        )
                        if all(item.id != internal.id for item in result.internal_evidence):
                            result.internal_evidence.append(internal)
                            result.evidence_by_claim[existing.id].append(public)
                followup_tasks = self._make_tasks(project_id, plan.search_tasks, new_claims)
                if self.store is not None:
                    followup_tasks = [self.store.save_task(item) for item in followup_tasks]
                result.tasks.extend(followup_tasks)
                before_sources = {item.id for item in result.sources}
                if followup_tasks:
                    await self._run_search(
                        project_id, brief, plan, result, tasks=followup_tasks
                    )
                if set(result.source_contents) and (
                    {item.id for item in result.sources} - before_sources
                ):
                    await self._attach_source_evidence(brief, plan, result)
                supported = any(
                    item.claim_id in task_claim_ids and item.relation == "supports"
                    for item in result.internal_evidence
                )
                task.related_claim_ids = list(
                    dict.fromkeys(task.related_claim_ids + task_claim_ids)
                )

            task.status = "completed" if supported else "blocked"
            any_supported_result = any_supported_result or supported
            if self.store is not None:
                self.store.save_task(task)
                self.store.update_task_status(project_id, task.id, task.status.value)
                self.store.save_claims(result.claims)
                for source in result.sources:
                    self.store.save_source(source)
                for evidence in result.internal_evidence:
                    self.store.save_evidence(evidence)
            await self._event(
                "research",
                "completed" if supported else "progress",
                "定向补研找到可追溯依据。" if supported else "定向补研仍缺少可核验依据，已保留为阻塞任务。",
                stats={"claims": len(task.related_claim_ids), "status": task.status.value},
            )
        return any_supported_result

    async def _make_claims_with_dependency_repair(
        self,
        project_id: str,
        plan: ResearchPlan,
        usage: list[dict[str, int]],
    ) -> tuple[list[Claim], ResearchPlan]:
        try:
            return self._make_claims(project_id, plan.claims), plan
        except ValueError as exc:
            message = str(exc)
            if not message.startswith(("Research claim ", "Research dependency label")):
                raise

        await self._event(
            "research",
            "progress",
            "Research 返回了无效的主张依赖索引，正在进行一次有界校正。",
        )
        repair = await self.llm.generate_json(
            role="research",
            prompt=(
                "Correct only depends_on references in this research plan. Keep each claim's content, "
                "explanation, conditions, related concepts, provenance, and derivation steps unchanged. "
                "Keep claim order, summary, search_tasks, and discoveries unchanged. Every dependency "
                "must be a zero-based integer index of another claim in the claims array; never refer "
                "to the current claim or a missing index. If a dependency is unclear, use an empty list. "
                "Return the same JSON shape."
            ),
            data={"research_plan": plan.model_dump(mode="json"), "validation_error": message},
        )
        usage.append(repair.usage)
        try:
            corrected = ResearchPlan.model_validate(repair.value)
        except ValidationError as exc:
            raise ValueError(_validation_summary("Research dependency correction", exc)) from exc
        if len(corrected.claims) != len(plan.claims) or any(
            original.model_dump(exclude={"depends_on"})
            != revised.model_dump(exclude={"depends_on"})
            for original, revised in zip(plan.claims, corrected.claims)
        ):
            raise ValueError(
                "Research dependency correction changed claim content or ordering"
            )
        try:
            claims = self._make_claims(project_id, corrected.claims)
        except ValueError as exc:
            message = str(exc)
            if message.startswith(("Research claim ", "Research dependency label")):
                raise ValueError(
                    "Research dependency references remained invalid after one correction"
                ) from exc
            raise
        return claims, plan.model_copy(update={"claims": corrected.claims})

    def _include_stored_claim(
        self,
        result: ResearchResult,
        claim: Claim,
        evidence: list[ClaimEvidence],
    ) -> None:
        if all(item.id != claim.id for item in result.claims):
            result.claims.append(claim)
            result.evidence_by_claim[claim.id] = []
        result.evidence_by_claim.setdefault(claim.id, [])
        for item in evidence:
            if all(existing.id != item.id for existing in result.internal_evidence):
                result.internal_evidence.append(item)
            if all(existing["id"] != item.id for existing in result.evidence_by_claim[claim.id]):
                result.evidence_by_claim[claim.id].append(self._public_evidence(item))
            if item.source_id and self.store is not None:
                source = self.store.get_source(claim.project_id, item.source_id)
                if source is not None and all(existing.id != source.id for existing in result.sources):
                    result.sources.append(source)
                    content = self.store.read_source_content(claim.project_id, source.id)
                    if content is not None:
                        result.source_contents[source.id] = content

    def _make_claims(self, project_id: str, drafts: list[ResearchClaimDraft]) -> list[Claim]:
        claim_ids = [
            stable_id("CLM_", project_id, draft.content + "\0" + "\0".join(sorted(draft.conditions)))
            for draft in drafts
        ]
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
        *,
        tasks: list[ResearchTask] | None = None,
    ) -> None:
        requested_tasks = tasks if tasks is not None else result.tasks
        requested_tasks = [task for task in requested_tasks if task.status == TaskStatus.OPEN]
        if not requested_tasks:
            return
        if self.search is None:
            result.open_issues.append(
                {"issue": "研究提出了外部资料需求，但 Search 客户端不可用。", "recommendation": "检查密钥与 Search 配置。"}
            )
            return

        hits: list[SearchHit] = []
        remaining_searches = max(0, self.max_searches - result.search_count)
        for task in requested_tasks[:remaining_searches]:
            result.search_count += 1
            query = _compact_search_query(task.question)
            compacted = query != task.question.strip()
            await self._event(
                "search",
                "started",
                f"检索：{query}" + ("（查询按 Search 接口限制缩短）" if compacted else ""),
                stats={"query": query, "task_question": task.question},
            )
            try:
                task_hits = await self.search.search(
                    query,
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
                stats={"query": query, "results": len(task_hits)},
            )

        chosen = self._select_hits(hits)
        for hit in chosen:
            if self.store is not None and not self.force_refresh:
                cached_source = self.store.get_source_by_url(project_id, hit.url)
                cached_content = (
                    self.store.read_source_content(project_id, cached_source.id)
                    if cached_source is not None
                    else None
                )
                if cached_source is not None and cached_content is not None:
                    if all(item.id != cached_source.id for item in result.sources):
                        result.sources.append(cached_source)
                    result.source_contents[cached_source.id] = cached_content
                    await self._event(
                        "fetch",
                        "completed",
                        f"复用已保存来源正文：{cached_source.title}",
                        stats={
                            "url": cached_source.url or hit.url,
                            "characters": len(cached_content),
                            "cache": "hit",
                        },
                    )
                    continue
            if result.fetch_count >= self.max_fetches:
                break
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
            if all(item.id != source.id for item in result.sources):
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
        source = Source(
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
        return self.store.save_source(source) if self.store is not None else source

    def _load_prior_claims(self, project_id: str, question: str) -> list[dict[str, Any]]:
        if self.store is None:
            return []
        results = self.store.search_claims(
            question,
            filters={"status": ["verified", "needs_review"]},
            project_id=project_id,
            limit=8,
        )
        by_id = {item["claim"].id: item for item in results}
        for item in list(results):
            for related in self.store.get_related_claims(item["claim"].id, project_id=project_id):
                if related.status == ClaimStatus.REJECTED:
                    continue
                if related.id not in by_id:
                    detail = self.store.get_claim_and_evidence(related.id, project_id=project_id)
                    if detail:
                        by_id[related.id] = detail
        return [
            {
                "claim": item["claim"].model_dump(mode="json"),
                "evidence": [
                    {
                        "id": evidence.id,
                        "evidence_kind": evidence.evidence_kind,
                        "source_id": evidence.source_id,
                        "locator": evidence.locator,
                        "excerpt": evidence.excerpt[:800],
                        "derivation_steps": evidence.derivation_steps[:1500],
                        "relation": evidence.relation,
                    }
                    for evidence in item.get("evidence", [])
                ],
            }
            for item in by_id.values()
        ]

    def _public_evidence(self, evidence: ClaimEvidence) -> dict[str, Any]:
        if evidence.evidence_kind == "external_source":
            source = (
                self.store.get_source(evidence.project_id, evidence.source_id)
                if self.store is not None and evidence.source_id
                else None
            )
            return {
                "id": evidence.id,
                "kind": "external_source",
                "title": source.title if source else "已保存的外部来源",
                "locator": evidence.locator or (source.url if source else ""),
                "details": f"原文片段：{evidence.excerpt}" if evidence.excerpt else "已保存来源证据。",
            }
        if evidence.evidence_kind == "mathematical_derivation":
            return {
                "id": evidence.id,
                "kind": "mathematical_derivation",
                "title": "可复核推导",
                "details": evidence.derivation_steps,
            }
        return {
            "id": evidence.id,
            "kind": "user_material",
            "title": "用户材料",
            "details": evidence.excerpt,
        }

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


def _compact_search_query(question: str) -> str:
    query = " ".join(question.split())
    if len(query) <= 128:
        return query
    truncated = query[:128]
    word_boundary = truncated.rfind(" ")
    if word_boundary >= 96:
        truncated = truncated[:word_boundary]
    return truncated.rstrip()


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
