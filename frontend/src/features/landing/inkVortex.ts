import { pathThrough, type Point } from "./flowGeometry";

// The same sampled ink lines start as flat concentric ripples, then lift into
// consecutive turns of one die's helix, in that die's local coordinates.
export function inkVortex({ travel, lift, turn }: { travel: number; lift: number; turn: number }) {
  const back: string[] = [], front: string[] = [];
  for (let ring = 0; ring < 4; ring++) {
    let points: Point[] = [];
    let facing = false;
    for (let i = 0; i <= 96; i++) {
      const u = i / 96;
      const angle = u * Math.PI * 2 + turn;
      const height = (ring + u) / 4;
      const flatRadius = (16 + ring * 11) * (.15 + travel * .85);
      const radius = flatRadius + ((44 + height * 12) - flatRadius) * lift;
      const point: Point = [Math.cos(angle) * radius,
        Math.sin(angle) * radius * .28 + (52 - height * 104) * lift];
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
