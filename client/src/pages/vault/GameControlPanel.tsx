/**
 * GameControlPanel — Superadmin arcade controls
 * View all arcade wallets, manage wagers, freeze/unfreeze wallets,
 * distribute rewards, monitor game activity
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Gamepad2,
  Wallet,
  Shield,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Pause,
  Play,
  DollarSign,
  Activity,
  BarChart3,
  RefreshCw,
  Search,
  Lock,
  Unlock,
} from "lucide-react";
import { SectionBlock, InfoRow } from "./vault-shared";

interface ArcadeWallet {
  userId: number;
  username: string;
  balance: number;
  totalWagered: number;
  totalWon: number;
  winRate: number;
  frozen: boolean;
  lastActivity: string;
}

// Mock data for display
const MOCK_WALLETS: ArcadeWallet[] = [
  {
    userId: 1,
    username: "joel_007",
    balance: 5000,
    totalWagered: 12500,
    totalWon: 14200,
    winRate: 62.3,
    frozen: false,
    lastActivity: "2 min ago",
  },
  {
    userId: 2,
    username: "CEO",
    balance: 2500,
    totalWagered: 8000,
    totalWon: 6500,
    winRate: 48.1,
    frozen: false,
    lastActivity: "15 min ago",
  },
  {
    userId: 3,
    username: "manager_001",
    balance: 750,
    totalWagered: 3200,
    totalWon: 2800,
    winRate: 44.5,
    frozen: false,
    lastActivity: "1h ago",
  },
];

export default function GameControlPanel() {
  const [wallets] = useState<ArcadeWallet[]>(MOCK_WALLETS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWallet, setSelectedWallet] = useState<number | null>(null);

  const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);
  const totalWagered = wallets.reduce((s, w) => s + w.totalWagered, 0);
  const totalWon = wallets.reduce((s, w) => s + w.totalWon, 0);
  const avgWinRate =
    wallets.length > 0
      ? wallets.reduce((s, w) => s + w.winRate, 0) / wallets.length
      : 0;

  const filteredWallets = wallets.filter((w) =>
    w.username.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <SectionBlock
        title="Arcade Control Panel"
        icon={<Gamepad2 className="h-4 w-4 text-amber-400" />}
      >
        <p className="text-xs text-gray-500 font-mono mb-4">
          Manage arcade wallets, wager limits, and game economy. Superuser-only
          controls.
        </p>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <StatBox
            icon={<Wallet className="w-4 h-4" />}
            label="Total Balance"
            value={`$${totalBalance.toLocaleString()}`}
            color="purple"
          />
          <StatBox
            icon={<TrendingUp className="w-4 h-4" />}
            label="Total Wagered"
            value={`$${totalWagered.toLocaleString()}`}
            color="amber"
          />
          <StatBox
            icon={<DollarSign className="w-4 h-4" />}
            label="Total Won"
            value={`$${totalWon.toLocaleString()}`}
            color="green"
          />
          <StatBox
            icon={<BarChart3 className="w-4 h-4" />}
            label="Avg Win Rate"
            value={`${avgWinRate.toFixed(1)}%`}
            color="blue"
          />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search wallets by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-gray-800 rounded-lg text-white text-sm font-mono focus:border-amber-500/50 focus:outline-none"
          />
        </div>

        {/* Wallets Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="text-left py-2 pr-4">USER</th>
                <th className="text-right py-2 px-3">BALANCE</th>
                <th className="text-right py-2 px-3">WAGERED</th>
                <th className="text-right py-2 px-3">WON</th>
                <th className="text-right py-2 px-3">WIN%</th>
                <th className="text-center py-2 px-3">STATUS</th>
                <th className="text-right py-2 pl-3">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredWallets.map((wallet) => (
                <tr
                  key={wallet.userId}
                  className={`border-b border-gray-800/50 hover:bg-gray-900/50 transition-colors ${
                    selectedWallet === wallet.userId ? "bg-purple-900/10" : ""
                  }`}
                  onClick={() => setSelectedWallet(wallet.userId)}
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Users className="w-3 h-3 text-purple-400" />
                      <span className="text-white">{wallet.username}</span>
                    </div>
                    <p className="text-gray-600 text-[10px] mt-0.5">
                      {wallet.lastActivity}
                    </p>
                  </td>
                  <td className="text-right py-3 px-3 text-purple-300 font-semibold">
                    ${wallet.balance.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-3 text-amber-300">
                    ${wallet.totalWagered.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-3 text-green-300">
                    ${wallet.totalWon.toLocaleString()}
                  </td>
                  <td className="text-right py-3 px-3">
                    <span
                      className={
                        wallet.winRate >= 50
                          ? "text-green-400"
                          : wallet.winRate >= 30
                            ? "text-amber-400"
                            : "text-red-400"
                      }
                    >
                      {wallet.winRate}%
                    </span>
                  </td>
                  <td className="text-center py-3 px-3">
                    {wallet.frozen ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-900/30 text-red-400 text-[10px]">
                        <Pause className="w-2.5 h-2.5" /> FROZEN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 text-[10px]">
                        <CheckCircle2 className="w-2.5 h-2.5" /> ACTIVE
                      </span>
                    )}
                  </td>
                  <td className="text-right py-3 pl-3">
                    <div className="flex justify-end gap-1">
                      <button
                        className="p-1.5 rounded hover:bg-amber-900/30 text-amber-400 transition-colors"
                        title={wallet.frozen ? "Unfreeze" : "Freeze"}
                      >
                        {wallet.frozen ? (
                          <Unlock className="w-3 h-3" />
                        ) : (
                          <Lock className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-purple-900/30 text-purple-400 transition-colors"
                        title="Add credits"
                      >
                        <DollarSign className="w-3 h-3" />
                      </button>
                      <button
                        className="p-1.5 rounded hover:bg-red-900/30 text-red-400 transition-colors"
                        title="Reset wallet"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Game Economy Controls */}
        <div className="mt-6 pt-4 border-t border-gray-800/50 space-y-4">
          <h4 className="text-sm font-semibold text-white font-mono flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            GAME ECONOMY CONTROLS
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <InfoRow label="Max wager per game" value="$500 VBC" />
            <InfoRow label="Min wager" value="$1 VBC" />
            <InfoRow label="House edge" value="2.5%" />
            <InfoRow label="Daily wager limit" value="$5,000 VBC per user" />
            <InfoRow label="Payout delay" value="Instant (wallet-to-wallet)" />
            <InfoRow
              label="Credit top-up"
              value="Via PayPal or Platform Wallet"
            />
          </div>
        </div>

        {/* Game Status */}
        <div className="mt-6 pt-4 border-t border-gray-800/50">
          <h4 className="text-sm font-semibold text-white font-mono flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-green-400" />
            ACTIVE GAMES
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: "Mines", status: "live", players: 12 },
              { name: "Plinko", status: "live", players: 8 },
              { name: "Tower", status: "live", players: 5 },
              { name: "Crash", status: "maintenance", players: 0 },
            ].map((game) => (
              <div
                key={game.name}
                className={`p-3 rounded-lg border ${
                  game.status === "live"
                    ? "border-green-500/20 bg-green-900/10"
                    : "border-amber-500/20 bg-amber-900/10"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-xs font-bold">
                    {game.name}
                  </span>
                  {game.status === "live" ? (
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  )}
                </div>
                <p className="text-[10px] text-gray-400">
                  {game.status === "live"
                    ? `${game.players} playing`
                    : "Maintenance"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionBlock>
    </div>
  );
}

/* ── Stat Box ── */
function StatBox({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "purple" | "amber" | "green" | "blue";
}) {
  const colors = {
    purple: "border-purple-500/20 bg-purple-900/10 text-purple-400",
    amber: "border-amber-500/20 bg-amber-900/10 text-amber-400",
    green: "border-green-500/20 bg-green-900/10 text-green-400",
    blue: "border-blue-500/20 bg-blue-900/10 text-blue-400",
  };
  return (
    <div className={`p-3 rounded-lg border ${colors[color]}`}>
      <div className="flex items-center gap-1.5 mb-1">{icon}</div>
      <p className="text-lg font-bold text-white font-mono">{value}</p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}
