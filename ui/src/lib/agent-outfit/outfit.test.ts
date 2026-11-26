import { describe, expect, it } from "vitest";
import { OUTFIT_PIECES, OUTFIT_SLOTS } from "./art";
import { JOB_OUTFITS, metadataWithOutfit, outfitForTitle, outfitFromMetadata, parseOutfit } from "./outfit";
import { PORTRAIT_FRAME, projectOutline } from "./project";

const pieces = OUTFIT_SLOTS.flatMap((slot) => Object.entries(OUTFIT_PIECES[slot]).map(([id, piece]) => ({ name: `${slot}/${id}`, piece })));

describe("outfit projection", () => {
  it.each(pieces)("draws $name unchanged on the front-facing portrait", ({ piece }) => {
    for (const part of piece.parts) for (const outline of part.outlines) {
      const drawn = projectOutline(outline, part.wrap, PORTRAIT_FRAME).flatMap((run) => run.points);
      expect(drawn).toHaveLength(outline.points.length);
      drawn.forEach(([x, y], i) => {
        expect(x).toBeCloseTo(outline.points[i]![0], 6);
        expect(y).toBeCloseTo(outline.points[i]![1], 6);
      });
    }
  });

  it("moves glasses toward the side the body turns to, and keeps a hat centered", () => {
    const turned = { ...PORTRAIT_FRAME, rotation: { x: 0, y: 28, z: 0 } };
    const centerOf = (slot: "glasses" | "hat", id: string, part: number) => {
      const { outlines, wrap } = OUTFIT_PIECES[slot][id]!.parts[part]!;
      const xs = outlines.flatMap((o) => projectOutline(o, wrap, turned)).flatMap((o) => o.points.map((p) => p[0]));
      return (Math.min(...xs) + Math.max(...xs)) / 2;
    };
    expect(centerOf("glasses", "round", 1)).toBeGreaterThan(150);
    expect(centerOf("hat", "hardhat", 0)).toBeCloseTo(128, 0);
  });

  it("produces finite points at every pose limit", () => {
    for (const x of [-16, 16]) for (const y of [-28, 28]) for (const { piece } of pieces) for (const part of piece.parts) for (const outline of part.outlines) {
      const points = projectOutline(outline, part.wrap, { ...PORTRAIT_FRAME, rotation: { x, y, z: 10 } }).flatMap((run) => run.points);
      expect(points.every((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]))).toBe(true);
    }
  });
});

describe("stored outfits", () => {
  it("drops unknown pieces and repairs unknown colors", () => {
    expect(parseOutfit({ hat: { id: "crown", color: "plaid" }, glasses: { id: "constructor", color: "ink" }, item: "laptop" }))
      .toEqual({ hat: { id: "crown", color: "yellow" } });
    expect(outfitFromMetadata(null)).toEqual({});
  });
  it("keeps other metadata and removes an empty outfit", () => {
    const stored = { setupAdapterPending: false, outfit: { hat: { id: "cap", color: "blue" } } };
    expect(metadataWithOutfit(stored, {})).toEqual({ setupAdapterPending: false });
    expect(metadataWithOutfit(stored, { wear: { id: "tie", color: "ink" } })).toEqual({ setupAdapterPending: false, outfit: { wear: { id: "tie", color: "ink" } } });
  });
  it("suggests an outfit from the job title", () => {
    expect(outfitForTitle("CEO")?.label).toBe("Boss");
    expect(outfitForTitle("Software Engineer")?.label).toBe("Engineer");
    expect(outfitForTitle("Director of Design")?.label).toBe("Designer");
    expect(outfitForTitle("Zookeeper")).toBeNull();
    for (const job of JOB_OUTFITS) expect(parseOutfit(job.outfit)).toEqual(job.outfit);
  });
});
