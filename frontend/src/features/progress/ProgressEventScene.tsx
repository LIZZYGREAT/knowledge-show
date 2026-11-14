import { useCallback, useEffect, useId, useRef, useState, type RefObject } from "react";
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
type Route = { start: Point; controlA: Point; controlB: Point; end: Point; path: string };

const stageAnchors: Record<Stage, Point> = {
  knowledge: { x: 500, y: 158 },
  script: { x: 475, y: 158 },
  animation: { x: 525, y: 158 },
};

const stageDocks: Record<Stage, Point[]> = {
  knowledge: [
    { x: 325, y: 91 },
    { x: 680, y: 91 },
    { x: 650, y: 248 },
  ],
  script: [
    { x: 315, y: 88 },
    { x: 700, y: 135 },
    { x: 350, y: 249 },
  ],
  animation: [
    { x: 315, y: 153 },
    { x: 680, y: 88 },
    { x: 675, y: 249 },
  ],
};

const ambientParticles = [
  { x: 95, y: 105, r: 3.2, tone: "mint" }, { x: 152, y: 244, r: 2.5, tone: "gold" },
  { x: 228, y: 74, r: 3.8, tone: "teal" }, { x: 272, y: 224, r: 2.2, tone: "mint" },
  { x: 344, y: 48, r: 2.8, tone: "gold" }, { x: 373, y: 275, r: 3.1, tone: "teal" },
  { x: 421, y: 64, r: 2.3, tone: "mint" }, { x: 578, y: 57, r: 3.4, tone: "gold" },
  { x: 630, y: 267, r: 2.4, tone: "mint" }, { x: 713, y: 55, r: 2.7, tone: "teal" },
  { x: 750, y: 226, r: 3.5, tone: "gold" }, { x: 831, y: 82, r: 3, tone: "mint" },
  { x: 868, y: 188, r: 2.2, tone: "teal" }, { x: 924, y: 247, r: 3.2, tone: "gold" },
] as const;

function pointOnRoute(route: Route, progress: number): Point {
  const t = Math.max(0, Math.min(1, progress));
  const inverse = 1 - t;
  return {
    x:
      inverse ** 3 * route.start.x +
      3 * inverse ** 2 * t * route.controlA.x +
      3 * inverse * t ** 2 * route.controlB.x +
      t ** 3 * route.end.x,
    y:
      inverse ** 3 * route.start.y +
      3 * inverse ** 2 * t * route.controlA.y +
      3 * inverse * t ** 2 * route.controlB.y +
      t ** 3 * route.end.y,
  };
}

function createRoute(stage: Stage, slot: number, width: number, height: number): Route {
  const start = stageAnchors[stage];
  const end = stageDocks[stage][slot];
  const direction = end.x < start.x ? -1 : 1;
  const route = {
    start,
    controlA: { x: start.x + direction * 68, y: start.y - 58 },
    controlB: { x: end.x - direction * 54, y: end.y + (end.y > start.y ? -35 : 54) },
    end,
    path: `M ${start.x} ${start.y} C ${start.x + direction * 68} ${start.y - 58}, ${end.x - direction * 54} ${end.y + (end.y > start.y ? -35 : 54)}, ${end.x} ${end.y}`,
  };
  return {
    ...route,
    start: { x: (route.start.x / 1000) * width, y: (route.start.y / 320) * height },
    controlA: { x: (route.controlA.x / 1000) * width, y: (route.controlA.y / 320) * height },
    controlB: { x: (route.controlB.x / 1000) * width, y: (route.controlB.y / 320) * height },
    end: { x: (route.end.x / 1000) * width, y: (route.end.y / 320) * height },
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
  stage,
  sceneRef,
  sceneSize,
  paused,
  onFinish,
}: {
  event: ProgressSceneEvent;
  slot: number;
  stage: Stage;
  sceneRef: RefObject<HTMLDivElement | null>;
  sceneSize: { width: number; height: number };
  paused: boolean;
  onFinish: (id: string) => void;
}) {
  const bubbleRef = useRef<HTMLDivElement | null>(null);
  const sparkOneRef = useRef<HTMLSpanElement | null>(null);
  const sparkTwoRef = useRef<HTMLSpanElement | null>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const route = createRoute(stage, slot, sceneSize.width, sceneSize.height);

  useGSAP((_, contextSafe) => {
    const bubble = bubbleRef.current;
    if (!bubble) return;
    const progress = { value: 0 };
    const updateFlight = () => {
      const bubblePoint = pointOnRoute(route, progress.value);
      gsap.set(bubble, { x: bubblePoint.x, y: bubblePoint.y });
      const firstSpark = pointOnRoute(route, Math.max(0, progress.value - 0.12));
      const secondSpark = pointOnRoute(route, Math.max(0, progress.value - 0.25));
      gsap.set(sparkOneRef.current, { x: firstSpark.x, y: firstSpark.y });
      gsap.set(sparkTwoRef.current, { x: secondSpark.x, y: secondSpark.y });
    };
    gsap.set(bubble, {
      x: route.start.x,
      y: route.start.y,
      xPercent: -50,
      yPercent: -50,
      autoAlpha: 0,
      scale: 0.12,
    });
    gsap.set([sparkOneRef.current, sparkTwoRef.current], {
      x: route.start.x,
      y: route.start.y,
      xPercent: -50,
      yPercent: -50,
      autoAlpha: 0,
      scale: 0.45,
    });

    const finish = contextSafe?.(() => onFinish(event.id)) ?? (() => onFinish(event.id));
    const timeline = gsap.timeline({ paused: true, onComplete: finish });
    timeline
      .to(bubble, { autoAlpha: 1, scale: 0.18, duration: 0.16, ease: "power2.out" }, 0.08)
      .to(progress, { value: 1, duration: 1.05, ease: "sine.inOut", onUpdate: updateFlight }, 0.2)
      .to(bubble, { scale: 1, duration: 0.34, ease: "power2.out" }, 0.68)
      .to([sparkOneRef.current, sparkTwoRef.current], { autoAlpha: 0.85, scale: 1, duration: 0.22, stagger: 0.06, ease: "power2.out" }, 0.42)
      .to(bubble, { scale: 1, duration: 2.8, ease: "none" }, 1.28)
      .to([sparkOneRef.current, sparkTwoRef.current], { autoAlpha: 0, scale: 0.35, duration: 0.3, stagger: 0.05, ease: "power1.in" }, 1.35)
      .to(bubble, { autoAlpha: 0, scale: 0.92, duration: 0.72, ease: "power1.in" }, 4.08)
      .to([sparkOneRef.current, sparkTwoRef.current], { autoAlpha: 0, duration: 0.2 }, 4.08);
    timelineRef.current = timeline;

    return () => {
      timeline.kill();
      timelineRef.current = null;
    };
  }, {
    scope: sceneRef,
    dependencies: [event.id, sceneSize.width, sceneSize.height],
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
      <span className="progress-flight-spark spark-one" ref={sparkOneRef} />
      <span className="progress-flight-spark spark-two" ref={sparkTwoRef} />
      <div
        ref={bubbleRef}
        className={`progress-flight-label dock-${slot}`}
        aria-hidden="true"
      >
        <span className="progress-flight-mark" />
        <span>{event.text}</span>
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
  const idPrefix = `progress-${useId().replaceAll(":", "")}`;
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0 });
  const [flights, setFlights] = useState<Flight[]>([]);
  const flightsRef = useRef(new Map<string, Flight>());
  const queueRef = useRef<ProgressSceneEvent[]>([]);
  const seenRef = useRef(new Set<string>());
  const nextSlotRef = useRef(0);
  const environment = useMotionEnvironment(sceneRef);
  const canAnimate = environment.motionAllowed && status !== "failed";
  const canAnimateRef = useRef(canAnimate);
  const stageRef = useRef(stage);
  canAnimateRef.current = canAnimate;
  stageRef.current = stage;

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

  const pumpQueue = useCallback(() => {
    if (!canAnimateRef.current) return;
    const nextFlights = new Map(flightsRef.current);
    const busySlots = new Set([...nextFlights.values()].map((flight) => flight.slot));
    while (nextFlights.size < 3 && queueRef.current.length > 0) {
      const event = queueRef.current.shift();
      if (!event) break;
      const eventStage = event.stage ?? stageRef.current;
      const freeSlots = [0, 1, 2].filter((slot) => !busySlots.has(slot));
      if (!freeSlots.length) break;
      const preferred = nextSlotRef.current % 3;
      const slot = freeSlots.includes(preferred) ? preferred : freeSlots[0];
      nextSlotRef.current = (slot + 1) % 3;
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
    if (!canAnimate) return;
    queueRef.current = [...queueRef.current, ...fresh].slice(-12);
    pumpQueue();
  }, [incomingEvents, canAnimate, pumpQueue]);

  const finishFlight = useCallback((id: string) => {
    const nextFlights = new Map(flightsRef.current);
    nextFlights.delete(id);
    flightsRef.current = nextFlights;
    setFlights([...nextFlights.values()]);
    pumpQueue();
  }, [pumpQueue]);

  useEffect(() => {
    if (canAnimate) pumpQueue();
    else queueRef.current = [];
  }, [canAnimate, pumpQueue]);

  const svgClass = `progress-event-ornament ${status === "completed" ? "is-complete" : ""}`;
  return (
    <div
      ref={sceneRef}
      className={`progress-event-scene stage-${stage} status-${status} ${!environment.motionAllowed ? "motion-limited" : ""} ${status === "failed" ? "is-failed" : ""}`}
      data-stage={stage}
      data-status={status}
      aria-label={`${stageNames[stage]}${status === "failed" ? "，暂时中断" : status === "completed" ? "，已完成" : "，正在进行"}`}
    >
      <svg className={svgClass} viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${idPrefix}-trail`} x1="0" y1="0.3" x2="1" y2="0.7">
            <stop offset="0%" stopColor="#72c3b1" stopOpacity="0.25" />
            <stop offset="42%" stopColor="#238c7d" stopOpacity="0.82" />
            <stop offset="72%" stopColor="#529d7c" stopOpacity="0.67" />
            <stop offset="100%" stopColor="#cfad72" stopOpacity="0.5" />
          </linearGradient>
          <radialGradient id={`${idPrefix}-focus`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.86" />
            <stop offset="58%" stopColor="#edf5ef" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#e1eee6" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`${idPrefix}-particle-mint`} cx="30%" cy="26%" r="76%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="24%" stopColor="#e0f6ed" />
            <stop offset="70%" stopColor="#72c3b1" />
            <stop offset="100%" stopColor="#238c7d" />
          </radialGradient>
          <radialGradient id={`${idPrefix}-particle-teal`} cx="30%" cy="26%" r="76%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="28%" stopColor="#d5f0e8" />
            <stop offset="72%" stopColor="#61b5a4" />
            <stop offset="100%" stopColor="#287e72" />
          </radialGradient>
          <radialGradient id={`${idPrefix}-particle-gold`} cx="30%" cy="26%" r="76%">
            <stop offset="0%" stopColor="#fffdf7" />
            <stop offset="28%" stopColor="#f2dfb7" />
            <stop offset="75%" stopColor="#cfad72" />
            <stop offset="100%" stopColor="#ab8147" />
          </radialGradient>
          <marker id={`${idPrefix}-arrow`} viewBox="0 0 12 12" refX="9.2" refY="6" markerWidth="7" markerHeight="7" orient="auto" markerUnits="userSpaceOnUse">
            <path className="progress-arrow-head" d="M1 1.4 C3.4 3.7 5.8 5.1 10 6 C5.8 6.9 3.4 8.3 1 10.6 C2.5 7.7 2.5 4.3 1 1.4Z" />
          </marker>
        </defs>
        <circle className="progress-focus-glow" cx="500" cy="158" r="106" fill={`url(#${idPrefix}-focus)`} />
        <path className="progress-main-trail" markerEnd={`url(#${idPrefix}-arrow)`} d={stage === "knowledge"
          ? "M62 238 C178 238 182 108 328 115 S410 198 500 158 C614 110 727 232 930 76"
          : stage === "script"
            ? "M48 252 C196 235 208 66 366 112 S593 248 742 150 S864 82 954 100"
            : "M68 202 C211 238 235 92 394 115 S604 228 735 135 S855 112 936 64"} />
        <path className="progress-side-trail trail-a" markerEnd={`url(#${idPrefix}-arrow)`} d="M86 126 C164 112 224 150 286 202" />
        <path className="progress-side-trail trail-b" markerEnd={`url(#${idPrefix}-arrow)`} d="M710 226 C787 190 827 174 913 194" />
        <g className={`stage-connectors ${stage}-connectors`}>
          {stage === "knowledge" ? (
            <>
              <path markerEnd={`url(#${idPrefix}-arrow)`} d="M325 91 C382 105 395 142 449 153 C467 157 480 157 491 158" />
              <path markerEnd={`url(#${idPrefix}-arrow)`} d="M650 248 C612 219 604 188 568 171 C544 160 524 157 507 158" />
              <path markerEnd={`url(#${idPrefix}-arrow)`} d="M680 91 C628 105 614 134 568 149 C547 156 527 158 510 158" />
            </>
          ) : stage === "script" ? (
            <>
              <path markerEnd={`url(#${idPrefix}-arrow)`} d="M315 88 C366 102 371 131 427 132 C455 132 468 143 480 155" />
              <path markerEnd={`url(#${idPrefix}-arrow)`} d="M350 249 C397 228 419 204 451 177 C466 164 481 159 491 158" />
              <path markerEnd={`url(#${idPrefix}-arrow)`} d="M700 135 C648 137 625 160 584 169 C554 175 534 167 510 160" />
            </>
          ) : (
            <>
              <path markerEnd={`url(#${idPrefix}-arrow)`} d="M315 153 C362 142 390 111 428 112 C455 112 473 135 493 153" />
              <path markerEnd={`url(#${idPrefix}-arrow)`} d="M680 88 C634 103 613 127 578 145 C551 159 530 159 508 158" />
              <path markerEnd={`url(#${idPrefix}-arrow)`} d="M675 249 C622 228 605 203 569 180 C548 167 530 160 510 158" />
            </>
          )}
        </g>
        {stage === "knowledge" && (
          <g className="stage-motif knowledge-motif">
            <path d="M412 142 C445 119 466 123 493 153 M587 177 C559 202 535 194 510 166" />
            <circle cx="390" cy="137" r="5" /><circle cx="421" cy="112" r="3" />
            <circle cx="604" cy="185" r="4" /><circle cx="574" cy="208" r="3" />
          </g>
        )}
        {stage === "script" && (
          <g className="stage-motif script-motif">
            <path d="M360 124 C412 92 461 92 520 126 S610 177 672 153" />
            <circle cx="365" cy="122" r="8" /><circle cx="473" cy="116" r="6" />
            <circle cx="573" cy="151" r="5" /><circle cx="674" cy="153" r="8" />
          </g>
        )}
        {stage === "animation" && (
          <g className="stage-motif animation-motif">
            <rect x="433" y="94" width="134" height="128" rx="27" />
            <rect x="449" y="110" width="102" height="96" rx="20" />
            <path d="M465 175 L490 146 L511 165 L532 133" />
            <circle cx="490" cy="146" r="4" /><circle cx="532" cy="133" r="4" />
          </g>
        )}
        <g className="ambient-particles">
          {ambientParticles.map((particle, index) => (
            <g className="particle-orb" key={`particle-${index}`} style={{ animationDelay: `${-index * 0.37}s` }}>
              <circle className="particle-halo" cx={particle.x} cy={particle.y} r={particle.r * 2.3} />
              <circle
                className={`ambient-particle particle-${particle.tone}`}
                cx={particle.x}
                cy={particle.y}
                r={particle.r}
                fill={`url(#${idPrefix}-particle-${particle.tone})`}
              />
              <circle className="particle-glint" cx={particle.x - particle.r * 0.3} cy={particle.y - particle.r * 0.32} r={particle.r * 0.24} />
            </g>
          ))}
        </g>
        {flights.map((flight) => (
          <path
            key={`route:${streamKey}:${flight.id}`}
            className="progress-flight-path"
            pathLength="1"
            markerEnd={`url(#${idPrefix}-arrow)`}
            d={createRoute(flight.stage, flight.slot, 1000, 320).path}
          />
        ))}
      </svg>
      <div className="progress-flight-layer" aria-hidden="true">
        {flights.map((flight) => (
          <FlightBubble
            key={`${streamKey}:${flight.id}`}
            event={flight}
            slot={flight.slot}
            stage={flight.stage}
            sceneRef={sceneRef}
            sceneSize={sceneSize}
            paused={!environment.motionAllowed || status === "failed"}
            onFinish={finishFlight}
          />
        ))}
      </div>
      <div className="progress-hub" aria-hidden="true">
        <span className="hub-orbit orbit-one" />
        <span className="hub-orbit orbit-two" />
        <span className="hub-core">
          {stage === "knowledge" ? (
            <span className="hub-knowledge"><i /><i /><i /><b /></span>
          ) : stage === "script" ? (
            <span className="hub-script"><i /><i /><i /></span>
          ) : (
            <span className="hub-animation"><i /><b /></span>
          )}
        </span>
        <span className="hub-caption">{stageNames[stage]}</span>
      </div>
      <div className="progress-static-events" aria-hidden="true">
        {recentEvents.slice(-2).map((event, index) => (
          <span className={`static-event dock-${index}`} key={`${streamKey}:${event.id}`}>
            <i />{event.text}
          </span>
        ))}
      </div>
    </div>
  );
}
