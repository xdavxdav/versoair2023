import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Search,
  Filter,
  Settings,
  Database,
  Users,
  MapPin,
  Music,
  CreditCard,
  Building2,
  UserCheck,
  RefreshCw,
  AlertCircle,
  CheckCircle,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
}

interface Country {
  id: number;
  name: string;
  code: string;
  createdAt: string;
}

interface Region {
  id: number;
  name: string;
  countryId: number;
  countryName?: string;
  createdAt: string;
}

interface City {
  id: number;
  name: string;
  regionId: number;
  regionName?: string;
  createdAt: string;
}

interface Artist {
  id: number;
  name: string;
  email?: string;
  genre?: string;
  rating: string;
  totalProjects: number;
  verificationStatus: string;
  isActive: boolean;
  createdAt: string;
}

interface Contractor {
  id: number;
  name: string;
  email?: string;
  companyName?: string;
  specialization?: string;
  rating: string;
  totalProjects: number;
  verificationStatus: string;
  isActive: boolean;
  createdAt: string;
}

interface PaymentCardType {
  id: number;
  name: string;
  code: string;
  provider?: string;
  processingFee: string;
  isActive: boolean;
  createdAt: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function DatabaseManagementCenter() {
  const [activeTab, setActiveTab] = useState("categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState<any>({});

  // Fetch all data
  const {
    data: categories = [],
    refetch: refetchCategories,
    isLoading: categoriesLoading,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/categories`);
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: countries = [], refetch: refetchCountries } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/countries`);
      if (!res.ok) throw new Error("Failed to fetch countries");
      return res.json();
    },
  });

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/regions`);
      if (!res.ok) throw new Error("Failed to fetch regions");
      return res.json();
    },
  });

  const { data: cities = [] } = useQuery({
    queryKey: ["cities"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/cities`);
      if (!res.ok) throw new Error("Failed to fetch cities");
      return res.json();
    },
  });

  const { data: artists = [] } = useQuery({
    queryKey: ["artists"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/artists`);
      if (!res.ok) throw new Error("Failed to fetch artists");
      return res.json();
    },
  });

  const { data: contractors = [] } = useQuery({
    queryKey: ["contractors"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/contractors`);
      if (!res.ok) throw new Error("Failed to fetch contractors");
      return res.json();
    },
  });

  const { data: paymentCardTypes = [] } = useQuery({
    queryKey: ["payment-card-types"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/payment-card-types`);
      if (!res.ok) throw new Error("Failed to fetch payment card types");
      return res.json();
    },
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = {
        categories: "/categories",
        countries: "/countries",
        regions: "/regions",
        cities: "/cities",
        artists: "/artists",
        contractors: "/contractors",
        payment_card_types: "/payment-card-types",
      }[activeTab];

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create item");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Item created successfully" });
      setShowCreateModal(false);
      setFormData({});
      refetchData();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const endpoint = {
        categories: "/categories",
        countries: "/countries",
        regions: "/regions",
        cities: "/cities",
        artists: "/artists",
        contractors: "/contractors",
        payment_card_types: "/payment-card-types",
      }[activeTab];

      const res = await fetch(`${API_BASE_URL}${endpoint}/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update item");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Item updated successfully" });
      setShowEditModal(false);
      setSelectedItem(null);
      setFormData({});
      refetchData();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const endpoint = {
        categories: "/categories",
        countries: "/countries",
        regions: "/regions",
        cities: "/cities",
        artists: "/artists",
        contractors: "/contractors",
        payment_card_types: "/payment-card-types",
      }[activeTab];

      const res = await fetch(`${API_BASE_URL}${endpoint}/${selectedItem.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete item");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Item deleted successfully" });
      setShowDeleteModal(false);
      setSelectedItem(null);
      refetchData();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const refetchData = () => {
    refetchCategories();
    refetchCountries();
  };

  const handleCreate = () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  const openEditModal = (item: any) => {
    setSelectedItem(item);
    setFormData(item);
    setShowEditModal(true);
  };

  const openDeleteModal = (item: any) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  // Render entity card
  const EntityCard = ({ title, icon: Icon, count, color }: any) => (
    <Card className="border-0 shadow-sm bg-gradient-to-br hover:shadow-lg transition-shadow">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2">{count}</p>
          </div>
          <div className={cn("p-3 rounded-lg", color)}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Render table for current tab
  const renderTable = () => {
    let data: any[] = [];
    let columns: { key: string; label: string }[] = [];

    switch (activeTab) {
      case "categories":
        data = categories.filter((c: any) =>
          c.name.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );
        columns = [
          { key: "name", label: "Name" },
          { key: "slug", label: "Slug" },
          { key: "description", label: "Description" },
          { key: "createdAt", label: "Created" },
        ];
        break;

      case "countries":
        data = countries.filter((c: any) =>
          c.name.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );
        columns = [
          { key: "name", label: "Country" },
          { key: "code", label: "Code" },
          { key: "createdAt", label: "Created" },
        ];
        break;

      case "regions":
        data = regions.filter((r: any) =>
          r.name.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );
        columns = [
          { key: "name", label: "Region" },
          { key: "countryName", label: "Country" },
          { key: "createdAt", label: "Created" },
        ];
        break;

      case "cities":
        data = cities.filter((c: any) =>
          c.name.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );
        columns = [
          { key: "name", label: "City" },
          { key: "regionName", label: "Region" },
          { key: "createdAt", label: "Created" },
        ];
        break;

      case "artists":
        data = artists.filter((a: any) =>
          a.name.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );
        columns = [
          { key: "name", label: "Artist Name" },
          { key: "genre", label: "Genre" },
          { key: "rating", label: "Rating" },
          { key: "verificationStatus", label: "Verification" },
          { key: "isActive", label: "Status" },
        ];
        break;

      case "contractors":
        data = contractors.filter((c: any) =>
          c.name.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );
        columns = [
          { key: "name", label: "Contractor" },
          { key: "companyName", label: "Company" },
          { key: "specialization", label: "Specialization" },
          { key: "rating", label: "Rating" },
          { key: "verificationStatus", label: "Verification" },
        ];
        break;

      case "payment_card_types":
        data = paymentCardTypes.filter((p: any) =>
          p.name.toLowerCase().startsWith(searchQuery.toLowerCase()),
        );
        columns = [
          { key: "name", label: "Card Type" },
          { key: "code", label: "Code" },
          { key: "provider", label: "Provider" },
          { key: "processingFee", label: "Fee %" },
          { key: "isActive", label: "Active" },
        ];
        break;
    }

    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key}>{col.label}</TableHead>
              ))}
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <TableCell key={col.key}>
                    {col.key === "isActive" || col.key === "is_active" ? (
                      <Badge variant={item[col.key] ? "default" : "secondary"}>
                        {item[col.key] ? "Active" : "Inactive"}
                      </Badge>
                    ) : col.key === "verificationStatus" ? (
                      <Badge
                        variant={
                          item[col.key] === "verified" ? "default" : "outline"
                        }
                      >
                        {item[col.key]}
                      </Badge>
                    ) : col.key === "createdAt" ? (
                      new Date(item[col.key]).toLocaleDateString()
                    ) : (
                      item[col.key] || "—"
                    )}
                  </TableCell>
                ))}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditModal(item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openDeleteModal(item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  };

  // Render form fields based on tab
  const renderFormFields = () => {
    const commonFields = (
      <>
        <div className="space-y-2">
          <Label>Name *</Label>
          <Input
            placeholder="Enter name"
            value={formData.name || ""}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Enter description"
            rows={3}
            value={formData.description || ""}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
          />
        </div>
      </>
    );

    switch (activeTab) {
      case "categories":
        return (
          <>
            {commonFields}
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                placeholder="category-slug"
                value={formData.slug || ""}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
              />
            </div>
          </>
        );

      case "countries":
        return (
          <>
            <div className="space-y-2">
              <Label>Country Name *</Label>
              <Input
                placeholder="United States"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Country Code *</Label>
              <Input
                placeholder="US"
                maxLength={2}
                value={formData.code || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>
          </>
        );

      case "artists":
        return (
          <>
            {commonFields}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="artist@example.com"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Genre</Label>
              <Input
                placeholder="Rock, Pop, Jazz, etc."
                value={formData.genre || ""}
                onChange={(e) =>
                  setFormData({ ...formData, genre: e.target.value })
                }
              />
            </div>
          </>
        );

      case "contractors":
        return (
          <>
            {commonFields}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="contractor@example.com"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                placeholder="Company Name"
                value={formData.companyName || ""}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Specialization</Label>
              <Input
                placeholder="Web Development, Design, etc."
                value={formData.specialization || ""}
                onChange={(e) =>
                  setFormData({ ...formData, specialization: e.target.value })
                }
              />
            </div>
          </>
        );

      case "payment_card_types":
        return (
          <>
            <div className="space-y-2">
              <Label>Card Type Name *</Label>
              <Input
                placeholder="Visa, Mastercard, etc."
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Code *</Label>
              <Input
                placeholder="VISA, MC, AMEX"
                value={formData.code || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    code: e.target.value.toUpperCase(),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Provider</Label>
              <Input
                placeholder="Provider Name"
                value={formData.provider || ""}
                onChange={(e) =>
                  setFormData({ ...formData, provider: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Processing Fee (%)</Label>
              <Input
                type="number"
                placeholder="2.5"
                value={formData.processingFee || ""}
                onChange={(e) =>
                  setFormData({ ...formData, processingFee: e.target.value })
                }
              />
            </div>
          </>
        );

      default:
        return commonFields;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200/80 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md">
                <Database className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Database Management Center
                </h1>
                <p className="text-sm text-gray-600">
                  Manage all database entities and configurations
                </p>
              </div>
            </div>
            <Button
              onClick={() => {
                setFormData({});
                setShowCreateModal(true);
              }}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600"
            >
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
          <EntityCard
            title="Categories"
            icon={Building2}
            count={categories.length}
            color="bg-blue-500"
          />
          <EntityCard
            title="Countries"
            icon={MapPin}
            count={countries.length}
            color="bg-green-500"
          />
          <EntityCard
            title="Regions"
            icon={MapPin}
            count={regions.length}
            color="bg-cyan-500"
          />
          <EntityCard
            title="Cities"
            icon={MapPin}
            count={cities.length}
            color="bg-teal-500"
          />
          <EntityCard
            title="Artists"
            icon={Music}
            count={artists.length}
            color="bg-purple-500"
          />
          <EntityCard
            title="Contractors"
            icon={Users}
            count={contractors.length}
            color="bg-orange-500"
          />
          <EntityCard
            title="Card Types"
            icon={CreditCard}
            count={paymentCardTypes.length}
            color="bg-pink-500"
          />
        </div>

        {/* Search and Filter */}
        <div className="mb-6 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid grid-cols-4 md:grid-cols-7 bg-gray-100/80 p-1 rounded-lg">
            <TabsTrigger value="categories" className="text-xs md:text-sm">
              <Building2 className="h-4 w-4 mr-1" />
              Categories
            </TabsTrigger>
            <TabsTrigger value="countries" className="text-xs md:text-sm">
              <MapPin className="h-4 w-4 mr-1" />
              Countries
            </TabsTrigger>
            <TabsTrigger value="regions" className="text-xs md:text-sm">
              <MapPin className="h-4 w-4 mr-1" />
              Regions
            </TabsTrigger>
            <TabsTrigger value="cities" className="text-xs md:text-sm">
              <MapPin className="h-4 w-4 mr-1" />
              Cities
            </TabsTrigger>
            <TabsTrigger value="artists" className="text-xs md:text-sm">
              <Music className="h-4 w-4 mr-1" />
              Artists
            </TabsTrigger>
            <TabsTrigger value="contractors" className="text-xs md:text-sm">
              <Users className="h-4 w-4 mr-1" />
              Contractors
            </TabsTrigger>
            <TabsTrigger
              value="payment_card_types"
              className="text-xs md:text-sm"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Cards
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value={activeTab} className="space-y-6">
            {renderTable()}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New {activeTab}</DialogTitle>
            <DialogDescription>
              Add a new item to the {activeTab} database
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">{renderFormFields()}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {activeTab}</DialogTitle>
            <DialogDescription>Update item details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">{renderFormFields()}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Delete Item
            </DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
