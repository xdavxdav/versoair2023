import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";

export default function Pricing() {
  const plans = [
    {
      name: "Starter",
      price: "$99",
      period: "/month",
      description: "Perfect for small teams",
      features: [
        "Up to 5 users",
        "10 MB storage",
        "Basic analytics",
        "Email support",
        "Single sector access",
      ],
      notIncluded: [
        "Advanced features",
        "Custom integrations",
        "Priority support",
        "Multi-sector analytics",
      ],
      cta: "Start Free Trial",
      featured: false,
    },
    {
      name: "Professional",
      price: "$299",
      period: "/month",
      description: "For growing businesses",
      features: [
        "Up to 25 users",
        "500 MB storage",
        "Advanced analytics",
        "24/7 phone support",
        "All sectors",
        "Custom dashboards",
        "API access",
      ],
      notIncluded: [
        "Enterprise SLA",
        "Dedicated account manager",
        "White-label solution",
      ],
      cta: "Start Free Trial",
      featured: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "pricing",
      description: "For large organizations",
      features: [
        "Unlimited users",
        "Unlimited storage",
        "Real-time analytics",
        "Dedicated support",
        "All sectors",
        "Custom integrations",
        "API access",
        "White-label options",
        "Dedicated account manager",
      ],
      notIncluded: [],
      cta: "Contact Sales",
      featured: false,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 text-center">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-300 text-center max-w-2xl mx-auto">
            Choose the perfect plan for your business intelligence needs
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative rounded-xl border transition-all ${
                plan.featured
                  ? "bg-gradient-to-br from-emerald-600/30 to-teal-600/30 border-emerald-500/50 shadow-xl shadow-emerald-500/20 md:scale-105"
                  : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
              } p-8 backdrop-blur`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <h3 className="text-2xl font-bold text-white mb-2">
                {plan.name}
              </h3>
              <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

              <div className="mb-8">
                <span className="text-4xl font-bold text-white">
                  {plan.price}
                </span>
                <span className="text-slate-400 text-sm ml-2">
                  /{plan.period}
                </span>
              </div>

              <Link href={plan.name === "Enterprise" ? "/contact" : "/demo"}>
                <Button
                  className={`w-full mb-8 font-semibold ${
                    plan.featured
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-white"
                  }`}
                >
                  {plan.cta}
                </Button>
              </Link>

              <div className="space-y-4">
                <p className="text-slate-300 font-semibold text-sm mb-4">
                  Included:
                </p>
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Check className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                    <span className="text-slate-300 text-sm">{feature}</span>
                  </div>
                ))}

                {plan.notIncluded.length > 0 && (
                  <>
                    <p className="text-slate-400 font-semibold text-sm mt-6 mb-4">
                      Not included:
                    </p>
                    {plan.notIncluded.map((feature, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <X className="h-5 w-5 text-slate-600 flex-shrink-0" />
                        <span className="text-slate-500 text-sm">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white mb-8 text-center">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          {[
            {
              q: "Do you offer a free trial?",
              a: "Yes! All plans come with a 30-day free trial. No credit card required.",
            },
            {
              q: "Can I upgrade or downgrade anytime?",
              a: "Absolutely. You can change your plan at any time with prorated billing.",
            },
            {
              q: "What about data security?",
              a: "We use enterprise-grade encryption and comply with all major security standards including ISO 27001.",
            },
            {
              q: "Do you offer custom pricing?",
              a: "Yes, for Enterprise customers with specific requirements, we can create custom pricing and SLAs.",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 hover:bg-slate-800/50 transition-all"
            >
              <p className="font-semibold text-white mb-2">{item.q}</p>
              <p className="text-slate-400 text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
