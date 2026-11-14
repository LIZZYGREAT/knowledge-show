import { useGSAP } from '@gsap/react';
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AnimationPlayer } from '../../animation/runtime/AnimationPlayer';
import type { FrameBounds, SelectableElement } from '../../animation/runtime/SceneTypes';
import { pnS01 } from '../../animation/scenes/pn-junction/S01';
import { s01Script, scriptRef } from '../../animation/scenes/pn-junction/script';
import './preview.css';

declare global { interface Window { __animationPreview?: AnimationPlayer } }
function Preview() {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<AnimationPlayer | null>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [elements, setElements] = useState<SelectableElement[]>([]);
  const [selected, setSelected] = useState('');
  const [bounds, setBounds] = useState<FrameBounds | null>(null);
  const [error, setError] = useState('');
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  useGSAP(() => {
    const current = new AnimationPlayer(host.current!, pnS01);
    player.current = current;
    if (import.meta.env.DEV) window.__animationPreview = current;
    setElements(current.getSelectableElements());
    const unsubscribe = current.subscribe((next, active) => {
      setTime(next); setPlaying(active);
      setBounds(current.getElementBounds(selectedRef.current));
    });
    const observer = new ResizeObserver(() => setBounds(current.getElementBounds(selectedRef.current)));
    observer.observe(host.current!);
    return () => {
      observer.disconnect(); unsubscribe(); current.destroy(); player.current = null;
      if (window.__animationPreview === current) delete window.__animationPreview;
    };
  }, { scope: host });
  async function seek(ms: number) {
    try {
      await player.current!.seekAndWaitForFrame(ms);
      setBounds(player.current!.getElementBounds(selectedRef.current));
    } catch (e) { if (!(e instanceof DOMException && e.name === 'AbortError')) setError(String(e)); }
  }
  const event = s01Script.events.find(e => time >= e.offset_ms && time < e.offset_ms + e.duration_ms);
  return <main className="preview-shell">
    <header><a href="/">knowledge.show</a><span>动画研发预览 / P0</span><span>precision-science</span></header>
    <div className="preview-title"><div><p>固定脚本试作 · {scriptRef.artifact_id} r{scriptRef.revision}</p><h1>同一个结，两个方向。</h1></div><p>S01 · 00:00—00:15<br/>仅验证首幕，不代表完整视频已生成</p></div>
    <div className="preview-layout">
      <section className="player-panel" aria-label="场景预览">
        <div className="video-content"><div ref={host} data-testid="video-stage" />
          {bounds && <div className="element-overlay" data-testid="element-overlay" style={{ left: `${bounds.x * 100}%`, top: `${bounds.y * 100}%`, width: `${bounds.width * 100}%`, height: `${bounds.height * 100}%` }} />}
        </div>
        <div className="transport"><button onClick={() => playing ? player.current!.pause() : player.current!.play()}>{playing ? '暂停' : '播放'}</button><output>{(time / 1000).toFixed(2)} / 15.00 s</output><input aria-label="播放位置" type="range" min="0" max="15000" step="10" value={time} onChange={e => void seek(Number(e.target.value))} /></div>
        <div className="keyframes"><span>关键帧</span>{[0, 6000, 10000, 15000].map(ms => <button key={ms} onClick={() => void seek(ms)}>{ms / 1000}s</button>)}</div>
      </section>
      <aside><p className="inspector-heading">对象检查</p><p>选择框仅属于预览工具。</p>{elements.map(element => <button className="object-choice" key={element.id} aria-pressed={element.id === selected} onClick={() => { setSelected(element.id); selectedRef.current = element.id; setBounds(player.current!.getElementBounds(element.id)); }}>{element.label}<small>{element.id}</small></button>)}<p className="frame-status">{selected ? bounds ? '当前帧可定位' : '当前帧不可见' : '选择一个逻辑对象以检查边界'}</p><p>当前事件：{event?.id ?? 'S01 结束'}</p><p className="event-description">{event?.description}</p></aside>
    </div>
    {error && <p role="alert">{error}</p>}
  </main>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><Preview /></StrictMode>);
