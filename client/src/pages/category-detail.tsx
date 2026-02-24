import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ensureAuthenticated, authenticatedFetch } from "@/lib/auth";
import {
  ChevronLeft,
  Loader2,
  AlertCircle,
  Tag,
  Grid,
  List,
  Search,
  Filter,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE_URL = import.meta.env.VITE_API_URL || "";

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
}

interface Business {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  categoryId: number;
  isActive: boolean;
  createdAt: string;
}

export default function CategoryDetail() {
  const [, params] = useRoute("/category/:slug");
  const [, setLocation] = useLocation();
  const [category, setCategory] = useState<Category | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewType, setViewType] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const categorySlug = params?.slug;

  useEffect(() => {
    const fetchData = async () => {
      if (!categorySlug) return;

      setLoading(true);
      try {
        // Ensure user is authenticated
        await ensureAuthenticated();

        // Fetch categories to find matching one
        const catResponse = await authenticatedFetch(
          `${API_BASE_URL}/api/v1/admin/categories?limit=100`,
        );
        const catData = await catResponse.json();

        if (catData.success) {
          const foundCategory = catData.data.find(
            (c: Category) => c.slug === categorySlug,
          );

          if (foundCategory) {
            setCategory(foundCategory);

            // Fetch businesses in this category
            const bizResponse = await authenticatedFetch(
              `${API_BASE_URL}/api/v1/admin/businesses?limit=100&category=${foundCategory.id}`,
            );
            const bizData = await bizResponse.json();

            if (bizData.success) {
              setBusinesses(bizData.data || []);
            }
          } else {
            setError("Category not found");
          }
        } else {
          setError("Failed to load category");
        }
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categorySlug]);

  const filteredBusinesses = businesses
    .filter(
      (b) =>
        b.name.toLowerCase().includes(search.toLowerCase()) ||
        b.description?.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case "oldest":
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading category...</p>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100">
        <Card className="max-w-md border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-700 mb-4">{error || "Category not found"}</p>
            <Button onClick={() => setLocation("/businesses-directory")}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back to Businesses
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setLocation("/businesses-directory")}
            className="gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">{category.name}</h1>
          <div className="w-20"></div>
        </div>
      </div>

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border-b"
      >
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Tag className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              {category.name}
            </h1>
          </div>

          {category.description && (
            <p className="text-lg text-gray-700 max-w-2xl mb-6">
              {category.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              <span>{businesses.length} businesses</span>
            </div>
            <div>
              Created {new Date(category.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Controls & Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search & Filter Bar */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search businesses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name">Name (A-Z)</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={viewType === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewType("grid")}
                className="flex-1"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewType === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewType("list")}
                className="flex-1"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Showing {filteredBusinesses.length} of {businesses.length}{" "}
            businesses
          </p>
        </div>

        {/* Businesses Display */}
        {filteredBusinesses.length > 0 ? (
          <div
            className={
              viewType === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {filteredBusinesses.map((business, index) => (
              <motion.div
                key={business.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className="border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full"
                  onClick={() => setLocation(`/business/${business.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-2">
                          {business.name}
                        </CardTitle>
                      </div>
                      <Badge
                        variant={business.isActive ? "default" : "secondary"}
                      >
                        {business.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {business.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {business.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      {business.address && (
                        <p className="text-gray-700 flex items-start gap-2">
                          <span className="text-gray-500">📍</span>
                          {business.address}
                        </p>
                      )}
                      {business.phone && (
                        <p className="text-gray-700 flex items-center gap-2">
                          <span className="text-gray-500">📞</span>
                          {business.phone}
                        </p>
                      )}
                      {business.email && (
                        <p className="text-gray-700 flex items-center gap-2">
                          <span className="text-gray-500">✉️</span>
                          <a
                            href={`mailto:${business.email}`}
                            className="text-blue-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {business.email}
                          </a>
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t">
                      <Button
                        className="w-full"
                        onClick={() => setLocation(`/business/${business.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-lg">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {search
                  ? "No businesses found matching your search"
                  : "No businesses in this category yet"}
              </p>
              {search && (
                <Button
                  variant="outline"
                  onClick={() => setSearch("")}
                  className="gap-2"
                >
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
