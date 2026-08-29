import { useState } from "react";
import { Link } from "wouter";
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
  ArrowLeft,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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

const LOGO_URL = "https://i.ibb.co/d0PtnHS2/Adobe-Express-file.png";

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
        return <CheckCircle className="h-3.5 w-3.5 text-green-400" />;
      case "pending":
        return <Clock className="h-3.5 w-3.5 text-yellow-400" />;
      case "rejected":
        return <XCircle className="h-3.5 w-3.5 text-red-400" />;
      default:
        return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f3efe9] text-slate-900">
      {/* ── Sticky compact header with logo ── */}
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
          {/* Left: logo + title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/marketing" className="shrink-0">
              <img src={LOGO_URL} alt="Verso Air" className="h-8 w-auto" />
            </Link>
            <div className="h-5 w-px bg-gray-700 shrink-0 hidden sm:block" />
            <div className="flex items-center gap-1.5 min-w-0">
              <Newspaper className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-sm font-semibold text-white truncate">
                Free Ad Journal
              </span>
            </div>
          </div>
          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <a
              href="/api/marketing/journal/pdf/weekly"
              target="_blank"
              rel="noopener"
            >
              <Button
                size="sm"
                variant="outline"
                className="border-gray-700 text-xs h-8"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Weekly PDF</span>
              </Button>
            </a>
            {isLoggedIn && (
              <Dialog open={showCreate} onOpenChange={setShowCreate}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-amber-500 hover:bg-amber-600 text-black text-xs h-8"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Submit Ad
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900 border-gray-700 max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      Submit a Free Ad
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <Label className="text-gray-300 text-xs">Title *</Label>
                      <Input
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        value={form.title}
                        onChange={(e) =>
                          setForm({ ...form, title: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300 text-xs">
                        Description *
                      </Label>
                      <Textarea
                        className="bg-gray-800 border-gray-600 text-white min-h-[80px]"
                        value={form.description}
                        onChange={(e) =>
                          setForm({ ...form, description: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300 text-xs">
                        Category *
                      </Label>
                      <Select
                        value={form.category}
                        onValueChange={(v) => setForm({ ...form, category: v })}
                      >
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-9">
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
                        <Label className="text-gray-300 text-xs">Phone</Label>
                        <Input
                          className="bg-gray-800 border-gray-600 text-white h-9"
                          value={form.contact_phone}
                          onChange={(e) =>
                            setForm({ ...form, contact_phone: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-xs">Email</Label>
                        <Input
                          type="email"
                          className="bg-gray-800 border-gray-600 text-white h-9"
                          value={form.contact_email}
                          onChange={(e) =>
                            setForm({ ...form, contact_email: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-300 text-xs">City</Label>
                        <Input
                          className="bg-gray-800 border-gray-600 text-white h-9"
                          value={form.city}
                          onChange={(e) =>
                            setForm({ ...form, city: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300 text-xs">Website</Label>
                        <Input
                          className="bg-gray-800 border-gray-600 text-white h-9"
                          value={form.website_url}
                          onChange={(e) =>
                            setForm({ ...form, website_url: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-xs">Address</Label>
                      <Input
                        className="bg-gray-800 border-gray-600 text-white h-9"
                        value={form.address}
                        onChange={(e) =>
                          setForm({ ...form, address: e.target.value })
                        }
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black h-9"
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
            <Link href="/marketing">
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 text-xs h-8 px-2"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Main content — centered & compact ── */}
      <div className="max-w-5xl mx-auto px-4 py-5">
        {/* Filters — single row */}
        <div className="flex gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <Input
              placeholder="Search listings..."
              className="bg-gray-800/50 border-gray-700 text-white pl-9 h-9 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-gray-800/50 border-gray-700 text-white w-40 h-9 text-sm">
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
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-white mb-2">
              My Listings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {myListings.map((listing: any) => (
                <Card
                  key={listing.id}
                  className="bg-gray-800/60 border-gray-700"
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-white text-sm font-medium truncate mr-2">
                        {listing.title}
                      </h3>
                      <div className="flex items-center gap-1 shrink-0">
                        {statusIcon(listing.status)}
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          {listing.status}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-gray-400 text-xs line-clamp-2">
                      {listing.description}
                    </p>
                    <Badge className="mt-1.5 bg-amber-500/10 text-amber-400 text-[10px]">
                      {listing.category}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Public Listings */}
        <h2 className="text-sm font-semibold text-white mb-2">
          Published Listings ({filteredListings.length})
        </h2>
        {isLoading ? (
          <div className="text-gray-400 text-center py-10 text-sm">
            Loading listings...
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-10">
            <FileText className="h-10 w-10 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">
              No listings found. Be the first to publish!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredListings.map((listing: any) => (
              <Card
                key={listing.id}
                className="bg-gray-800/50 border-gray-700 hover:border-gray-600 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-1">
                    <h3 className="text-white text-sm font-semibold">
                      {listing.title}
                    </h3>
                    {listing.is_premium && (
                      <Badge className="bg-amber-500/20 text-amber-400 text-[10px] ml-2 shrink-0">
                        Premium
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs mb-2 line-clamp-2">
                    {listing.description}
                  </p>
                  <Badge variant="outline" className="text-[10px] mb-2">
                    {listing.category}
                  </Badge>
                  <div className="text-[11px] text-gray-500 space-y-0.5">
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
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-white mb-2">
              Past Editions
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {editions.map((ed: any) => (
                <Card key={ed.id} className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-xs font-medium capitalize">
                        {ed.type}
                      </p>
                      <p className="text-gray-500 text-[10px]">
                        {new Date(ed.generated_at).toLocaleDateString()} ·{" "}
                        {ed.listing_count} ads
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
                        className="border-gray-600 h-7 w-7 p-0"
                      >
                        <Download className="h-3.5 w-3.5" />
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
