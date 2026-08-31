import { Link } from "wouter";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Download,
  Award,
  Music,
  Star,
  Globe,
  Briefcase,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";

// ─── Contractor Dashboard ──────────────────────────────────────────────────

function ContractorDashboard() {
  const queryClient = useQueryClient();
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applyForm, setApplyForm] = useState({
    name: "",
    phone: "",
    specialization: "",
    hourlyRate: "",
    portfolioUrl: "",
    coverLetter: "",
  });

  // Fetch application status
  const { data: appData } = useQuery({
    queryKey: ["/api/contractor-pipeline/my-application"],
    queryFn: async () => {
      const res = await fetch("/api/contractor-pipeline/my-application", {
        credentials: "include",
      });
      return res.json();
    },
  });

  // Fetch my contracts (only if approved)
  const { data: contractsData } = useQuery({
    queryKey: ["/api/contractor-pipeline/my-contracts"],
    queryFn: async () => {
      const res = await fetch("/api/contractor-pipeline/my-contracts", {
        credentials: "include",
      });
      return res.json();
    },
  });

  // Apply mutation
  const applyMutation = useMutation({
    mutationFn: async (formData: typeof applyForm) => {
      const res = await fetch("/api/contractor-pipeline/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/contractor-pipeline/my-application"],
      });
      setShowApplyForm(false);
    },
  });

  // Contract action mutation
  const contractAction = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: number;
      action: "accept" | "decline" | "complete";
    }) => {
      const res = await fetch(
        `/api/contractor-pipeline/contracts/${id}/${action}`,
        {
          method: "POST",
          credentials: "include",
        },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/contractor-pipeline/my-contracts"],
      });
    },
  });

  const application = appData?.application;
  const contracts = contractsData?.contracts || [];

  const statusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-400" />;
      case "approved":
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const contractStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      offered: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      accepted: "bg-green-500/20 text-green-300 border-green-500/30",
      declined: "bg-red-500/20 text-red-300 border-red-500/30",
      in_progress: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      completed: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      cancelled: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    };
    return colors[status] || colors.cancelled;
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-amber-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Briefcase className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Contractor Portal
            </h1>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto">
              Manage your contracts, track assignments, and grow with Verso Air
              ™️
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Application Status */}
        {!application && !showApplyForm && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
            <ClipboardList className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3">
              Join Our Contractor Pool
            </h2>
            <p className="text-blue-200 mb-6 max-w-lg mx-auto">
              Apply to become a verified Verso Air contractor. We'll review your
              profile and assign contracts matching your expertise.
            </p>
            <Button
              onClick={() => setShowApplyForm(true)}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-8 py-3"
            >
              <Send className="mr-2 h-4 w-4" />
              Apply Now
            </Button>
          </div>
        )}

        {/* Apply Form */}
        {showApplyForm && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">
              Contractor Application
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-blue-200 text-sm mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={applyForm.name}
                  onChange={(e) =>
                    setApplyForm((f) => ({ ...f, name: e.target.value }))
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-blue-300/50"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label className="block text-blue-200 text-sm mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={applyForm.phone}
                  onChange={(e) =>
                    setApplyForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-blue-300/50"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-blue-200 text-sm mb-1">
                  Specialization
                </label>
                <input
                  type="text"
                  value={applyForm.specialization}
                  onChange={(e) =>
                    setApplyForm((f) => ({
                      ...f,
                      specialization: e.target.value,
                    }))
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-blue-300/50"
                  placeholder="e.g. Sound Engineering, Web Dev, Marketing"
                />
              </div>
              <div>
                <label className="block text-blue-200 text-sm mb-1">
                  Hourly Rate
                </label>
                <input
                  type="text"
                  value={applyForm.hourlyRate}
                  onChange={(e) =>
                    setApplyForm((f) => ({ ...f, hourlyRate: e.target.value }))
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-blue-300/50"
                  placeholder="$50/hr"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-blue-200 text-sm mb-1">
                  Portfolio URL
                </label>
                <input
                  type="url"
                  value={applyForm.portfolioUrl}
                  onChange={(e) =>
                    setApplyForm((f) => ({
                      ...f,
                      portfolioUrl: e.target.value,
                    }))
                  }
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-blue-300/50"
                  placeholder="https://your-portfolio.com"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-blue-200 text-sm mb-1">
                  Cover Letter
                </label>
                <textarea
                  value={applyForm.coverLetter}
                  onChange={(e) =>
                    setApplyForm((f) => ({
                      ...f,
                      coverLetter: e.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-blue-300/50"
                  placeholder="Tell us about your experience and why you'd like to work with Verso Air..."
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => applyMutation.mutate(applyForm)}
                disabled={!applyForm.name || applyMutation.isPending}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
              >
                {applyMutation.isPending
                  ? "Submitting..."
                  : "Submit Application"}
              </Button>
              <Button
                onClick={() => setShowApplyForm(false)}
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
            {applyMutation.data && !applyMutation.data.success && (
              <p className="text-red-400 mt-3 text-sm">
                {applyMutation.data.message}
              </p>
            )}
          </div>
        )}

        {/* Application Status Card */}
        {application && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {statusIcon(application.status)}
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    Application Status
                  </h3>
                  <p className="text-blue-200 text-sm capitalize">
                    {application.status}
                    {application.status === "pending" &&
                      " — We're reviewing your profile"}
                    {application.status === "approved" &&
                      " — Welcome aboard! Check your contracts below"}
                    {application.status === "rejected" &&
                      ` — ${application.review_notes || "You may reapply later"}`}
                  </p>
                </div>
              </div>
              <span className="text-blue-300 text-xs">
                Applied: {new Date(application.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* My Contracts */}
        {contracts.length > 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-400" />
              My Contracts
            </h2>
            <div className="space-y-4">
              {contracts.map((contract: any) => (
                <div
                  key={contract.id}
                  className="bg-white/5 rounded-xl p-5 border border-white/10"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {contract.title}
                      </h3>
                      {contract.description && (
                        <p className="text-blue-200 text-sm mt-1">
                          {contract.description}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${contractStatusColor(contract.status)}`}
                    >
                      {contract.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                    {contract.payment_amount && (
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-blue-300 text-xs">Payment</p>
                        <p className="text-white font-medium">
                          {contract.payment_amount}
                        </p>
                      </div>
                    )}
                    {contract.deadline && (
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-blue-300 text-xs">Deadline</p>
                        <p className="text-white font-medium">
                          {new Date(contract.deadline).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                    {contract.assigned_by_name && (
                      <div className="bg-white/5 rounded-lg p-2">
                        <p className="text-blue-300 text-xs">Assigned By</p>
                        <p className="text-white font-medium">
                          {contract.assigned_by_name}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Actions based on status */}
                  {contract.status === "offered" && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          contractAction.mutate({
                            id: contract.id,
                            action: "accept",
                          })
                        }
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Accept
                      </Button>
                      <Button
                        onClick={() =>
                          contractAction.mutate({
                            id: contract.id,
                            action: "decline",
                          })
                        }
                        size="sm"
                        variant="outline"
                        className="border-red-500/30 text-red-300 hover:bg-red-500/10"
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Decline
                      </Button>
                    </div>
                  )}
                  {["accepted", "in_progress"].includes(contract.status) && (
                    <Button
                      onClick={() =>
                        contractAction.mutate({
                          id: contract.id,
                          action: "complete",
                        })
                      }
                      size="sm"
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Mark Complete
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* If approved but no contracts yet */}
        {application?.status === "approved" && contracts.length === 0 && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
            <Briefcase className="h-12 w-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-xl font-semibold text-white mb-2">
              No Contracts Yet
            </h3>
            <p className="text-blue-200">
              You're approved! Contracts will appear here once assigned by the
              team.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const contractTypes = [
  {
    id: "recording",
    title: "Recording Artist Contract",
    description:
      "Comprehensive recording and distribution agreement for solo artists and bands",
    features: [
      "Global music distribution rights",
      "Recording studio access",
      "Professional marketing support",
      "Royalty split: 70% artist / 30% label",
      "Creative control retention",
    ],
    duration: "3-5 years",
    advancement: "$5,000 - $50,000",
    icon: Music,
  },
  {
    id: "development",
    title: "Artist Development Deal",
    description:
      "Perfect for emerging artists looking to build their career foundation",
    features: [
      "Professional training and mentorship",
      "Image and brand development",
      "Demo recording opportunities",
      "Networking and industry connections",
      "Social media management support",
    ],
    duration: "1-2 years",
    advancement: "$1,000 - $10,000",
    icon: Star,
  },
  {
    id: "distribution",
    title: "Distribution Only Agreement",
    description:
      "For independent artists who want to maintain full creative control",
    features: [
      "Worldwide digital distribution",
      "Streaming platform optimization",
      "Basic promotional support",
      "Royalty split: 85% artist / 15% label",
      "No exclusive recording requirements",
    ],
    duration: "1 year (renewable)",
    advancement: "No advance",
    icon: Globe,
  },
];

export default function Contracts() {
  const { user } = useAuthContext();

  // If the user is a contractor or has contractor role, show contractor dashboard
  const isContractor =
    user?.role === "contractor" || user?.portals?.includes("contractor");

  if (isContractor) {
    return <ContractorDashboard />;
  }

  // Otherwise show the artist contracts page
  return <ArtistContractsPage />;
}

function ArtistContractsPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-emerald-950 via-teal-900 to-amber-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Award className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Verso Air ™️ Artist Contracts
            </h1>
            <p className="text-xl text-purple-200 max-w-3xl mx-auto">
              Join our prestigious music label and take your career to the next
              level. Choose the contract that best fits your artistic goals and
              experience level.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Contract Options */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {contractTypes.map((contract) => {
            const Icon = contract.icon;
            return (
              <div
                key={contract.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20"
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {contract.title}
                  </h3>
                  <p className="text-purple-200">{contract.description}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">
                      Contract Features:
                    </h4>
                    <ul className="space-y-2">
                      {contract.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-start text-purple-200"
                        >
                          <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-purple-300 text-sm">
                        Contract Duration
                      </p>
                      <p className="text-white font-semibold">
                        {contract.duration}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4">
                      <p className="text-purple-300 text-sm">
                        Potential Advancement
                      </p>
                      <p className="text-white font-semibold">
                        {contract.advancement}
                      </p>
                    </div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-lg font-medium">
                    <FileText className="mr-2 h-4 w-4" />
                    Download Contract Template
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Application Process */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Application Process
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Submit Demo",
                description:
                  "Send us your best 3-5 tracks showcasing your talent and style",
              },
              {
                step: "2",
                title: "Initial Review",
                description:
                  "Our A&R team evaluates your submission within 14 business days",
              },
              {
                step: "3",
                title: "Meeting & Negotiation",
                description:
                  "Discuss contract terms, goals, and expectations in detail",
              },
              {
                step: "4",
                title: "Contract Signing",
                description:
                  "Finalize the agreement and begin your journey with Verso Air ™️",
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-lg">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-purple-200 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 mb-8">
          <h2 className="text-2xl font-bold text-white mb-6">
            General Requirements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                For All Artists:
              </h3>
              <ul className="space-y-2 text-purple-200">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Original music composition and performance
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Professional attitude and work ethic
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Commitment to career development
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Legal right to enter into contracts
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Submission Materials:
              </h3>
              <ul className="space-y-2 text-purple-200">
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  3-5 high-quality demo tracks
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Artist biography and photos
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Social media and streaming statistics
                </li>
                <li className="flex items-start">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Performance history and press coverage
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Ready to Start Your Journey?
          </h2>
          <p className="text-purple-200 mb-8 max-w-2xl mx-auto">
            Contact our Artist Relations team to discuss your music and explore
            contract opportunities. We're always looking for talented artists to
            join the Verso Air ™️ family.
          </p>

          <div className="space-x-4 mb-8">
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3">
              Submit Demo Package
            </Button>
            <Button
              variant="outline"
              className="border-white/30 bg-white/10 text-white hover:bg-white/20 px-6 py-3"
            >
              Schedule Consultation
            </Button>
          </div>

          <p className="text-purple-300 text-sm">
            For inquiries:{" "}
            <a
              href="mailto:artists@versoair.com"
              className="text-purple-200 hover:text-white underline"
            >
              artists@versoair.com
            </a>{" "}
            | Phone:{" "}
            <a
              href="tel:+1-555-VERSO-AIR"
              className="text-purple-200 hover:text-white underline"
            >
              +1 (555) VERSO-AIR
            </a>
          </p>

          <div className="mt-8">
            <Link href="/artist-portal">
              <Button
                variant="ghost"
                className="text-purple-200 hover:text-white hover:bg-white/10"
              >
                ← Back to Artist Portal
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
