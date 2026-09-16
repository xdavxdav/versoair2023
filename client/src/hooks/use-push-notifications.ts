import { useCallback, useState } from "react";
import { authenticatedFetch } from "@/lib/auth";

/** Convert a base64url VAPID public key into the Uint8Array PushManager expects. */
function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<void>;
}

/**
 * Browser/OS push notifications (separate from the always-on WebSocket layer —
 * this is what lets a user get notified even when the tab/app is closed).
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError("Push notifications are not supported on this device/browser.");
      return false;
    }
    setIsLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission was not granted.");
        return false;
      }

      const keyRes = await authenticatedFetch("/api/push/vapid-public-key");
      const { configured, publicKey } = await keyRes.json();
      if (!configured || !publicKey) {
        setError("Push notifications are not configured on the server yet.");
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const res = await authenticatedFetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });
      if (!res.ok) throw new Error("Failed to save subscription on the server");

      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      setError(err?.message || "Failed to subscribe to push notifications");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!isSupported) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await authenticatedFetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err: any) {
      setError(err?.message || "Failed to unsubscribe from push notifications");
    }
  }, [isSupported]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
  };
}
