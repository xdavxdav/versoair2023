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
  RefreshCw,
  Database,
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

interface Business {
  id: number;
  name: string;
  description?: string;
  category_id?: number;
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  rating?: number;
  review_count?: number;
  is_active?: boolean;
  is_advertiser?: boolean;
  created_at?: string;
}

interface TableStats {
  table_name: string;
  row_count: number;
}

export function WholeDatabase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const itemsPerPage = 50;
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Fetch all businesses from database
  const {
    data: businessesData,
    isLoading,
    error,
    refetch,
  } = useQuery<{
    success: boolean;
    data: Business[];
    total: number;
  }>({
    queryKey: ["all-businesses"],
    queryFn: async () => {
      const response = await fetch("/api/businesses?limit=10000");
      if (!response.ok) throw new Error("Failed to fetch businesses");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch table statistics
  const { data: tablesData } = useQuery<TableStats[]>({
    queryKey: ["database-tables"],
    queryFn: async () => {
      const response = await fetch("/api/manage/database/tables");
      if (!response.ok) return [];
      const data = await response.json();
      return data.tables || [];
    },
  });

  // Filter and search logic
  const filteredBusinesses = useMemo(() => {
    if (!businessesData?.data) return [];

    return businessesData.data.filter((business) => {
      const matchesSearch =
        !searchTerm ||
        business.name?.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
        business.description
          ?.toLowerCase()
          .startsWith(searchTerm.toLowerCase()) ||
        business.location?.toLowerCase().startsWith(searchTerm.toLowerCase());

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "active" && business.is_active) ||
        (selectedStatus === "inactive" && !business.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [businessesData?.data, searchTerm, selectedStatus]);

  // Pagination
  const paginatedBusinesses = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredBusinesses.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredBusinesses, currentPage]);

  const totalPages = Math.ceil(filteredBusinesses.length / itemsPerPage);

  // Delete mutation
  const deleteBusinessMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/businesses/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      refetch();
    },
  });

  // Update mutation
  const updateBusinessMutation = useMutation({
    mutationFn: async (business: Business) => {
      const response = await fetch(`/api/businesses/${business.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(business),
      });
      if (!response.ok) throw new Error("Failed to update");
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setIsDialogOpen(false);
      setEditingBusiness(null);
    },
  });

  const handleSaveEdit = () => {
    if (editingBusiness) {
      updateBusinessMutation.mutate(editingBusiness);
    }
  };

  const handleDeleteBusiness = (id: number) => {
    if (confirm("Are you sure you want to delete this business?")) {
      deleteBusinessMutation.mutate(id);
    }
  };

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-900">Error Loading Database</CardTitle>
          <CardDescription className="text-red-800">
            {error.message}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="w-8 h-8 text-gradient-to-r from-blue-600 to-blue-400" />
            Whole Database
          </h2>
          <p className="text-gray-600 mt-1">
            View and manage all {businessesData?.total || 0} businesses in the
            database
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">
                  Total Businesses
                </p>
                <p className="text-2xl font-bold text-blue-900 mt-1">
                  {businessesData?.total || 0}
                </p>
              </div>
              <Database className="w-10 h-10 text-blue-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Active</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  {businessesData?.data.filter((b) => b.is_active).length || 0}
                </p>
              </div>
              <Check className="w-10 h-10 text-green-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Avg Rating</p>
                <p className="text-2xl font-bold text-amber-900 mt-1">
                  {businessesData?.data && businessesData.data.length > 0
                    ? (
                        businessesData.data.reduce(
                          (sum, b) => sum + (b.rating || 0),
                          0,
                        ) / businessesData.data.length
                      ).toFixed(2)
                    : "N/A"}
                </p>
              </div>
              <Star className="w-10 h-10 text-amber-400 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Advertisers</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  {businessesData?.data.filter((b) => b.is_advertiser).length ||
                    0}
                </p>
              </div>
              <Badge className="w-10 h-10 bg-purple-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white border-gray-200">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search businesses by name, location, or description..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="w-4 h-4" />
                    Status: {selectedStatus}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedStatus("all");
                      setCurrentPage(1);
                    }}
                  >
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedStatus("active");
                      setCurrentPage(1);
                    }}
                  >
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedStatus("inactive");
                      setCurrentPage(1);
                    }}
                  >
                    Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card className="bg-white border-gray-200 overflow-hidden">
        <div className="overflow-x-auto" ref={tableContainerRef}>
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b border-gray-200">
                <TableHead className="text-gray-900 font-semibold">
                  Name
                </TableHead>
                <TableHead className="text-gray-900 font-semibold">
                  Location
                </TableHead>
                <TableHead className="text-gray-900 font-semibold">
                  Contact
                </TableHead>
                <TableHead className="text-gray-900 font-semibold">
                  Rating
                </TableHead>
                <TableHead className="text-gray-900 font-semibold">
                  Status
                </TableHead>
                <TableHead className="text-gray-900 font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  </TableCell>
                </TableRow>
              ) : paginatedBusinesses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-gray-500"
                  >
                    No businesses found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedBusinesses.map((business) => (
                  <TableRow
                    key={business.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition"
                  >
                    <TableCell className="font-semibold text-gray-900">
                      {business.name}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {business.location || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {business.phone || business.email ? (
                        <div className="space-y-0.5">
                          {business.phone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="w-3 h-3 text-gray-400" />
                              {business.phone}
                            </div>
                          )}
                          {business.email && (
                            <div className="flex items-center gap-1 text-sm">
                              <Mail className="w-3 h-3 text-gray-400" />
                              {business.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      {business.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-semibold text-gray-900">
                            {business.rating}
                          </span>
                          {business.review_count && (
                            <span className="text-sm text-gray-500">
                              ({business.review_count})
                            </span>
                          )}
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          business.is_active
                            ? "bg-green-100 text-green-800 border border-green-300"
                            : "bg-red-100 text-red-800 border border-red-300"
                        }
                      >
                        {business.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingBusiness(business);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteBusiness(business.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
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
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <span className="text-sm text-gray-600">
            Showing{" "}
            {Math.min(
              (currentPage - 1) * itemsPerPage + 1,
              filteredBusinesses.length,
            )}{" "}
            to {Math.min(currentPage * itemsPerPage, filteredBusinesses.length)}{" "}
            of {filteredBusinesses.length}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="text-gray-400">...</span>
                  <Button
                    variant={currentPage === totalPages ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Business</DialogTitle>
            <DialogDescription>Update business information</DialogDescription>
          </DialogHeader>
          {editingBusiness && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Name
                </label>
                <Input
                  value={editingBusiness.name}
                  onChange={(e) =>
                    setEditingBusiness({
                      ...editingBusiness,
                      name: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <Input
                  value={editingBusiness.description || ""}
                  onChange={(e) =>
                    setEditingBusiness({
                      ...editingBusiness,
                      description: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Location
                </label>
                <Input
                  value={editingBusiness.location || ""}
                  onChange={(e) =>
                    setEditingBusiness({
                      ...editingBusiness,
                      location: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Phone
                </label>
                <Input
                  value={editingBusiness.phone || ""}
                  onChange={(e) =>
                    setEditingBusiness({
                      ...editingBusiness,
                      phone: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Email
                </label>
                <Input
                  value={editingBusiness.email || ""}
                  onChange={(e) =>
                    setEditingBusiness({
                      ...editingBusiness,
                      email: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateBusinessMutation.isPending}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
            >
              {updateBusinessMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer with Action Button */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Total:{" "}
            <span className="font-semibold">{filteredBusinesses.length}</span>{" "}
            businesses
            {searchTerm && ` matching "${searchTerm}"`}
          </p>
          <Button
            onClick={() => refetch()}
            size="lg"
            className="bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-700 hover:via-blue-600 hover:to-cyan-600 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 px-8 py-6 text-lg"
          >
            <Database className="w-5 h-5 mr-2" />
            VOIR WHOLE DATABASE
          </Button>
        </div>
      </div>
    </div>
  );
}
