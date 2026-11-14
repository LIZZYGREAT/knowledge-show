import { Modal } from "../../components/Modal";
import { depths, modes, type Draft } from "../../common/creation";
export function CreationConfirm({
  draft,
  onClose,
  onConfirm,
  error,
}: {
  draft: Draft;
  onClose: () => void;
  onConfirm: () => void;
  error: string;
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
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button className="secondary" onClick={onClose}>
          返回修改
        </button>
        <button className="primary" onClick={onConfirm}>
          确认，开始制作 →
        </button>
      </div>
    </Modal>
  );
}
