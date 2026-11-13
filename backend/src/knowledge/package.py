"""Schema and cross-reference checks for public KnowledgePackage objects."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator


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
