import { expect, it } from "vitest";
import { brandSource } from "./vite-brand-name";

const brand = (code: string) => brandSource(code, "x.tsx");

it("renames text people read", () => {
  expect(brand('const a = <p title="Paperclip help">Sign in to Paperclip’s site</p>;')).toBe('const a = <p title="Raybeanys help">Sign in to Raybeanys’s site</p>;');
  expect(brand("const a = `Open Paperclip ${x}`;")).toBe("const a = `Open Raybeanys ${x}`;");
});

it.each([
  'import { Paperclip } from "lucide-react";',
  'const icon = <Paperclip />;',
  'if (source === "Paperclip") go();',
  'const h = { "X-Paperclip-Run": id };',
  'const u = "https://docs.Paperclip.ing/x";',
  'const s = "Paperclip Cloud";',
  'const t = "Set PAPERCLIP_API_URL for Paperclip";',
])("leaves technical uses alone: %s", (code) => expect(brand(code)).toBe(code));

it("changes only sentences in shared code", () => {
  expect(brandSource('const a = ["Paperclip", "Sign in to Paperclip"];', "x.ts", true)).toBe('const a = ["Paperclip", "Sign in to Raybeanys"];');
});
