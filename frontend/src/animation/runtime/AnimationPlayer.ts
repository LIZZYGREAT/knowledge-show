import type { SceneDefinition, SceneHandle } from './SceneTypes';

/** P0: a single scene. Manifest/resource loading belongs to the P1 adapter. */
export class AnimationPlayer {
  private scene: SceneHandle;
  private time = 0;
  private frame = 0;
  private playing = false;
  private disposed = false;
  private seekVersion = 0;
  private pending = new Map<number, () => void>();
  private listeners = new Set<(time: number, playing: boolean) => void>();
  constructor(host: HTMLElement, readonly definition: SceneDefinition) {
    this.scene = definition.mount(host);
    this.scene.seek(0);
    document.addEventListener('visibilitychange', this.visibility);
  }
  private visibility = () => { if (document.hidden) this.pause(); };
  private check() { if (this.disposed) throw new Error('Player has been destroyed'); }
  private notify() { this.listeners.forEach(fn => fn(this.time, this.playing)); }
  subscribe(fn: (time: number, playing: boolean) => void) {
    this.check(); this.listeners.add(fn); fn(this.time, this.playing);
    return () => { this.listeners.delete(fn); };
  }
  play() {
    this.check();
    if (this.playing) return;
    if (this.time === this.definition.durationMs) { this.time = 0; this.scene.seek(0); }
    ++this.seekVersion;
    this.playing = true;
    const origin = performance.now() - this.time;
    const tick = (now: number) => {
      if (!this.playing || this.disposed) return;
      this.time = Math.min(this.definition.durationMs, now - origin);
      this.scene.seek(this.time);
      if (this.time === this.definition.durationMs) this.playing = false;
      this.notify();
      if (this.playing) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick); this.notify();
  }
  pause() { this.playing = false; cancelAnimationFrame(this.frame); this.notify(); }
  async seekAndWaitForFrame(timeMs: number) {
    this.check();
    if (!Number.isFinite(timeMs)) throw new Error('Seek time must be finite');
    this.pause();
    const version = ++this.seekVersion;
    this.time = Math.max(0, Math.min(this.definition.durationMs, timeMs));
    this.scene.seek(this.time);
    this.notify();
    await new Promise<void>(resolve => {
      const frame = requestAnimationFrame(() => { this.pending.delete(frame); resolve(); });
      this.pending.set(frame, resolve);
    });
    if (this.disposed || version !== this.seekVersion) throw new DOMException('Seek superseded', 'AbortError');
    return { renderedTimeMs: this.time };
  }
  getCurrentTimeMs() { return this.time; }
  getSelectableElements() { this.check(); return this.scene.getSelectableElements(); }
  getElementBounds(id: string) { this.check(); return this.scene.getElementBounds(id); }
  destroy() {
    if (this.disposed) return;
    this.pause(); this.disposed = true; ++this.seekVersion;
    this.pending.forEach((resolve, frame) => { cancelAnimationFrame(frame); resolve(); });
    this.pending.clear(); this.listeners.clear(); this.scene.destroy();
    document.removeEventListener('visibilitychange', this.visibility);
  }
}
