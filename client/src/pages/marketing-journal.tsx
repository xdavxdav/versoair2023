import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Newspaper,
  Plus,
  Download,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  "Commerce",
  "Restauration",
  "Services",
  "Santé",
  "Éducation",
  "Technologie",
  "Immobilier",
  "Transport",
  "Artisanat",
  "Divertissement",
];

export default function JournalPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");

  const token =
    localStorage.getItem("auth_token") || localStorage.getItem("authToken");
  const isLoggedIn = !!token;

  // Public listings
  const { data: listingsData, isLoading } = useQuery({
    queryKey: ["marketing", "journal", "listings", categoryFilter],
    queryFn: async () => {
      let url = "/api/marketing/journal/listings?limit=50";
      if (categoryFilter && categoryFilter !== "all")
        url += `&category=${categoryFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 30_000,
  });

  // My listings
  const { data: myListings } = useQuery({
    queryKey: ["marketing", "journal", "my-listings"],
    queryFn: async () => {
      const res = await fetch("/api/marketing/journal/my-listings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
    enabled: isLoggedIn,
  });

  // Past editions
  const { data: editions } = useQuery({
    queryKey: ["marketing", "journal", "editions"],
    queryFn: async () => {
      const res = await fetch("/api/marketing/journal/editions");
      if (!res.ok) return [];
      const json = await res.json();
      return json.data || [];
    },
  });

  // Create listing
  const createMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await fetch("/api/marketing/journal/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create listing");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Listing submitted!",
        description: "Your ad will be reviewed and published shortly.",
      });
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["marketing", "journal"] });
    },
    onError: (err: Error) => {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    contact_phone: "",
    contact_email: "",
    address: "",
    city: "",
    website_url: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const listings = listingsData?.data || [];
  const filteredListings = search
    ? listings.filter(
        (l: any) =>
          l.title?.toLowerCase().includes(search.toLowerCase()) ||
          l.description?.toLowerCase().includes(search.toLowerCase()),
      )
    : listings;

  const statusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-[95vw] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Newspaper className="h-8 w-8 text-amber-400" />
              Free Ad Journal
            </h1>
            <p className="text-gray-400 mt-1">
              Publish your business for free in our print & digital journal
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href="/api/marketing/journal/pdf/weekly"
              target="_blank"
              rel="noopener"
            >
              <Button variant="outline" className="border-gray-600">
                <Download className="h-4 w-4 mr-2" />
                Download Weekly
              </Button>
            </a>
            {isLoggedIn && (
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black">
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Your Ad
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      Submit a Free Ad
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Title *</Label>
                      <Input
                        className="bg-gray-800 border-gray-600 text-white"
                        value={form.title}
                        onChange={(e) =>
                          setForm({ ...form, title: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Description *</Label>
                      <Textarea
                        className="bg-gray-800 border-gray-600 text-white min-h-[100px]"
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Category *</Label>
                      <Select
                        value={form.category}
                        onValueChange={(v) => setForm({ ...form, category: v })}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-300">Phone</Label>
                        <Input
                          className="bg-gray-800 border-gray-600 text-white"
                          value={form.contact_phone}
                          onChange={(e) =>
                            setForm({ ...form, contact_phone: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Email</Label>
                        <Input
                          type="email"
                          className="bg-gray-800 border-gray-600 text-white"
                          value={form.contact_email}
                          onChange={(e) =>
                            setForm({ ...form, contact_email: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-300">City</Label>
                        <Input
                          className="bg-gray-800 border-gray-600 text-white"
                          value={form.city}
                          onChange={(e) =>
                            setForm({ ...form, city: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Website</Label>
                        <Input
                          className="bg-gray-800 border-gray-600 text-white"
                          value={form.website_url}
                          onChange={(e) =>
                            setForm({ ...form, website_url: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300">Address</Label>
                      <Input
                        className="bg-gray-800 border-gray-600 text-white"
                        value={form.address}
                        onChange={(e) =>
                          setForm({ ...form, address: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending
                        ? "Submitting..."
                        : "Submit Ad for Review"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search listings..."
              className="bg-gray-800/50 border-gray-700 text-white pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-600">
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* My Listings */}
        {myListings && myListings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-3">
              My Listings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.map((listing: any) => (
                <Card
                  key={listing.id}
                  className="bg-gray-800/60 border-gray-700"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-medium">
                        {listing.title}
                      </h3>
                      <div className="flex items-center gap-1">
                        {statusIcon(listing.status)}
                        <Badge variant="outline" className="text-xs">
                          {listing.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">
                      {listing.description}
                    </p>
                    <Badge className="mt-2 bg-amber-500/10 text-amber-400 text-xs">
                      {listing.category}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Public Listings */}
        <h2 className="text-lg font-semibold text-white mb-3">
          Published Listings ({filteredListings.length})
        </h2>
        {isLoading ? (
          <div className="text-gray-400 text-center py-12">
            Loading listings...
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">
              No listings found. Be the first to publish!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredListings.map((listing: any) => (
              <Card
                key={listing.id}
                className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-semibold">
                      {listing.title}
                    </h3>
                    {listing.is_premium && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-xs">
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm mb-3 line-clamp-3">
                    {listing.description}
                  </p>
                  <Badge variant="outline" className="text-xs mb-3">
                    {listing.category}
                  </Badge>
                  <div className="text-xs text-gray-500 space-y-1">
                    {listing.city && <p>📍 {listing.city}</p>}
                    {listing.contact_phone && <p>📞 {listing.contact_phone}</p>}
                    {listing.contact_email && <p>✉️ {listing.contact_email}</p>}
                    {listing.website_url && (
                      <p>
                        🌐{" "}
                        <a
                          href={listing.website_url}
                          target="_blank"
                          rel="noopener"
                          className="text-amber-400 hover:underline"
                        >
                          {listing.website_url}
                        </a>
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Past Editions */}
        {editions && editions.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-white mb-3">
              Past Editions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {editions.map((ed: any) => (
                <Card key={ed.id} className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium capitalize">
                        {ed.type} Edition
                      </p>
                      <p className="text-gray-500 text-xs">
                        {new Date(ed.generated_at).toLocaleDateString()}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {ed.listing_count} listings
                      </p>
                    </div>
                    <a
                      href={`/api/marketing/journal/pdf/${ed.type}`}
                      target="_blank"
                      rel="noopener"
                      title={`Download ${ed.type} edition`}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-gray-600"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
