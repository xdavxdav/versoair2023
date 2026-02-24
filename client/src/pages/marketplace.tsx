import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Heart,
  Share2,
  MessageCircle,
  Filter,
  X,
  MapPin,
  Clock,
  DollarSign,
  Plus,
} from "lucide-react";
import ScrollableNavbar from "@/components/ScrollableNavbar";

interface MarketplaceItem {
  id: number;
  title: string;
  price: number;
  image: string;
  category: string;
  seller: { name: string; avatar: string; rating: number };
  location: string;
  posted: string;
  description: string;
  condition: string;
  views: number;
  isFavorite?: boolean;
}

const mockItems: MarketplaceItem[] = [
  {
    id: 1,
    title: 'MacBook Pro 16" M2 Max',
    price: 1800,
    image:
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-4.0.3&w=400&h=300&fit=crop",
    category: "Electronics",
    seller: {
      name: "Alex Chen",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=100&h=100&fit=crop",
      rating: 4.8,
    },
    location: "San Francisco, CA",
    posted: "2 hours ago",
    description: "Barely used MacBook Pro with AppleCare+",
    condition: "Like New",
    views: 256,
  },
  {
    id: 2,
    title: "Vintage Leather Sofa",
    price: 450,
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?ixlib=rb-4.0.3&w=400&h=300&fit=crop",
    category: "Furniture",
    seller: {
      name: "Maria Rodriguez",
      avatar:
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?ixlib=rb-4.0.3&w=100&h=100&fit=crop",
      rating: 4.9,
    },
    location: "Oakland, CA",
    posted: "5 hours ago",
    description: "Beautiful vintage leather sofa, great condition",
    condition: "Good",
    views: 128,
  },
  {
    id: 3,
    title: "Canon EOS R6 Camera",
    price: 2200,
    image:
      "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?ixlib=rb-4.0.3&w=400&h=300&fit=crop",
    category: "Electronics",
    seller: {
      name: "James Park",
      avatar:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-4.0.3&w=100&h=100&fit=crop",
      rating: 4.7,
    },
    location: "Berkeley, CA",
    posted: "1 day ago",
    description: "Professional mirrorless camera with lenses",
    condition: "Excellent",
    views: 342,
  },
  {
    id: 4,
    title: "Mountain Bike - Trek Roscoe",
    price: 650,
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&w=400&h=300&fit=crop",
    category: "Sports & Outdoors",
    seller: {
      name: "Sarah Thompson",
      avatar:
        "https://images.unsplash.com/photo-1517841905240-3c0439c4b5fc?ixlib=rb-4.0.3&w=100&h=100&fit=crop",
      rating: 4.6,
    },
    location: "San Jose, CA",
    posted: "3 days ago",
    description: "2021 Trek Roscoe 7, well maintained",
    condition: "Very Good",
    views: 189,
  },
  {
    id: 5,
    title: "Design Consultation Service",
    price: 150,
    image:
      "https://images.unsplash.com/photo-1561070791-2526d30994b5?ixlib=rb-4.0.3&w=400&h=300&fit=crop",
    category: "Services",
    seller: {
      name: "Emma Watson",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&w=100&h=100&fit=crop",
      rating: 5.0,
    },
    location: "Remote",
    posted: "6 hours ago",
    description: "Professional UI/UX design consultation",
    condition: "Service",
    views: 95,
  },
];

const CATEGORIES = [
  "All",
  "Electronics",
  "Furniture",
  "Sports & Outdoors",
  "Services",
  "Fashion",
  "Home & Garden",
];
const CONDITIONS = [
  "All",
  "Like New",
  "Excellent",
  "Very Good",
  "Good",
  "Fair",
];

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedCondition, setSelectedCondition] = useState("All");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [items, setItems] = useState(mockItems);

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    const matchesCondition =
      selectedCondition === "All" || item.condition === selectedCondition;
    const matchesPrice =
      item.price >= priceRange[0] && item.price <= priceRange[1];

    return matchesSearch && matchesCategory && matchesCondition && matchesPrice;
  });

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((fav) => fav !== id) : [...prev, id],
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-handstyle">
      {/* Scroll-Aware Navbar */}
      <ScrollableNavbar
        isAuthenticated={true}
        userName="User"
        onLogout={() => {
          // Handle logout
        }}
      />

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-16 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-3xl font-bold text-white">Marketplace</h1>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="ml-auto flex items-center gap-2 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Sell Something
            </motion.button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-slate-400 hover:bg-white/10 transition-colors flex items-center gap-2"
            >
              <Filter className="w-5 h-5" />
              Filters
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-slate-900/50 border-b border-white/10 overflow-hidden"
          >
            <div className="max-w-7xl mx-auto px-4 py-4">
              <div className="grid md:grid-cols-3 gap-6">
                {/* Category Filter */}
                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase">
                    Category
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 rounded text-sm transition-all ${
                          selectedCategory === cat
                            ? "bg-cyan-500 text-white"
                            : "bg-white/5 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Condition Filter */}
                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase">
                    Condition
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {CONDITIONS.map((cond) => (
                      <button
                        key={cond}
                        onClick={() => setSelectedCondition(cond)}
                        className={`px-3 py-1 rounded text-sm transition-all ${
                          selectedCondition === cond
                            ? "bg-cyan-500 text-white"
                            : "bg-white/5 text-slate-400 hover:bg-white/10"
                        }`}
                      >
                        {cond}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="text-sm font-bold text-slate-300 mb-2 uppercase">
                    Price Range
                  </h3>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={priceRange[0]}
                        onChange={(e) =>
                          setPriceRange([Number(e.target.value), priceRange[1]])
                        }
                        placeholder="Min"
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm"
                      />
                      <input
                        type="number"
                        value={priceRange[1]}
                        onChange={(e) =>
                          setPriceRange([priceRange[0], Number(e.target.value)])
                        }
                        placeholder="Max"
                        className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm"
                      />
                    </div>
                    <p className="text-xs text-slate-500">
                      ${priceRange[0]} - ${priceRange[1]}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Results Count */}
        <p className="text-slate-400 mb-6">
          Showing {filteredItems.length} results
        </p>

        {filteredItems.length > 0 ? (
          <motion.div
            layout
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredItems.map((item, idx) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all"
              >
                {/* Image */}
                <div className="relative overflow-hidden h-48 bg-slate-800">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />

                  {/* Favorite Button */}
                  <motion.button
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => toggleFavorite(item.id)}
                    className="absolute top-3 right-3 p-2 bg-black/50 rounded-full backdrop-blur-sm hover:bg-black/70 transition-colors"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        favorites.includes(item.id)
                          ? "fill-red-500 text-red-500"
                          : "text-white"
                      }`}
                    />
                  </motion.button>

                  {/* Category Badge */}
                  <div className="absolute top-3 left-3 px-2 py-1 bg-black/50 rounded text-xs text-cyan-400 font-bold backdrop-blur-sm">
                    {item.category}
                  </div>

                  {/* Views Count */}
                  <div className="absolute bottom-3 right-3 text-xs text-slate-300 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                    {item.views} views
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold text-cyan-400">
                      ${item.price.toLocaleString()}
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${
                        item.condition === "Like New"
                          ? "bg-green-500/20 text-green-300"
                          : item.condition === "Excellent"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : item.condition === "Very Good"
                              ? "bg-blue-500/20 text-blue-300"
                              : item.condition === "Good"
                                ? "bg-yellow-500/20 text-yellow-300"
                                : "bg-orange-500/20 text-orange-300"
                      }`}
                    >
                      {item.condition}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-white mb-2 line-clamp-2 hover:text-cyan-400 transition-colors">
                    {item.title}
                  </h3>

                  {/* Description */}
                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                    {item.description}
                  </p>

                  {/* Location & Time */}
                  <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                    <MapPin className="w-3 h-3" />
                    {item.location}
                    <span className="ml-auto flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {item.posted}
                    </span>
                  </div>

                  {/* Seller Info */}
                  <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
                    <img
                      src={item.seller.avatar}
                      alt={item.seller.name}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <p className="text-xs font-bold text-white">
                        {item.seller.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        ⭐ {item.seller.rating} rating
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex-1 px-3 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors text-sm"
                    >
                      Contact Seller
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-3 py-2 bg-white/5 text-slate-400 rounded-lg hover:bg-white/10 transition-colors"
                    >
                      <Share2 className="w-4 h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-slate-400 text-lg">
              No items found matching your criteria
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
