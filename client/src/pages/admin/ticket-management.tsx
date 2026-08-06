import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/auth";
import { useAuth } from "@/hooks/use-auth";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { SessionTimerBar } from "@/components/ui/session-timer-bar";
import {
  GripHorizontal,
  ChevronRight,
  AlertTriangle,
  Clock,
  CheckCircle,
  Users,
  ArrowLeft,
  Shield,
  LayoutDashboard,
  Plus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  reporter: string;
  assignee_id?: number;
  team?: string;
  sla_target_hours: number;
  sla_breached: boolean;
  created_at: string;
  updated_at: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

export function AdminTicketManagement() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // ── Role gate: only superuser & moderator can access TAM ──
  const userRole = (user?.role || "").toLowerCase();
  const canAccessTAM = userRole === "superuser" || userRole === "moderator";
  useEffect(() => {
    if (user && !canAccessTAM) {
      navigate("/tickets");
    }
  }, [user, canAccessTAM, navigate]);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateUserDialog, setShowCreateUserDialog] = useState(false);
  const [newUserData, setNewUserData] = useState({
    username: "",
    email: "",
    password: "",
    role: "admin",
  });

  // Check if user has active admin session
  const hasActiveAdminSession = (() => {
    const savedAccessTime = localStorage.getItem("adminAccessTime");
    if (!savedAccessTime) return false;

    const accessTime = parseInt(savedAccessTime);
    const now = new Date().getTime();
    const sessionDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    return now - accessTime <= sessionDuration;
  })();

  // Session timer
  const isAdminAuthenticated = user?.role === "admin";
  const {
    sessionTimeLeft,
    sessionProgress,
    isSessionCritical,
    isSessionLow,
    handleExtendSession,
    formatTimeLeft,
  } = useSessionTimer(isAdminAuthenticated);

  // Fetch all tickets
  const { data: tickets = [], isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/tickets");
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });

  // Fetch users for assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/users");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Assign ticket mutation
  const assignMutation = useMutation({
    mutationFn: async ({
      ticketId,
      assigneeId,
    }: {
      ticketId: number;
      assigneeId: number;
    }) => {
      const res = await authenticatedFetch(`/api/tickets/${ticketId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId }),
      });
      if (!res.ok) throw new Error("Failed to assign ticket");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });

  // Update ticket status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      ticketId,
      status,
    }: {
      ticketId: number;
      status: string;
    }) => {
      const res = await authenticatedFetch(`/api/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update ticket");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-tickets"] });
    },
  });

  // Create new user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: typeof newUserData) => {
      const res = await authenticatedFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      if (!res.ok) throw new Error("Failed to create user");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowCreateUserDialog(false);
      setNewUserData({ username: "", email: "", password: "", role: "admin" });
    },
  });

  // Group tickets by status
  const ticketsByStatus = {
    open: tickets.filter((t) => t.status === "open"),
    "in-progress": tickets.filter((t) => t.status === "in-progress"),
    resolved: tickets.filter((t) => t.status === "resolved"),
    closed: tickets.filter((t) => t.status === "closed"),
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
      high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
      medium:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    };
    return colors[priority] || colors["medium"];
  };

  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { label: string; color: string }> = {
      "music-request": {
        label: "🎤 Music",
        color:
          "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      },
      "job-request": {
        label: "💼 Job",
        color:
          "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      },
      blog: {
        label: "📝 Blog",
        color:
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
      },
      marketplace: {
        label: "🛒 Marketplace",
        color:
          "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      },
      support: {
        label: "🎧 Support",
        color:
          "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
      },
      general: {
        label: "📋 General",
        color:
          "bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300",
      },
    };
    return (
      badges[category] || {
        label: category,
        color:
          "bg-gray-100 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300",
      }
    );
  };

  const calculateSLAPercentage = (createdAt: string, targetHours: number) => {
    const elapsed =
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return Math.min(Math.round((elapsed / targetHours) * 100), 100);
  };

  const getSLAColor = (percentage: number, breached: boolean) => {
    if (breached) return "text-red-600 dark:text-red-400";
    if (percentage >= 80) return "text-orange-600 dark:text-orange-400";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  const getAssigneeInfo = (assigneeId?: number) => {
    if (!assigneeId) return "Unassigned";
    const user = users.find((u) => u.id === assigneeId);
    return user?.username || "Unknown";
  };

  if (ticketsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navigation Bar - Right under Navbar */}
      <div className="sticky top-16 z-40 bg-white dark:bg-slate-800 border-b dark:border-slate-700 px-4 sm:px-8 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Identity indicator */}
          <div className="flex items-center gap-2 min-w-0">
            {user?.role === "admin" ||
            user?.role === "superuser" ||
            user?.role === "moderator" ? (
              <>
                <Shield className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400 truncate">
                  GeoAdmin
                  {user?.name
                    ? ` · ${user.name}`
                    : user?.email
                      ? ` · ${user.email}`
                      : ""}
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  Full Access
                </span>
              </>
            ) : (
              <>
                <Users className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {user?.name || user?.email || "Subscriber"}
                </span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {hasActiveAdminSession && (
              <Button
                onClick={() => navigate("/tickets")}
                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-700 dark:hover:bg-indigo-800 gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Tickets
              </Button>
            )}
            <Button
              onClick={() =>
                window.history.length > 1
                  ? window.history.back()
                  : navigate("/geo-admin/dashboard")
              }
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-8">
        {/* Session Timer Bar */}
        {isAdminAuthenticated && (
          <SessionTimerBar
            sessionTimeLeft={sessionTimeLeft}
            sessionProgress={sessionProgress}
            isSessionCritical={isSessionCritical}
            isSessionLow={isSessionLow}
            onExtendSession={handleExtendSession}
            formatTimeLeft={formatTimeLeft}
          />
        )}
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Ticket Assignment Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
            Manage and assign tickets to team members • Session:{" "}
            {formatTimeLeft(sessionTimeLeft)}
          </p>
        </div>

        {/* Main Kanban Board */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
          {/* Unassigned Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Unassigned
              </h2>
              <span className="ml-auto text-sm font-semibold text-gray-600 dark:text-gray-400">
                {ticketsByStatus.open.filter((t) => !t.assignee_id).length}
              </span>
            </div>

            <div className="space-y-3 bg-slate-200 dark:bg-slate-700/50 p-4 rounded-lg min-h-96">
              {ticketsByStatus.open
                .filter((t) => !t.assignee_id)
                .map((ticket) => {
                  const slaPercent = calculateSLAPercentage(
                    ticket.created_at,
                    ticket.sla_target_hours,
                  );
                  return (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      slaPercent={slaPercent}
                      onAssign={(assigneeId) =>
                        assignMutation.mutate({
                          ticketId: ticket.id,
                          assigneeId,
                        })
                      }
                      assignees={users}
                      getPriorityColor={getPriorityColor}
                      getSLAColor={getSLAColor}
                      getCategoryBadge={getCategoryBadge}
                    />
                  );
                })}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                In Progress
              </h2>
              <span className="ml-auto text-sm font-semibold text-gray-600 dark:text-gray-400">
                {ticketsByStatus["in-progress"].length}
              </span>
            </div>

            <div className="space-y-3 bg-slate-200 dark:bg-slate-700/50 p-4 rounded-lg min-h-96">
              {ticketsByStatus["in-progress"].map((ticket) => {
                const slaPercent = calculateSLAPercentage(
                  ticket.created_at,
                  ticket.sla_target_hours,
                );
                return (
                  <TicketCard
                    key={ticket.id}
                    ticket={ticket}
                    slaPercent={slaPercent}
                    onAssign={(assigneeId) =>
                      assignMutation.mutate({ ticketId: ticket.id, assigneeId })
                    }
                    assignees={users}
                    getPriorityColor={getPriorityColor}
                    getSLAColor={getSLAColor}
                    getCategoryBadge={getCategoryBadge}
                  />
                );
              })}
            </div>
          </div>

          {/* Resolved Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Resolved
              </h2>
              <span className="ml-auto text-sm font-semibold text-gray-600 dark:text-gray-400">
                {ticketsByStatus.resolved.length}
              </span>
            </div>

            <div className="space-y-3 bg-slate-200 dark:bg-slate-700/50 p-4 rounded-lg min-h-96">
              {ticketsByStatus.resolved.map((ticket) => {
                const slaPercent = calculateSLAPercentage(
                  ticket.created_at,
                  ticket.sla_target_hours,
                );
                return (
                  <div
                    key={ticket.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 opacity-75"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                      {ticket.title}
                    </h3>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Closed Column */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Closed
              </h2>
              <span className="ml-auto text-sm font-semibold text-gray-600 dark:text-gray-400">
                {ticketsByStatus.closed.length}
              </span>
            </div>

            <div className="space-y-3 bg-slate-200 dark:bg-slate-700/50 p-4 rounded-lg min-h-96">
              {ticketsByStatus.closed.map((ticket) => {
                return (
                  <div
                    key={ticket.id}
                    className="p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 opacity-50"
                  >
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">
                      {ticket.title}
                    </h3>
                    <Badge className={getPriorityColor(ticket.priority)}>
                      {ticket.priority}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Team Members Sidebar */}
        <div className="mt-8 grid grid-cols-4 gap-4">
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="dark:text-white flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                {users.length} members
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {users
                  .filter((u) => ["admin", "manager"].includes(u.role))
                  .map((user) => {
                    const assignedCount = tickets.filter(
                      (t) => t.assignee_id === user.id,
                    ).length;
                    return (
                      <div
                        key={user.id}
                        className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border dark:border-slate-600"
                      >
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {user.username}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {user.email}
                        </p>
                        <Badge className="mt-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          {assignedCount} tickets
                        </Badge>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* SLA Breaches Card */}
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardHeader>
              <CardTitle className="dark:text-white flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                SLA Breaches
              </CardTitle>
              <CardDescription className="dark:text-gray-400">
                Critical tickets at risk
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tickets
                  .filter((t) => t.sla_breached)
                  .slice(0, 5)
                  .map((ticket) => (
                    <div
                      key={ticket.id}
                      className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50"
                    >
                      <p className="font-semibold text-red-900 dark:text-red-400 text-sm line-clamp-2">
                        {ticket.title}
                      </p>
                      <Badge className="mt-2 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                        BREACHED
                      </Badge>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog
        open={showCreateUserDialog}
        onOpenChange={setShowCreateUserDialog}
      >
        <DialogContent className="dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">
              Add New Employee
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Create a new Versoair employee account for team management
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="dark:text-gray-300">
                Username
              </Label>
              <Input
                id="username"
                placeholder="john.doe"
                value={newUserData.username}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, username: e.target.value })
                }
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="dark:text-gray-300">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="john@versoair.com"
                value={newUserData.email}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, email: e.target.value })
                }
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="dark:text-gray-300">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={newUserData.password}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, password: e.target.value })
                }
                className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="dark:text-gray-300">
                Role
              </Label>
              <select
                id="role"
                value={newUserData.role}
                onChange={(e) =>
                  setNewUserData({ ...newUserData, role: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="employee">Employee</option>
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateUserDialog(false)}
              className="dark:border-slate-600 dark:text-gray-300 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={() => createUserMutation.mutate(newUserData)}
              disabled={createUserMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              {createUserMutation.isPending ? "Creating..." : "Create Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button to Create User */}
      <Button
        onClick={() => setShowCreateUserDialog(true)}
        className="fixed bottom-8 right-8 rounded-full p-4 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 shadow-lg"
        size="lg"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
}

function TicketCard({
  ticket,
  slaPercent,
  onAssign,
  assignees,
  getPriorityColor,
  getSLAColor,
  getCategoryBadge,
}: {
  ticket: Ticket;
  slaPercent: number;
  onAssign: (assigneeId: number) => void;
  assignees: User[];
  getPriorityColor: (priority: string) => string;
  getSLAColor: (percentage: number, breached: boolean) => string;
  getCategoryBadge: (category: string) => { label: string; color: string };
}) {
  return (
    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700 shadow-sm hover:shadow-md transition">
      <div className="flex items-start gap-2 mb-2">
        <GripHorizontal className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm flex-1 line-clamp-2">
          {ticket.title}
        </h3>
      </div>

      <div className="mb-3 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <Badge className={getPriorityColor(ticket.priority)}>
            {ticket.priority}
          </Badge>
          {ticket.category &&
            (() => {
              const cat = getCategoryBadge(ticket.category);
              return <Badge className={cat.color}>{cat.label}</Badge>;
            })()}
        </div>

        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            SLA:{" "}
            <span className={getSLAColor(slaPercent, ticket.sla_breached)}>
              {slaPercent}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gradient-to-r from-green-500 to-red-500 overflow-hidden">
            <div
              className="h-full bg-white opacity-30"
              style={{ width: `${100 - slaPercent}%` }}
            />
          </div>
        </div>
      </div>

      <Select
        value={ticket.assignee_id?.toString() || "unassigned"}
        onValueChange={(value) => {
          if (value !== "unassigned") {
            onAssign(parseInt(value));
          }
        }}
      >
        <SelectTrigger className="h-8 text-xs dark:bg-slate-700 dark:border-slate-600 dark:text-white flex-1">
          <SelectValue placeholder="Assign to..." />
        </SelectTrigger>
        <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {assignees
            .filter((u) => ["admin", "manager"].includes(u.role))
            .map((user) => (
              <SelectItem key={user.id} value={user.id.toString()}>
                {user.username}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default AdminTicketManagement;
