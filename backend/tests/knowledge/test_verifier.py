import pytest

from knowledge.verifier import _parse_output


def test_verifier_accepts_index_and_correction_aliases():
    parsed = _parse_output(
        {
            "reviews": [
                {
                    "index": 2,
                    "decision": "revise",
                    "issue": "需要注明适用条件。",
                    "correction": "补上相互独立这一前提。",
                }
            ],
            "summary": "有一项主张需要补充条件。",
        }
    )

    assert parsed.reviews[0].claim_index == 2
    assert parsed.reviews[0].suggested_correction == "补上相互独立这一前提。"


def test_verifier_shape_error_does_not_include_model_response_text():
    with pytest.raises(ValueError) as exc:
        _parse_output(
            {
                "reviews": [{"index": 0, "decision": "private model response text"}],
                "summary": "private model response text",
            }
        )

    assert "private model response text" not in str(exc.value)
    assert "reviews.0.decision" in str(exc.value)
