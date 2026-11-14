import pytest

from knowledge.brief import BriefValidationError, build_brief, validate_brief


def test_build_brief_resolves_defaults_and_preserves_explicit_choices():
    brief = build_brief(
        {
            "topic": "Attention",
            "creative_mode": "creative",
            "knowledge_depth": "advanced",
            "art_style": "手绘",
        }
    )

    assert brief["effective"]["creative_mode"] == "creative"
    assert brief["effective"]["knowledge_depth"] == "advanced"
    assert brief["effective"]["aspect_ratio"] == "16:9"
    assert brief["effective"]["art_style"] == "手绘"
    assert brief["effective"]["target_duration_ms"] == 165_000


def test_explicit_supported_aspect_ratio_is_preserved():
    brief = build_brief({"topic": "生日悖论", "aspect_ratio": "16:9"})

    assert brief["user_input"]["aspect_ratio"] == "16:9"
    assert brief["effective"]["aspect_ratio"] == "16:9"


def test_explicit_other_valid_aspect_ratio_is_preserved_by_general_schema():
    brief = build_brief({"topic": "生日悖论", "aspect_ratio": "9:16"})

    validate_brief(brief)
    assert brief["user_input"]["aspect_ratio"] == "9:16"
    assert brief["effective"]["aspect_ratio"] == "9:16"


def test_rejects_effective_config_that_overrides_user_choice():
    with pytest.raises(BriefValidationError, match="cannot override"):
        build_brief(
            {"topic": "Attention", "creative_mode": "story"},
            effective={"creative_mode": "creative"},
        )


def test_rejects_custom_mode_without_notes():
    with pytest.raises(BriefValidationError, match="creative_mode_notes"):
        build_brief({"topic": "Attention", "creative_mode": "custom"})


def test_external_brief_is_checked_against_project_state_schema():
    brief = build_brief({"topic": "生日悖论"})
    brief["effective"]["target_duration_ms"] = 0

    with pytest.raises(BriefValidationError, match="target_duration_ms"):
        validate_brief(brief)
