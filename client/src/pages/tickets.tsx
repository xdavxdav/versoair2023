import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { authenticatedFetch } from "@/lib/auth";
import {
  Search,
  Plus,
  Filter,
  Eye,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  AlertTriangle,
  Shield,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Ticket {
  id: number;
  title: string;
  description: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  reporter: string;
  requester_email?: string;
  assignee_id?: number;
  team?: string;
  source: string;
  sla_target_hours: number;
  sla_breached: boolean;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  slaBreaches: number;
  slaCompliance: number;
  avgResolutionTime: number;
}

export function Tickets() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("all");
  const [scrollY, setScrollY] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Parallax scroll effect - simple, non-blocking
  useEffect(() => {
    const handleScroll = () => {
      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate title transformations based on scroll position
  const titleOpacityBar = Math.max(0, 1 - scrollY / 150);
  const titleOpacityBody = Math.min(1, scrollY / 150);

  // Check if user has active admin session
  const hasActiveAdminSession = (() => {
    const savedAccessTime = localStorage.getItem("adminAccessTime");
    if (!savedAccessTime) return false;

    const accessTime = parseInt(savedAccessTime);
    const now = new Date().getTime();
    const sessionDuration = 15 * 60 * 1000; // 15 minutes in milliseconds
    return now - accessTime <= sessionDuration;
  })();

  // Check if user is admin (either regular admin or geoadmin)
  const isAdmin =
    user?.role === "admin" ||
    localStorage.getItem("geoadmin_session") === "true";

  // TAM access: only superuser & moderator
  const canAccessTAM = user?.role === "superuser" || user?.role === "moderator";

  // Staff roles don't need subscriber upgrade prompts — they manage the platform
  const isStaffRole = ["superuser", "admin", "moderator"].includes(
    user?.role || "",
  );

  // Subscription Tier Permissions
  type SubscriptionTier =
    | "free"
    | "essential"
    | "verified"
    | "max"
    | "enterprise";
  // Staff always get enterprise-level access — no upgrade prompts, no limits
  const subscriptionTier: SubscriptionTier = isStaffRole
    ? "enterprise"
    : ((user?.subscriptionTier || "free") as SubscriptionTier);

  // Permission matrix based on subscription tier
  const subscriptionPermissions = {
    free: {
      maxTicketsPerMonth: 5,
      canCreateTicket: true,
      canAssignTeam: false,
      maxTeamMembers: 1,
      slaTier: "none",
      showAnalytics: false,
      canViewSla: false,
      showUpgradePrompt: true,
    },
    essential: {
      maxTicketsPerMonth: -1, // unlimited
      canCreateTicket: true,
      canAssignTeam: false,
      maxTeamMembers: 1,
      slaTier: "standard", // 48h response
      showAnalytics: false,
      canViewSla: true,
      showUpgradePrompt: true,
    },
    verified: {
      maxTicketsPerMonth: -1,
      canCreateTicket: true,
      canAssignTeam: true,
      maxTeamMembers: 5,
      slaTier: "priority", // 24h response
      showAnalytics: true,
      canViewSla: true,
      showUpgradePrompt: true,
    },
    max: {
      maxTicketsPerMonth: -1,
      canCreateTicket: true,
      canAssignTeam: true,
      maxTeamMembers: 10,
      slaTier: "priority", // 24h response
      showAnalytics: true,
      canViewSla: true,
      showUpgradePrompt: false,
    },
    enterprise: {
      maxTicketsPerMonth: -1,
      canCreateTicket: true,
      canAssignTeam: true,
      maxTeamMembers: -1, // unlimited
      slaTier: "guaranteed", // 4-24h response
      showAnalytics: true,
      canViewSla: true,
      showUpgradePrompt: false,
    },
  };

  const currentPermissions = subscriptionPermissions[subscriptionTier];
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // Fetch all tickets
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery<Ticket[]>({
    queryKey: ["tickets"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/tickets");
      if (!res.ok) throw new Error("Failed to fetch tickets");
      return res.json();
    },
  });

  // Fetch ticket stats
  const { data: statsData } = useQuery<TicketStats>({
    queryKey: ["ticket-stats"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/tickets/stats/summary");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  // Create ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: async (newTicket: Partial<Ticket>) => {
      // Check free tier limit (5 tickets/month)
      if (
        subscriptionTier === "free" &&
        currentPermissions.maxTicketsPerMonth > 0
      ) {
        const thisMonth = new Date();
        const monthStart = new Date(
          thisMonth.getFullYear(),
          thisMonth.getMonth(),
          1,
        );
        const monthTickets =
          ticketsData?.filter((t) => {
            const ticketDate = new Date(t.created_at);
            return ticketDate >= monthStart;
          }).length || 0;

        if (monthTickets >= currentPermissions.maxTicketsPerMonth) {
          throw new Error(
            `Free tier limit reached: ${currentPermissions.maxTicketsPerMonth} tickets/month`,
          );
        }
      }

      const res = await authenticatedFetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTicket),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create ticket");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      setShowCreateModal(false);
    },
    onError: (error: any) => {
      if (error.message.includes("limit reached")) {
        setShowUpgradeModal(true);
      }
    },
  });

  // Update ticket mutation
  const updateTicketMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: number;
      updates: Partial<Ticket>;
    }) => {
      const res = await authenticatedFetch(`/api/tickets/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update ticket");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      setShowDetailModal(false);
    },
  });

  // Delete ticket mutation
  const deleteTicketMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await authenticatedFetch(`/api/tickets/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete ticket");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tickets"] });
      queryClient.invalidateQueries({ queryKey: ["ticket-stats"] });
      setShowDetailModal(false);
    },
  });

  // Filter and search tickets
  const filteredTickets = useMemo(() => {
    if (!ticketsData) return [];

    let filtered = ticketsData;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
          t.description?.toLowerCase().startsWith(searchQuery.toLowerCase()),
      );
    }

    // Priority filter
    if (filterPriority && filterPriority !== "all") {
      filtered = filtered.filter((t) => t.priority === filterPriority);
    }

    // Status filter
    if (filterStatus && filterStatus !== "all") {
      filtered = filtered.filter((t) => t.status === filterStatus);
    }

    // Tab filter
    if (activeTab === "open") {
      filtered = filtered.filter((t) => t.status === "open");
    } else if (activeTab === "progress") {
      filtered = filtered.filter((t) => t.status === "in-progress");
    } else if (activeTab === "resolved") {
      filtered = filtered.filter((t) =>
        ["resolved", "closed"].includes(t.status),
      );
    }

    return filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [ticketsData, searchQuery, filterPriority, filterStatus, activeTab]);

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
      "in-progress":
        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      resolved:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };
    return colors[status] || colors["open"];
  };

  const getSLAColor = (percentage: number, breached: boolean) => {
    if (breached) return "from-red-500 to-red-600";
    if (percentage >= 80) return "from-orange-500 to-orange-600";
    if (percentage >= 60) return "from-yellow-500 to-yellow-600";
    return "from-green-500 to-green-600";
  };

  const calculateSLAPercentage = (createdAt: string, targetHours: number) => {
    const elapsed =
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    return Math.min(Math.round((elapsed / targetHours) * 100), 100);
  };

  if (ticketsLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-8">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Quick Navigation Bar - Top Priority */}
      <div className="bg-slate-900/50 border-b border-slate-700 backdrop-blur dark:bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="text-sm text-slate-400 transition-all duration-300"
              style={{
                opacity: titleOpacityBar,
              }}
            >
              🎫 Ticket Management
            </span>
          </div>
          <div className="flex gap-2">
            <a href="/geo-admin">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-blue-600 text-blue-400 hover:bg-blue-600/10"
              >
                🌍 Geo Admin
              </Button>
            </a>
            <a href="/geo-admin/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-emerald-600 text-emerald-400 hover:bg-emerald-600/10"
              >
                🛡️ Admin Dashboard
              </Button>
            </a>
            {canAccessTAM && (
              <a href="/admin/tickets">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-purple-600 text-purple-400 hover:bg-purple-600/10"
                >
                  🎛️ TAM
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-6 md:px-12 py-8 md:py-12" ref={contentRef}>
        {/* Subscription Tier Banner — hidden for staff (they're not subscribers) */}
        {!isStaffRole && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              subscriptionTier === "free"
                ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
                : subscriptionTier === "enterprise"
                  ? "bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800"
                  : "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p
                  className={`text-sm font-semibold ${
                    subscriptionTier === "free"
                      ? "text-yellow-900 dark:text-yellow-100"
                      : subscriptionTier === "enterprise"
                        ? "text-purple-900 dark:text-purple-100"
                        : "text-blue-900 dark:text-blue-100"
                  }`}
                >
                  📊{" "}
                  <Badge className="ml-2 capitalize">
                    {subscriptionTier} Plan
                  </Badge>
                </p>
                <p
                  className={`text-xs mt-1 ${
                    subscriptionTier === "free"
                      ? "text-yellow-800 dark:text-yellow-200"
                      : subscriptionTier === "enterprise"
                        ? "text-purple-800 dark:text-purple-200"
                        : "text-blue-800 dark:text-blue-200"
                  }`}
                >
                  {subscriptionTier === "free" &&
                    "Max 5 tickets/month • No SLA • No team assignment"}
                  {subscriptionTier === "essential" &&
                    "Unlimited tickets • 48h SLA • Email support"}
                  {subscriptionTier === "verified" &&
                    "Unlimited tickets • 24h SLA • Team (5) • Analytics"}
                  {subscriptionTier === "max" &&
                    "Unlimited tickets • 24h SLA • Team (10) • Full analytics"}
                  {subscriptionTier === "enterprise" &&
                    "Unlimited everything • Guaranteed SLA • Dedicated support"}
                </p>
              </div>
              {currentPermissions.showUpgradePrompt && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => setShowUpgradeModal(true)}
                >
                  Upgrade
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Header with Parallax Effect */}
        <div className="mb-8">
          <h1
            className={`text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3 transition-all duration-300 ${scrollY > 0 ? "opacity-100" : "opacity-0"}`}
          >
            Ticket Management System
          </h1>
          <p
            className={`text-gray-600 dark:text-gray-400 text-lg transition-all duration-300 ${scrollY > 0 ? "opacity-100" : "opacity-0"}`}
          >
            Professional CRM ticketing with SLA tracking
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-10">
          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Total Tickets
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {statsData?.total || 0}
                  </p>
                </div>
                <AlertCircle className="h-12 w-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Open
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {statsData?.open || 0}
                  </p>
                </div>
                <Zap className="h-12 w-12 text-yellow-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    In Progress
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {statsData?.inProgress || 0}
                  </p>
                </div>
                <Clock className="h-12 w-12 text-blue-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Resolved
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {statsData?.resolved || 0}
                  </p>
                </div>
                <CheckCircle className="h-12 w-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-slate-800 dark:border-slate-700">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    SLA Breaches
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {currentPermissions.canViewSla ? (
                      statsData?.slaBreaches || 0
                    ) : (
                      <span className="text-lg">
                        <Button
                          variant="link"
                          className="p-0 h-auto text-blue-600"
                          onClick={() => setShowUpgradeModal(true)}
                        >
                          Upgrade
                        </Button>
                      </span>
                    )}
                  </p>
                </div>
                <AlertTriangle className="h-12 w-12 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow mb-10 p-6 border dark:border-slate-700">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1">
                <Input
                  placeholder="Search by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                />
              </div>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  if (
                    subscriptionTier === "free" &&
                    currentPermissions.showUpgradePrompt
                  ) {
                    setShowUpgradeModal(true);
                  } else {
                    setShowCreateModal(true);
                  }
                }}
                disabled={!currentPermissions.canCreateTicket}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
              {canAccessTAM && (
                <Button
                  onClick={() => navigate("/admin/tickets")}
                  className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-800 shrink-0"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  TAM
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-10 bg-white dark:bg-slate-800 rounded-lg shadow border dark:border-slate-700"
        >
          <TabsList className="w-full bg-slate-100 dark:bg-slate-700 border-b dark:border-slate-600 rounded-t-lg">
            <TabsTrigger
              value="all"
              className="data-[state=active]:dark:bg-slate-800"
            >
              All ({filteredTickets.length})
            </TabsTrigger>
            <TabsTrigger
              value="open"
              className="data-[state=active]:dark:bg-slate-800"
            >
              Open (
              {ticketsData?.filter((t) => t.status === "open").length || 0})
            </TabsTrigger>
            <TabsTrigger
              value="progress"
              className="data-[state=active]:dark:bg-slate-800"
            >
              In Progress (
              {ticketsData?.filter((t) => t.status === "in-progress").length ||
                0}
              )
            </TabsTrigger>
            <TabsTrigger
              value="resolved"
              className="data-[state=active]:dark:bg-slate-800"
            >
              Resolved (
              {ticketsData?.filter((t) =>
                ["resolved", "closed"].includes(t.status),
              ).length || 0}
              )
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="p-8">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-24">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 text-lg">
                  No tickets yet — create your first ticket
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredTickets.map((ticket) => {
                  const slaPercent = calculateSLAPercentage(
                    ticket.created_at,
                    ticket.sla_target_hours,
                  );

                  return (
                    <div
                      key={ticket.id}
                      className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-700 rounded-lg border dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition"
                    >
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowDetailModal(true);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {ticket.title}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {ticket.description?.substring(0, 60) ||
                                "No description"}
                              ...
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge
                              className={getPriorityColor(ticket.priority)}
                            >
                              {ticket.priority}
                            </Badge>
                            <Badge className={getStatusColor(ticket.status)}>
                              {ticket.status}
                            </Badge>
                            {ticket.sla_breached && (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                BREACHED
                              </Badge>
                            )}
                          </div>
                          <div className="w-32">
                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                              SLA: {slaPercent}%
                            </div>
                            <div
                              className={`h-2 rounded-full bg-gradient-to-r ${getSLAColor(slaPercent, ticket.sla_breached)}`}
                            />
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="dark:hover:bg-slate-500"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowDetailModal(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Ticket Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="dark:bg-slate-800 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="dark:text-white">New Ticket</DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Create a new support ticket
            </DialogDescription>
          </DialogHeader>
          <CreateTicketForm
            onSubmit={(data) => {
              createTicketMutation.mutate(data);
            }}
            isLoading={createTicketMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
          <DialogContent className="dark:bg-slate-800 dark:border-slate-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="dark:text-white">
                Ticket #{selectedTicket.id}
              </DialogTitle>
              <DialogDescription className="dark:text-gray-400">
                {selectedTicket.title}
              </DialogDescription>
            </DialogHeader>
            <TicketDetailView
              ticket={selectedTicket}
              onStatusChange={(status) => {
                updateTicketMutation.mutate({
                  id: selectedTicket.id,
                  updates: { status },
                });
              }}
              onDelete={() => {
                deleteTicketMutation.mutate(selectedTicket.id);
              }}
              isUpdating={
                updateTicketMutation.isPending || deleteTicketMutation.isPending
              }
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Subscription Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="dark:bg-slate-800 dark:border-slate-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="dark:text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Upgrade Your Plan
            </DialogTitle>
            <DialogDescription className="dark:text-gray-400">
              Current Plan:{" "}
              <Badge variant="outline" className="ml-2">
                {subscriptionTier.toUpperCase()}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {subscriptionTier === "free" && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  📌 <strong>Free Tier Limit:</strong> You've reached your 5
                  tickets/month limit. Upgrade to create unlimited tickets!
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {/* Essential Tier */}
              <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 hover:border-blue-500 cursor-pointer transition">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg dark:text-white">
                      Essential
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      $9-29/month
                    </p>
                  </div>
                  <Badge variant="secondary">48h SLA</Badge>
                </div>
                <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                  <li>✅ Unlimited tickets</li>
                  <li>✅ Basic SLA (48h response)</li>
                  <li>✅ Email + Chat support</li>
                  <li>❌ Team assignment</li>
                </ul>
              </div>

              {/* Professional Tier */}
              <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50 dark:bg-blue-950">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg dark:text-white">
                      Professional <Badge className="ml-2">Popular</Badge>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      $49-99/month
                    </p>
                  </div>
                  <Badge className="bg-blue-600">24h SLA</Badge>
                </div>
                <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                  <li>✅ Unlimited tickets</li>
                  <li>✅ Priority SLA (24h response)</li>
                  <li>✅ Team assignment (5 members)</li>
                  <li>✅ Analytics dashboard</li>
                  <li>✅ Phone + Email + Chat</li>
                </ul>
              </div>

              {/* Enterprise Tier */}
              <div className="border border-purple-500 rounded-lg p-4 hover:border-purple-600 cursor-pointer transition">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg dark:text-white">
                      Enterprise
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Custom pricing
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-purple-500 text-purple-600"
                  >
                    Guaranteed SLA
                  </Badge>
                </div>
                <ul className="text-sm space-y-2 text-gray-700 dark:text-gray-300">
                  <li>✅ Everything in Professional</li>
                  <li>✅ Unlimited team members</li>
                  <li>✅ Full API access</li>
                  <li>✅ Custom integrations</li>
                  <li>✅ Dedicated support (24/7)</li>
                </ul>
              </div>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                💡 <strong>Need more?</strong> Contact our sales team for
                enterprise features and custom pricing.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeModal(false)}
            >
              Close
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Tier Badge - Fixed Bottom Right (subscribers only) */}
      {!isStaffRole && (
        <div className="fixed bottom-6 right-6 bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-lg shadow-lg p-3 z-40">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            Current Plan
          </div>
          <Badge className="bg-blue-600 text-white capitalize">
            {subscriptionTier}
          </Badge>
          <Button
            variant="link"
            size="sm"
            className="text-xs p-0 h-auto mt-2 w-full justify-center"
            onClick={() => setShowUpgradeModal(true)}
          >
            Upgrade Plan
          </Button>
        </div>
      )}
    </div>
  );
}

function CreateTicketForm({
  onSubmit,
  isLoading,
}: {
  onSubmit: (data: Partial<Ticket>) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    category: "general",
    requesterEmail: "",
    source: "portal",
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
      className="space-y-4"
    >
      <div>
        <Label className="dark:text-gray-300">Title *</Label>
        <Input
          required
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        />
      </div>
      <div>
        <Label className="dark:text-gray-300">Description</Label>
        <Textarea
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="dark:text-gray-300">Priority</Label>
          <Select
            value={formData.priority}
            onValueChange={(priority) => setFormData({ ...formData, priority })}
          >
            <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="dark:text-gray-300">Category</Label>
          <Select
            value={formData.category}
            onValueChange={(category) => setFormData({ ...formData, category })}
          >
            <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="infrastructure">Infrastructure</SelectItem>
              <SelectItem value="ui-ux">UI/UX</SelectItem>
              <SelectItem value="enhancement">Enhancement</SelectItem>
              <SelectItem value="general">General</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="dark:text-gray-300">Requester Email</Label>
        <Input
          type="email"
          value={formData.requesterEmail}
          onChange={(e) =>
            setFormData({ ...formData, requesterEmail: e.target.value })
          }
          className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        />
      </div>
      <DialogFooter>
        <Button
          type="submit"
          disabled={isLoading || !formData.title}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? "Creating..." : "Create Ticket"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function TicketDetailView({
  ticket,
  onStatusChange,
  onDelete,
  isUpdating,
}: {
  ticket: Ticket;
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const slaPercent = calculateSLAPercentage(
    ticket.created_at,
    ticket.sla_target_hours,
  );

  const getSLAColor = (percentage: number, breached: boolean) => {
    if (breached) return "text-red-600 dark:text-red-400";
    if (percentage >= 80) return "text-orange-600 dark:text-orange-400";
    if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-green-600 dark:text-green-400";
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
          <Select value={ticket.status} onValueChange={onStatusChange}>
            <SelectTrigger className="dark:bg-slate-700 dark:border-slate-600 dark:text-white mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-700 dark:border-slate-600">
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Priority</p>
          <p className="font-semibold dark:text-white capitalize">
            {ticket.priority}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Category</p>
          <p className="font-semibold dark:text-white capitalize">
            {ticket.category}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Source</p>
          <p className="font-semibold dark:text-white capitalize">
            {ticket.source}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          SLA Status
        </p>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-3 rounded-full bg-gradient-to-r from-green-500 to-red-500 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: `${100 - slaPercent}%` }}
              />
            </div>
          </div>
          <span
            className={`font-semibold ${getSLAColor(slaPercent, ticket.sla_breached)}`}
          >
            {slaPercent}% {ticket.sla_breached ? "BREACHED" : ""}
          </span>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Description</p>
        <p className="mt-2 text-gray-900 dark:text-white">
          {ticket.description || "No description provided"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Created At</p>
          <p className="font-semibold dark:text-white">
            {new Date(ticket.created_at).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Reporter</p>
          <p className="font-semibold dark:text-white">
            {ticket.reporter || "Unknown"}
          </p>
        </div>
      </div>

      <DialogFooter className="flex gap-2 justify-end">
        <Button
          variant="destructive"
          onClick={onDelete}
          disabled={isUpdating}
          className="bg-red-600 hover:bg-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </DialogFooter>
    </div>
  );
}

function calculateSLAPercentage(createdAt: string, targetHours: number) {
  const elapsed =
    (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  return Math.min(Math.round((elapsed / targetHours) * 100), 100);
}

export default Tickets;
