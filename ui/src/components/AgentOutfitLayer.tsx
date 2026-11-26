import { useImperativeHandle, useMemo, useRef, type CSSProperties, type Ref } from "react";
import { OUTFIT_PIECES, OUTFIT_SLOTS, type Paint, type Part } from "@/lib/agent-outfit/art";
import type { AgentOutfit } from "@/lib/agent-outfit/outfit";
import { pathOf, PORTRAIT_FRAME, projectOutline, type CharacterFrame } from "@/lib/agent-outfit/project";
import { cn } from "@/lib/utils";

export interface AgentOutfitHandle { draw(frame: CharacterFrame): void }

const paint = (name: Paint | undefined) => name ? `var(--agent-outfit-${name})` : "none";
const pathFor = (part: Part, frame: CharacterFrame) => pathOf(part.outlines.flatMap((outline) => projectOutline(outline, part.wrap, frame)));
// Portrait paths never change, so lists of dressed agents share them.
const portraits = new Map<Part, string>();
function portraitPath(part: Part) {
  let path = portraits.get(part);
  if (path === undefined) portraits.set(part, path = pathFor(part, PORTRAIT_FRAME));
  return path;
}

/** Vector outfit over the character's square box. `draw` follows a live pose without re-rendering. */
export function AgentOutfitLayer({ outfit, className, hideItem = false, ref }: { outfit: AgentOutfit; className?: string; hideItem?: boolean; ref?: Ref<AgentOutfitHandle> }) {
  const worn = useMemo(() => OUTFIT_SLOTS.flatMap((slot) => {
    const choice = outfit[slot];
    const piece = choice ? OUTFIT_PIECES[slot][choice.id] : undefined;
    return choice && piece && !(hideItem && slot === "item") ? [{ slot, color: choice.color, parts: piece.parts }] : [];
  }), [outfit, hideItem]);
  const parts = useMemo(() => worn.flatMap((piece) => piece.parts), [worn]);
  const svg = useRef<SVGSVGElement>(null);
  useImperativeHandle(ref, () => ({
    draw(frame) {
      svg.current?.querySelectorAll("path").forEach((path, i) => { if (parts[i]) path.setAttribute("d", pathFor(parts[i], frame)); });
    },
  }), [parts]);
  if (!worn.length) return null;
  return (
    <svg ref={svg} data-slot="agent-outfit" aria-hidden viewBox="0 0 256 256" strokeLinecap="round" strokeLinejoin="round"
      className={cn("pointer-events-none absolute inset-0 size-full overflow-visible", className)}>
      {worn.map((piece) => (
        <g key={piece.slot} className="agent-outfit-piece" style={{ "--agent-outfit-base": `var(--agent-outfit-color-${piece.color})` } as CSSProperties}>
          {piece.parts.map((part, i) => <path key={i} d={portraitPath(part)} style={{ fill: paint(part.fill), stroke: paint(part.stroke), strokeWidth: part.width ?? 0 }} />)}
        </g>
      ))}
    </svg>
  );
}
