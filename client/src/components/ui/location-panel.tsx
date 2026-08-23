import { X } from "lucide-react";
import { Button } from "./button";
import { authenticatedFetch } from "@/lib/auth";
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
  signalStrength?: string;
  ipAddress?: string;
  internetProvider?: string;
  timezone?: string;
  localTime?: string;
  altitude?: string;
  district?: string;
  nearbyLandmarks?: string[];
  activeUsers?: number;
  coverageAreas?: number;
  responseTime?: string;
  regions?: Array<{ name: string; coverage: number }>;
}

export default function LocationPanel({ isOpen, onClose }: LocationPanelProps) {
  useScrollLock(isOpen);
  const { selectedCountry } = useCountry();
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [liveLocation, setLiveLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<number>(0);
  const sessionIdRef = useRef<string>(
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  );

  // Send heartbeat to track active users
  useEffect(() => {
    const sendHeartbeat = async () => {
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
          : { latitude: 0, longitude: 0 },
      altitude:
        coords?.altitude != null
          ? `${Math.round(coords.altitude * 3.28084)} ft`
          : "N/A",
      wifiProvider: ipData.org || "Unknown Provider",
      networkType:
        (navigator as any).connection?.effectiveType?.toUpperCase() ||
        "Unknown",
      signalStrength: "Good",
      ipAddress: ipData.ip || "N/A",
      internetProvider: ipData.org || "Unknown ISP",
      timezone: timezoneString,
      localTime: timeString,
      nearbyLandmarks: [
        `${ipData.city || "Local"} City Center`,
        `${ipData.region || "Regional"} Regional Office`,
        "Nearby Shopping District",
        "Public Transport Hub",
        "Local Business District",
      ],
      activeUsers: activeUsers,
      coverageAreas: Math.floor(Math.random() * 20) + 80,
      responseTime: `${Math.floor(Math.random() * 20) + 5}ms`,
      regions: [
        { name: "North", coverage: Math.floor(Math.random() * 20) + 75 },
        { name: "East", coverage: Math.floor(Math.random() * 20) + 75 },
        { name: "South", coverage: Math.floor(Math.random() * 20) + 75 },
        { name: "West", coverage: Math.floor(Math.random() * 20) + 75 },
        { name: "Center", coverage: Math.floor(Math.random() * 20) + 80 },
      ],
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

      const lat = coords?.latitude ?? ipData.latitude ?? 0;
      const lng = coords?.longitude ?? ipData.longitude ?? 0;

      setLiveLocation({
        currentLocation: locationLabel,
        postalCode:
          ipData.postal && ipData.postal !== "Unknown" ? ipData.postal : "N/A",
        district: region || "N/A",
        coordinates: { latitude: lat, longitude: lng },
        altitude:
          coords?.altitude != null
            ? `${Math.round(coords.altitude * 3.28084)} ft`
            : "N/A",
        wifiProvider: ipData.org || "Unknown Provider",
        networkType,
        signalStrength: "Good",
        ipAddress: ipData.ip && ipData.ip !== "unknown" ? ipData.ip : "N/A",
        internetProvider: ipData.org || "Unknown ISP",
        timezone: timezoneString,
        localTime: timeString,
        nearbyLandmarks: [
          `${city || "Local"} City Center`,
          `${region || "Regional"} Office`,
          "Nearby Shopping District",
          "Public Transport Hub",
          "Local Business District",
        ],
        activeUsers,
        coverageAreas: Math.floor(Math.random() * 20) + 80,
        responseTime: `${Math.floor(Math.random() * 20) + 5}ms`,
        regions: [
          { name: "North", coverage: Math.floor(Math.random() * 20) + 75 },
          { name: "East", coverage: Math.floor(Math.random() * 20) + 75 },
          { name: "South", coverage: Math.floor(Math.random() * 20) + 75 },
          { name: "West", coverage: Math.floor(Math.random() * 20) + 75 },
          { name: "Center", coverage: Math.floor(Math.random() * 20) + 80 },
        ],
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

  // Mock data with realistic values (fallback)
  const mockLocationData: LocationData = {
    currentLocation: "Detecting location...",
    postalCode: "---",
    district: "---",
    coordinates: {
      latitude: 0,
      longitude: 0,
    },
    altitude: "---",
    wifiProvider: "Detecting...",
    networkType: "Detecting...",
    signalStrength: "---",
    ipAddress: "Detecting...",
    internetProvider: "Detecting...",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localTime: new Date().toLocaleTimeString(),
    nearbyLandmarks: [],
    activeUsers: activeUsers,
    coverageAreas: 0,
    responseTime: "---",
    regions: [
      { name: "North", coverage: 0 },
      { name: "East", coverage: 0 },
      { name: "South", coverage: 0 },
      { name: "West", coverage: 0 },
      { name: "Center", coverage: 0 },
    ],
  };

  // Use live location data if available, otherwise use mock data
  const displayData = liveLocation || mockLocationData;

  useEffect(() => {
    if (isOpen && chartRef.current) {
      const ctx = chartRef.current.getContext("2d");

      // Destroy existing chart if any
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }

      if (ctx && (window as any).Chart) {
        const regions = displayData?.regions || [
          { name: "North", coverage: 85 },
          { name: "East", coverage: 92 },
          { name: "South", coverage: 78 },
          { name: "West", coverage: 88 },
          { name: "Center", coverage: 95 },
        ];

        chartInstanceRef.current = new (window as any).Chart(ctx, {
          type: "radar",
          data: {
            labels: regions.map((r) => r.name),
            datasets: [
              {
                label: "Coverage %",
                data: regions.map((r) => r.coverage),
                borderColor: "hsl(36, 82%, 43%)",
                backgroundColor: "hsla(36, 82%, 43%, 0.2)",
                borderWidth: 2,
                pointBackgroundColor: "hsl(36, 82%, 43%)",
                pointBorderColor: "#fff",
                pointHoverBackgroundColor: "#fff",
                pointHoverBorderColor: "hsl(36, 82%, 43%)",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              r: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  stepSize: 20,
                },
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
              },
            },
            plugins: {
              legend: {
                display: false,
              },
            },
          },
        });
      }
    }

    // Cleanup on unmount
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isOpen, displayData]);

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
                    ? `${displayData.coordinates.latitude}°, ${displayData.coordinates.longitude}°`
                    : "Loading..."}
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
                <span className="text-gray-600">Signal Strength:</span>
                <span className="font-medium text-green-600">
                  {displayData?.signalStrength || "Loading..."}
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

          {/* Nearby Landmarks */}
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
            <h4 className="font-medium mb-3 text-orange-800">
              🏛️ Nearby Landmarks
            </h4>
            <div className="space-y-1">
              {displayData?.nearbyLandmarks?.map((landmark, index) => (
                <div
                  key={index}
                  className="text-sm text-gray-600 flex items-center"
                >
                  <span className="w-2 h-2 bg-orange-400 rounded-full mr-2"></span>
                  {landmark}
                </div>
              )) || (
                <div className="text-sm text-gray-500">
                  Loading landmarks...
                </div>
              )}
            </div>
          </div>

          {/* Coverage Analytics */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-3">📊 Coverage Analytics</h4>
            <div className="mb-3 h-32">
              <canvas ref={chartRef} className="w-full h-full"></canvas>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Active Users:</span>
                <span className="font-medium text-blue-600">
                  {displayData?.activeUsers?.toLocaleString() || "0"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Coverage Areas:</span>
                <span className="font-medium text-green-600">
                  {displayData?.coverageAreas || "0"}%
                </span>
              </div>
              <div className="flex justify-between">
                <span>Response Time:</span>
                <span className="font-medium text-orange-600">
                  {displayData?.responseTime || "0s"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
