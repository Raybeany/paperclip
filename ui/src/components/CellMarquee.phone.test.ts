import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("task title on phones", () => {
  it("wraps to two lines with an ellipsis instead of fading out", () => {
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    const block = css.match(/@media \(max-width: 639px\) \{\s*\.cell-marquee\[data-slot="task-row-title"\][\s\S]*?\n\}\n/)?.[0] ?? "";
    expect(block).toContain("-webkit-line-clamp: 2");
    expect(block).toContain("white-space: normal");
    expect(block).toContain("mask-image: none");
  });
});
