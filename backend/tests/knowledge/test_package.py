import json
from copy import deepcopy
from pathlib import Path

import pytest

from knowledge.brief import build_brief
from knowledge.creative import CandidateDraft, CreativeResult
from knowledge.models import Claim, ClaimStatus, Provenance
from knowledge.package import (
    PackageValidationError,
    assemble_knowledge_package,
    validate_knowledge_package,
)
from knowledge.research import ResearchResult
from knowledge.verifier import VerificationResult


FIXTURES = Path(__file__).resolve().parents[2] / "src" / "knowledge" / "fixtures"


def load_fixture(name="birthday_paradox.json"):
    with (FIXTURES / name).open(encoding="utf-8") as handle:
        return json.load(handle)


@pytest.mark.parametrize("name", ["birthday_paradox.json", "attention.json", "dice.json"])
def test_fixed_packages_match_schema_and_references(name):
    validate_knowledge_package(load_fixture(name))


def test_rejects_directions_that_reference_unverified_knowledge():
    package = load_fixture()
    package["knowledge_units"][0]["verification_status"] = "needs_review"

    with pytest.raises(PackageValidationError, match="non-verified"):
        validate_knowledge_package(package)


def test_rejects_missing_evidence_reference():
    package = load_fixture()
    package["knowledge_units"][0]["evidence_refs"] = ["E_MISSING"]

    with pytest.raises(PackageValidationError, match="missing evidence"):
        validate_knowledge_package(package)


def test_rejects_dependency_cycle():
    package = load_fixture()
    package["knowledge_units"][0]["depends_on"] = [package["knowledge_units"][1]["id"]]

    with pytest.raises(PackageValidationError, match="cycle"):
        validate_knowledge_package(package)


def test_validation_does_not_mutate_package():
    package = load_fixture()
    original = deepcopy(package)

    validate_knowledge_package(package)

    assert package == original


def test_required_claims_keep_core_importance_without_becoming_global_requirements():
    project_id = "P_DIRECTION_SCOPE"
    claims = [
        Claim(
            id="CLM_A",
            project_id=project_id,
            content="A stable definition supports the first direction.",
            conditions=["The stated definition applies."],
            provenance=Provenance.DERIVATION,
            status=ClaimStatus.VERIFIED,
        ),
        Claim(
            id="CLM_B",
            project_id=project_id,
            content="A separate mechanism supports the alternative direction.",
            conditions=["The alternate case is independent."],
            provenance=Provenance.DERIVATION,
            status=ClaimStatus.VERIFIED,
        ),
        Claim(
            id="CLM_SUPPORT",
            project_id=project_id,
            content="An optional supporting comparison.",
            provenance=Provenance.DERIVATION,
            status=ClaimStatus.VERIFIED,
        ),
    ]
    evidence_by_claim = {
        claim.id: [
            {
                "id": f"E_{claim.id}",
                "kind": "mathematical_derivation",
                "title": "Reproducible derivation",
                "details": "A concise checkable derivation.",
            }
        ]
        for claim in claims
    }
    candidate_data = [
        {
            "title": "Recommended direction",
            "core_question": "What supports the first explanation?",
            "hook": "A clear first question.",
            "learning_goal": "Understand the first result.",
            "claim_indices": [0, 2],
            "required_claim_indices": [0],
            "recommendation_reason": "The first claim directly supports it.",
            "duration_fit": {"status": "adequate", "reason": "Enough material for a short explanation."},
            "visual_potential": {"level": "medium", "reason": "The relationship can be compared."},
            "recommended": True,
        },
        {
            "title": "Alternative direction",
            "core_question": "What supports a different explanation?",
            "hook": "A separate question.",
            "learning_goal": "Understand the alternate result.",
            "claim_indices": [1],
            "required_claim_indices": [1],
            "recommendation_reason": "It has a different required claim.",
            "duration_fit": {"status": "adequate", "reason": "One mechanism can be explained."},
            "visual_potential": {"level": "medium", "reason": "The mechanism can be shown."},
            "recommended": False,
        },
    ]
    research = ResearchResult(
        claims=claims,
        evidence_by_claim=evidence_by_claim,
        internal_evidence=[],
        sources=[],
        source_contents={},
        tasks=[],
    )
    creative = CreativeResult(
        candidates=[CandidateDraft.model_validate(item) for item in candidate_data],
        leads=[],
        research_tasks=[],
        usage={"input_tokens": 0, "output_tokens": 0, "total_tokens": 0},
        summary="Two separately supported directions.",
    )
    verification = VerificationResult(
        claims=claims,
        issues=[],
        public_issues=[],
        usage={"input_tokens": 0, "output_tokens": 0, "total_tokens": 0},
        summary="All referenced claims are verified.",
    )

    package = assemble_knowledge_package(
        project_id, build_brief({"topic": "A two-direction example"}), research, creative, verification
    )

    units = {unit["id"]: unit for unit in package["knowledge_units"]}
    assert package["constraints"]["required_knowledge_refs"] == []
    assert package["constraints"]["must_not_misrepresent"] == []
    assert units["CLM_A"]["importance"] == "core"
    assert units["CLM_B"]["importance"] == "core"
    assert units["CLM_SUPPORT"]["importance"] == "supporting"
    assert units["CLM_A"]["conditions"] == ["The stated definition applies."]
    assert package["directions"][1]["knowledge_refs"] == ["CLM_B"]


def test_rejected_optional_claim_does_not_block_a_direction_with_verified_core():
    project_id = "P_OPTIONAL_CLAIM"
    core = Claim(
        id="CLM_CORE", project_id=project_id,
        content="The core mechanism has a verified explanation.",
        provenance=Provenance.DERIVATION, status=ClaimStatus.VERIFIED,
    )
    optional = Claim(
        id="CLM_OPTIONAL", project_id=project_id,
        content="A disputed optional historical aside.",
        provenance=Provenance.MODEL_GENERATED, status=ClaimStatus.REJECTED,
    )
    candidate_data = {
        "title": "Keep the core explanation",
        "core_question": "How does the mechanism work?",
        "hook": "A useful contrast.",
        "learning_goal": "Understand the mechanism.",
        "claim_indices": [0, 1],
        "required_claim_indices": [0],
        "recommendation_reason": "The core claim is verified.",
        "duration_fit": {"status": "adequate", "reason": "Enough for a short video."},
        "recommended": True,
    }
    creative = CreativeResult(
        candidates=[CandidateDraft.model_validate(candidate_data)], leads=[], research_tasks=[],
        usage={"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}, summary="Core remains supported.",
    )
    research = ResearchResult(
        claims=[core, optional],
        evidence_by_claim={core.id: [{"id": "E_CORE", "kind": "mathematical_derivation", "title": "Derivation", "details": "Reproducible steps."}]},
        internal_evidence=[], sources=[], source_contents={}, tasks=[],
    )
    verification = VerificationResult(
        claims=[core, optional], issues=[],
        public_issues=[{"claim_id": optional.id, "category": "minor_or_optional", "issue": "The aside is not reliable.", "recommendation": "Remove it."}],
        usage={"input_tokens": 0, "output_tokens": 0, "total_tokens": 0}, summary="The optional aside was rejected.",
    )

    package = assemble_knowledge_package(
        project_id, build_brief({"topic": "A verified mechanism"}), research, creative, verification
    )

    assert package["directions"][0]["knowledge_refs"] == [core.id]
    assert [unit["id"] for unit in package["knowledge_units"]] == [core.id]
    empty_required = CreativeResult(
        candidates=[CandidateDraft.model_validate({**candidate_data, "required_claim_indices": []})],
        leads=[], research_tasks=[], usage={"input_tokens": 0, "output_tokens": 0, "total_tokens": 0},
        summary="No essential claim was identified.",
    )
    with pytest.raises(PackageValidationError, match="all essential claims verified"):
        assemble_knowledge_package(
            project_id, build_brief({"topic": "A verified mechanism"}), research, empty_required, verification
        )


def test_missing_required_claims_remain_distinct_from_explicitly_empty():
    base = {
        "title": "Direction", "core_question": "Question?", "hook": "Hook",
        "learning_goal": "Goal", "claim_indices": [0, 1],
        "recommendation_reason": "Reason",
        "duration_fit": {"status": "adequate", "reason": "Enough."},
    }
    missing = CandidateDraft.model_validate(base)
    empty = CandidateDraft.model_validate({**base, "required_claim_indices": []})

    assert missing.essential_claim_indices == [0, 1]
    assert empty.essential_claim_indices == []


def test_global_required_knowledge_must_be_available_in_every_direction():
    example = json.loads(
        (Path(__file__).resolve().parents[3] / "contracts" / "examples" / "knowledge-package.example.json").read_text(
            encoding="utf-8"
        )
    )
    example["constraints"]["required_knowledge_refs"] = ["K02"]

    with pytest.raises(PackageValidationError, match="available in every direction"):
        validate_knowledge_package(example)


def test_cross_stage_example_uses_internal_review_with_concrete_details():
    example = json.loads(
        (Path(__file__).resolve().parents[3] / "contracts" / "examples" / "knowledge-package.example.json").read_text(
            encoding="utf-8"
        )
    )

    validate_knowledge_package(example)

    internal = next(item for item in example["evidence"] if item["kind"] == "internal_review")
    assert internal["details"].strip()
    assert example["constraints"]["required_knowledge_refs"] == []


def test_internal_review_rejects_whitespace_only_details():
    example = json.loads(
        (Path(__file__).resolve().parents[3] / "contracts" / "examples" / "knowledge-package.example.json").read_text(
            encoding="utf-8"
        )
    )
    internal = next(item for item in example["evidence"] if item["kind"] == "internal_review")
    internal["details"] = "  \n  "

    with pytest.raises(PackageValidationError, match="does not match"):
        validate_knowledge_package(example)
