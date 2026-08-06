// Messenger Launcher — floating trigger bubble that opens the Instagram-web
// style slide-in MessengerPanel. Mounted once, globally, in App.tsx.

import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth";
import MessengerPanel from "./MessengerPanel";

export default function MessengerLauncher({
  hidden = false,
}: {
  hidden?: boolean;
}) {
  const { user } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user || open) return;
    let cancelled = false;
    authenticatedFetch("/api/inbox/conversations")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data?.success) return;
        const total = (data.conversations || []).reduce(
          (sum: number, c: any) => sum + (c.unreadCount || 0),
          0,
        );
        setUnread(total);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, open]);

  useEffect(() => {
    const openMessenger = () => setOpen(true);
    window.addEventListener("messenger:open", openMessenger);
    return () => window.removeEventListener("messenger:open", openMessenger);
  }, []);

  if (!user) return null;

  return (
    <>
      {!hidden && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-[90] flex items-center justify-center w-12 h-12 rounded-full bg-purple-600/90 hover:bg-purple-500 border border-white/10 shadow-lg shadow-black/30 text-white transition-colors"
          aria-label="Messages"
        >
          <MessageCircle className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[10px] font-semibold flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      )}
      <MessengerPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
}
