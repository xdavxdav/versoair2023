import { Link } from "wouter";
import { FileText, Download, Award, Music, Star, Globe } from "lucide-react";
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
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
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
              className="border-white/30 text-white hover:bg-white/10 px-6 py-3"
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
