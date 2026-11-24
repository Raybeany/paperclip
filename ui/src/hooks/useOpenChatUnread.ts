import { useEffect, useState, useSyncExternalStore } from "react";

/** Long enough for the open chat to mark a new reply read before its badge could flash. */
export const OPEN_CHAT_UNREAD_GRACE_MS = 2_500;

function subscribeToForeground(onChange: () => void) {
  window.addEventListener("focus", onChange);
  window.addEventListener("blur", onChange);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.removeEventListener("focus", onChange);
    window.removeEventListener("blur", onChange);
    document.removeEventListener("visibilitychange", onChange);
  };
}
const inForeground = () => document.visibilityState === "visible" && document.hasFocus();

/**
 * True while the unread badge of the chat on screen should wait. A reply is
 * unread for a moment before the open chat marks it read; if it is still unread
 * after the wait (the person scrolled up, or the request failed) the badge shows.
 */
export function useHoldOpenChatUnread(openChatId: string | null, unread: boolean): boolean {
  const foreground = useSyncExternalStore(subscribeToForeground, inForeground, () => false);
  const [expiredFor, setExpiredFor] = useState<string | null>(null);
  useEffect(() => {
    setExpiredFor(null);
    if (!openChatId || !unread) return;
    const timer = setTimeout(() => setExpiredFor(openChatId), OPEN_CHAT_UNREAD_GRACE_MS);
    return () => clearTimeout(timer);
  }, [openChatId, unread]);
  return openChatId !== null && foreground && expiredFor !== openChatId;
}
