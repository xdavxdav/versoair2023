import { X } from "lucide-react";
import { useState } from "react";

const FEEDBACK_URL = "https://forms.gle/LPQgujfxdn1nHNw97";

export default function BetaBanner() {
  const [closed, setClosed] = useState(false);

  if (closed) return null;

  return (
    <div className="relative z-[60] flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 text-sm text-black">
      <p className="min-w-0 flex-1 text-center sm:text-left">
        <span className="font-semibold">Beta Verso Air</span>
        <span className="mx-1">-</span>
        <span>Signalez un bug ou partagez votre avis.</span>{" "}
        <a
          href={FEEDBACK_URL}
          target="_blank"
          rel="noreferrer"
          className="font-semibold underline underline-offset-2 hover:no-underline"
        >
          Feedback
        </a>
      </p>
      <button
        type="button"
        onClick={() => setClosed(true)}
        aria-label="Fermer la bannière Beta"
        title="Fermer"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-sm hover:bg-black/10"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
