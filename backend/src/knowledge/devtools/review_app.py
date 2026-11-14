"""Local Streamlit review page for knowledge-layer results."""

from __future__ import annotations

import asyncio
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import streamlit as st
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[4]
if str(ROOT / "backend" / "src") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend" / "src"))
load_dotenv(ROOT / ".env")

from knowledge.brief import build_brief  # noqa: E402
from knowledge.config import load_settings  # noqa: E402
from knowledge.mock_data import mock_topic_supported, supported_mock_topics  # noqa: E402
from knowledge.service import (  # noqa: E402
    RunOptions,
    _safe_error,
    export_run_artifacts,
    generate_knowledge_package,
)
from knowledge.store import ResearchStore  # noqa: E402


MODE_LABELS = {
    "离线示例体验": "mock",
    "Mock": "mock",
    "离线 Mock": "mock",
    "Real API": "real",
}
CREATIVE_MODES = {
    "遵循默认": None,
    "创意优先": "creative",
    "直观演示": "visual_explain",
    "干货精讲": "knowledge_dense",
    "故事悬念": "story",
    "自定义": "custom",
}
KNOWLEDGE_DEPTHS = {"遵循默认": None, "入门": "intro", "均衡": "balanced", "进阶": "advanced"}
USER_STAGE_MESSAGES = {
    "brief": "正在梳理你的主题",
    "research": "正在了解主题中的关键知识",
    "search": "正在核对必要信息",
    "fetch": "正在核对必要信息",
    "creative": "正在寻找值得讲述的角度",
    "verifier": "正在检查关键知识和适用条件",
    "delivery": "正在整理可继续制作的方案",
    "complete": "正在整理可继续制作的方案",
}


def _research_store() -> ResearchStore:
    settings = load_settings()
    return ResearchStore(settings.data_dir / "knowledge.sqlite3")


def _stored_run_view(run: Any, store: ResearchStore) -> dict[str, Any]:
    brief = run.input_brief or build_brief({"topic": run.input_summary})
    events = [event.model_dump(mode="json") for event in store.list_run_events(run.project_id, run.id)]
    package = None
    if run.package_artifact_id and run.package_revision:
        package = store.get_package(
            run.project_id, run.package_artifact_id, revision=run.package_revision
        )
    failed = next((event.get("error") for event in reversed(events) if event.get("error")), None)
    return {
        "run_id": run.id,
        "project_id": run.project_id,
        "mode": run.mode,
        "mode_label": "离线示例体验" if run.mode == "mock" else "Real API",
        "started_at": run.started_at.isoformat(),
        "brief": brief,
        "events": events,
        "issues": _run_issues(events),
        "package": package,
        "error": failed if run.status == "failed" else None,
        "rating": run.human_rating,
        "note": run.human_note,
    }


def _load_run_history(project_id: str) -> list[dict[str, Any]]:
    store = _research_store()
    return [_stored_run_view(run, store) for run in store.list_runs(project_id, limit=100)]


def _split_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


def _run_issues(events: list[dict[str, Any]]) -> list[dict[str, str]]:
    return [
        {
            "issue": event.get("issue") or event["summary"],
            "recommendation": event.get("recommendation", ""),
            "status": str(event.get("stats", {}).get("status", "open")),
            "category": str(event.get("stats", {}).get("category", "other")),
            "risk_level": str(event.get("stats", {}).get("risk_level", "high")),
        }
        for event in events
        if event.get("issue")
        or event.get("phase") == "verifier" and event.get("event_type") == "progress"
    ]


def _user_progress_message(event: dict[str, Any]) -> str:
    if event.get("event_type") == "failed":
        return "正在整理目前可用的信息"
    return USER_STAGE_MESSAGES.get(event.get("phase", ""), "正在准备你的创作方向")


def _user_failure_message(run: dict[str, Any]) -> str:
    categories = {issue.get("category") for issue in run.get("issues", [])}
    if "contract_limitation" in categories:
        return "这个基础知识方向暂时无法整理成可靠方案。可以补充具体问题或换个关注点后重试。"
    if "needs_evidence" in categories:
        return "这个方向的关键内容暂时缺少可靠依据。可以调整关注点或稍后重试。"
    return "这次内容准备遇到了问题，可以重试或调整主题。"


def _build_user_input(form: dict[str, Any]) -> dict[str, Any]:
    user_input: dict[str, Any] = {"topic": form["topic"].strip()}
    for field in ("focus", "creative_idea", "art_style"):
        value = form[field].strip()
        if value:
            user_input[field] = value
    creative_mode = CREATIVE_MODES[form["creative_mode"]]
    if creative_mode:
        user_input["creative_mode"] = creative_mode
    if creative_mode == "custom":
        user_input["creative_mode_notes"] = form["creative_mode_notes"].strip()
    knowledge_depth = KNOWLEDGE_DEPTHS[form["knowledge_depth"]]
    if knowledge_depth:
        user_input["knowledge_depth"] = knowledge_depth
    for field in ("must_include", "must_avoid"):
        values = _split_lines(form[field])
        if values:
            user_input[field] = values
    return user_input


def _run_user_input(
    user_input: dict[str, Any],
    mode_label: str,
    *,
    developer_diagnostics: bool = False,
) -> dict[str, Any]:
    brief = build_brief(user_input)
    events: list[dict[str, Any]] = []
    progress = st.status("正在梳理你的主题", expanded=developer_diagnostics)

    def receive_event(event: dict[str, Any]) -> None:
        events.append(event)
        if developer_diagnostics:
            icon = "⚠️" if event["event_type"] == "failed" else "✓"
            progress.write(f"{icon} **{event['phase']}** · {event['summary']}")
            if event.get("error"):
                progress.write(f"内部错误：{event['error']}")
        else:
            progress.update(
                label=_user_progress_message(event),
                state="running",
                expanded=False,
            )

    mode = MODE_LABELS[mode_label]
    project_id = st.session_state.setdefault("knowledge_project_id", "P_LOCAL_KNOWLEDGE_REVIEW")
    store = _research_store()
    package: dict[str, Any] | None = None
    error: str | None = None
    started_at = datetime.now(timezone.utc).isoformat()
    try:
        package = asyncio.run(
            generate_knowledge_package(
                project_id,
                brief,
                on_event=receive_event,
                run_options=RunOptions(mode=mode, store=store),
            )
        )
        progress.update(label="创作方向已准备好", state="complete")
    except Exception as exc:
        error = _safe_error(exc)
        progress.update(label="本次内容准备暂时未能完成", state="error")
        if not developer_diagnostics:
            progress.write(
                _user_failure_message({"error": error, "issues": _run_issues(events)})
            )

    run_id = next((event.get("run_id") for event in events if event.get("run_id")), "RUN_UNKNOWN")
    return {
        "run_id": run_id,
        "project_id": project_id,
        "mode": mode,
        "mode_label": mode_label,
        "started_at": started_at,
        "brief": brief,
        "events": events,
        "issues": _run_issues(events),
        "package": package,
        "error": error,
        "rating": None,
        "note": "",
    }


def _package_download(package: dict[str, Any]) -> bytes:
    return json.dumps(package, ensure_ascii=False, indent=2).encode("utf-8")


def _run_export(run: dict[str, Any]) -> bytes:
    export = {
        "run_id": run["run_id"],
        "project_id": run["project_id"],
        "mode": run["mode"],
        "started_at": run["started_at"],
        "brief": run["brief"],
        "rating": run.get("rating"),
        "note": run.get("note", ""),
        "events": run["events"],
        "error": run.get("error"),
    }
    return json.dumps(export, ensure_ascii=False, indent=2).encode("utf-8")


def _render_package(package: dict[str, Any], run: dict[str, Any]) -> None:
    recommended_id = package["recommended_direction_id"]
    direction_by_id = {direction["id"]: direction for direction in package["directions"]}
    recommended = direction_by_id[recommended_id]

    st.subheader(f"推荐方向 · {recommended['title']}")
    st.markdown(f"**核心问题**：{recommended['core_question']}")
    st.markdown(f"**看点**：{recommended['hook']}")
    st.markdown(f"**学习收获**：{recommended['learning_goal']}")
    if recommended.get("recommendation_reason"):
        st.markdown(f"**推荐理由**：{recommended['recommendation_reason']}")
    fit = recommended["duration_fit"]
    st.caption(f"时长适配：{fit['status']} · {fit['reason']}")
    if recommended.get("visual_potential"):
        visual = recommended["visual_potential"]
        st.caption(f"知识关系的视觉潜力：{visual['level']} · {visual['reason']}")

    candidate_tab, knowledge_tab, evidence_tab, issue_tab, run_tab = st.tabs(
        ["候选", "知识", "证据", "问题", "运行记录"]
    )
    with candidate_tab:
        for direction in package["directions"]:
            if direction["id"] == recommended_id:
                continue
            with st.expander(direction["title"]):
                st.markdown(f"**核心问题**：{direction['core_question']}")
                st.markdown(f"**看点**：{direction['hook']}")
                st.markdown(f"**学习收获**：{direction['learning_goal']}")
                if direction.get("recommendation_reason"):
                    st.markdown(f"**推荐理由**：{direction['recommendation_reason']}")
                st.caption(f"时长适配：{direction['duration_fit']['status']} · {direction['duration_fit']['reason']}")
    with knowledge_tab:
        unit_by_id = {unit["id"]: unit for unit in package["knowledge_units"]}
        direction_filter = st.selectbox(
            "候选方向",
            ["全部知识"] + [direction["title"] for direction in package["directions"]],
            key=f"knowledge_direction_{package['artifact_id']}",
        )
        selected_refs = None
        if direction_filter != "全部知识":
            selected_refs = next(
                direction["knowledge_refs"]
                for direction in package["directions"]
                if direction["title"] == direction_filter
            )
        units = [
            unit for unit in package["knowledge_units"]
            if selected_refs is None or unit["id"] in selected_refs
        ]
        state_filter = st.selectbox(
            "核验状态", ["全部状态", "verified", "needs_review"],
            key=f"knowledge_state_{package['artifact_id']}",
        )
        for unit in units:
            if state_filter != "全部状态" and unit["verification_status"] != state_filter:
                continue
            with st.expander(f"{unit['id']} · {unit['type']} · {unit['verification_status']}"):
                st.markdown(f"**内容**：{unit['content']}")
                st.markdown(f"**解释**：{unit['explanation']}")
                if unit.get("conditions"):
                    st.markdown("**成立条件**：" + "；".join(unit["conditions"]))
                if unit.get("depends_on"):
                    st.markdown("**依赖知识**：" + "、".join(unit["depends_on"]))
                if unit.get("evidence_refs"):
                    st.markdown("**证据引用**：" + "、".join(unit["evidence_refs"]))
    with evidence_tab:
        evidence_by_id = {item["id"]: item for item in package["evidence"]}
        used_refs = {
            reference
            for unit in package["knowledge_units"]
            for reference in unit["evidence_refs"]
        }
        if not used_refs:
            st.info("当前结果没有可用于已核实知识的证据。")
        for evidence_id in sorted(used_refs):
            item = evidence_by_id[evidence_id]
            st.markdown(f"**{item['title']}** · {item['kind']}")
            if item.get("locator"):
                st.link_button("打开来源", item["locator"])
            if item.get("details"):
                st.write(item["details"])
    with issue_tab:
        issues = run.get("issues", [])
        if not issues:
            st.success("未发现阻碍发布的关键问题。")
        for issue in issues:
            st.warning(f"{issue.get('issue', '知识问题')}")
            st.write(issue.get("recommendation", ""))
    with run_tab:
        st.write(f"Run ID：{run['run_id']} · 模式：{run['mode_label']} · 开始时间：{run['started_at']}")
        for event in run["events"]:
            st.write(f"{event['phase']} / {event['event_type']} · {event['summary']}")
            if event.get("stats"):
                st.caption(json.dumps(event["stats"], ensure_ascii=False))


def _render_user_package(package: dict[str, Any]) -> None:
    recommended_id = package["recommended_direction_id"]
    direction_by_id = {direction["id"]: direction for direction in package["directions"]}
    recommended = direction_by_id[recommended_id]

    st.markdown("### 推荐的讲述方向")
    st.markdown(f"## {recommended['title']}")
    st.markdown(f"**可以围绕这个问题展开：** {recommended['core_question']}")
    st.markdown(f"**为什么值得看：** {recommended['hook']}")
    st.markdown(f"**看完会理解：** {recommended['learning_goal']}")
    if recommended.get("recommendation_reason"):
        st.caption(recommended["recommendation_reason"])

    units_by_id = {unit["id"]: unit for unit in package["knowledge_units"]}
    units = [units_by_id[item] for item in recommended["knowledge_refs"]]
    if units:
        st.markdown("### 这条视频会讲清楚")
        for unit in units:
            st.markdown(f"- **{unit['content']}**")
            if unit.get("explanation") and unit["explanation"] != unit["content"]:
                st.caption(unit["explanation"])
            if unit.get("conditions"):
                st.caption("成立条件：" + "；".join(unit["conditions"]))

    alternatives = [
        direction for direction in package["directions"]
        if direction["id"] != recommended_id
    ]
    if alternatives:
        with st.expander("看看其他讲述方向"):
            for direction in alternatives:
                st.markdown(f"**{direction['title']}**")
                st.write(direction["core_question"])
                st.caption(direction["hook"])


def _render_review_form(run: dict[str, Any]) -> None:
    st.subheader("这个方向适合你吗？")
    st.caption("评价和备注只保存在本地，不会自动改写本次结果。")
    with st.form(f"review_{run['run_id']}"):
        rating_labels = {
            "愿意继续制作": "usable",
            "希望调整方向": "needs_adjustment",
            "目前不合适": "unusable",
        }
        selected_label = next(
            (label for label, value in rating_labels.items() if value == run.get("rating")),
            "愿意继续制作",
        )
        rating_label = st.radio(
            "你的感受", list(rating_labels), index=list(rating_labels).index(selected_label)
        )
        note = st.text_area("你想补充或调整什么？", value=run.get("note", ""), max_chars=2000)
        submitted = st.form_submit_button("保存反馈")
    if submitted:
        run["rating"] = rating_labels[rating_label]
        run["note"] = note
        store = _research_store()
        stored_run = store.save_review(
            run["project_id"], run["run_id"], run["rating"], run["note"]
        )
        export_run_artifacts(store, stored_run, load_settings().export_dir)
        st.session_state["knowledge_runs"] = [
            run if item["run_id"] == run["run_id"] else item
            for item in st.session_state["knowledge_runs"]
        ]
        st.success("反馈已保存在本地。")


def _render_selected_run(
    run: dict[str, Any], *, developer_diagnostics: bool = False
) -> None:
    if developer_diagnostics:
        st.markdown(f"**运行：{run['mode_label']} · {run['run_id']}**")
        if run["error"]:
            st.error(f"未形成可交付知识包。内部错误：{run['error']}")
            with st.expander("查看阶段与运行事件"):
                for event in run["events"]:
                    st.write(f"{event['phase']} / {event['event_type']} · {event['summary']}")
                    if event.get("error"):
                        st.warning(event["error"])
        elif run["package"]:
            _render_package(run["package"], run)
            st.download_button(
                "下载 KnowledgePackage JSON",
                data=_package_download(run["package"]),
                file_name=f"{run['package']['artifact_id']}-r{run['package']['revision']}.json",
                mime="application/json",
                key=f"package_download_{run['run_id']}",
            )
    elif run["error"]:
        st.warning(_user_failure_message(run))
    elif run["package"]:
        _render_user_package(run["package"])
    else:
        st.info("目前没有可展示的讲述方向。你可以重试或调整主题。")

    _render_review_form(run)

    if developer_diagnostics:
        st.download_button(
            "下载本次输入、备注与运行摘要",
            data=_run_export(run),
            file_name=f"{run['run_id']}-review.json",
            mime="application/json",
            key=f"run_download_{run['run_id']}",
        )


def main() -> None:
    st.set_page_config(page_title="知识方向预览", layout="wide")
    st.title("知识方向预览")
    st.caption("本地预览知识视频的主题方向、看点和核心知识。")

    if "knowledge_project_id" not in st.session_state:
        st.session_state["knowledge_project_id"] = "P_LOCAL_KNOWLEDGE_REVIEW"
    if "knowledge_runs" not in st.session_state:
        st.session_state["knowledge_runs"] = _load_run_history(
            st.session_state["knowledge_project_id"]
        )
    if "selected_run_id" not in st.session_state:
        st.session_state["selected_run_id"] = None

    developer_diagnostics = st.checkbox("显示开发者诊断", value=False)
    settings = load_settings()
    if developer_diagnostics:
        mode_label = st.radio("内部运行方式", ["Mock", "Real API"], horizontal=True)
    else:
        mode_label = "Real API" if settings.api_key else "离线示例体验"

    if mode_label == "Real API":
        st.info("本次会使用在线模型生成，可能产生调用费用。点击生成前请确认。")
        if not settings.api_key:
            st.warning("当前没有配置在线模型密钥，请在仓库根目录 .env 中配置后重启页面。")
    elif not developer_diagnostics:
        st.info(
            "当前为离线示例体验，只支持这些固定主题："
            + "、".join(supported_mock_topics())
            + "。配置在线模型密钥后可生成其他主题。"
        )

    input_column, result_column = st.columns([1, 1.6], gap="large")
    with input_column:
        st.subheader("你想制作什么主题？")
        fee_confirmed = True
        if MODE_LABELS[mode_label] == "real":
            fee_confirmed = st.checkbox("我已了解本次在线生成可能产生调用费用。")
        with st.form("knowledge_request"):
            topic = st.text_input("主题 *", value="生日悖论", max_chars=500)
            focus = st.text_input("具体方向（可选）", max_chars=500)
            creative_mode = st.selectbox("创作模式", list(CREATIVE_MODES))
            knowledge_depth = st.selectbox("知识深度", list(KNOWLEDGE_DEPTHS))
            creative_idea = st.text_area("个人创意（可选）", max_chars=2000)
            art_style = st.text_input("美术风格偏好（可选）", max_chars=300)
            must_include = st.text_area("必须包含（每行一项，可选）", max_chars=2000)
            must_avoid = st.text_area("必须避免（每行一项，可选）", max_chars=2000)
            creative_mode_notes = ""
            if creative_mode == "自定义":
                creative_mode_notes = st.text_area("自定义模式说明 *", max_chars=1000)
            submitted = st.form_submit_button(
                "生成方向建议",
                type="primary",
                use_container_width=True,
                disabled=not fee_confirmed or not settings.api_key
                if MODE_LABELS[mode_label] == "real"
                else False,
            )

        if submitted:
            if not topic.strip():
                st.error("请先填写主题。")
            elif creative_mode == "自定义" and not creative_mode_notes.strip():
                st.error("自定义创作模式需要填写说明。")
            elif MODE_LABELS[mode_label] == "mock" and not mock_topic_supported(topic):
                st.warning(
                    "这个主题没有对应的固定离线示例。可尝试："
                    + "、".join(supported_mock_topics())
                    + "；或配置在线模型后再生成。"
                )
            else:
                record = _run_user_input(
                    _build_user_input(
                        {
                            "topic": topic,
                            "focus": focus,
                            "creative_mode": creative_mode,
                            "knowledge_depth": knowledge_depth,
                            "creative_idea": creative_idea,
                            "art_style": art_style,
                            "must_include": must_include,
                            "must_avoid": must_avoid,
                            "creative_mode_notes": creative_mode_notes,
                        }
                    ),
                    mode_label,
                    developer_diagnostics=developer_diagnostics,
                )
                st.session_state["knowledge_runs"].insert(0, record)
                st.session_state["selected_run_id"] = record["run_id"]

        if st.session_state["knowledge_runs"]:
            labels = [
                f"{run['started_at'][:19]} · {run['brief']['user_input']['topic']} · "
                + (
                    next(
                        (item['title'] for item in run['package']['directions']
                         if item['id'] == run['package']['recommended_direction_id']),
                        "已准备方向",
                    )
                    if run.get("package")
                    else "暂未完成"
                )
                for run in st.session_state["knowledge_runs"]
            ]
            selected = st.selectbox("历史运行", labels, index=0)
            selected_run = st.session_state["knowledge_runs"][labels.index(selected)]
            st.session_state["selected_run_id"] = selected_run["run_id"]
            retry_confirmed = True
            if MODE_LABELS[mode_label] == "real":
                retry_confirmed = st.checkbox(
                    "我已了解再次在线生成可能产生调用费用。",
                    key="knowledge_retry_fee_confirmation",
                )
            if st.button(
                "再试一次",
                use_container_width=True,
                disabled=(
                    not retry_confirmed or not settings.api_key
                    if MODE_LABELS[mode_label] == "real"
                    else False
                ),
            ):
                record = _run_user_input(
                    selected_run["brief"]["user_input"],
                    mode_label,
                    developer_diagnostics=developer_diagnostics,
                )
                st.session_state["knowledge_runs"].insert(0, record)
                st.session_state["selected_run_id"] = record["run_id"]

    with result_column:
        st.subheader("开发者诊断" if developer_diagnostics else "方向建议")
        selected_id = st.session_state.get("selected_run_id")
        selected_run = next(
            (run for run in st.session_state["knowledge_runs"] if run["run_id"] == selected_id),
            None,
        )
        if not selected_run:
            st.info("提交主题后，这里会显示推荐方向和核心看点。")
        else:
            _render_selected_run(selected_run, developer_diagnostics=developer_diagnostics)


if __name__ == "__main__":
    main()
