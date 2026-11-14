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
const MAX_FLIGHTS = 2;

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

const comets = [
  { size: 3.6, duration: "13s", begin: "-2s", tone: "mint" },
  { size: 2.4, duration: "19s", begin: "-9s", tone: "gold" },
  { size: 4.4, duration: "24s", begin: "-15s", tone: "teal" },
  { size: 2.2, duration: "16s", begin: "-6s", tone: "mint" },
  { size: 3, duration: "21s", begin: "-12s", tone: "gold" },
] as const;

const dust = [
  { x: 14, y: 20, size: 7, delay: -1.4, tone: "mint" },
  { x: 77, y: 16, size: 5, delay: -3.2, tone: "gold" },
  { x: 90, y: 62, size: 8, delay: -2.1, tone: "mint" },
  { x: 9, y: 73, size: 6, delay: -4.4, tone: "gold" },
  { x: 63, y: 85, size: 5, delay: -0.7, tone: "teal" },
  { x: 37, y: 9, size: 4, delay: -5.1, tone: "mint" },
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
  const spreads = [{ x: -40, y: -22 }, { x: 30, y: -32 }, { x: 5, y: 28 }];

  useGSAP((_, contextSafe) => {
    const bubble = bubbleRef.current;
    const path = trackRef.current;
    if (!bubble || !path || sceneSize.width <= 0 || sceneSize.height <= 0) return;

    const anchor = pixelPointAt(path, eventAnchor[stage], sceneSize);
    const maxWidth = Math.min(408, sceneSize.width * (sceneSize.width < 620 ? 0.7 : 0.41));
    const halfWidth = maxWidth / 2 + 10;
    const laneOffset = slot === 0
      ? Math.min(104, sceneSize.height * 0.27)
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
      .to(bubble, { autoAlpha: 0, y: dock.y - 14, scale: 0.97, duration: 0.74, ease: "power1.in" }, 4.12);
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
      {[0, 1, 2].map((index) => (
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
  const nextSlotRef = useRef(0);
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
    nextSlotRef.current = 0;
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
    const busySlots = new Set([...nextFlights.values()].map((flight) => flight.slot));
    while (nextFlights.size < MAX_FLIGHTS && queueRef.current.length > 0) {
      const event = queueRef.current.shift();
      if (!event) break;
      const eventStage = event.stage ?? stageRef.current;
      const freeSlots = [0, 1].filter((slot) => !busySlots.has(slot));
      if (!freeSlots.length) break;
      const preferred = nextSlotRef.current % MAX_FLIGHTS;
      const slot = freeSlots.includes(preferred) ? preferred : freeSlots[0];
      nextSlotRef.current = (slot + 1) % MAX_FLIGHTS;
      busySlots.add(slot);
      nextFlights.set(event.id, { ...event, stage: eventStage, slot });
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
    queueRef.current = [...queueRef.current, ...fresh].slice(-12);
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
      <div className="progress-glow-dust" aria-hidden="true">
        <span className="progress-stage-aura" style={{ left: `${headPoint.left}%`, top: `${headPoint.top}%` }} />
        {dust.map((mote, index) => (
          <span
            key={index}
            className={`progress-mote mote-${mote.tone}`}
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
            <stop offset="0%" stopColor="#9ed8c9" stopOpacity="0.72" />
            <stop offset="34%" stopColor="#2f9a86" />
            <stop offset="68%" stopColor="#2e6b4e" />
            <stop offset="100%" stopColor="#cfad72" />
          </linearGradient>
          <linearGradient id={`${idPrefix}-base`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7fa58d" stopOpacity="0.2" />
            <stop offset="55%" stopColor="#5f8f78" stopOpacity="0.24" />
            <stop offset="100%" stopColor="#b49a6a" stopOpacity="0.26" />
          </linearGradient>
          <radialGradient id={`${idPrefix}-comet-mint`} cx="32%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="34%" stopColor="#b6e9dc" />
            <stop offset="100%" stopColor="#4aab95" />
          </radialGradient>
          <radialGradient id={`${idPrefix}-comet-teal`} cx="32%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#f7fffc" />
            <stop offset="38%" stopColor="#7cc9b7" />
            <stop offset="100%" stopColor="#23796a" />
          </radialGradient>
          <radialGradient id={`${idPrefix}-comet-gold`} cx="32%" cy="30%" r="78%">
            <stop offset="0%" stopColor="#fffdf7" />
            <stop offset="36%" stopColor="#eed8ab" />
            <stop offset="100%" stopColor="#b18844" />
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
          <g className="progress-comets" mask={`url(#${idPrefix}-reveal)`}>
            {comets.map((comet, index) => (
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
