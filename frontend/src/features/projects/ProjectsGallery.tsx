import { useEffect, useState } from "react";
import { listProjects, type ProjectListItem } from "../../common/api";
import { depths, modes } from "../../common/creation";

const stageBadge: Record<
  ProjectListItem["stage"],
  { label: string; tone: string }
> = {
  brief: { label: "需求草稿", tone: "" },
  knowledge: { label: "知识已整理", tone: "" },
  script: { label: "脚本已就绪", tone: "is-script" },
  animation: { label: "动画可预览", tone: "is-ready" },
};

function formatDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ProjectsGallery({
  onCreateNew,
  onResumeProject,
  onOpenTemplates,
}: {
  onCreateNew: () => void;
  onResumeProject: (item: ProjectListItem, openProgress: boolean) => void;
  onOpenTemplates: () => void;
}) {
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const list = await listProjects();
      setItems(list);
    } catch (cause) {
      setError((cause as Error).message || "暂时无法读取本地项目列表。");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <main className="projects-page page-enter">
      <div className="projects-head">
        <div>
          <p className="eyebrow">MY STUDIO · LOCAL WORKS</p>
          <h1>我的作品</h1>
          <p>
            管理本机保存的所有创作项目，随时回到进度页继续制作动画，或一键打开工作台精修。
          </p>
        </div>
        <div className="hero-cta-row" style={{ marginBottom: 0 }}>
          <button
            type="button"
            className="secondary"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? "刷新中…" : "刷新列表"}
          </button>
          <button type="button" className="primary" onClick={onCreateNew}>
            新建作品 <span>↗</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="projects-empty" role="alert">
          <h2>暂时无法连接本地作品库</h2>
          <p>{error}</p>
          <div className="progress-actions">
            <button
              type="button"
              className="secondary"
              onClick={() => void refresh()}
            >
              重新连接
            </button>
            <button type="button" className="primary" onClick={onOpenTemplates}>
              先浏览画风模板与 Demo →
            </button>
          </div>
        </div>
      )}

      {!error && loading && (
        <div className="projects-empty" role="status">
          <h2>正在读取本机作品…</h2>
          <p>正在整理已保存的脚本与动画版本。</p>
        </div>
      )}

      {!error && !loading && items.length === 0 && (
        <div className="projects-empty">
          <h2>还没有创建过作品</h2>
          <p>
            从一个好奇的问题开始，系统会自动帮你探索知识、编排脚本并制作可微调的动态视频；也可以先去画风模板展厅找灵感。
          </p>
          <div className="progress-actions">
            <button type="button" className="primary" onClick={onCreateNew}>
              开始创作第一支动画 →
            </button>
            <button type="button" className="secondary" onClick={onOpenTemplates}>
              查看 1:1 模板 Demo
            </button>
            <a className="secondary" href="/workbench.html?demo=pn">
              体验 PN 结样片工作台
            </a>
          </div>
        </div>
      )}

      {!error && !loading && items.length > 0 && (
        <div className="projects-grid">
          {items.map((item) => {
            const badge = stageBadge[item.stage];
            const modeLabel =
              modes.find(([k]) => k === item.creative_mode)?.[1] ??
              item.creative_mode;
            const depthLabel =
              depths.find(([k]) => k === item.knowledge_depth)?.[1] ??
              item.knowledge_depth;
            return (
              <article key={item.project_id} className="project-card">
                <div className="project-card-top">
                  <span className={`project-status-badge ${badge.tone}`}>
                    {badge.label}
                  </span>
                  <span className="project-time">
                    r{item.revision} · {formatDate(item.updated_at)}
                  </span>
                </div>
                <h2>{item.topic || "未命名作品"}</h2>
                <div className="project-meta-row">
                  <span className="project-meta-tag">{modeLabel}</span>
                  <span className="project-meta-tag">{depthLabel}</span>
                  {item.art_style && (
                    <span className="project-meta-tag">{item.art_style}</span>
                  )}
                </div>
                <div className="project-card-actions">
                  {item.workbench_url && (
                    <a className="primary" href={item.workbench_url}>
                      进入工作台 →
                    </a>
                  )}
                  {item.latest_job_id && (
                    <button
                      type="button"
                      className={item.workbench_url ? "secondary" : "primary"}
                      onClick={() => onResumeProject(item, true)}
                    >
                      查看进度
                    </button>
                  )}
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => onResumeProject(item, false)}
                  >
                    编辑要求
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
