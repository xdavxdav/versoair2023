import { Heart, Users, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";

export default function VHeartzPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 px-4">
        <div className="max-w-[95vw] mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 text-center notranslate">
            vHeartz
          </h1>
          <p className="text-xl text-slate-300 text-center max-w-2xl mx-auto">
            A future cultural and community-focused organization, distinct from VERSO AIR INC.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="max-w-[95vw] mx-auto px-4 py-16">
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-xl p-8 mb-16">
          <h2 className="text-3xl font-bold text-white mb-4 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-emerald-400" />
            Our Vision
          </h2>
          <p className="text-slate-300 leading-relaxed">
            <span className="notranslate">vHeartz</span> is in development. Its
            future vision is to support cultural heritage, creative communities,
            and sustainable opportunities. Programs and launch details will be
            announced when confirmed.
          </p>
        </div>

        {/* Core Values */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {[
            {
              icon: <Heart className="h-8 w-8" />,
              title: "Creativity",
              desc: "Celebrating creative expression",
            },
            {
              icon: <Globe className="h-8 w-8" />,
              title: "Culture",
              desc: "Valuing cultural heritage",
            },
            {
              icon: <Sparkles className="h-8 w-8" />,
              title: "Collaboration",
              desc: "Building connections",
            },
            {
              icon: <Users className="h-8 w-8" />,
              title: "Opportunity",
              desc: "Exploring sustainable possibilities",
            },
          ].map((value, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700 rounded-lg p-6 text-center hover:border-emerald-500/50 transition-all"
            >
              <div className="text-emerald-400 mb-4 flex justify-center">
                {value.icon}
              </div>
              <h3 className="font-bold text-white mb-2">{value.title}</h3>
              <p className="text-slate-400 text-sm">{value.desc}</p>
            </div>
          ))}
        </div>

        {/* Programs */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">Future directions</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                name: "Creative learning",
                description:
                  "Potential learning opportunities are being explored",
              },
              {
                name: "Cultural exchange",
                description:
                  "Ideas for cultural exchange are in development",
              },
              {
                name: "Community collaboration",
                description: "Future collaboration opportunities will be announced",
              },
              {
                name: "Heritage and creativity",
                description:
                  "A future focus on cultural knowledge and creative practice",
              },
            ].map((program, idx) => (
              <div key={idx} className="border-l-4 border-emerald-400 pl-4">
                <h3 className="font-bold text-white mb-2">{program.name}</h3>
                <p className="text-slate-400 text-sm">{program.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Impact Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-16">
          {[
            { label: "Programs", value: "To come" },
            { label: "Community", value: "To come" },
            { label: "Launch details", value: "To come" },
            { label: "Impact updates", value: "To come" },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-lg p-6 text-center"
            >
              <p className="text-3xl font-bold text-emerald-400 mb-2">
                {stat.value}
              </p>
              <p className="text-slate-300 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 p-8 md:p-12 rounded-xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Follow the vision
          </h2>
          <p className="text-slate-300 mb-8">
            vHeartz is in development. Confirmed information will be shared here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
                Contact us
              </Button>
            </Link>
            <Link href="/get-involved">
              <Button
                variant="outline"
                className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10"
              >
                Get Involved
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
