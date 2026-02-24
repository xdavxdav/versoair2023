import { searchBusinesses, Business } from "@/lib/business-data";
import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Loader2,
  X,
  Building,
  Database,
  MapPin,
  Star,
  ChevronDown,
  CheckCircle,
  Phone,
  Check,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import ScrollToTop from "@/components/ScrollToTop";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Category groups for better visual hierarchy
const CATEGORY_GROUPS = {
  "Commerce & Retail": [
    "Commerce",
    "Shopping",
    "Retail Stores",
    "Supermarkets",
    "Markets",
    "Department Stores",
    "Fashion & Clothing",
    "Jewelry & Accessories",
    "Electronics & Technology",
    "Home & Garden",
    "Books & Media",
    "Sports & Outdoors",
  ],
  "Food & Beverage": [
    "Restaurants",
    "Fast Food",
    "Cafes",
    "Bakeries",
    "Bars & Pubs",
    "Coffee Shops",
    "Juice Bars",
    "Ice Cream Parlors",
  ],
  "Hospitality & Tourism": [
    "Hotels",
    "Hostels",
    "Resorts",
    "Lodges",
    "Tourism & Leisure",
    "Travel Agencies",
    "Tour Operators",
  ],
  "Construction & Real Estate": [
    "Building & Construction",
    "Construction Companies",
    "Construction Materials",
    "Architecture & Design",
    "Real Estate Agencies",
    "Property Management",
  ],
  "Automotive": [
    "Automotive & Motorbike",
    "Car Dealers",
    "Auto Repair",
    "Gas Stations",
    "Motorcycle Shops",
    "Car Rental",
  ],
  "Finance & Insurance": [
    "Finance",
    "Banks",
    "Insurance",
    "Investment Services",
    "Accounting",
  ],
  "Healthcare": [
    "Health",
    "Hospitals",
    "Clinics",
    "Medical Labs",
    "Pharmacies",
    "Dental Clinics",
    "Veterinary",
  ],
  "Education & Professional": [
    "Education",
    "Schools",
    "Universities",
    "Training Centers",
    "Libraries",
    "Professional Services",
  ],
  "Entertainment & Arts": [
    "Entertainment",
    "Cinemas",
    "Theaters",
    "Music Venues",
    "Art Galleries",
    "Museums",
    "Nightclubs",
    "Gaming",
  ],
  "Personal Services": [
    "Beauty & Wellness",
    "Salons",
    "Spas",
    "Fitness Centers",
    "Gyms",
    "Tailors & Laundry",
    "Cleaning Services",
  ],
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Commerce & Retail": "🛍️",
  "Food & Beverage": "🍽️",
  "Hospitality & Tourism": "🏨",
  "Construction & Real Estate": "🏗️",
  "Automotive": "🚗",
  "Finance & Insurance": "💰",
  "Healthcare": "⚕️",
  "Education & Professional": "📚",
  "Entertainment & Arts": "🎭",
  "Personal Services": "💇",
};

// Flattened list of all categories for backward compatibility
const ALL_CATEGORIES = [
  "Commerce",
  "Hotels",
  "Restaurants",
  "Building & Construction",
  "Construction Companies",
  "Construction Materials",
  "Automotive & Motorbike",
  "Finance",
  "Banks",
  "Insurance",
  "Entertainment",
  "Tourism & Leisure",
  "Health",
  "Hospitals",
  "Medical Labs",
  "Pharmacies",
  "Dental",
  "Mental Health Services",
  "Veterinary Services",
  "Food & Beverage",
  "Food Processing",
  "Agri-Food & Agribusiness",
  "Bakeries",
  "Telecommunications",
  "Real Estate",
  "Real Estate Agencies",
  "Real Estate Developers",
  "Electrical Installation",
  "Plumbing Services",
  "HVAC Services",
  "Carpentry",
  "Welding Services",
  "Painting Services",
  "Roofing",
  "Flooring Services",
  "Landscaping",
  "Pest Control",
  "Cleaning Services",
  "Maintenance Services",
  "Security Services",
  "Transportation & Logistics",
  "Shipping & Courier",
  "Warehousing",
  "Storage Facilities",
  "IT Services",
  "Software Development",
  "Web Design & Development",
  "Cloud Services",
  "Data Analytics",
  "Cybersecurity",
  "Business Consulting",
  "Management Consulting",
  "Financial Consulting",
  "Legal Services",
  "Accounting Services",
  "Auditing Services",
  "Tax Consulting",
  "Education",
  "Schools",
  "Universities",
  "Training Centers",
  "Online Education",
  "Language Schools",
  "Beauty & Personal Care",
  "Hair Salons",
  "Spa & Wellness",
  "Fitness Centers",
  "Gym",
  "Yoga Studios",
  "Personal Training",
  "Massage Therapy",
  "Travel & Tourism",
  "Travel Agencies",
  "Hostels & Guesthouses",
  "Tour Operators",
  "Car Rental",
  "Media & Entertainment",
  "Publishing",
  "Broadcasting",
  "Music Production",
  "Photography Services",
  "Video Production",
  "Advertising Agencies",
  "Marketing Agencies",
  "PR & Communications",
  "Graphic Design",
  "Interior Design",
  "Architecture",
  "Engineering Services",
  "Manufacturing",
  "Automotive Manufacturing",
  "Electronics Manufacturing",
  "Textile Manufacturing",
  "Furniture Manufacturing",
  "Retail",
  "Department Stores",
  "Specialty Retail",
  "E-commerce",
  "Wholesale",
  "Distribution Centers",
  "Hospitality",
  "Catering Services",
  "Event Planning",
  "Banquet Halls",
  "Conference Centers",
  "Hotels & Resorts",
  "Automotive",
  "Car Dealerships",
  "Auto Repair Shops",
  "Auto Parts",
  "Gas Stations",
  "Car Wash",
  "Tire Services",
  "Rental Services",
  "Equipment Rental",
  "Tool Rental",
  "Party Supplies Rental",
  "Costume Rental",
  "Vehicle Rental",
  "Energy & Utilities",
  "Electric Companies",
  "Water Companies",
  "Gas Companies",
  "Renewable Energy",
  "Solar Services",
  "Agriculture",
  "Crop Production",
  "Livestock Farming",
  "Aquaculture",
  "Forestry",
  "Mining & Quarrying",
  "Construction & Aggregates",
  "Precious Metals & Gems",
  "Environmental Services",
  "Waste Management",
  "Recycling Services",
  "Environmental Consulting",
  "Government & Administration",
  "Local Government",
  "National Government",
  "Public Administration",
  "Social Services",
  "NGO & Non-Profit",
  "Charity Organizations",
  "Relief Organizations",
  "Community Services",
  "Professional Services",
  "Staffing & Recruitment",
  "Temporary Staffing",
  "Executive Search",
  "Payroll Services",
  "HR Consulting",
  "Testing & Certification",
  "Inspection Services",
  "Appraisal Services",
  "Notary Services",
  "Translation Services",
  "Interpretation Services",
  "Personal Services",
  "Laundry Services",
  "Tailoring & Alterations",
  "Shoe Repair",
  "Watch Repair",
  "Jewelry Repair",
  "Furniture Repair",
  "Appliance Repair",
  "Electronics Repair",
  "Printing & Publishing",
  "Commercial Printing",
  "Digital Printing",
  "Bookbinding",
  "Office Supplies",
  "Office Equipment",
  "Office Furniture",
  "Stationery",
  "Packaging & Supplies",
  "Industrial Supplies",
  "Safety Equipment",
  "Tools & Hardware",
  "Building Materials",
  "Lumber Yard",
  "Paint & Finishing",
  "Plumbing Supplies",
  "Electrical Supplies",
  "HVAC Supplies",
  "Home Improvement",
  "Appliances",
  "Kitchen Equipment",
  "Bathroom Fixtures",
  "Doors & Windows",
  "Lighting Fixtures",
  "Garden & Outdoor",
  "Plants & Nursery",
  "Garden Equipment",
  "Outdoor Furniture",
  "Pools & Spas",
  "Veterinary Supplies",
  "Pet Stores",
  "Pet Grooming",
  "Pet Boarding",
  "Animal Training",
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "verified", label: "Verified" },
  { value: "premium", label: "Premium" },
  { value: "inactive", label: "Inactive" },
];

type TabType = "businesses" | "categories" | "database";

export default function Annuaire() {
  const [activeTab, setActiveTab] = useState<TabType>("businesses");
  const [databaseConnected, setDatabaseConnected] = useState<boolean | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [activeFilters, setActiveFilters] = useState({
    minRating: "",
    minRevenue: "",
    status: "",
    sort_by: "rating_desc",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(
    null,
  );
  const [showBusinessDetails, setShowBusinessDetails] = useState(false);

  // Database connection test
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        const result = await response.json();
        setDatabaseConnected(result.success === true);
      } catch {
        setDatabaseConnected(false);
      }
    };
    checkConnection();
  }, []);

  // Search handler
  const handleSearch = async (page: number = 1, categoryOverride?: string) => {
    setIsSearching(true);
    setCurrentPage(page);

    const category = categoryOverride ?? selectedCategory;

    try {
      const results = await searchBusinesses({
        query: searchQuery,
        category: category || undefined,
        location: locationQuery || undefined,
        status: activeFilters.status || undefined,
        limit: 12,
      });

      setSearchResults(Array.isArray(results) ? results : []);
      setTotalResults(results.length || 0);
      setHasSearched(true);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
      setTotalResults(0);
    }
    setIsSearching(false);
  };

  const clearAllFilters = () => {
    setActiveFilters({
      minRating: "",
      minRevenue: "",
      status: "",
      sort_by: "rating_desc",
    });
    setSearchQuery("");
    setLocationQuery("");
    setSelectedCategory("");
    setSearchResults([]);
    setHasSearched(false);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Database Connection Status */}
      <div className="fixed top-20 right-4 z-50">
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md border shadow-lg bg-blue-900/30 text-blue-300 border-blue-500/30"
        >
          <Database className="h-4 w-4" />
          <span className="text-sm font-medium">
            Annuaire Général (195 Catégories)
          </span>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
            {databaseConnected ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <span>{databaseConnected ? "Connecté" : "Déconnecté"}</span>
          </div>
        </motion.div>
      </div>

      {/* Hero Section */}
      <div className="relative h-[400px] flex flex-col justify-center items-center text-center px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/90 to-purple-900/90"></div>

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <span className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-sm font-medium border border-white/20">
              🌍 Annuaire des Entreprises
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-4xl md:text-5xl font-bold mb-4 drop-shadow-2xl"
          >
            Répertoire Complet des Entreprises
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="text-xl mb-4 text-white/90"
          >
            Explorez {totalResults.toLocaleString()}+ entreprises dans 195
            catégories différentes
          </motion.p>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-20">
        <Card className="bg-gradient-to-br from-slate-800/90 to-blue-900/90 backdrop-blur-md border-blue-700 shadow-2xl">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Recherchez des entreprises..."
                  className="pl-12 bg-slate-800/50 border-blue-600 text-white placeholder-blue-300/60"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              <div className="relative flex-1 w-full">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400" />
                <Input
                  type="text"
                  value={locationQuery}
                  onChange={(e) => setLocationQuery(e.target.value)}
                  placeholder="Ville, région..."
                  className="pl-12 bg-slate-800/50 border-blue-600 text-white placeholder-blue-300/60"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>

              <Button
                onClick={() => handleSearch()}
                disabled={isSearching}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Recherche...
                  </>
                ) : (
                  <>
                    <Search size={18} className="mr-2" />
                    Rechercher
                  </>
                )}
              </Button>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="border-blue-600 hover:bg-blue-800"
                >
                  <Filter size={16} className="mr-2" />
                  {showFilters ? "Masquer les filtres" : "Afficher les filtres"}
                </Button>
              </div>

              <div className="text-sm text-blue-300">
                {totalResults.toLocaleString()} résultats
              </div>
            </div>

            {/* Category Filter with Groups */}
            <div className="mt-4 pt-4 border-t border-blue-700">
              <Label className="text-sm font-medium mb-3 block text-blue-300">
                Catégorie (195 disponibles)
              </Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-blue-600 bg-slate-800 hover:bg-slate-700 w-full md:w-[300px] justify-between"
                  >
                    <span className="text-sm">
                      {selectedCategory || "Toutes les catégories"}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-slate-800 border-blue-600 w-[400px] max-h-[500px] overflow-y-auto">
                  <DropdownMenuItem onClick={() => setSelectedCategory("")}>
                    <span
                      className={
                        !selectedCategory
                          ? "font-semibold text-blue-300"
                          : "text-blue-200"
                      }
                    >
                      Toutes les catégories
                    </span>
                  </DropdownMenuItem>
                  
                  {/* Organized by category groups */}
                  {Object.entries(CATEGORY_GROUPS).map(([groupName, categories]) => (
                    <div key={groupName}>
                      <div className="px-2 py-2 text-xs font-bold text-blue-400 border-t border-blue-700 mt-2 pt-2 flex items-center gap-2">
                        <span>{(CATEGORY_ICONS as Record<string, string>)[groupName]}</span>
                        <span>{groupName}</span>
                      </div>
                      {categories.map((cat) => (
                        <DropdownMenuItem
                          key={cat}
                          onClick={() => setSelectedCategory(cat)}
                          className="pl-8"
                        >
                          {selectedCategory === cat && (
                            <Check className="h-4 w-4 mr-2" />
                          )}\n                          <span\n                            className={
                              selectedCategory === cat
                                ? "font-semibold text-blue-300"
                                : "text-blue-200"
                            }\n                          >\n                            {cat}\n                          </span>\n                        </DropdownMenuItem>\n                      ))}\n                    </div>\n                  ))}\n                </DropdownMenuContent>\n              </DropdownMenu>\n            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-800/50 rounded-lg border border-blue-700">
                  <div>
                    <Label className="text-sm font-medium mb-2 block text-blue-300">
                      Note minimale
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={activeFilters.minRating}
                      onChange={(e) =>
                        setActiveFilters({
                          ...activeFilters,
                          minRating: e.target.value,
                        })
                      }
                      placeholder="Aucune"
                      className="bg-slate-700 border-blue-600"
                    />
                  </div>

                  <div className="lg:col-span-2 flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={clearAllFilters}
                      className="border-blue-600 hover:bg-blue-800"
                    >
                      Réinitialiser les filtres
                    </Button>
                    <Button
                      onClick={() => handleSearch()}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    >
                      Appliquer les filtres
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Tabs */}
        <div className="flex space-x-2 mb-8">
          {(["businesses", "categories", "database"] as TabType[]).map(
            (tab) => (
              <Button
                key={tab}
                variant={activeTab === tab ? "default" : "outline"}
                onClick={() => setActiveTab(tab)}
                className={`capitalize ${
                  activeTab === tab
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "border-blue-600 hover:bg-blue-800"
                }`}
              >
                {tab === "businesses" && "Entreprises"}
                {tab === "categories" && "Catégories"}
                {tab === "database" && "Base de données"}
              </Button>
            ),
          )}
        </div>

        {activeTab === "businesses" && (
          <div>
            {hasSearched ? (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Database className="h-6 w-6 text-blue-400" />
                    <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      Résultats ({searchResults.length} de{" "}
                      {totalResults.toLocaleString()})
                    </span>
                  </h2>
                </div>

                {searchResults.length > 0 ? (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                      {searchResults.map((business, index) => (
                        <motion.div
                          key={business.id}
                          initial={{ opacity: 0, y: 40 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-500 border border-gray-700 hover:border-blue-500/30 cursor-pointer group"
                          onClick={() => {
                            setSelectedBusiness(business);
                            setShowBusinessDetails(true);
                          }}
                        >
                          <div className="h-2 bg-gradient-to-r from-blue-600 to-purple-600" />
                          <div className="p-6">
                            <h4 className="text-lg font-bold text-white group-hover:text-blue-300 transition-colors mb-2 line-clamp-1">
                              {business.title}
                            </h4>
                            <div className="flex items-center gap-2 text-gray-400 mb-3">
                              <Building className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium">
                                {business.location}
                              </span>
                            </div>
                            <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                              {business.description}
                            </p>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1 bg-blue-900/50 text-yellow-400 px-2 py-1 rounded text-sm">
                                <Star className="h-3 w-3 fill-current" />
                                <span className="font-bold">
                                  {business.rating}
                                </span>
                              </div>
                              <Button
                                size="sm"
                                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <Phone className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Search className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">
                      Aucune entreprise trouvée
                    </h3>
                    <p className="text-gray-400">Essayez une autre recherche</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Globe className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">
                  Explorez l'annuaire
                </h3>
                <p className="text-gray-400">
                  Sélectionnez une catégorie et lancez votre recherche
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "categories" && (
          <div>
            <h2 className="text-2xl font-bold mb-6">
              195 Catégories disponibles
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {ALL_CATEGORIES.map((category, index) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-lg border border-blue-500/20 hover:border-blue-500/50 cursor-pointer transition-all"
                  onClick={() => {
                    setSelectedCategory(category);
                    setActiveTab("businesses");
                    handleSearch(1, category);
                  }}
                >
                  <Badge className="bg-blue-900/30 text-blue-300 border-blue-500/30 mb-2">
                    {category}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "database" && (
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold mb-4 text-blue-300 flex items-center gap-2">
              <Database className="h-6 w-6" />
              Informations sur la base de données
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-blue-200">
                  Statistiques
                </h3>
                <ul className="space-y-2">
                  <li className="flex items-center justify-between">
                    <span className="text-blue-300">Total des catégories</span>
                    <span className="font-semibold text-white">195</span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-blue-300">Entreprises chargées</span>
                    <span className="font-semibold text-white">
                      {searchResults.length}
                    </span>
                  </li>
                  <li className="flex items-center justify-between">
                    <span className="text-blue-300">Statut</span>
                    <span
                      className={`font-semibold ${
                        databaseConnected ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {databaseConnected ? "Connecté ✅" : "Déconnecté ❌"}
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Business Details Modal */}
      <AnimatePresence>
        {showBusinessDetails && selectedBusiness && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowBusinessDetails(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-blue-500/30"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-slate-800/90 backdrop-blur-md border-b border-slate-700 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">
                  {selectedBusiness.title}
                </h2>
                <button
                  onClick={() => setShowBusinessDetails(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-300">
                        {selectedBusiness.location}
                      </span>
                    </div>
                    <Badge className="bg-blue-900/30 text-blue-300 border-blue-500/30">
                      {selectedBusiness.category}
                    </Badge>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Description
                  </h3>
                  <p className="text-gray-300">
                    {selectedBusiness.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {selectedBusiness.revenue && (
                    <Card className="bg-slate-800/50 rounded-lg p-4">
                      <CardContent className="p-0">
                        <div className="text-sm text-gray-400">
                          Chiffre d'affaires
                        </div>
                        <div className="text-xl font-bold text-white">
                          €{selectedBusiness.revenue.toLocaleString()}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {selectedBusiness.employees && (
                    <Card className="bg-slate-800/50 rounded-lg p-4">
                      <CardContent className="p-0">
                        <div className="text-sm text-gray-400">Employés</div>
                        <div className="text-xl font-bold text-white">
                          {selectedBusiness.employees}+
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollToTop />
    </div>
  );
}
