import { pathThrough, type Point } from "./flowGeometry";

// The same sampled ink lines start as flat concentric ripples, then lift into
// consecutive turns of a conical helix. Depth splits let the dice sit inside it.
export function inkVortex({ x, y, sourceX, sourceY, travel, lift, turn, unfold }: {
  x: number; y: number; sourceX: number; sourceY: number;
  travel: number; lift: number; turn: number; unfold: number;
}) {
  const back: string[] = [], front: string[] = [];
  for (let ring = 0; ring < 4; ring++) {
    let points: Point[] = [];
    let facing = false;
    for (let i = 0; i <= 96; i++) {
      const u = i / 96;
      const angle = u * Math.PI * 2 + turn;
      const height = (ring + u) / 4;
      const flatRadius = (38 + ring * 23) * (.15 + travel * .85);
      const radius = flatRadius + ((75 + height * 90) * (1 - unfold * .4) - flatRadius) * lift;
      const cx = sourceX + (x - sourceX) * lift;
      const cy = sourceY + (y - sourceY) * lift;
      const point: Point = [cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius * .28 + (96 - height * 192) * lift];
      const nextFacing = Math.sin(angle) >= 0;
      if (points.length > 1 && nextFacing !== facing) {
        points.push(point);
        (facing ? front : back).push(pathThrough(points));
        points = [point];
      } else points.push(point);
      facing = nextFacing;
    }
    if (points.length > 1) (facing ? front : back).push(pathThrough(points));
  }
  return { back, front };
}
