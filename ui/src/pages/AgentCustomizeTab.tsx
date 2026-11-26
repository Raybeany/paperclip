import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AGENT_PALETTE_IDS, resolveAgentAppearance, type Agent, type AgentAppearance } from "@paperclipai/shared";
import { agentsApi } from "@/api/agents";
import { describeError } from "@/api/errors";
import { AgentAvatar } from "@/components/AgentAvatar";
import { AgentCharacter } from "@/components/AgentCharacter";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OUTFIT_COLORS, OUTFIT_PIECES, OUTFIT_SLOTS, type OutfitSlot } from "@/lib/agent-outfit/art";
import { JOB_OUTFITS, metadataWithOutfit, outfitForTitle, outfitFromMetadata, sameOutfit, type AgentOutfit } from "@/lib/agent-outfit/outfit";
import { queryKeys } from "@/lib/queryKeys";
import { cn } from "@/lib/utils";

type Look = { appearance: AgentAppearance; outfit: AgentOutfit };
const BARE: AgentOutfit = {};
const SLOTS: { slot: OutfitSlot; label: string }[] = [
  { slot: "hat", label: "Hat" }, { slot: "glasses", label: "Glasses" }, { slot: "wear", label: "Wear" }, { slot: "item", label: "Item" },
];
const title = (id: string) => id.charAt(0).toUpperCase() + id.slice(1).replaceAll("-", " ");
const any = <T,>(list: readonly T[]) => list[Math.floor(Math.random() * list.length)]!;

function Tile({ label, selected, onSelect, children }: { label: string; selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={selected} onClick={onSelect}
      className={cn("flex min-h-28 flex-col items-center justify-start gap-2 rounded-lg px-1 pt-5 pb-2 text-xs transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "bg-background font-semibold ring-2 ring-foreground" : "bg-muted hover:bg-accent")}>
      {children}
      <span className="text-center">{label}</span>
    </button>
  );
}
const tiles = "grid grid-cols-3 gap-2 p-0.5 sm:grid-cols-4 lg:grid-cols-5";

export function AgentCustomizeTab({ agent, companyId, onDirtyChange, onSavingChange, onSaved, onSaveActionChange, onCancelActionChange }: {
  agent: Agent;
  companyId?: string;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
  onSaved: () => void;
  onSaveActionChange: (save: (() => void) | null) => void;
  onCancelActionChange: (cancel: (() => void) | null) => void;
}) {
  const queryClient = useQueryClient();
  const saved = useMemo<Look>(() => ({
    appearance: resolveAgentAppearance(agent.appearance, agent.id), outfit: outfitFromMetadata(agent.metadata),
  }), [agent.appearance, agent.id, agent.metadata]);
  const [draft, setDraft] = useState<Look | null>(null);
  const look = draft ?? saved;
  const recolored = look.appearance.paletteId !== saved.appearance.paletteId;
  const dirty = recolored || !sameOutfit(look.outfit, saved.outfit);
  const change = (patch: Partial<Look>) => setDraft({ ...look, ...patch });
  const wear = (slot: OutfitSlot, id: string | null) => {
    const { [slot]: _removed, ...rest } = look.outfit;
    change({ outfit: id ? { ...rest, [slot]: { id, color: look.outfit[slot]?.color ?? OUTFIT_PIECES[slot][id]!.color } } : rest });
  };

  const save = useMutation({
    mutationFn: async (next: Look) => {
      // The revision makes the server refuse a save over newer settings.
      const current = await agentsApi.getConfiguration(agent.id, companyId);
      return agentsApi.update(agent.id, {
        metadata: metadataWithOutfit(current.metadata as Record<string, unknown> | null, next.outfit),
        ...(recolored ? { appearance: next.appearance } : {}),
        expectedConfigurationRevision: current.configurationRevision,
      }, companyId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["agents"] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.agents.configRevisions(agent.id) }),
      ]);
      setDraft(null);
      onSaved();
    },
  });

  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { onSavingChange(save.isPending); }, [save.isPending, onSavingChange]);
  useEffect(() => {
    onSaveActionChange(() => { if (!save.isPending) save.mutate(look); });
    onCancelActionChange(() => { save.reset(); setDraft(null); });
  });
  useEffect(() => () => {
    onDirtyChange(false); onSavingChange(false); onSaveActionChange(null); onCancelActionChange(null);
  }, [onDirtyChange, onSavingChange, onSaveActionChange, onCancelActionChange]);

  const suggested = outfitForTitle(agent.title);
  const jobs = suggested ? [suggested, ...JOB_OUTFITS.filter((job) => job !== suggested)] : JOB_OUTFITS;
  const surprise = () => change({
    appearance: { ...look.appearance, paletteId: any(AGENT_PALETTE_IDS) },
    outfit: Object.fromEntries(OUTFIT_SLOTS.flatMap((slot) => {
      const id = any([null, ...Object.keys(OUTFIT_PIECES[slot])]);
      return id ? [[slot, { id, color: any(OUTFIT_COLORS) }]] : [];
    })),
  });

  return (
    <div className="grid items-start gap-8 md:grid-cols-(--agent-customize-columns)">
      <section aria-label="Preview" className="space-y-3 md:sticky md:top-6">
        <div className="flex justify-center rounded-xl bg-muted px-4 pt-14 pb-6">
          <AgentCharacter agent={agent} appearance={look.appearance} outfit={look.outfit} size={256} className="size-56" trackingScope="page" label={`${agent.name} preview`} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="flex-1" onClick={surprise}>Surprise me</Button>
          <Button variant="outline" className="flex-1" onClick={() => change({ outfit: BARE })}>Take it all off</Button>
        </div>
        {look.appearance.customAvatarAssetId ? <p className="text-sm text-muted-foreground">{agent.name} uses an uploaded picture, so outfits stay hidden.</p> : null}
        {save.error ? <p role="alert" className="text-sm text-destructive">{describeError(save.error).body}</p> : null}
      </section>

      <div className="min-w-0 space-y-8">
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-base font-semibold">Job outfits</h3>
            {suggested ? <p className="text-sm text-muted-foreground">{suggested.label} suits {agent.title}</p> : null}
          </div>
          <div className={tiles}>
            {jobs.map((job) => (
              <Tile key={job.label} label={job.label} selected={sameOutfit(job.outfit, look.outfit)} onSelect={() => change({ outfit: job.outfit })}>
                <AgentAvatar appearance={look.appearance} outfit={job.outfit} size={64} />
              </Tile>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-base font-semibold">Mix your own</h3>
          <Tabs defaultValue="hat">
            <TabsList className="w-full">
              <TabsTrigger value="body">Body</TabsTrigger>
              {SLOTS.map(({ slot, label }) => <TabsTrigger key={slot} value={slot}>{label}</TabsTrigger>)}
            </TabsList>
            <TabsContent value="body" className={cn(tiles, "pt-2")}>
              {AGENT_PALETTE_IDS.map((paletteId) => {
                const appearance = { ...look.appearance, paletteId };
                return (
                  <Tile key={paletteId} label={title(paletteId)} selected={look.appearance.paletteId === paletteId} onSelect={() => change({ appearance })}>
                    <AgentAvatar appearance={appearance} outfit={BARE} size={64} />
                  </Tile>
                );
              })}
            </TabsContent>
            {SLOTS.map(({ slot, label }) => {
              const worn = look.outfit[slot];
              return (
                <TabsContent key={slot} value={slot} className="space-y-3 pt-2">
                  <div className={tiles}>
                    <Tile label="None" selected={!worn} onSelect={() => wear(slot, null)}>
                      <AgentAvatar appearance={look.appearance} outfit={BARE} size={64} />
                    </Tile>
                    {Object.entries(OUTFIT_PIECES[slot]).map(([id, piece]) => (
                      <Tile key={id} label={piece.label} selected={worn?.id === id} onSelect={() => wear(slot, id)}>
                        <AgentAvatar appearance={look.appearance} outfit={{ [slot]: { id, color: worn?.color ?? piece.color } }} size={64} />
                      </Tile>
                    ))}
                  </div>
                  {worn ? (
                    <div role="group" aria-label={`${label} color`} className="flex flex-wrap">
                      {OUTFIT_COLORS.map((color) => (
                        <button key={color} type="button" aria-label={title(color)} aria-pressed={worn.color === color}
                          onClick={() => change({ outfit: { ...look.outfit, [slot]: { ...worn, color } } })}
                          className="flex size-11 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span aria-hidden className={cn("size-7 rounded-full border border-foreground/20", worn.color === color && "ring-2 ring-foreground ring-offset-2 ring-offset-background")}
                            style={{ background: `var(--agent-outfit-color-${color})` }} />
                        </button>
                      ))}
                    </div>
                  ) : null}
                </TabsContent>
              );
            })}
          </Tabs>
        </section>
      </div>
    </div>
  );
}
