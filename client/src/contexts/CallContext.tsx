import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Socket } from "socket.io-client";
import { useAuthContext } from "@/contexts/AuthContext";
import { authenticatedFetch } from "@/lib/auth";
import { releaseSocket, retainSocket } from "@/hooks/use-inbox-socket";
import { callEndMessage, type CallPhase } from "@/lib/call-state";
import { CallOverlay } from "@/components/CallOverlay";

interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export interface CallView {
  phase: CallPhase;
  peerName: string;
  video: boolean;
  muted: boolean;
  cameraOff: boolean;
  notice: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

const IDLE: CallView = {
  phase: "idle",
  peerName: "",
  video: false,
  muted: false,
  cameraOff: false,
  notice: null,
  localStream: null,
  remoteStream: null,
};

interface CallApi {
  enabled: boolean;
  busy: boolean;
  startCall: (
    conversation: { id: number | string; participantName: string },
    video: boolean,
  ) => void;
}

const CallContext = createContext<CallApi>({
  enabled: false,
  busy: false,
  startCall: () => undefined,
});

export const useCalls = () => useContext(CallContext);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const userId = user?.id ?? null;
  const [enabled, setEnabled] = useState(false);
  const [view, setView] = useState<CallView>(IDLE);

  const socketRef = useRef<Socket | null>(null);
  const iceRef = useRef<IceServer[]>([]);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localRef = useRef<MediaStream | null>(null);
  const callIdRef = useRef<string | null>(null);
  const roleRef = useRef<"caller" | "callee">("caller");
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const phaseRef = useRef<CallPhase>("idle");
  // Read inside socket handlers so they stay stable; re-subscribing mid-call would drop the socket.
  const videoRef = useRef(false);
  const clearTimer = useRef<number | undefined>(undefined);

  const update = useCallback((patch: Partial<CallView>) => {
    setView((current) => {
      const next = { ...current, ...patch };
      phaseRef.current = next.phase;
      videoRef.current = next.video;
      return next;
    });
  }, []);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    localRef.current?.getTracks().forEach((track) => track.stop());
    localRef.current = null;
    callIdRef.current = null;
    pendingIceRef.current = [];
    queueRef.current = Promise.resolve();
  }, []);

  const finish = useCallback(
    (reason: string) => {
      cleanup();
      update({ ...IDLE, phase: "ended", notice: callEndMessage(reason) });
      window.clearTimeout(clearTimer.current);
      clearTimer.current = window.setTimeout(() => {
        phaseRef.current = "idle";
        setView(IDLE);
      }, 3000);
    },
    [cleanup, update],
  );

  const signal = useCallback((data: Record<string, unknown>) => {
    if (callIdRef.current) {
      socketRef.current?.emit("call:signal", { callId: callIdRef.current, ...data });
    }
  }, []);

  const openMedia = useCallback(async (video: boolean) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video ? { facingMode: "user" } : false,
    });
    localRef.current = stream;
    return stream;
  }, []);

  const createPeer = useCallback(
    (video: boolean) => {
      const pc = new RTCPeerConnection({ iceServers: iceRef.current });
      pcRef.current = pc;
      const remote = new MediaStream();
      localRef.current?.getTracks().forEach((track) => pc.addTrack(track, localRef.current!));
      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
        update({ remoteStream: remote });
      };
      pc.onicecandidate = (event) => {
        if (event.candidate) signal({ candidate: event.candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") update({ phase: "active" });
        if (pc.connectionState === "failed") {
          socketRef.current?.emit("call:end", { callId: callIdRef.current });
          finish("failed");
        }
      };
      update({ localStream: localRef.current, video });
      return pc;
    },
    [finish, signal, update],
  );

  const flushIce = useCallback(async (pc: RTCPeerConnection) => {
    const queued = pendingIceRef.current;
    pendingIceRef.current = [];
    for (const candidate of queued) await pc.addIceCandidate(candidate).catch(() => undefined);
  }, []);

  const handleSignal = useCallback(
    async (data: { callId?: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit }) => {
      if (data.callId !== callIdRef.current) return;
      if (data.description?.type === "offer" && roleRef.current === "callee") {
        const pc = pcRef.current ?? createPeer(videoRef.current);
        await pc.setRemoteDescription(data.description);
        await flushIce(pc);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        signal({ description: pc.localDescription?.toJSON() });
      } else if (data.description?.type === "answer" && pcRef.current) {
        await pcRef.current.setRemoteDescription(data.description);
        await flushIce(pcRef.current);
      } else if (data.candidate) {
        const pc = pcRef.current;
        if (pc?.remoteDescription) await pc.addIceCandidate(data.candidate).catch(() => undefined);
        else pendingIceRef.current.push(data.candidate);
      }
    },
    [createPeer, flushIce, signal],
  );

  // Calls are on only when the server says so; the socket is held open while they are.
  useEffect(() => {
    if (userId == null) {
      setEnabled(false);
      return;
    }
    let cancelled = false;
    authenticatedFetch("/api/inbox/calls/config")
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (cancelled || !body?.data?.enabled) return;
        iceRef.current = body.data.iceServers ?? [];
        setEnabled(true);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!enabled) return;
    const socket = retainSocket();
    socketRef.current = socket;

    const onRinging = (data: { callId: string }) => {
      callIdRef.current = data.callId;
    };
    const onIncoming = async (data: { callId: string; fromName: string; video: boolean }) => {
      if (phaseRef.current !== "idle" && phaseRef.current !== "ended") {
        socket.emit("call:end", { callId: data.callId });
        return;
      }
      window.clearTimeout(clearTimer.current);
      callIdRef.current = data.callId;
      roleRef.current = "callee";
      update({ ...IDLE, phase: "incoming", peerName: data.fromName, video: data.video });
    };
    const onAccepted = (data: { callId: string }) => {
      if (data.callId !== callIdRef.current || roleRef.current !== "caller") return;
      update({ phase: "connecting" });
      queueRef.current = queueRef.current.then(async () => {
        try {
          const pc = pcRef.current ?? createPeer(videoRef.current);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          signal({ description: pc.localDescription?.toJSON() });
        } catch {
          socket.emit("call:end", { callId: callIdRef.current });
          finish("failed");
        }
      });
    };
    const onSignal = (data: Parameters<typeof handleSignal>[0]) => {
      queueRef.current = queueRef.current
        .then(() => handleSignal(data))
        .catch(() => finish("failed"));
    };
    const onEnded = (data: { callId?: string; reason?: string }) => {
      if (data.callId && data.callId !== callIdRef.current) return;
      finish(data.reason ?? "ended");
    };
    const onUnavailable = (data: { reason?: string }) => finish(data.reason ?? "error");

    socket.on("call:ringing", onRinging);
    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("call:signal", onSignal);
    socket.on("call:ended", onEnded);
    socket.on("call:unavailable", onUnavailable);
    return () => {
      socket.off("call:ringing", onRinging);
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("call:signal", onSignal);
      socket.off("call:ended", onEnded);
      socket.off("call:unavailable", onUnavailable);
      socketRef.current = null;
      releaseSocket();
    };
  }, [enabled, createPeer, finish, handleSignal, signal, update]);

  const startCall = useCallback<CallApi["startCall"]>(
    (conversation, video) => {
      if (phaseRef.current !== "idle" && phaseRef.current !== "ended") return;
      window.clearTimeout(clearTimer.current);
      roleRef.current = "caller";
      update({ ...IDLE, phase: "outgoing", peerName: conversation.participantName, video });
      openMedia(video)
        .then(() => {
          createPeer(video);
          socketRef.current?.emit("call:invite", {
            conversationId: Number(conversation.id),
            video,
          });
        })
        .catch(() => finish("permission"));
    },
    [createPeer, finish, openMedia, update],
  );

  const accept = useCallback(() => {
    const callId = callIdRef.current;
    if (!callId) return;
    update({ phase: "connecting" });
    openMedia(videoRef.current)
      .then(() => {
        createPeer(videoRef.current);
        socketRef.current?.emit("call:accept", { callId });
      })
      .catch(() => {
        socketRef.current?.emit("call:end", { callId });
        finish("permission");
      });
  }, [createPeer, finish, openMedia, update]);

  const hangUp = useCallback(() => {
    if (callIdRef.current) socketRef.current?.emit("call:end", { callId: callIdRef.current });
    finish("ended");
  }, [finish]);

  const toggleMute = useCallback(() => {
    const next = !view.muted;
    localRef.current?.getAudioTracks().forEach((track) => (track.enabled = !next));
    update({ muted: next });
  }, [update, view.muted]);

  const toggleCamera = useCallback(() => {
    const next = !view.cameraOff;
    localRef.current?.getVideoTracks().forEach((track) => (track.enabled = !next));
    update({ cameraOff: next });
  }, [update, view.cameraOff]);

  useEffect(
    () => () => {
      window.clearTimeout(clearTimer.current);
      cleanup();
    },
    [cleanup],
  );

  const api = useMemo<CallApi>(
    () => ({ enabled, busy: view.phase !== "idle" && view.phase !== "ended", startCall }),
    [enabled, startCall, view.phase],
  );

  return (
    <CallContext.Provider value={api}>
      {children}
      {view.phase !== "idle" && (
        <CallOverlay
          view={view}
          onAccept={accept}
          onDecline={hangUp}
          onHangUp={hangUp}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
        />
      )}
    </CallContext.Provider>
  );
}
