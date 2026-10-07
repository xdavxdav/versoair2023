import { useRoute, Link } from "wouter";
import {
  Globe,
  ExternalLink,
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Award,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollToTop from "@/components/ScrollToTop";
import SponsorSlotMachine from "@/components/SponsorSlotMachine";

// TODO(pending-verification): replace John Doe placeholder sponsors with
// verified sponsor organizations before public promotion. Logos, websites,
// contact details, revenue and achievement figures below are placeholders.
const sponsors = {
  techcorp: {
    name: "John Doe Organization",
    logo: "",
    industry: "Industry pending",
    location: "Location pending",
    partnership: "Platinum Partner",
    since: "Date pending",
    description: "Sponsor description pending confirmation.",
    website: "",
    employees: "—",
    revenue: "—",
    contributions: ["Details pending confirmation"],
    achievements: ["Details pending confirmation"],
    contact: {
      email: "admin@versoair.com",
      phone: "Number pending",
    },
  },
  "global-consulting": {
    name: "John Doe Organization",
    logo: "",
    industry: "Industry pending",
    location: "Location pending",
    partnership: "Gold Partner",
    since: "Date pending",
    description: "Sponsor description pending confirmation.",
    website: "",
    employees: "—",
    revenue: "—",
    contributions: ["Details pending confirmation"],
    achievements: ["Details pending confirmation"],
    contact: {
      email: "admin@versoair.com",
      phone: "Number pending",
    },
  },
  "innovate-labs": {
    name: "John Doe Organization",
    logo: "",
    industry: "Industry pending",
    location: "Location pending",
    partnership: "Research Partner",
    since: "Date pending",
    description: "Sponsor description pending confirmation.",
    website: "",
    employees: "—",
    revenue: "—",
    contributions: ["Details pending confirmation"],
    achievements: ["Details pending confirmation"],
    contact: {
      email: "admin@versoair.com",
      phone: "Number pending",
    },
  },
  "financial-dynamics": {
    name: "John Doe Organization",
    logo: "",
    industry: "Industry pending",
    location: "Location pending",
    partnership: "Silver Partner",
    since: "Date pending",
    description: "Sponsor description pending confirmation.",
    website: "",
    employees: "—",
    revenue: "—",
    contributions: ["Details pending confirmation"],
    achievements: ["Details pending confirmation"],
    contact: {
      email: "admin@versoair.com",
      phone: "Number pending",
    },
  },
};
export default function Sponsor() {
  const [, params] = useRoute("/sponsor/:sponsorId");
  const sponsorParams = params as unknown as { sponsorId?: string } | null;
  const sponsorId = sponsorParams?.sponsorId ?? null;

  if (!sponsorId || !sponsors[sponsorId as keyof typeof sponsors]) {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Sponsor Not Found
          </h1>
          <p className="text-gray-600 mb-8">
            The sponsor you're looking for doesn't exist.
          </p>
          <Link href="/about">
            <Button className="bg-[#bf831c] hover:bg-[#a6701a] text-white">
              ← Back to Our Sponsors
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const sponsor = sponsors[sponsorId as keyof typeof sponsors];

  const getPartnershipColor = (partnership: string) => {
    switch (partnership) {
      case "Platinum Partner":
        return "bg-gray-800 text-white";
      case "Gold Partner":
        return "bg-yellow-500 text-white";
      case "Silver Partner":
        return "bg-gray-400 text-white";
      case "Research Partner":
        return "bg-blue-600 text-white";
      default:
        return "bg-[#bf831c] text-white";
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#bf831c] to-[#d4941f] text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <img
                src={sponsor.logo}
                alt={sponsor.name}
                className="w-32 h-32 rounded-xl border-4 border-white shadow-lg object-cover bg-white p-4"
              />
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getPartnershipColor(
                      sponsor.partnership,
                    )}`}
                  >
                    {sponsor.partnership}
                  </span>
                </div>
                <h1 className="text-4xl font-bold mb-2">{sponsor.name}</h1>
                <p className="text-xl opacity-90 mb-2">{sponsor.industry}</p>
                <div className="flex items-center justify-center md:justify-start mt-4 space-x-4">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {sponsor.location}
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    Partner since {sponsor.since}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sponsorship Tier Showcase */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 py-12 border-t border-b border-gray-200">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm uppercase font-semibold text-gray-600 mb-4">
            Sponsorship Level
          </p>
          <SponsorSlotMachine
            words={[
              "Platinum",
              "Ambassador",
              "Supporter",
              "Friend",
              "Community",
            ]}
            duration={2.5}
            cycleDelay={9}
          />
          <p className="text-xs text-gray-500 mt-4">
            Tier levels rotate to show sponsorship categories
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* About */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  About {sponsor.name}
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {sponsor.description}
                </p>
              </div>

              {/* Contributions */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Partnership Contributions
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {sponsor.contributions.map((contribution, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-2 h-2 bg-[#bf831c] rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-gray-600">{contribution}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Achievements */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Key Achievements
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {sponsor.achievements.map((achievement, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <Award className="h-5 w-5 text-[#bf831c] mt-0.5 flex-shrink-0" />
                      <p className="text-gray-600">{achievement}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Company Stats */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Company Overview
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-[#bf831c]" />
                      <span className="text-gray-600">Employees</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {sponsor.employees}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-[#bf831c]" />
                      <span className="text-gray-600">Revenue</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {sponsor.revenue}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-[#bf831c]" />
                      <span className="text-gray-600">Industry</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {sponsor.industry}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-[#bf831c]" />
                      <span className="text-gray-600">Partnership</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {sponsor.since}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Globe className="h-5 w-5 text-[#bf831c]" />
                    <a
                      href={sponsor.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-[#bf831c] transition-colors flex items-center"
                    >
                      Visit Website
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                  <div className="flex items-start space-x-3">
                    <MapPin className="h-5 w-5 text-[#bf831c] mt-0.5" />
                    <span className="text-gray-600">{sponsor.location}</span>
                  </div>
                </div>
              </div>

              {/* Partnership Level */}
              <div
                className={`rounded-xl p-6 text-white ${getPartnershipColor(
                  sponsor.partnership,
                ).replace("text-white", "")}`}
              >
                <h3 className="text-lg font-bold mb-4">
                  {sponsor.partnership}
                </h3>
                <p className="text-sm opacity-90 mb-4">
                  As a {sponsor.partnership.toLowerCase()}, {sponsor.name}{" "}
                  enjoys premium collaboration benefits and priority support for
                  joint initiatives.
                </p>
                <a
                  href={sponsor.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button className="w-full bg-white text-gray-900 hover:bg-gray-100">
                    <Globe className="mr-2 h-4 w-4" />
                    Visit Partner Site
                  </Button>
                </a>
              </div>

              {/* Become a Sponsor */}
              <div className="bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-xl p-6 text-white">
                <h3 className="text-lg font-bold mb-4">
                  Interested in Partnering?
                </h3>
                <p className="text-sm opacity-90 mb-4">
                  Join our network of innovative partners and help shape the
                  future of business intelligence.
                </p>
                <Link href="/signin">
                  <Button className="w-full bg-white text-[#bf831c] hover:bg-gray-100">
                    Become a Partner
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Back to Sponsors */}
          <div className="text-center mt-12">
            <Link href="/about">
              <Button
                variant="outline"
                className="border-[#bf831c] text-[#bf831c] hover:bg-[#bf831c] hover:text-white"
              >
                ← Back to Our Sponsors
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <ScrollToTop />
    </div>
  );
}
