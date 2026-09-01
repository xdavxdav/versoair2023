/**
 * 🔓 LogoutDropdown — Smart unified disconnect button.
 *
 * Detects active sessions (General, Geo Admin, Admin Dashboard, Artist Portal,
 * Blog Community) via localStorage keys. Shows a single red button that:
 *   - If only 1 session → direct disconnect (no dropdown)
 *   - If 2+ sessions → dropdown with per-portal disconnect + "Disconnect All"
 *
 * Individual disconnects remove only localStorage keys.
 * "Disconnect All" also POSTs /auth/logout to clear the HttpOnly cookie.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  LogOut,
  ChevronDown,
  Globe,
  Shield,
  Music,
  BookOpen,
  LayoutDashboard,
} from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";

type SessionId = "general" | "geoadmin" | "admin-dashboard" | "artist" | "blog";

interface ActiveSession {
  id: SessionId;
  label: string;
  icon: React.ReactNode;
  color: string;
}

function detectActiveSessions(): ActiveSession[] {
  const sessions: ActiveSession[] = [];

  // General auth (JWT token present)
  const hasToken =
    localStorage.getItem("auth_token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("verso_auth_token");
  if (hasToken) {
    sessions.push({
      id: "general",
      label: "General Account",
      icon: <Globe className="h-3.5 w-3.5" />,
      color: "text-blue-400",
    });
  }

  // Geo Admin
  if (localStorage.getItem("geoadmin_session") === "true") {
    sessions.push({
      id: "geoadmin",
      label: "Geo Admin",
      icon: <Shield className="h-3.5 w-3.5" />,
      color: "text-emerald-400",
    });
  }

  // Admin Dashboard (2FA gate)
  if (localStorage.getItem("adminAccessTime")) {
    sessions.push({
      id: "admin-dashboard",
      label: "Admin Dashboard",
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
      color: "text-purple-400",
    });
  }

  // Artist Portal
  if (
    localStorage.getItem("artist_token") ||
    localStorage.getItem("artist_profile")
  ) {
    sessions.push({
      id: "artist",
      label: "Artist Portal",
      icon: <Music className="h-3.5 w-3.5" />,
      color: "text-pink-400",
    });
  }

  // Blog Community
  if (localStorage.getItem("blog_community_auth")) {
    sessions.push({
      id: "blog",
      label: "Blog Community",
      icon: <BookOpen className="h-3.5 w-3.5" />,
      color: "text-amber-400",
    });
  }

  return sessions;
}

function disconnectSession(id: SessionId) {
  switch (id) {
    case "general":
      localStorage.removeItem("auth_token");
      localStorage.removeItem("authToken");
      localStorage.removeItem("verso_auth_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("signin_timestamp");
      break;
    case "geoadmin":
      localStorage.removeItem("geoadmin_session");
      localStorage.removeItem("geoadmin_username");
      localStorage.removeItem("geoadmin_login_time");
      localStorage.removeItem("geoadmin_session_start");
      break;
    case "admin-dashboard":
      localStorage.removeItem("adminAccessTime");
      localStorage.removeItem("adminUsername");
      break;
    case "artist":
      localStorage.removeItem("artist_token");
      localStorage.removeItem("artist_profile");
      break;
    case "blog":
      localStorage.removeItem("blog_community_auth");
      localStorage.removeItem("blog_community_user");
      break;
  }
}

interface LogoutDropdownProps {
  /** Visual variant: "red-solid" for main navbar, "red-subtle" for dark dashboards, "text" for inline menus */
  variant?: "red-solid" | "red-subtle" | "text";
  /** Override label */
  label?: string;
  /** Navigate to this path after full disconnect. Defaults to "/" */
  redirectTo?: string;
  /** Callback after any disconnect — useful for resetting local component state */
  onAfterDisconnect?: () => void;
  /** Additional CSS classes */
  className?: string;
}

export function LogoutDropdown({
  variant = "red-solid",
  label,
  redirectTo = "/",
  onAfterDisconnect,
  className = "",
}: LogoutDropdownProps) {
  const { logout } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Re-detect sessions when dropdown opens
  const refresh = useCallback(() => {
    setSessions(detectActiveSessions());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleDisconnectOne = (id: SessionId) => {
    disconnectSession(id);
    setOpen(false);
    onAfterDisconnect?.();
    // If that was the only or last session, redirect
    const remaining = detectActiveSessions();
    if (remaining.length === 0) {
      window.location.href = redirectTo;
    } else {
      setSessions(remaining);
      // Refresh current page to reflect session removal
      window.location.reload();
    }
  };

  const handleDisconnectAll = async () => {
    setOpen(false);
    await logout(); // Clears everything + POSTs /auth/logout for cookie
    onAfterDisconnect?.();
    window.location.href = redirectTo;
  };

  // If only 1 session, direct click disconnects all — no dropdown needed
  const handleClick = () => {
    const current = detectActiveSessions();
    setSessions(current);
    if (current.length <= 1) {
      handleDisconnectAll();
    } else {
      setOpen((o) => !o);
    }
  };

  // Button styles
  const baseStyles: Record<string, string> = {
    "red-solid":
      "flex items-center gap-1.5 bg-red-600 text-white px-2 md:px-3 py-2 rounded-md hover:bg-red-700 transition-colors text-xs font-medium whitespace-nowrap",
    "red-subtle":
      "flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors",
    text: "flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors cursor-pointer w-full px-2 py-1.5",
  };

  const displayLabel =
    label ?? (sessions.length > 1 ? "Disconnect" : "Déconnexion");

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={handleClick}
        className={baseStyles[variant]}
        title="Disconnect"
      >
        <LogOut className="h-3.5 w-3.5" />
        <span className="hidden sm:inline text-sm">{displayLabel}</span>
        {sessions.length > 1 && (
          <ChevronDown
            className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && sessions.length > 1 && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-slate-900/95 backdrop-blur-xl border border-white/15 rounded-xl shadow-2xl z-[999] overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 border-b border-white/10">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Active Sessions ({sessions.length})
            </p>
          </div>

          {sessions.map((s) => (
            <button
              key={s.id}
              onClick={() => handleDisconnectOne(s.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors group"
            >
              <span className={s.color}>{s.icon}</span>
              <span className="flex-1 text-xs text-slate-300 group-hover:text-white">
                {s.label}
              </span>
              <LogOut className="h-3 w-3 text-slate-500 group-hover:text-red-400 transition-colors" />
            </button>
          ))}

          <div className="border-t border-white/10">
            <button
              onClick={handleDisconnectAll}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-red-400 hover:bg-red-500/10 transition-colors text-xs font-semibold"
            >
              <LogOut className="h-3.5 w-3.5" />
              Disconnect All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default LogoutDropdown;
