import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  staggerItemScale,
  defaultViewport,
} from "@/lib/animations";
import { ArrowLeft, Calendar, User, TrendingUp } from "lucide-react";

export default function News() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/services">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Services
              </Button>
            </Link>
            <div className="h-6 border-l border-gray-300"></div>
            <h1 className="text-2xl font-bold text-gray-800">News & Events</h1>
          </div>
        </div>
      </div>

      {/* Hero Headline Section */}
      <section className="py-20 bg-gray-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
        <div className="relative max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-10">
          {/* Main headline */}
          <motion.div
            className="md:col-span-2"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
          >
            <img
              src="https://i.ibb.co/1YMdZf9H/LOGO-01.jpg"
              alt="LOGO-01"
              className="w-[200px] mx-auto md:mx-0 rounded-xl mb-6 shadow-lg"
            />

            <h2 className="text-4xl font-extrabold mb-4">
              Global AI Expansion Reshaping Business in 2025
            </h2>
            <p className="text-lg text-gray-200 mb-6">
              Artificial Intelligence adoption has surged worldwide, driving
              innovations across industries from finance to healthcare. Analysts
              forecast an unprecedented wave of automation and smarter
              decision-making.
            </p>
            <Link href="/services">
              <Button className="bg-primary text-white px-6 py-2 hover:bg-primary/90">
                Read Full redaction
              </Button>
            </Link>
          </motion.div>

          {/* Side stories */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="space-y-6"
          >
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-white rounded-lg p-4 shadow-md hover:shadow-xl transition-shadow"
            >
              <h4 className="font-semibold text-gray-900 mb-2">
                Tech Giants Report Record Profits
              </h4>
              <p className="text-gray-600 text-sm">
                Apple, Google, and Microsoft announce quarterly earnings beating
                analyst expectations.
              </p>
            </motion.div>
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-white rounded-lg p-4 shadow-md hover:shadow-xl transition-shadow"
            >
              <h4 className="font-semibold text-gray-900 mb-2">
                Tech Giants Report Record Profits
              </h4>
              <p className="text-gray-600 text-sm">
                Apple, Google, and Microsoft announce quarterly earnings beating
                analyst expectations.
              </p>
            </motion.div>

            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-white rounded-lg p-4 shadow-md hover:shadow-xl transition-shadow"
            >
              <h4 className="font-semibold text-gray-900 mb-2">
                Energy Sector Goes Green
              </h4>
              <p className="text-gray-600 text-sm">
                Wind and solar lead global energy growth, accounting for 60% of
                new capacity in 2024.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Other redaction */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.h3
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-2xl font-bold mb-8"
          >
            Other redaction
          </motion.h3>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-2 gap-8 mb-12"
          >
            <motion.div
              variants={staggerItemScale}
              whileHover={{ y: -6 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden border hover:shadow-2xl transition-shadow"
            >
              <div className="h-48 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <TrendingUp className="h-16 w-16 text-white" />
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>January 15, 2025</span>
                  <User className="h-4 w-4 ml-2" />
                  <span>Platform Team</span>
                </div>
                <h4 className="text-xl font-semibold mb-3">
                  Major Platform Update: Enhanced Location Intelligence
                </h4>
                <p className="text-gray-600 mb-4">
                  We've launched comprehensive location services including
                  postal code detection, WiFi provider analysis, and real-time
                  network intelligence to help businesses make location-based
                  decisions.
                </p>
                <Link href="/businesses-directory">
                  <Button variant="outline">Read More</Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              variants={staggerItemScale}
              whileHover={{ y: -6 }}
              className="bg-white rounded-xl shadow-lg overflow-hidden border hover:shadow-2xl transition-shadow"
            >
              <div className="h-48 bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <span className="text-4xl">🎵</span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <Calendar className="h-4 w-4" />
                  <span>January 10, 2025</span>
                  <User className="h-4 w-4 ml-2" />
                  <span>Verso Air Team</span>
                </div>
                <h4 className="text-xl font-semibold mb-3">
                  Verso Air Musical Label Portal Launch
                </h4>
                <p className="text-gray-600 mb-4">
                  Introducing our creative industry portal featuring artist
                  analytics, music performance metrics, and entertainment sector
                  business intelligence tools.
                </p>
                <Link href="/stream">
                  <Button variant="outline">Learn More</Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Category Blocks */}
      <section className="py-16 bg-gray-50">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="max-w-7xl mx-auto px-6 grid md:grid-cols-3 gap-10"
        >
          {/* Business */}
          <motion.div variants={staggerItem}>
            <h3 className="text-xl font-bold mb-4 border-b pb-2">Business</h3>
            <div className="space-y-4">
              <article className="border-b pb-4">
                <h4 className="font-semibold">
                  Retail Chains Embrace AI Shopping Assistants
                </h4>
                <p className="text-gray-600 text-sm">
                  New AI-driven kiosks are being deployed across malls
                  worldwide...
                </p>
              </article>
              <article className="border-b pb-4">
                <h4 className="font-semibold">
                  Global Supply Chain Recovery in Progress
                </h4>
                <p className="text-gray-600 text-sm">
                  Shipping costs and delays have eased, signaling smoother
                  logistics...
                </p>
              </article>
            </div>
          </motion.div>

          {/* Technology */}
          <motion.div variants={staggerItem}>
            <h3 className="text-xl font-bold mb-4 border-b pb-2">Technology</h3>
            <div className="space-y-4">
              <article className="border-b pb-4">
                <h4 className="font-semibold">
                  Quantum Computing Breakthrough
                </h4>
                <p className="text-gray-600 text-sm">
                  Researchers unveil a quantum processor achieving stable
                  operations...
                </p>
              </article>
              <article className="border-b pb-4">
                <h4 className="font-semibold">
                  5G Expansion Across Rural Areas
                </h4>
                <p className="text-gray-600 text-sm">
                  Telecoms bring faster connectivity to previously underserved
                  regions...
                </p>
              </article>
            </div>
          </motion.div>

          {/* Events */}
          <motion.div variants={staggerItem}>
            <h3 className="text-xl font-bold mb-4 border-b pb-2">Events</h3>
            <div className="space-y-4">
              <article className="border-b pb-4">
                <h4 className="font-semibold">Global Business Summit 2025</h4>
                <p className="text-gray-600 text-sm">
                  World leaders and executives gather in Berlin for annual
                  conference...
                </p>
              </article>
              <article className="border-b pb-4">
                <h4 className="font-semibold">Music Industry Awards 2025</h4>
                <p className="text-gray-600 text-sm">
                  Celebrating top artists and new technologies shaping the
                  industry...
                </p>
              </article>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Opinion / Editorial */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <motion.h3
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-2xl font-bold mb-8"
          >
            Opinion & Editorial
          </motion.h3>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-2 gap-10"
          >
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="bg-gray-100 p-6 rounded-lg hover:shadow-lg transition-all"
            >
              <h4 className="font-semibold mb-3">
                Why Businesses Must Prioritize Sustainability
              </h4>
              <p className="text-gray-700 mb-4">
                With environmental concerns rising, companies ignoring
                sustainability risk long-term decline in consumer trust.
              </p>
              <span className="text-sm text-gray-500">By Jane Doe</span>
            </motion.div>
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4 }}
              className="bg-gray-100 p-6 rounded-lg hover:shadow-lg transition-all"
            >
              <h4 className="font-semibold mb-3">
                The Future of Work: Hybrid Models Here to Stay
              </h4>
              <p className="text-gray-700 mb-4">
                Remote-first policies combined with hybrid flexibility continue
                to redefine corporate culture globally.
              </p>
              <span className="text-sm text-gray-500">By Mark Rivera</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Industry Insights */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.h3
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-2xl font-bold mb-8"
          >
            Industry Insights
          </motion.h3>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-3 gap-6"
          >
            <motion.div
              variants={staggerItemScale}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200 hover:shadow-lg transition-shadow"
            >
              <h4 className="font-semibold text-blue-900 mb-3">
                Commerce Trends 2025
              </h4>
              <p className="text-blue-800 text-sm mb-4">
                E-commerce analytics show 35% growth in mobile transactions and
                increased demand for real-time inventory tracking.
              </p>
              <Link href="/commerce">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-700 border-blue-300"
                >
                  Read Report
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={staggerItemScale}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-lg border border-green-200 hover:shadow-lg transition-shadow"
            >
              <h4 className="font-semibold text-green-900 mb-3">
                Hospitality Recovery
              </h4>
              <p className="text-green-800 text-sm mb-4">
                Hotel occupancy rates reaching pre-2020 levels with focus on
                personalized guest experiences and operational efficiency.
              </p>
              <Link href="/hotellerie">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-700 border-green-300"
                >
                  View Data
                </Button>
              </Link>
            </motion.div>

            <motion.div
              variants={staggerItemScale}
              whileHover={{ y: -5, scale: 1.02 }}
              className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200 hover:shadow-lg transition-shadow"
            >
              <h4 className="font-semibold text-purple-900 mb-3">
                Finance Tech Evolution
              </h4>
              <p className="text-purple-800 text-sm mb-4">
                Financial services adopting AI-driven risk assessment and
                real-time fraud detection systems.
              </p>
              <Link href="/finances">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-purple-700 border-purple-300"
                >
                  Learn More
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-16 bg-gradient-to-r from-primary to-secondary overflow-hidden">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="max-w-4xl mx-auto px-4 text-center"
        >
          <h3 className="text-3xl font-bold text-white mb-4">Stay Informed</h3>
          <p className="text-xl text-white/90 mb-8">
            Subscribe to our newsletter for the latest updates and industry
            insights.
          </p>
          <div className="flex justify-center">
            <div className="bg-white p-2 rounded-lg flex max-w-md w-full">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 outline-none"
              />
              <Button className="bg-primary text-white px-6 py-2 hover:bg-primary/90">
                Subscribe
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
