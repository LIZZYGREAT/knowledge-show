import type { AnimationBundle } from '../../runtime/BundleTypes';
import type { FrameBounds, SceneDefinition, SelectableElement } from '../../runtime/SceneTypes';
import { WEM_ELEMENT_METADATA } from './demoBundle';

type WemEngine = {
  duration: number;
  preroll: number;
  renderFrame: (tSeconds: number) => void;
};

type WemModule = {
  createEngine: (opts: {
    canvas: HTMLCanvasElement;
    width: number;
    height: number;
    cfg: Record<string, any>;
    featuresData: Record<string, any>;
    lyricsData: Record<string, any>;
    flipY?: boolean;
    lab?: string | null;
    onStep?: ((label: string) => void) | null;
    baseUrl?: string;
  }) => Promise<WemEngine>;
};

const BASE_URL = '/demos/world-execute-me';

const ELEMENT_BOUNDS: Record<string, FrameBounds> = {
  EL_WEM_WINDOW: { x: 0.14, y: 0.1, width: 0.72, height: 0.78 },
  EL_WEM_SPARK: { x: 0.43, y: 0.36, width: 0.14, height: 0.24 },
  EL_WEM_FIGURE: { x: 0.52, y: 0.12, width: 0.36, height: 0.78 },
  EL_WEM_TYPOGRAPHY: { x: 0.12, y: 0.74, width: 0.76, height: 0.16 },
  EL_WEM_GEOMETRY: { x: 0.2, y: 0.18, width: 0.6, height: 0.62 },
  EL_WEM_SETTINGS: { x: 0.56, y: 0.12, width: 0.32, height: 0.74 },
  EL_WEM_PLATES: { x: 0.1, y: 0.12, width: 0.8, height: 0.74 },
  EL_WEM_ERRORS: { x: 0.2, y: 0.22, width: 0.6, height: 0.56 },
};

const STYLE_FILTER_BY_ID: Record<string, string> = {
  'precision-science': 'none',
  'paper-editorial': 'sepia(0.18) saturate(0.92) contrast(0.98) brightness(1.04)',
  'modern-graphic': 'saturate(1.24) contrast(1.08)',
  'narrative-collage': 'sepia(0.24) hue-rotate(-8deg) contrast(1.04)',
};

export function createWorldExecuteMeSequence(bundle: AnimationBundle): SceneDefinition {
  const styleId = Object.values(bundle.resources)[0]?.style?.id ?? 'precision-science';
  const selectable: SelectableElement[] = bundle.manifest.selectable_elements.map((entry) => {
    const timed = bundle.script.scenes.flatMap((s) => s.timed_text).find((t) => t.id === entry.id);
    return {
      id: entry.id,
      label: timed?.text ?? WEM_ELEMENT_METADATA[entry.id] ?? entry.id,
      ...(entry.source_ref ? { sourceRef: entry.source_ref } : {}),
    };
  });

  return {
    sceneId: bundle.manifest.artifact_id,
    durationMs: bundle.manifest.total_duration_ms,
    mount(host) {
      host.replaceChildren();
      host.style.position = 'relative';
      host.style.width = '100%';
      host.style.height = '100%';
      host.style.background = '#121312';
      host.style.overflow = 'hidden';

      const canvas = document.createElement('canvas');
      canvas.width = 960;
      canvas.height = 540;
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      canvas.style.objectFit = 'contain';
      canvas.style.filter = STYLE_FILTER_BY_ID[styleId] ?? 'none';

      const loader = document.createElement('div');
      loader.style.cssText =
        'position:absolute;inset:0;display:grid;place-items:center;background:rgba(16,18,17,0.92);color:#e4e2da;font:500 13px/1.6 ui-monospace,Consolas,monospace;text-align:center;padding:24px;transition:opacity 0.35s ease;z-index:2;';
      const loaderInner = document.createElement('div');
      loaderInner.innerHTML =
        '<div style="font-size:15px;color:#fffaf1;margin-bottom:8px;">world.execute(me);</div>' +
        '<div id="wem-load-status" style="color:#d97757;font-size:12px;">正在加载 14 幕 87 镜头实时引擎…</div>';
      loader.append(loaderInner);
      host.append(canvas, loader);

      let engine: WemEngine | null = null;
      let destroyed = false;
      let currentMs = 0;

      const setStatus = (text: string) => {
        const node = loader.querySelector('#wem-load-status');
        if (node) node.textContent = text;
      };

      void (async () => {
        try {
          const [cfgRes, featRes, lyrRes] = await Promise.all([
            fetch(`${BASE_URL}/config.json`),
            fetch(`${BASE_URL}/data/audio_features.json`),
            fetch(`${BASE_URL}/data/lyrics.json`),
          ]);
          if (!cfgRes.ok || !featRes.ok || !lyrRes.ok) {
            throw new Error('参考样片静态资源加载失败。');
          }
          const [cfg, featuresData, lyricsData] = await Promise.all([
            cfgRes.json(),
            featRes.json(),
            lyrRes.json(),
          ]);
          if (destroyed) return;
          setStatus('正在初始化三色版画与 WebGL2 渲染管线…');

          // Lazy-load bundled vendored ES module engine (works seamlessly in both Vite dev & build)
          const mod = (await import('./vendor/engine/engine.js')) as WemModule;
          if (destroyed) return;

          const created = await mod.createEngine({
            canvas,
            width: 960,
            height: 540,
            cfg,
            featuresData,
            lyricsData,
            baseUrl: BASE_URL,
            onStep: (label) => {
              if (!destroyed) setStatus(`加载资源 · ${label}`);
            },
          });
          if (destroyed) return;
          engine = created;
          engine.renderFrame(currentMs / 1000);
          loader.style.opacity = '0';
          window.setTimeout(() => {
            if (!destroyed) loader.remove();
          }, 360);
        } catch (error) {
          if (!destroyed) {
            setStatus(`加载异常：${(error as Error).message}`);
          }
        }
      })();

      return {
        seek(ms) {
          if (destroyed) throw new Error('Sequence destroyed');
          currentMs = Math.max(0, Math.min(bundle.manifest.total_duration_ms, ms));
          if (engine) {
            engine.renderFrame(currentMs / 1000);
          }
        },
        getSelectableElements: () => selectable,
        getElementBounds(id) {
          if (ELEMENT_BOUNDS[id]) return ELEMENT_BOUNDS[id];
          const activeScene = bundle.script.scenes.find(
            (s) => currentMs >= s.start_ms && currentMs <= s.start_ms + s.duration_ms,
          );
          if (activeScene && activeScene.timed_text.some((t) => t.id === id)) {
            return ELEMENT_BOUNDS.EL_WEM_TYPOGRAPHY;
          }
          return null;
        },
        destroy() {
          destroyed = true;
          engine = null;
          host.replaceChildren();
        },
      };
    },
  };
}
