import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { stageNames, type Stage } from "../../common/progress";
import "./progress-event-scene.css";

export type ProgressSceneEvent = {
  id: string;
  text: string;
  stage?: Stage;
  seq?: number;
};

export type ProgressSceneStatus = "pending" | "running" | "completed" | "failed";

type Flight = ProgressSceneEvent & {
  stage: Stage;
  launchProgress: number;
  seed: number;
  slot: number;
};
type Point = { x: number; y: number };
type SceneSize = { width: number; height: number };

const VIEW = { width: 1200, height: 420 };
// Graceful full-bleed horizon wave spanning edge to edge
const TRACK_D = "M 76 312 C 268 312 330 162 590 168 C 845 174 912 316 1124 198";
const MILESTONES = [0.333, 0.666, 1] as const;
const MAX_FLIGHTS = 3;

const progressByStage: Record<Stage, Record<ProgressSceneStatus, number>> = {
  knowledge: { pending: 0, running: 0.16, completed: 0.333, failed: 0.16 },
  script: { pending: 0.333, running: 0.5, completed: 0.666, failed: 0.5 },
  animation: { pending: 0.666, running: 0.85, completed: 1, failed: 0.85 },
};

const eventAnchor: Record<Stage, number> = {
  knowledge: 0.2,
  script: 0.52,
  animation: 0.84,
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function hashSeed(input: string) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function pointAt(path: SVGPathElement, progress: number): Point {
  const length = path.getTotalLength();
  return path.getPointAtLength(length * clamp01(progress));
}

function pixelPointAt(path: SVGPathElement | null, progress: number, size: SceneSize): Point {
  if (!path || size.width <= 0 || size.height <= 0) {
    return { x: size.width / 2, y: size.height * 0.66 };
  }
  const point = pointAt(path, progress);
  return {
    x: (point.x / VIEW.width) * size.width,
    y: (point.y / VIEW.height) * size.height,
  };
}

function useMotionEnvironment(sceneRef: RefObject<HTMLDivElement | null>) {
  const [pageVisible, setPageVisible] = useState(true);
  const [inView, setInView] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(query.matches);
    const updateVisibility = () => setPageVisible(document.visibilityState === "visible");
    updateMotion();
    updateVisibility();
    query.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);

    const node = sceneRef.current;
    const observer = node && "IntersectionObserver" in window
      ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting))
      : null;
    if (node) observer?.observe(node);

    return () => {
      query.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
      observer?.disconnect();
    };
  }, [sceneRef]);

  return {
    pageVisible,
    inView,
    reducedMotion,
    motionAllowed: pageVisible && inView && !reducedMotion,
  };
}

/**
 * 60fps Living Daylight Starfield, Drifting Cosmic Particles & Rising Micro-Bubbles.
 * Full-bleed across the entire progress view with subtle constellations and zero container walls.
 */
function StarfieldCanvas({
  size,
  active,
  headPoint,
  stage,
}: {
  size: SceneSize;
  active: boolean;
  headPoint: { left: number; top: number };
  stage: Stage;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const headRef = useRef(headPoint);
  const stageRef = useRef(stage);
  headRef.current = headPoint;
  stageRef.current = stage;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width <= 0 || size.height <= 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size.width * dpr);
    canvas.height = Math.round(size.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const palette = [
      [20, 184, 154],  // emerald-mint
      [48, 146, 232],  // sky-cerulean
      [120, 102, 230], // luminous lavender
      [238, 162, 58],  // champagne gold
    ] as const;

    type Particle = {
      x: number;
      y: number;
      vx: number;
      vy: number;
      r: number;
      phase: number;
      speed: number;
      star: boolean;
      color: readonly [number, number, number];
      depth: number;
    };

    const count = Math.min(72, Math.max(40, Math.round(size.width / 19)));
    const particles: Particle[] = Array.from({ length: count }, (_, i) => {
      const s1 = hashSeed(`p-x-${i}`);
      const s2 = hashSeed(`p-y-${i}`);
      const s3 = hashSeed(`p-v-${i}`);
      const depth = 0.45 + hashSeed(`p-d-${i}`) * 0.85;
      return {
        x: s1 * size.width,
        y: s2 * size.height,
        vx: (s3 - 0.5) * 14 * depth,
        vy: -(5 + hashSeed(`p-vy-${i}`) * 12) * depth,
        r: (1.4 + hashSeed(`p-r-${i}`) * 2.8) * depth,
        phase: hashSeed(`p-ph-${i}`) * Math.PI * 2,
        speed: 0.9 + hashSeed(`p-sp-${i}`) * 1.6,
        star: i % 5 === 0,
        color: palette[i % palette.length],
        depth,
      };
    });

    type MicroBubble = {
      x: number;
      y: number;
      age: number;
      life: number;
      r: number;
      swayAmp: number;
      swayFreq: number;
      phase: number;
      driftX: number;
      color: readonly [number, number, number];
    };

    const microBubbles: MicroBubble[] = [];
    let spawnTimer = 0;

    function spawnBubble(originX: number, originY: number) {
      const stageColor =
        stageRef.current === "script"
          ? palette[1]
          : stageRef.current === "animation"
            ? palette[3]
            : palette[0];
      const useAccent = Math.random() < 0.65;
      microBubbles.push({
        x: originX + (Math.random() - 0.5) * 36,
        y: originY + (Math.random() - 0.5) * 20,
        age: 0,
        life: 3.2 + Math.random() * 2.8,
        r: 2.6 + Math.random() * 5.2,
        swayAmp: 12 + Math.random() * 26,
        swayFreq: 1.4 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 22,
        color: useAccent ? stageColor : palette[Math.floor(Math.random() * palette.length)],
      });
    }

    // Seed a few gentle rising bubbles immediately so the scene feels alive on frame 1
    for (let i = 0; i < 10; i++) {
      spawnBubble(Math.random() * size.width, size.height * (0.42 + Math.random() * 0.45));
      microBubbles[microBubbles.length - 1].age = Math.random() * 2.2;
    }

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;

    function drawFrame(dt: number) {
      if (!ctx) return;
      elapsed += dt;
      ctx.clearRect(0, 0, size.width, size.height);

      // Update & draw ambient starfield particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += (p.vx + Math.sin(elapsed * 0.65 + p.phase) * 7 * p.depth) * dt;
        p.y += p.vy * dt;

        if (p.y < -18) {
          p.y = size.height + 16;
          p.x = ((p.x % size.width) + size.width) % size.width;
        }
        if (p.x < -20) p.x = size.width + 18;
        if (p.x > size.width + 20) p.x = -18;
      }

      // Soft constellation filaments between nearby stars
      ctx.lineWidth = 0.85;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 108 * 108) {
            const alpha = (1 - Math.sqrt(d2) / 108) * 0.14;
            ctx.strokeStyle = `rgba(${a.color[0]}, ${a.color[1]}, ${a.color[2]}, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles & crisp 4-point twinkling stars
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const twinkle = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(elapsed * p.speed + p.phase));
        const [r, g, b] = p.color;

        if (p.star) {
          const arm = p.r * (2.1 + twinkle * 1.1);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.28 + twinkle * 0.48).toFixed(3)})`;
          ctx.beginPath();
          ctx.moveTo(0, -arm);
          ctx.quadraticCurveTo(0, 0, arm, 0);
          ctx.quadraticCurveTo(0, 0, 0, arm);
          ctx.quadraticCurveTo(0, 0, -arm, 0);
          ctx.quadraticCurveTo(0, 0, 0, -arm);
          ctx.fill();
          ctx.fillStyle = `rgba(255, 255, 255, ${(0.55 + twinkle * 0.4).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(0, 0, Math.max(0.9, p.r * 0.42), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.22 + twinkle * 0.34).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Spawn & animate glossy rising micro-bubbles from near the progress head & horizon
      spawnTimer += dt;
      if (spawnTimer > 0.34 && microBubbles.length < 22) {
        spawnTimer = 0;
        const hx = (headRef.current.left / 100) * size.width;
        const hy = (headRef.current.top / 100) * size.height;
        if (Math.random() < 0.6) {
          spawnBubble(hx, hy);
        } else {
          spawnBubble(size.width * (0.1 + Math.random() * 0.8), size.height * (0.55 + Math.random() * 0.32));
        }
      }

      for (let i = microBubbles.length - 1; i >= 0; i--) {
        const mb = microBubbles[i];
        mb.age += dt;
        const u = mb.age / mb.life;
        if (u >= 1) {
          microBubbles.splice(i, 1);
          continue;
        }
        const bx = mb.x + mb.driftX * u + Math.sin(mb.age * mb.swayFreq + mb.phase) * mb.swayAmp;
        const by = mb.y - u * (110 + mb.r * 12);
        const fade = u < 0.16 ? u / 0.16 : u > 0.72 ? (1 - u) / 0.28 : 1;
        const radius = mb.r * (0.6 + 0.45 * Math.min(1, u * 3)) * (1 + Math.max(0, u - 0.72) * 0.45);
        const [r, g, b] = mb.color;

        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${(0.14 * fade).toFixed(3)})`;
        ctx.fill();
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(0.44 * fade).toFixed(3)})`;
        ctx.stroke();

        // Glossy specular bubble highlight crescent
        ctx.beginPath();
        ctx.arc(bx - radius * 0.32, by - radius * 0.32, Math.max(0.8, radius * 0.28), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${(0.88 * fade).toFixed(3)})`;
        ctx.fill();
        ctx.restore();
      }
    }

    drawFrame(0.016);
    if (!active) return;

    function tick(now: number) {
      const dt = Math.min(0.05, Math.max(0.004, (now - last) / 1000));
      last = now;
      drawFrame(dt);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size.width, size.height, active]);

  return <canvas ref={canvasRef} className="progress-starfield-canvas" aria-hidden="true" />;
}

/**
 * Silky Organic Drifting Event Bubble ("冒泡泡" trajectory):
 * Pops right out of the active progress head with a ripple & 6 glossy mini-bubbles,
 * floats upward along an irregular-yet-buttery dual-harmonic S-curve, stays effortlessly readable,
 * then gently expands and dissolves into the starry sky.
 */
function FlightBubble({
  event,
  trackRef,
  sceneSize,
  paused,
  onFinish,
}: {
  event: Flight;
  trackRef: RefObject<SVGPathElement | null>;
  sceneSize: SceneSize;
  paused: boolean;
  onFinish: (id: string) => void;
}) {
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const rippleRef = useRef<HTMLSpanElement | null>(null);
  const miniRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const pausedRef = useRef(paused);
  const finishRef = useRef(onFinish);
  pausedRef.current = paused;
  finishRef.current = onFinish;

  useEffect(() => {
    const bubble = bubbleRef.current;
    const path = trackRef.current;
    if (!bubble || !path || sceneSize.width <= 0 || sceneSize.height <= 0) return;

    const anchor = pixelPointAt(path, event.launchProgress, sceneSize);
    const s1 = event.seed;
    const s2 = hashSeed(`${event.id}:sway`);
    const s3 = hashSeed(`${event.id}:rise`);
    const s4 = hashSeed(`${event.id}:phase`);

    const safeMargin = Math.min(220, sceneSize.width * 0.24);
    const slotBias = (event.slot - 1) * 96; // -96, 0, +96 spread when multiple bubbles float together
    const rawDriftX = (s1 - 0.5) * 180 + slotBias;
    const targetMidX = Math.max(safeMargin, Math.min(sceneSize.width - safeMargin, anchor.x + rawDriftX));
    const driftX = targetMidX - anchor.x;

    const riseY = Math.min(anchor.y - 54, Math.max(115, 132 + s3 * 78));
    const amp1 = 22 + s2 * 24;
    const amp2 = 8 + (1 - s2) * 11;
    const freq1 = 2.0 + s1 * 1.1;
    const freq2 = 3.6 + s3 * 1.2;
    const phase = s4 * Math.PI * 2;
    const duration = 5.4;

    const miniSpecs = Array.from({ length: 6 }, (_, i) => {
      const ms = hashSeed(`${event.id}:mini:${i}`);
      const angle = -Math.PI * 0.88 + (i / 5) * Math.PI * 0.76 + (ms - 0.5) * 0.24;
      return {
        dx: Math.cos(angle) * (46 + ms * 44),
        dy: Math.sin(angle) * (54 + ms * 56) - 24,
        sway: (ms - 0.5) * 28,
        delay: i * 0.035,
      };
    });

    let raf = 0;
    let elapsed = 0;
    let last = performance.now();
    let done = false;

    function render(tSec: number) {
      if (!bubble) return;
      const u = clamp01(tSec / duration);

      // Smooth buoyant vertical lift + gentle continued float while dissolving
      const riseEase = 1 - (1 - Math.min(1, u / 0.74)) ** 2.6;
      const tailLift = u > 0.7 ? ((u - 0.7) / 0.3) ** 1.4 * 52 : 0;
      const y = anchor.y - riseY * riseEase - tailLift;

      // Irregular yet silky dual-harmonic S-curve sway
      const swayEnvelope = Math.sin(Math.min(1, u * 1.15) * Math.PI * 0.85);
      const sway =
        (Math.sin(u * Math.PI * freq1 + phase) * amp1 +
          Math.cos(u * Math.PI * freq2 - phase) * amp2) *
        swayEnvelope;
      const xRaw = anchor.x + driftX * (1 - (1 - u) ** 2.1) + sway;
      const x = Math.max(safeMargin * 0.72, Math.min(sceneSize.width - safeMargin * 0.72, xRaw));

      // Pop-in elastic bloom -> calm buoyant breath -> soft dissolve into stardust
      let scale = 1;
      let opacity = 1;
      let blurPx = 0;
      if (u < 0.13) {
        const k = u / 0.13;
        scale = 0.34 + 0.7 * (1 - (1 - k) ** 3);
        opacity = Math.min(1, k * 1.5);
      } else if (u < 0.76) {
        const breath = Math.sin((u - 0.13) * Math.PI * 4) * 0.016;
        scale = 1 + breath;
        opacity = 1;
      } else {
        const fadeU = (u - 0.76) / 0.24;
        scale = 1 + fadeU * 0.085;
        opacity = Math.max(0, 1 - fadeU ** 1.35);
        blurPx = fadeU * 3.5;
      }

      const tilt = Math.cos(u * Math.PI * freq1 + phase) * 2.2 * swayEnvelope;
      bubble.style.visibility = "visible";
      bubble.style.opacity = opacity.toFixed(3);
      bubble.style.filter = blurPx > 0.08 ? `blur(${blurPx.toFixed(2)}px)` : "none";
      bubble.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${tilt.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

      // Expanding birth water-ripple at anchor
      const ripple = rippleRef.current;
      if (ripple) {
        const ru = clamp01(tSec / 1.15);
        ripple.style.visibility = ru < 1 ? "visible" : "hidden";
        ripple.style.opacity = ((1 - ru) * 0.62).toFixed(3);
        ripple.style.transform = `translate3d(${anchor.x.toFixed(1)}px, ${anchor.y.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(0.35 + ru * 2.4).toFixed(3)})`;
      }

      // 6 tiny glossy mini-bubbles popping off on curved trails
      for (let i = 0; i < miniSpecs.length; i++) {
        const node = miniRefs.current[i];
        if (!node) continue;
        const spec = miniSpecs[i];
        const mu = clamp01((tSec - spec.delay) / 1.45);
        if (mu <= 0 || mu >= 1) {
          node.style.visibility = "hidden";
          continue;
        }
        const mEase = 1 - (1 - mu) ** 2.2;
        const mx = anchor.x + spec.dx * mEase + Math.sin(mu * Math.PI * 2) * spec.sway;
        const my = anchor.y + spec.dy * mEase - mu * 22;
        const mAlpha = mu < 0.2 ? mu / 0.2 : 1 - (mu - 0.2) / 0.8;
        const mScale = 0.55 + Math.sin(mu * Math.PI) * 0.65;
        node.style.visibility = "visible";
        node.style.opacity = (mAlpha * 0.85).toFixed(3);
        node.style.transform = `translate3d(${mx.toFixed(1)}px, ${my.toFixed(1)}px, 0) translate(-50%, -50%) scale(${mScale.toFixed(3)})`;
      }
    }

    render(0);

    function tick(now: number) {
      if (done) return;
      const dt = Math.min(0.05, Math.max(0.004, (now - last) / 1000));
      last = now;
      if (!pausedRef.current) {
        elapsed += dt;
        render(elapsed);
        if (elapsed >= duration) {
          done = true;
          finishRef.current(event.id);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      done = true;
      cancelAnimationFrame(raf);
    };
  }, [event.id, event.launchProgress, event.seed, event.slot, trackRef, sceneSize.width, sceneSize.height]);

  return (
    <>
      <span ref={rippleRef} className={`progress-anchor-ripple stage-${event.stage}`} aria-hidden="true" />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <span
          key={index}
          ref={(node) => {
            miniRefs.current[index] = node;
          }}
          className={`progress-mini-bubble mini-${index} stage-${event.stage}`}
          aria-hidden="true"
        />
      ))}
      <div
        ref={bubbleRef}
        className={`progress-bubble-orb stage-${event.stage}`}
        aria-hidden="true"
      >
        <span className="bubble-orb-sphere" />
        <span className="progress-flight-text">{event.text}</span>
      </div>
    </>
  );
}

export function ProgressEventScene({
  stage,
  status,
  streamKey,
  fineProgress,
  recentEvents = [],
  incomingEvents = [],
}: {
  stage: Stage;
  status: ProgressSceneStatus;
  streamKey: string;
  fineProgress?: number;
  recentEvents?: ProgressSceneEvent[];
  incomingEvents?: ProgressSceneEvent[];
}) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<SVGPathElement | null>(null);
  const idPrefix = `progress-${useId().replaceAll(":", "")}`;
  const [sceneSize, setSceneSize] = useState<SceneSize>({ width: 0, height: 0 });
  const [flights, setFlights] = useState<Flight[]>([]);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [headPoint, setHeadPoint] = useState({
    left: (76 / VIEW.width) * 100,
    top: (312 / VIEW.height) * 100,
  });
  const [markerPoints, setMarkerPoints] = useState<{ left: number; top: number }[]>([]);
  const flightsRef = useRef(new Map<string, Flight>());
  const queueRef = useRef<ProgressSceneEvent[]>([]);
  const seenRef = useRef(new Set<string>());
  const slotCounterRef = useRef(0);
  const startedRef = useRef(false);
  const streamRef = useRef(streamKey);
  const environment = useMotionEnvironment(sceneRef);
  const animateEvents = !environment.reducedMotion && status !== "failed";
  const animateEventsRef = useRef(animateEvents);
  const stageRef = useRef(stage);
  const progressRef = useRef(0);
  animateEventsRef.current = animateEvents;
  stageRef.current = stage;

  const targetProgress =
    fineProgress !== undefined
      ? clamp01(fineProgress)
      : progressByStage[stage][status];
  progressRef.current = displayProgress;

  useEffect(() => {
    const node = sceneRef.current;
    if (!node || !("ResizeObserver" in window)) return;
    const observer = new ResizeObserver(([entry]) => {
      setSceneSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    flightsRef.current.clear();
    queueRef.current = [];
    seenRef.current.clear();
    setFlights([]);
  }, [streamKey]);

  useEffect(() => {
    let frame = 0;
    if (!startedRef.current || streamRef.current !== streamKey) {
      startedRef.current = true;
      streamRef.current = streamKey;
      setDisplayProgress(0);
      frame = requestAnimationFrame(() => setDisplayProgress(targetProgress));
    } else {
      setDisplayProgress(targetProgress);
    }
    return () => cancelAnimationFrame(frame);
  }, [streamKey, targetProgress]);

  useLayoutEffect(() => {
    const path = trackRef.current;
    if (!path) return;
    const point = pointAt(path, displayProgress);
    setHeadPoint({
      left: (point.x / VIEW.width) * 100,
      top: (point.y / VIEW.height) * 100,
    });
  }, [displayProgress]);

  useLayoutEffect(() => {
    const path = trackRef.current;
    if (!path) return;
    setMarkerPoints(
      MILESTONES.map((milestone) => {
        const point = pointAt(path, milestone);
        return {
          left: (point.x / VIEW.width) * 100,
          top: (point.y / VIEW.height) * 100,
        };
      }),
    );
  }, []);

  const pumpQueue = useCallback(() => {
    if (!animateEventsRef.current) return;
    const nextFlights = new Map(flightsRef.current);
    while (nextFlights.size < MAX_FLIGHTS && queueRef.current.length > 0) {
      const event = queueRef.current.shift();
      if (!event) break;
      const eventStage = event.stage ?? stageRef.current;
      const slot = slotCounterRef.current % 3;
      slotCounterRef.current += 1;
      const launchProgress = Math.max(0.04, Math.min(0.95, progressRef.current || eventAnchor[eventStage]));
      nextFlights.set(event.id, {
        ...event,
        stage: eventStage,
        launchProgress,
        seed: hashSeed(`${event.id}:${slotCounterRef.current}`),
        slot,
      });
    }
    flightsRef.current = nextFlights;
    setFlights([...nextFlights.values()]);
  }, []);

  useEffect(() => {
    const seen = seenRef.current;
    const fresh = incomingEvents
      .filter((event) => !seen.has(event.id))
      .sort((left, right) =>
        left.seq !== undefined && right.seq !== undefined
          ? left.seq - right.seq
          : left.id.localeCompare(right.id),
      );
    if (!fresh.length) return;
    for (const event of fresh) seen.add(event.id);
    while (seen.size > 64) seen.delete(seen.values().next().value as string);
    if (!animateEvents) return;
    queueRef.current = [...queueRef.current, ...fresh].slice(-6);
    pumpQueue();
  }, [incomingEvents, animateEvents, pumpQueue]);

  const finishFlight = useCallback(
    (id: string) => {
      const nextFlights = new Map(flightsRef.current);
      nextFlights.delete(id);
      flightsRef.current = nextFlights;
      setFlights([...nextFlights.values()]);
      pumpQueue();
    },
    [pumpQueue],
  );

  useEffect(() => {
    if (animateEvents) {
      pumpQueue();
      return;
    }
    queueRef.current = [];
    flightsRef.current.clear();
    setFlights([]);
  }, [animateEvents, pumpQueue]);

  // Strict zero-protrusion guard: before any progress starts, no filled ribbon or glow protrudes!
  const hasProgress = displayProgress > 0.008;
  const dashOffset = hasProgress ? 1000 * (1 - displayProgress) : 1000;

  const sceneClassName = [
    "progress-event-scene",
    `stage-${stage}`,
    `status-${status}`,
    !hasProgress ? "is-idle" : "",
    !environment.motionAllowed ? "motion-limited" : "",
    status === "failed" ? "is-failed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      ref={sceneRef}
      className={sceneClassName}
      data-stage={stage}
      data-status={status}
      aria-label={`${stageNames[stage]}${status === "failed" ? "，暂时中断" : status === "completed" ? "，已完成" : "，正在进行"}`}
    >
      {/* Full-bleed living daylight starfield, drifting particles & rising micro-bubbles */}
      <StarfieldCanvas
        size={sceneSize}
        active={environment.motionAllowed}
        headPoint={headPoint}
        stage={stage}
      />

      {/* Ambient radial light aura following the active progress orb */}
      <div className="progress-glow-dust" aria-hidden="true">
        <span
          className="progress-stage-aura"
          style={{ left: `${headPoint.left}%`, top: `${headPoint.top}%` }}
        />
      </div>

      {/* Luminous fluid trajectory ribbon (strictly masked — zero protrusion bug at start!) */}
      <svg
        className="progress-event-ornament"
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${idPrefix}-fill`} x1="0" y1="0" x2="1" y2="0.12">
            <stop offset="0%" stopColor="#28d4b2" />
            <stop offset="35%" stopColor="#129f86" />
            <stop offset="68%" stopColor="#358de6" />
            <stop offset="100%" stopColor="#eb9b38" />
          </linearGradient>
          <linearGradient id={`${idPrefix}-base`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#129d83" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#358de6" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#eb9b38" stopOpacity="0.22" />
          </linearGradient>
          <filter id={`${idPrefix}-glow`} x="-15%" y="-80%" width="130%" height="260%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          <mask id={`${idPrefix}-reveal`} maskUnits="userSpaceOnUse" x="0" y="0" width={VIEW.width} height={VIEW.height}>
            <path
              className="progress-comet-mask"
              d={TRACK_D}
              pathLength="1000"
              stroke="#fff"
              strokeWidth="26"
              strokeLinecap="round"
              strokeDasharray="1000"
              style={{ strokeDashoffset: dashOffset }}
            />
          </mask>
        </defs>
        <path className="progress-track-base" d={TRACK_D} pathLength="1000" stroke={`url(#${idPrefix}-base)`} />
        <path className="progress-track-guide" d={TRACK_D} pathLength="1000" />
        <path
          className="progress-track-aura"
          d={TRACK_D}
          pathLength="1000"
          stroke={`url(#${idPrefix}-fill)`}
          filter={`url(#${idPrefix}-glow)`}
          style={{ strokeDashoffset: dashOffset, opacity: hasProgress ? 0.3 : 0 }}
        />
        <path
          ref={trackRef}
          className="progress-track-fill"
          d={TRACK_D}
          pathLength="1000"
          stroke={`url(#${idPrefix}-fill)`}
          style={{ strokeDashoffset: dashOffset, opacity: hasProgress ? 1 : 0 }}
        />
        <path
          className="progress-track-shine"
          d={TRACK_D}
          pathLength="1000"
          style={{ strokeDashoffset: dashOffset, opacity: hasProgress ? 0.85 : 0 }}
        />
        {hasProgress && (
          <path
            className="progress-track-shimmer"
            d={TRACK_D}
            pathLength="1000"
            mask={`url(#${idPrefix}-reveal)`}
          />
        )}
      </svg>

      {/* Milestone stars & active glowing progress head */}
      <div className="progress-track-decor" aria-hidden="true">
        {markerPoints.map((point, index) => {
          const milestone = MILESTONES[index];
          const passed = hasProgress && displayProgress + 0.005 >= milestone;
          return (
            <span
              key={milestone}
              className={`progress-milestone ${passed ? "is-passed" : ""} ${milestone === 1 ? "is-final" : ""}`}
              style={{ left: `${point.left}%`, top: `${point.top}%` }}
            >
              <i />
            </span>
          );
        })}
        <span className="progress-head" style={{ left: `${headPoint.left}%`, top: `${headPoint.top}%` }}>
          <span key={`${streamKey}-${stage}-${status}`} className="progress-head-surge" />
          <span className="progress-head-orbit" />
          <span className="progress-head-satellite satellite-one"><i /></span>
          <span className="progress-head-satellite satellite-two"><i /></span>
          <span className="progress-head-halo" />
          <span className="progress-head-ring" />
          <span className="progress-head-core" />
          {status === "completed" && (
            <>
              <span className="progress-complete-flare" />
              <span className="progress-complete-flare flare-two" />
            </>
          )}
        </span>
      </div>

      {/* Organic drifting event bubbles */}
      <div className="progress-flight-layer" aria-hidden="true">
        {flights.map((flight) => (
          <FlightBubble
            key={`${streamKey}:${flight.id}`}
            event={flight}
            trackRef={trackRef}
            sceneSize={sceneSize}
            paused={!environment.motionAllowed || status === "failed"}
            onFinish={finishFlight}
          />
        ))}
      </div>

      {/* Reduced-motion / failed static event pills */}
      <div className="progress-static-events" aria-hidden="true">
        {recentEvents.slice(-2).map((event, index) => {
          const eventStage = event.stage ?? stage;
          const left = Math.min(76, Math.max(24, eventAnchor[eventStage] * 100));
          return (
            <span
              className={`static-event lane-${index} stage-${eventStage}`}
              key={`${streamKey}:${event.id}`}
              style={{ left: `${left}%` }}
            >
              <i />
              {event.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
