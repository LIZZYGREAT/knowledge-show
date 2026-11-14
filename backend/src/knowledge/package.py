"""Schema and cross-reference checks for public KnowledgePackage objects."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator

from .creative import CreativeResult
from .models import Claim, ClaimStatus
from .research import ResearchResult, stable_id
from .verifier import VerificationResult


class PackageValidationError(ValueError):
    """Raised when a KnowledgePackage cannot be safely handed downstream."""


def _schema() -> dict[str, Any]:
    root = Path(__file__).resolve().parents[3]
    with (root / "contracts" / "schemas" / "knowledge-package.schema.json").open(
        encoding="utf-8"
    ) as handle:
        return json.load(handle)


def validate_knowledge_package(package: dict[str, Any]) -> None:
    errors = sorted(
        Draft202012Validator(_schema()).iter_errors(package),
        key=lambda error: list(error.absolute_path),
    )
    if errors:
        details = "; ".join(
            f"{'.'.join(map(str, error.absolute_path)) or 'package'}: {error.message}"
            for error in errors
        )
        raise PackageValidationError(f"KnowledgePackage schema invalid: {details}")

    directions = package["directions"]
    units = package["knowledge_units"]
    evidence = package["evidence"]
    direction_by_id = _unique_map(directions, "id", "direction")
    unit_by_id = _unique_map(units, "id", "knowledge unit")
    evidence_by_id = _unique_map(evidence, "id", "evidence")
    if package["recommended_direction_id"] not in direction_by_id:
        raise PackageValidationError("recommended_direction_id does not exist")

    for direction in directions:
        for reference in direction["knowledge_refs"]:
            unit = unit_by_id.get(reference)
            if unit is None:
                raise PackageValidationError(
                    f"direction {direction['id']} references missing knowledge unit {reference}"
                )
            if unit["verification_status"] != "verified":
                raise PackageValidationError(
                    f"direction {direction['id']} references non-verified knowledge unit {reference}"
                )

    required_refs = set(package["constraints"]["required_knowledge_refs"])
    for direction in directions:
        if not required_refs.issubset(direction["knowledge_refs"]):
            raise PackageValidationError(
                f"required_knowledge_refs must be available in every direction; {direction['id']} is missing a required unit"
            )

    for unit in units:
        for reference in unit["evidence_refs"]:
            if reference not in evidence_by_id:
                raise PackageValidationError(
                    f"knowledge unit {unit['id']} references missing evidence {reference}"
                )
        for dependency in unit.get("depends_on", []):
            if dependency not in unit_by_id:
                raise PackageValidationError(
                    f"knowledge unit {unit['id']} depends on missing knowledge unit {dependency}"
                )

    for reference in package["constraints"]["required_knowledge_refs"]:
        if reference not in unit_by_id:
            raise PackageValidationError(
                f"required_knowledge_refs contains missing knowledge unit {reference}"
            )
    _assert_acyclic_dependencies(unit_by_id)


def assemble_knowledge_package(
    project_id: str,
    brief: dict[str, Any],
    research: ResearchResult,
    creative: CreativeResult,
    verification: VerificationResult,
    *,
    revision: int = 1,
    artifact_id: str | None = None,
) -> dict[str, Any]:
    """Convert verified internal claims and creative leads to the public contract."""
    claims_by_id = {claim.id: claim for claim in verification.claims}
    eligible: list[tuple[Any, list[int], list[int]]] = []
    for candidate in creative.candidates:
        required = candidate.required_claim_indices or candidate.claim_indices
        required_verified = all(
            0 <= index < len(verification.claims)
            and verification.claims[index].status == ClaimStatus.VERIFIED
            for index in required
        )
        available = [
            index
            for index in candidate.claim_indices
            if 0 <= index < len(verification.claims)
            and verification.claims[index].status == ClaimStatus.VERIFIED
        ]
        if required_verified and available:
            eligible.append((candidate, available, required))

    if not eligible:
        raise PackageValidationError(
            "No candidate direction has all essential claims verified with traceable evidence."
        )

    recommended = next((item for item in eligible if item[0].recommended), None)
    fallback_used = recommended is None
    if recommended is None:
        recommended = eligible[0]

    selected_claim_ids: set[str] = set()
    core_ids = {
        verification.claims[index].id
        for _, _, required_indices in eligible
        for index in required_indices
    }
    for _, indices, _ in eligible:
        selected_claim_ids.update(verification.claims[index].id for index in indices)
    _add_dependencies(selected_claim_ids, claims_by_id)

    package_evidence: dict[str, dict[str, Any]] = {}
    knowledge_units: list[dict[str, Any]] = []
    for claim in verification.claims:
        if claim.id not in selected_claim_ids or claim.status != ClaimStatus.VERIFIED:
            continue
        evidence_refs = []
        for evidence in research.evidence_by_claim.get(claim.id, []):
            evidence_refs.append(evidence["id"])
            package_evidence[evidence["id"]] = evidence
        if not evidence_refs:
            raise PackageValidationError(
                f"Verified claim {claim.id} has no public evidence reference."
            )
        knowledge_units.append(
            {
                "id": claim.id,
                "type": _knowledge_type(claim),
                "content": claim.content,
                "explanation": claim.explanation or claim.content,
                "importance": _importance(claim, core_ids),
                "verification_status": "verified",
                "depends_on": [
                    dependency for dependency in claim.depends_on
                    if dependency in selected_claim_ids
                ],
                "conditions": claim.conditions,
                "evidence_refs": list(dict.fromkeys(evidence_refs)),
            }
        )

    directions: list[dict[str, Any]] = []
    for candidate, claim_indices, _required in eligible:
        refs = [verification.claims[index].id for index in claim_indices]
        direction = {
            "id": stable_id("DIR_", project_id, candidate.title),
            "title": candidate.title,
            "core_question": candidate.core_question,
            "hook": candidate.hook,
            "learning_goal": candidate.learning_goal,
            "knowledge_refs": refs,
            "duration_fit": candidate.duration_fit.model_dump(),
            "recommendation_reason": candidate.recommendation_reason,
        }
        if candidate.visual_potential:
            direction["visual_potential"] = candidate.visual_potential.model_dump()
        if fallback_used and candidate is recommended[0]:
            direction["recommendation_reason"] += (
                " 原推荐方向的必要知识未通过核验，因此本次选择了首个可交付候选。"
            )
        directions.append(direction)

    package = {
        "project_id": project_id,
        "artifact_id": artifact_id or _default_artifact_id(project_id),
        "revision": revision,
        "brief_revision": brief["revision"],
        "directions": directions,
        "recommended_direction_id": next(
            direction["id"]
            for direction in directions
            if direction["title"] == recommended[0].title
        ),
        "knowledge_units": knowledge_units,
        "evidence": list(package_evidence.values()),
        "constraints": {
            "required_knowledge_refs": [],
            "must_not_misrepresent": [],
        },
    }
    validate_knowledge_package(package)
    return package


def _add_dependencies(selected: set[str], claims: dict[str, Claim]) -> None:
    queue = list(selected)
    while queue:
        claim_id = queue.pop()
        claim = claims[claim_id]
        for dependency in claim.depends_on:
            if dependency not in claims:
                raise PackageValidationError(
                    f"Claim {claim.id} depends on missing claim {dependency}"
                )
            if claims[dependency].status != ClaimStatus.VERIFIED:
                raise PackageValidationError(
                    f"Claim {claim.id} depends on non-verified claim {dependency}"
                )
            if dependency not in selected:
                selected.add(dependency)
                queue.append(dependency)


def _knowledge_type(claim: Claim) -> str:
    text = f"{claim.content} {claim.explanation}".casefold()
    if claim.provenance.value == "derivation" or any(mark in text for mark in ("=", "probability", "概率", "formula")):
        return "derivation"
    if any(mark in text for mark in ("mechanism", "attention", "mechanism", "机制", "原理")):
        return "principle"
    return "fact"


def _importance(claim: Claim, core_ids: set[str]) -> str:
    if claim.id in core_ids:
        return "core"
    return "supporting"


def _default_artifact_id(project_id: str) -> str:
    import re

    suffix = re.sub(r"[^A-Za-z0-9_-]", "_", project_id)[:56]
    if not suffix or not suffix[0].isalpha():
        suffix = f"P_{suffix}"
    return f"KP_{suffix}"[:64]


def _unique_map(items: list[dict[str, Any]], field: str, kind: str) -> dict[str, dict[str, Any]]:
    result: dict[str, dict[str, Any]] = {}
    for item in items:
        item_id = item[field]
        if item_id in result:
            raise PackageValidationError(f"duplicate {kind} ID {item_id}")
        result[item_id] = item
    return result


def _assert_acyclic_dependencies(units: dict[str, dict[str, Any]]) -> None:
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(unit_id: str) -> None:
        if unit_id in visiting:
            raise PackageValidationError(f"knowledge dependency cycle includes {unit_id}")
        if unit_id in visited:
            return
        visiting.add(unit_id)
        for dependency in units[unit_id].get("depends_on", []):
            visit(dependency)
        visiting.remove(unit_id)
        visited.add(unit_id)

    for unit_id in units:
        visit(unit_id)
