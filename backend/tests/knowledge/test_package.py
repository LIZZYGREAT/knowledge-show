import json
from copy import deepcopy
from pathlib import Path

import pytest

from knowledge.package import PackageValidationError, validate_knowledge_package


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
