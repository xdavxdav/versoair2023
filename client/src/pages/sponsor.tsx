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

const sponsors = {
  techcorp: {
    name: "TechCorp Solutions",
    logo: "https://images.unsplash.com/photo-1611224923853-80b023f02d71?ixlib=rb-4.0.3&w=200&h=200&fit=crop",
    industry: "Technology",
    location: "San Francisco, CA",
    partnership: "Platinum Partner",
    since: "January 2022",
    description:
      "TechCorp Solutions is a leading provider of enterprise software solutions, specializing in cloud infrastructure and data analytics. Their partnership with Verso Air has enabled seamless integration capabilities for enterprise clients.",
    website: "https://techcorp-solutions.com",
    employees: "5,000+",
    revenue: "$2.5B",
    contributions: [
      "Cloud infrastructure optimization",
      "Enterprise API development",
      "Data security frameworks",
      "Scalability consulting",
      "Technical training programs",
    ],
    achievements: [
      "Reduced platform latency by 40%",
      "Enabled 99.9% uptime guarantee",
      "Integrated with 50+ enterprise systems",
      "Trained 200+ technical staff",
      "Co-developed security protocols",
    ],
    contact: {
      email: "partnerships@techcorp.com",
      phone: "+1 (555) 123-0001",
    },
  },
  "global-consulting": {
    name: "Global Consulting Group",
    logo: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?ixlib=rb-4.0.3&w=200&h=200&fit=crop",
    industry: "Business Consulting",
    location: "New York, NY",
    partnership: "Gold Partner",
    since: "June 2021",
    description:
      "Global Consulting Group brings decades of business intelligence expertise to help organizations maximize their data potential. They provide strategic consulting and implementation services to Verso Air clients.",
    website: "https://globalconsulting.com",
    employees: "2,500+",
    revenue: "$800M",
    contributions: [
      "Business intelligence strategy",
      "Implementation consulting",
      "Training and certification",
      "Best practices development",
      "Market research and insights",
    ],
    achievements: [
      "Consulted for 500+ client implementations",
      "Developed 15+ industry frameworks",
      "Achieved 95% client satisfaction",
      "Certified 300+ consultants",
      "Published 50+ whitepapers",
    ],
    contact: {
      email: "contact@globalconsulting.com",
      phone: "+1 (555) 123-0002",
    },
  },
  "innovate-labs": {
    name: "Innovate Labs",
    logo: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?ixlib=rb-4.0.3&w=200&h=200&fit=crop",
    industry: "Research & Development",
    location: "Boston, MA",
    partnership: "Research Partner",
    since: "March 2023",
    description:
      "Innovate Labs is at the forefront of AI and machine learning research. Their collaboration with Verso Air focuses on developing next-generation analytics capabilities and predictive modeling features.",
    website: "https://innovatelabs.ai",
    employees: "800+",
    revenue: "$200M",
    contributions: [
      "AI/ML algorithm development",
      "Predictive analytics research",
      "Natural language processing",
      "Computer vision solutions",
      "Innovation workshops",
    ],
    achievements: [
      "Developed 10+ proprietary algorithms",
      "Improved prediction accuracy by 60%",
      "Published 30+ research papers",
      "Filed 15 patent applications",
      "Won 5 innovation awards",
    ],
    contact: {
      email: "research@innovatelabs.ai",
      phone: "+1 (555) 123-0003",
    },
  },
  "financial-dynamics": {
    name: "Financial Dynamics Inc.",
    logo: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?ixlib=rb-4.0.3&w=200&h=200&fit=crop",
    industry: "Financial Services",
    location: "Chicago, IL",
    partnership: "Silver Partner",
    since: "September 2022",
    description:
      "Financial Dynamics specializes in financial analytics and risk management solutions. They provide domain expertise and regulatory compliance guidance for financial sector implementations of Verso Air.",
    website: "https://financialdynamics.com",
    employees: "1,200+",
    revenue: "$400M",
    contributions: [
      "Financial analytics expertise",
      "Regulatory compliance frameworks",
      "Risk management protocols",
      "Financial reporting templates",
      "Industry-specific training",
    ],
    achievements: [
      "Ensured 100% regulatory compliance",
      "Reduced financial reporting time by 70%",
      "Implemented in 200+ financial institutions",
      "Achieved SOX compliance certification",
      "Developed 25+ financial dashboards",
    ],
    contact: {
      email: "partnerships@financialdynamics.com",
      phone: "+1 (555) 123-0004",
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
