import {
  LifeBuoy,
  MessageCircle,
  Mail,
  Phone,
  BookOpen,
  Video,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  defaultViewport,
} from "@/lib/animations";
import ScrollToTop from "@/components/ScrollToTop";

export default function HelpCenter() {
  const helpCategories = [
    {
      icon: <LifeBuoy className="h-8 w-8" />,
      title: "Account Help",
      description: "Manage your account, billing, and subscriptions",
      link: "/help/account",
    },
    {
      icon: <BookOpen className="h-8 w-8" />,
      title: "Product Support",
      description: "Learn how to use Verso Air features",
      link: "/help/product",
    },
    {
      icon: <Mail className="h-8 w-8" />,
      title: "Delivery & Returns",
      description: "Track orders and manage returns",
      link: "/help/delivery",
    },
    {
      icon: <MessageCircle className="h-8 w-8" />,
      title: "Payments",
      description: "Payment methods and billing issues",
      link: "/help/payments",
    },
    {
      icon: <Video className="h-8 w-8" />,
      title: "Video Guides",
      description: "Step-by-step video tutorials",
      link: "#",
    },
    {
      icon: <Phone className="h-8 w-8" />,
      title: "Contact Support",
      description: "Reach our support team directly",
      link: "/contact",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-5xl md:text-6xl font-bold text-white mb-6 text-center"
          >
            Help Center
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="text-xl text-slate-300 text-center max-w-2xl mx-auto"
          >
            Find answers and get support when you need it
          </motion.p>
        </div>
      </div>

      {/* Help Categories */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
        >
          {helpCategories.map((category, idx) => (
            <Link key={idx} href={category.link}>
              <motion.div
                variants={staggerItem}
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur p-6 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-all group cursor-pointer h-full"
              >
                <div className="text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                  {category.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {category.title}
                </h3>
                <p className="text-slate-400 text-sm">{category.description}</p>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        {/* Popular Topics */}
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Popular Topics</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                title: "Getting Started",
                items: [
                  "Creating your first account",
                  "Setting up your profile",
                  "Understanding the dashboard",
                ],
              },
              {
                title: "Common Issues",
                items: [
                  "Connection problems",
                  "Data not loading",
                  "Performance optimization",
                ],
              },
              {
                title: "Features",
                items: [
                  "Creating dashboards",
                  "Running queries",
                  "Exporting data",
                ],
              },
              {
                title: "Billing",
                items: [
                  "Payment methods",
                  "Invoices",
                  "Upgrades and downgrades",
                ],
              },
            ].map((section, idx) => (
              <div key={idx} className="bg-slate-900/30 rounded-lg p-6">
                <h3 className="font-semibold text-white mb-4">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li
                      key={i}
                      className="text-slate-400 text-sm hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      → {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Support Options */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">
          How Can We Help?
        </h2>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="grid md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: <Mail className="h-8 w-8" />,
              title: "Email Support",
              description: "Response within 24 hours",
              contact: "support@versoair.com",
            },
            {
              icon: <Phone className="h-8 w-8" />,
              title: "Phone Support",
              description: "Available 8AM-10PM EST",
              contact: "+1 (555) VERSO-AIR",
            },
            {
              icon: <Users className="h-8 w-8" />,
              title: "Community",
              description: "Connect with other users",
              contact: "Join our community forum",
            },
          ].map((option, idx) => (
            <motion.div
              key={idx}
              variants={staggerItem}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur p-6 rounded-xl border border-slate-700 text-center"
            >
              <div className="text-emerald-400 mb-4 flex justify-center">
                {option.icon}
              </div>
              <h3 className="font-bold text-white mb-2">{option.title}</h3>
              <p className="text-slate-400 text-sm mb-4">
                {option.description}
              </p>
              <p className="text-emerald-400 font-semibold text-sm">
                {option.contact}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* CTA */}
      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 p-8 md:p-12 rounded-xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Didn't Find Your Answer?
          </h2>
          <p className="text-slate-300 mb-8">
            Our support team is always ready to help
          </p>
          <Link href="/contact">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              Contact Us
            </Button>
          </Link>
          <Link href="/sav">
            <Button
              variant="outline"
              className="border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 font-semibold ml-3"
            >
              Service Après-Vente
            </Button>
          </Link>
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
