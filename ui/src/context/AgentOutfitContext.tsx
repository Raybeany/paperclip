import { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Agent } from "@paperclipai/shared";
import { agentsApi } from "@/api/agents";
import { isBare, outfitFromMetadata, type AgentOutfit } from "@/lib/agent-outfit/outfit";
import { queryKeys } from "@/lib/queryKeys";

type Outfits = Record<string, AgentOutfit>;
const NONE: Outfits = {};
const AgentOutfitContext = createContext<Outfits>(NONE);

function outfitsOf(agents: Agent[]): Outfits {
  const outfits: Outfits = {};
  for (const agent of agents) {
    const outfit = outfitFromMetadata(agent.metadata);
    if (!isBare(outfit)) outfits[agent.id] = outfit;
  }
  return outfits;
}

/** Many avatars receive only an agent id, so outfits come from the shared agent list. */
export function AgentOutfitProvider({ companyId, children }: { companyId: string | null | undefined; children: ReactNode }) {
  const { data } = useQuery({
    queryKey: queryKeys.agents.list(companyId ?? ""),
    queryFn: () => agentsApi.list(companyId!),
    enabled: Boolean(companyId),
    // A selected result keeps its identity until an outfit really changes.
    select: outfitsOf,
  });
  return <AgentOutfitContext.Provider value={data ?? NONE}>{children}</AgentOutfitContext.Provider>;
}
export function useAgentOutfit(agentId: string | undefined): AgentOutfit | undefined {
  const outfits = useContext(AgentOutfitContext);
  return agentId ? outfits[agentId] : undefined;
}
