// Publish state machine hook: idle → publishing → success | error
import { useState, useCallback } from "react";
import { getAuthToken, getCsrfToken, initializeCsrfToken } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";

type PublishState = "idle" | "publishing" | "success" | "error";

export function usePublishTrack(onSuccess?: (trackId: number) => void) {
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [publishingId, setPublishingId] = useState<number | null>(null);

  const publish = useCallback(
    async (trackId: number) => {
      setPublishingId(trackId);
      setPublishState("publishing");

      try {
        let csrf = getCsrfToken();
        if (!csrf) {
          await initializeCsrfToken();
          csrf = getCsrfToken();
        }
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (csrf) headers["x-csrf-token"] = csrf;
        const token = getAuthToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`/api/music/tracks/${trackId}/status`, {
          method: "PATCH",
          headers,
          credentials: "include",
          body: JSON.stringify({ status: "published" }),
        });
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "Publish failed");
        }

        setPublishState("success");
        toast({
          title: "Published Successfully! 🎉",
          description: "Your track is now live.",
        });
        onSuccess?.(trackId);

        // Reset after 2s so the button can be reused
        setTimeout(() => {
          setPublishState("idle");
          setPublishingId(null);
        }, 2000);
      } catch (err: any) {
        setPublishState("error");
        toast({
          title: "Publish Failed",
          description: `${err.message || "Check your connection and retry."}`,
          variant: "destructive",
        });
        setTimeout(() => {
          setPublishState("idle");
          setPublishingId(null);
        }, 3000);
      }
    },
    [onSuccess],
  );

  /** Ready-to-use button label and disabled state */
  const buttonProps = (trackId: number) => ({
    disabled: publishState === "publishing" || publishState === "success",
    label:
      publishState === "publishing" && publishingId === trackId
        ? "Publishing…"
        : publishState === "success" && publishingId === trackId
          ? "Published ✓"
          : publishState === "error" && publishingId === trackId
            ? "Retry Publish"
            : "Publish",
  });

  return { publish, publishState, publishingId, buttonProps };
}
