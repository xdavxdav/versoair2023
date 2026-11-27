import { useEffect, useState } from "react";
import {
  fetchInboxPresence,
  type IdLike,
  type InboxFetcher,
  type InboxPresence,
} from "@/lib/inbox-api";

const REFRESH_MS = 30_000;

/** The other person's online state in a thread, refreshed while the tab is visible. */
export function useConversationPresence(
  fetcher: InboxFetcher,
  conversationId: IdLike | null,
  enabled: boolean,
): InboxPresence | null {
  const [presence, setPresence] = useState<InboxPresence | null>(null);

  useEffect(() => {
    setPresence(null);
    if (!enabled || conversationId == null) return;
    let controller = new AbortController();
    const load = () => {
      if (document.visibilityState === "hidden") return;
      controller.abort();
      controller = new AbortController();
      const current = controller;
      fetchInboxPresence(fetcher, conversationId, current.signal).then((result) => {
        if (!current.signal.aborted && result.ok) setPresence(result.data);
      });
    };
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    document.addEventListener("visibilitychange", load);
    return () => {
      controller.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", load);
    };
  }, [fetcher, conversationId, enabled]);

  return presence;
}
