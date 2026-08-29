import { Mail, Phone, MapPin, Send, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  defaultViewport,
} from "@/lib/animations";
import ScrollToTop from "@/components/ScrollToTop";
import { useToast } from "@/hooks/use-toast";

export default function Contact() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
        toast({ title: "Message sent!", description: data.message });
        setFormData({
          name: "",
          email: "",
          phone: "",
          subject: "",
          message: "",
        });
      } else {
        toast({
          title: "Error",
          description: data.message || "Failed to send.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Network error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
            Get in Touch
          </motion.h1>
          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="mx-auto max-w-2xl text-center text-base text-slate-200 md:text-xl"
          >
            Have questions? We'd love to hear from you. Send us a message and
            we'll respond as soon as possible.
          </motion.p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/sav">
              <span className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10">
                🛡️ Service Après-Vente
              </span>
            </Link>
            <Link href="/help">
              <span className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10">
                📚 Centre d'aide
              </span>
            </Link>
            <Link href="/">
              <span className="cursor-pointer rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10">
                🏠 Accueil
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Contact Content */}
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:py-16">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          className="grid gap-8 md:grid-cols-2"
        >
          {/* Contact Info */}
          <motion.div variants={staggerItem} className="space-y-8">
            <div>
              <h2 className="mb-8 text-3xl font-bold text-slate-900">
                Contact Information
              </h2>

              <div className="space-y-5">
                <div className="flex items-start gap-4 rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_35px_rgba(15,23,42,0.04)]">
                  <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-900">Phone</h3>
                    <p className="text-slate-600">+1 (555) VERSO-AIR</p>
                    <p className="text-sm text-slate-500">
                      Mon-Fri, 8AM-6PM EST
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_35px_rgba(15,23,42,0.04)]">
                  <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-900">Email</h3>
                    <p className="text-slate-600">support@versoair.com</p>
                    <p className="text-sm text-slate-500">
                      We'll respond within 24 hours
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-[22px] border border-slate-200 bg-white p-5 shadow-[0_18px_35px_rgba(15,23,42,0.04)]">
                  <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="mb-1 font-semibold text-slate-900">
                      Address
                    </h3>
                    <p className="text-slate-600">Verso Air Headquarters</p>
                    <p className="text-sm text-slate-500">
                      Global Operations Center
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_35px_rgba(15,23,42,0.04)]">
              <h3 className="mb-4 font-semibold text-slate-900">Need Help?</h3>
              <div className="space-y-2">
                <Link href="/help/account">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  >
                    Account Help
                  </Button>
                </Link>
                <Link href="/help/product">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  >
                    Product Support
                  </Button>
                </Link>
                <Link href="/services/news">
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  >
                    Latest Updates
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Contact Form */}
          <motion.div
            variants={staggerItem}
            className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_35px_rgba(15,23,42,0.04)] md:p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  placeholder="Your name"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Subject
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  placeholder="How can we help?"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                  placeholder="Tell us more..."
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition-all hover:bg-slate-800"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Message
                  </>
                )}
              </Button>
            </form>
          </motion.div>
        </motion.div>
      </div>

      <ScrollToTop />
    </div>
  );
}
