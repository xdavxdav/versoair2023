import React, { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { fadeInUp } from "@/lib/animations";
import { Button } from "@/components/ui/button";
import VersoAIChat from "@/components/VersoAIChat";
import {
  Zap,
  Globe,
  Shield,
  Users,
  TrendingUp,
  ChevronRight,
  Menu,
  X,
  BarChart3,
  Cloud,
  Lock,
  Headphones,
  Rocket,
  ArrowRight,
  ExternalLink,
  CheckCircle,
  Star,
  Calendar,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Home() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [timePeriod, setTimePeriod] = useState("week");
  const [isSolarSystemPaused, setIsSolarSystemPaused] = useState(false);
  const solarSystemRef = useRef<HTMLDivElement>(null);
  const _stars: { left: string; top: string; size: number; opacity: number }[] =
    [];
  for (let i = 0; i < 120; i++) {
    _stars.push({
      left: `${Math.floor(Math.random() * 100)}%`,
      top: `${Math.floor(Math.random() * 100)}%`,
      size: Math.random() * 2 + 0.6,
      opacity: 0.2 + Math.random() * 0.9,
    });
  }
  const starPositionsRef = useRef(_stars);

  // Mapping planets to their astrological rulership signs
  const planetToSigns: Record<string, string[]> = {
    mercury: ["gemini", "virgo"],
    venus: ["taurus", "libra"],
    earth: [],
    mars: ["aries", "scorpio"],
    jupiter: ["sagittarius", "pisces"],
    saturn: ["capricorn", "aquarius"],
    uranus: ["aquarius"],
    neptune: ["pisces"],
    pluto: ["scorpio"],
  };

  // Planet definitions reused for rendering and metric correlation
  const planets = [
    {
      id: "mercury",
      color: "#94a3b8",
      delay: "0s",
      size: "16px",
      orbitRadius: "30%",
      orbitSpeed: "15s",
      angle: 0,
      name: "☿ Mercury",
      description:
        "The smallest and innermost planet. Fastest orbital period (88 Earth days).",
      orbitalPeriod: "88 days",
      mass: "3.30 × 10^23 kg",
      gravity: "3.7 m/s²",
      moons: 0,
      composition: "Rocky (silicate)",
      discovered: "Known since antiquity",
      avgTemp: "167°C (avg)",
      stats: [
        { label: "Distance:", value: "0.39 AU" },
        { label: "Radius:", value: "2,440 km" },
      ],
      mirrorHours: "01:01",
    },
    {
      id: "venus",
      color: "#f59e0b",
      delay: "0.5s",
      size: "22px",
      orbitRadius: "40%",
      orbitSpeed: "25s",
      angle: 45,
      name: "♀ Venus",
      description:
        "Earth's 'sister planet' with similar size. Hottest planet due to greenhouse effect.",
      orbitalPeriod: "225 days",
      mass: "4.87 × 10^24 kg",
      gravity: "8.87 m/s²",
      moons: 0,
      composition: "Rocky with dense CO₂ atmosphere",
      discovered: "Known since antiquity",
      avgTemp: "462°C (surface)",
      stats: [
        { label: "Distance:", value: "0.72 AU" },
        { label: "Radius:", value: "6,052 km" },
      ],
      mirrorHours: "02:02",
    },
    {
      id: "earth",
      color: "#60a5fa",
      delay: "1s",
      size: "24px",
      orbitRadius: "50%",
      orbitSpeed: "35s",
      angle: 90,
      name: "♁ Earth",
      description:
        "The only known planet with life. Stabilizes axial tilt and creates tides.",
      orbitalPeriod: "365 days",
      mass: "5.97 × 10^24 kg",
      gravity: "9.81 m/s²",
      moons: 1,
      composition: "Rocky with nitrogen-oxygen atmosphere",
      discovered: "Known since antiquity",
      avgTemp: "14°C (avg)",
      stats: [
        { label: "Distance:", value: "1 AU" },
        { label: "Radius:", value: "6,371 km" },
      ],
      mirrorHours: "03:03",
    },
    {
      id: "mars",
      color: "#f87171",
      delay: "1.5s",
      size: "20px",
      orbitRadius: "60%",
      orbitSpeed: "45s",
      angle: 135,
      name: "♂ Mars",
      description: "The 'Red Planet' with Olympus Mons and deep canyons.",
      orbitalPeriod: "687 days",
      mass: "6.42 × 10^23 kg",
      gravity: "3.71 m/s²",
      moons: 2,
      composition: "Rocky with thin CO₂ atmosphere",
      discovered: "Known since antiquity",
      avgTemp: "-63°C (avg)",
      stats: [{ label: "Distance:", value: "1.52 AU" }],
      mirrorHours: "04:04",
    },
    {
      id: "jupiter",
      color: "#fbbf24",
      delay: "2s",
      size: "48px",
      orbitRadius: "70%",
      orbitSpeed: "60s",
      angle: 180,
      name: "♃ Jupiter",
      description: "Largest planet — Great Red Spot is a centuries-long storm.",
      orbitalPeriod: "11.86 years",
      mass: "1.90 × 10^27 kg",
      gravity: "24.79 m/s²",
      moons: 95,
      composition: "Gas giant (hydrogen/helium)",
      discovered: "Known since antiquity",
      avgTemp: "-108°C (cloud tops)",
      stats: [{ label: "Distance:", value: "5.2 AU" }],
      mirrorHours: "05:05",
    },
    {
      id: "saturn",
      color: "#fde68a",
      delay: "2.5s",
      size: "44px",
      orbitRadius: "80%",
      orbitSpeed: "75s",
      angle: 225,
      name: "♄ Saturn",
      description: "Known for its spectacular rings and low density.",
      orbitalPeriod: "29.46 years",
      mass: "5.68 × 10^26 kg",
      gravity: "10.44 m/s²",
      moons: 83,
      composition: "Gas giant (hydrogen/helium) with rings",
      discovered: "Known since antiquity",
      avgTemp: "-139°C (cloud tops)",
      stats: [{ label: "Distance:", value: "9.58 AU" }],
      mirrorHours: "06:06",
    },
    {
      id: "uranus",
      color: "#22d3ee",
      delay: "3s",
      size: "34px",
      orbitRadius: "90%",
      orbitSpeed: "90s",
      angle: 270,
      name: "♅ Uranus",
      description: "Ice giant that rotates on its side.",
      orbitalPeriod: "84 years",
      mass: "8.68 × 10^25 kg",
      gravity: "8.87 m/s²",
      moons: 27,
      composition: "Ice giant (water, ammonia, methane)",
      discovered: "1781 (William Herschel)",
      avgTemp: "-197°C (cloud tops)",
      stats: [{ label: "Distance:", value: "19.2 AU" }],
      mirrorHours: "07:07",
    },
    {
      id: "neptune",
      color: "#60a5fa",
      delay: "3.5s",
      size: "32px",
      orbitRadius: "100%",
      orbitSpeed: "105s",
      angle: 315,
      name: "♆ Neptune",
      description: "Windiest planet with supersonic storms.",
      orbitalPeriod: "165 years",
      mass: "1.02 × 10^26 kg",
      gravity: "11.15 m/s²",
      moons: 14,
      composition: "Ice giant (water, ammonia, methane)",
      discovered: "1846 (Urbain Le Verrier & Johann Galle)",
      avgTemp: "-200°C (cloud tops)",
      stats: [{ label: "Distance:", value: "30.1 AU" }],
      mirrorHours: "08:08",
    },
    {
      id: "pluto",
      color: "#a78bfa",
      delay: "4s",
      size: "14px",
      orbitRadius: "115%",
      orbitSpeed: "140s",
      angle: 330,
      name: "♇ Pluto (Dwarf)",
      description: "Dwarf planet in the Kuiper belt with an icy surface.",
      orbitalPeriod: "248 years",
      mass: "1.31 × 10^22 kg",
      gravity: "0.62 m/s²",
      moons: 5,
      composition: "Icy (nitrogen, methane, carbon monoxide)",
      discovered: "1930 (Clyde Tombaugh)",
      avgTemp: "-229°C (surface)",
      stats: [{ label: "Distance:", value: "39.5 AU" }],
      mirrorHours: "09:09",
    },
  ];

  // Realistic planet surface gradients
  function getPlanetBackground(id: string, fallbackColor: string): string {
    const surfaces: Record<string, string> = {
      mercury: `
        radial-gradient(circle at 25% 25%, #c9c5bf 0%, #8a8580 30%, #5a5550 60%, #3a3530 100%),
        radial-gradient(circle at 60% 70%, rgba(90,80,70,0.6) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(200,195,190,0.3) 0%, transparent 30%)
      `,
      venus: `
        radial-gradient(circle at 30% 30%, #f5d78e 0%, #e8b84d 25%, #c8922a 50%, #a07020 80%, #705010 100%),
        radial-gradient(ellipse at 50% 50%, rgba(245,215,142,0.2) 0%, transparent 70%)
      `,
      earth: `
        radial-gradient(circle at 25% 20%, #a8d8f0 0%, #4a9fd4 15%, #2d7ab8 25%, #1a6a3a 35%, #2d8c4e 45%, #1a6a3a 55%, #2070a0 65%, #1860a0 80%, #0c3560 100%),
        radial-gradient(circle at 70% 25%, rgba(255,255,255,0.35) 0%, transparent 25%),
        radial-gradient(circle at 35% 85%, rgba(255,255,255,0.25) 0%, transparent 15%)
      `,
      mars: `
        radial-gradient(circle at 30% 30%, #e8a07a 0%, #c8704a 25%, #b05830 45%, #8a3818 65%, #602810 100%),
        radial-gradient(circle at 50% 15%, rgba(255,220,200,0.3) 0%, transparent 20%),
        radial-gradient(circle at 65% 60%, rgba(100,30,10,0.4) 0%, transparent 30%)
      `,
      jupiter: `
        radial-gradient(circle at 30% 25%, #f5dca8 0%, #e8c878 15%, #d4a850 30%, #c89848 40%, #b87838 50%, #d4a850 55%, #e8c878 65%, #c89848 75%, #a87030 100%),
        linear-gradient(0deg, transparent 0%, rgba(200,150,80,0.15) 20%, transparent 22%, transparent 35%, rgba(180,120,56,0.2) 38%, transparent 42%, transparent 55%, rgba(220,160,80,0.12) 58%, transparent 62%, transparent 78%, rgba(200,150,80,0.15) 80%, transparent 100%),
        radial-gradient(ellipse 120% 40% at 55% 65%, rgba(180,80,40,0.5) 0%, rgba(180,80,40,0.2) 40%, transparent 60%)
      `,
      saturn: `
        radial-gradient(circle at 30% 25%, #fde8a0 0%, #e8d080 20%, #d4b860 40%, #c8a850 55%, #b89840 70%, #a08030 100%),
        linear-gradient(0deg, transparent 0%, rgba(220,190,120,0.15) 25%, transparent 28%, transparent 45%, rgba(200,170,100,0.12) 48%, transparent 52%, transparent 72%, rgba(220,190,120,0.15) 75%, transparent 100%)
      `,
      uranus: `
        radial-gradient(circle at 35% 30%, #b8f0f5 0%, #80dde8 20%, #50c8d8 40%, #30b0c8 60%, #1898b0 80%, #107888 100%),
        radial-gradient(circle at 30% 25%, rgba(255,255,255,0.2) 0%, transparent 40%)
      `,
      neptune: `
        radial-gradient(circle at 30% 30%, #7090f0 0%, #5070e0 20%, #3858d0 40%, #2848b8 60%, #1838a0 80%, #0c2880 100%),
        radial-gradient(ellipse at 45% 55%, rgba(100,150,255,0.2) 0%, transparent 50%),
        radial-gradient(circle at 30% 25%, rgba(200,220,255,0.15) 0%, transparent 35%)
      `,
      pluto: `
        radial-gradient(circle at 30% 30%, #d8c8b8 0%, #b8a898 25%, #988878 50%, #786858 75%, #584838 100%),
        radial-gradient(circle at 55% 45%, rgba(200,180,160,0.3) 0%, transparent 40%)
      `,
    };
    return (
      surfaces[id] ||
      `radial-gradient(circle at 30% 30%, ${fallbackColor}, ${fallbackColor}80)`
    );
  }

  // Deterministic pseudo-metric multiplier per planet+period
  function getMetricMultiplier(planetId: string, period: string) {
    const seed = Array.from(planetId + "|" + period).reduce(
      (s, c) => s + c.charCodeAt(0),
      0,
    );
    // Map seed to 0.7 - 1.6
    const v = ((seed % 100) / 100) * (1.6 - 0.7) + 0.7;
    return Number(v.toFixed(2));
  }

  function computeDynamicForPlanet(planet: any) {
    const period = timePeriod || "week";
    const m = getMetricMultiplier(planet.id, period);
    const baseSpeed = parseFloat(String(planet.orbitSpeed)) || 40;
    // Higher metric -> faster orbit (smaller duration)
    const orbitSeconds = Math.max(4, Number((baseSpeed / m).toFixed(1)));
    const baseSize = parseFloat(String(planet.size)) || 16;
    const sizePx = Math.max(6, Math.round(baseSize * (0.8 + m * 0.5)));
    return {
      orbitSpeed: `${orbitSeconds}s`,
      size: `${sizePx}px`,
      multiplier: m,
    };
  }

  const [astrologyData, setAstrologyData] = useState<Record<string, any>>({});
  const [loadingAstrology, setLoadingAstrology] = useState<
    Record<string, boolean>
  >({});
  const [selectedPlanet, setSelectedPlanet] = useState<string | null>(null);
  const [showDebugHits, setShowDebugHits] = useState(false);

  // Refs for animation control to avoid re-initializing when pausing/resuming
  const isPausedRef = useRef(isSolarSystemPaused);
  const selectedPlanetRef = useRef<string | null>(selectedPlanet);
  const hoveringPlanetRef = useRef<string | null>(null);
  const slowFactorRef = useRef<number>(1); // current interpolated slow factor (1 = normal, 0.25 = slow)
  const slowTargetRef = useRef<number>(1);
  const timePeriodRef = useRef(timePeriod);

  // Keep refs in sync with state
  useEffect(() => {
    isPausedRef.current = isSolarSystemPaused;
  }, [isSolarSystemPaused]);

  useEffect(() => {
    timePeriodRef.current = timePeriod;
  }, [timePeriod]);

  useEffect(() => {
    selectedPlanetRef.current = selectedPlanet;
    // If a planet is selected, push to slow mode; otherwise, if hovering, keep slow
    slowTargetRef.current = selectedPlanet
      ? 0.25
      : hoveringPlanetRef.current
        ? 0.25
        : 1;
  }, [selectedPlanet]);

  function handlePlanetHoverStart(planetId: string) {
    hoveringPlanetRef.current = planetId;
    slowTargetRef.current = 0.25;
    handlePlanetHoverForAstro(planetId);
  }

  function handlePlanetHoverEnd() {
    hoveringPlanetRef.current = null;
    if (!selectedPlanetRef.current) {
      slowTargetRef.current = 1;
    }
  }

  async function fetchSignData(sign: string, force = false) {
    // If we already have data and caller did not force, skip
    if (!force && (astrologyData[sign] || loadingAstrology[sign])) return;

    setLoadingAstrology((prev) => ({ ...prev, [sign]: true }));

    try {
      const res = await fetch(
        `/api/astrology?sign=${encodeURIComponent(sign)}`,
        { method: "POST" },
      );

      const cacheHeader = res.headers.get("x-cache") || null;

      // Read body safely even for non-2xx responses
      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch (err) {
        parsed = { _raw: text };
      }

      if (!res.ok) {
        let errMsg = `Astrology API error (${res.status})`;

        if (parsed && parsed.error) {
          // Handle both string and object error responses
          if (typeof parsed.error === "string") {
            errMsg = parsed.error;
          } else if (typeof parsed.error === "object" && parsed.error.message) {
            errMsg = parsed.error.message;
          } else {
            errMsg = String(parsed.error);
          }
        }

        // If we already have stale data, keep it and attach error info for UI
        if (astrologyData[sign]) {
          setAstrologyData((prev) => ({
            ...prev,
            [sign]: {
              ...prev[sign],
              _cache: cacheHeader,
              error: errMsg,
              lastAttempt: Date.now(),
            },
          }));
        } else {
          // No data at all, show the error so UI can show retry
          setAstrologyData((prev) => ({
            ...prev,
            [sign]: {
              error: errMsg,
              status: res.status,
              _cache: cacheHeader,
              lastAttempt: Date.now(),
            },
          }));
        }

        return;
      }

      const data = parsed || {};
      setAstrologyData((prev) => ({
        ...prev,
        [sign]: { ...data, _cache: cacheHeader, fetchedAt: Date.now() },
      }));
    } catch (err: any) {
      const errMsg = err?.message || "Unable to fetch astrology info";
      setAstrologyData((prev) => ({
        ...prev,
        [sign]: { error: errMsg, lastAttempt: Date.now() },
      }));
    } finally {
      setLoadingAstrology((prev) => ({ ...prev, [sign]: false }));
    }
  }

  function handlePlanetHoverForAstro(planetId: string) {
    const signs = planetToSigns[planetId] || [];
    signs.forEach((s) => fetchSignData(s));
  }

  function handlePlanetSelect(planetId: string) {
    if (selectedPlanet === planetId) {
      setSelectedPlanet(null);
      return;
    }
    setSelectedPlanet(planetId);
    handlePlanetHoverForAstro(planetId);
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (!solarSystemRef.current) return;
      if (!solarSystemRef.current.contains(target)) {
        setSelectedPlanet(null);
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedPlanet(null);
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("touchstart", onClickOutside);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("touchstart", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Prefetch astrology data for all ruling signs on mount (staggered to avoid rate bursts)
  useEffect(() => {
    const allSigns = Array.from(new Set(Object.values(planetToSigns).flat()));
    allSigns.forEach((sign, idx) => {
      setTimeout(() => fetchSignData(sign), idx * 300);
    });
  }, []);

  useEffect(() => {
    // Matrix rain effect
    const canvasElement = document.getElementById(
      "matrix-canvas",
    ) as HTMLCanvasElement | null;
    if (!canvasElement) return;

    const ctx = canvasElement.getContext("2d");
    if (!ctx) return;

    canvasElement.width = window.innerWidth;
    canvasElement.height = window.innerHeight;

    const chars =
      "01アイウエオカキクケコサシスセソタチJoemandeithappenツテトナニヌネノハヒフヘホマミBELVISTHEBUSINESSMANムメモヤユヨラリルレロワヲン█▓▒░";
    const fontSize = 14;
    const columns = canvasElement.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    function drawMatrix() {
      if (!ctx || !canvasElement) return;
      ctx.fillStyle = "rgba(15, 23, 42, 0.05)";
      ctx.fillRect(0, 0, canvasElement.width, canvasElement.height);

      ctx.fillStyle = "#0ea5e9";
      ctx.font = fontSize + "px monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (
          drops[i] * fontSize > canvasElement.height &&
          Math.random() > 0.975
        ) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(drawMatrix, 35);

    const handleResize = () => {
      if (!canvasElement) return;
      canvasElement.width = window.innerWidth;
      canvasElement.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    // Solar System Animation (runs once on mount; uses refs to avoid reinitializing on pause/resume)
    const solarSystem = solarSystemRef.current;
    if (!solarSystem) return;

    const planets = solarSystem.querySelectorAll(".planet");
    let animationId: number | null = null;

    // Initialize planets (run only once)
    function initializePlanets() {
      const centerX = solarSystem!.offsetWidth / 2;
      const centerY = solarSystem!.offsetHeight / 2;

      planets.forEach((planet: any) => {
        const radiusPercent = parseFloat(
          getComputedStyle(planet).getPropertyValue("--orbit-radius") || "30",
        );
        const angle = parseFloat(planet.getAttribute("data-angle") || "0");
        const speed = parseFloat(planet.getAttribute("data-speed") || "15");

        planet.dataset.radius = radiusPercent;
        planet.dataset.angle = (angle * Math.PI) / 180;
        planet.dataset.speed = speed;
        planet.dataset.originalSpeed = speed;
        planet.dataset.baseSize =
          getComputedStyle(planet).getPropertyValue("--size") ||
          planet.style.width ||
          "16";

        updatePlanetPosition(planet, centerX, centerY);
      });
    }

    // Update planet position
    function updatePlanetPosition(
      planet: any,
      centerX: number,
      centerY: number,
    ) {
      const radiusPercent = parseFloat(planet.dataset.radius);
      const radius = (radiusPercent / 100) * Math.min(centerX, centerY);
      let angle = parseFloat(planet.dataset.angle);
      const originalSpeed = parseFloat(planet.dataset.originalSpeed) || 15;

      // Dynamically compute speed from the current metric period
      const planetId = planet.getAttribute("data-planet-id") || "";
      const period = timePeriodRef.current || "week";
      const seed = Array.from(planetId + "|" + period).reduce(
        (s: number, c: string) => s + c.charCodeAt(0),
        0,
      );
      const multiplier = Number(
        (((seed % 100) / 100) * (1.6 - 0.7) + 0.7).toFixed(2),
      );
      const effectiveSpeed = Math.max(4, originalSpeed / multiplier);

      // Also update visual size in real-time
      const baseSizePx = parseFloat(planet.dataset.baseSize) || 16;
      const dynamicSize = Math.max(
        6,
        Math.round(baseSizePx * (0.8 + multiplier * 0.5)),
      );
      planet.style.width = `${dynamicSize}px`;
      planet.style.height = `${dynamicSize}px`;

      // Smoothly interpolate slow factor towards target (handled in animate loop)
      const slowFactor = slowFactorRef.current ?? 1;

      if (!isPausedRef.current) {
        angle += 0.016 * (60 / effectiveSpeed) * 0.3 * slowFactor;
        planet.dataset.angle = angle;
      }

      // Calculate position with slight elliptical orbit
      const ellipseFactor = 0.95;
      const x = Math.cos(angle) * radius * ellipseFactor;
      const y = Math.sin(angle) * radius;

      const posX = centerX + x;
      const posY = centerY + y;

      planet.style.left = `${posX}px`;
      planet.style.top = `${posY}px`;

      // Depth effect
      const depth = (y / radius) * 0.2 + 0.9;
      planet.style.transform = `translate(-50%, -50%) scale(${depth})`;

      // Update info card position for hover
      const infoCard = planet.querySelector(".planet-info");
      if (infoCard) {
        infoCard.style.top = `${-Math.abs(y) - 40}px`;
      }
    }

    // Main animation loop
    function animate() {
      const solarSystem = solarSystemRef.current;
      if (!solarSystem) return;

      const centerX = solarSystem!.offsetWidth / 2;
      const centerY = solarSystem!.offsetHeight / 2;

      // Interpolate slow factor for smooth transition
      slowFactorRef.current +=
        (slowTargetRef.current - slowFactorRef.current) * 0.08;

      // Always update positions so UI stays consistent (even when paused, we render current positions)
      planets.forEach((planet: any) => {
        updatePlanetPosition(planet, centerX, centerY);
      });

      animationId = requestAnimationFrame(animate);
    }

    // Initialize and start animation
    initializePlanets();
    animate();

    // Clean up
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);

  const features = [
    {
      icon: <BarChart3 className="h-8 w-8" />,
      title: "Advanced Analytics",
      description:
        "Real-time business intelligence and predictive insights across all departments",
      color: "from-blue-500 to-blue-600",
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Global Coverage",
      description:
        "Location intelligence and market analysis across 50+ countries",
      color: "from-purple-500 to-purple-600",
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Enterprise Security",
      description:
        "Military-grade encryption and compliance with global data regulations",
      color: "from-green-500 to-green-600",
    },
    {
      icon: <Cloud className="h-8 w-8" />,
      title: "Cloud Infrastructure",
      description:
        "Scalable platform with 99.9% uptime and seamless integration",
      color: "from-orange-500 to-orange-600",
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Team Collaboration",
      description:
        "Unified workspace for cross-departmental data sharing and analysis",
      color: "from-pink-500 to-pink-600",
    },
    {
      icon: <Headphones className="h-8 w-8" />,
      title: "24/7 Support",
      description: "Dedicated support team and comprehensive training programs",
      color: "from-cyan-500 to-cyan-600",
    },
  ];

  const industries = [
    {
      name: "Finance",
      color: "bg-gradient-to-r from-purple-500 to-purple-600",
      icon: "💰",
    },
    {
      name: "Healthcare",
      color: "bg-gradient-to-r from-green-500 to-green-600",
      icon: "🏥",
    },
    {
      name: "Retail",
      color: "bg-gradient-to-r from-orange-500 to-orange-600",
      icon: "🛒",
    },
    {
      name: "Manufacturing",
      color: "bg-gradient-to-r from-blue-500 to-blue-600",
      icon: "🏭",
    },
    {
      name: "Technology",
      color: "bg-gradient-to-r from-cyan-500 to-cyan-600",
      icon: "💻",
    },
    {
      name: "Logistics",
      color: "bg-gradient-to-r from-indigo-500 to-indigo-600",
      icon: "🚚",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-950 via-blue-950/50 to-slate-950 relative overflow-x-hidden">
      {/* Matrix Rain Background — disabled: caused repeated crash/error loop on mobile */}

      {/* Starfield background */}
      <div className="fixed inset-0 -z-10 pointer-events-none starfield">
        {starPositionsRef.current.map((s: any, i: number) => (
          <div
            key={`star-${i}`}
            style={{
              position: "absolute",
              left: s.left,
              top: s.top,
              width: `${s.size}px`,
              height: `${s.size}px`,
              borderRadius: "50%",
              background: "#fff",
              opacity: s.opacity,
              filter: "drop-shadow(0 0 4px #fff)",
            }}
          />
        ))}
      </div>

      {/* Time period control (metrics selector) */}

      {/* VersoAI Chat — handled globally via App.tsx */}

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-slate-950 to-purple-900/20"></div>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f172a_1px,transparent_1px),linear-gradient(to_bottom,#0f172a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20"></div>
        </div>

        <div className="relative max-w-[95vw] mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-blue-500/10 backdrop-blur-sm px-4 py-2 rounded-full mb-4">
                <Zap className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">
                  Powered by VersoAI Neural Networks
                </span>
              </div>

              <motion.h1
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
              >
                <span className="block text-white mb-4">Decode Your</span>
                <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Business Universe
                </span>
              </motion.h1>

              <motion.p
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.15 }}
                className="text-xl text-blue-200/80 max-w-2xl leading-relaxed"
              >
                Advanced analytics platform powered by VersoAI delivering
                real-time insights, predictive intelligence, and strategic
                solutions for enterprises worldwide.
              </motion.p>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <a href="/signin">
                  <Button className="bg-gradient-to-r from-blue-500 to-purple-500 px-8 py-6 text-lg hover:shadow-xl transform hover:-translate-y-1 transition-all">
                    Start Free Trial
                    <Rocket className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <a href="/demo">
                  <Button
                    variant="outline"
                    className="border-blue-500/50 text-blue-200 px-8 py-6 text-lg hover:bg-blue-500/10"
                  >
                    <ExternalLink className="mr-2 h-5 w-5" />
                    Watch Demo
                  </Button>
                </a>
              </div>

              {/* Time Period Filter */}
              <div className="flex items-center gap-2 pt-8 pb-4 flex-wrap">
                <Calendar className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-blue-200/80">Metrics:</span>
                {[
                  { value: "day", label: "Today" },
                  { value: "week", label: "Week" },
                  { value: "month", label: "Month" },
                  { value: "quarter", label: "Quarter" },
                  { value: "year", label: "Year" },
                  { value: "all", label: "All" },
                ].map((period) => (
                  <button
                    key={period.value}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setTimePeriod(period.value);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      timePeriod === period.value
                        ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                        : "bg-slate-900/30 text-blue-300 hover:bg-slate-800/50 border border-blue-500/20"
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">500+</div>
                  <div className="text-sm text-blue-400">
                    Enterprise Clients
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">
                    99.9%
                  </div>
                  <div className="text-sm text-blue-400">Platform Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">45%</div>
                  <div className="text-sm text-blue-400">Faster Decisions</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-white mb-2">24/7</div>
                  <div className="text-sm text-blue-400">AI Support</div>
                </div>
              </div>
            </div>

            {/* Visualization - Solar System — disabled: unwanted square eagle image + planets moving out of frame on mobile */}
            {false && (
            <div className="relative lg:flex justify-center min-w-0">
              <div className="relative w-full h-[420px] sm:h-[520px] md:h-[600px] flex items-center justify-center min-w-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse"></div>

                {/* Solar System Container */}
                <div
                  ref={solarSystemRef}
                  className="solar-system"
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    minWidth: "0",
                    minHeight: "320px",
                    maxWidth: "900px",
                    maxHeight: "900px",
                    margin: "0 auto",
                    perspective: "1000px",
                  }}
                >
                  {/* Real Planets with Scientific Information */}
                  {[
                    {
                      id: "mercury",
                      color: "#94a3b8",
                      delay: "0s",
                      size: "16px",
                      orbitRadius: "30%",
                      orbitSpeed: "15s",
                      angle: 0,
                      name: "☿ Mercury",
                      description:
                        "The smallest and innermost planet. Fastest orbital period (88 Earth days). Surface temperature ranges from -173°C to 427°C.",
                      stats: [
                        { label: "Distance:", value: "0.39 AU" },
                        { label: "Radius:", value: "2,440 km" },
                        { label: "Day:", value: "59 Earth days" },
                        { label: "Moons:", value: "0" },
                      ],
                    },
                    {
                      id: "venus",
                      color: "#f59e0b",
                      delay: "0.5s",
                      size: "22px",
                      orbitRadius: "40%",
                      orbitSpeed: "25s",
                      angle: 45,
                      name: "♀ Venus",
                      description:
                        "Earth's 'sister planet' with similar size. Hottest planet (462°C) due to extreme greenhouse effect. Rotates backwards.",
                      stats: [
                        { label: "Distance:", value: "0.72 AU" },
                        { label: "Radius:", value: "6,052 km" },
                        { label: "Day:", value: "243 Earth days" },
                        { label: "Moons:", value: "0" },
                      ],
                    },
                    {
                      id: "earth",
                      color: "#60a5fa",
                      delay: "1s",
                      size: "24px",
                      orbitRadius: "50%",
                      orbitSpeed: "35s",
                      angle: 90,
                      name: "♁ Earth",
                      description:
                        "The only known planet with life. 71% covered in water. Has one large moon that stabilizes axial tilt and creates tides.",
                      stats: [
                        { label: "Distance:", value: "1 AU" },
                        { label: "Radius:", value: "6,371 km" },
                        { label: "Day:", value: "24 hours" },
                        { label: "Moons:", value: "1" },
                      ],
                    },
                    {
                      id: "mars",
                      color: "#f87171",
                      delay: "1.5s",
                      size: "20px",
                      orbitRadius: "60%",
                      orbitSpeed: "45s",
                      angle: 135,
                      name: "♂ Mars",
                      description:
                        "The 'Red Planet' with iron oxide surface. Home to largest volcano (Olympus Mons) and deepest canyon in solar system.",
                      stats: [
                        { label: "Distance:", value: "1.52 AU" },
                        { label: "Radius:", value: "3,390 km" },
                        { label: "Day:", value: "24.6 hours" },
                        { label: "Moons:", value: "2" },
                      ],
                    },
                    {
                      id: "jupiter",
                      color: "#fbbf24",
                      delay: "2s",
                      size: "48px",
                      orbitRadius: "70%",
                      orbitSpeed: "60s",
                      angle: 180,
                      name: "♃ Jupiter",
                      description:
                        "Largest planet, 2.5x mass of all other planets combined. Great Red Spot is a storm larger than Earth lasting centuries.",
                      stats: [
                        { label: "Distance:", value: "5.2 AU" },
                        { label: "Radius:", value: "69,911 km" },
                        { label: "Day:", value: "9.9 hours" },
                        { label: "Moons:", value: "95+" },
                      ],
                    },
                    {
                      id: "saturn",
                      color: "#fde68a",
                      delay: "2.5s",
                      size: "44px",
                      orbitRadius: "80%",
                      orbitSpeed: "75s",
                      angle: 225,
                      name: "♄ Saturn",
                      description:
                        "Known for its spectacular ring system made of ice particles. Least dense planet - would float in water if there was an ocean big enough.",
                      stats: [
                        { label: "Distance:", value: "9.58 AU" },
                        { label: "Radius:", value: "58,232 km" },
                        { label: "Day:", value: "10.7 hours" },
                        { label: "Moons:", value: "146+" },
                      ],
                    },
                    {
                      id: "uranus",
                      color: "#22d3ee",
                      delay: "3s",
                      size: "34px",
                      orbitRadius: "90%",
                      orbitSpeed: "90s",
                      angle: 270,
                      name: "♅ Uranus",
                      description:
                        "Rotates on its side (98° tilt). Ice giant with methane giving blue-green color. Discovered in 1781 by William Herschel.",
                      stats: [
                        { label: "Distance:", value: "19.2 AU" },
                        { label: "Radius:", value: "25,362 km" },
                        { label: "Day:", value: "17.2 hours" },
                        { label: "Moons:", value: "27" },
                      ],
                    },
                    {
                      id: "neptune",
                      color: "#60a5fa",
                      delay: "3.5s",
                      size: "32px",
                      orbitRadius: "100%",
                      orbitSpeed: "105s",
                      angle: 315,
                      name: "♆ Neptune",
                      description:
                        "Windiest planet with supersonic storms up to 2,100 km/h. First predicted by mathematics before telescopic discovery.",
                      stats: [
                        { label: "Distance:", value: "30.1 AU" },
                        { label: "Radius:", value: "24,622 km" },
                        { label: "Day:", value: "16.1 hours" },
                        { label: "Moons:", value: "14" },
                      ],
                    },
                  ].map((planet) => {
                    const isActive = selectedPlanet === planet.id;
                    const dynamic = computeDynamicForPlanet(planet);
                    return (
                      <div
                        key={planet.id}
                        className="planet"
                        data-planet-id={planet.id}
                        data-active={isActive ? "true" : "false"}
                        onMouseEnter={() => handlePlanetHoverStart(planet.id)}
                        onMouseLeave={() => handlePlanetHoverEnd()}
                        onTouchStart={() => handlePlanetHoverStart(planet.id)}
                        onTouchEnd={() => handlePlanetHoverEnd()}
                        onClick={() => handlePlanetSelect(planet.id)}
                        style={
                          {
                            "--planet-color": planet.color,
                            "--delay": planet.delay,
                            "--size": dynamic.size,
                            "--orbit-radius": planet.orbitRadius,
                            "--orbit-speed": dynamic.orbitSpeed,
                            "--angle": planet.angle,
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            borderRadius: "50%",
                            pointerEvents: "auto",
                            transition:
                              "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            zIndex: planet.id === "mercury" ? 100 : 10,
                            animation: "float 4s ease-in-out infinite",
                            animationDelay: planet.delay,
                            boxShadow: `0 0 ${planet.id === "jupiter" || planet.id === "saturn" ? "30" : "15"}px ${planet.color}60, inset -8px -4px 12px rgba(0,0,0,0.5), inset 4px 4px 8px rgba(255,255,255,0.08)`,
                            width: dynamic.size,
                            height: dynamic.size,
                            background: getPlanetBackground(
                              planet.id,
                              planet.color,
                            ),
                            overflow: "visible",
                          } as React.CSSProperties
                        }
                        data-angle={planet.angle}
                        data-speed={parseFloat(String(dynamic.orbitSpeed))}
                      >
                        {/* Saturn ring */}
                        {planet.id === "saturn" && (
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              width: "220%",
                              height: "50%",
                              transform: "translate(-50%, -50%) rotateX(68deg)",
                              borderRadius: "50%",
                              background:
                                "radial-gradient(ellipse at center, transparent 38%, rgba(200,180,140,0.15) 40%, rgba(220,200,160,0.35) 45%, rgba(200,180,140,0.25) 50%, transparent 52%, transparent 54%, rgba(180,160,120,0.2) 56%, rgba(200,180,140,0.3) 60%, rgba(180,160,120,0.15) 65%, transparent 68%)",
                              pointerEvents: "none",
                              zIndex: -1,
                            }}
                          />
                        )}

                        <div
                          className="planet-hit"
                          role="button"
                          tabIndex={0}
                          aria-label={`Toggle ${planet.name} details`}
                          title={`Toggle ${planet.name} details`}
                          aria-expanded={isActive}
                          aria-controls={`planet-info-${planet.id}`}
                          onClick={() => handlePlanetSelect(planet.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handlePlanetSelect(planet.id);
                            }
                          }}
                          style={{
                            width: "clamp(44px, 12vw, 64px)",
                            height: "clamp(44px, 12vw, 64px)",
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            borderRadius: "50%",
                            background: showDebugHits
                              ? `radial-gradient(circle, ${planet.color}18 0%, ${planet.color}08 60%, transparent 100%)`
                              : "transparent",
                            border: showDebugHits
                              ? `1px dashed ${planet.color}55`
                              : "none",
                            boxShadow: showDebugHits
                              ? `0 0 12px ${planet.color}20, inset 0 0 8px ${planet.color}10`
                              : "none",
                            cursor: "pointer",
                            transition: "all 0.3s ease",
                          }}
                        />

                        <div
                          className="planet-info"
                          id={`planet-info-${planet.id}`}
                          style={{
                            position: "absolute",
                            top: "-150px",
                            left: "50%",
                            background: "rgba(10, 15, 30, 0.95)",
                            border: "1px solid rgba(255, 255, 255, 0.15)",
                            backdropFilter: "blur(10px)",
                            padding: "14px 18px",
                            borderRadius: "14px",
                            fontSize: "12px",
                            width: "clamp(160px, 48vw, 220px)",
                            maxWidth: "calc(100vw - 2rem)",
                            transition: "all 0.3s ease",
                            boxShadow:
                              "0 10px 30px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)",
                            zIndex: 1000,
                            borderBottom: `2px solid ${planet.color}`,
                            textAlign: "left",
                            pointerEvents: isActive ? "auto" : "none",
                            opacity: isActive ? 1 : 0,
                            transform: isActive
                              ? "translateX(-50%) scale(1)"
                              : "translateX(-50%) scale(0.9)",
                          }}
                        >
                          <h3
                            style={{
                              margin: "0 0 8px 0",
                              fontSize: "14px",
                              color: planet.color,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                            }}
                          >
                            {planet.name}
                          </h3>
                          <p
                            style={{
                              margin: 0,
                              color: "rgba(255, 255, 255, 0.8)",
                              lineHeight: 1.4,
                              fontSize: "11px",
                            }}
                          >
                            {planet.description}
                          </p>
                          <div
                            className="stats"
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: "6px",
                              marginTop: "8px",
                              fontSize: "10px",
                              color: "rgba(255, 255, 255, 0.6)",
                            }}
                          >
                            {planet.stats.map((stat, idx) => (
                              <div key={idx}>
                                {stat.label} {stat.value}
                              </div>
                            ))}
                          </div>

                          {/* Astrology: live zodiac data for this planet's ruling signs */}
                          <div
                            style={{
                              marginTop: "8px",
                              fontSize: "11px",
                              color: "rgba(255,255,255,0.9)",
                            }}
                          >
                            <hr
                              style={{
                                borderColor: "rgba(255,255,255,0.06)",
                                margin: "8px 0",
                              }}
                            />
                            <strong
                              style={{ display: "block", marginBottom: "6px" }}
                            >
                              Astrology (Rulerships)
                            </strong>

                            {(planetToSigns[planet.id] || []).map((sign) => (
                              <div key={sign} style={{ marginBottom: "8px" }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    textTransform: "capitalize",
                                  }}
                                >
                                  {sign}
                                </div>
                                {loadingAstrology[sign] ? (
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "6px",
                                    }}
                                  >
                                    <span
                                      className="astro-spinner"
                                      aria-hidden="true"
                                    ></span>
                                    <span
                                      style={{
                                        fontSize: "10px",
                                        color: "rgba(255,255,255,0.7)",
                                      }}
                                    >
                                      Loading...
                                    </span>
                                  </div>
                                ) : astrologyData[sign]?.error ? (
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      color: "rgba(255,155,155,0.95)",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "6px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "8px",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                      }}
                                    >
                                      <div>
                                        <strong style={{ color: "#ffd2d2" }}>
                                          {astrologyData[sign].error}
                                        </strong>
                                        {astrologyData[sign].status ? (
                                          <span
                                            style={{
                                              marginLeft: "8px",
                                              fontSize: "10px",
                                              color: "rgba(255,155,155,0.85)",
                                            }}
                                          >
                                            ({astrologyData[sign].status})
                                          </span>
                                        ) : null}
                                      </div>
                                      <div>
                                        <button
                                          onClick={() =>
                                            fetchSignData(sign, true)
                                          }
                                          style={{
                                            background: "transparent",
                                            border:
                                              "1px solid rgba(255,255,255,0.06)",
                                            color: "#fff",
                                            padding: "4px 8px",
                                            borderRadius: "6px",
                                            fontSize: "11px",
                                            cursor: "pointer",
                                          }}
                                        >
                                          Retry
                                        </button>
                                      </div>
                                    </div>

                                    {astrologyData[sign]._cache ? (
                                      <div
                                        style={{
                                          fontSize: "9px",
                                          color: "rgba(255,255,255,0.55)",
                                        }}
                                      >
                                        Cache: {astrologyData[sign]._cache}
                                      </div>
                                    ) : null}

                                    {astrologyData[sign].lastAttempt ? (
                                      <div
                                        style={{
                                          fontSize: "9px",
                                          color: "rgba(255,255,255,0.45)",
                                        }}
                                      >
                                        Last attempt:{" "}
                                        {new Date(
                                          astrologyData[sign].lastAttempt,
                                        ).toLocaleString()}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : astrologyData[sign] ? (
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      color: "rgba(255,255,255,0.75)",
                                      marginTop: "4px",
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: "6px",
                                      }}
                                    >
                                      <div
                                        style={{ flex: 1, marginRight: "8px" }}
                                      >
                                        {astrologyData[sign].description}
                                      </div>
                                      {astrologyData[sign]._cache ? (
                                        <div
                                          style={{
                                            fontSize: "10px",
                                            color: "rgba(255,255,255,0.6)",
                                            padding: "3px 6px",
                                            borderRadius: "4px",
                                            background:
                                              astrologyData[sign]._cache ===
                                              "HIT"
                                                ? "rgba(0,128,0,0.12)"
                                                : astrologyData[sign]._cache &&
                                                    astrologyData[
                                                      sign
                                                    ]._cache.includes("STALE")
                                                  ? "rgba(255,165,0,0.08)"
                                                  : "rgba(255,255,255,0.02)",
                                          }}
                                        >
                                          {astrologyData[sign]._cache}
                                        </div>
                                      ) : null}
                                    </div>

                                    <div>
                                      Compatibility:{" "}
                                      {astrologyData[sign].compatibility}
                                    </div>
                                    <div>Mood: {astrologyData[sign].mood}</div>
                                    <div>
                                      Color: {astrologyData[sign].color}
                                    </div>
                                    <div>
                                      Lucky Number:{" "}
                                      {astrologyData[sign].lucky_number}
                                    </div>
                                    <div>
                                      Lucky Time:{" "}
                                      {astrologyData[sign].lucky_time}
                                    </div>

                                    {astrologyData[sign].fetchedAt ? (
                                      <div
                                        style={{
                                          fontSize: "9px",
                                          color: "rgba(255,255,255,0.45)",
                                          marginTop: "6px",
                                        }}
                                      >
                                        Fetched:{" "}
                                        {new Date(
                                          astrologyData[sign].fetchedAt,
                                        ).toLocaleString()}
                                      </div>
                                    ) : null}
                                  </div>
                                ) : (
                                  <div
                                    style={{
                                      fontSize: "10px",
                                      color: "rgba(255,255,255,0.65)",
                                    }}
                                  >
                                    {isActive
                                      ? "Click to fetch"
                                      : "Click to load"}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Eagle at Center */}
                  <div
                    className="eagle-center"
                    style={{
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: "35%",
                      height: "35%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 20,
                    }}
                  >
                    <img
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696d106c39b00cb5bd1b5fd3/38e335f03_image.png"
                      className="eagle"
                      alt="Cosmic Eagle"
                      style={{
                        width: "90%",
                        height: "90%",
                        objectFit: "contain",
                        filter:
                          "drop-shadow(0 0 30px rgba(251, 191, 36, 0.5)) drop-shadow(0 0 60px rgba(96, 165, 250, 0.4))",
                        animation: "eaglePulse 4s ease-in-out infinite",
                      }}
                    />
                  </div>

                  {/* Controls */}
                  <div
                    className="controls"
                    style={{
                      position: "absolute",
                      bottom: "10px",
                      right: "10px",
                      zIndex: 1000,
                    }}
                  >
                    <button
                      className="control-btn"
                      onClick={() =>
                        setIsSolarSystemPaused(!isSolarSystemPaused)
                      }
                      style={{
                        background: isSolarSystemPaused
                          ? "rgba(251, 191, 36, 0.2)"
                          : "rgba(15, 20, 35, 0.8)",
                        border: `1px solid ${isSolarSystemPaused ? "#fbbf24" : "rgba(255, 255, 255, 0.1)"}`,
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        boxShadow: isSolarSystemPaused
                          ? "0 0 20px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.4), inset 0 0 20px rgba(251, 191, 36, 0.2)"
                          : "none",
                      }}
                    >
                      {isSolarSystemPaused ? "▶ Resume" : "⏸ Pause"}
                    </button>
                    <button
                      onClick={() => setShowDebugHits((v) => !v)}
                      className="control-btn"
                      style={{
                        marginLeft: 8,
                        background: showDebugHits
                          ? "rgba(99,102,241,0.12)"
                          : "rgba(15, 20, 35, 0.8)",
                        border: `1px solid ${showDebugHits ? "#6366f1" : "rgba(255,255,255,0.08)"}`,
                        color: "white",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {showDebugHits ? "Debug: On" : "Debug: Off"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section id="features" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/50 to-slate-950"></div>
        <div className="relative max-w-[95vw] mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Enterprise-Grade Features
            </h2>
            <p className="text-xl text-blue-200/80 max-w-3xl mx-auto">
              Everything you need to transform raw data into actionable business
              intelligence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-slate-900/50 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-8 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/20 transition-all duration-300"
              >
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  <div className="text-white">{feature.icon}</div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-blue-200/70">{feature.description}</p>
                <div className="mt-6 pt-6 border-t border-blue-500/20">
                  <Button
                    variant="ghost"
                    className="text-blue-400 hover:text-white p-0 h-auto"
                  >
                    Learn more <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries Section */}
      <section id="industries" className="py-20 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/30 to-slate-950/50"></div>
        <div className="relative max-w-[95vw] mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-6">
              Serving All Major Industries
            </h2>
            <p className="text-xl text-blue-200/80 max-w-3xl mx-auto">
              Tailored solutions for every sector's unique challenges
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {industries.map((industry, index) => (
              <div
                key={index}
                className={`${industry.color} rounded-xl p-6 text-center transform hover:scale-105 transition-all duration-300 hover:shadow-2xl cursor-pointer`}
              >
                <div className="text-3xl mb-3">{industry.icon}</div>
                <h3 className="font-bold text-white">{industry.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20"></div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-12">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to Transform Your Business with VersoAI?
            </h2>
            <p className="text-xl text-blue-200/80 mb-10 max-w-2xl mx-auto">
              Join thousands of enterprises already leveraging Verso Air for
              strategic advantage
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="/signin">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500 px-10 py-6 text-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all">
                  Start Free Trial
                  <Rocket className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="/contact">
                <Button
                  variant="outline"
                  className="border-blue-500 text-blue-200 px-10 py-6 text-lg hover:bg-blue-500/10"
                >
                  <Headphones className="mr-2 h-5 w-5" />
                  Contact Sales
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-500/20 pt-12 pb-8 relative">
        <div className="max-w-[95vw] mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="relative w-10 h-10">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur-sm"></div>
                  <div className="relative w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                    <div
                      className="eagle-center"
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "35%",
                        height: "35%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 20,
                      }}
                    >
                      <img
                        src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696d106c39b00cb5bd1b5fd3/38e335f03_image.png"
                        className="eagle"
                        alt="Cosmic Eagle"
                        style={{
                          width: "90%",
                          height: "90%",
                          objectFit: "contain",
                          filter:
                            "drop-shadow(0 0 30px rgba(251, 191, 36, 0.5)) drop-shadow(0 0 60px rgba(96, 165, 250, 0.4))",
                          animation: "eaglePulse 4s ease-in-out infinite",
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">VERSO AIR</h3>
                  <p className="text-sm text-blue-400">Powered by VersoAI</p>
                </div>
              </div>
              <p className="text-blue-200/70 text-sm">
                Advanced analytics and strategic intelligence powered by VersoAI
                for modern enterprises.
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Platform</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="/services"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    Services
                  </a>
                </li>
                <li>
                  <a
                    href="/industries"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    Industries
                  </a>
                </li>
                <li>
                  <a
                    href="/pricing"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="/api"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    API & Integrations
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="/about"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="/careers"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="/blog"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-3">
                <li>
                  <a
                    href="/docs"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="/help"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="/partners"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    Partners
                  </a>
                </li>
                <li>
                  <a
                    href="/status"
                    className="text-blue-200/70 hover:text-white transition-colors text-sm"
                  >
                    System Status
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-blue-500/20 text-center">
            <p className="text-blue-200/50 text-sm">
              © {new Date().getFullYear()} Verso Air. All rights reserved.
              Powered by VersoAI.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes spin-slow-reverse {
          from {
            transform: rotate(360deg);
          }
          to {
            transform: rotate(0deg);
          }
        }

        @keyframes spin-slower {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }

        @keyframes eaglePulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translate(-50%, calc(-50% - 3px));
          }
          50% {
            transform: translate(-50%, calc(-50% + 3px));
          }
        }

        @keyframes cursorGlow {
          0%,
          100% {
            box-shadow:
              0 0 0 2px rgba(255, 255, 255, 0.1),
              0 0 10px 4px rgba(96, 165, 250, 0.2),
              0 0 20px 8px rgba(147, 51, 234, 0.15),
              inset 0 0 20px rgba(255, 255, 255, 0.05);
          }
          50% {
            box-shadow:
              0 0 0 2px rgba(255, 255, 255, 0.15),
              0 0 15px 6px rgba(96, 165, 250, 0.3),
              0 0 30px 12px rgba(147, 51, 234, 0.25),
              inset 0 0 30px rgba(255, 255, 255, 0.08);
          }
        }

        /* Astronomy/astrology spinner */
        .astro-spinner {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.12);
          border-top-color: rgba(255,255,255,0.95);
          display: inline-block;
          animation: spin 1s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
              16 16,
            auto;
          transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .planet:hover {
          transform: translate(-50%, -50%) scale(1.5) !important;
          filter: brightness(1.5);
          box-shadow:
            0 0 40px currentColor,
            0 0 80px currentColor,
            inset 0 0 30px rgba(255, 255, 255, 0.2);
          z-index: 100 !important;
          animation: cursorGlow 1.5s ease-in-out infinite;
        }

        .planet:hover .planet-info {
          opacity: 1;
          transform: translateX(-50%) scale(1);
        }

        /* Solar system cursor decoration */
        .solar-system {
          position: relative;
          cursor: default; /* show cursor over the whole solar system */
        }

        .solar-system:hover {
          cursor: pointer;
        }

        .solar-system::before {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .solar-system:hover::before {
          opacity: 1;
        }

        /* Responsive adjustments */
        @media (max-width: 640px) {
          .solar-system {
            min-width: 0 !important;
            min-height: 300px !important;
            max-width: 100% !important;
            overflow: hidden;
          }

          .planet-info {
            width: 160px;
            padding: 12px 14px;
            font-size: 11px;
          }

          .planet-info h3 {
            font-size: 12px;
          }

          .planet-info p {
            font-size: 10px;
          }
        }

        @media (max-height: 500px) {
          .eagle-center {
            width: 25%;
            height: 25%;
          }

          .planet:hover .planet-info {
            top: -130px;
          }
        }
      `}</style>

      {/* VersoAI Chat Bubble - only on this page */}
      <VersoAIChat />
    </div>
  );
}
