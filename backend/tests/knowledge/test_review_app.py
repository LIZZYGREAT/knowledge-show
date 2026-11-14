from pathlib import Path

from streamlit.testing.v1 import AppTest

from knowledge.devtools.review_app import _user_failure_message, _user_progress_message


APP = Path(__file__).resolve().parents[2] / "src" / "knowledge" / "devtools" / "review_app.py"


def test_review_page_renders_and_completes_offline_mock_run(monkeypatch, tmp_path):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "")
    monkeypatch.setenv("KNOWLEDGE_DATA_DIR", str(tmp_path / "knowledge-data"))
    monkeypatch.setenv("KNOWLEDGE_EXPORT_DIR", str(tmp_path / "exports"))
    app = AppTest.from_file(str(APP)).run()
    assert not app.exception

    app.form_submit_button[0].click().run()

    assert not app.exception
    assert any("推荐的讲述方向" in item.value for item in app.markdown)
    assert any("23个人" in item.value for item in app.markdown)
    assert any("这个方向适合你吗？" == item.value for item in app.subheader)
    visible_text = "\n".join(item.value for item in app.markdown)
    assert "Run ID" not in visible_text
    assert "Evidence" not in visible_text
    assert not app.get("download_button")


def test_review_page_keeps_technical_details_in_developer_diagnostics(monkeypatch, tmp_path):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "")
    monkeypatch.setenv("KNOWLEDGE_DATA_DIR", str(tmp_path / "knowledge-data"))
    monkeypatch.setenv("KNOWLEDGE_EXPORT_DIR", str(tmp_path / "exports"))
    app = AppTest.from_file(str(APP)).run()
    app.checkbox[0].set_value(True).run()
    app.form_submit_button[0].click().run()

    assert not app.exception
    visible_text = "\n".join(item.value for item in app.markdown)
    assert "Run ID" in visible_text
    assert any(item.label == "下载 KnowledgePackage JSON" for item in app.get("download_button"))


def test_user_copy_hides_internal_errors_and_maps_internal_progress():
    message = _user_failure_message(
        {"error": "DeepSeek failed with HTTP 401: invalid API key", "issues": []}
    )
    progress = _user_progress_message(
        {"phase": "search", "event_type": "completed", "summary": "Search found 4 results"}
    )

    assert "401" not in message
    assert "API key" not in message
    assert "Search" not in progress
    assert "结果" not in progress


def test_user_copy_explains_unsupported_aspect_ratio():
    message = _user_failure_message(
        {"error": "当前版本仅支持 16:9 视频画幅。", "issues": []}
    )

    assert "仅支持 16:9" in message
    assert "改为 16:9" in message


def test_user_failure_explains_missing_contract_review_type_without_contract_jargon():
    message = _user_failure_message(
        {
            "issues": [{"category": "contract_limitation"}],
            "error": "No candidate direction has all essential claims verified.",
        }
    )

    assert "基础知识方向" in message
    assert "evidence" not in message
    assert "KnowledgePackage" not in message


def test_review_page_rejects_unsupported_offline_topic_before_running(monkeypatch, tmp_path):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "")
    monkeypatch.setenv("KNOWLEDGE_DATA_DIR", str(tmp_path / "knowledge-data"))
    monkeypatch.setenv("KNOWLEDGE_EXPORT_DIR", str(tmp_path / "exports"))
    app = AppTest.from_file(str(APP)).run()
    app.text_input[0].set_value("一个没有固定离线资料的主题")
    app.form_submit_button[0].click().run()

    assert not app.exception
    assert any("没有对应的固定离线示例" in item.value for item in app.warning)
    assert not any("推荐的讲述方向" in item.value for item in app.markdown)
    assert not any("MockFixtureNotFound" in item.value for item in app.markdown)


def test_review_page_restores_local_run_history_after_new_session(monkeypatch, tmp_path):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "")
    monkeypatch.setenv("KNOWLEDGE_DATA_DIR", str(tmp_path / "knowledge-data"))
    monkeypatch.setenv("KNOWLEDGE_EXPORT_DIR", str(tmp_path / "exports"))
    first_session = AppTest.from_file(str(APP)).run()
    first_session.form_submit_button[0].click().run()
    assert not first_session.exception

    second_session = AppTest.from_file(str(APP)).run()
    assert not second_session.exception
    history = next(item for item in second_session.selectbox if item.label == "历史运行")
    assert any("生日悖论" in str(option) for option in history.options)


def test_real_user_preview_requires_explicit_fee_confirmation(monkeypatch, tmp_path):
    monkeypatch.setenv("DEEPSEEK_API_KEY", "test-preview-key")
    monkeypatch.setenv("KNOWLEDGE_DATA_DIR", str(tmp_path / "knowledge-data"))
    monkeypatch.setenv("KNOWLEDGE_EXPORT_DIR", str(tmp_path / "exports"))
    app = AppTest.from_file(str(APP)).run()

    assert not app.exception
    assert any("在线模型生成，可能产生调用费用" in item.value for item in app.info)
    assert app.form_submit_button[0].disabled

    app.checkbox[1].set_value(True).run()

    assert not app.exception
    assert not app.form_submit_button[0].disabled
