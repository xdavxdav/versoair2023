import { useId, useMemo, useRef, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  copyText,
  draftAnnouncement,
  type AnnouncementSession,
  type CopyOutcome,
} from "@/lib/listening-session-admin-share";
import type { SessionLang } from "@/lib/listening-session-format";

const CONTACT_NAME_MAX = 60;

function AnnouncementBody({ session }: { session: AnnouncementSession }) {
  const uid = useId();
  const [lang, setLang] = useState<SessionLang>("fr");
  const [contactName, setContactName] = useState("");
  const [copied, setCopied] = useState<CopyOutcome | null>(null);
  const preview = useRef<HTMLTextAreaElement>(null);

  const draft = useMemo(
    () => draftAnnouncement(session, { lang, contactName, origin: window.location.origin }),
    [session, lang, contactName],
  );

  async function copy() {
    if (!draft.ok) return;
    const outcome = await copyText(draft.announcement.text, navigator.clipboard);
    setCopied(outcome);
    if (!outcome.ok) {
      preview.current?.focus();
      preview.current?.select();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <span id={`${uid}-lang`} className="text-sm font-medium leading-none">
            Language
          </span>
          <ToggleGroup
            type="single"
            variant="outline"
            value={lang}
            aria-labelledby={`${uid}-lang`}
            onValueChange={(value) => {
              // A single-choice group reports an empty value when the chosen item is pressed again.
              if (value === "fr" || value === "en") {
                setLang(value);
                setCopied(null);
              }
            }}
          >
            <ToggleGroupItem value="fr" aria-label="French">
              FR
            </ToggleGroupItem>
            <ToggleGroupItem value="en" aria-label="English">
              EN
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="min-w-48 flex-1 space-y-2">
          <Label htmlFor={`${uid}-contact`}>Contact name (optional)</Label>
          <Input
            id={`${uid}-contact`}
            maxLength={CONTACT_NAME_MAX}
            autoComplete="off"
            value={contactName}
            onChange={(event) => {
              setContactName(event.target.value);
              setCopied(null);
            }}
          />
        </div>
      </div>

      {draft.ok ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${uid}-preview`}>Announcement preview (read only)</Label>
            <Textarea
              id={`${uid}-preview`}
              ref={preview}
              readOnly
              rows={14}
              className="font-mono text-sm"
              value={draft.announcement.text}
            />
            <p className="text-xs text-slate-500">Link in the text: {draft.url}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" onClick={() => void copy()}>
              {copied?.ok ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
            </Button>
            <Button asChild variant="outline">
              <a href={draft.announcement.whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4" /> Open in WhatsApp
              </a>
            </Button>
          </div>
          <p
            className={`min-h-5 text-sm ${copied && !copied.ok ? "text-red-700" : "text-slate-700"}`}
            role="status"
            aria-live="polite"
          >
            {copied?.ok ? "Copied. Paste it into one WhatsApp chat." : copied?.message}
          </p>
        </>
      ) : (
        <p className="text-sm text-red-700" role="alert">
          {draft.message}
        </p>
      )}

      <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
        This is a draft, and nothing is sent from here. "Open in WhatsApp" only opens WhatsApp's share chooser with the
        text filled in, with no phone number. Send it from your own phone, one chat at a time, only to contacts who opted
        in, and never through a broadcast list. The text ends with a STOP line so people can opt out.
      </p>
    </div>
  );
}

interface AnnouncementDialogProps {
  session: AnnouncementSession | null;
  onClose: () => void;
}

export function AnnouncementDialog({ session, onClose }: AnnouncementDialogProps) {
  return (
    <Dialog open={session !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Announcement draft</DialogTitle>
          <DialogDescription>{session ? `For "${session.title}".` : "Pick a session first."}</DialogDescription>
        </DialogHeader>
        {session && <AnnouncementBody key={session.id} session={session} />}
      </DialogContent>
    </Dialog>
  );
}
