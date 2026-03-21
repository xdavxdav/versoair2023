/**
 * Shared UI components used across multiple Vault panels
 * Extracted from credentials-vault.tsx for maintainability
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle2,
  ExternalLink,
  Table2,
  Activity,
  Database,
  Users,
  Layers,
} from "lucide-react";

export function SectionBlock({
  title,
  icon,
  children,
  color = "green",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  color?: string;
}) {
  const [open, setOpen] = useState(true);
  const borderColor =
    {
      green: "border-green-900/50",
      blue: "border-blue-900/50",
      amber: "border-amber-900/50",
      red: "border-red-900/50",
      purple: "border-purple-900/50",
      cyan: "border-cyan-900/50",
    }[color] || "border-green-900/50";
  const headGrad =
    {
      green: "from-green-500 to-emerald-600",
      blue: "from-blue-500 to-cyan-600",
      amber: "from-amber-500 to-orange-600",
      red: "from-red-500 to-rose-600",
      purple: "from-purple-500 to-violet-600",
      cyan: "from-cyan-500 to-teal-600",
    }[color] || "from-green-500 to-emerald-600";

  return (
    <div
      className={`border ${borderColor} rounded-xl overflow-hidden bg-gray-950/50`}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${headGrad} flex items-center justify-center`}
          >
            {icon}
          </div>
          <span className="font-mono font-bold text-sm text-white">
            {title}
          </span>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }}>
          <ChevronDown className="h-4 w-4 text-gray-600" />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function InfoRow({
  label,
  value,
  copyable,
  mono = true,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const doCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-gray-800/30 last:border-0 gap-4">
      <span className="text-gray-500 text-[11px] font-mono flex-shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span
          className={`text-green-400/80 text-[11px] truncate ${mono ? "font-mono" : ""}`}
        >
          {value}
        </span>
        {copyable && (
          <button
            onClick={doCopy}
            className="flex-shrink-0 text-gray-600 hover:text-green-400 transition-colors"
          >
            {copied ? (
              <CheckCircle2 className="h-3 w-3 text-green-400" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function RouteLink({
  path,
  label,
  emoji,
}: {
  path: string;
  label: string;
  emoji: string;
}) {
  return (
    <a
      href={path}
      className="group flex items-center gap-2 py-1 px-2 rounded-md hover:bg-gray-800/50 transition-colors"
    >
      <span className="text-sm flex-shrink-0">{emoji}</span>
      <code className="text-[11px] text-green-500/70 font-mono flex-1 truncate group-hover:text-green-400 transition-colors">
        {path}
      </code>
      <span className="text-[10px] text-gray-600 hidden sm:block">{label}</span>
      <ExternalLink className="h-2.5 w-2.5 text-gray-700 group-hover:text-green-500 flex-shrink-0 transition-colors" />
    </a>
  );
}

export function ApiEndpoint({
  method,
  path,
  desc,
}: {
  method: string;
  path: string;
  desc: string;
}) {
  const methodColors: Record<string, string> = {
    GET: "text-emerald-400 bg-emerald-500/10",
    POST: "text-blue-400 bg-blue-500/10",
    PUT: "text-amber-400 bg-amber-500/10",
    DELETE: "text-red-400 bg-red-500/10",
    PATCH: "text-purple-400 bg-purple-500/10",
  };
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-gray-800/20 last:border-0">
      <span
        className={`text-[9px] font-mono font-black px-1.5 py-0.5 rounded ${methodColors[method] || "text-gray-400 bg-gray-500/10"} flex-shrink-0 mt-0.5`}
      >
        {method}
      </span>
      <code className="text-[11px] text-green-400/70 font-mono flex-shrink-0">
        {path}
      </code>
      <span className="text-[10px] text-gray-600 ml-auto text-right">
        {desc}
      </span>
    </div>
  );
}

export function DbTable({ name, columns }: { name: string; columns: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-800/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/30 transition-colors text-left"
      >
        <Table2 className="h-3 w-3 text-cyan-500 flex-shrink-0" />
        <code className="text-[11px] text-cyan-400 font-mono font-bold">
          {name}
        </code>
        <ChevronRight
          className={`h-3 w-3 text-gray-600 ml-auto transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-2 text-[10px] text-gray-500 font-mono leading-relaxed border-t border-gray-800/30 pt-2">
          {columns}
        </div>
      )}
    </div>
  );
}

export function LiveHealthPanel() {
  const [health, setHealth] = useState<any>(null);
  const [dbStats, setDbStats] = useState<any>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const [h, d] = await Promise.all([
          fetch("/api/health")
            .then((r) => r.json())
            .catch(() => null),
          fetch("/api/manage/database/stats")
            .then((r) => r.json())
            .catch(() => null),
        ]);
        setHealth(h);
        setDbStats(d);
      } catch {
        /* ignore */
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-3.5 w-3.5 text-green-500" />
          <span className="text-[10px] text-gray-500 font-mono">SERVER</span>
        </div>
        <div className="text-lg font-bold text-green-400 font-mono">
          {health?.status === "ok" || health?.status === "healthy"
            ? "ONLINE"
            : "..."}
        </div>
        <div className="text-[10px] text-gray-600 font-mono">Port 5003</div>
      </div>
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Database className="h-3.5 w-3.5 text-cyan-500" />
          <span className="text-[10px] text-gray-500 font-mono">DATABASE</span>
        </div>
        <div className="text-lg font-bold text-cyan-400 font-mono">
          {dbStats?.businessCount ?? "..."}
        </div>
        <div className="text-[10px] text-gray-600 font-mono">Businesses</div>
      </div>
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-3.5 w-3.5 text-purple-500" />
          <span className="text-[10px] text-gray-500 font-mono">USERS</span>
        </div>
        <div className="text-lg font-bold text-purple-400 font-mono">
          {dbStats?.userCount ?? "..."}
        </div>
        <div className="text-[10px] text-gray-600 font-mono">Registered</div>
      </div>
      <div className="bg-gray-900/60 border border-gray-800/50 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[10px] text-gray-500 font-mono">
            CATEGORIES
          </span>
        </div>
        <div className="text-lg font-bold text-amber-400 font-mono">
          {dbStats?.categoryCount ?? "..."}
        </div>
        <div className="text-[10px] text-gray-600 font-mono">Active</div>
      </div>
    </div>
  );
}
