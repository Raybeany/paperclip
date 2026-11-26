import { describe, expect, it } from "vitest";
import { attentionSummary, greetingFor } from "./DashboardWelcome";

describe("dashboard welcome", () => {
  it("greets by the time of day", () => {
    expect(greetingFor(new Date(2026, 0, 1, 3))).toBe("Working late");
    expect(greetingFor(new Date(2026, 0, 1, 9))).toBe("Good morning");
    expect(greetingFor(new Date(2026, 0, 1, 14))).toBe("Good afternoon");
    expect(greetingFor(new Date(2026, 0, 1, 20))).toBe("Good evening");
  });
  it("says only what needs the person", () => {
    expect(attentionSummary({ reviews: 0, approvals: 0, blocked: 0, troubled: 0 })).toBe("Nothing needs you right now.");
    expect(attentionSummary({ reviews: 1, approvals: 2, blocked: 1, troubled: 1 }))
      .toBe("1 task is waiting for your review · 2 approvals need you · 1 blocked · 1 worker needs a look.");
  });
});
