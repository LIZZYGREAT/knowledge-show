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
from knowledge.service import RunOptions, generate_knowledge_package  # noqa: E402


MODE_LABELS = {"离线 Mock": "mock", "Real API": "real"}
CREATIVE_MODES = {
    "遵循默认": None,
    "创意优先": "creative",
    "直观演示": "visual_explain",
    "干货精讲": "knowledge_dense",
    "故事悬念": "story",
    "自定义": "custom",
}
KNOWLEDGE_DEPTHS = {"遵循默认": None, "入门": "intro", "均衡": "balanced", "进阶": "advanced"}


def _split_lines(text: str) -> list[str]:
    return [line.strip() for line in text.splitlines() if line.strip()]


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


def _run_user_input(user_input: dict[str, Any], mode_label: str) -> dict[str, Any]:
    brief = build_brief(user_input)
    events: list[dict[str, Any]] = []
    progress = st.status(f"{mode_label}：开始研究…", expanded=True)

    def receive_event(event: dict[str, Any]) -> None:
        events.append(event)
        phase = event["phase"]
        icon = "⚠️" if event["event_type"] == "failed" else "✓"
        progress.write(f"{icon} **{phase}** · {event['summary']}")
        if event.get("error"):
            progress.write(f"错误：{event['error']}")

    mode = MODE_LABELS[mode_label]
    project_id = st.session_state.setdefault("knowledge_project_id", "P_LOCAL_KNOWLEDGE_REVIEW")
    package: dict[str, Any] | None = None
    error: str | None = None
    started_at = datetime.now(timezone.utc).isoformat()
    try:
        package = asyncio.run(
            generate_knowledge_package(
                project_id,
                brief,
                on_event=receive_event,
                run_options=RunOptions(mode=mode),
            )
        )
        progress.update(label=f"{mode_label}：KnowledgePackage 已校验", state="complete")
    except Exception as exc:
        error = str(exc)
        progress.update(label=f"{mode_label}：运行失败", state="error")

    run_id = next((event.get("run_id") for event in events if event.get("run_id")), "RUN_UNKNOWN")
    return {
        "run_id": run_id,
        "project_id": project_id,
        "mode": mode,
        "mode_label": mode_label,
        "started_at": started_at,
        "brief": brief,
        "events": events,
        "issues": [
            {
                "issue": event["issue"],
                "recommendation": event.get("recommendation", ""),
                "status": event.get("stats", {}).get("status", "open"),
            }
            for event in events
            if event.get("issue")
        ],
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


def _render_selected_run(run: dict[str, Any]) -> None:
    st.markdown(f"**当前运行：{run['mode_label']} · {run['run_id']}**")
    if run["error"]:
        st.error(f"未形成可交付知识包。阶段性信息保留在运行记录中。\n\n{run['error']}")
        with st.expander("查看已完成阶段"):
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

    st.subheader("人工检验记录")
    with st.form(f"review_{run['run_id']}"):
        rating_labels = {
            "可继续使用": "usable",
            "需要调整": "needs_adjustment",
            "当前不可用": "unusable",
        }
        selected_label = next(
            (label for label, value in rating_labels.items() if value == run.get("rating")),
            "可继续使用",
        )
        rating_label = st.radio("人工判断", list(rating_labels), index=list(rating_labels).index(selected_label))
        note = st.text_area("备注", value=run.get("note", ""), max_chars=2000)
        submitted = st.form_submit_button("保存人工检验记录")
    if submitted:
        run["rating"] = rating_labels[rating_label]
        run["note"] = note
        st.session_state["knowledge_runs"] = [
            run if item["run_id"] == run["run_id"] else item
            for item in st.session_state["knowledge_runs"]
        ]
        st.success("人工检验记录已保存到当前本地页面会话。")

    st.download_button(
        "下载本次输入、备注与运行摘要",
        data=_run_export(run),
        file_name=f"{run['run_id']}-review.json",
        mime="application/json",
        key=f"run_download_{run['run_id']}",
    )


def main() -> None:
    st.set_page_config(page_title="知识层人工检验", layout="wide")
    st.title("知识层人工检验 · 本地开发入口")
    st.caption("本页面只监听本机。Mock 是固定离线资料；Real API 调用 DeepSeek。")

    if "knowledge_runs" not in st.session_state:
        st.session_state["knowledge_runs"] = []
    if "selected_run_id" not in st.session_state:
        st.session_state["selected_run_id"] = None

    input_column, result_column = st.columns([1, 1.6], gap="large")
    with input_column:
        st.subheader("输入")
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
            mode_label = st.radio("运行模式", list(MODE_LABELS), horizontal=True)
            submitted = st.form_submit_button("开始研究", type="primary", use_container_width=True)

        if submitted:
            if not topic.strip():
                st.error("请先填写主题。")
            elif creative_mode == "自定义" and not creative_mode_notes.strip():
                st.error("自定义创作模式需要填写说明。")
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
                )
                st.session_state["knowledge_runs"].insert(0, record)
                st.session_state["selected_run_id"] = record["run_id"]

        if st.session_state["knowledge_runs"]:
            labels = [
                f"{run['started_at'][:19]} · {run['mode_label']} · {run['brief']['user_input']['topic']} · {run['run_id']}"
                for run in st.session_state["knowledge_runs"]
            ]
            selected = st.selectbox("历史运行", labels, index=0)
            selected_run = st.session_state["knowledge_runs"][labels.index(selected)]
            st.session_state["selected_run_id"] = selected_run["run_id"]
            if st.button("重新运行所选输入", use_container_width=True):
                record = _run_user_input(selected_run["brief"]["user_input"], selected_run["mode_label"])
                st.session_state["knowledge_runs"].insert(0, record)
                st.session_state["selected_run_id"] = record["run_id"]

    with result_column:
        st.subheader("运行状态与本次结果")
        selected_id = st.session_state.get("selected_run_id")
        selected_run = next(
            (run for run in st.session_state["knowledge_runs"] if run["run_id"] == selected_id),
            None,
        )
        if not selected_run:
            st.info("提交主题后查看阶段进度与推荐方向。")
        else:
            _render_selected_run(selected_run)


if __name__ == "__main__":
    main()
