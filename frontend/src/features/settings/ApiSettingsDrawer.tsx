import { useEffect, useRef, useState } from "react";
import { Modal } from "../../components/Modal";
import { useEphemeralKey } from "./EphemeralKeyContext";
export type TestConnection = (
  key: string,
  signal: AbortSignal,
) => Promise<boolean>;
export function ApiSettingsDrawer({
  onClose,
  testConnection,
}: {
  onClose: () => void;
  testConnection?: TestConnection;
}) {
  const session = useEphemeralKey();
  const [key, setKey] = useState(session.key);
  const [show, setShow] = useState(false);
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<
    "unconfigured" | "testing" | "connected" | "failed"
  >(session.connected ? "connected" : "unconfigured");
  const [message, setMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = null;
    },
    [],
  );
  function changeKey(value: string) {
    controller.current?.abort();
    controller.current = null;
    setKey(value);
    setStatus("unconfigured");
    setMessage("");
  }
  async function test() {
    if (!key.trim() || !consent) {
      setMessage("请填写密钥，并确认本次使用方式。");
      return;
    }
    if (!testConnection) {
      setStatus("failed");
      setMessage("本地连接服务尚未接入，暂时无法测试。密钥未发送。");
      return;
    }
    const request = new AbortController();
    controller.current = request;
    setStatus("testing");
    setMessage("");
    const timeout = window.setTimeout(() => {
      request.abort();
      if (controller.current === request) {
        setStatus("failed");
        setMessage("连接超时，请重试。");
      }
    }, 15000);
    try {
      const ok = await testConnection(key.trim(), request.signal);
      if (request.signal.aborted) return;
      setStatus(ok ? "connected" : "failed");
      setMessage(
        ok ? "连接成功，可以用于后续创作。" : "密钥无法使用，请检查后重试。",
      );
    } catch {
      if (controller.current === request) {
        setStatus("failed");
        setMessage("暂时无法连接，请检查本地服务或网络后重试。");
      }
    } finally {
      window.clearTimeout(timeout);
      if (controller.current === request && request.signal.aborted) {
        setStatus("failed");
        setMessage("连接已停止，请重试。");
      }
    }
  }
  return (
    <Modal title="设置" drawer onClose={onClose}>
      <div className="settings-body">
        <p className="eyebrow">MODEL CONNECTION</p>
        <h3>模型连接</h3>
        <p className="quiet">使用自己的 DeepSeek API Key 开始创作。</p>
        <div className="provider-row">
          <span>服务商</span>
          <strong>DeepSeek</strong>
        </div>
        <label className="field" htmlFor="api-key">
          API Key
        </label>
        <div className="key-input">
          <input
            id="api-key"
            type={show ? "text" : "password"}
            value={key}
            onChange={(e) => changeKey(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-…"
          />
          <button
            onClick={() => setShow(!show)}
            aria-label={show ? "隐藏密钥" : "显示密钥"}
          >
            {show ? "隐藏" : "显示"}
          </button>
        </div>
        <label className="consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          <span>
            我了解：密钥仅用于本次连接和创作请求，应用不会持久保存我的密钥。
          </span>
        </label>
        <p className="setting-hint">
          测试连接会实际请求 DeepSeek；开始创作会进行知识研究和脚本生成，可能产生模型与搜索费用。密钥只保留在当前页面会话和本机请求内存中，刷新后需重新填写。
        </p>
        <div className="settings-actions">
          <button
            className="secondary"
            disabled={status === "testing"}
            onClick={test}
          >
            {status === "testing" ? "测试中…" : "测试连接"}
          </button>
          <button
            className="primary"
            disabled={!consent || status !== "connected"}
            onClick={() => {
              session.setConnection(key.trim(), true);
              onClose();
            }}
          >
            本次使用
          </button>
        </div>
        <p
          className={`connection-status ${status === "failed" ? "error" : ""}`}
          role="status"
        >
          连接状态：
          {
            {
              unconfigured: "未配置",
              testing: "测试中",
              connected: "已连接",
              failed: "失败",
            }[status]
          }
          {message && <span>{message}</span>}
        </p>
        {session.key && (
          <button
            className="text-button"
            onClick={() => {
              session.setConnection("", false);
              changeKey("");
            }}
          >
            清除本次连接
          </button>
        )}
        <aside className="integration-hint">
          本地创作 API 已接入。脚本完成后会等待动画制作；当前尚无真实视频预览。
        </aside>
      </div>
    </Modal>
  );
}
