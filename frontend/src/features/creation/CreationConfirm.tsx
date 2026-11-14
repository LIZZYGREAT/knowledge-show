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
  return (
    <Modal title="准备把这个问题变成动画" onClose={onClose}>
      <p className="confirm-topic">{draft.topic}</p>
      <p className="quiet">
        讲述方式：{modes.find(([key]) => key === draft.creative_mode)?.[1]}
        <br />
        知识深度：{depths.find(([key]) => key === draft.knowledge_depth)?.[1]} ·
        横版约 3 分钟
      </p>
      {draft.focus && <p className="confirm-focus">特别想讲：{draft.focus}</p>}
      {draft.creative_mode === "custom" && <p>{draft.creative_mode_notes}</p>}
      <p className="quiet">
        连续制作会按需运行研究、脚本或动画生成，可能产生模型费用；已有成果会在适用时复用。你也可以先看脚本。
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
