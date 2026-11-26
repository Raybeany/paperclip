import type { ProviderFailure } from "@paperclipai/shared";

export interface FailureExplanation { whatHappened: string; whatToDo: string }

export const FALLBACK_EXPLANATION: FailureExplanation = {
  whatHappened: "The run stopped because of an error we don't have a plain explanation for yet.",
  whatToDo: "Retry once. If it fails again, send the details below to Daven.",
};

const byProviderCategory: Partial<Record<ProviderFailure["category"], FailureExplanation>> = {
  rate_limit: { whatHappened: "The AI provider is getting too many requests right now and asked us to slow down.", whatToDo: "Wait a few minutes and retry. Nothing is broken." },
  quota_exhausted: { whatHappened: "The usage allowance on this AI account has run out.", whatToDo: "Wait for the allowance to reset or top it up, then retry." },
  authentication: { whatHappened: "The AI provider didn't accept the sign-in for this agent.", whatToDo: "Ask Daven to sign the agent in again, then retry." },
  permission: { whatHappened: "The AI provider said this account isn't allowed to do that.", whatToDo: "Ask Daven to check the account's access, then retry." },
  model_unavailable: { whatHappened: "The AI model this agent uses isn't available right now.", whatToDo: "Ask Daven to pick another model, or retry later." },
  invalid_request: { whatHappened: "The AI provider rejected the request as not valid.", whatToDo: "Ask Daven to look at it. Retrying won't help." },
  overloaded: { whatHappened: "The AI provider is too busy to take the request right now.", whatToDo: "Wait a few minutes and retry. Nothing is broken." },
  timeout: { whatHappened: "The AI provider took too long to answer.", whatToDo: "Retry. If it keeps happening, ask Daven to look." },
};

const usageLimit: FailureExplanation = {
  whatHappened: "The agent hit its usage limit and has to wait for it to reset.",
  whatToDo: "Wait until the limit resets (the time is in the details), then retry.",
};

/** Plain-language lines for a failed run; unknown causes get the fallback, never a guess. */
export function explainRunFailure(input: {
  providerFailure?: ProviderFailure | null;
  errorCode?: string | null;
  error?: string | null;
}): FailureExplanation {
  const { providerFailure, errorCode, error } = input;
  if (providerFailure) return byProviderCategory[providerFailure.category] ?? FALLBACK_EXPLANATION;
  const text = error ?? "";
  if (/must not be group- or world-writable/i.test(text)) return {
    whatHappened: "The agent couldn't start because one of its setup files has unsafe permissions.",
    whatToDo: "Ask Daven to fix the setup, then retry.",
  };
  if (errorCode === "native_provider_usage_limit" || errorCode === "provider_limit_wait"
    || (errorCode === "acpx_turn_failed" && /terminal limit failure/i.test(text))) return usageLimit;
  if (errorCode === "cancelled") return {
    whatHappened: "This run was stopped before it finished.",
    whatToDo: "Start it again if you still want it done.",
  };
  if (errorCode === "process_lost") return {
    whatHappened: "The agent stopped partway through because its process disappeared.",
    whatToDo: "Retry. If it keeps happening, ask Daven to look.",
  };
  return FALLBACK_EXPLANATION;
}
