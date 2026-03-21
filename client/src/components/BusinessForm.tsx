import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { getCsrfToken, initializeCsrfToken } from "@/lib/auth";
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
import {
  GeolocationFields,
  BUSINESS_TYPE_OPTIONS,
  getBusinessTypesForCategory,
  getAdminLabels,
} from "@/components/ui/geolocation-fields";

interface BusinessFormProps {
  onSuccess?: () => void;
  defaultCountryCode?: string;
  /** When true, submit goes to /api/businesses/submit (pending approval flow) */
  requireApproval?: boolean;
  /** Username of the submitter — sent along when requireApproval is true */
  username?: string | null;
}

export function BusinessForm({
  onSuccess,
  defaultCountryCode,
  requireApproval = false,
  username,
}: BusinessFormProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    businessType: "",
    countryCode:
      defaultCountryCode && defaultCountryCode !== "all"
        ? defaultCountryCode
        : "",
    regionId: "",
    regionName: "",
    cityName: "",
    address: "",
    phone: "",
    email: "",
    description: "",
    latitude: "",
    longitude: "",
  });

  const [autoPopulateRegion, setAutoPopulateRegion] = useState(true);
  const [autoPopulateCity, setAutoPopulateCity] = useState(true);

  // Fetch countries
  const { data: countriesRaw = [] } = useQuery({
    queryKey: ["countries"],
    queryFn: async () => {
      const res = await fetch("/api/countries");
      if (!res.ok) throw new Error("Failed to fetch countries");
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    },
  });
  const countries = countriesRaw as any[];

  // Fetch cities filtered by selected country
  const matchedCountry = countries.find(
    (c: any) => c.code === formData.countryCode,
  );

  // Fetch regions filtered by country — cascading: Country → Region
  const { data: regionsList = [], isLoading: regionsLoading } = useQuery({
    queryKey: ["regions", matchedCountry?.id],
    queryFn: async () => {
      if (!matchedCountry?.id) return [];
      const res = await fetch(`/api/regions?countryId=${matchedCountry.id}`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    },
    enabled: !!matchedCountry?.id,
  });

  // Fetch cities filtered by region (or by country if no regions exist)
  const selectedRegionId = formData.regionId;
  const { data: citiesList = [], isLoading: citiesLoading } = useQuery({
    queryKey: [
      "cities",
      selectedRegionId
        ? `region-${selectedRegionId}`
        : `country-${matchedCountry?.id}`,
    ],
    queryFn: async () => {
      if (selectedRegionId) {
        // Cascade: Region → City
        const res = await fetch(`/api/cities?regionId=${selectedRegionId}`);
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json) ? json : json.data || [];
      }
      // Fallback: Country → City (when no regions exist for this country)
      if (!matchedCountry?.id) return [];
      if ((regionsList as any[]).length > 0) return []; // regions exist but none selected yet
      const res = await fetch(`/api/cities?countryId=${matchedCountry.id}`);
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : json.data || [];
    },
    enabled: !!matchedCountry?.id,
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

      // When requireApproval is true, send email notification only (no DB insert)
      // Otherwise, create the business directly
      const endpoint = requireApproval
        ? "/api/request/business"
        : "/api/businesses";

      // Resolve category name for the email
      let categoryName = "";
      if (requireApproval && formData.categoryId) {
        const cat = categories.find(
          (c: any) => c.id === parseInt(formData.categoryId),
        );
        categoryName = cat?.name || "";
      }

      // Ensure CSRF token is available
      let csrf = getCsrfToken();
      if (!csrf) {
        await initializeCsrfToken();
        csrf = getCsrfToken();
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        credentials: "include",
        body: JSON.stringify({
          name: formData.name,
          categoryId: parseInt(formData.categoryId),
          categoryName: categoryName || undefined,
          businessType: formData.businessType || null,
          countryCode: formData.countryCode,
          cityName: formData.cityName || null,
          regionName: formData.regionName || null,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          description: formData.description || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          ...(requireApproval ? { username: username || "GeoAdmin User" } : {}),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create business");
      }

      const result = await response.json();

      toast({
        title: requireApproval ? "Request Submitted ✉️" : "Success",
        description: requireApproval
          ? `Your request for "${formData.name}" has been sent to the admin team for review.`
          : `Business "${formData.name}" created successfully`,
      });

      // Reset form
      setFormData({
        name: "",
        categoryId: "",
        businessType: "",
        countryCode:
          defaultCountryCode && defaultCountryCode !== "all"
            ? defaultCountryCode
            : "",
        regionId: "",
        regionName: "",
        cityName: "",
        address: "",
        phone: "",
        email: "",
        description: "",
        latitude: "",
        longitude: "",
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

      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-slate-950 border border-white/10 notranslate" translate="no">
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
              value={formData.categoryId || undefined}
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
              <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                {categories.length === 0 ? (
                  <SelectItem
                    value="__loading"
                    disabled
                    className="text-slate-400"
                  >
                    Loading categories...
                  </SelectItem>
                ) : (
                  categories
                    .sort((a: any, b: any) => a.name.localeCompare(b.name))
                    .map((cat: any) => (
                      <SelectItem
                        key={cat.id}
                        value={String(cat.id)}
                        className="text-slate-100 hover:bg-white/10"
                      >
                        {cat.name}
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Business Type */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">Business Type</Label>
            <Select
              value={formData.businessType || ""}
              onValueChange={(v) =>
                setFormData({ ...formData, businessType: v })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                <SelectValue placeholder="Select a business type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                {getBusinessTypesForCategory(
                  categories,
                  formData.categoryId ? parseInt(formData.categoryId) : null,
                ).map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                    className={`text-slate-100 hover:bg-white/10 ${opt.disabled ? "opacity-40" : ""}`}
                  >
                    {opt.label}
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
                setFormData({
                  ...formData,
                  countryCode: v,
                  regionId: "",
                  cityName: "",
                })
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

          {/* Region / Province / State / Commune — dynamic label */}
          {(() => {
            const labels = getAdminLabels(formData.countryCode);
            return (
              <>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-200">{labels.region}</Label>
                    {(regionsList as any[]).length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setAutoPopulateRegion(!autoPopulateRegion)
                        }
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          autoPopulateRegion ? "bg-indigo-500" : "bg-slate-600"
                        }`}
                        title={
                          autoPopulateRegion
                            ? "Switch to manual input"
                            : "Switch to dropdown"
                        }
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                            autoPopulateRegion
                              ? "translate-x-[18px]"
                              : "translate-x-[3px]"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                  {(regionsList as any[]).length > 0 && autoPopulateRegion ? (
                    <select
                      value={formData.regionId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          regionId: e.target.value,
                          cityName: "",
                        })
                      }
                      className="flex h-10 w-full rounded-md border bg-white/5 border-white/10 text-slate-100 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="" className="bg-slate-900">
                        {regionsLoading
                          ? `Loading ${labels.region.toLowerCase()}s...`
                          : `Select ${labels.region.toLowerCase()}`}
                      </option>
                      {(regionsList as any[])
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                        .map((region: any) => (
                          <option
                            key={region.id}
                            value={String(region.id)}
                            className="bg-slate-900"
                          >
                            {region.name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <Input
                      type="text"
                      placeholder={
                        formData.countryCode
                          ? regionsLoading
                            ? `Loading ${labels.region.toLowerCase()}s...`
                            : `Type ${labels.region.toLowerCase()} name`
                          : "Select country first"
                      }
                      disabled={!formData.countryCode || regionsLoading}
                      value={formData.regionName || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, regionName: e.target.value })
                      }
                      className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-400"
                    />
                  )}
                </div>

                {/* City / Ville — dynamic label + auto-populate toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-200">{labels.city}</Label>
                    {(citiesList as any[]).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAutoPopulateCity(!autoPopulateCity)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          autoPopulateCity ? "bg-indigo-500" : "bg-slate-600"
                        }`}
                        title={
                          autoPopulateCity
                            ? "Switch to manual input"
                            : "Switch to dropdown"
                        }
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                            autoPopulateCity
                              ? "translate-x-[18px]"
                              : "translate-x-[3px]"
                          }`}
                        />
                      </button>
                    )}
                  </div>
                  {(citiesList as any[]).length > 0 && autoPopulateCity ? (
                    <select
                      value={formData.cityName}
                      onChange={(e) =>
                        setFormData({ ...formData, cityName: e.target.value })
                      }
                      className="flex h-10 w-full rounded-md border bg-white/5 border-white/10 text-slate-100 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="" className="bg-slate-900">
                        {citiesLoading
                          ? `Loading ${labels.city.toLowerCase()}...`
                          : `Select ${labels.city.toLowerCase()}`}
                      </option>
                      {(citiesList as any[])
                        .sort((a: any, b: any) => a.name.localeCompare(b.name))
                        .map((city: any) => (
                          <option
                            key={city.id}
                            value={city.name}
                            className="bg-slate-900"
                          >
                            {city.name}
                          </option>
                        ))}
                    </select>
                  ) : (
                    <Input
                      type="text"
                      placeholder={
                        formData.countryCode
                          ? (regionsList as any[]).length > 0 &&
                            !formData.regionId
                            ? `Select ${labels.region.toLowerCase()} first`
                            : `Type ${labels.city.toLowerCase()} name`
                          : "Select country first"
                      }
                      value={formData.cityName}
                      onChange={(e) =>
                        setFormData({ ...formData, cityName: e.target.value })
                      }
                      disabled={!formData.countryCode}
                      className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
                    />
                  )}
                </div>

                {/* Address — dynamic label */}
                <div className="space-y-1.5">
                  <Label className="text-slate-200">{labels.address}</Label>
                  <Input
                    type="text"
                    placeholder={
                      formData.countryCode === "CI"
                        ? "ex: Rue des Jardins, Cocody"
                        : formData.countryCode === "FR"
                          ? "ex: 12 Rue de la Paix"
                          : "e.g., 123 Main St, Suite 100"
                    }
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
                  />
                </div>
              </>
            );
          })()}

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

          {/* Location Coordinates */}
          <div className="space-y-1.5">
            <GeolocationFields
              latitude={formData.latitude}
              longitude={formData.longitude}
              onLatitudeChange={(v) =>
                setFormData({ ...formData, latitude: v })
              }
              onLongitudeChange={(v) =>
                setFormData({ ...formData, longitude: v })
              }
              onCountryDetected={(code) => {
                if (!formData.countryCode) {
                  setFormData((prev) => ({ ...prev, countryCode: code }));
                }
              }}
              onRegionDetected={(regionName) => {
                if (!formData.regionId) {
                  const match = (regionsList as any[]).find(
                    (r: any) =>
                      r.name.toLowerCase() === regionName.toLowerCase() ||
                      regionName.toLowerCase().includes(r.name.toLowerCase()) ||
                      r.name.toLowerCase().includes(regionName.toLowerCase()),
                  );
                  if (match) {
                    setFormData((prev) => ({
                      ...prev,
                      regionId: String(match.id),
                    }));
                  } else {
                    setAutoPopulateRegion(false);
                    setFormData((prev) => ({
                      ...prev,
                      regionName: regionName,
                    }));
                  }
                }
              }}
              onCityDetected={(city) => {
                if (!formData.cityName) {
                  setFormData((prev) => ({ ...prev, cityName: city }));
                }
              }}
              dark
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
              {isSubmitting
                ? "Submitting..."
                : requireApproval
                  ? "Submit Request"
                  : "Create Business"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
