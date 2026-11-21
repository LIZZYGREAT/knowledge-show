import { Modal } from "../../components/Modal";
import { depths, modes, type Draft } from "../../common/creation";

export function CreationConfirm({
  draft,
  onClose,
  onConfirm,
  error,
  busy = false,
}: {
  draft: Draft;
  onClose: () => void;
  onConfirm: (continueToPreview: boolean) => void;
  error: string;
  busy?: boolean;
}) {
  const modeLabel = modes.find(([key]) => key === draft.creative_mode)?.[1];
  const depthLabel = depths.find(([key]) => key === draft.knowledge_depth)?.[1];
  return (
    <Modal title="准备把这个问题变成动画" onClose={onClose}>
      <div className="confirm-ticket">
        <p className="confirm-topic">{draft.topic}</p>
        <div className="confirm-meta">
          <span className="confirm-chip is-warm">讲述方式 · {modeLabel}</span>
          <span className="confirm-chip">知识深度 · {depthLabel}</span>
          <span className="confirm-chip">16:9 横版 · 约 3 分钟</span>
        </div>
        {draft.art_style.trim() && (
          <p className="quiet">美术偏好：{draft.art_style.trim()}</p>
        )}
        {draft.focus && <p className="confirm-focus">特别想讲：{draft.focus}</p>}
        {draft.creative_mode === "custom" && (
          <p className="confirm-focus">自定义讲述：{draft.creative_mode_notes}</p>
        )}
      </div>
      <p className="confirm-note">
        连续制作会按需运行研究、脚本与动画生成，可能产生模型调用费用；已有成果会在适用时自动复用。你也可以选择先查看脚本。
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="secondary" onClick={onClose}>
          返回修改
        </button>
        <button className="secondary" onClick={() => onConfirm(false)} disabled={busy}>
          {busy ? "正在启动…" : "先看脚本"}
        </button>
        <button className="primary" onClick={() => onConfirm(true)} disabled={busy}>
          {busy ? "正在启动…" : "确认并连续制作到预览 →"}
        </button>
      </div>
    </Modal>
  );
}
