import { X } from "lucide-react";
import { Button } from "./button";
import { authenticatedFetch, getAuthToken } from "@/lib/auth";
import { useEffect, useRef, useState } from "react";
import { useScrollLock } from "@/hooks/use-scroll-lock";
import { useCountry } from "@/contexts/CountryContext";

interface LocationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LocationData {
  currentLocation?: string;
  postalCode?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  wifiProvider?: string;
  networkType?: string;
  ipAddress?: string;
  internetProvider?: string;
  timezone?: string;
  localTime?: string;
  altitude?: string;
  district?: string;
  activeUsers?: number;
}

export default function LocationPanel({ isOpen, onClose }: LocationPanelProps) {
  useScrollLock(isOpen);
  const { selectedCountry } = useCountry();
  const [liveLocation, setLiveLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const sessionIdRef = useRef<string>(
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  );

  // Send heartbeat to track active users
  useEffect(() => {
    const sendHeartbeat = async () => {
      if (!getAuthToken()) return;
      try {
        const response = await authenticatedFetch("/api/users/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sessionIdRef.current }),
        });
        const data = await response.json();
        if (data.success) {
          setActiveUsers(data.activeUsers);
        }
      } catch (error) {
        console.error("Failed to send heartbeat:", error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send heartbeat every 30 seconds
    const heartbeatInterval = setInterval(sendHeartbeat, 30000);

    return () => clearInterval(heartbeatInterval);
  }, []);

  // Fetch active users count every 10 seconds when panel is open
  useEffect(() => {
    if (!isOpen) return;

    const fetchActiveUsers = async () => {
      if (!getAuthToken()) return;
      try {
        const response = await authenticatedFetch("/api/users/active-count");
        const data = await response.json();
        if (data.success) {
          setActiveUsers(data.activeUsers);
        }
      } catch (error) {
        console.error("Failed to fetch active users:", error);
      }
    };

    fetchActiveUsers();
    const interval = setInterval(fetchActiveUsers, 10000);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Disable page scrolling when panel is open — compensate for scrollbar
  // width so viewport width stays constant and GSAP pin spacers don't shift.
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [isOpen]);

  // Build location data from IP data + optional browser coords
  const buildLocationData = (
    ipData: any,
    coords?: { latitude: number; longitude: number; altitude: number | null },
  ): LocationData => {
    const now = new Date();
    const timeString = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timezoneOffset = -now.getTimezoneOffset() / 60;
    const timezoneString = `${timezone} (UTC${timezoneOffset >= 0 ? "+" : ""}${timezoneOffset})`;

    return {
      currentLocation: ipData.city
        ? `${ipData.city}, ${ipData.region_code || ipData.country_code}`
        : "Unknown",
      postalCode: ipData.postal || "N/A",
      district: ipData.region || "N/A",
      coordinates: coords
        ? { latitude: coords.latitude, longitude: coords.longitude }
        : ipData.latitude && ipData.longitude
          ? { latitude: ipData.latitude, longitude: ipData.longitude }
          : undefined,
      altitude:
        coords?.altitude != null
          ? `${Math.round(coords.altitude * 3.28084)} ft`
          : "N/A",
      wifiProvider: ipData.org || "Unknown Provider",
      networkType:
        (navigator as any).connection?.effectiveType?.toUpperCase() ||
        "Unknown",
      ipAddress: ipData.ip || "N/A",
      internetProvider: ipData.org || "Unknown ISP",
      timezone: timezoneString,
      localTime: timeString,
      activeUsers: activeUsers,
    };
  };

  // Get live location data when panel opens
  useEffect(() => {
    if (!isOpen || liveLocation) return;
    let cancelled = false;

    // Fetch IP data from multiple sources with fallbacks
    const fetchIPData = async (): Promise<Record<string, any>> => {
      const providers = [
        async () => {
          const r = await authenticatedFetch("/api/location/ip-data", {
            signal: AbortSignal.timeout(4000),
          });
          if (!r.ok) throw new Error("backend failed");
          const d = await r.json();
          if (!d?.success) throw new Error("backend no data");
          return d;
        },
        async () => {
          const r = await fetch("https://ipapi.co/json/", {
            signal: AbortSignal.timeout(4000),
          });
          if (!r.ok) throw new Error("ipapi failed");
          const d = await r.json();
          if (d?.error) throw new Error("ipapi rate limited");
          return d;
        },
        async () => {
          const r = await fetch("https://ipwho.is/", {
            signal: AbortSignal.timeout(4000),
          });
          if (!r.ok) throw new Error("ipwho failed");
          const d = await r.json();
          if (!d?.success) throw new Error("ipwho no data");
          return {
            ip: d.ip,
            city: d.city,
            region: d.region,
            region_code: d.region,
            country_code: d.country_code,
            postal: d.postal,
            latitude: d.latitude,
            longitude: d.longitude,
            org: d?.connection?.org || d?.connection?.isp || "",
          };
        },
      ];

      for (const provider of providers) {
        try {
          const data = await provider();
          if (data?.ip && data.ip !== "unknown") return data;
        } catch {
          /* try next */
        }
      }
      return {}; // all failed
    };

    // Get browser geolocation (returns coords or null)
    const getBrowserCoords = (): Promise<{
      latitude: number;
      longitude: number;
      altitude: number | null;
    } | null> =>
      new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              altitude: pos.coords.altitude,
            }),
          () => resolve(null),
          { timeout: 6000 },
        );
      });

    (async () => {
      // Run both in parallel — don't wait for IP if browser geo is fast
      const [rawIpData, coords] = await Promise.all([
        fetchIPData().catch(() => ({})),
        getBrowserCoords().catch(() => null),
      ]);
      const ipData = rawIpData as Record<string, any>;

      if (cancelled) return;

      // Build the best possible location from whatever succeeded
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const now = new Date();
      const timezoneOffset = -now.getTimezoneOffset() / 60;
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
      const timezoneString = `${timezone} (UTC${timezoneOffset >= 0 ? "+" : ""}${timezoneOffset})`;
      const networkType =
        (navigator as any).connection?.effectiveType?.toUpperCase() ||
        "Broadband";

      // Derive city name from timezone if IP data is empty
      const cityFromTimezone =
        timezone.split("/").pop()?.replace(/_/g, " ") || "";
      const regionFromTimezone = timezone.split("/")[0] || "";

      const city =
        ipData.city && ipData.city !== "Unknown"
          ? ipData.city
          : cityFromTimezone;
      const region = ipData.region || ipData.region_code || regionFromTimezone;
      const countryCode = (selectedCountry || ipData.country_code || "")
        .toString()
        .trim()
        .toUpperCase();

      const countryName = countryCode
        ? new Intl.DisplayNames([navigator.language || "en"], {
            type: "region",
          }).of(countryCode) || countryCode
        : "";

      const locationLabel = city
        ? `${city}${region ? ", " + region : ""}${countryName ? " (" + countryName + ")" : ""}`
        : cityFromTimezone || "Location detected";

      const lat = coords?.latitude ?? ipData.latitude;
      const lng = coords?.longitude ?? ipData.longitude;

      setLiveLocation({
        currentLocation: locationLabel,
        postalCode:
          ipData.postal && ipData.postal !== "Unknown" ? ipData.postal : "N/A",
        district: region || "N/A",
        coordinates:
          typeof lat === "number" && typeof lng === "number"
            ? { latitude: lat, longitude: lng }
            : undefined,
        altitude:
          coords?.altitude != null
            ? `${Math.round(coords.altitude * 3.28084)} ft`
            : "N/A",
        wifiProvider: ipData.org || "Unknown Provider",
        networkType,
        ipAddress: ipData.ip && ipData.ip !== "unknown" ? ipData.ip : "N/A",
        internetProvider: ipData.org || "Unknown ISP",
        timezone: timezoneString,
        localTime: timeString,
        activeUsers,
      });
      setLocationError(null);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, liveLocation, selectedCountry]);

  // Update time and active users every second
  useEffect(() => {
    if (!isOpen || !liveLocation) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });

      setLiveLocation((prev) =>
        prev
          ? {
              ...prev,
              localTime: timeString,
              activeUsers: activeUsers,
            }
          : null,
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, liveLocation, activeUsers]);

  // Placeholder while location is being detected
  const mockLocationData: LocationData = {
    currentLocation: "Detecting location...",
    postalCode: "---",
    district: "---",
    altitude: "---",
    wifiProvider: "Detecting...",
    networkType: "Detecting...",
    ipAddress: "Detecting...",
    internetProvider: "Detecting...",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localTime: new Date().toLocaleTimeString(),
    activeUsers: activeUsers,
  };

  // Use live location data if available, otherwise use mock data
  const displayData = liveLocation || mockLocationData;


  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[10000]"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-4 left-2 right-2 md:top-1/2 md:-translate-y-1/2 md:bottom-auto md:left-auto md:right-4 md:w-96 max-h-[calc(100dvh-2rem)] md:max-h-[90vh] overflow-y-auto overscroll-contain smooth-scroll bg-white shadow-2xl z-[10001] p-4 md:p-6 rounded-lg border transition-all duration-500 ease-in-out ${
          isOpen
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Location Services</h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Current Location Details */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-medium mb-3 text-blue-800">
              📍 Current Location
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">City:</span>
                <span className="font-medium">
                  {displayData?.currentLocation || "Loading..."}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Postal Code:</span>
                <span className="font-medium">
                  {displayData?.postalCode || "Loading..."}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">District:</span>
                <span className="font-medium">
                  {displayData?.district || "Loading..."}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Coordinates:</span>
                <span className="font-medium">
                  {displayData?.coordinates
                    ? `${displayData.coordinates.latitude.toFixed(4)}°, ${displayData.coordinates.longitude.toFixed(4)}°`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Altitude:</span>
                <span className="font-medium">
                  {displayData?.altitude || "Loading..."}
                </span>
              </div>
            </div>
          </div>

          {/* Network & WiFi Information */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h4 className="font-medium mb-3 text-green-800">
              📡 Network Details
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">WiFi Provider:</span>
                <span className="font-medium">
                  {displayData?.wifiProvider || "Loading..."}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Network Type:</span>
                <span className="font-medium">
                  {displayData?.networkType || "Loading..."}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IP Address:</span>
                <span className="font-medium font-mono text-xs">
                  {displayData?.ipAddress || "Loading..."}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ISP:</span>
                <span className="font-medium">
                  {displayData?.internetProvider || "Loading..."}
                </span>
              </div>
            </div>
          </div>

          {/* Time & Zone Information */}
          <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-medium mb-3 text-purple-800">🕒 Time & Zone</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Timezone:</span>
                <span className="font-medium">
                  {displayData?.timezone || "Loading..."}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Local Time:</span>
                <span className="font-medium">
                  {displayData?.localTime || "Loading..."}
                </span>
              </div>
            </div>
          </div>

          {(displayData.activeUsers ?? 0) > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Active users:</span>
                <span className="font-medium text-blue-700">
                  {displayData.activeUsers?.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
