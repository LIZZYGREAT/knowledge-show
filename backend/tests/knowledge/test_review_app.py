from pathlib import Path

from streamlit.testing.v1 import AppTest


APP = Path(__file__).resolve().parents[2] / "src" / "knowledge" / "devtools" / "review_app.py"


def test_review_page_renders_and_completes_offline_mock_run():
    app = AppTest.from_file(str(APP)).run()
    assert not app.exception

    app.form_submit_button[0].click().run()

    assert not app.exception
    assert any("推荐方向" in item.value for item in app.subheader)
    assert any("23个人" in item.value for item in app.subheader)
    assert any("人工检验记录" == item.value for item in app.subheader)
    assert any(item.label == "下载 KnowledgePackage JSON" for item in app.get("download_button"))


def test_review_page_displays_offline_mock_failure_without_package():
    app = AppTest.from_file(str(APP)).run()
    app.text_input[0].set_value("一个没有固定离线资料的主题")
    app.form_submit_button[0].click().run()

    assert not app.exception
    assert any("未形成可交付知识包" in item.value for item in app.error)
    assert not any("推荐方向" in item.value for item in app.subheader)
