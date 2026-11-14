import { useEffect, useState } from 'react';
type Preview = { status: string; message?: string; workbench_url?: string; bundle_url?: string };
async function call(path: string, body?: unknown) {
  const response = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error?.message ?? '动画暂时无法读取。');
  return value;
}
export function AnimationHandoff({ projectId, apiKey }: { projectId: string; apiKey?: string | null }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [message, setMessage] = useState('正在核对动画资源。');
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function check() {
      try {
        const { preview: value, job } = await call(`/api/projects/${projectId}/animations/status`);
        const running = job && ['queued', 'running'].includes(job.status);
        if (value.status === 'ready' && value.bundle_url) await call(value.bundle_url);
        if (stopped) return;
        setPreview(value); setBusy(!!running);
        setMessage(running ? job.message : job && ['failed', 'interrupted'].includes(job.status) ? job.message : value.status === 'ready' ? '动画已准备好，可以预览和调整。' : '脚本已保存，可以开始制作动画。');
        if (running) timer = setTimeout(() => void check(), 1200);
      } catch (error) { if (!stopped) { setMessage((error as Error).message); setBusy(false); } }
    }
    void check();
    return () => { stopped = true; clearTimeout(timer); };
  }, [projectId, refresh]);
  async function generate() {
    setBusy(true);
    try {
      const handoff = await call(`/api/projects/${projectId}/handoff/animation`);
      await call(`/api/projects/${projectId}/animations`, { expected_project_revision: handoff.project_revision, style_id: 'auto', ...(apiKey ? { api_key: apiKey } : {}) });
      setMessage('正在制作动画，完成检查后才能进入工作台。');
      setRefresh(value => value + 1);
    } catch (error) { setMessage((error as Error).message); setBusy(false); }
  }
  return <section aria-label="动画制作" style={{ margin: '24px auto', maxWidth: 760 }}><p role="status">{message}</p><div className="progress-actions">{preview?.status === 'ready' && preview.workbench_url ? <a className="primary" href={preview.workbench_url}>进入工作台 →</a> : <button className="primary" onClick={() => void generate()} disabled={busy}>{busy ? '正在制作动画…' : '开始制作动画 →'}</button>}</div></section>;
}
