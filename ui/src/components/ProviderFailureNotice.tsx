import type { ReactNode } from "react";
import type { ProviderFailure } from "@paperclipai/shared";
import { InlineBanner } from "./InlineBanner";
import { FailureExplanation } from "./FailureExplanation";
import { explainRunFailure } from "../lib/runFailureExplanation";

const labels: Record<ProviderFailure["category"], string> = {
  rate_limit: "Rate limit reached", quota_exhausted: "Usage allowance exhausted",
  authentication: "Authentication failed", permission: "Access denied",
  model_unavailable: "Model unavailable", invalid_request: "Request rejected",
  overloaded: "Provider at capacity", timeout: "Provider timed out", unknown: "Provider error",
};

export function ProviderFailureNotice({ failure, actions, children, className }: {
  failure: ProviderFailure; actions?: ReactNode; children?: ReactNode; className?: string;
}) {
  const provider = ({ anthropic: "Claude", openai: "OpenAI", sandbox: "Sandbox provider" } as Record<string, string>)[failure.provider] ?? failure.provider;
  return (
    <InlineBanner tone="danger" title={`${provider}: ${labels[failure.category]}`} actions={actions} className={className}>
      <FailureExplanation explanation={explainRunFailure({ providerFailure: failure })} details={<div className="flex flex-col gap-2">
        <p className="whitespace-pre-wrap break-words">{failure.message}</p>
        <p>
          {failure.phase === "startup" ? "Failed before work started" : "Failed during work"}
          {failure.httpStatus ? ` · HTTP ${failure.httpStatus}` : ""}
          {failure.providerCode ? ` · ${failure.providerCode}` : ""}
        </p>
        {failure.requestId && <p className="font-mono">Request: {failure.requestId}</p>}
      </div>}>
        {children}
      </FailureExplanation>
    </InlineBanner>
  );
}
