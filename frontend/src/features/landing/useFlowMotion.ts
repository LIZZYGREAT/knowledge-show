import { useEffect, useRef, useState, type RefObject } from "react";

const INTRO_DURATION = 5500;
const FRAME_INTERVAL = 1000 / 30;

export function useFlowMotion(
  target: RefObject<HTMLElement | null>,
  animate = true,
) {
  const [time, setTime] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? INTRO_DURATION
      : 0,
  );
  const [paused, setPaused] = useState(true);
  const elapsed = useRef(0);

  useEffect(() => {
    if (!animate) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0;
    let last = 0;
    let lastPaint = 0;
    let visible = true;
    let focused = true;
    let disposed = false;

    function tick(now: number) {
      if (disposed) return;
      if (last) elapsed.current += Math.min(now - last, 48);
      last = now;
      if (now - lastPaint >= FRAME_INTERVAL) {
        lastPaint = now;
        setTime(elapsed.current / 1000);
      }
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      cancelAnimationFrame(frame);
      last = 0;
      const stop = media.matches || document.hidden || !visible || !focused;
      setPaused(stop);
      if (media.matches) {
        elapsed.current = INTRO_DURATION;
        setTime(INTRO_DURATION / 1000);
      } else if (!stop) {
        frame = requestAnimationFrame(tick);
      }
    }
    function handleFocus() {
      focused = true;
      sync();
    }
    function handleBlur() {
      focused = false;
      sync();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      sync();
    });
    if (target.current) observer.observe(target.current);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);
    media.addEventListener("change", sync);
    sync();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      media.removeEventListener("change", sync);
    };
  }, [target, animate]);

  return { time, paused };
}
