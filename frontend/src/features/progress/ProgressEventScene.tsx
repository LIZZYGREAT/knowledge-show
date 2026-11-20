import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import { stageNames, type Stage } from "../../common/progress";
import "./progress-event-scene.css";

gsap.registerPlugin(useGSAP);

export type ProgressSceneEvent = {
  id: string;
  text: string;
  stage?: Stage;
  seq?: number;
};

export type ProgressSceneStatus = "pending" | "running" | "completed" | "failed";

type Flight = ProgressSceneEvent & { stage: Stage; slot: number };
type Point = { x: number; y: number };
type SceneSize = { width: number; height: number };

const VIEW = { width: 1000, height: 340 };
// One calm left-to-right track: the task climbs, settles, then opens toward the finish.
const TRACK_D = "M 82 250 C 216 250 244 128 460 122 C 676 130 712 282 920 168";
const MILESTONES = [0.34, 0.66, 1] as const;
const MAX_FLIGHTS = 1;

const progressByStage: Record<Stage, Record<ProgressSceneStatus, number>> = {
  knowledge: { pending: 0.02, running: 0.16, completed: 0.34, failed: 0.16 },
  script: { pending: 0.32, running: 0.5, completed: 0.66, failed: 0.5 },
  animation: { pending: 0.64, running: 0.85, completed: 1, failed: 0.85 },
};
const eventAnchor: Record<Stage, number> = {
  knowledge: 0.2,
  script: 0.54,
  animation: 0.86,
};

const ambientComets = [
  { size: 2.8, duration: "15s", begin: "-2s", tone: "mint" },
  { size: 2.2, duration: "22s", begin: "-8s", tone: "gold" },
  { size: 3.2, duration: "18s", begin: "-13s", tone: "teal" },
  { size: 2, duration: "26s", begin: "-5s", tone: "gold" },
  { size: 2.6, duration: "12s", begin: "-10s", tone: "mint" },
] as const;

const progressComets = [
  { size: 4.4, duration: "16s", begin: "-3s", tone: "teal" },
  { size: 3.4, duration: "21s", begin: "-9s", tone: "mint" },
  { size: 2.8, duration: "13s", begin: "-6s", tone: "gold" },
  { size: 4, duration: "24s", begin: "-15s", tone: "mint" },
] as const;

const dust = [
  { x: 7, y: 18, size: 6, delay: -1.4, tone: "mint" },
  { x: 14, y: 72, size: 7, delay: -4.4, tone: "gold" },
  { x: 21, y: 34, size: 4, delay: -2.2, tone: "teal" },
  { x: 28, y: 86, size: 5, delay: -5.1, tone: "mint" },
  { x: 36, y: 12, size: 4, delay: -0.7, tone: "mint" },
  { x: 43, y: 52, size: 3, delay: -3.6, tone: "gold" },
  { x: 51, y: 8, size: 5, delay: -6.2, tone: "teal" },
  { x: 58, y: 88, size: 4, delay: -1.9, tone: "gold" },
  { x: 65, y: 24, size: 6, delay: -4.8, tone: "mint" },
  { x: 72, y: 60, size: 3, delay: -2.8, tone: "teal" },
  { x: 79, y: 13, size: 5, delay: -5.7, tone: "gold" },
  { x: 84, y: 78, size: 8, delay: -3.3, tone: "mint" },
  { x: 91, y: 36, size: 4, delay: -0.9, tone: "teal" },
  { x: 96, y: 66, size: 6, delay: -6.6, tone: "gold" },
  { x: 33, y: 64, size: 9, delay: -7.4, tone: "mint", soft: true },
  { x: 70, y: 80, size: 10, delay: -8.1, tone: "teal", soft: true },
  { x: 4, y: 48, size: 4, delay: -3.1, tone: "teal" },
  { x: 18, y: 91, size: 5, delay: -6.9, tone: "gold" },
  { x: 31, y: 22, size: 8, delay: -1.2, tone: "mint" },
  { x: 48, y: 74, size: 9, delay: -5.4, tone: "gold", soft: true },
  { x: 62, y: 44, size: 5, delay: -0.4, tone: "mint" },
  { x: 87, y: 52, size: 7, delay: -4.1, tone: "teal" },
  { x: 95, y: 20, size: 5, delay: -7.7, tone: "mint" },
  { x: 3, y: 34, size: 8, delay: -2.6, tone: "gold", soft: true },
  { x: 6, y: 84, size: 12, delay: -6.3, tone: "mint", soft: true },
  { x: 94, y: 34, size: 13, delay: -7.9, tone: "gold", soft: true },
] as const;

const twinkles = [
  { x: 22, y: 12, delay: -0.5 },
  { x: 46, y: 88, delay: -1.8 },
  { x: 68, y: 14, delay: -3.1 },
  { x: 89, y: 84, delay: -2.4 },
  { x: 12, y: 55, delay: -4 },
] as const;

const diamonds = [
  { x: 9, y: 26, size: 5, delay: -1.2, tone: "gold" },
  { x: 27, y: 79, size: 4, delay: -3.8, tone: "mint" },
  { x: 74, y: 17, size: 6, delay: -2.1, tone: "gold" },
  { x: 93, y: 58, size: 4, delay: -4.6, tone: "teal" },
  { x: 56, y: 91, size: 5, delay: -0.6, tone: "mint" },
] as const;

const plusMarks = [
  { x: 16, y: 14, size: 10, delay: -1.5 },
  { x: 82, y: 22, size: 8, delay: -3.2 },
  { x: 8, y: 62, size: 7, delay: -4.1 },
  { x: 90, y: 74, size: 9, delay: -2.3 },
  { x: 58, y: 6, size: 7, delay: -5.3 },
] as const;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function pointAt(path: SVGPathElement, progress: number): Point {
  const length = path.getTotalLength();
  return path.getPointAtLength(length * clamp01(progress));
}

function pixelPointAt(path: SVGPathElement | null, progress: number, size: SceneSize): Point {
  if (!path || size.width <= 0 || size.height <= 0) {
    return { x: size.width / 2, y: size.height / 2 };
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

  return { pageVisible, inView, reducedMotion, motionAllowed: pageVisible && inView && !reducedMotion };
}

function FlightBubble({
  event,
  slot,
  trackRef,
  sceneRef,
  sceneSize,
  paused,
  onFinish,
}: {
  event: Flight;
  slot: number;
  trackRef: RefObject<SVGPathElement | null>;
  sceneRef: RefObject<HTMLDivElement | null>;
  sceneSize: SceneSize;
  paused: boolean;
  onFinish: (id: string) => void;
}) {
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const rippleRef = useRef<HTMLSpanElement | null>(null);
  const sparkRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const stage = event.stage;
  const spreads = [
    { x: -40, y: -22 },
    { x: 30, y: -32 },
    { x: 5, y: 28 },
    { x: -24, y: 21 },
    { x: 44, y: -9 },
  ];

  useGSAP((_, contextSafe) => {
    const bubble = bubbleRef.current;
    const path = trackRef.current;
    if (!bubble || !path || sceneSize.width <= 0 || sceneSize.height <= 0) return;

    const anchor = pixelPointAt(path, eventAnchor[stage], sceneSize);
    const maxWidth = Math.min(408, sceneSize.width * (sceneSize.width < 620 ? 0.7 : 0.41));
    const halfWidth = maxWidth / 2 + 10;
    const laneOffset = slot === 0
      ? Math.min(128, sceneSize.height * 0.3)
      : Math.min(92, sceneSize.height * 0.24);
    const dock = {
      x: Math.max(halfWidth, Math.min(sceneSize.width - halfWidth, anchor.x + (slot === 0 ? 22 : -16))),
      y: Math.max(58, Math.min(sceneSize.height - 58, anchor.y + (slot === 0 ? -laneOffset : laneOffset))),
    };
    const sparks = sparkRefs.current.filter((node): node is HTMLSpanElement => Boolean(node));

    gsap.set(bubble, {
      x: anchor.x,
      y: anchor.y,
      xPercent: -50,
      yPercent: -50,
      scale: 0.42,
      autoAlpha: 0,
    });
    gsap.set(rippleRef.current, {
      x: anchor.x,
      y: anchor.y,
      xPercent: -50,
      yPercent: -50,
      scale: 0.35,
      autoAlpha: 0.55,
    });
    gsap.set(sparks, {
      x: anchor.x,
      y: anchor.y,
      xPercent: -50,
      yPercent: -50,
      scale: 0.4,
      autoAlpha: 0,
    });

    const finish = contextSafe?.(() => onFinish(event.id)) ?? (() => onFinish(event.id));
    const timeline = gsap.timeline({ paused: true, onComplete: finish });
    timeline
      .to(rippleRef.current, { scale: 2.5, autoAlpha: 0, duration: 1.05, ease: "power2.out" }, 0)
      .to(bubble, { autoAlpha: 1, scale: 0.6, duration: 0.24, ease: "power2.out" }, 0.02)
      .to(bubble, { x: dock.x, y: dock.y, scale: 1, duration: 0.92, ease: "power3.out" }, 0.12)
      .to(sparks, { autoAlpha: 0.92, scale: 1, duration: 0.16, stagger: 0.05, ease: "power1.out" }, 0.3)
      .to(sparks, {
        x: (index: number) => anchor.x + spreads[index].x,
        y: (index: number) => anchor.y + spreads[index].y,
        autoAlpha: 0,
        scale: 0.3,
        duration: 0.72,
        stagger: 0.07,
        ease: "power1.out",
      }, 0.34)
      .to(bubble, { scale: 1.025, duration: 0.24, ease: "sine.out" }, 1.05)
      .to(bubble, { scale: 1, duration: 0.3, ease: "sine.inOut" }, 1.29)
      .to(bubble, { autoAlpha: 0, y: dock.y - 14, scale: 0.97, duration: 0.7, ease: "power1.in" }, 3.55);
    timelineRef.current = timeline;
    if (pausedRef.current) timeline.pause();
    else timeline.play();

    return () => {
      timeline.kill();
      timelineRef.current = null;
    };
  }, {
    scope: sceneRef,
    dependencies: [event.id, slot, sceneSize.width, sceneSize.height],
    revertOnUpdate: true,
  });

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    if (paused) timeline.pause();
    else timeline.play();
  }, [paused]);

  return (
    <>
      <span ref={rippleRef} className="progress-anchor-ripple" aria-hidden="true" />
      {[0, 1, 2, 3, 4].map((index) => (
        <span
          key={index}
          ref={(node) => { sparkRefs.current[index] = node; }}
          className={`progress-flight-spark spark-${index}`}
          aria-hidden="true"
        />
      ))}
      <div
        ref={bubbleRef}
        className={`progress-flight-label lane-${slot} stage-${stage}`}
        aria-hidden="true"
      >
        <span className="progress-flight-mark" />
        <span className="progress-flight-text">{event.text}</span>
      </div>
    </>
  );
}

export function ProgressEventScene({
  stage,
  status,
  streamKey,
  recentEvents = [],
  incomingEvents = [],
}: {
  stage: Stage;
  status: ProgressSceneStatus;
  streamKey: string;
  recentEvents?: ProgressSceneEvent[];
  incomingEvents?: ProgressSceneEvent[];
}) {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<SVGPathElement | null>(null);
  const idPrefix = `progress-${useId().replaceAll(":", "")}`;
  const [sceneSize, setSceneSize] = useState<SceneSize>({ width: 0, height: 0 });
  const [flights, setFlights] = useState<Flight[]>([]);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [headPoint, setHeadPoint] = useState({ left: (82 / VIEW.width) * 100, top: (250 / VIEW.height) * 100 });
  const [markerPoints, setMarkerPoints] = useState<{ left: number; top: number }[]>([]);
  const flightsRef = useRef(new Map<string, Flight>());
  const queueRef = useRef<ProgressSceneEvent[]>([]);
  const seenRef = useRef(new Set<string>());
  const startedRef = useRef(false);
  const streamRef = useRef(streamKey);
  const environment = useMotionEnvironment(sceneRef);
  const animateEvents = !environment.reducedMotion && status !== "failed";
  const animateEventsRef = useRef(animateEvents);
  const stageRef = useRef(stage);
  animateEventsRef.current = animateEvents;
  stageRef.current = stage;

  const targetProgress = progressByStage[stage][status];

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
    setMarkerPoints(MILESTONES.map((milestone) => {
      const point = pointAt(path, milestone);
      return {
        left: (point.x / VIEW.width) * 100,
        top: (point.y / VIEW.height) * 100,
      };
    }));
  }, []);

  const pumpQueue = useCallback(() => {
    if (!animateEventsRef.current) return;
    const nextFlights = new Map(flightsRef.current);
    while (nextFlights.size < MAX_FLIGHTS && queueRef.current.length > 0) {
      const event = queueRef.current.shift();
      if (!event) break;
      const eventStage = event.stage ?? stageRef.current;
      nextFlights.set(event.id, { ...event, stage: eventStage, slot: 0 });
    }
    flightsRef.current = nextFlights;
    setFlights([...nextFlights.values()]);
  }, []);

  useEffect(() => {
    const seen = seenRef.current;
    const fresh = incomingEvents
      .filter((event) => !seen.has(event.id))
      .sort((left, right) => left.seq !== undefined && right.seq !== undefined
        ? left.seq - right.seq
        : left.id.localeCompare(right.id));
    if (!fresh.length) return;
    for (const event of fresh) seen.add(event.id);
    while (seen.size > 64) seen.delete(seen.values().next().value as string);
    if (!animateEvents) return;
    queueRef.current = [...queueRef.current, ...fresh].slice(-4);
    pumpQueue();
  }, [incomingEvents, animateEvents, pumpQueue]);

  const finishFlight = useCallback((id: string) => {
    const nextFlights = new Map(flightsRef.current);
    nextFlights.delete(id);
    flightsRef.current = nextFlights;
    setFlights([...nextFlights.values()]);
    pumpQueue();
  }, [pumpQueue]);

  useEffect(() => {
    if (animateEvents) {
      pumpQueue();
      return;
    }
    queueRef.current = [];
    flightsRef.current.clear();
    setFlights([]);
  }, [animateEvents, pumpQueue]);

  const showComets = environment.motionAllowed && status !== "failed" && status !== "completed";
  const sceneClassName = [
    "progress-event-scene",
    `stage-${stage}`,
    `status-${status}`,
    !environment.motionAllowed ? "motion-limited" : "",
    status === "failed" ? "is-failed" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      ref={sceneRef}
      className={sceneClassName}
      data-stage={stage}
      data-status={status}
      aria-label={`${stageNames[stage]}${status === "failed" ? "，暂时中断" : status === "completed" ? "，已完成" : "，正在进行"}`}
    >
      <div className="progress-backdrop" aria-hidden="true">
        <svg className="progress-sky" viewBox="0 0 1000 340" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`${idPrefix}-sky-ribbon`} x1="0" y1="0" x2="1" y2="0.35">
              <stop offset="0%" stopColor="#38d9c0" stopOpacity="0.42" />
              <stop offset="48%" stopColor="#4c9be8" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#f0b96b" stopOpacity="0.45" />
            </linearGradient>
          </defs>
          <path
            className="progress-sky-ribbon"
            d="M 18 302 C 218 196 380 258 520 184 C 680 100 824 158 992 64"
            stroke={`url(#${idPrefix}-sky-ribbon)`}
          />
          <g className="progress-sky-lines">
            <path d="M54 62 L132 34 L206 78 L122 112 Z" />
            <path d="M786 42 L850 74 L928 40 M850 74 L902 118" />
            <path d="M92 286 L162 308 L238 274" />
            <path d="M724 294 L796 268 L868 302" />
            <path d="M268 30 L312 16 M668 318 L710 300" />
            <path d="M330 52 L378 32 L424 62 L394 96" />
            <path d="M602 300 L648 278 L704 308 L674 320" />
            <path d="M440 24 L468 12" />
            <path d="M560 20 L600 36 L636 18" />
            <path d="M362 318 L410 300 L444 320" />
          </g>
          <g className="progress-sky-dots">
            <line className="sky-dot" x1="54" y1="62" x2="54" y2="62" />
            <line className="sky-dot" x1="132" y1="34" x2="132" y2="34" />
            <line className="sky-dot mint" x1="206" y1="78" x2="206" y2="78" />
            <line className="sky-dot" x1="122" y1="112" x2="122" y2="112" />
            <line className="sky-dot mint" x1="786" y1="42" x2="786" y2="42" />
            <line className="sky-dot" x1="850" y1="74" x2="850" y2="74" />
            <line className="sky-dot teal" x1="928" y1="40" x2="928" y2="40" />
            <line className="sky-dot" x1="902" y1="118" x2="902" y2="118" />
            <line className="sky-dot teal" x1="92" y1="286" x2="92" y2="286" />
            <line className="sky-dot" x1="162" y1="308" x2="162" y2="308" />
            <line className="sky-dot mint" x1="238" y1="274" x2="238" y2="274" />
            <line className="sky-dot" x1="724" y1="294" x2="724" y2="294" />
            <line className="sky-dot mint" x1="796" y1="268" x2="796" y2="268" />
            <line className="sky-dot" x1="868" y1="302" x2="868" y2="302" />
            <line className="sky-dot teal" x1="268" y1="30" x2="268" y2="30" />
            <line className="sky-dot" x1="312" y1="16" x2="312" y2="16" />
            <line className="sky-dot mint" x1="668" y1="318" x2="668" y2="318" />
            <line className="sky-dot" x1="710" y1="300" x2="710" y2="300" />
            <line className="sky-dot mint" x1="330" y1="52" x2="330" y2="52" />
            <line className="sky-dot" x1="378" y1="32" x2="378" y2="32" />
            <line className="sky-dot teal" x1="424" y1="62" x2="424" y2="62" />
            <line className="sky-dot" x1="394" y1="96" x2="394" y2="96" />
            <line className="sky-dot" x1="602" y1="300" x2="602" y2="300" />
            <line className="sky-dot mint" x1="648" y1="278" x2="648" y2="278" />
            <line className="sky-dot teal" x1="704" y1="308" x2="704" y2="308" />
            <line className="sky-dot" x1="674" y1="320" x2="674" y2="320" />
            <line className="sky-dot mint" x1="440" y1="24" x2="440" y2="24" />
            <line className="sky-dot" x1="468" y1="12" x2="468" y2="12" />
            <line className="sky-dot" x1="560" y1="20" x2="560" y2="20" />
            <line className="sky-dot mint" x1="600" y1="36" x2="600" y2="36" />
            <line className="sky-dot teal" x1="636" y1="18" x2="636" y2="18" />
            <line className="sky-dot" x1="362" y1="318" x2="362" y2="318" />
            <line className="sky-dot mint" x1="410" y1="300" x2="410" y2="300" />
            <line className="sky-dot" x1="444" y1="320" x2="444" y2="320" />
            <line className="sky-dot mint" x1="913" y1="229" x2="913" y2="229" />
            <line className="sky-dot" x1="87" y1="229" x2="87" y2="229" />
            <line className="sky-dot teal" x1="87" y1="123" x2="87" y2="123" />
            <line className="sky-dot" x1="913" y1="123" x2="913" y2="123" />
            <line className="sky-dot" x1="733" y1="255" x2="733" y2="255" />
            <line className="sky-dot mint" x1="267" y1="97" x2="267" y2="97" />
          </g>
          <ellipse className="progress-sky-orbit orbit-a" cx="500" cy="176" rx="440" ry="156" />
          <ellipse className="progress-sky-orbit orbit-b" cx="500" cy="176" rx="330" ry="112" />
          <ellipse className="progress-sky-orbit orbit-c" cx="500" cy="176" rx="220" ry="76" />
        </svg>
        <span className="progress-corner corner-tl" />
        <span className="progress-corner corner-tr" />
        <span className="progress-corner corner-bl" />
        <span className="progress-corner corner-br" />
      </div>
      <div className="progress-glow-dust" aria-hidden="true">
        <span className="progress-stage-aura" style={{ left: `${headPoint.left}%`, top: `${headPoint.top}%` }} />
        {twinkles.map((twinkle, index) => (
          <span
            key={`twinkle-${index}`}
            className="progress-twinkle"
            style={{
              left: `${twinkle.x}%`,
              top: `${twinkle.y}%`,
              animationDelay: `${twinkle.delay}s`,
            }}
          />
        ))}
        {diamonds.map((diamond, index) => (
          <span
            key={`diamond-${index}`}
            className={`progress-diamond diamond-${diamond.tone}`}
            style={{
              left: `${diamond.x}%`,
              top: `${diamond.y}%`,
              width: `${diamond.size}px`,
              height: `${diamond.size}px`,
              animationDelay: `${diamond.delay}s`,
            }}
          />
        ))}
        {plusMarks.map((mark, index) => (
          <span
            key={`plus-${index}`}
            className="progress-plus"
            style={{
              left: `${mark.x}%`,
              top: `${mark.y}%`,
              width: `${mark.size}px`,
              height: `${mark.size}px`,
              animationDelay: `${mark.delay}s`,
            }}
          />
        ))}
        {dust.map((mote, index) => (
          <span
            key={index}
            className={`progress-mote mote-${mote.tone} ${"soft" in mote ? "mote-soft" : ""}`}
            style={{
              left: `${mote.x}%`,
              top: `${mote.y}%`,
              width: `${mote.size}px`,
              height: `${mote.size}px`,
              animationDelay: `${mote.delay}s`,
            }}
          />
        ))}
      </div>
      <svg className="progress-event-ornament" viewBox="0 0 1000 340" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${idPrefix}-fill`} x1="0" y1="0" x2="1" y2="0.14">
            <stop offset="0%" stopColor="#7ef2dd" stopOpacity="0.82" />
            <stop offset="34%" stopColor="#38d9c0" />
            <stop offset="68%" stopColor="#68b8ff" />
            <stop offset="100%" stopColor="#f5c678" />
          </linearGradient>
          <linearGradient id={`${idPrefix}-base`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38d9c0" stopOpacity="0.24" />
            <stop offset="55%" stopColor="#68b8ff" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#f0b96b" stopOpacity="0.28" />
          </linearGradient>
          <radialGradient id={`${idPrefix}-comet-mint`} cx="32%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="36%" stopColor="#9af9e9" />
            <stop offset="100%" stopColor="#26bba4" />
          </radialGradient>
          <radialGradient id={`${idPrefix}-comet-teal`} cx="32%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#f7fbff" />
            <stop offset="38%" stopColor="#95ceff" />
            <stop offset="100%" stopColor="#388be0" />
          </radialGradient>
          <radialGradient id={`${idPrefix}-comet-gold`} cx="32%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#fffdf7" />
            <stop offset="36%" stopColor="#ffe1a4" />
            <stop offset="100%" stopColor="#d99a3e" />
          </radialGradient>
          <filter id={`${idPrefix}-glow`} x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="5.5" />
          </filter>
          <mask id={`${idPrefix}-reveal`} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="340">
            <path
              className="progress-comet-mask"
              d={TRACK_D}
              pathLength="1000"
              stroke="#fff"
              strokeWidth="26"
              strokeLinecap="round"
              strokeDasharray="1000"
              style={{ strokeDashoffset: 1000 * (1 - displayProgress) }}
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
          style={{ strokeDashoffset: 1000 * (1 - displayProgress) }}
        />
        <path
          ref={trackRef}
          className="progress-track-fill"
          d={TRACK_D}
          pathLength="1000"
          stroke={`url(#${idPrefix}-fill)`}
          style={{ strokeDashoffset: 1000 * (1 - displayProgress) }}
        />
        <path
          className="progress-track-shine"
          d={TRACK_D}
          pathLength="1000"
          style={{ strokeDashoffset: 1000 * (1 - displayProgress) }}
        />
        <path
          className="progress-track-shimmer"
          d={TRACK_D}
          pathLength="1000"
          mask={`url(#${idPrefix}-reveal)`}
        />
        {showComets && (
          <>
            <g className="progress-comets ambient-comets">
              {ambientComets.map((comet, index) => (
                <ellipse
                  key={index}
                  className={`progress-comet comet-${comet.tone}`}
                  rx={comet.size * 1.7}
                  ry={comet.size * 0.72}
                  fill={`url(#${idPrefix}-comet-${comet.tone})`}
                >
                  <animateMotion
                    path={TRACK_D}
                    dur={comet.duration}
                    begin={comet.begin}
                    repeatCount="indefinite"
                    rotate="auto"
                  />
                </ellipse>
              ))}
            </g>
            <g className="progress-comets" mask={`url(#${idPrefix}-reveal)`}>
              {progressComets.map((comet, index) => (
                <ellipse
                  key={index}
                  className={`progress-comet comet-${comet.tone}`}
                  rx={comet.size * 1.7}
                  ry={comet.size * 0.72}
                  fill={`url(#${idPrefix}-comet-${comet.tone})`}
                >
                  <animateMotion
                    path={TRACK_D}
                    dur={comet.duration}
                    begin={comet.begin}
                    repeatCount="indefinite"
                    rotate="auto"
                  />
                </ellipse>
              ))}
            </g>
          </>
        )}
      </svg>
      <div className="progress-track-decor" aria-hidden="true">
        {markerPoints.map((point, index) => {
          const milestone = MILESTONES[index];
          const passed = displayProgress + 0.004 >= milestone;
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
      <div className="progress-flight-layer" aria-hidden="true">
        {flights.map((flight) => (
          <FlightBubble
            key={`${streamKey}:${flight.id}`}
            event={flight}
            slot={flight.slot}
            trackRef={trackRef}
            sceneRef={sceneRef}
            sceneSize={sceneSize}
            paused={!environment.motionAllowed || status === "failed"}
            onFinish={finishFlight}
          />
        ))}
      </div>
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
              <i />{event.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
