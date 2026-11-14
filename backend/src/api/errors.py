"""Public-safe HTTP errors for the local API."""

from __future__ import annotations

from fastapi.responses import JSONResponse

from workflow.service import WorkflowError
from workflow.state import ProjectStateConflict, ProjectStateError


def error_response(status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": {"code": code, "message": message}},
    )


def public_error(exc: Exception) -> tuple[str, str]:
    diagnostic = str(exc).lower()
    name = type(exc).__name__.lower()
    if "missing" in diagnostic and "key" in diagnostic:
        return "missing_key", "请先配置可用的 API Key。"
    if "rejected the api key" in diagnostic or "401" in diagnostic or "403" in diagnostic:
        return "invalid_key", "API Key 无法使用，请检查后重试。"
    if "rate limited" in diagnostic or "429" in diagnostic:
        return "rate_limited", "服务暂时繁忙，请稍后重试。"
    if "timeout" in diagnostic or "connection" in name:
        return "temporarily_unavailable", "暂时无法连接生成服务，请检查网络后重试。"
    if isinstance(exc, ProjectStateConflict):
        return "conflict", "项目状态已更新，请刷新后重试。"
    if isinstance(exc, (ProjectStateError, WorkflowError, ValueError)):
        return "failed", "这一步暂时没有完成，请稍后重试。"
    return "temporarily_unavailable", "生成服务暂时不可用，请稍后重试。"
