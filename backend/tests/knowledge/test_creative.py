from knowledge.creative import CandidateDraft, CreativeTaskDraft


def test_creative_accepts_equivalent_model_field_names_and_summary_strings():
    candidate = CandidateDraft.model_validate(
        {
            "id": "DIR_A",
            "title": "A changing probability",
            "core_question": "Why does the chance rise?",
            "hook": "Each person adds many new pairs.",
            "learning_goal": "Understand pair counting.",
            "related_claim_indices": [0, 1],
            "essential_claim_indices": [0],
            "recommendation_reason": "The calculation is reproducible.",
            "duration_fit": "约165秒：内容足够，解释紧凑。",
            "visual_potential": "强。配对数量随人数增长。",
            "recommended": True,
        }
    )

    assert candidate.claim_indices == [0, 1]
    assert candidate.required_claim_indices == [0]
    assert candidate.duration_fit.status == "adequate"
    assert candidate.visual_potential.level == "high"


def test_creative_normalizes_chinese_summary_objects():
    candidate = CandidateDraft.model_validate(
        {
            "title": "生日概率的累积",
            "core_question": "为什么人数增加时更容易出现同生日？",
            "hook": "每增加一人，都会和已有的人形成新配对。",
            "learning_goal": "理解配对数量如何增长。",
            "related_claim_indices": [0, 1],
            "essential_claim_indices": [0],
            "recommendation_reason": "配对增长能解释概率变化。",
            "duration_fit": {"适配": "合适", "评估": "约165秒可说明配对增长和概率变化。"},
            "visual_potential": {"等级": "较强", "说明": "配对数量随人数增加。"},
            "recommended": True,
        }
    )

    assert candidate.duration_fit.status == "adequate"
    assert candidate.duration_fit.reason.startswith("约165秒")
    assert candidate.visual_potential.level == "high"
    assert candidate.visual_potential.reason == "配对数量随人数增加。"


def test_creative_keeps_ambiguous_summary_values_uncertain():
    candidate = CandidateDraft.model_validate(
        {
            "title": "A changing probability",
            "core_question": "Why does the chance rise?",
            "hook": "Each person adds new pairs.",
            "learning_goal": "Understand pair counting.",
            "claim_indices": [0],
            "recommendation_reason": "The mechanism is clear.",
            "duration_fit": {"status": "需要再评估", "reason": "当前信息不足。"},
            "visual_potential": {"level": "未确定", "reason": "缺少观察依据。"},
            "recommended": True,
        }
    )

    assert candidate.duration_fit.status == "uncertain"
    assert candidate.visual_potential.level == "unknown"


def test_creative_research_task_retains_gap_and_reason():
    task = CreativeTaskDraft.model_validate(
        {
            "question": "How much does seasonality change the probability?",
            "why_it_matters": "It changes the real-world caveat.",
            "related_claim_indices": [2],
            "gap_to_resolve": "Need a measured distribution comparison.",
        }
    )

    assert task.purpose == "It changes the real-world caveat."
    assert task.claim_indices == [2]
    assert task.gap_to_resolve.startswith("Need a measured")


def test_creative_research_gap_can_retain_a_specific_long_question():
    question = "Which empirical studies explain when attention weights fail to reflect the contribution of an input token?"
    task = CreativeTaskDraft.model_validate(
        {"question": question, "purpose": "Support a carefully scoped explanation."}
    )

    assert task.question == question
