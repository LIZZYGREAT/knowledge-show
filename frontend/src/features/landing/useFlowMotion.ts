import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

const INTRO_DURATION = 5500;
const FRAME_INTERVAL = 1000 / 30;

export function useFlowMotion(
  target: RefObject<HTMLElement | null>,
  animate = true,
  staticTime = INTRO_DURATION / 1000,
) {
  const [time, setTime] = useState(() =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? staticTime
      : 0,
  );
  const [paused, setPaused] = useState(true);
  const [userPaused, setUserPaused] = useState(false);
  const [compact, setCompact] = useState(() => window.innerWidth < 768);
  const elapsed = useRef(0);
  const userPausedRef = useRef(false);
  const syncRef = useRef<() => void>(() => {});

  const seek = useCallback((seconds: number) => {
    const next = Math.max(0, seconds);
    elapsed.current = next * 1000;
    setTime(next);
  }, []);

  const togglePause = useCallback(() => {
    userPausedRef.current = !userPausedRef.current;
    setUserPaused(userPausedRef.current);
    syncRef.current();
  }, []);

  useEffect(() => {
    if (!animate) return;
    const size = window.matchMedia("(max-width: 767px)");
    const resize = () => setCompact(size.matches);
    size.addEventListener("change", resize);
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
      if (now - lastPaint >= FRAME_INTERVAL - 1) {
        lastPaint = now;
        setTime(elapsed.current / 1000);
      }
      frame = requestAnimationFrame(tick);
    }

    function sync() {
      cancelAnimationFrame(frame);
      last = 0;
      const stop =
        media.matches ||
        document.hidden ||
        !visible ||
        !focused ||
        userPausedRef.current;
      setPaused(stop);
      if (media.matches) {
        elapsed.current = staticTime * 1000;
        setTime(staticTime);
      } else if (!stop) {
        frame = requestAnimationFrame(tick);
      }
    }
    syncRef.current = sync;
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
      syncRef.current = () => {};
      cancelAnimationFrame(frame);
      observer.disconnect();
      size.removeEventListener("change", resize);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
      media.removeEventListener("change", sync);
    };
  }, [target, animate, staticTime]);

  return { time, paused, userPaused, compact, seek, togglePause };
}
