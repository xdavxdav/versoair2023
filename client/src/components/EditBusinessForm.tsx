import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Pencil } from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";

interface EditBusinessFormProps {
  business: {
    id: number;
    name: string;
    category_id?: number;
    categoryId?: number;
    country_code?: string;
    countryCode?: string;
    city_name?: string;
    cityName?: string;
    address?: string;
    phone?: string;
    email?: string;
    description?: string;
    is_active?: boolean;
    isActive?: boolean;
  };
  onSuccess?: () => void;
}

export function EditBusinessForm({
  business,
  onSuccess,
}: EditBusinessFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    countryCode: "",
    cityName: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    isActive: true,
  });

  // Populate form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        name: business.name || "",
        categoryId: String(business.category_id || business.categoryId || ""),
        countryCode: business.country_code || business.countryCode || "",
        cityName: business.city_name || business.cityName || "",
        address: business.address || "",
        phone: business.phone || "",
        email: business.email || "",
        description: business.description || "",
        isActive: business.is_active ?? business.isActive ?? true,
      });
    }
  }, [open, business]);

  // Fetch countries
  const { data: countries = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const res = await fetch("/api/countries");
      if (!res.ok) throw new Error("Failed to fetch countries");
      return res.json();
    },
  });

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

    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Business name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: Record<string, any> = {
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        description: formData.description || null,
        address: formData.address || null,
        countryCode: formData.countryCode || null,
        cityName: formData.cityName || null,
        isActive: formData.isActive,
      };

      if (formData.categoryId) {
        payload.categoryId = parseInt(formData.categoryId);
      }

      const response = await fetch(`/api/businesses/${business.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update business");
      }

      toast({
        title: "Updated",
        description: `"${formData.name}" updated successfully`,
      });

      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error updating business:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to update business",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto bg-slate-950 border border-white/10 notranslate"
        translate="no"
      >
        <DialogHeader>
          <DialogTitle className="text-slate-100">Edit Business</DialogTitle>
          <DialogDescription className="text-slate-400">
            Update details for <strong>{business.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Business Name */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">Business Name *</Label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="bg-white/5 border-white/10 text-slate-100"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">Category</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(v) => setFormData({ ...formData, categoryId: v })}
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                <SelectValue placeholder="Select category" />
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
            <Label className="text-slate-200">Country</Label>
            <Select
              value={formData.countryCode}
              onValueChange={(v) =>
                setFormData({ ...formData, countryCode: v })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                <SelectValue placeholder="Select country" />
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

          {/* City + Address row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-slate-200">City</Label>
              <Input
                type="text"
                value={formData.cityName}
                onChange={(e) =>
                  setFormData({ ...formData, cityName: e.target.value })
                }
                className="bg-white/5 border-white/10 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-200">Address</Label>
              <Input
                type="text"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                className="bg-white/5 border-white/10 text-slate-100"
              />
            </div>
          </div>

          {/* Phone + Email row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-slate-200">Phone</Label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="bg-white/5 border-white/10 text-slate-100"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-200">Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="bg-white/5 border-white/10 text-slate-100"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500 resize-none"
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 p-3">
            <Label className="text-slate-200 text-sm">Active Status</Label>
            <Switch
              checked={formData.isActive}
              onCheckedChange={(v) => setFormData({ ...formData, isActive: v })}
            />
          </div>

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
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
