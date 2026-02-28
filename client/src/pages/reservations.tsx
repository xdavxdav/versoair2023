import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Star,
  Users,
  Home,
  Hotel,
  Building,
  Bed,
  Bath,
  Ruler,
  Wifi,
  Car,
  Coffee,
  Snowflake,
  Dumbbell,
  ChefHat,
  PawPrint,
  Eye,
  Heart,
  Phone,
  MessageCircle,
  Plus,
  Minus,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  TrendingUp,
  DollarSign,
  CreditCard,
  ShieldCheck,
  Zap,
  Globe,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  MessageSquare,
  Bell,
  Settings,
  User,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  staggerContainer,
  staggerItem,
  defaultViewport,
} from "@/lib/animations";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

// Database API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface Property {
  id: string;
  name: string;
  description: string;
  image: string;
  images: string[];
  type: string;
  category: string;
  location: string;
  price: number;
  rating: number;
  reviews: number;
  bedrooms: number;
  bathrooms: number;
  area: number;
  guests: number;
  amenities: string[];
  host: {
    name: string;
    avatar: string;
    superhost: boolean;
    verified: boolean;
    responseRate: number;
    responseTime: string;
  };
  verified: boolean;
  instantBook: boolean;
  freeCancellation: boolean;
  discount: number;
  featured: boolean;
  tags: string[];
  availability: number;
  checkIn: string;
  checkOut: string;
  minimumStay: number;
  maximumStay: number;
  latitude?: number;
  longitude?: number;
}

interface Booking {
  id: string;
  propertyId: string;
  propertyName: string;
  propertyImage: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  bookingDate: string;
}

export default function HousingReservations() {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guests, setGuests] = useState(2);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    // Restore tab state from sessionStorage
    const saved = sessionStorage.getItem("reservationsActiveTab");
    return saved || "properties";
  });

  // Save tab state whenever it changes
  useEffect(() => {
    sessionStorage.setItem("reservationsActiveTab", activeTab);
  }, [activeTab]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>(
    [],
  );
  const [minRating, setMinRating] = useState(0);
  const [favorites, setFavorites] = useState<string[]>(() => {
    // Restore favorites from localStorage keyed by clientName
    const name = localStorage.getItem("clientName") || "";
    if (name) {
      try {
        return JSON.parse(localStorage.getItem(`favorites_${name}`) || "[]");
      } catch { return []; }
    }
    return [];
  });
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingProperty, setBookingProperty] = useState<Property | null>(null);
  const [clientName, setClientName] = useState<string>(
    () => localStorage.getItem("clientName") || "",
  );
  const [tempClientName, setTempClientName] = useState<string>("");
  const [showClientNameDialog, setShowClientNameDialog] = useState(false);
  const [requestingTabType, setRequestingTabType] = useState<
    "bookings" | "favorites" | null
  >(null);
  const [bookingNights, setBookingNights] = useState(3);
  const [bookingGuests, setBookingGuests] = useState(2);
  const [bookingSpecialRequests, setBookingSpecialRequests] = useState("");
  const [bookingPaymentMethod, setBookingPaymentMethod] =
    useState("credit_card");
  const [showNavbar, setShowNavbar] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [displayedProperties, setDisplayedProperties] = useState<Property[]>(
    [],
  );
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("recommended");
  const [bookings, setBookings] = useState<Booking[]>([]);

  // ─── Search History & Suggestions ──────────────────────────────────────────
  const SEARCH_HISTORY_KEY = "reservations_search_history";
  const MAX_HISTORY = 10;

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]");
    } catch { return []; }
  });
  const [showSuggestions, setShowSuggestions] = useState(false);

  const addToSearchHistory = useCallback((query: string) => {
    if (!query.trim()) return;
    setSearchHistory((prev) => {
      const filtered = prev.filter((q) => q.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, MAX_HISTORY);
      localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    localStorage.removeItem(SEARCH_HISTORY_KEY);
  }, []);

  const searchSuggestions = searchQuery.trim()
    ? searchHistory.filter((h) =>
        h.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : searchHistory.slice(0, 5);

  // ─── Browse Time Limit for unauthenticated users ──────────────────────────
  const BROWSE_LIMIT_SECONDS = 10 * 60; // 10 minutes
  const BROWSE_START_KEY = "reservations_browse_start";

  const isAuthenticated = !!localStorage.getItem("auth_token") || !!localStorage.getItem("authToken");

  const [browseTimeLeft, setBrowseTimeLeft] = useState<number>(() => {
    if (isAuthenticated) return Infinity;
    const start = localStorage.getItem(BROWSE_START_KEY);
    if (!start) {
      localStorage.setItem(BROWSE_START_KEY, String(Date.now()));
      return BROWSE_LIMIT_SECONDS;
    }
    const elapsed = Math.floor((Date.now() - Number(start)) / 1000);
    return Math.max(0, BROWSE_LIMIT_SECONDS - elapsed);
  });
  const [browseExpired, setBrowseExpired] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;
    const interval = setInterval(() => {
      const start = Number(localStorage.getItem(BROWSE_START_KEY) || Date.now());
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const remaining = Math.max(0, BROWSE_LIMIT_SECONDS - elapsed);
      setBrowseTimeLeft(remaining);
      if (remaining <= 0) {
        setBrowseExpired(true);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Persist favorites to localStorage whenever they change
  useEffect(() => {
    if (clientName) {
      localStorage.setItem(`favorites_${clientName}`, JSON.stringify(favorites));
    }
  }, [favorites, clientName]);

  // New state variables for enhanced search
  const [dwellingType, setDwellingType] = useState<string>("all");
  const [lengthOfStay, setLengthOfStay] = useState<number | null>(null);
  const [arrivalTime, setArrivalTime] = useState<string>("15:00");
  const [departureTime, setDepartureTime] = useState<string>("11:00");

  // Calculate length of stay when dates change
  useEffect(() => {
    if (checkInDate && checkOutDate) {
      const start = new Date(checkInDate);
      const end = new Date(checkOutDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setLengthOfStay(diffDays);
    } else {
      setLengthOfStay(null);
    }
  }, [checkInDate, checkOutDate]);

  // Mock properties data
  const mockProperties: Property[] = [
    {
      id: "1",
      name: "Luxury Abidjan Villa",
      description:
        "Modern 4-bedroom villa with infinity pool, smart home technology, and panoramic city views in exclusive Cocody neighborhood.",
      image:
        "https://images.unsplash.com/photo-1613977257363-707ba9348227?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1613977257363-707ba9348227?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1568605114967-8130f3a36994?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      ],
      type: "Villa",
      category: "luxury",
      location: "Cocody, Abidjan",
      price: 450,
      rating: 4.9,
      reviews: 127,
      bedrooms: 4,
      bathrooms: 3,
      area: 320,
      guests: 8,
      amenities: [
        "Infinity Pool",
        "Smart Home",
        "WiFi 6",
        "AC",
        "Parking",
        "Gourmet Kitchen",
        "Home Theater",
        "Gym",
      ],
      host: {
        name: "Alain Doumbia",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alain",
        superhost: true,
        verified: true,
        responseRate: 98,
        responseTime: "Within an hour",
      },
      verified: true,
      instantBook: true,
      freeCancellation: true,
      discount: 15,
      featured: true,
      tags: ["Luxury", "Pool", "City View", "Smart Home"],
      availability: 85,
      checkIn: "14:00",
      checkOut: "11:00",
      minimumStay: 3,
      maximumStay: 30,
      latitude: 5.3599517,
      longitude: -3.9746496,
    },
    {
      id: "2",
      name: "Seaside Paradise Grand-Bassam",
      description:
        "Beachfront apartment with direct ocean access, private terrace, and breathtaking sunset views.",
      image:
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1494526585095-c41746248156?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      ],
      type: "Apartment",
      category: "beachfront",
      location: "Grand-Bassam",
      price: 280,
      rating: 4.7,
      reviews: 89,
      bedrooms: 2,
      bathrooms: 2,
      area: 110,
      guests: 4,
      amenities: [
        "Beachfront",
        "Private Terrace",
        "WiFi",
        "AC",
        "Kitchen",
        "BBQ",
      ],
      host: {
        name: "Marie Koné",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie",
        superhost: true,
        verified: true,
        responseRate: 95,
        responseTime: "Within 2 hours",
      },
      verified: true,
      instantBook: true,
      freeCancellation: true,
      discount: 10,
      featured: true,
      tags: ["Beachfront", "Romantic", "Ocean View"],
      availability: 92,
      checkIn: "15:00",
      checkOut: "10:00",
      minimumStay: 2,
      maximumStay: 21,
      latitude: 5.200178,
      longitude: -3.736099,
    },
    {
      id: "3",
      name: "Modern Apartment Marcory",
      description:
        "Contemporary apartment in vibrant Marcory neighborhood with modern design and balcony.",
      image:
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      ],
      type: "Apartment",
      category: "urban",
      location: "Marcory, Abidjan",
      price: 95,
      rating: 4.4,
      reviews: 78,
      bedrooms: 2,
      bathrooms: 1,
      area: 85,
      guests: 4,
      amenities: [
        "Balcony",
        "Modern Kitchen",
        "WiFi",
        "AC",
        "Parking",
        "Smart TV",
      ],
      host: {
        name: "Koffi Yao",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Koffi",
        superhost: false,
        verified: true,
        responseRate: 85,
        responseTime: "Within 6 hours",
      },
      verified: true,
      instantBook: true,
      freeCancellation: true,
      discount: 8,
      featured: false,
      tags: ["Modern", "Urban", "Balcony"],
      availability: 81,
      checkIn: "14:00",
      checkOut: "11:00",
      minimumStay: 2,
      maximumStay: 60,
      latitude: 5.296032,
      longitude: -3.969229,
    },
    {
      id: "4",
      name: "Mountain Retreat Man",
      description:
        "Secluded mountain cabin with breathtaking views, fireplace, and access to hiking trails.",
      image:
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      ],
      type: "Cabin",
      category: "mountain",
      location: "Man",
      price: 120,
      rating: 4.7,
      reviews: 35,
      bedrooms: 2,
      bathrooms: 1,
      area: 75,
      guests: 4,
      amenities: [
        "Mountain View",
        "Fireplace",
        "Hiking Trails",
        "WiFi",
        "Kitchen",
        "BBQ",
      ],
      host: {
        name: "David Guéi",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=David",
        superhost: true,
        verified: true,
        responseRate: 90,
        responseTime: "Within 3 hours",
      },
      verified: true,
      instantBook: true,
      freeCancellation: true,
      discount: 12,
      featured: true,
      tags: ["Mountain", "Secluded", "Nature"],
      availability: 68,
      checkIn: "15:00",
      checkOut: "11:00",
      minimumStay: 2,
      maximumStay: 21,
      latitude: 7.4125,
      longitude: -7.5538,
    },
    {
      id: "5",
      name: "Executive Business Suite Plateau",
      description:
        "Modern executive suite in Abidjan's financial district with high-speed internet and workspace.",
      image:
        "https://images.unsplash.com/photo-1529408632839-a54952c491e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1529408632839-a54952c491e5?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      ],
      type: "Studio",
      category: "business",
      location: "Plateau, Abidjan",
      price: 180,
      rating: 4.5,
      reviews: 156,
      bedrooms: 1,
      bathrooms: 1,
      area: 65,
      guests: 2,
      amenities: [
        "High-speed WiFi",
        "Workspace",
        "AC",
        "Printer",
        "Coffee Machine",
        "City View",
      ],
      host: {
        name: "Sarah Toure",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        superhost: true,
        verified: true,
        responseRate: 99,
        responseTime: "Within 30 minutes",
      },
      verified: true,
      instantBook: true,
      freeCancellation: true,
      discount: 5,
      featured: false,
      tags: ["Business", "City Center", "Executive"],
      availability: 78,
      checkIn: "13:00",
      checkOut: "11:00",
      minimumStay: 1,
      maximumStay: 90,
      latitude: 5.322111,
      longitude: -4.019056,
    },
    {
      id: "6",
      name: "Eco-Lodge Assinie",
      description:
        "Sustainable eco-lodge nestled in natural surroundings with solar power and organic garden.",
      image:
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      ],
      type: "Eco-Lodge",
      category: "eco",
      location: "Assinie",
      price: 150,
      rating: 4.6,
      reviews: 42,
      bedrooms: 2,
      bathrooms: 1,
      area: 90,
      guests: 4,
      amenities: [
        "Solar Power",
        "Organic Garden",
        "WiFi",
        "Compost Toilet",
        "Outdoor Shower",
        "Yoga Deck",
      ],
      host: {
        name: "EcoStay CI",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=EcoStay",
        superhost: true,
        verified: true,
        responseRate: 92,
        responseTime: "Within 4 hours",
      },
      verified: true,
      instantBook: true,
      freeCancellation: true,
      discount: 0,
      featured: true,
      tags: ["Eco-Friendly", "Sustainable", "Nature"],
      availability: 72,
      checkIn: "16:00",
      checkOut: "10:00",
      minimumStay: 3,
      maximumStay: 14,
      latitude: 5.1167,
      longitude: -3.2833,
    },
    {
      id: "7",
      name: "Hotel Ivoire Presidential Suite",
      description:
        "Luxurious 5-star hotel suite with panoramic lagoon views and butler service.",
      image:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      ],
      type: "Hotel",
      category: "luxury",
      location: "Zone 3, Abidjan",
      price: 650,
      rating: 4.9,
      reviews: 203,
      bedrooms: 1,
      bathrooms: 2,
      area: 120,
      guests: 2,
      amenities: [
        "Butler Service",
        "Spa Access",
        "Pool",
        "WiFi",
        "AC",
        "Room Service",
        "Gym",
        "Restaurants",
      ],
      host: {
        name: "Hotel Ivoire",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=HotelIvoire",
        superhost: true,
        verified: true,
        responseRate: 100,
        responseTime: "24/7",
      },
      verified: true,
      instantBook: true,
      freeCancellation: true,
      discount: 20,
      featured: true,
      tags: ["Luxury", "Hotel", "Suite", "Lagoon View"],
      availability: 88,
      checkIn: "15:00",
      checkOut: "12:00",
      minimumStay: 1,
      maximumStay: 30,
      latitude: 5.3197,
      longitude: -4.0281,
    },
    {
      id: "8",
      name: "Traditional Yamoussoukro House",
      description:
        "Authentic Ivorian palace-style accommodation with traditional architecture.",
      image:
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      images: [
        "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
      ],
      type: "Traditional House",
      category: "cultural",
      location: "Yamoussoukro",
      price: 320,
      rating: 4.8,
      reviews: 64,
      bedrooms: 3,
      bathrooms: 2,
      area: 280,
      guests: 6,
      amenities: [
        "Traditional Architecture",
        "Gardens",
        "WiFi",
        "AC",
        "Courtyard",
        "Cultural Tours",
      ],
      host: {
        name: "Chief Diabaté",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Chief",
        superhost: true,
        verified: true,
        responseRate: 88,
        responseTime: "Within a day",
      },
      verified: true,
      instantBook: false,
      freeCancellation: true,
      discount: 10,
      featured: false,
      tags: ["Traditional", "Cultural", "Palace", "Historical"],
      availability: 65,
      checkIn: "14:00",
      checkOut: "11:00",
      minimumStay: 2,
      maximumStay: 14,
      latitude: 6.8276,
      longitude: -5.2893,
    },
  ];

  // Initialize properties
  useEffect(() => {
    setAllProperties(mockProperties);
    setDisplayedProperties(mockProperties.slice(0, 6));
  }, []);

  // Handle client name submission
  const handleClientNameSubmit = () => {
    if (tempClientName.trim()) {
      localStorage.setItem("clientName", tempClientName);
      setClientName(tempClientName);
      // Load persisted favorites for this user
      try {
        const saved = JSON.parse(localStorage.getItem(`favorites_${tempClientName}`) || "[]");
        setFavorites(saved);
      } catch { /* ignore */ }
      setShowClientNameDialog(false);
      setTempClientName("");
      if (requestingTabType) {
        setActiveTab(requestingTabType);
        setRequestingTabType(null);
      }
    }
  };

  // Handle tab trigger with name check
  const handleTabTrigger = (tabValue: string) => {
    if ((tabValue === "bookings" || tabValue === "favorites") && !clientName) {
      setRequestingTabType(tabValue as "bookings" | "favorites");
      setShowClientNameDialog(true);
      setTempClientName("");
    } else {
      setActiveTab(tabValue);
    }
  };

  // Handle scroll for navbar
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setShowNavbar(false);
      } else {
        setShowNavbar(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  // Fetch properties from API
  const { data: apiProperties, isLoading: propertiesLoading } = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/properties`);
        if (!response.ok) throw new Error("Failed to fetch properties");
        return response.json();
      } catch (error) {
        console.error("Error fetching properties:", error);
        return { success: false, data: mockProperties };
      }
    },
    enabled: true,
  });

  // Update properties from API when data loads
  useEffect(() => {
    if (apiProperties) {
      const propertiesToUse =
        apiProperties.data || apiProperties || mockProperties;
      setAllProperties(propertiesToUse);
      setDisplayedProperties(propertiesToUse.slice(0, 6));
    }
  }, [apiProperties]);

  // Filter properties based on search criteria
  const filteredProperties = useCallback(() => {
    return allProperties.filter((property) => {
      // Search query filter
      const matchesSearch =
        searchQuery === "" ||
        (property.name ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (property.description ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        (property.location ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      // Location filter
      const matchesLocation =
        locationQuery === "" ||
        property.location.toLowerCase().includes(locationQuery.toLowerCase());

      // Price filter
      const matchesPrice =
        property.price >= priceRange[0] && property.price <= priceRange[1];

      // Rating filter
      const matchesRating = property.rating >= minRating;

      // Property type filter
      const matchesType =
        selectedPropertyTypes.length === 0 ||
        selectedPropertyTypes.includes(property.type);

      // Amenities filter
      const matchesAmenities =
        selectedAmenities.length === 0 ||
        selectedAmenities.every((amenity) =>
          property.amenities.includes(amenity),
        );

      // Dwelling type filter
      const matchesDwellingType =
        dwellingType === "all" || property.type === dwellingType;

      // Minimum stay filter
      const matchesMinimumStay =
        lengthOfStay === null || lengthOfStay >= property.minimumStay;

      // Maximum stay filter
      const matchesMaximumStay =
        lengthOfStay === null || lengthOfStay <= property.maximumStay;

      return (
        matchesSearch &&
        matchesLocation &&
        matchesPrice &&
        matchesRating &&
        matchesType &&
        matchesAmenities &&
        matchesDwellingType &&
        matchesMinimumStay &&
        matchesMaximumStay
      );
    });
  }, [
    searchQuery,
    locationQuery,
    priceRange,
    minRating,
    selectedPropertyTypes,
    selectedAmenities,
    allProperties,
    dwellingType,
    lengthOfStay,
  ]);

  // Sort properties
  const sortedProperties = useCallback(() => {
    const properties = filteredProperties();

    switch (sortBy) {
      case "price-low":
        return [...properties].sort((a, b) => a.price - b.price);
      case "price-high":
        return [...properties].sort((a, b) => b.price - a.price);
      case "rating":
        return [...properties].sort((a, b) => b.rating - a.rating);
      case "popular":
        return [...properties].sort((a, b) => b.reviews - a.reviews);
      default:
        return properties;
    }
  }, [filteredProperties, sortBy]);

  // Load more properties
  const loadMoreProperties = () => {
    setLoadingMore(true);
    setTimeout(() => {
      const allSorted = sortedProperties();
      const nextPage = currentPage + 1;
      const nextProperties = allSorted.slice(0, nextPage * 6);
      setDisplayedProperties(nextProperties);
      setCurrentPage(nextPage);
      setLoadingMore(false);
    }, 500);
  };

  // Handle search
  const handleSearch = () => {
    setIsSearching(true);
    if (searchQuery.trim()) addToSearchHistory(searchQuery.trim());
    setShowSuggestions(false);
    const results = sortedProperties();
    setDisplayedProperties(results.slice(0, 6));
    setCurrentPage(1);
    setTimeout(() => setIsSearching(false), 500);
  };

  // Toggle favorite
  const toggleFavorite = (propertyId: string) => {
    setFavorites((prev) =>
      prev.includes(propertyId)
        ? prev.filter((id) => id !== propertyId)
        : [...prev, propertyId],
    );
  };

  // Handle booking
  const handleBookProperty = (property: Property) => {
    setBookingProperty(property);
    setBookingGuests(property.guests > 2 ? 2 : property.guests);
    setBookingNights(lengthOfStay || 3);
    setShowBookingModal(true);
  };

  // Submit booking
  const submitBooking = () => {
    // Validation 1: Required fields
    if (!bookingProperty || !checkInDate || !checkOutDate) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    // Validation 2: Check-out must be after check-in
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (checkOut <= checkIn) {
      toast({
        title: "Invalid dates",
        description: "Check-out date must be after check-in date",
        variant: "destructive",
      });
      return;
    }

    // Validation 3: Minimum stay requirement
    if (
      bookingProperty.minimumStay &&
      lengthOfStay &&
      lengthOfStay < bookingProperty.minimumStay
    ) {
      toast({
        title: "Minimum stay not met",
        description: `This property requires a minimum stay of ${bookingProperty.minimumStay} night${bookingProperty.minimumStay > 1 ? "s" : ""}`,
        variant: "destructive",
      });
      return;
    }

    // Validation 4: Guest count
    if (bookingGuests > bookingProperty.guests) {
      toast({
        title: "Too many guests",
        description: `This property can accommodate a maximum of ${bookingProperty.guests} guests`,
        variant: "destructive",
      });
      return;
    }

    if (bookingGuests < 1) {
      toast({
        title: "Invalid guest count",
        description: "At least 1 guest is required",
        variant: "destructive",
      });
      return;
    }

    // Validation 5: Check for conflicting bookings
    const dateConflict = bookings.some((booking) => {
      const existingCheckIn = new Date(booking.checkIn);
      const existingCheckOut = new Date(booking.checkOut);

      // Only check non-cancelled bookings
      if (booking.status === "cancelled") return false;

      // Check if new booking overlaps with existing booking
      return checkIn < existingCheckOut && checkOut > existingCheckIn;
    });

    if (dateConflict) {
      toast({
        title: "Dates not available",
        description:
          "These dates are not available. Please select different dates.",
        variant: "destructive",
      });
      return;
    }

    // Calculate final price with discount
    const nights = lengthOfStay || 1;
    const basePrice = bookingProperty.price * nights;
    const discount =
      bookingProperty.discount > 0
        ? (basePrice * bookingProperty.discount) / 100
        : 0;
    const finalPrice = basePrice - discount;

    const newBooking: Booking = {
      id: Date.now().toString(),
      propertyId: bookingProperty.id,
      propertyName: bookingProperty.name,
      propertyImage: bookingProperty.image,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: bookingGuests,
      totalPrice: finalPrice,
      status: "pending",
      bookingDate: new Date().toISOString().split("T")[0],
    };

    setBookings((prev) => [newBooking, ...prev]);
    setShowBookingModal(false);

    // Reset form
    setCheckInDate("");
    setCheckOutDate("");
    setBookingGuests(2);
    setBookingSpecialRequests("");
    setBookingPaymentMethod("credit_card");

    toast({
      title: "Booking submitted!",
      description: `Your ${nights}-night reservation for ${bookingProperty.name} has been submitted for $${finalPrice.toFixed(2)}. Status: Pending confirmation.`,
    });
  };

  // Toggle amenity selection
  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity],
    );
  };

  // Toggle property type
  const togglePropertyType = (type: string) => {
    setSelectedPropertyTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  // All available amenities
  const allAmenities = [
    "WiFi",
    "AC",
    "Pool",
    "Parking",
    "Gym",
    "Kitchen",
    "Washer",
    "Dryer",
    "TV",
    "Fireplace",
    "BBQ",
    "Balcony",
    "Terrace",
    "Garden",
    "Beachfront",
    "Mountain View",
    "City View",
    "Ocean View",
    "Spa",
    "Breakfast",
  ];

  // All property types
  const propertyTypes = [
    "Villa",
    "Apartment",
    "Cabin",
    "Studio",
    "Eco-Lodge",
    "Hotel",
    "Traditional House",
  ];

  // Dwelling types for dropdown
  const dwellingTypes = [
    { value: "all", label: "All Types" },
    { value: "Villa", label: "Villa" },
    { value: "Apartment", label: "Apartment" },
    { value: "Cabin", label: "Cabin" },
    { value: "Studio", label: "Studio" },
    { value: "Eco-Lodge", label: "Eco-Lodge" },
    { value: "Hotel", label: "Hotel" },
    { value: "Traditional House", label: "Traditional House" },
  ];

  return (
    <div
      className={`min-h-screen ${darkMode ? "dark bg-gray-900" : "bg-gray-50"}`}
    >
      {/* Simplified Header - Only search and filters */}
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: showNavbar ? 0 : -150 }}
        transition={{ duration: 0.3 }}
        className={`sticky top-0 z-50 border-b ${
          darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <div className="container mx-auto px-4 py-4">
          {/* Quick Navigation */}
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            <Link href="/">
              <Button
                size="sm"
                variant="ghost"
                className={`text-xs gap-1.5 ${darkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
              >
                <Home className="h-3.5 w-3.5" /> Accueil
              </Button>
            </Link>
            <Link href="/logement">
              <Button
                size="sm"
                variant="ghost"
                className={`text-xs gap-1.5 ${darkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
              >
                <Home className="h-3.5 w-3.5" /> Logement
              </Button>
            </Link>
            <Link href="/businesses-directory">
              <Button
                size="sm"
                variant="ghost"
                className={`text-xs gap-1.5 ${darkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
              >
                <Building className="h-3.5 w-3.5" /> Annuaire
              </Button>
            </Link>
            <Link href="/hotellerie">
              <Button
                size="sm"
                variant="ghost"
                className={`text-xs gap-1.5 ${darkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
              >
                <Hotel className="h-3.5 w-3.5" /> Hôtellerie
              </Button>
            </Link>
            <Link href="/geo-admin">
              <Button
                size="sm"
                variant="ghost"
                className={`text-xs gap-1.5 ${darkMode ? "text-gray-300 hover:text-white" : "text-gray-600 hover:text-gray-900"}`}
              >
                <Globe className="h-3.5 w-3.5" /> Geo Admin
              </Button>
            </Link>
          </div>
          {/* Enhanced Search Bar */}
          <div
            className={`rounded-2xl p-6 ${
              darkMode ? "bg-gray-800" : "bg-white"
            } shadow-lg`}
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="location"
                    placeholder="Where are you going?"
                    value={locationQuery}
                    onChange={(e) => setLocationQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dates">Dates</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      placeholder="Check-in"
                      value={checkInDate}
                      onChange={(e) => setCheckInDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="date"
                      placeholder="Check-out"
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                {lengthOfStay && (
                  <div className="text-sm text-green-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lengthOfStay} night{lengthOfStay !== 1 ? "s" : ""} stay
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="guests">Guests</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGuests(Math.max(1, guests - 1))}
                      className="h-6 w-6 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-sm">{guests}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setGuests(guests + 1)}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Users className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="guests"
                    type="number"
                    min="1"
                    max="20"
                    value={guests}
                    onChange={(e) => setGuests(parseInt(e.target.value) || 1)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dwelling-type">Type of Dwelling</Label>
                <Select value={dwellingType} onValueChange={setDwellingType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {dwellingTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second row of search options */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="arrival-time">Arrival Time</Label>
                <Select value={arrivalTime} onValueChange={setArrivalTime}>
                  <SelectTrigger>
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Arrival time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="13:00">1:00 PM</SelectItem>
                    <SelectItem value="14:00">2:00 PM</SelectItem>
                    <SelectItem value="15:00">3:00 PM</SelectItem>
                    <SelectItem value="16:00">4:00 PM</SelectItem>
                    <SelectItem value="17:00">5:00 PM</SelectItem>
                    <SelectItem value="18:00">6:00 PM</SelectItem>
                    <SelectItem value="19:00">7:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="departure-time">Departure Time</Label>
                <Select value={departureTime} onValueChange={setDepartureTime}>
                  <SelectTrigger>
                    <Clock className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Departure time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="08:00">8:00 AM</SelectItem>
                    <SelectItem value="09:00">9:00 AM</SelectItem>
                    <SelectItem value="10:00">10:00 AM</SelectItem>
                    <SelectItem value="11:00">11:00 AM</SelectItem>
                    <SelectItem value="12:00">12:00 PM</SelectItem>
                    <SelectItem value="13:00">1:00 PM</SelectItem>
                    <SelectItem value="14:00">2:00 PM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="search-query">Property Name/Keyword</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search-query"
                    placeholder="Search properties..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSearch();
                    }}
                    className="pl-10"
                  />

                  {/* Search suggestions dropdown */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-30 max-h-48 overflow-y-auto">
                      <div className="flex items-center justify-between px-3 py-1.5 border-b">
                        <span className="text-xs text-gray-500 font-medium">Recent Searches</span>
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={clearSearchHistory}
                          className="text-xs text-red-400 hover:text-red-600"
                        >
                          Clear
                        </button>
                      </div>
                      {searchSuggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setSearchQuery(suggestion);
                            setShowSuggestions(false);
                            handleSearch();
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm flex items-center gap-2"
                        >
                          <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-end space-x-2">
                <Button
                  onClick={handleSearch}
                  className="w-full"
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </div>
            </div>

            {/* Filters - Enhanced with more options */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-6 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t">
                    <div>
                      <Label className="mb-4 block">Price Range</Label>
                      <div className="space-y-4">
                        <Slider
                          value={priceRange}
                          onValueChange={setPriceRange}
                          max={1000}
                          step={10}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm">
                          <span>${priceRange[0]}</span>
                          <span>${priceRange[1]}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="mb-4 block">Minimum Rating</Label>
                      <div className="flex items-center space-x-2">
                        {[0, 3, 4, 4.5].map((rating) => (
                          <Button
                            key={rating}
                            variant={
                              minRating === rating ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setMinRating(rating)}
                            className="gap-1"
                          >
                            <Star className="h-3 w-3 fill-current" />
                            {rating === 0 ? "Any" : rating}+
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="mb-4 block">Sort By</Label>
                      <Select value={sortBy} onValueChange={setSortBy}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="recommended">
                            Recommended
                          </SelectItem>
                          <SelectItem value="price-low">
                            Price: Low to High
                          </SelectItem>
                          <SelectItem value="price-high">
                            Price: High to Low
                          </SelectItem>
                          <SelectItem value="rating">Highest Rated</SelectItem>
                          <SelectItem value="popular">Most Popular</SelectItem>
                          <SelectItem value="bedrooms">
                            Most Bedrooms
                          </SelectItem>
                          <SelectItem value="area">Largest Area</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <Label className="mb-4 block">Property Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {propertyTypes.map((type) => (
                        <Badge
                          key={type}
                          variant={
                            selectedPropertyTypes.includes(type)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => togglePropertyType(type)}
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <Label className="mb-4 block">Amenities</Label>
                    <ScrollArea className="h-32">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {allAmenities.map((amenity) => (
                          <div
                            key={amenity}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`amenity-${amenity}`}
                              checked={selectedAmenities.includes(amenity)}
                              onCheckedChange={() => toggleAmenity(amenity)}
                            />
                            <Label
                              htmlFor={`amenity-${amenity}`}
                              className="text-sm cursor-pointer"
                            >
                              {amenity}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  <div className="mt-6 flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setPriceRange([0, 1000]);
                        setMinRating(0);
                        setSelectedAmenities([]);
                        setSelectedPropertyTypes([]);
                        setDwellingType("all");
                        setArrivalTime("15:00");
                        setDepartureTime("11:00");
                      }}
                    >
                      Clear All
                    </Button>
                    <Button onClick={handleSearch}>Apply Filters</Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}

      {/* Browse time limit banner for unauthenticated users */}
      {!isAuthenticated && !browseExpired && browseTimeLeft < 300 && (
        <div className="bg-amber-500/90 text-white text-center py-2 px-4 text-sm sticky top-0 z-40">
          <Clock className="inline h-4 w-4 mr-1" />
          Browse time remaining: {Math.floor(browseTimeLeft / 60)}:{String(browseTimeLeft % 60).padStart(2, "0")}
          {" — "}
          <a href="/auth/signin" className="underline font-semibold">Sign in</a> for unlimited access
        </div>
      )}

      {/* Browse expired overlay */}
      {browseExpired && !isAuthenticated && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
            <Clock className="h-16 w-16 mx-auto text-amber-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Browse Time Expired</h2>
            <p className="text-gray-600 mb-6">
              Your 10-minute preview has ended. Sign in to continue browsing, save favorites, and make reservations.
            </p>
            <div className="space-y-3">
              <a
                href="/auth/signin"
                className="block w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Sign In to Continue
              </a>
              <a
                href="/pricing"
                className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                View Plans
              </a>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">
              {activeTab === "properties" && "Featured Properties"}
              {activeTab === "bookings" && "My Bookings"}
              {activeTab === "favorites" && "Favorites"}
            </h2>
            <p className="text-gray-500">
              {activeTab === "properties" &&
                `${sortedProperties().length} properties found`}
              {activeTab === "bookings" && `${bookings.length} bookings`}
              {activeTab === "favorites" &&
                `${favorites.length} saved properties`}
            </p>
          </div>

          {activeTab === "properties" && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Showing {displayedProperties.length} of{" "}
                {sortedProperties().length}
              </span>
            </div>
          )}
        </div>

        {/* Content Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full md:w-auto grid-cols-3">
            <TabsTrigger value="properties" className="gap-2">
              <Home className="h-4 w-4" />
              Properties
            </TabsTrigger>
            <TabsTrigger
              value="bookings"
              className="gap-2"
              onClick={() => handleTabTrigger("bookings")}
              disabled={false}
            >
              <Calendar className="h-4 w-4" />
              Bookings
            </TabsTrigger>
            <TabsTrigger
              value="favorites"
              className="gap-2"
              onClick={() => handleTabTrigger("favorites")}
              disabled={false}
            >
              <Heart className="h-4 w-4" />
              Favorites
            </TabsTrigger>
          </TabsList>

          {/* Properties Tab */}
          <TabsContent value="properties" className="space-y-6">
            {propertiesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-0">
                      <Skeleton className="h-48 w-full rounded-t-lg" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : displayedProperties.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No properties found
                  </h3>
                  <p className="text-gray-500">
                    Try adjusting your search filters
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedProperties.map((property) => (
                    <motion.div
                      key={property.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card
                        className={`overflow-hidden hover:shadow-xl transition-shadow duration-300 ${
                          darkMode ? "bg-gray-800" : ""
                        }`}
                      >
                        <div className="relative">
                          <img
                            src={property.image}
                            alt={property.name}
                            className="w-full h-48 object-cover"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                            onClick={() => toggleFavorite(property.id)}
                          >
                            <Heart
                              className={`h-5 w-5 ${
                                favorites.includes(property.id)
                                  ? "fill-red-500 text-red-500"
                                  : ""
                              }`}
                            />
                          </Button>
                          {property.featured && (
                            <Badge className="absolute top-2 left-2 bg-gradient-to-r from-blue-600 to-purple-600">
                              Featured
                            </Badge>
                          )}
                          {property.discount > 0 && (
                            <Badge className="absolute bottom-2 right-2 bg-red-500">
                              -{property.discount}%
                            </Badge>
                          )}
                        </div>

                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold text-lg mb-1">
                                {property.name}
                              </h3>
                              <div className="flex items-center text-sm text-gray-500">
                                <MapPin className="h-3 w-3 mr-1" />
                                {property.location}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-semibold">
                                  {property.rating}
                                </span>
                                <span className="text-gray-500">
                                  ({property.reviews})
                                </span>
                              </div>
                            </div>
                          </div>

                          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                            {property.description}
                          </p>

                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-4 text-sm">
                              <div className="flex items-center gap-1">
                                <Bed className="h-4 w-4" />
                                <span>{property.bedrooms}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Bath className="h-4 w-4" />
                                <span>{property.bathrooms}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                <span>{property.guests}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Ruler className="h-4 w-4" />
                                <span>{property.area}m²</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1 mb-4">
                            {(property.tags ?? []).slice(0, 3).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xl font-bold">
                                ${property.price}
                              </span>
                              <span className="text-gray-500 text-sm">
                                {" "}
                                / night
                              </span>
                              {lengthOfStay && (
                                <div className="text-sm text-green-600">
                                  ${property.price * lengthOfStay} total
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedProperty(property.id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleBookProperty(property)}
                                disabled={!checkInDate || !checkOutDate}
                              >
                                <Calendar className="h-4 w-4 mr-1" />
                                Book
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {displayedProperties.length < sortedProperties().length && (
                  <div className="text-center mt-8">
                    <Button
                      onClick={loadMoreProperties}
                      disabled={loadingMore}
                      className="px-8"
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          Load More Properties
                          <ChevronDown className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <Card className={darkMode ? "bg-gray-800" : ""}>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
                <CardDescription>
                  Manage your upcoming and past reservations
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No bookings yet
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Start exploring and book your perfect stay
                    </p>
                    <Button onClick={() => setActiveTab("properties")}>
                      Browse Properties
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Property</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Guests</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bookings.slice(0, 5).map((booking) => (
                        <TableRow key={booking.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <img
                                src={booking.propertyImage}
                                alt={booking.propertyName}
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                              <div>
                                <div className="font-medium">
                                  {booking.propertyName}
                                </div>
                                <div className="text-sm text-gray-500">
                                  Booked on {booking.bookingDate}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>Check-in: {booking.checkIn}</span>
                              <span>Check-out: {booking.checkOut}</span>
                            </div>
                          </TableCell>
                          <TableCell>{booking.guests} guests</TableCell>
                          <TableCell className="font-semibold">
                            ${booking.totalPrice}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                booking.status === "confirmed"
                                  ? "default"
                                  : booking.status === "pending"
                                    ? "outline"
                                    : booking.status === "cancelled"
                                      ? "destructive"
                                      : "secondary"
                              }
                            >
                              {booking.status.charAt(0).toUpperCase() +
                                booking.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              {booking.status === "pending" && (
                                <Button variant="ghost" size="sm">
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {bookings.length > 5 && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Showing 5 of {bookings.length} bookings. Contact support
                      for full booking history.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allProperties
                .filter((property) => favorites.includes(property.id))
                .map((property) => (
                  <Card
                    key={property.id}
                    className={darkMode ? "bg-gray-800" : ""}
                  >
                    <img
                      src={property.image}
                      alt={property.name}
                      className="w-full h-48 object-cover rounded-t-lg"
                    />
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold">{property.name}</h3>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => toggleFavorite(property.id)}
                        >
                          <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mb-4">
                        {property.location}
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xl font-bold">
                            ${property.price}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {" "}
                            / night
                          </span>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleBookProperty(property)}
                          disabled={!checkInDate || !checkOutDate}
                        >
                          Book Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              {favorites.length === 0 && (
                <div className="col-span-3 text-center py-12">
                  <Heart className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">
                    No favorites yet
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Save properties you love by clicking the heart icon
                  </p>
                  <Button onClick={() => setActiveTab("properties")}>
                    Explore Properties
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Client Name Dialog for Bookings/Favorites */}
      <Dialog
        open={showClientNameDialog}
        onOpenChange={setShowClientNameDialog}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {requestingTabType === "bookings"
                ? "Verify Your Bookings"
                : "Verify Your Favorites"}
            </DialogTitle>
            <DialogDescription>
              Please provide your name to{" "}
              {requestingTabType === "bookings"
                ? "access your bookings"
                : "view your saved favorites"}
              . We'll remember this for your next visit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Name
              </label>
              <Input
                placeholder="Enter your full name"
                value={tempClientName}
                onChange={(e) => setTempClientName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleClientNameSubmit();
                  }
                }}
                className="w-full"
                autoFocus
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowClientNameDialog(false);
                  setTempClientName("");
                  setRequestingTabType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleClientNameSubmit}
                disabled={!tempClientName.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Continue
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Name Display & Logout */}
      {clientName && (
        <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Welcome, <span className="font-semibold">{clientName}</span>
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              localStorage.removeItem("clientName");
              setClientName("");
              setActiveTab("properties");
            }}
            className="text-xs text-gray-500 hover:text-red-600"
          >
            Switch User
          </Button>
        </div>
      )}

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Book {bookingProperty?.name}</DialogTitle>
            <DialogDescription>
              Complete your reservation details
            </DialogDescription>
          </DialogHeader>

          {bookingProperty && (
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <img
                  src={bookingProperty.image}
                  alt={bookingProperty.name}
                  className="h-32 w-32 rounded-lg object-cover"
                />
                <div>
                  <h3 className="font-semibold">{bookingProperty.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{bookingProperty.rating}</span>
                    <span className="text-gray-500">
                      ({bookingProperty.reviews} reviews)
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Bed className="h-4 w-4" />
                      <span>{bookingProperty.bedrooms} beds</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="h-4 w-4" />
                      <span>{bookingProperty.bathrooms} baths</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>Up to {bookingProperty.guests} guests</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <Label
                      htmlFor="checkin"
                      className="flex items-center gap-2 font-semibold"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" />
                      </svg>
                      Check-in
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Arrival date (from 2 PM)
                    </p>
                  </div>
                  <Input
                    id="checkin"
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="h-10 font-semibold"
                  />
                  {checkInDate && (
                    <div className="text-xs bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-2 rounded">
                      <p className="text-emerald-700 dark:text-emerald-400">
                        ✓{" "}
                        {new Date(checkInDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div>
                    <Label
                      htmlFor="checkout"
                      className="flex items-center gap-2 font-semibold"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" />
                      </svg>
                      Check-out
                    </Label>
                    <p className="text-xs text-gray-500 mt-1">
                      Departure date (before 11 AM)
                    </p>
                  </div>
                  <Input
                    id="checkout"
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    min={checkInDate || new Date().toISOString().split("T")[0]}
                    className="h-10 font-semibold"
                  />
                  {checkOutDate && (
                    <div className="text-xs bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 rounded">
                      <p className="text-blue-700 dark:text-blue-400">
                        ✓{" "}
                        {new Date(checkOutDate).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {lengthOfStay && (
                <div className="space-y-2">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          NIGHTS
                        </p>
                        <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                          {lengthOfStay}
                        </p>
                      </div>
                      <div className="flex items-center justify-center">
                        <svg
                          className="h-5 w-5 text-blue-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                          TOTAL STAY
                        </p>
                        <p className="text-lg font-bold text-indigo-700 dark:text-indigo-400">
                          {lengthOfStay} night{lengthOfStay !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                  {bookingProperty.minimumStay &&
                    lengthOfStay < bookingProperty.minimumStay && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg flex items-start gap-3">
                        <svg
                          className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <div>
                          <p className="font-semibold text-red-800 dark:text-red-300">
                            Minimum stay requirement
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-400">
                            This property requires {bookingProperty.minimumStay}{" "}
                            night
                            {bookingProperty.minimumStay > 1 ? "s" : ""} minimum
                          </p>
                        </div>
                      </div>
                    )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="guests">Number of Guests</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setBookingGuests(Math.max(1, bookingGuests - 1))
                    }
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="guests"
                    type="number"
                    min="1"
                    max={bookingProperty.guests}
                    value={bookingGuests}
                    onChange={(e) => setBookingGuests(parseInt(e.target.value))}
                    className="text-center"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      setBookingGuests(
                        Math.min(bookingProperty.guests, bookingGuests + 1),
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-gray-500 ml-2">
                    Max {bookingProperty.guests} guests
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requests">Special Requests</Label>
                <Textarea
                  id="requests"
                  placeholder="Any special requirements or requests?"
                  value={bookingSpecialRequests}
                  onChange={(e) => setBookingSpecialRequests(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <RadioGroup
                  value={bookingPaymentMethod}
                  onValueChange={setBookingPaymentMethod}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="flex items-center space-x-2 border rounded-lg p-4">
                    <RadioGroupItem value="credit_card" id="credit_card" />
                    <Label
                      htmlFor="credit_card"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4" />
                      Credit Card
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 border rounded-lg p-4">
                    <RadioGroupItem value="paypal" id="paypal" />
                    <Label
                      htmlFor="paypal"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <DollarSign className="h-4 w-4" />
                      PayPal
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>
                    ${bookingProperty.price} × {lengthOfStay || 1} night
                    {lengthOfStay !== 1 ? "s" : ""}
                  </span>
                  <span>${bookingProperty.price * (lengthOfStay || 1)}</span>
                </div>
                {bookingProperty.discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({bookingProperty.discount}%)</span>
                    <span>
                      -$
                      {(bookingProperty.price *
                        (lengthOfStay || 1) *
                        bookingProperty.discount) /
                        100}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>
                    $
                    {bookingProperty.discount > 0
                      ? (bookingProperty.price *
                          (lengthOfStay || 1) *
                          (100 - bookingProperty.discount)) /
                        100
                      : bookingProperty.price * (lengthOfStay || 1)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500">
                <ShieldCheck className="h-4 w-4" />
                <span>
                  Your booking is protected by our secure payment system
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBookingModal(false)}
            >
              Cancel
            </Button>
            <Button onClick={submitBooking}>
              <CreditCard className="mr-2 h-4 w-4" />
              Confirm Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
