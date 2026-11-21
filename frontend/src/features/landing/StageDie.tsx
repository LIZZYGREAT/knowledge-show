import { easeBetween } from "./curiosityMotion";

type V = [number, number, number];

const pips: Record<number, number[][]> = {
  1: [[0, 0]],
  2: [
    [-16, -16],
    [16, 16],
  ],
  3: [
    [-16, -16],
    [0, 0],
    [16, 16],
  ],
  4: [
    [-16, -16],
    [16, -16],
    [-16, 16],
    [16, 16],
  ],
  5: [
    [-16, -16],
    [16, -16],
    [0, 0],
    [-16, 16],
    [16, 16],
  ],
  6: [
    [-16, -16],
    [16, -16],
    [-16, 0],
    [16, 0],
    [-16, 16],
    [16, 16],
  ],
};

// Rigid cube projection: faces and pips rotate together, opposite faces sum to 7.
export function StageDie({
  time,
  green = false,
  morph = 0,
}: {
  time: number;
  green?: boolean;
  morph?: number;
}) {
  const turn = easeBetween(time, 1.4, 3.2);
  const lift = Math.sin(turn * Math.PI);
  const ax = (-0.38 + (1 - turn) * Math.PI * 2) * (1 - morph);
  const ay =
    ((green ? 0.48 : -0.48) + (1 - turn) * Math.PI * 2 * (green ? -1 : 1)) *
    (1 - morph);
  const rotate = ([x, y, z]: V): V => {
    const yy = y * Math.cos(ax) - z * Math.sin(ax);
    const zz = y * Math.sin(ax) + z * Math.cos(ax);
    return [
      x * Math.cos(ay) + zz * Math.sin(ay),
      yy,
      -x * Math.sin(ay) + zz * Math.cos(ay),
    ];
  };
  const front = green ? 4 : 3;
  const faces: { n: V; u: V; v: V; value: number }[] = [
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], value: front },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0], value: 7 - front },
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0], value: 2 },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], value: 5 },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], value: 1 },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1], value: 6 },
  ];
  return (
    <g className="stage-die">
      <ellipse
        cy="54"
        rx={42 + lift * 8}
        ry="8.5"
        fill={green ? "#38d9c0" : "#f0b96b"}
        opacity={(0.2 - lift * 0.08) * (1 - morph)}
      />
      <g transform={`translate(0 ${-lift * 23})`}>
        {faces
          .map((face) => ({ ...face, depth: rotate(face.n)[2] }))
          .filter((face) => face.depth > 0.001)
          .sort((a, b) => a.depth - b.depth)
          .map((face) => {
            const center = rotate(face.n.map((x) => x * 33) as V);
            const u = rotate(face.u);
            const v = rotate(face.v);
            const shade =
              0.08 + (1 - face.depth) * 0.34 + (face.n[1] === 1 ? 0.14 : 0);
            return (
              <g
                key={face.value}
                data-face={face.value}
                transform={`matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${center[0]} ${center[1]})`}
              >
                <rect
                  x="-33"
                  y="-33"
                  width="66"
                  height="66"
                  rx="6"
                  fill={green ? "#1d5b63" : "#f3ebd9"}
                  stroke={green ? "#66ebd6" : "#f3d499"}
                  strokeWidth="1.2"
                />
                <rect
                  x="-33"
                  y="-33"
                  width="66"
                  height="66"
                  rx="6"
                  fill="#050b14"
                  opacity={shade * (1 - morph)}
                />
                <path
                  d="M-26-28H26"
                  fill="none"
                  stroke={green ? "#a9fff0" : "#ffffff"}
                  strokeOpacity={green ? ".45" : ".65"}
                  strokeLinecap="round"
                />
                {pips[face.value].map(([x, y], i) => (
                  <g
                    key={i}
                    opacity={1 - morph}
                    transform={`translate(${x} ${y})`}
                  >
                    <circle
                      cy=".7"
                      r="4.8"
                      fill={green ? "#0c2b33" : "#c5b592"}
                    />
                    <circle
                      r="4.1"
                      fill={green ? "#ffdfa0" : "#162638"}
                    />
                  </g>
                ))}
              </g>
            );
          })}
      </g>
    </g>
  );
}
