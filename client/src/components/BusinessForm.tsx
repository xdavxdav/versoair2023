import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { resolveLang, submitJson } from "@/lib/submit-json";
import { useLanguage } from "@/components/LanguageSwitcher";
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

// The dialog sets translate="no", so browser auto-translate cannot help here.
// English text is unchanged from before; French follows the site style.
const COPY = {
  en: {
    addBusiness: "Add Business",
    title: "Add New Business",
    descriptionDirect: "Create a new business entry for your directory",
    descriptionRequest:
      "Send this business to our team. It is published once approved.",
    name: "Business Name *",
    namePlaceholder: "e.g., Acme Corp, The Coffee House",
    category: "Category *",
    selectCategory: "Select a category",
    loadingCategories: "Loading categories...",
    categoriesFailed:
      "Categories could not be loaded. Refresh the page and try again.",
    businessType: "Business Type",
    selectBusinessType: "Select a business type",
    country: "Country *",
    selectCountry: "Select a country",
    countriesFailed:
      "Countries could not be loaded. Refresh the page and try again.",
    phone: "Phone",
    phonePlaceholder: "e.g., +1-555-0123",
    email: "Email",
    emailPlaceholder: "e.g., contact@business.com",
    description: "Description",
    descriptionPlaceholder: "Brief description of the business",
    cancel: "Cancel",
    submitting: "Submitting...",
    submitRequest: "Submit Request",
    createBusiness: "Create Business",
    untitled: "Untitled",
    selectCountryFirst: "Select country first",
    switchToManual: "Switch to manual input",
    switchToDropdown: "Switch to dropdown",
    loadingMany: (what: string) => `Loading ${what}s...`,
    loadingOne: (what: string) => `Loading ${what}...`,
    select: (what: string) => `Select ${what}`,
    selectWhatFirst: (what: string) => `Select ${what} first`,
    typeName: (what: string) => `Type ${what} name`,
    summary: (name: string, category: string, country: string) => (
      <>
        Creating <strong>{name}</strong> in <strong>{category}</strong> for{" "}
        <strong>{country}</strong>
      </>
    ),
    validationTitle: "Validation Error",
    nameRequired: "Business name is required",
    categoryRequired: "Please select a category",
    countryRequired: "Please select a country",
    errorTitle: "Error",
    createFailed: "Failed to create business",
    successTitle: "Success",
    requestSentTitle: "Request Submitted ✉️",
    created: (name: string) => `Business "${name}" created successfully`,
    requestSent: (name: string, ref?: string) =>
      `Your request for "${name}" has been sent to the admin team for review.${ref ? ` Reference: ${ref}.` : ""}`,
  },
  fr: {
    addBusiness: "Ajouter une entreprise",
    title: "Ajouter une entreprise",
    descriptionDirect: "Créez une nouvelle fiche d'entreprise pour votre annuaire",
    descriptionRequest:
      "Envoyez cette entreprise à notre équipe. Elle est publiée une fois approuvée.",
    name: "Nom de l'entreprise *",
    namePlaceholder: "p. ex. Maquis Chez Awa, Boutique Soleil",
    category: "Catégorie *",
    selectCategory: "Choisir une catégorie",
    loadingCategories: "Chargement des catégories...",
    categoriesFailed:
      "Impossible de charger les catégories. Actualisez la page et réessayez.",
    businessType: "Type d'entreprise",
    selectBusinessType: "Choisir un type d'entreprise",
    country: "Pays *",
    selectCountry: "Choisir un pays",
    countriesFailed:
      "Impossible de charger les pays. Actualisez la page et réessayez.",
    phone: "Téléphone",
    phonePlaceholder: "p. ex. +225 01 02 03 04 05",
    email: "E-mail",
    emailPlaceholder: "p. ex. contact@entreprise.com",
    description: "Description",
    descriptionPlaceholder: "Brève description de l'entreprise",
    cancel: "Annuler",
    submitting: "Envoi en cours...",
    submitRequest: "Envoyer la demande",
    createBusiness: "Créer l'entreprise",
    untitled: "Sans nom",
    selectCountryFirst: "Choisissez d'abord un pays",
    switchToManual: "Passer à la saisie manuelle",
    switchToDropdown: "Passer à la liste déroulante",
    loadingMany: () => "Chargement...",
    loadingOne: () => "Chargement...",
    select: (what: string) => `Sélectionner : ${what}`,
    selectWhatFirst: (what: string) => `Sélectionnez d'abord : ${what}`,
    typeName: (what: string) => `Saisir : ${what}`,
    summary: (name: string, category: string, country: string) => (
      <>
        Création de <strong>{name}</strong> dans <strong>{category}</strong>{" "}
        pour <strong>{country}</strong>
      </>
    ),
    validationTitle: "Erreur de validation",
    nameRequired: "Le nom de l'entreprise est obligatoire",
    categoryRequired: "Veuillez choisir une catégorie",
    countryRequired: "Veuillez choisir un pays",
    errorTitle: "Erreur",
    createFailed: "Impossible de créer l'entreprise",
    successTitle: "Succès",
    requestSentTitle: "Demande envoyée ✉️",
    created: (name: string) => `L'entreprise « ${name} » a été créée.`,
    requestSent: (name: string, ref?: string) =>
      `Votre demande pour « ${name} » a été transmise à l'équipe pour examen.${ref ? ` Référence : ${ref}.` : ""}`,
  },
};

export interface BusinessFormResult {
  name: string;
  /** Present for approval requests; quote it when contacting support. */
  referenceId?: string;
  /** True when the request was also saved as a ticket the requester can follow. */
  recorded?: boolean;
}

interface BusinessFormProps {
  onSuccess?: (result: BusinessFormResult) => void;
  defaultCountryCode?: string;
  /** When true, submit goes to /api/request/business (pending approval flow) */
  requireApproval?: boolean;
  /** Username of the submitter — sent along when requireApproval is true */
  username?: string | null;
  /** Open the dialog as soon as it is shown (used by the business request page). */
  defaultOpen?: boolean;
  /** Replaces the label of the button that opens the dialog. */
  triggerLabel?: string;
}

export function BusinessForm({
  onSuccess,
  defaultCountryCode,
  requireApproval = false,
  username,
  defaultOpen = false,
  triggerLabel,
}: BusinessFormProps) {
  const { currentLang } = useLanguage();
  const lang = resolveLang(currentLang);
  const copy = COPY[lang];
  const [open, setOpen] = useState(defaultOpen);
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
  const { data: countriesRaw = [], isError: countriesFailed } = useQuery({
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
  const { data: citiesRaw = [], isLoading: citiesLoading } = useQuery({
    queryKey: [
      "cities",
      selectedRegionId
        ? `region-${selectedRegionId}`
        : `country-${matchedCountry?.id}-rl-${(regionsList as any[]).length}`,
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

  // Deduplicate cities by name (API can return duplicates across regions)
  const citiesList = Array.from(
    new Map((citiesRaw as any[]).map((c: any) => [c.name, c])).values(),
  );

  // Sync country when dashboard selection changes or dialog opens
  useEffect(() => {
    if (defaultCountryCode && defaultCountryCode !== "all") {
      setFormData((prev) => ({ ...prev, countryCode: defaultCountryCode }));
    }
  }, [defaultCountryCode, open]);

  // Fetch categories
  const {
    data: categories = [],
    isError: categoriesFailed,
  } = useQuery({
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
        title: copy.validationTitle,
        description: copy.nameRequired,
        variant: "destructive",
      });
      return;
    }

    if (!formData.categoryId) {
      toast({
        title: copy.validationTitle,
        description: copy.categoryRequired,
        variant: "destructive",
      });
      return;
    }

    if (!formData.countryCode) {
      toast({
        title: copy.validationTitle,
        description: copy.countryRequired,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      // requireApproval sends the request to the admin team (emailed and saved
      // as a ticket); otherwise the business is created directly.
      const endpoint = requireApproval
        ? "/api/request/business"
        : "/api/v1/admin/businesses";

      // Resolve category name for the email
      let categoryName = "";
      if (requireApproval && formData.categoryId) {
        const cat = categories.find(
          (c: any) => c.id === parseInt(formData.categoryId),
        );
        categoryName = cat?.name || "";
      }

      const result = await submitJson<{
        referenceId?: string;
        recorded?: boolean;
      }>(endpoint, {
        body: {
          name: formData.name,
          categoryId: parseInt(formData.categoryId),
          categoryName: categoryName || undefined,
          businessType: formData.businessType || null,
          countryCode: formData.countryCode,
          cityName: formData.cityName || null,
          regionId: formData.regionId ? parseInt(formData.regionId) : null,
          regionName: formData.regionName || null,
          address: formData.address || null,
          phone: formData.phone || null,
          email: formData.email || null,
          description: formData.description || null,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null,
          // The server records who is signed in; this is only an extra hint.
          ...(requireApproval && username ? { username } : {}),
        },
        fallbackMessage: copy.createFailed,
        lang,
      });

      if (!result.ok) {
        toast({
          title: copy.errorTitle,
          description: result.message,
          variant: "destructive",
        });
        return;
      }

      const submittedName = formData.name.trim();
      const referenceId = requireApproval
        ? result.data?.referenceId
        : undefined;

      toast({
        title: requireApproval ? copy.requestSentTitle : copy.successTitle,
        description: requireApproval
          ? copy.requestSent(submittedName, referenceId)
          : copy.created(submittedName),
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
      onSuccess?.({
        name: submittedName,
        referenceId,
        recorded: requireApproval ? Boolean(result.data?.recorded) : undefined,
      });
    } catch (error) {
      console.error("Error creating business:", error);
      toast({
        title: copy.errorTitle,
        description:
          error instanceof Error ? error.message : copy.createFailed,
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
          {triggerLabel ?? copy.addBusiness}
        </Button>
      </DialogTrigger>

      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto bg-slate-950 border border-white/10 notranslate"
        translate="no"
      >
        <DialogHeader>
          <DialogTitle className="text-slate-100">{copy.title}</DialogTitle>
          <DialogDescription className="text-slate-400">
            {requireApproval
              ? copy.descriptionRequest
              : copy.descriptionDirect}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Business Name */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">{copy.name}</Label>
            <Input
              type="text"
              placeholder={copy.namePlaceholder}
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">{copy.category}</Label>
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
                <SelectValue placeholder={copy.selectCategory} />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 max-h-60">
                {categories.length === 0 ? (
                  <SelectItem
                    value="__loading"
                    disabled
                    className="text-slate-400"
                  >
                    {categoriesFailed
                      ? copy.categoriesFailed
                      : copy.loadingCategories}
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
            <Label className="text-slate-200">{copy.businessType}</Label>
            <Select
              value={formData.businessType || ""}
              onValueChange={(v) =>
                setFormData({ ...formData, businessType: v })
              }
            >
              <SelectTrigger className="bg-white/5 border-white/10 text-slate-100">
                <SelectValue placeholder={copy.selectBusinessType} />
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
            <Label className="text-slate-200">{copy.country}</Label>
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
                <SelectValue placeholder={copy.selectCountry} />
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
            {countriesFailed && (
              <p role="alert" className="text-xs text-red-300">
                {copy.countriesFailed}
              </p>
            )}
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
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-manipulation ${
                          autoPopulateRegion ? "bg-indigo-500" : "bg-slate-600"
                        }`}
                        title={
                          autoPopulateRegion
                            ? copy.switchToManual
                            : copy.switchToDropdown
                        }
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            autoPopulateRegion
                              ? "translate-x-[22px]"
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
                          ? copy.loadingMany(labels.region.toLowerCase())
                          : copy.select(labels.region.toLowerCase())}
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
                            ? copy.loadingMany(labels.region.toLowerCase())
                            : copy.typeName(labels.region.toLowerCase())
                          : copy.selectCountryFirst
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
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors touch-manipulation ${
                          autoPopulateCity ? "bg-indigo-500" : "bg-slate-600"
                        }`}
                        title={
                          autoPopulateCity
                            ? copy.switchToManual
                            : copy.switchToDropdown
                        }
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                            autoPopulateCity
                              ? "translate-x-[22px]"
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
                          ? copy.loadingOne(labels.city.toLowerCase())
                          : copy.select(labels.city.toLowerCase())}
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
                            ? copy.selectWhatFirst(labels.region.toLowerCase())
                            : copy.typeName(labels.city.toLowerCase())
                          : copy.selectCountryFirst
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
            <Label className="text-slate-200">{copy.phone}</Label>
            <Input
              type="tel"
              placeholder={copy.phonePlaceholder}
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">{copy.email}</Label>
            <Input
              type="email"
              placeholder={copy.emailPlaceholder}
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="bg-white/5 border-white/10 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-slate-200">{copy.description}</Label>
            <Input
              type="text"
              placeholder={copy.descriptionPlaceholder}
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
                setFormData((prev) => ({ ...prev, latitude: v }))
              }
              onLongitudeChange={(v) =>
                setFormData((prev) => ({ ...prev, longitude: v }))
              }
              onCountryDetected={(code) => {
                setFormData((prev) => {
                  if (prev.countryCode) return prev;
                  return { ...prev, countryCode: code };
                });
              }}
              onRegionDetected={(regionName) => {
                setFormData((prev) => {
                  if (prev.regionId) return prev;
                  const match = (regionsList as any[]).find(
                    (r: any) =>
                      r.name.toLowerCase() === regionName.toLowerCase() ||
                      regionName.toLowerCase().includes(r.name.toLowerCase()) ||
                      r.name.toLowerCase().includes(regionName.toLowerCase()),
                  );
                  if (match) {
                    return { ...prev, regionId: String(match.id) };
                  } else {
                    setAutoPopulateRegion(false);
                    return { ...prev, regionName: regionName };
                  }
                });
              }}
              onCityDetected={(city) => {
                setFormData((prev) => {
                  if (prev.cityName) return prev;
                  return { ...prev, cityName: city };
                });
              }}
              dark
            />
          </div>

          {/* Summary */}
          {selectedCategory && selectedCountry && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-4 text-sm text-slate-300">
                <p>
                  {copy.summary(
                    formData.name || copy.untitled,
                    selectedCategory.name,
                    selectedCountry.name,
                  )}
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
              {copy.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSubmitting
                ? copy.submitting
                : requireApproval
                  ? copy.submitRequest
                  : copy.createBusiness}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
