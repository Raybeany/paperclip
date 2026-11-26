import { Plus } from "lucide-react";
import type { Agent, Issue } from "@paperclipai/shared";
import { AgentAvatar } from "@/components/AgentAvatar";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Link } from "@/lib/router";
import { agentRouteRef } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = { running: "Working", idle: "Ready", active: "Ready", paused: "Paused", error: "Needs a look" };

export function greetingFor(date: Date) {
  const hour = date.getHours();
  return hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
}

/** Says what needs the person, in plain words. Empty parts are left out. */
export function attentionSummary(input: { reviews: number; approvals: number; blocked: number; troubled: number }) {
  const parts = [
    input.reviews && `${input.reviews} ${input.reviews === 1 ? "task is" : "tasks are"} waiting for your review`,
    input.approvals && `${input.approvals} ${input.approvals === 1 ? "approval needs" : "approvals need"} you`,
    input.blocked && `${input.blocked} blocked`,
    input.troubled && `${input.troubled} ${input.troubled === 1 ? "worker needs" : "workers need"} a look`,
  ].filter(Boolean);
  return parts.length ? `${parts.join(" · ")}.` : "Nothing needs you right now.";
}

export function DashboardWelcome({ agents, issues, approvals, blocked, onNewTask, now = new Date() }: {
  agents: Agent[];
  issues: Issue[];
  approvals: number;
  blocked: number;
  onNewTask: () => void;
  now?: Date;
}) {
  const workers = agents.filter((agent) => agent.status !== "terminated");
  const summary = attentionSummary({
    reviews: issues.filter((issue) => issue.status === "in_review").length,
    approvals,
    blocked,
    troubled: workers.filter((agent) => agent.status === "error").length,
  });
  return (
    <section aria-labelledby="dashboard-welcome" className="dashboard-welcome rounded-xl border border-border px-5 py-6 sm:px-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h2 id="dashboard-welcome" className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">{greetingFor(now)}</h2>
          <p className="text-sm text-muted-foreground sm:text-base">{summary}</p>
        </div>
        <Button onClick={onNewTask}><Plus aria-hidden />New task</Button>
      </div>
      {workers.length ? (
        <ul aria-label="Your workers" className="mt-6 flex gap-3 overflow-x-auto pb-1">
          {workers.map((agent) => (
            <li key={agent.id} className="shrink-0">
              <Link to={`/chats/${encodeURIComponent(agentRouteRef(agent))}`}
                className="flex w-32 flex-col items-center gap-2 rounded-lg px-2 pt-3 pb-3 text-center no-underline text-inherit transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <AgentAvatar agent={agent} size={64} />
                <span className="w-full truncate text-sm font-medium">{agent.name}</span>
                <StatusBadge status={agent.status === "active" ? "idle" : agent.status} label={STATUS_LABEL[agent.status] ?? agent.status} />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
