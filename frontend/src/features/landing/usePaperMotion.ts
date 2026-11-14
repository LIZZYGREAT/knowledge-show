import { useEffect, useRef, useState, type RefObject } from "react";
// Runs only the opening, then lets CSS handle the quiet waiting pose. No idle RAF.
export function usePaperMotion(
  target: RefObject<HTMLElement | null>,
  animate = true,
) {
  const [progress, setProgress] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0,
  );
  const [paused, setPaused] = useState(true);
  const elapsed = useRef(0);
  useEffect(() => {
    if (!animate) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      last = 0,
      visible = true,
      focused = true,
      disposed = false;
    function tick(now: number) {
      if (disposed) return;
      if (last)
        elapsed.current = Math.min(
          2600,
          elapsed.current + Math.min(now - last, 64),
        );
      last = now;
      setProgress(elapsed.current / 2600);
      if (elapsed.current < 2600) frame = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(frame);
      last = 0;
      const stop = media.matches || document.hidden || !visible || !focused;
      setPaused(stop);
      if (media.matches) {
        elapsed.current = 2600;
        setProgress(1);
      } else if (!stop && elapsed.current < 2600)
        frame = requestAnimationFrame(tick);
    }
    function focus() {
      focused = true;
      sync();
    }
    function blur() {
      focused = false;
      sync();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    if (target.current) observer.observe(target.current);
    if (!media.matches) setProgress(elapsed.current / 2600);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    media.addEventListener("change", sync);
    sync();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", focus);
      window.removeEventListener("blur", blur);
      media.removeEventListener("change", sync);
    };
  }, [target, animate]);
  return { progress, paused };
}
