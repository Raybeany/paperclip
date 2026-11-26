import { OUTFIT_COLORS, OUTFIT_PIECES, OUTFIT_SLOTS, type OutfitColor, type OutfitSlot } from "./art";

export type WornPiece = { id: string; color: OutfitColor };
export type AgentOutfit = Partial<Record<OutfitSlot, WornPiece>>;

/** Reads stored data, dropping anything this build cannot draw. */
export function parseOutfit(value: unknown): AgentOutfit {
  const outfit: AgentOutfit = {};
  if (typeof value !== "object" || value === null) return outfit;
  for (const slot of OUTFIT_SLOTS) {
    const worn = (value as Record<string, unknown>)[slot];
    if (typeof worn !== "object" || worn === null) continue;
    const { id, color } = worn as Record<string, unknown>;
    if (typeof id !== "string" || !Object.hasOwn(OUTFIT_PIECES[slot], id)) continue;
    const known = OUTFIT_COLORS.find((item) => item === color);
    outfit[slot] = { id, color: known ?? OUTFIT_PIECES[slot][id]!.color };
  }
  return outfit;
}
export function outfitFromMetadata(metadata: unknown): AgentOutfit {
  return parseOutfit((metadata as Record<string, unknown> | null | undefined)?.outfit);
}
/** Other metadata belongs to other features and must survive a save. */
export function metadataWithOutfit(metadata: Record<string, unknown> | null | undefined, outfit: AgentOutfit): Record<string, unknown> {
  const { outfit: _previous, ...rest } = metadata ?? {};
  return isBare(outfit) ? rest : { ...rest, outfit };
}
export const isBare = (outfit: AgentOutfit) => OUTFIT_SLOTS.every((slot) => !outfit[slot]);
export const sameOutfit = (a: AgentOutfit, b: AgentOutfit) =>
  OUTFIT_SLOTS.every((slot) => a[slot]?.id === b[slot]?.id && a[slot]?.color === b[slot]?.color);

const wear = (hat?: string, glasses?: string, body?: string, item?: string, colors: Partial<Record<OutfitSlot, OutfitColor>> = {}): AgentOutfit => {
  const ids = { hat, glasses, wear: body, item }, outfit: AgentOutfit = {};
  for (const slot of OUTFIT_SLOTS) {
    const id = ids[slot];
    if (id) outfit[slot] = { id, color: colors[slot] ?? OUTFIT_PIECES[slot][id]!.color };
  }
  return outfit;
};
export interface JobOutfit { label: string; matches: RegExp; outfit: AgentOutfit }
export const JOB_OUTFITS: JobOutfit[] = [
  { label: "Boss", matches: /\b(ceo|coo|cto|chief|founder|president|boss|manager|director|head)\b/i, outfit: wear("crown", undefined, "tie", "coffee") },
  { label: "Engineer", matches: /engineer|develop|software|programmer|\bcoder?\b/i, outfit: wear("cap", "square", undefined, "laptop") },
  { label: "Designer", matches: /design|artist|brand|creative/i, outfit: wear("beret", "round", undefined, "pencil") },
  { label: "Researcher", matches: /research|analy|scien|\bdata\b/i, outfit: wear("grad", "round", undefined, "magnifier") },
  { label: "Support", matches: /support|service|\bhelp|assist/i, outfit: wear("headset", undefined, "badge") },
  { label: "Marketer", matches: /market|sales|social|growth/i, outfit: wear(undefined, "sun", "bowtie", "megaphone") },
  { label: "Builder", matches: /builder|construct|operations|repair|mainten/i, outfit: wear("hardhat", undefined, undefined, "wrench") },
  { label: "Planner", matches: /planner|project|coordinat|schedul/i, outfit: wear(undefined, "square", "tie", "clipboard", { wear: "blue" }) },
  { label: "Chef", matches: /\bchef\b|\bcook|\bfood\b|baker/i, outfit: wear("chef", undefined, "scarf") },
];
/** A specific job beats a rank, so "Director of Design" gets the designer's outfit. */
export function outfitForTitle(title: string | null | undefined): JobOutfit | null {
  if (!title) return null;
  const matches = JOB_OUTFITS.filter((job) => job.matches.test(title));
  return matches.find((job) => job.label !== "Boss") ?? matches[0] ?? null;
}
