import { parseSync } from "oxc-parser";
import type { Plugin } from "vite";

const BRAND = "Raybeanys";
// The product name as a word. Headers, paths, packages, domains and the separate
// Paperclip Cloud service keep theirs.
const NAME = /(?<![-/@.\w])Paperclip(?![\w/]|-[A-Z]|\.(?:ing|ai|app|com)| Cloud)/g;

type Node = { type: string; start: number; end: number; [key: string]: unknown };

/** Replaces the product name in text people read, leaving identifiers and compared values alone. */
export function brandSource(code: string, file: string, sentencesOnly = false): string {
  if (!code.includes("Paperclip")) return code;
  const edits: [number, number, string][] = [];
  const visit = (value: unknown, skip: boolean): void => {
    if (Array.isArray(value)) { for (const item of value) visit(item, skip); return; }
    if (!value || typeof value !== "object" || typeof (value as Node).type !== "string") return;
    const node = value as Node;
    const text = node.type === "JSXText" || node.type === "TemplateElement" || (node.type === "Literal" && typeof node.value === "string");
    if (text) {
      const raw = code.slice(node.start, node.end);
      // Long or technical text is written for agents, which need the real name.
      if (skip || (sentencesOnly && !raw.trim().includes(" ")) || raw.length > 600 || /paperclipai|PAPERCLIP_/.test(raw)) return;
      const next = raw.replace(NAME, BRAND);
      if (next !== raw) edits.push([node.start, node.end, next]);
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      visit(child, skip
        || node.type.startsWith("Import") || node.type.startsWith("Export") && key === "source"
        || node.type === "BinaryExpression" && node.operator !== "+"
        || node.type === "SwitchCase" && key === "test"
        || key === "key" || node.type.startsWith("TS"));
    }
  };
  visit(parseSync(file, code).program.body, false);
  return edits.sort((a, b) => b[0] - a[0]).reduce((out, [start, end, next]) => out.slice(0, start) + next + out.slice(end), code);
}

export function brandNamePlugin(): Plugin {
  return {
    name: "raybeanys-brand-name",
    apply: "build",
    enforce: "pre",
    transform(code, id) {
      const file = id.split("?")[0];
      const shared = /\/packages\/shared\/(?:src|dist)\/.+\.[jt]s$/.test(file);
      if (!shared && !/\/ui\/src\/.+\.tsx?$/.test(file)) return null;
      // Shared code also holds values the server compares, so only its sentences change.
      const next = brandSource(code, file, shared);
      return next === code ? null : { code: next, map: null };
    },
  };
}
