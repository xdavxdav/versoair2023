import { Link } from "wouter";
import {
  Calendar,
  User,
  MessageCircle,
  Heart,
  Share2,
  ArrowLeft,
  Plus,
  Briefcase,
  TrendingUp,
  Users,
  Building,
  Search,
  Filter,
  MoreHorizontal,
  ThumbsUp,
  MessageSquare,
  Send,
  Eye,
  Star,
  ArrowUp,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import ScrollToTop from "@/components/ScrollToTop";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { motion, AnimatePresence } from "framer-motion";
import PostCard from "@/components/PostCard";
import UserProfileCard from "@/components/UserProfileCard";

// Fallback user data for when authentication is not available
const defaultUser = {
  id: "user_1",
  name: "Guest User",
  role: "Business Owner",
  avatar:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face",
  company: "Versoair Business",
};

// User roles that can post jobs directly
const jobPostingRoles = [
  "Business Owner",
  "Small Commerce Owner",
  "Self-Employed",
  "Local Franchise Manager",
];

type Post = {
  id: number;
  type: "discussion" | "job" | "trend";
  author: { name: string; role: string; avatar: string; company: string };
  timestamp: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  trending?: boolean;
  jobTitle?: string;
  jobLocation?: string;
  jobType?: string;
  salary?: string;
  tags?: string[];
  applications?: number;
};

// Generate more posts for infinite scroll
const generatePosts = (count: number): Post[] => {
  const posts: Post[] = [];
  const types = ["discussion", "job", "trend"] as const;
  type PostType = (typeof types)[number];
  const roles = [
    "Business Owner",
    "Small Commerce Owner",
    "Industry Expert",
    "Local Franchise Manager",
  ];
  const companies = [
    "DataFlow Analytics",
    "TechStart Solutions",
    "Analytics Insights",
    "FastFood Chain Co.",
    "RetailMax Corp",
    "DataTech Solutions",
  ];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const role = roles[Math.floor(Math.random() * roles.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];

    posts.push({
      id: Date.now() + i,
      type,
      author: {
        name: `User ${Math.floor(Math.random() * 1000)}`,
        role,
        avatar: `https://images.unsplash.com/photo-${
          1494790108755 + i
        }-2616b612b786?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face`,
        company,
      },
      timestamp: `${Math.floor(Math.random() * 24)} hours ago`,
      content: `This is a sample ${type} post about business intelligence and data analytics. Discussing trends in the industry and sharing insights.`,
      likes: Math.floor(Math.random() * 100),
      comments: Math.floor(Math.random() * 50),
      shares: Math.floor(Math.random() * 20),
      trending: Math.random() > 0.7,
    });
  }

  return posts;
};

// Generate more jobs for infinite scroll
const generateJobs = (count: number) => {
  const jobs = [];
  const titles = [
    "Data Analyst",
    "Business Intelligence Developer",
    "Data Scientist",
    "BI Manager",
    "Data Engineer",
  ];
  const companies = [
    "TechCorp",
    "DataFlow Analytics",
    "Analytics Pro",
    "RetailMax Corp",
    "DataTech Solutions",
  ];
  const locations = [
    "Remote",
    "San Francisco, CA",
    "New York, NY",
    "Austin, TX",
    "Chicago, IL",
  ];
  const types = ["Full-time", "Part-time", "Contract", "Freelance"];

  for (let i = 0; i < count; i++) {
    const title = titles[Math.floor(Math.random() * titles.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const jobType = types[Math.floor(Math.random() * types.length)];

    jobs.push({
      id: Date.now() + i,
      title,
      company,
      location,
      type: jobType,
      salary: `$${Math.floor(Math.random() * 50 + 70)},000 - $${Math.floor(
        Math.random() * 50 + 100,
      )},000`,
      posted: `${Math.floor(Math.random() * 7)} days ago`,
      applicants: Math.floor(Math.random() * 100),
    });
  }

  return jobs;
};

// Generate more trending topics for infinite scroll
const generateTrending = (count: number) => {
  const trends = [];
  const topics = [
    "AI Integration in Business Intelligence",
    "Remote Team Analytics",
    "Data Privacy Regulations 2025",
    "Small Business BI Tools",
    "Cloud Data Migration",
    "Real-time Analytics",
    "Customer Behavior Prediction",
    "Supply Chain Optimization",
  ];
  const engagements = ["High", "Growing", "Active", "Steady"];

  for (let i = 0; i < count; i++) {
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const engagement =
      engagements[Math.floor(Math.random() * engagements.length)];

    trends.push({
      id: Date.now() + i,
      topic,
      posts: Math.floor(Math.random() * 500 + 100),
      trend: `+${Math.floor(Math.random() * 30 + 10)}%`,
      engagement,
    });
  }

  return trends;
};

// Generate more network activities for infinite scroll
const generateNetworkActivities = (count: number) => {
  const activities = [];
  const actions = [
    "liked your post about BI trends",
    "commented on your article",
    "shared your post",
    "connected with you",
    "endorsed your skills",
    "mentioned you in a post",
  ];

  for (let i = 0; i < count; i++) {
    const action = actions[Math.floor(Math.random() * actions.length)];

    activities.push({
      id: Date.now() + i,
      name: `User ${Math.floor(Math.random() * 1000)}`,
      action,
      time: `${Math.floor(Math.random() * 24)} hours ago`,
      avatar: `https://images.unsplash.com/photo-${
        1494790108755 + i
      }-2616b612b786?ixlib=rb-4.0.3&w=50&h=50&fit=crop&crop=face`,
    });
  }

  return activities;
};

const initialCommunityPosts: Post[] = [
  {
    id: 1,
    type: "discussion",
    author: {
      name: "Sarah Johnson",
      role: "Business Owner",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face",
      company: "DataFlow Analytics",
    },
    timestamp: "2 hours ago",
    content:
      "Just implemented new BI dashboard for our retail chain. The customer behavior insights are incredible! Anyone else seeing similar patterns in Q4 data?",
    image:
      "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&w=600&h=300&fit=crop",
    likes: 24,
    comments: 8,
    shares: 5,
    trending: true,
  },
  {
    id: 2,
    type: "job",
    author: {
      name: "Michael Chen",
      role: "Small Commerce Owner",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face",
      company: "TechStart Solutions",
    },
    timestamp: "5 hours ago",
    jobTitle: "Senior Data Analyst",
    jobLocation: "Remote/San Francisco",
    jobType: "Full-time",
    content:
      "Looking for a passionate data analyst to join our growing team. Experience with Tableau, SQL, and business intelligence platforms required.",
    salary: "$75,000 - $95,000",
    likes: 12,
    comments: 15,
    shares: 8,
    applications: 23,
  },
  {
    id: 3,
    type: "trend",
    author: {
      name: "Emma Rodriguez",
      role: "Industry Expert",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face",
      company: "Analytics Insights",
    },
    timestamp: "1 day ago",
    content:
      "📊 TRENDING: Location-based analytics seeing 300% growth in retail sector. Small businesses are finally catching up with enterprise-level insights. What tools are you using?",
    tags: ["#LocationAnalytics", "#RetailTech", "#SmallBusiness"],
    likes: 89,
    comments: 22,
    shares: 34,
    trending: true,
  },
  {
    id: 4,
    type: "discussion",
    author: {
      name: "David Kim",
      role: "Local Franchise Manager",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face",
      company: "FastFood Chain Co.",
    },
    timestamp: "2 days ago",
    content:
      "Question for the community: How do you handle data privacy compliance while still getting meaningful customer insights? Our legal team is asking tough questions.",
    likes: 45,
    comments: 31,
    shares: 12,
  },
];

const initialJobs = [
  {
    id: 1,
    title: "Senior Business Intelligence Analyst",
    company: "DataTech Solutions",
    location: "San Francisco, CA",
    type: "Full-time",
    salary: "$90,000 - $120,000",
    posted: "2 days ago",
    applicants: 45,
  },
  {
    id: 2,
    title: "Data Visualization Specialist",
    company: "Analytics Pro",
    location: "Remote",
    type: "Contract",
    salary: "$70/hour",
    posted: "1 week ago",
    applicants: 23,
  },
  {
    id: 3,
    title: "Business Intelligence Manager",
    company: "RetailMax Corp",
    location: "New York, NY",
    type: "Full-time",
    salary: "$110,000 - $140,000",
    posted: "3 days ago",
    applicants: 67,
  },
];

const initialTrending = [
  {
    id: 1,
    topic: "AI Integration in Business Intelligence",
    posts: 234,
    trend: "+45%",
    engagement: "High",
  },
  {
    id: 2,
    topic: "Remote Team Analytics",
    posts: 189,
    trend: "+32%",
    engagement: "Growing",
  },
  {
    id: 3,
    topic: "Data Privacy Regulations 2025",
    posts: 156,
    trend: "+28%",
    engagement: "Active",
  },
  {
    id: 4,
    topic: "Small Business BI Tools",
    posts: 145,
    trend: "+22%",
    engagement: "Steady",
  },
];

const initialNetworkActivities = [
  {
    id: 1,
    name: "Sarah Chen",
    action: "liked your post about BI trends",
    time: "2 hours ago",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&w=50&h=50&fit=crop&crop=face",
  },
  {
    id: 2,
    name: "Mike Rodriguez",
    action: "connected with you",
    time: "1 day ago",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=50&h=50&fit=crop&crop=face",
  },
  {
    id: 3,
    name: "Emma Thompson",
    action: "shared your article",
    time: "3 days ago",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&w=50&h=50&fit=crop&crop=face",
  },
];

const trendingTopics = [
  { tag: "#BusinessIntelligence", posts: 1247 },
  { tag: "#DataAnalytics", posts: 892 },
  { tag: "#RetailTech", posts: 634 },
  { tag: "#SmallBusiness", posts: 587 },
  { tag: "#LocationAnalytics", posts: 423 },
];

export default function Blog() {
  // ===== AUTHENTICATION SETUP =====
  const { user: authUser, loading: authLoading } = useAuth();

  // Use authenticated user or fallback to default
  const currentUser = authUser
    ? {
        id: authUser.id,
        name: authUser.name,
        role: authUser.role || "Business Owner",
        avatar:
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face",
        company: authUser.email || "Versoair",
      }
    : defaultUser;

  // ===== NOTIFICATION SETUP =====
  const {
    notifications: hookNotifications,
    unreadCount: hookUnreadCount,
    isConnected,
  } = useNotifications(authUser);

  const [activeTab, setActiveTab] = useState("feed");
  const [showJobForm, setShowJobForm] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [showPostForm, setShowPostForm] = useState(true);
  const [posts, setPosts] = useState<Post[]>(initialCommunityPosts);
  const [jobs, setJobs] = useState(initialJobs);
  const [trending, setTrending] = useState(initialTrending);
  const [networkActivities, setNetworkActivities] = useState(
    initialNetworkActivities,
  );
  const [loading, setLoading] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // ===== NOTIFICATION STATE =====
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [connectionPending, setConnectionPending] = useState<{
    [key: number]: boolean;
  }>({});

  // Sync hook notifications with component state
  useEffect(() => {
    setNotifications(hookNotifications);
    setUnreadCount(hookUnreadCount);
  }, [hookNotifications, hookUnreadCount]);

  const canPostJobs = jobPostingRoles.includes(currentUser.role);

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      // Show/hide scroll to top button
      setShowScrollTop(window.scrollY > 300);

      // Infinite scroll logic
      if (
        window.innerHeight + window.scrollY >=
          document.body.offsetHeight - 500 &&
        !loading
      ) {
        loadMoreContent();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, activeTab]);

  const loadMoreContent = useCallback(() => {
    setLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      switch (activeTab) {
        case "feed":
          const newPosts = generatePosts(3);
          setPosts((prevPosts) => [...prevPosts, ...newPosts]);
          break;
        case "jobs":
          const newJobs = generateJobs(3);
          setJobs((prevJobs) => [...prevJobs, ...newJobs]);
          break;
        case "trending":
          const newTrending = generateTrending(3);
          setTrending((prevTrending) => [...prevTrending, ...newTrending]);
          break;
        case "network":
          const newActivities = generateNetworkActivities(3);
          setNetworkActivities((prevActivities) => [
            ...prevActivities,
            ...newActivities,
          ]);
          break;
        default:
          break;
      }
      setLoading(false);
    }, 1500);
  }, [activeTab]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const refreshContent = () => {
    setLoading(true);
    // Simulate refresh
    setTimeout(() => {
      switch (activeTab) {
        case "feed":
          setPosts(initialCommunityPosts);
          break;
        case "jobs":
          setJobs(initialJobs);
          break;
        case "trending":
          setTrending(initialTrending);
          break;
        case "network":
          setNetworkActivities(initialNetworkActivities);
          break;
        default:
          break;
      }
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1000);
  };

  // ===== NOTIFICATION HANDLERS =====

  /**
   * Handle connection request - sends notification to target user
   */
  const handleSendConnectionRequest = async (
    targetUserId: number,
    targetUserName: string,
  ) => {
    setConnectionPending((prev) => ({ ...prev, [targetUserId]: true }));

    try {
      // API call to send connection request
      const response = await fetch("/api/v1/connections/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserId: targetUserId,
        }),
      });

      if (response.ok) {
        const notification = await response.json();

        // Add notification to local state
        setNotifications((prev) => [
          {
            id: `conn-${Date.now()}`,
            type: "connection_request_sent",
            targetUser: targetUserName,
            targetUserId,
            timestamp: new Date(),
            read: false,
          },
          ...prev,
        ]);

        // Show success message
        alert(`Connection request sent to ${targetUserName}!`);

        // Update network activities to show the action
        setNetworkActivities((prev) => [
          {
            id: Date.now(),
            name: targetUserName,
            action: "connection request sent to",
            time: "just now",
            avatar: `https://images.unsplash.com/photo-${1494790108755}?ixlib=rb-4.0.3&w=50&h=50&fit=crop&crop=face`,
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error("Error sending connection request:", error);
      alert("Failed to send connection request");
    } finally {
      setConnectionPending((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  /**
   * Handle accepting a connection request
   */
  const handleAcceptConnection = async (
    connectionId: number,
    fromUserId: number,
    fromUserName: string,
  ) => {
    try {
      const response = await fetch(
        `/api/v1/connections/${connectionId}/accept`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        // Add notification
        setNotifications((prev) => [
          {
            id: `accept-${Date.now()}`,
            type: "connection_accepted",
            fromUser: fromUserName,
            fromUserId,
            timestamp: new Date(),
            read: false,
          },
          ...prev,
        ]);

        // Update activity log
        setNetworkActivities((prev) => [
          {
            id: Date.now(),
            name: fromUserName,
            action: "connection accepted with",
            time: "just now",
            avatar: `https://images.unsplash.com/photo-${1494790108755}?ixlib=rb-4.0.3&w=50&h=50&fit=crop&crop=face`,
          },
          ...prev,
        ]);

        alert(`You're now connected with ${fromUserName}!`);
      }
    } catch (error) {
      console.error("Error accepting connection:", error);
      alert("Failed to accept connection");
    }
  };

  /**
   * Handle declining a connection request
   */
  const handleDeclineConnection = async (connectionId: number) => {
    try {
      const response = await fetch(
        `/api/v1/connections/${connectionId}/decline`,
        {
          method: "POST",
        },
      );

      if (response.ok) {
        // Remove from notifications
        setNotifications((prev) =>
          prev.filter((n) => n.id !== `conn-${connectionId}`),
        );
        alert("Connection request declined");
      }
    } catch (error) {
      console.error("Error declining connection:", error);
      alert("Failed to decline connection");
    }
  };

  /**
   * Clear all notifications
   */
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-[9997]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Home
                </Button>
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Business Community
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search discussions..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>

              {/* Notifications Bell */}
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setShowNotificationPanel(!showNotificationPanel)
                  }
                  className="relative"
                >
                  <MessageCircle className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </Button>

                {/* Notification Panel Dropdown */}
                {showNotificationPanel && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                    <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold">Notifications</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearNotifications}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Clear all
                        </button>
                      )}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">
                          <p className="text-sm">No new notifications</p>
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                          >
                            {notif.type === "connection_request_sent" && (
                              <div>
                                <p className="text-sm font-medium">
                                  Connection request sent
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  You've sent a connection request to{" "}
                                  <span className="font-medium">
                                    {notif.targetUser}
                                  </span>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(
                                    notif.timestamp,
                                  ).toLocaleTimeString()}
                                </p>
                              </div>
                            )}
                            {notif.type === "connection_accepted" && (
                              <div>
                                <p className="text-sm font-medium text-green-600">
                                  Connection accepted
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  <span className="font-medium">
                                    {notif.fromUser}
                                  </span>{" "}
                                  accepted your connection request
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(
                                    notif.timestamp,
                                  ).toLocaleTimeString()}
                                </p>
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex space-x-8 border-b border-gray-200">
            {[
              { id: "feed", label: "Feed", icon: MessageCircle },
              { id: "jobs", label: "Jobs", icon: Briefcase },
              { id: "trending", label: "Trending", icon: TrendingUp },
              { id: "network", label: "My Network", icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? "border-[#bf831c] text-[#bf831c]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-center space-x-3 mb-4">
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {currentUser.name}
                  </h3>
                  <p className="text-sm text-gray-600">{currentUser.role}</p>
                  <p className="text-xs text-gray-500">{currentUser.company}</p>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Profile views</span>
                  <span className="font-medium">127</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Post impressions</span>
                  <span className="font-medium">2,543</span>
                </div>
              </div>
            </div>

            {/* Trending Topics */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Trending Topics
              </h3>
              <div className="space-y-3">
                {trendingTopics.map((topic, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[#bf831c] hover:underline cursor-pointer font-medium">
                      {topic.tag}
                    </span>
                    <span className="text-xs text-gray-500">
                      {topic.posts} posts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Sticky Create Post - Only show in Feed tab */}
            {activeTab === "feed" && (
              <div className="sticky top-0 z-[9996] mb-6">
                <div className="bg-white rounded-xl shadow-sm">
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer border-b"
                    onClick={() => setShowPostForm(!showPostForm)}
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        src={currentUser.avatar}
                        alt={currentUser.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="text-gray-600">
                        {showPostForm
                          ? "Hide"
                          : "Share your business insights with the community..."}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm">
                      {showPostForm ? "−" : "+"}
                    </Button>
                  </div>

                  {showPostForm && (
                    <div className="p-6">
                      <div className="flex items-start space-x-3">
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name}
                          className="w-90 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <textarea
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            placeholder="Share your business insights with the community..."
                            className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                            rows={3}
                          />
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm">
                                <Eye className="mr-2 h-4 w-4" />
                                Photo
                              </Button>
                              {canPostJobs && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowJobForm(!showJobForm)}
                                >
                                  <Briefcase className="mr-2 h-4 w-4" />
                                  Post Job
                                </Button>
                              )}
                              {!canPostJobs && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="opacity-50 cursor-not-allowed"
                                  title="Job posting requires approval for your role"
                                >
                                  <Briefcase className="mr-2 h-4 w-4" />
                                  Request Job Post
                                </Button>
                              )}
                            </div>
                            <Button className="bg-[#bf831c] hover:bg-[#a6701a]">
                              <Send className="mr-2 h-4 w-4" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Job Posting Form */}
                      {showJobForm && (
                        <div className="mt-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                          <h4 className="font-semibold mb-4">Post a Job</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                              type="text"
                              placeholder="Job Title"
                              className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#bf831c]"
                            />
                            <input
                              type="text"
                              placeholder="Location"
                              className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#bf831c]"
                            />
                            <select className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#bf831c]">
                              <option>Full-time</option>
                              <option>Part-time</option>
                              <option>Contract</option>
                              <option>Freelance</option>
                            </select>
                            <input
                              type="text"
                              placeholder="Salary Range"
                              className="p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#bf831c]"
                            />
                          </div>
                          <textarea
                            placeholder="Job Description"
                            className="w-full mt-4 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-[#bf831c]"
                            rows={3}
                          />
                          <div className="flex justify-end space-x-2 mt-4">
                            <Button
                              variant="outline"
                              onClick={() => setShowJobForm(false)}
                            >
                              Cancel
                            </Button>
                            <Button className="bg-[#bf831c] hover:bg-[#a6701a]">
                              Post Job
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === "feed" && (
              <div className="space-y-6">
                {posts.map((post) => (
                  <div key={post.id} className="bg-white rounded-xl shadow-sm">
                    {/* Post Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3">
                          <img
                            src={post.author.avatar}
                            alt={post.author.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-semibold text-gray-900">
                                {post.author.name}
                              </h4>
                              {post.trending && (
                                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {post.author.role} at {post.author.company}
                            </p>
                            <p className="text-xs text-gray-500">
                              {post.timestamp}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="px-6 pb-4">
                      {post.type === "job" && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                          <div className="flex items-center space-x-2 mb-2">
                            <Briefcase className="h-4 w-4 text-blue-600" />
                            <span className="font-semibold text-blue-900">
                              {post.jobTitle}
                            </span>
                          </div>
                          <p className="text-sm text-blue-700 mb-2">
                            {post.jobLocation} • {post.jobType}
                          </p>
                          {post.salary && (
                            <p className="text-sm font-medium text-green-700">
                              {post.salary}
                            </p>
                          )}
                        </div>
                      )}

                      <p className="text-gray-800 mb-4">{post.content}</p>

                      {post.image && (
                        <img
                          src={post.image}
                          alt="Post image"
                          className="w-full rounded-lg mb-4"
                        />
                      )}

                      {post.tags && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="text-[#bf831c] hover:underline cursor-pointer text-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Post Actions */}
                    <div className="px-6 py-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <div className="flex space-x-6">
                          <button className="flex items-center space-x-2 text-gray-500 hover:text-blue-600 transition-colors">
                            <ThumbsUp className="h-4 w-4" />
                            <span className="text-sm">{post.likes}</span>
                          </button>
                          <button className="flex items-center space-x-2 text-gray-500 hover:text-green-600 transition-colors">
                            <MessageSquare className="h-4 w-4" />
                            <span className="text-sm">{post.comments}</span>
                          </button>
                          <button className="flex items-center space-x-2 text-gray-500 hover:text-purple-600 transition-colors">
                            <Share2 className="h-4 w-4" />
                            <span className="text-sm">{post.shares}</span>
                          </button>
                          {post.type === "job" && (
                            <button className="flex items-center space-x-2 text-gray-500 hover:text-[#bf831c] transition-colors">
                              <Building className="h-4 w-4" />
                              <span className="text-sm">
                                {post.applications} applications
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Loading indicator for infinite scroll */}
                {loading && (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bf831c]"></div>
                  </div>
                )}
              </div>
            )}

            {/* Jobs Tab */}
            {activeTab === "jobs" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">Featured Jobs</h3>
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">
                            {job.title}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {job.posted}
                          </span>
                        </div>
                        <p className="text-gray-600 mb-1">{job.company}</p>
                        <p className="text-sm text-gray-500 mb-2">
                          {job.location} • {job.type}
                        </p>
                        <p className="text-sm font-medium text-green-600 mb-2">
                          {job.salary}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">
                            {job.applicants} applicants
                          </span>
                          <Button
                            size="sm"
                            className="bg-[#bf831c] hover:bg-[#a6701a]"
                          >
                            Apply Now
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Loading indicator for infinite scroll */}
                  {loading && (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bf831c]"></div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Trending Tab */}
            {activeTab === "trending" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    🔥 Trending Discussions
                  </h3>
                  <div className="space-y-4">
                    {trending.map((trend) => (
                      <div
                        key={trend.id}
                        className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200"
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {trend.topic}
                          </h4>
                          <p className="text-sm text-gray-600">
                            {trend.posts} posts • {trend.engagement} engagement
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-green-600 font-medium">
                            {trend.trend}
                          </span>
                          <p className="text-xs text-gray-500">vs last week</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Loading indicator for infinite scroll */}
                  {loading && (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bf831c]"></div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    📊 Industry Insights
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        metric: "Average BI ROI",
                        value: "312%",
                        change: "+15%",
                      },
                      {
                        metric: "Data Teams Growth",
                        value: "67%",
                        change: "+8%",
                      },
                      {
                        metric: "Cloud Migration",
                        value: "89%",
                        change: "+23%",
                      },
                      { metric: "AI Adoption", value: "45%", change: "+34%" },
                    ].map((insight, index) => (
                      <div key={index} className="bg-blue-50 p-4 rounded-lg">
                        <h5 className="text-sm font-medium text-gray-700">
                          {insight.metric}
                        </h5>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-2xl font-bold text-blue-600">
                            {insight.value}
                          </span>
                          <span className="text-sm text-green-600">
                            {insight.change}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* My Network Tab */}
            {activeTab === "network" && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h3 className="text-lg font-semibold mb-4">
                    Your Professional Network
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg text-center">
                      <h4 className="text-2xl font-bold text-blue-600">247</h4>
                      <p className="text-sm text-gray-600">Connections</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg text-center">
                      <h4 className="text-2xl font-bold text-green-600">89</h4>
                      <p className="text-sm text-gray-600">
                        Mutual Connections
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg text-center">
                      <h4 className="text-2xl font-bold text-purple-600">
                        156
                      </h4>
                      <p className="text-sm text-gray-600">Profile Views</p>
                    </div>
                  </div>

                  <h4 className="font-medium mb-4">Recent Activity</h4>
                  <div className="space-y-3">
                    {networkActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg"
                      >
                        <img
                          src={activity.avatar}
                          alt={activity.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">{activity.name}</span>{" "}
                            {activity.action}
                          </p>
                          <p className="text-xs text-gray-500">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Loading indicator for infinite scroll */}
                  {loading && (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#bf831c]"></div>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                  <h4 className="font-medium mb-4">People You May Know</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        id: 1,
                        name: "Alex Johnson",
                        role: "Data Scientist at TechCorp",
                        mutual: 12,
                        avatar:
                          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face",
                      },
                      {
                        id: 2,
                        name: "Lisa Wang",
                        role: "BI Manager at Analytics Pro",
                        mutual: 8,
                        avatar:
                          "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&w=100&h=100&fit=crop&crop=face",
                      },
                    ].map((person, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-4"
                      >
                        <div className="flex items-center space-x-3 mb-3">
                          <img
                            src={person.avatar}
                            alt={person.name}
                            className="w-12 h-12 rounded-full"
                          />
                          <div>
                            <h5 className="font-medium">{person.name}</h5>
                            <p className="text-sm text-gray-600">
                              {person.role}
                            </p>
                            <p className="text-xs text-gray-500">
                              {person.mutual} mutual connections
                            </p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={() =>
                            handleSendConnectionRequest(person.id, person.name)
                          }
                          disabled={connectionPending[person.id]}
                        >
                          {connectionPending[person.id]
                            ? "Sending..."
                            : "Connect"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Quick Connect
              </h3>
              <div className="space-y-4">
                {[
                  {
                    name: "Alice Cooper",
                    role: "Data Scientist",
                    company: "TechFlow",
                    mutual: 5,
                  },
                  {
                    name: "Bob Wilson",
                    role: "Business Analyst",
                    company: "DataCore",
                    mutual: 12,
                  },
                  {
                    name: "Carol Davis",
                    role: "Marketing Director",
                    company: "GrowthLab",
                    mutual: 8,
                  },
                ].map((suggestion, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {suggestion.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{suggestion.name}</p>
                        <p className="text-xs text-gray-500">
                          {suggestion.role}
                        </p>
                        <p className="text-xs text-gray-400">
                          {suggestion.company} • {suggestion.mutual} mutual
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[#bf831c] border-[#bf831c] hover:bg-[#bf831c] hover:text-white"
                    >
                      Connect
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Recent Jobs</h3>
              <div className="space-y-3">
                {[
                  {
                    title: "Data Analyst",
                    company: "TechCorp",
                    location: "Remote",
                  },
                  {
                    title: "BI Developer",
                    company: "StartupXYZ",
                    location: "NYC",
                  },
                  {
                    title: "Marketing Analyst",
                    company: "RetailCo",
                    location: "LA",
                  },
                ].map((job, index) => (
                  <div key={index} className="border-l-4 border-[#bf831c] pl-3">
                    <p className="font-medium text-sm">{job.title}</p>
                    <p className="text-xs text-gray-600">
                      {job.company} • {job.location}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      {showScrollTop && (
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2">
          <Button
            onClick={refreshContent}
            size="icon"
            className="rounded-full w-12 h-12 bg-[#bf831c] hover:bg-[#a6701a] shadow-lg"
            title="Refresh content"
          >
            <RefreshCw className="h-5 w-5" />
          </Button>
          <Button
            onClick={scrollToTop}
            size="icon"
            className="rounded-full w-12 h-12 bg-[#bf831c] hover:bg-[#a6701a] shadow-lg"
            title="Scroll to top"
          >
            <ArrowUp className="h-5 w-5" />
          </Button>
        </div>
      )}
      <ScrollToTop />
    </div>
  );
}
