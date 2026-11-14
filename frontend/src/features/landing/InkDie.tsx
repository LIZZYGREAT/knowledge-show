type Vec3 = readonly [number, number, number];
const HALF = 31;
const PIPS: Record<number, number[][]> = {
  1: [[0, 0]], 2: [[-14, -14], [14, 14]],
  3: [[-14, -14], [0, 0], [14, 14]],
  4: [[-14, -14], [14, -14], [-14, 14], [14, 14]],
  5: [[-14, -14], [14, -14], [0, 0], [-14, 14], [14, 14]],
  6: [[-14, -14], [14, -14], [-14, 0], [14, 0], [-14, 14], [14, 14]],
};
const FACES: { normal: Vec3; point: (u: number, v: number) => Vec3; value: number }[] = [
  { normal: [0, 0, 1], point: (u, v) => [u, v, HALF], value: 3 },
  { normal: [0, 0, -1], point: (u, v) => [-u, v, -HALF], value: 4 },
  { normal: [1, 0, 0], point: (u, v) => [HALF, v, -u], value: 2 },
  { normal: [-1, 0, 0], point: (u, v) => [-HALF, v, u], value: 5 },
  { normal: [0, -1, 0], point: (u, v) => [u, -HALF, v], value: 1 },
  { normal: [0, 1, 0], point: (u, v) => [u, HALF, -v], value: 6 },
];

export function InkDie({ form, turn, tumble = 0, green = false }: { form: number; turn: number; tumble?: number; green?: boolean }) {
  const ax = -.32 + tumble, ay = -.42 + turn;
  function rotate([x, y, z]: Vec3): Vec3 {
    const yy = y * Math.cos(ax) - z * Math.sin(ax);
    const zz = y * Math.sin(ax) + z * Math.cos(ax);
    return [x * Math.cos(ay) + zz * Math.sin(ay), yy, -x * Math.sin(ay) + zz * Math.cos(ay)];
  }
  function project(point: Vec3) {
    const [x, y, z] = rotate(point);
    const perspective = 340 / (340 - z);
    return `${(x * perspective).toFixed(2)},${(y * perspective).toFixed(2)}`;
  }
  const faces = FACES.map((face, index) => ({ ...face, index, normal: rotate(face.normal) }))
    .filter(face => face.normal[2] > .015)
    .sort((a, b) => a.normal[2] - b.normal[2]);
  const base = green ? [112, 151, 128] : [247, 242, 220];
  return <g className="stage-die" data-formed={form.toFixed(3)}>
    <ellipse cy="47" rx={26 + form * 13} ry={5 + form * 3} fill="#254f421c"/>
    <rect x="-31" y="-31" width="62" height="62" rx={31 - form * 21} fill={green ? "#2e7869" : "#c6a768"} opacity={1 - form}/>
    <g className="stage-die-cube" opacity={form} transform={`scale(${.72 + form * .28})`}>
      {faces.map(face => {
        const light = .74 + Math.max(0, -face.normal[0] * .25 - face.normal[1] * .55 + face.normal[2] * .2) * .35;
        const color = `rgb(${base.map(n => Math.round(Math.min(255, n * light))).join(" ")})`;
        const value = green && face.index < 2 ? 7 - face.value : face.value;
        return <g key={face.index} data-face={face.index}>
          <polygon points={[[-HALF, -HALF], [HALF, -HALF], [HALF, HALF], [-HALF, HALF]].map(([u, v]) => project(face.point(u, v))).join(" ")} fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
          {PIPS[value].map(([u, v], index) => {
            const points = Array.from({ length: 13 }, (_, i) => {
              const angle = i / 12 * Math.PI * 2;
              return project(face.point(u * form + Math.cos(angle) * 3.8, v * form + Math.sin(angle) * 3.8));
            });
            return <path key={index} d={`M${points.join("L")}Z`} fill={green ? "#fff5da" : "#315f52"} opacity={form * form}/>;
          })}
        </g>;
      })}
    </g>
  </g>;
}
