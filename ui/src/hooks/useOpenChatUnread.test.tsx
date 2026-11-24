// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OPEN_CHAT_UNREAD_GRACE_MS, useHoldOpenChatUnread } from "./useOpenChatUnread";

let root: Root, container: HTMLDivElement, focused = true;
function Badge({ open, unread }: { open: string | null; unread: boolean }) {
  const held = useHoldOpenChatUnread(open, unread);
  return <span>{unread && !held ? "1" : ""}</span>;
}
const render = (open: string | null, unread: boolean) => act(async () => root.render(<Badge open={open} unread={unread} />));
const badge = () => container.textContent;
const wait = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.useFakeTimers();
  focused = true;
  vi.spyOn(document, "hasFocus").mockImplementation(() => focused);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("never shows a badge for a reply that is read right away in the open chat", async () => {
  await render("agent-1", false);
  await render("agent-1", true);
  expect(badge()).toBe("");
  await wait(OPEN_CHAT_UNREAD_GRACE_MS - 1);
  expect(badge()).toBe("");
  await render("agent-1", false);
  await wait(OPEN_CHAT_UNREAD_GRACE_MS * 2);
  expect(badge()).toBe("");
});

it("shows the badge when the open chat stays unread, such as when scrolled up", async () => {
  await render("agent-1", true);
  await wait(OPEN_CHAT_UNREAD_GRACE_MS);
  expect(badge()).toBe("1");
});

it("waits again for the next reply after the first one was read", async () => {
  await render("agent-1", true);
  await wait(OPEN_CHAT_UNREAD_GRACE_MS);
  await render("agent-1", false);
  await render("agent-1", true);
  expect(badge()).toBe("");
});

it("shows the badge at once when no chat is open", async () => {
  await render(null, true);
  expect(badge()).toBe("1");
});

it("shows the badge at once when the window is not in front", async () => {
  await render("agent-1", true);
  focused = false;
  await act(async () => { window.dispatchEvent(new Event("blur")); });
  expect(badge()).toBe("1");
});

it("starts a fresh wait when another chat is opened", async () => {
  await render("agent-1", true);
  await wait(OPEN_CHAT_UNREAD_GRACE_MS);
  await render("agent-2", true);
  expect(badge()).toBe("");
});
