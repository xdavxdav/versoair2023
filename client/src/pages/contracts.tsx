import { Link } from "wouter";
import { FileText, Download, Award, Music, Star, Globe, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    gradient: "from-purple-600 to-fuchsia-600",
    glow: "rgba(168,85,247,0.25)",
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
    gradient: "from-fuchsia-600 to-pink-600",
    glow: "rgba(236,72,153,0.25)",
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
    gradient: "from-violet-600 to-purple-600",
    glow: "rgba(139,92,246,0.25)",
  },
];

export default function Contracts() {
  return (
    <div className="relative min-h-screen bg-[#06020f] text-white overflow-x-hidden">
      {/* Ambient background — matches Artist Portal */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(88,28,135,0.15) 0%, transparent 50%), " +
              "radial-gradient(ellipse at 80% 20%, rgba(15,23,42,0.3) 0%, transparent 50%), " +
              "radial-gradient(ellipse at 50% 80%, rgba(168,85,247,0.08) 0%, transparent 60%)",
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-white/[0.06]">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <div
              className="w-20 h-20 bg-gradient-to-br from-purple-600 to-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ boxShadow: "0 0 40px rgba(168,85,247,0.3)" }}
            >
              <Award className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              <span className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-pink-300 bg-clip-text text-transparent">
                Verso Air ™️
              </span>{" "}
              Artist Contracts
            </h1>
            <p className="text-lg text-white/40 max-w-3xl mx-auto font-light leading-relaxed">
              Join our prestigious music label and take your career to the next
              level. Choose the contract that best fits your artistic goals and
              experience level.
            </p>
          </div>
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Contract Options */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-16">
          {contractTypes.map((contract) => {
            const Icon = contract.icon;
            return (
              <div
                key={contract.id}
                className="bg-white/[0.04] backdrop-blur-xl rounded-2xl p-8 border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 group"
              >
                <div className="text-center mb-6">
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${contract.gradient} rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg`}
                    style={{ boxShadow: `0 0 30px ${contract.glow}` }}
                  >
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {contract.title}
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed">{contract.description}</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">
                      Contract Features
                    </h4>
                    <ul className="space-y-2">
                      {contract.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-start text-white/50 text-sm"
                        >
                          <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.05]">
                      <p className="text-white/30 text-xs uppercase tracking-wider">
                        Contract Duration
                      </p>
                      <p className="text-white font-semibold text-sm mt-1">
                        {contract.duration}
                      </p>
                    </div>
                    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.05]">
                      <p className="text-white/30 text-xs uppercase tracking-wider">
                        Potential Advancement
                      </p>
                      <p className="text-white font-semibold text-sm mt-1">
                        {contract.advancement}
                      </p>
                    </div>
                  </div>

                  <button className={`w-full py-3 rounded-xl bg-gradient-to-r ${contract.gradient} text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}>
                    <FileText className="h-4 w-4" />
                    Download Contract Template
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Application Process */}
        <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl p-8 md:p-10 border border-white/[0.08] mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 text-center tracking-tight">
            <span className="bg-gradient-to-r from-purple-300 to-fuchsia-300 bg-clip-text text-transparent">
              Application Process
            </span>
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
                <div
                  className="w-12 h-12 bg-gradient-to-br from-purple-600 to-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ boxShadow: "0 0 20px rgba(168,85,247,0.2)" }}
                >
                  <span className="text-white font-bold text-lg">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white/[0.04] backdrop-blur-xl rounded-2xl p-8 md:p-10 border border-white/[0.08] mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">
            General Requirements
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
                For All Artists
              </h3>
              <ul className="space-y-3 text-white/50">
                <li className="flex items-start text-sm">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                  Original music composition and performance
                </li>
                <li className="flex items-start text-sm">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                  Professional attitude and work ethic
                </li>
                <li className="flex items-start text-sm">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                  Commitment to career development
                </li>
                <li className="flex items-start text-sm">
                  <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                  Legal right to enter into contracts
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
                Submission Materials
              </h3>
              <ul className="space-y-3 text-white/50">
                <li className="flex items-start text-sm">
                  <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                  3-5 high-quality demo tracks
                </li>
                <li className="flex items-start text-sm">
                  <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                  Artist biography and photos
                </li>
                <li className="flex items-start text-sm">
                  <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                  Social media and streaming statistics
                </li>
                <li className="flex items-start text-sm">
                  <span className="w-1.5 h-1.5 bg-fuchsia-400 rounded-full mt-1.5 mr-3 flex-shrink-0"></span>
                  Performance history and press coverage
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-8">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-4 tracking-tight">
            Ready to Start Your Journey?
          </h2>
          <p className="text-white/40 mb-8 max-w-2xl mx-auto font-light leading-relaxed">
            Contact our Artist Relations team to discuss your music and explore
            contract opportunities. We're always looking for talented artists to
            join the Verso Air ™️ family.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <button className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-sm font-bold flex items-center gap-2 hover:from-purple-500 hover:to-fuchsia-500 transition-all shadow-lg shadow-purple-600/20">
              <Sparkles className="h-4 w-4" />
              Submit Demo Package
            </button>
            <button className="px-8 py-3.5 rounded-xl border border-white/[0.1] text-white/60 text-sm font-medium hover:border-white/[0.2] hover:text-white/80 hover:bg-white/[0.03] transition-all">
              Schedule Consultation
            </button>
          </div>

          <p className="text-white/25 text-sm">
            For inquiries:{" "}
            <a
              href="mailto:artists@versoair.com"
              className="text-purple-400/60 hover:text-purple-300 underline decoration-white/10 hover:decoration-purple-400/40 transition-colors"
            >
              artists@versoair.com
            </a>{" "}
            | Phone:{" "}
            <a
              href="tel:+1-555-VERSO-AIR"
              className="text-purple-400/60 hover:text-purple-300 underline decoration-white/10 hover:decoration-purple-400/40 transition-colors"
            >
              +1 (555) VERSO-AIR
            </a>
          </p>

          <div className="mt-10">
            <Link href="/artist-portal">
              <button className="text-white/30 hover:text-white/60 text-sm font-medium flex items-center gap-2 mx-auto transition-colors">
                <ArrowRight className="w-4 h-4 rotate-180" />
                Back to Artist Portal
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
