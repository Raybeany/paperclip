// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { DraftInput, DraftTextarea, Field, HintIcon } from "./components/agent-config-primitives";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { TooltipProvider } from "./components/ui/tooltip";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const css = readFileSync(resolve(import.meta.dirname, "index.css"), "utf8");
let root: Root | null = null;
let node: HTMLElement;

async function render(ui: ReactNode) {
  node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
  await act(async () => root!.render(<TooltipProvider>{ui}</TooltipProvider>));
  return node;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  node?.remove();
});

describe("tabs", () => {
  it("names a panel only when that panel exists", async () => {
    await render(
      <Tabs value="filter"><TabsList><TabsTrigger value="filter">Filter</TabsTrigger></TabsList></Tabs>,
    );
    expect(node.querySelector('[role="tab"]')!.hasAttribute("aria-controls")).toBe(false);
  });

  it("keeps the link between a tab and its panel", async () => {
    await render(
      <Tabs value="one">
        <TabsList><TabsTrigger value="one">One</TabsTrigger><TabsTrigger value="two">Two</TabsTrigger></TabsList>
        <TabsContent value="one">First</TabsContent>
        <TabsContent value="two">Second</TabsContent>
      </Tabs>,
    );
    for (const tab of node.querySelectorAll('[role="tab"]')) {
      const id = tab.getAttribute("aria-controls");
      expect(id).toBeTruthy();
      expect(document.getElementById(id!)).not.toBeNull();
    }
  });
});

describe("settings fields", () => {
  it.each([
    ["input", <input key="c" defaultValue="" />],
    ["select", <select key="c"><option>One</option></select>],
    ["textarea", <textarea key="c" />],
    ["draft input", <DraftInput key="c" value="" onCommit={() => {}} />],
    ["draft textarea", <DraftTextarea key="c" value="" onCommit={() => {}} />],
  ])("connects the label to its %s", async (_kind, control) => {
    await render(<Field label="Organization name" hint="Shown to people.">{control}{false}</Field>);
    const label = node.querySelector("label")!;
    expect(label.control).not.toBeNull();
    expect(label.control).toBe(node.querySelector("input, select, textarea"));
  });

  it("keeps an id the control already has", async () => {
    await render(<Field label="Name"><input id="mine" /></Field>);
    expect(node.querySelector("label")!.htmlFor).toBe("mine");
    expect(node.querySelector("input")!.id).toBe("mine");
  });

  it("keeps the control in place when another control appears", async () => {
    const ui = (extra: boolean) => (
      <TooltipProvider><Field label="Name"><input data-first="" />{extra ? <input data-second="" /> : null}</Field></TooltipProvider>
    );
    await render(null);
    await act(async () => root!.render(ui(false)));
    const first = node.querySelector("[data-first]");
    await act(async () => root!.render(ui(true)));
    expect(node.querySelector("[data-first]")).toBe(first);
  });

  it("gives help buttons a name", async () => {
    await render(<HintIcon text="Shown to people." />);
    expect(node.querySelector("button")!.getAttribute("aria-label")).toBe("Shown to people.");
  });
});

describe("text contrast", () => {
  type Rgb = number[];
  const rgb = (hex: string): Rgb => [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16));
  const mix = (a: Rgb, b: Rgb, share: number): Rgb => a.map((v, i) => v * share + b[i]! * (1 - share));
  const luminance = (color: Rgb) => color
    .map((v) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i]!, 0);
  const ratio = (a: Rgb, b: Rgb) => {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi! + 0.05) / (lo! + 0.05);
  };
  const block = (selector: string) => {
    const start = css.indexOf(`\n${selector} {`);
    expect(start, selector).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf("\n}", start));
  };
  const token = (body: string, name: string) => new RegExp(`--${name}: (#[0-9a-f]{6});`).exec(body)![1]!;

  it.each([".coordinator-workspace", ".dark .coordinator-workspace"])("keeps secondary text readable in %s", (selector) => {
    const body = block(selector);
    const text = rgb(token(body, "muted-foreground"));
    for (const surface of ["background", "card", "sidebar", "sidebar-accent", "muted", "accent"])
      expect(ratio(text, rgb(token(body, surface))), surface).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps every status chip readable in light mode", () => {
    const share = Number(/color: color-mix\(in srgb, var\(--sc\) (\d+)%, black\)/.exec(block(".status-chip"))![1]) / 100;
    const hues = [...css.matchAll(/--status-(?:agent|task)-[a-z-]+: (#[0-9a-f]{6});/g)].map((m) => m[1]!);
    expect(hues.length).toBeGreaterThan(5);
    for (const hue of hues)
      expect(ratio(mix(rgb(hue), [0, 0, 0], share), mix(rgb(hue), [255, 255, 255], 0.15)), hue).toBeGreaterThanOrEqual(4.5);
  });

  it("does not fade navigation group labels", () => {
    expect(css).not.toMatch(/color: color-mix\(in oklab, var\(--muted-foreground\) 60%, transparent\)/);
  });

  it("has a readable floor for every faded secondary text class in use", () => {
    for (const step of [40, 50, 60, 65, 70, 75, 80, 90])
      expect(css, `text-muted-foreground/${step}`).toContain(`.text-muted-foreground\\/${step}`);
  });
});
