import { useState, useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  defaultViewport,
} from "@/lib/animations";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  FileUp,
  MapPin,
  Shield,
  Camera,
  Clock,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { GeolocationFields } from "@/components/ui/geolocation-fields";

interface VerificationFormData {
  // Step 1: Basic
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  latitude: string;
  longitude: string;
  // Step 2: Legal
  businessRegistrationNumber: string;
  managerId: File | null;
  operationalProof: File | null;
  // Step 3: Marketing
  logo: File | null;
  actionPhotos: File[];
  openingHours: Record<string, string>;
  specialties: string[];
  socialLinks: Record<string, string>;
  // Industry Specific
  medicalLicense?: string;
  regulatoryApproval?: string;
  hygieneInspection?: string;
}

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

export default function BusinessVerificationPage() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<VerificationFormData>({
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    latitude: "",
    longitude: "",
    businessRegistrationNumber: "",
    managerId: null,
    operationalProof: null,
    logo: null,
    actionPhotos: [],
    openingHours: Object.fromEntries(DAYS.map((day) => [day, "09:00-18:00"])),
    specialties: [],
    socialLinks: {},
  });

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("verificationFormData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Don't restore files, only text data
        setFormData((prev) => ({
          ...prev,
          contactName: parsed.contactName || "",
          contactEmail: parsed.contactEmail || "",
          contactPhone: parsed.contactPhone || "",
          latitude: parsed.latitude || "",
          longitude: parsed.longitude || "",
          businessRegistrationNumber: parsed.businessRegistrationNumber || "",
          openingHours: parsed.openingHours || prev.openingHours,
          specialties: parsed.specialties || [],
          socialLinks: parsed.socialLinks || {},
        }));
      } catch (e) {
        console.error("Failed to load saved form data");
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    const toSave = {
      contactName: formData.contactName,
      contactEmail: formData.contactEmail,
      contactPhone: formData.contactPhone,
      latitude: formData.latitude,
      longitude: formData.longitude,
      businessRegistrationNumber: formData.businessRegistrationNumber,
      openingHours: formData.openingHours,
      specialties: formData.specialties,
      socialLinks: formData.socialLinks,
    };
    localStorage.setItem("verificationFormData", JSON.stringify(toSave));
  }, [formData]);

  // Calculate trust score
  const calculateTrustScore = () => {
    let score = 0;
    // Basic info (25%)
    if (formData.contactName && formData.contactEmail && formData.contactPhone)
      score += 25;
    if (formData.latitude && formData.longitude) score += 10;
    // Legal docs (35%)
    if (formData.businessRegistrationNumber) score += 15;
    if (formData.managerId) score += 10;
    if (formData.operationalProof) score += 10;
    // Marketing (25%)
    if (formData.logo) score += 10;
    if (formData.actionPhotos.length >= 3) score += 10;
    if (formData.openingHours) score += 5;
    // Industry credentials (15%)
    if (
      formData.medicalLicense ||
      formData.regulatoryApproval ||
      formData.hygieneInspection
    )
      score += 15;
    return Math.min(100, score);
  };

  const trustScore = calculateTrustScore();

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formDataToSend = new FormData();

      // Add all text fields
      formDataToSend.append("contactName", formData.contactName);
      formDataToSend.append("contactEmail", formData.contactEmail);
      formDataToSend.append("contactPhone", formData.contactPhone);
      formDataToSend.append("latitude", formData.latitude);
      formDataToSend.append("longitude", formData.longitude);
      formDataToSend.append(
        "businessRegistrationNumber",
        formData.businessRegistrationNumber,
      );
      formDataToSend.append(
        "openingHours",
        JSON.stringify(formData.openingHours),
      );
      formDataToSend.append(
        "specialties",
        JSON.stringify(formData.specialties),
      );
      formDataToSend.append(
        "socialLinks",
        JSON.stringify(formData.socialLinks),
      );

      // Add files
      if (formData.managerId)
        formDataToSend.append("managerId", formData.managerId);
      if (formData.operationalProof)
        formDataToSend.append("operationalProof", formData.operationalProof);
      if (formData.logo) formDataToSend.append("logo", formData.logo);
      formData.actionPhotos.forEach((photo, idx) => {
        formDataToSend.append(`actionPhotos_${idx}`, photo);
      });

      const response = await fetch("/api/verifications/submit", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) throw new Error("Failed to submit verification");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Submission Successful!",
        description: "Your Digital Passport application is under review.",
      });
      localStorage.removeItem("verificationFormData");
      setStep(1);
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Quick Navigation */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto text-sm">
          <Link href="/">
            <span className="px-3 py-1.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors cursor-pointer whitespace-nowrap">
              🏠 Accueil
            </span>
          </Link>
          <Link href="/geo-admin">
            <span className="px-3 py-1.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors cursor-pointer whitespace-nowrap">
              🌍 Geo Admin
            </span>
          </Link>
          <Link href="/businesses-directory">
            <span className="px-3 py-1.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-700 transition-colors cursor-pointer whitespace-nowrap">
              📋 Annuaire
            </span>
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-4xl font-bold text-gray-900 dark:text-white mb-2"
          >
            🪨 Versoair Business ID
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="text-gray-600 dark:text-gray-400"
          >
            Create your Digital Passport for advertisement-ready visibility
          </motion.p>
        </div>

        {/* Trust Score Card */}
        <Card className="mb-6 border-blue-200 dark:border-blue-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Your Trust Score</CardTitle>
                <CardDescription>
                  Complete more sections to boost visibility
                </CardDescription>
              </div>
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                {trustScore}%
              </div>
            </div>
            <Progress value={trustScore} className="mt-4 h-3" />
          </CardHeader>
        </Card>

        {/* Stepper */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-4">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() => setStep(s)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                          s === step
                            ? "bg-blue-600 text-white"
                            : s < step
                              ? "bg-green-600 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-600"
                        }`}
                      >
                        {s < step ? <CheckCircle2 className="h-6 w-6" /> : s}
                      </button>
                      {s < 3 && (
                        <div
                          className={`flex-1 h-1 transition ${
                            s < step
                              ? "bg-green-600"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {step === 1 && "Step 1: Basic Information"}
                {step === 2 && "Step 2: Legal Documents"}
                {step === 3 && "Step 3: Marketing Assets"}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Provide accurate contact information and location
                    coordinates
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Name</Label>
                    <Input
                      value={formData.contactName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactName: e.target.value,
                        })
                      }
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.contactEmail}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactEmail: e.target.value,
                        })
                      }
                      placeholder="john@example.com"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={formData.contactPhone}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contactPhone: e.target.value,
                        })
                      }
                      placeholder="+225 123 456 789"
                    />
                  </div>
                </div>

                <GeolocationFields
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onLatitudeChange={(v) =>
                    setFormData((prev) => ({ ...prev, latitude: v }))
                  }
                  onLongitudeChange={(v) =>
                    setFormData((prev) => ({ ...prev, longitude: v }))
                  }
                />
              </div>
            )}

            {/* Step 2: Legal Documents */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-4 rounded-lg flex gap-3">
                  <Shield className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Upload legal documents to verify your business legitimacy
                  </p>
                </div>

                <div>
                  <Label>Business Registration Number (SIRET/RC)</Label>
                  <Input
                    value={formData.businessRegistrationNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        businessRegistrationNumber: e.target.value,
                      })
                    }
                    placeholder="CI-12345678"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      <FileUp className="h-4 w-4" />
                      Manager ID
                    </Label>
                    <input
                      type="file"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          managerId: e.target.files?.[0] || null,
                        })
                      }
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {formData.managerId && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {formData.managerId.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      <FileUp className="h-4 w-4" />
                      Operational Proof
                    </Label>
                    <input
                      type="file"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          operationalProof: e.target.files?.[0] || null,
                        })
                      }
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {formData.operationalProof && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ {formData.operationalProof.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Marketing Assets */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg flex gap-3">
                  <Camera className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Upload marketing assets and business details for maximum
                    visibility
                  </p>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Logo (High-Resolution)
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        logo: e.target.files?.[0] || null,
                      })
                    }
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Action Photos (3 Required)
                  </Label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        actionPhotos: Array.from(e.target.files || []),
                      })
                    }
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.actionPhotos.length}/3 photos
                    {formData.actionPhotos.length >= 3 && (
                      <span className="text-green-600 ml-2">✓ Complete</span>
                    )}
                  </p>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Opening Hours
                  </Label>
                  <div className="space-y-2">
                    {DAYS.map((day) => (
                      <div key={day} className="flex items-center gap-2">
                        <span className="w-20 text-sm capitalize font-medium">
                          {day}
                        </span>
                        <Input
                          type="text"
                          value={formData.openingHours[day] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              openingHours: {
                                ...formData.openingHours,
                                [day]: e.target.value,
                              },
                            })
                          }
                          placeholder="09:00-18:00"
                          className="flex-1"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="flex items-center gap-2">
                    <LinkIcon className="h-4 w-4" />
                    Social Links
                  </Label>
                  <div className="space-y-2">
                    {["facebook", "instagram", "twitter", "website"].map(
                      (platform) => (
                        <Input
                          key={platform}
                          value={formData.socialLinks[platform] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              socialLinks: {
                                ...formData.socialLinks,
                                [platform]: e.target.value,
                              },
                            })
                          }
                          placeholder={`${platform.charAt(0).toUpperCase()}${platform.slice(1)} URL`}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          {/* Navigation Buttons */}
          <div className="border-t p-6 flex gap-3 justify-between bg-gray-50 dark:bg-gray-800/50">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            {step < 3 ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                {submitMutation.isPending
                  ? "Submitting..."
                  : "Submit Digital Passport"}
              </Button>
            )}
          </div>
        </Card>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Why Verify?</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 dark:text-gray-400">
              Verified businesses get priority visibility, higher search
              rankings, and better customer trust.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Trust Score Benefits</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 dark:text-gray-400">
              Higher trust score = better placement in search results and
              featured listings.
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Secure Process</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 dark:text-gray-400">
              All data is encrypted and verified by our admin team within 48
              hours.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
