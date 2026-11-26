import { describe, expect, it } from "vitest";
import type { ProviderFailure } from "@paperclipai/shared";
import { explainRunFailure, FALLBACK_EXPLANATION } from "./runFailureExplanation";

const pf = (category: ProviderFailure["category"]) => ({ category } as ProviderFailure);

describe("explainRunFailure", () => {
  it("explains a rate limit", () => {
    expect(explainRunFailure({ providerFailure: pf("rate_limit") }).whatToDo).toBe("Wait a few minutes and retry. Nothing is broken.");
  });
  it("covers every named provider category", () => {
    for (const c of ["rate_limit","quota_exhausted","authentication","permission","model_unavailable","invalid_request","overloaded","timeout"] as const)
      expect(explainRunFailure({ providerFailure: pf(c) })).not.toBe(FALLBACK_EXPLANATION);
  });
  it("explains the unsafe-permissions setup error", () => {
    const e = explainRunFailure({ errorCode: "acpx_turn_failed", error: "qualified ACPX must not be group- or world-writable" });
    expect(e.whatHappened).toContain("unsafe permissions");
    expect(e.whatToDo).toContain("Ask Daven");
  });
  it("explains stopped and cut-off runs", () => {
    expect(explainRunFailure({ errorCode: "cancelled" })).not.toBe(FALLBACK_EXPLANATION);
    expect(explainRunFailure({ errorCode: "process_lost" })).not.toBe(FALLBACK_EXPLANATION);
  });
  it("explains usage limits", () => {
    expect(explainRunFailure({ errorCode: "acpx_turn_failed", error: "ACP agent reported a terminal limit failure." }).whatHappened).toContain("usage limit");
  });
  it("falls back instead of guessing", () => {
    expect(explainRunFailure({ errorCode: "acpx_turn_failed", error: "terminal service failure" })).toBe(FALLBACK_EXPLANATION);
    expect(explainRunFailure({ providerFailure: pf("unknown") })).toBe(FALLBACK_EXPLANATION);
    expect(explainRunFailure({})).toBe(FALLBACK_EXPLANATION);
  });
});
