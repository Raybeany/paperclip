// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FailureExplanation } from "./FailureExplanation";
import { FALLBACK_EXPLANATION } from "../lib/runFailureExplanation";

describe("FailureExplanation", () => {
  it("shows both lines and the raw error in a closed Details toggle", () => {
    const html = renderToStaticMarkup(<FailureExplanation explanation={FALLBACK_EXPLANATION} details={<span>raw &lt;error&gt; text</span>} />);
    expect(html).toContain("What happened:");
    expect(html).toContain("What you can do:");
    expect(html).toContain("<details");
    expect(html).not.toContain("<details open");
    expect(html).toContain("raw &lt;error&gt; text");
  });
});
