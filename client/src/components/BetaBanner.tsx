import { X } from "lucide-react";
import { useEffect, useState } from "react";

const FEEDBACK_URL = "https://forms.gle/LPQgujfxdn1nHNw97";

export default function BetaBanner() {
  const [closed, setClosed] = useState(false);
  const [showBubble, setShowBubble] = useState(true);

  useEffect(() => {
    let previousScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY <= 8) {
        setShowBubble(true);
      } else if (currentScrollY > previousScrollY + 2) {
        setShowBubble(false);
      } else if (currentScrollY < previousScrollY - 2) {
        setShowBubble(true);
      }
      previousScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openFeedback = () => {
    window.open(FEEDBACK_URL, "_blank", "noopener,noreferrer");
  };

  if (closed) {
    return (
      <button
        type="button"
        onClick={() => setClosed(false)}
        className={`fixed right-3 top-3 z-[60] rounded-full border border-[#d4a74e]/60 bg-[#1a140d]/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f7d98b] shadow-[0_8px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#241b12] ${showBubble ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-3 opacity-0"}`}
        aria-label="Reopen Beta banner"
      >
        Beta
      </button>
    );
  }

  return (
    <div className="relative z-[60] overflow-hidden border-b border-[#b67b1d]/60 bg-gradient-to-r from-[#f4d17a] via-[#e9b64d] to-[#d4902d] text-[#1a140d] shadow-[0_10px_30px_rgba(164,110,22,0.18)] transition-all duration-300 ease-out">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="inline-flex items-center rounded-full border border-[#1a140d]/25 bg-[#1a140d]/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#1a140d]">
            Beta
          </span>

          <p className="min-w-0 flex-1 text-center text-[13px] font-medium sm:text-left sm:text-sm">
            <span className="font-semibold">Verso Air</span>
            <span className="mx-1.5 text-[#3a2b14]">—</span>
            <span>Report a bug or share your feedback</span>
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openFeedback}
            className="inline-flex items-center justify-center rounded-full bg-[#1a140d] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#f8d98a] shadow-sm transition-transform duration-200 hover:scale-[1.02]"
          >
            <span className="underline decoration-2 underline-offset-2 decoration-current">
              Feedback
            </span>
          </button>

          <button
            type="button"
            onClick={() => setClosed(true)}
            aria-label="Close Beta banner"
            title="Close"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#1a140d]/15 bg-white/20 text-[#1a140d] transition-colors duration-200 hover:bg-white/35"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
