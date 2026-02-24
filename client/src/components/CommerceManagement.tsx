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
  Database,
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003";

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

export function CommerceManagement({ categories }: { categories: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("commerce");
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Business>>({});
  const [selectedBusinesses, setSelectedBusinesses] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState("name");

  // Fetch commerce businesses - disabled by default to prevent hang
  const {
    data: businessesData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "commerce-businesses",
      selectedCategory,
      searchTerm,
      pagination.page,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        query: searchTerm,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      const response = await fetch(`${API_BASE_URL}/api/businesses?${params}`, {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });
      if (!response.ok) throw new Error("Failed to fetch commerce businesses");
      return response.json();
    },
    enabled: false, // Disabled on mount - user can click Refresh to load
    retry: 1,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (businessesData) {
      setPagination((prev) => ({
        ...prev,
        total: businessesData.total || 0,
        pages: Math.ceil((businessesData.total || 0) / pagination.limit),
      }));
    }
  }, [businessesData]);

  // Add new business
  const addBusinessMutation = useMutation({
    mutationFn: async (data: Partial<Business>) => {
      const response = await fetch(`${API_BASE_URL}/api/businesses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          category_id:
            selectedCategory === "all" ? undefined : parseInt(selectedCategory),
        }),
      });
      if (!response.ok) throw new Error("Failed to add business");
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setIsAddDialogOpen(false);
      setFormData({});
      toast({ title: "Success", description: "Business added successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update business
  const updateBusinessMutation = useMutation({
    mutationFn: async (data: Business) => {
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
      refetch();
      setIsEditDialogOpen(false);
      setEditingBusiness(null);
      toast({ title: "Success", description: "Business updated successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete business
  const deleteBusinessMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`${API_BASE_URL}/api/businesses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete business");
      return response.json();
    },
    onSuccess: () => {
      refetch();
      toast({ title: "Success", description: "Business deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const businesses = useMemo(() => {
    let items = businessesData?.data || [];
    if (sortBy === "rating") {
      items = [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "name") {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    }
    return items;
  }, [businessesData?.data, sortBy]);

  const handleAddBusiness = () => {
    setFormData({
      is_active: true,
      is_advertiser: false,
      rating: 0,
      reviews: 0,
    });
    setIsAddDialogOpen(true);
  };

  const handleEditBusiness = (business: Business) => {
    setEditingBusiness(business);
    setFormData(business);
    setIsEditDialogOpen(true);
  };

  const handleSaveAdd = () => {
    if (!formData.name?.trim()) {
      toast({ title: "Error", description: "Business name is required" });
      return;
    }
    addBusinessMutation.mutate(formData);
  };

  const handleSaveEdit = () => {
    if (!formData.name?.trim()) {
      toast({ title: "Error", description: "Business name is required" });
      return;
    }
    if (editingBusiness) {
      updateBusinessMutation.mutate({
        ...editingBusiness,
        ...formData,
      } as Business);
    }
  };

  const handleDeleteBusiness = (id: number) => {
    if (window.confirm("Are you sure you want to delete this business?")) {
      deleteBusinessMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Commerce Management
          </h2>
          <p className="text-gray-600">
            Manage commerce businesses in your database
          </p>
        </div>
        <Button
          onClick={handleAddBusiness}
          className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Add Commerce Business
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or location..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="gap-2"
              disabled={isLoading}
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => setSortBy("name")}
                  className="cursor-pointer"
                >
                  {sortBy === "name" && <Check className="h-4 w-4 mr-2" />}
                  <span className={sortBy === "name" ? "font-semibold" : ""}>
                    Name (A-Z)
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSortBy("rating")}
                  className="cursor-pointer"
                >
                  {sortBy === "rating" && <Check className="h-4 w-4 mr-2" />}
                  <span className={sortBy === "rating" ? "font-semibold" : ""}>
                    Rating (High to Low)
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Businesses Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedCategory === "all"
              ? "All Commerce Businesses"
              : `Commerce Businesses (${pagination.total || 0} total)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !businessesData ? (
            <div className="text-center py-12">
              <Database className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Ready to load commerce businesses
              </h3>
              <p className="text-gray-500 mb-6">
                Click the "Refresh" button to load commerce businesses from the
                database
              </p>
              <Button onClick={() => refetch()} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Load Data
              </Button>
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No commerce businesses found
              </h3>
              <p className="text-gray-500">
                Add your first commerce business to get started
              </p>
            </div>
          ) : (
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map((business: Business) => (
                    <TableRow key={business.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        {business.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="h-3 w-3" />
                          {business.location || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {business.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {business.phone}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold">
                            {business.rating || 0}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={business.is_active ? "default" : "secondary"}
                          className={
                            business.is_active
                              ? "bg-green-500 hover:bg-green-600"
                              : "bg-gray-400 hover:bg-gray-500"
                          }
                        >
                          {business.is_active ? "Active" : "Inactive"}
                        </Badge>
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
                              onClick={() => handleEditBusiness(business)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteBusiness(business.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex justify-between items-center mt-4 pt-4 border-t">
              <div className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.pages} ({pagination.total}{" "}
                total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
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
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.pages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Commerce Business</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Business Name *</Label>
              <Input
                placeholder="Enter business name"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Enter business description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Location</Label>
                <Input
                  placeholder="City/Area"
                  value={formData.location || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Email address"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rating (0-5)</Label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rating: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Reviews</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.reviews || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reviews: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAdd}
              disabled={addBusinessMutation.isPending}
              className="gap-2"
            >
              {addBusinessMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Add Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Commerce Business</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Business Name *</Label>
              <Input
                placeholder="Enter business name"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="Enter business description"
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Location</Label>
                <Input
                  placeholder="City/Area"
                  value={formData.location || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="Phone number"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="Email address"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Rating (0-5)</Label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rating: parseFloat(e.target.value),
                    })
                  }
                />
              </div>
              <div>
                <Label>Reviews</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.reviews || 0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reviews: parseInt(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateBusinessMutation.isPending}
              className="gap-2"
            >
              {updateBusinessMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
