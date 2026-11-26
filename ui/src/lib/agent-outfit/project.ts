/**
 * Curves flat outfit art onto the agent character and follows its pose.
 *
 * Art is drawn on a 256 unit square over the front-facing portrait. The live
 * character uses an orthographic camera, so a point only needs a depth on the
 * body before the same rotation, squash and bob the renderer applies.
 */
export type Point = readonly [x: number, y: number];
export type Outline = { points: Point[]; closed: boolean };

/**
 * face: on the front of the body. ring: wraps the body, so it looks the same
 * from every side. hat: sits on the head and leans with it, but keeps facing
 * the viewer. side: upright through the ears. An anchor keeps the drawn
 * shape and moves it with that one point on the body.
 */
export type Wrap = "face" | "ring" | "hat" | "side" | { anchor: Point };

/** What the renderer applied to the body for this frame, in body units and degrees. */
export interface CharacterFrame {
  rotation: { x: number; y: number; z: number };
  lift: number;
  scale: { x: number; y: number };
  /** Half of the visible height, in body units. */
  half: number;
}

/** Art units per body unit: the 256px portrait shows 1.44 body units. */
const UNIT = 256 / 1.44;
const CENTER = 128;
const SHELL = 1.01;
export const PORTRAIT_FRAME: CharacterFrame = { rotation: { x: 0, y: 0, z: 0 }, lift: 0, scale: { x: 1, y: 1 }, half: 0.72 };

type Vec = [number, number, number];

function bodyRadius(y: number) {
  if (y >= 0) return Math.sqrt(Math.max(0, 0.25 - y * y));
  return 0.5;
}

/** Spin about the body's own axis, then the renderer's YXZ rotation. */
function place([x, y, z]: Vec, frame: CharacterFrame, spin: number): Vec {
  const rad = Math.PI / 180;
  const turn = (a: number, b: number, degrees: number): [number, number] => {
    const c = Math.cos(degrees * rad), s = Math.sin(degrees * rad);
    return [a * c - b * s, a * s + b * c];
  };
  [z, x] = turn(z, x, spin);
  x *= frame.scale.x; z *= frame.scale.x; y *= frame.scale.y;
  [x, y] = turn(x, y, frame.rotation.z);
  [y, z] = turn(y, z, frame.rotation.x);
  [z, x] = turn(z, x, frame.rotation.y);
  return [x, y + frame.lift, z];
}

const toBody = (p: Point): [number, number] => [(p[0] - CENTER) / UNIT, (CENTER - p[1]) / UNIT];
const halfChord = (radius: number, x: number) => Math.sqrt(Math.max(0, radius * radius - x * x));

/**
 * One curve for every hat part, so parts that touch stay together when the
 * head tilts: deepest over the forehead, flat at the crown and the sides.
 */
function hatDepth(x: number, y: number) {
  const BRIM = 0.35, CROWN = 0.68, WIDTH = 0.62, DEPTH = 0.38;
  const drop = Math.min(1, Math.max(0, (CROWN - y) / (CROWN - BRIM)));
  return DEPTH * drop * Math.max(0, 1 - (x / WIDTH) ** 2);
}

/** Screen points in the same 256 unit square the character is drawn in. */
export function projectOutline(outline: Outline, wrap: Wrap, frame: CharacterFrame): Outline[] {
  const scale = 128 / frame.half;
  const screen = ([x, y]: Vec): Point => [CENTER + x * scale, CENTER - y * scale];
  const local = outline.points.map(toBody);
  const spin = wrap === "ring" || wrap === "hat" ? -frame.rotation.y : 0;

  if (typeof wrap === "object") {
    const [cx, cy] = toBody(wrap.anchor);
    const anchor = place([cx, cy, halfChord(0.5, Math.min(0.42, Math.abs(cx)))], frame, 0);
    return [{ closed: outline.closed, points: local.map(([x, y]) => screen([anchor[0] + x - cx, anchor[1] + y - cy, 0])) }];
  }

  const placed = local.map(([x, y]) => {
    let depth = 0;
    if (wrap === "face" || wrap === "ring") depth = halfChord(Math.max(bodyRadius(y) * SHELL, Math.abs(x)), x);
    else if (wrap === "hat") depth = hatDepth(x, y);
    return place([x, y, depth], frame, spin);
  });

  // A line on the body disappears where the body turns away from the viewer.
  if (wrap === "face" && !outline.closed) {
    const runs: Outline[] = [];
    let run: Point[] = [];
    for (const point of placed) {
      if (point[2] > -0.02) run.push(screen(point));
      else if (run.length) { runs.push({ points: run, closed: false }); run = []; }
    }
    if (run.length > 1) runs.push({ points: run, closed: false });
    return runs;
  }
  return [{ points: placed.map(screen), closed: outline.closed }];
}

export function pathOf(outlines: Outline[]): string {
  return outlines.map(({ points, closed }) =>
    points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("") + (closed ? "Z" : "")).join("");
}
