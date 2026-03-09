import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Star,
  Eye,
  MoreVertical,
  X,
  Check,
  AlertCircle,
  Loader2,
  Download,
  Upload,
  RefreshCw,
  ChevronDown,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GeolocationFields,
  BUSINESS_TYPE_OPTIONS,
  getBusinessTypesForCategory,
} from "@/components/ui/geolocation-fields";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface Business {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  description?: string;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  rating: number;
  reviews: number;
  tags?: string[];
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  is_advertiser: boolean;
  city_name?: string;
  created_at: string;
  updated_at?: string;
}

interface PaginationState {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function BusinessesManagement({ categories }: { categories: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [filterActive, setFilterActive] = useState("all");
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "0",
    businessType: "",
    description: "",
    location: "",
    address: "",
    phone: "",
    email: "",
    latitude: "",
    longitude: "",
    tags: "",
    isActive: true,
  });

  // Fetch businesses
  const {
    data: businessesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "businesses",
      pagination.page,
      searchTerm,
      selectedCategory,
      filterActive,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(pagination.page),
        limit: String(pagination.limit),
        search: searchTerm,
        categoryId: selectedCategory,
        isActive:
          filterActive === "all"
            ? ""
            : filterActive === "active"
              ? "true"
              : "false",
      });

      const response = await fetch(`${API_BASE_URL}/api/businesses?${params}`);
      if (!response.ok) throw new Error("Failed to fetch businesses");
      return response.json();
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ["business-stats"],
    queryFn: async () => {
      const response = await fetch(
        `${API_BASE_URL}/api/businesses/stats/summary`,
      );
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`${API_BASE_URL}/api/businesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create business");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Business created successfully",
      });
      setShowAddDialog(false);
      resetForm();
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create business",
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(
        `${API_BASE_URL}/api/businesses/${data.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      );
      if (!response.ok) throw new Error("Failed to update business");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Business updated successfully",
      });
      setShowAddDialog(false);
      resetForm();
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update business",
        variant: "destructive",
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete business");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Business deleted successfully",
      });
      refetch();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete business",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      categoryId: "",
      businessType: "",
      description: "",
      location: "",
      address: "",
      phone: "",
      email: "",
      latitude: "",
      longitude: "",
      tags: "",
      isActive: true,
    });
    setEditingBusiness(null);
  };

  const handleAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const handleEdit = (business: Business) => {
    setEditingBusiness(business);
    setFormData({
      name: business.name,
      categoryId: String(business.category_id),
      businessType:
        (business as any).business_type || (business as any).businessType || "",
      description: business.description || "",
      location: business.location || "",
      address: business.address || "",
      phone: business.phone || "",
      email: business.email || "",
      latitude: String(business.latitude || ""),
      longitude: String(business.longitude || ""),
      tags: Array.isArray(business.tags) ? business.tags.join(", ") : "",
      isActive: business.is_active,
    });
    setShowAddDialog(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.categoryId) {
      toast({
        title: "Error",
        description: "Name and category are required",
        variant: "destructive",
      });
      return;
    }

    const payload = {
      name: formData.name,
      categoryId: Number(formData.categoryId),
      businessType: formData.businessType || null,
      description: formData.description || null,
      location: formData.location || null,
      address: formData.address || null,
      phone: formData.phone || null,
      email: formData.email || null,
      latitude: formData.latitude ? parseFloat(formData.latitude) : null,
      longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      tags: formData.tags ? formData.tags.split(",").map((t) => t.trim()) : [],
      isActive: formData.isActive,
    };

    if (editingBusiness) {
      updateMutation.mutate({ ...payload, id: editingBusiness.id });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (business: Business) => {
    if (
      window.confirm(`Delete "${business.name}"? This action cannot be undone.`)
    ) {
      deleteMutation.mutate(business.id);
    }
  };

  // Update pagination when data changes
  useEffect(() => {
    if (businessesData?.pagination) {
      setPagination(businessesData.pagination);
    }
  }, [businessesData]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Businesses</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {statsData?.data?.total_businesses || 0}
                </p>
              </div>
              <div className="text-indigo-200">
                <svg
                  className="w-12 h-12"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v-1h8v1zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3h4v3h-4z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {statsData?.data?.active_businesses || 0}
                </p>
              </div>
              <div className="text-emerald-200">
                <Check className="w-12 h-12" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Rating</p>
                <p className="text-2xl font-bold text-amber-600">
                  {statsData?.data?.avg_rating || "0.0"}
                </p>
              </div>
              <div className="text-amber-200">
                <Star className="w-12 h-12 fill-current" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100/50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Advertisers</p>
                <p className="text-2xl font-bold text-rose-600">
                  {statsData?.data?.advertisers || 0}
                </p>
              </div>
              <div className="text-rose-200">
                <svg
                  className="w-12 h-12"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H7a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex-1 flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search businesses..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPagination((p) => ({ ...p, page: 1 }));
                  }}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-48 justify-between">
                    {selectedCategory === "all"
                      ? "All Categories"
                      : categories.find(
                          (c) => String(c.id) === selectedCategory,
                        )?.name || "All Categories"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  <DropdownMenuItem onClick={() => setSelectedCategory("all")}>
                    {selectedCategory === "all" && (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    <span
                      className={
                        selectedCategory === "all" ? "font-semibold" : ""
                      }
                    >
                      All Categories
                    </span>
                  </DropdownMenuItem>
                  {categories.map((cat) => (
                    <DropdownMenuItem
                      key={cat.id}
                      onClick={() => setSelectedCategory(String(cat.id))}
                    >
                      {selectedCategory === String(cat.id) && (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      <span
                        className={
                          selectedCategory === String(cat.id)
                            ? "font-semibold"
                            : ""
                        }
                      >
                        {cat.name}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-32 justify-between">
                    {filterActive === "all"
                      ? "All"
                      : filterActive === "active"
                        ? "Active"
                        : "Inactive"}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-32">
                  <DropdownMenuItem onClick={() => setFilterActive("all")}>
                    {filterActive === "all" && (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    <span
                      className={filterActive === "all" ? "font-semibold" : ""}
                    >
                      All
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterActive("active")}>
                    {filterActive === "active" && (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    <span
                      className={
                        filterActive === "active" ? "font-semibold" : ""
                      }
                    >
                      Active
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setFilterActive("inactive")}>
                    {filterActive === "inactive" && (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    <span
                      className={
                        filterActive === "inactive" ? "font-semibold" : ""
                      }
                    >
                      Inactive
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                onClick={handleAdd}
                className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
              >
                <Plus className="h-4 w-4" />
                Add Business
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-10 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businessesData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <p className="text-gray-500">No businesses found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    businessesData?.data?.map((business: Business) => (
                      <TableRow key={business.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">
                          <div>
                            <p>{business.name}</p>
                            {business.tags && business.tags.length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {business.tags.slice(0, 2).map((tag, i) => (
                                  <Badge
                                    key={i}
                                    variant="outline"
                                    className="text-xs"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {business.category_name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {business.location && (
                              <>
                                <MapPin className="h-3 w-3 text-gray-400" />
                                <span className="text-sm">
                                  {business.location}
                                </span>
                              </>
                            )}
                          </div>
                          {business.city_name && (
                            <p className="text-xs text-gray-500">
                              {business.city_name}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {business.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-3 w-3 text-gray-400" />
                                <a
                                  href={`tel:${business.phone}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {business.phone}
                                </a>
                              </div>
                            )}
                            {business.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <a
                                  href={`mailto:${business.email}`}
                                  className="text-blue-600 hover:underline"
                                >
                                  {business.email}
                                </a>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <span className="font-medium">
                              {business.rating.toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({business.reviews})
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {business.is_active ? (
                            <Badge className="bg-emerald-100 text-emerald-800">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEdit(business)}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(business)}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages} •{" "}
                {pagination.total} total businesses
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      page: Math.max(1, p.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((p) => ({
                      ...p,
                      page: Math.min(p.pages, p.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBusiness ? "Edit Business" : "Add New Business"}
            </DialogTitle>
            <DialogDescription>
              {editingBusiness
                ? "Update the business information"
                : "Create a new business entry"}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 pr-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Business Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Tech Store"
                  />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={
                      formData.categoryId && formData.categoryId !== "0"
                        ? formData.categoryId
                        : undefined
                    }
                    onValueChange={(v) => {
                      // Auto-clear businessType if incompatible with new category
                      const compatibleTypes = getBusinessTypesForCategory(
                        categories,
                        parseInt(v),
                      );
                      const currentTypeStillValid = compatibleTypes.find(
                        (t) => t.value === formData.businessType && !t.disabled,
                      );
                      setFormData({
                        ...formData,
                        categoryId: v,
                        businessType: currentTypeStillValid
                          ? formData.businessType
                          : "",
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {categories.length === 0 ? (
                        <SelectItem value="__loading" disabled>
                          Loading categories...
                        </SelectItem>
                      ) : (
                        categories
                          .sort((a: any, b: any) =>
                            a.name.localeCompare(b.name),
                          )
                          .map((cat: any) => (
                            <SelectItem key={cat.id} value={String(cat.id)}>
                              {cat.name}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Business Type</Label>
                <Select
                  value={formData.businessType || undefined}
                  onValueChange={(v) =>
                    setFormData({ ...formData, businessType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a business type" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {getBusinessTypesForCategory(
                      categories,
                      formData.categoryId
                        ? parseInt(formData.categoryId)
                        : null,
                    ).map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        disabled={opt.disabled}
                        className={opt.disabled ? "opacity-40" : ""}
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Business description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Location/City</Label>
                  <Input
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g., Downtown"
                  />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Full address"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+225-XX-XX-XX-XX"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    type="email"
                  />
                </div>
              </div>

              <GeolocationFields
                latitude={formData.latitude}
                longitude={formData.longitude}
                onLatitudeChange={(v) =>
                  setFormData({ ...formData, latitude: v })
                }
                onLongitudeChange={(v) =>
                  setFormData({ ...formData, longitude: v })
                }
              />

              <div>
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="e.g., premium, retail, tech"
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Save Business
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
