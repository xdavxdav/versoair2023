import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface BusinessFormProps {
  onSuccess?: () => void;
  defaultCountryCode?: string;
}

export function BusinessForm({
  onSuccess,
  defaultCountryCode,
}: BusinessFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    countryCode:
      defaultCountryCode && defaultCountryCode !== "all"
        ? defaultCountryCode
        : "",
    cityName: "",
    address: "",
    phone: "",
    email: "",
    description: "",
  });

  // Fetch countries
  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const res = await fetch("/api/countries");
      if (!res.ok) throw new Error("Failed to fetch countries");
      return res.json();
    },
  });

  // Sync country when dashboard selection changes or dialog opens
  useEffect(() => {
    if (defaultCountryCode && defaultCountryCode !== "all") {
      setFormData((prev) => ({ ...prev, countryCode: defaultCountryCode }));
    }
  }, [defaultCountryCode, open]);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Business name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.categoryId) {
      toast({
        title: "Validation Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    if (!formData.countryCode) {
      toast({
        title: "Validation Error",
        description: "Please select a country",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          categoryId: parseInt(formData.categoryId),
          countryCode: formData.countryCode,
          cityName: formData.cityName || null,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          description: formData.description || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create business");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: `Business "${formData.name}" created successfully`,
      });

      // Reset form
      setFormData({
        name: "",
        categoryId: "",
        countryCode:
          defaultCountryCode && defaultCountryCode !== "all"
            ? defaultCountryCode
            : "",
        cityName: "",
        address: "",
        phone: "",
        email: "",
        description: "",
      });

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating business:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to create business",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCountry = countries.find(
    (c: any) => c.code === formData.countryCode,
  );
  const selectedCategory = categories.find(
    (c: any) => c.id === parseInt(formData.categoryId),
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
          <Plus className="h-4 w-4" />
          Add Business
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md bg-slate-950 border border-white/10">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Add New Business</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new business entry for your directory
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Business Name */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">Business Name *</Label>
            <Input
              type="text"
              placeholder="e.g., Acme Corp, The Coffee House"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">Category *</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10">
                {categories.map((cat: any) => (
                  <SelectItem
                    key={cat.id}
                    value={String(cat.id)}
                    className="text-slate-100 hover:bg-white/10"
                  >
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Country */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">Country *</Label>
            <Select
              value={formData.countryCode}
              onValueChange={(v) =>
                setFormData({ ...formData, countryCode: v })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                <SelectValue placeholder="Select a country" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                {countries.map((country: any) => (
                  <SelectItem
                    key={country.code}
                    value={country.code}
                    className="text-slate-100 hover:bg-white/10"
                  >
                    {country.name} ({country.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City Name */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">City</Label>
            <Input
              type="text"
              placeholder="e.g., New York, Paris"
              value={formData.cityName}
              onChange={(e) =>
                setFormData({ ...formData, cityName: e.target.value })
              }
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">Address</Label>
            <Input
              type="text"
              placeholder="e.g., 123 Main St, Suite 100"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">Phone</Label>
            <Input
              type="tel"
              placeholder="e.g., +1-555-0123"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">Email</Label>
            <Input
              type="email"
              placeholder="e.g., contact@business.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">Description</Label>
            <Input
              type="text"
              placeholder="Brief description of the business"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Summary */}
          {selectedCategory && selectedCountry && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-4 text-sm text-slate-300">
                <p>
                  Creating <strong>{formData.name || "Untitled"}</strong> in{" "}
                  <strong>{selectedCategory.name}</strong> for{" "}
                  <strong>{selectedCountry.name}</strong>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-white/10 text-slate-300 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting ? "Creating..." : "Create Business"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
