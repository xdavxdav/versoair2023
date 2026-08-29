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
    <div className="min-h-screen bg-[#f3efe9] text-slate-900">
      {/* Hero Section */}
      <div className="relative px-4 pb-16 pt-20">
        <div className="mx-auto max-w-[1400px] rounded-[30px] border border-slate-200 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.08),transparent_35%),linear-gradient(135deg,#0f172a_0%,#111827_25%,#1f2937_100%)] p-6 shadow-[0_25px_60px_rgba(15,23,42,0.15)] sm:p-8 lg:p-12">
          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="mb-6 text-center text-4xl font-bold text-white md:text-6xl"
          >
            Help Center
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="mx-auto max-w-2xl text-center text-base text-slate-200 md:text-xl"
          >
            Find answers and get support when you need it
          </motion.p>
        </div>
      </div>

      {/* Help Categories */}
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:py-16">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="mb-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {helpCategories.map((category, idx) => (
            <Link key={idx} href={category.link}>
              <motion.div
                variants={staggerItem}
                whileHover={{ y: -6, scale: 1.02 }}
                className="group h-full cursor-pointer rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_20px_40px_rgba(15,23,42,0.04)] transition-all hover:border-amber-400/50"
              >
                <div className="mb-4 text-amber-500 transition-transform group-hover:scale-110">
                  {category.icon}
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900">
                  {category.title}
                </h3>
                <p className="text-sm text-slate-600">{category.description}</p>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        {/* Popular Topics */}
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.04)] md:p-8">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">
            Popular Topics
          </h2>

          <div className="grid gap-4 md:grid-cols-2">
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
              <div key={idx} className="rounded-2xl bg-slate-50 p-6">
                <h3 className="mb-4 font-semibold text-slate-900">
                  {section.title}
                </h3>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li
                      key={i}
                      className="cursor-pointer text-sm text-slate-600 transition-colors hover:text-amber-600"
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
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:py-16">
        <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">
          How Can We Help?
        </h2>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="grid gap-6 md:grid-cols-3"
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
              className="rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-[0_20px_35px_rgba(15,23,42,0.04)]"
            >
              <div className="mb-4 flex justify-center text-amber-500">
                {option.icon}
              </div>
              <h3 className="mb-2 font-bold text-slate-900">{option.title}</h3>
              <p className="mb-4 text-sm text-slate-600">
                {option.description}
              </p>
              <p className="text-sm font-semibold text-amber-600">
                {option.contact}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* CTA */}
      <div className="mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_20px_45px_rgba(15,23,42,0.04)] md:p-12">
          <h2 className="mb-4 text-3xl font-bold text-slate-900">
            Didn't Find Your Answer?
          </h2>
          <p className="mb-8 text-slate-600">
            Our support team is always ready to help
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/contact">
              <Button className="bg-amber-600 text-white hover:bg-amber-500">
                Contact Us
              </Button>
            </Link>
            <Link href="/sav">
              <Button
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Service Après-Vente
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
