import type { Outline, Point, Wrap } from "./project";

export const OUTFIT_COLORS = ["ink", "white", "red", "orange", "yellow", "green", "blue", "pink"] as const;
export type OutfitColor = typeof OUTFIT_COLORS[number];
export const OUTFIT_SLOTS = ["wear", "glasses", "hat", "item"] as const;
export type OutfitSlot = typeof OUTFIT_SLOTS[number];

export type Paint = "base" | "light" | "dark" | "gold" | "goldLight" | "paper" | "wood" | "ribbon" | "glass" | "steam";
export interface Part { outlines: Outline[]; wrap: Wrap; fill?: Paint; stroke?: Paint; width?: number }
/** `tall` hats need more headroom than the portrait leaves. */
export interface Piece { label: string; color: OutfitColor; parts: Part[]; tall?: boolean }

const STEP = 7;
function line(from: Point, to: Point): Point[] {
  const count = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / STEP));
  return Array.from({ length: count }, (_, i) => [from[0] + (to[0] - from[0]) * (i + 1) / count, from[1] + (to[1] - from[1]) * (i + 1) / count] as const);
}
/** Absolute M, L, Q and Z only. Long runs are split so they can follow a curve. */
function draw(d: string): Outline[] {
  const outlines: Outline[] = [];
  let points: Point[] = [];
  for (const [, command, args] of d.matchAll(/([MLQZ])([^MLQZ]*)/g)) {
    const n = (args!.match(/-?[\d.]+/g) ?? []).map(Number);
    const last = points.at(-1);
    if (command === "M") { points = [[n[0]!, n[1]!]]; outlines.push({ points, closed: false }); }
    else if (command === "Z") { points.push(...line(last!, points[0]!)); outlines.at(-1)!.closed = true; }
    else if (command === "L") for (let i = 0; i < n.length; i += 2) points.push(...line(points.at(-1)!, [n[i]!, n[i + 1]!]));
    else {
      const [a, control, b] = [last!, [n[0]!, n[1]!], [n[2]!, n[3]!]] as const;
      const length = Math.hypot(control[0]! - a[0], control[1]! - a[1]) + Math.hypot(b[0]! - control[0]!, b[1]! - control[1]!);
      const count = Math.max(6, Math.ceil(length / STEP));
      for (let i = 1; i <= count; i++) {
        const t = i / count, u = 1 - t;
        points.push([u * u * a[0] + 2 * u * t * control[0]! + t * t * b[0]!, u * u * a[1] + 2 * u * t * control[1]! + t * t * b[1]!]);
      }
    }
  }
  return outlines;
}
function circle(x: number, y: number, r: number): Outline {
  return { closed: true, points: Array.from({ length: 28 }, (_, i) => [x + r * Math.cos(i / 14 * Math.PI), y + r * Math.sin(i / 14 * Math.PI)] as const) };
}
function box(x: number, y: number, w: number, h: number, r: number): Outline {
  return draw(`M${x + r} ${y}L${x + w - r} ${y}Q${x + w} ${y} ${x + w} ${y + r}L${x + w} ${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}L${x + r} ${y + h}Q${x} ${y + h} ${x} ${y + h - r}L${x} ${y + r}Q${x} ${y} ${x + r} ${y}Z`)[0]!;
}
function star(x: number, y: number, r: number): Outline {
  return { closed: true, points: Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / 5, reach = i % 2 ? r / 2 : r;
    return [x + reach * Math.cos(angle), y + reach * Math.sin(angle)] as const;
  }) };
}
const shape = (wrap: Wrap, fill: Paint, ...art: (string | Outline)[]): Part => ({ wrap, fill, outlines: art.flatMap((a) => typeof a === "string" ? draw(a) : [a]) });
const stroke = (wrap: Wrap, paint: Paint, width: number, ...art: (string | Outline)[]): Part => ({ wrap, stroke: paint, width, outlines: art.flatMap((a) => typeof a === "string" ? draw(a) : [a]) });
const lens = (width: number, ...art: Outline[]): Part => ({ wrap: "face", fill: "glass", stroke: "base", width, outlines: art });
const at = (x: number, y: number): Wrap => ({ anchor: [x, y] });

const ITEM = at(198, 200);
const FLOWER = at(62, 92);
const MEDAL = at(128, 200);

export const OUTFIT_PIECES: Record<OutfitSlot, Record<string, Piece>> = {
  hat: {
    crown: { label: "Crown", color: "yellow", parts: [
      shape("hat", "base", "M82 64L74 14Q73 8 79 12L103 34L124 5Q128 0 132 5L153 34L177 12Q183 8 182 14L174 64Q128 78 82 64Z"),
      shape("hat", "dark", "M82 64L80 50Q128 64 176 50L174 64Q128 78 82 64Z"),
      shape("hat", "light", circle(128, 64, 5), circle(102, 60, 4), circle(154, 60, 4)),
    ] },
    hardhat: { label: "Hard hat", color: "yellow", parts: [
      shape("hat", "base", "M66 66Q64 6 128 6Q192 6 190 66Z"),
      shape("hat", "light", "M114 8Q128 0 142 8L146 62L110 62Z"),
      shape("hat", "dark", "M52 62Q128 44 204 62Q212 76 196 77Q128 62 60 77Q44 76 52 62Z"),
    ] },
    beanie: { label: "Beanie", color: "green", parts: [
      shape("hat", "light", circle(128, 0, 15)),
      shape("hat", "base", "M62 74Q58 4 128 4Q198 4 194 74Z"),
      shape("hat", "light", "M56 60Q128 42 200 60Q204 62 203 68L201 80Q200 86 194 84Q128 66 62 84Q56 86 55 80L53 68Q52 62 56 60Z"),
    ] },
    cap: { label: "Cap", color: "blue", parts: [
      shape("hat", "base", "M62 72Q58 8 128 8Q198 8 194 72Q128 52 62 72Z"),
      shape("hat", "light", "M128 8Q160 14 164 58Q146 56 128 56Z"),
      shape("hat", "dark", "M112 60Q186 46 236 74Q244 86 228 86Q172 68 112 72Z"),
      shape("hat", "dark", circle(128, 8, 7)),
    ] },
    chef: { label: "Chef hat", color: "white", tall: true, parts: [
      shape("hat", "base", "M76 42Q46 36 50 6Q56 -22 90 -14Q104 -36 128 -34Q152 -36 166 -14Q200 -22 206 6Q210 36 180 42Z"),
      shape("hat", "light", "M74 34L78 72Q128 58 178 72L182 34Q128 48 74 34Z"),
      stroke("hat", "dark", 4, "M106 16L108 38M128 10L128 42M150 16L148 38"),
    ] },
    grad: { label: "Graduate", color: "ink", tall: true, parts: [
      shape("hat", "dark", "M72 40L74 76Q128 58 182 76L184 40L128 60Z"),
      shape("hat", "base", "M124 -6Q128 -8 132 -6L218 24Q224 28 218 32L132 62Q128 64 124 62L38 32Q32 28 38 24Z"),
      stroke("hat", "gold", 5, "M128 28L204 42L204 74"),
      shape("hat", "gold", box(195, 70, 18, 24, 5)),
    ] },
    tophat: { label: "Top hat", color: "ink", tall: true, parts: [
      shape("hat", "base", "M84 66L76 -22Q128 -36 180 -22L172 66Z"),
      shape("hat", "ribbon", "M82 42Q128 56 174 42L172 66Q128 78 84 66Z"),
      shape("hat", "dark", "M52 60Q128 78 204 60Q214 74 198 78Q128 94 58 78Q42 74 52 60Z"),
    ] },
    beret: { label: "Beret", color: "red", parts: [
      shape("hat", "dark", "M130 14L134 -2Q138 -6 142 -1L140 16Z"),
      shape("hat", "base", "M60 66Q36 46 64 26Q108 0 166 14Q220 32 198 66Q128 42 60 66Z"),
      shape("hat", "dark", "M60 66Q128 42 198 66Q198 74 190 73Q128 54 68 73Q60 74 60 66Z"),
    ] },
    headset: { label: "Headset", color: "ink", parts: [
      stroke("side", "base", 11, "M42 118Q38 24 128 24Q218 24 214 118"),
      stroke("face", "base", 6, "M44 150Q52 184 92 178"),
      shape("side", "base", box(26, 100, 26, 54, 12)),
      shape("side", "base", box(204, 100, 26, 54, 12)),
      shape("side", "light", box(32, 110, 9, 34, 4)),
      shape("side", "light", box(215, 110, 9, 34, 4)),
      shape("face", "light", circle(96, 177, 9)),
    ] },
    party: { label: "Party hat", color: "pink", tall: true, parts: [
      shape("hat", "base", "M124 -30Q128 -36 132 -30L180 66Q128 80 76 66Z"),
      shape("hat", "light", "M109 2L154 14L166 38L95 30Z"),
      shape("hat", "dark", "M83 54L170 46L180 66Q128 80 76 66Z"),
      shape("hat", "light", circle(128, -34, 14)),
    ] },
  },
  glasses: {
    round: { label: "Round", color: "ink", parts: [
      stroke("face", "base", 6, "M92 120L54 111", "M164 120L202 111", "M123 119Q128 115 133 119"),
      lens(6, circle(108, 122, 15), circle(148, 122, 15)),
    ] },
    square: { label: "Square", color: "ink", parts: [
      stroke("face", "base", 7, "M88 117L52 111", "M168 117L204 111", "M123 118L133 118"),
      lens(7, box(88, 107, 35, 28, 8), box(133, 107, 35, 28, 8)),
    ] },
    sun: { label: "Sunglasses", color: "ink", parts: [
      stroke("face", "base", 7, "M86 114L50 108", "M170 114L206 108", "M124 114L132 114"),
      shape("face", "base", "M84 106L126 106Q128 142 105 142Q82 142 84 106Z", "M130 106L172 106Q174 142 151 142Q128 142 130 106Z"),
    ] },
    star: { label: "Stars", color: "yellow", parts: [
      stroke("face", "base", 6, "M90 120L52 112", "M166 120L204 112", "M122 122L134 122"),
      shape("face", "base", star(106, 122, 23), star(150, 122, 23)),
    ] },
    monocle: { label: "Monocle", color: "ink", parts: [
      stroke("face", "base", 3, "M162 134Q182 166 172 200"),
      lens(6, circle(148, 122, 17)),
    ] },
    visor: { label: "Visor", color: "blue", parts: [
      shape("ring", "base", "M42 108Q128 90 214 108L217 130Q128 148 39 130Z"),
      stroke("face", "light", 7, "M66 114Q104 105 140 106"),
    ] },
  },
  wear: {
    bowtie: { label: "Bow tie", color: "pink", parts: [
      shape("face", "base", "M128 188L100 169Q88 166 88 178L88 198Q88 210 100 206Z", "M128 188L156 169Q168 166 168 178L168 198Q168 210 156 206Z"),
      shape("face", "dark", box(118, 177, 20, 22, 8)),
    ] },
    tie: { label: "Tie", color: "ink", parts: [
      shape("face", "base", "M123 180L133 180L147 212L130 228Q128 230 126 228L109 212Z"),
      shape("face", "light", "M117 194L137 188L141 199L112 206Z"),
      shape("face", "dark", "M115 164L141 164Q144 164 143 168L136 184L120 184L113 168Q112 164 115 164Z"),
    ] },
    scarf: { label: "Scarf", color: "red", parts: [
      shape("face", "dark", "M164 182L190 176L198 226Q199 232 193 233L174 236Q168 236 168 230Z"),
      shape("ring", "base", "M36 162Q128 192 220 162Q224 162 224 168L222 184Q222 190 216 191Q128 216 40 191Q34 190 34 184L32 168Q32 162 36 162Z"),
      stroke("ring", "light", 6, "M42 178Q128 203 214 178"),
    ] },
    badge: { label: "Badge", color: "blue", parts: [
      stroke("face", "base", 7, "M78 162L128 196L178 162"),
      shape("face", "paper", box(108, 188, 40, 42, 7)),
      shape("face", "base", circle(128, 204, 8)),
      stroke("face", "dark", 5, "M117 220L139 220"),
    ] },
    medal: { label: "Medal", color: "blue", parts: [
      shape(MEDAL, "base", "M106 160L122 160L128 174L134 160L150 160L134 192L122 192Z"),
      shape(MEDAL, "gold", circle(128, 204, 20)),
      shape(MEDAL, "goldLight", star(128, 204, 12)),
    ] },
    mustache: { label: "Mustache", color: "ink", parts: [
      shape("face", "base", "M128 141Q112 130 99 142Q91 150 81 143Q86 163 107 159Q122 156 128 148Q134 156 149 159Q170 163 175 143Q165 150 157 142Q144 130 128 141Z"),
    ] },
    flower: { label: "Flower", color: "pink", parts: [
      shape(FLOWER, "base", circle(56, 74, 11), circle(74, 86, 11), circle(67, 107, 11), circle(45, 107, 11), circle(38, 86, 11)),
      shape(FLOWER, "light", circle(56, 92, 11)),
    ] },
  },
  item: {
    laptop: { label: "Laptop", color: "ink", parts: [
      shape(ITEM, "dark", box(152, 164, 92, 60, 8)),
      shape(ITEM, "light", box(160, 172, 76, 44, 4)),
      shape(ITEM, "base", "M140 222L256 222Q258 234 250 234L146 234Q138 234 140 222Z"),
      stroke(ITEM, "dark", 5, "M172 186L184 194L172 202M192 202L210 202"),
    ] },
    coffee: { label: "Coffee", color: "white", parts: [
      stroke(ITEM, "dark", 8, "M230 188Q250 188 250 203Q250 218 230 218"),
      shape(ITEM, "base", box(186, 176, 46, 56, 11)),
      shape(ITEM, "light", "M186 194L232 194L232 208L186 208Z"),
      stroke(ITEM, "steam", 5, "M200 164Q195 156 201 148M217 164Q212 156 218 148"),
    ] },
    wrench: { label: "Wrench", color: "ink", parts: [
      shape(ITEM, "base", "M220 190Q208 168 226 152Q232 147 233 154L233 168L242 174L252 167Q258 163 258 170Q256 194 234 196L210 232Q202 241 193 235Q185 228 191 219Z"),
      shape(ITEM, "light", circle(201, 226, 5)),
    ] },
    magnifier: { label: "Magnifier", color: "ink", parts: [
      stroke(ITEM, "dark", 14, "M226 202L248 230"),
      { wrap: ITEM, fill: "glass", stroke: "base", width: 9, outlines: [circle(208, 178, 27)] },
      stroke(ITEM, "paper", 5, "M194 172Q198 162 208 161"),
    ] },
    pencil: { label: "Pencil", color: "yellow", parts: [
      shape(ITEM, "wood", "M194 218L232 156L250 167L212 229L194 238Z"),
      shape(ITEM, "base", "M199 210L232 156L250 167L217 221Z"),
      shape(ITEM, "dark", "M232 156L238 147Q241 143 245 145L254 151Q258 154 255 158L250 167Z", "M194 238L195 227L203 233Z"),
    ] },
    clipboard: { label: "Clipboard", color: "orange", parts: [
      shape(ITEM, "base", box(184, 162, 62, 74, 8)),
      shape(ITEM, "paper", box(192, 174, 46, 54, 4)),
      shape(ITEM, "dark", box(202, 154, 26, 18, 6)),
      stroke(ITEM, "dark", 4, "M201 190L229 190M201 202L229 202M201 214L219 214"),
    ] },
    megaphone: { label: "Megaphone", color: "red", parts: [
      shape(ITEM, "dark", "M196 206L212 206L218 232Q218 237 213 237L206 237Q202 237 201 232Z"),
      shape(ITEM, "base", "M184 190L238 160L238 226L184 208Q178 206 178 199Q178 193 184 190Z"),
      shape(ITEM, "light", box(232, 154, 14, 78, 7)),
    ] },
  },
};
