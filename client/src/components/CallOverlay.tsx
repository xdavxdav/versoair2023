import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff, Video, VideoOff } from "lucide-react";
import type { CallView } from "@/contexts/CallContext";
import { formatCallDuration } from "@/lib/call-state";

interface Props {
  view: CallView;
  onAccept: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
}

function useStream(ref: React.RefObject<HTMLVideoElement>, stream: MediaStream | null) {
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [ref, stream]);
}

const round =
  "flex h-14 w-14 items-center justify-center rounded-full text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white";

export function CallOverlay({ view, onAccept, onDecline, onHangUp, onToggleMute, onToggleCamera }: Props) {
  const remoteRef = useRef<HTMLVideoElement>(null);
  const localRef = useRef<HTMLVideoElement>(null);
  useStream(remoteRef, view.remoteStream);
  useStream(localRef, view.localStream);

  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (view.phase !== "active") {
      setSeconds(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds((Date.now() - started) / 1000), 1000);
    return () => window.clearInterval(timer);
  }, [view.phase]);

  const showVideo = view.video && view.phase === "active" && !!view.remoteStream;
  const status =
    view.phase === "incoming"
      ? view.video
        ? "Incoming video call"
        : "Incoming voice call"
      : view.phase === "outgoing"
        ? "Calling…"
        : view.phase === "connecting"
          ? "Connecting…"
          : view.phase === "active"
            ? formatCallDuration(seconds)
            : (view.notice ?? "Call ended");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Call with ${view.peerName}`}
      className="fixed inset-0 z-[300] flex flex-col bg-slate-950 text-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
    >
      {/* The remote element also plays voice-call audio. */}
      <video
        ref={remoteRef}
        autoPlay
        playsInline
        className={showVideo ? "absolute inset-0 h-full w-full object-cover" : "hidden"}
      />
      {view.video && view.localStream && view.phase !== "ended" && !view.cameraOff && (
        <video
          ref={localRef}
          autoPlay
          playsInline
          muted
          className="absolute right-3 top-3 z-10 h-32 w-24 rounded-xl border border-white/20 bg-black object-cover [transform:scaleX(-1)]"
        />
      )}

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        {!showVideo && (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-4xl font-bold">
            {(view.peerName || "?").charAt(0).toUpperCase()}
          </div>
        )}
        <p className="text-xl font-bold drop-shadow">{view.peerName}</p>
        <p role="status" className="text-sm text-white/80 drop-shadow">
          {status}
        </p>
      </div>

      <div className="relative z-10 flex items-center justify-center gap-5 px-6 pb-8 pt-4">
        {view.phase === "incoming" ? (
          <>
            <button type="button" aria-label="Decline call" onClick={onDecline} className={`${round} bg-red-600 hover:bg-red-500`}>
              <PhoneOff className="h-6 w-6" />
            </button>
            <button type="button" aria-label="Answer call" onClick={onAccept} className={`${round} bg-emerald-600 hover:bg-emerald-500`}>
              <Phone className="h-6 w-6" />
            </button>
          </>
        ) : view.phase === "ended" ? null : (
          <>
            <button
              type="button"
              aria-label={view.muted ? "Unmute" : "Mute"}
              aria-pressed={view.muted}
              onClick={onToggleMute}
              className={`${round} ${view.muted ? "bg-white text-slate-900" : "bg-white/15 hover:bg-white/25"}`}
            >
              {view.muted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </button>
            {view.video && (
              <button
                type="button"
                aria-label={view.cameraOff ? "Turn camera on" : "Turn camera off"}
                aria-pressed={view.cameraOff}
                onClick={onToggleCamera}
                className={`${round} ${view.cameraOff ? "bg-white text-slate-900" : "bg-white/15 hover:bg-white/25"}`}
              >
                {view.cameraOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
              </button>
            )}
            <button type="button" aria-label="End call" onClick={onHangUp} className={`${round} bg-red-600 hover:bg-red-500`}>
              <PhoneOff className="h-6 w-6" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
