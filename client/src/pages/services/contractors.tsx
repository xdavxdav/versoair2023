import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  staggerItemScale,
  scaleIn,
  defaultViewport,
} from "@/lib/animations";
import {
  ArrowLeft,
  Briefcase,
  DollarSign,
  Clock,
  CheckCircle,
  Users,
  TrendingUp,
  Award,
  Shield,
  FileText,
  Mail,
  Phone,
  MapPin,
  Star,
  ExternalLink,
  Download,
  Calendar,
  MessageSquare,
} from "lucide-react";
import { useState } from "react";

export default function Contractors() {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    role: "",
    experience: "",
    message: "",
  });

  const handleSubmit = (e: any) => {
    e.preventDefault();
    // Handle form submission
    console.log("Form submitted:", formData);
    setShowForm(false);
    alert("Application submitted successfully!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation Bar */}
      <div className="bg-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/services">
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-primary/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Services
                </Button>
              </Link>
              <div className="h-6 border-l border-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Contractor Partnership Program
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="hidden md:flex">
                <Download className="h-4 w-4 mr-2" />
                Partner Kit
              </Button>
              <Button
                className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                onClick={() => setShowForm(true)}
              >
                Apply Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section with Stats */}
      <section className="relative py-20 bg-gradient-to-br from-primary via-primary/90 to-secondary overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.02]"></div>
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <motion.div variants={fadeInUp} initial="hidden" animate="visible">
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
                <TrendingUp className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">
                  Partner Earnings Increased 45% This Year
                </span>
              </div>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold text-white mb-6"
            >
              Build Your Business
              <br />
              With <span className="text-yellow-300">Our Platform</span>
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.2 }}
              className="text-xl text-white/90 max-w-3xl mx-auto mb-10"
            >
              Join 500+ successful partners delivering enterprise solutions.
              Access premium projects, competitive rates, and comprehensive
              support.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                className="bg-white text-primary px-8 py-6 text-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                onClick={() => setShowForm(true)}
              >
                Start Your Application
                <ExternalLink className="ml-2 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                className="border-white text-white px-8 py-6 text-lg hover:bg-white/10 backdrop-blur-sm"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Schedule a Call
              </Button>
            </motion.div>
          </div>

          {/* Stats */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16"
          >
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4, scale: 1.03 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center"
            >
              <div className="text-3xl font-bold text-white mb-2">$3.2M+</div>
              <div className="text-white/80">Partner Earnings</div>
            </motion.div>
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4, scale: 1.03 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center"
            >
              <div className="text-3xl font-bold text-white mb-2">500+</div>
              <div className="text-white/80">Active Partners</div>
            </motion.div>
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4, scale: 1.03 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center"
            >
              <div className="text-3xl font-bold text-white mb-2">98%</div>
              <div className="text-white/80">Satisfaction Rate</div>
            </motion.div>
            <motion.div
              variants={staggerItem}
              whileHover={{ y: -4, scale: 1.03 }}
              className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center"
            >
              <div className="text-3xl font-bold text-white mb-2">24h</div>
              <div className="text-white/80">Avg. Response Time</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Partnership Tiers */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Partnership Tier
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Select the level that matches your expertise and business goals
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid lg:grid-cols-3 gap-8"
          >
            {/* Silver Tier */}
            <motion.div
              variants={staggerItemScale}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-200 p-8 hover:border-primary/30 transition-all hover:shadow-xl"
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gray-200 text-gray-800 px-4 py-1 rounded-full text-sm font-semibold">
                  SILVER TIER
                </span>
              </div>
              <div className="text-center pt-4">
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Briefcase className="h-10 w-10 text-gray-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4">
                  Implementation Expert
                </h3>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  $150-200<span className="text-lg text-gray-600">/hour</span>
                </div>
                <p className="text-gray-600 mb-8">
                  Perfect for independent consultants
                </p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Basic platform certification</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Access to standard projects</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Community support</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Quarterly training sessions</span>
                </li>
              </ul>
              <Button className="w-full">Apply for Silver</Button>
            </motion.div>

            {/* Gold Tier - Featured */}
            <motion.div
              variants={staggerItemScale}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative bg-gradient-to-b from-primary/5 to-white rounded-2xl border-2 border-primary p-8 hover:shadow-2xl transition-all duration-300"
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  <Award className="inline h-4 w-4 mr-2" />
                  MOST POPULAR
                </span>
              </div>
              <div className="text-center pt-4">
                <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <TrendingUp className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Consulting Partner</h3>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  $200-350<span className="text-lg text-gray-600">/hour</span>
                </div>
                <p className="text-gray-600 mb-8">
                  For established consulting firms
                </p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Advanced certification & badges</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Priority project allocation</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Revenue sharing (up to 20%)</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Dedicated account manager</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span>Co-marketing opportunities</span>
                </li>
              </ul>
              <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90">
                Apply for Gold
              </Button>
            </motion.div>

            {/* Platinum Tier */}
            <motion.div
              variants={staggerItemScale}
              whileHover={{ y: -8, scale: 1.02 }}
              className="relative bg-gradient-to-b from-gray-900 to-black rounded-2xl border border-gray-800 p-8 hover:shadow-xl"
            >
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-gradient-to-r from-gray-700 to-gray-900 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  PLATINUM TIER
                </span>
              </div>
              <div className="text-center pt-4">
                <div className="w-20 h-20 bg-gray-800 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Shield className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Technical Partner
                </h3>
                <div className="text-3xl font-bold text-white mb-2">
                  Custom<span className="text-lg text-gray-400">/contract</span>
                </div>
                <p className="text-gray-400 mb-8">
                  For enterprise solution providers
                </p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3 text-white">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Full API & SDK access</span>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Enterprise client referrals</span>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>White-label opportunities</span>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>24/7 technical support</span>
                </li>
                <li className="flex items-center gap-3 text-white">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span>Strategic partnership council</span>
                </li>
              </ul>
              <Button className="w-full bg-white text-gray-900 hover:bg-gray-100">
                Apply for Platinum
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Application Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">Partner Application</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowForm(false)}
                    className="hover:bg-gray-100"
                  >
                    ✕
                  </Button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Full Name *</label>
                      <Input
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Email Address *
                      </label>
                      <Input
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Company Name
                      </label>
                      <Input
                        placeholder="Your Company LLC"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Preferred Role *
                      </label>
                      <Select
                        value={formData.role}
                        onValueChange={(value) =>
                          setFormData({ ...formData, role: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="implementation">
                            Implementation Partner
                          </SelectItem>
                          <SelectItem value="consulting">
                            Consulting Partner
                          </SelectItem>
                          <SelectItem value="technical">
                            Technical Partner
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Years of Experience *
                    </label>
                    <Select
                      value={formData.experience}
                      onValueChange={(value) =>
                        setFormData({ ...formData, experience: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-3">1-3 years</SelectItem>
                        <SelectItem value="3-5">3-5 years</SelectItem>
                        <SelectItem value="5-10">5-10 years</SelectItem>
                        <SelectItem value="10+">10+ years</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Why do you want to partner with us? *
                    </label>
                    <Textarea
                      placeholder="Tell us about your experience, goals, and why you'd be a great partner..."
                      rows={4}
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      Portfolio or LinkedIn Profile
                    </label>
                    <Input placeholder="https://linkedin.com/in/yourprofile or portfolio link" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="terms"
                      required
                      className="rounded"
                    />
                    <label htmlFor="terms" className="text-sm">
                      I agree to the partner terms and conditions
                    </label>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                    >
                      Submit Application
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Stories Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Success Stories from Our Partners
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              See how partners are growing their businesses and achieving
              success
            </p>
          </div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid lg:grid-cols-3 gap-8"
          >
            {[1, 2, 3].map((story) => (
              <motion.div
                key={story}
                variants={staggerItemScale}
                whileHover={{ y: -6, scale: 1.02 }}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {["JS", "MR", "AB"][story - 1]}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">
                      {
                        ["Jennifer Smith", "Michael Rodriguez", "Alex Brown"][
                          story - 1
                        ]
                      }
                    </h4>
                    <p className="text-gray-600 text-sm">
                      {
                        [
                          "Implementation Partner",
                          "Technical Partner",
                          "Consulting Partner",
                        ][story - 1]
                      }
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="h-4 w-4 fill-yellow-400 text-yellow-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 italic mb-6">
                  "Partnering with this platform transformed my consulting
                  business. I went from freelancing to running a team of 8
                  specialists within 18 months."
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Earnings Increase:</span>
                    <span className="font-semibold text-green-600">+320%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Projects Completed:</span>
                    <span className="font-semibold">42</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Client Satisfaction:</span>
                    <span className="font-semibold">4.9/5</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-4xl font-bold text-center mb-12"
          >
            Frequently Asked Questions
          </motion.h2>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="space-y-6"
          >
            {[
              {
                q: "How long does the application process take?",
                a: "The process typically takes 2-3 weeks from application to approval. This includes review, interview, and onboarding.",
              },
              {
                q: "What support do partners receive?",
                a: "Partners receive comprehensive support including technical assistance, marketing materials, sales training, and dedicated account management for higher tiers.",
              },
              {
                q: "Are there any upfront costs?",
                a: "There are no upfront costs. Certification training is provided at no cost to approved partners.",
              },
              {
                q: "How are projects assigned?",
                a: "Projects are matched based on partner expertise, availability, and tier. Gold and Platinum partners receive priority allocation.",
              },
            ].map((faq, index) => (
              <motion.div
                key={index}
                variants={staggerItem}
                className="border-b pb-6"
              >
                <h3 className="text-lg font-semibold mb-3">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-gray-900 to-black overflow-hidden">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="max-w-4xl mx-auto px-6 text-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={defaultViewport}
            transition={{ duration: 0.5 }}
          >
            <Award className="h-16 w-16 text-white mx-auto mb-6" />
          </motion.div>
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Join Our Partner Network?
          </h2>
          <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
            Take the first step toward growing your business with
            enterprise-level opportunities.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-gray-900 px-10 py-6 text-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all"
              onClick={() => setShowForm(true)}
            >
              Apply Now
              <ExternalLink className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white px-10 py-6 text-lg hover:bg-white/10"
            >
              <MessageSquare className="mr-2 h-5 w-5" />
              Schedule a Call
            </Button>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800">
            <div className="flex flex-wrap justify-center gap-8 text-gray-400">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>1-800-PARTNER</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>partners@company.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Global Partner Network</span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
