import { agentAvatarUrl } from "@/lib/agent-avatar-url";
import { useState } from "react";
import { resolveAgentAppearance, type AgentAppearance, type AgentAvatarSize, type CharacterState } from "@paperclipai/shared";
import { cn } from "@/lib/utils";
import { deriveInitials } from "./Identity";
import { useAvatarInitials } from "./ui/avatar-initials";
import { AgentOutfitLayer } from "./AgentOutfitLayer";
import { useAgentOutfit } from "@/context/AgentOutfitContext";
import { OUTFIT_PIECES } from "@/lib/agent-outfit/art";
import { isBare, type AgentOutfit } from "@/lib/agent-outfit/outfit";

export type AvatarAgent = { id?: string; name?: string; appearance?: AgentAppearance | null; avatarUrl?: string | null };
export const avatarSizeClasses: Record<AgentAvatarSize, string> = {
  16: "size-4", 20: "size-5", 24: "size-6", 32: "size-8", 40: "size-10", 48: "size-12",
  64: "size-16", 96: "size-24", 128: "size-32", 256: "size-64", 512: "size-128",
};
export interface AgentAvatarProps {
  agent?: AvatarAgent | null;
  appearance?: AgentAppearance | null;
  size?: AgentAvatarSize;
  name?: string;
  label?: string;
  pose?: CharacterState;
  muted?: boolean;
  /** Overrides the saved outfit, for previews. */
  outfit?: AgentOutfit;
  className?: string;
}
/** A hat needs headroom inside the avatar's box; tiny avatars also drop the portrait's margin. */
function dressedScale(outfit: AgentOutfit, size: AgentAvatarSize) {
  const hat = outfit.hat && outfit.hat.id !== "headset" ? OUTFIT_PIECES.hat[outfit.hat.id] : undefined;
  if (size <= 32) return hat?.tall ? "scale-95" : hat ? "scale-105" : "scale-125";
  return hat?.tall ? "scale-80" : hat ? "scale-90" : "";
}
export function AgentAvatar({ agent, appearance, size = 24, name, label, pose = "rest", muted = false, outfit: preview, className }: AgentAvatarProps) {
  const identity = resolveAgentAppearance(appearance ?? agent?.appearance, agent?.id);
  const saved = useAgentOutfit(agent?.id);
  const outfit = preview ?? saved;
  const dressed = outfit && !isBare(outfit) && !identity.customAvatarAssetId ? outfit : null;
  // Smaller portraits move the face, so a dressed avatar always uses the full drawing.
  const art = dressed && size < 256 ? 256 : size;
  const src = agentAvatarUrl(identity, art, 1, pose, muted);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const initials = useAvatarInitials(deriveInitials(name ?? agent?.name ?? "Agent"));
  const image = <img src={src} srcSet={identity.customAvatarAssetId ? undefined : `${agentAvatarUrl(identity, art, 2, pose, muted)} 2x`} alt="" width={size} height={size}
    decoding="async" loading="lazy" className="size-full object-contain" onError={() => setFailedUrl(src)} />;
  return (
    <span data-slot="agent-avatar" className={cn("relative inline-flex shrink-0 items-center justify-center align-middle", avatarSizeClasses[size], className)}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {failedUrl === src ? <span className="text-xs text-muted-foreground">{initials}</span> :
        dressed ? (
          <span className={cn("absolute inset-0 origin-bottom", dressedScale(dressed, size))}>
            {image}
            <AgentOutfitLayer outfit={dressed} hideItem={size <= 32} />
          </span>
        ) : image}
    </span>
  );
}
