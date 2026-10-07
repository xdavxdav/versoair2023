import { motion } from "framer-motion";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Mail,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";

const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const viewport = { once: true, margin: "-60px" };

export default function Partners() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <section className="relative overflow-hidden bg-slate-950 px-4 py-20 text-white sm:px-6 lg:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(245,158,11,0.15),transparent_35%),linear-gradient(135deg,#020617,#111827)]" />
        <div className="relative mx-auto max-w-5xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-4 py-2 text-sm font-medium text-amber-100"
          >
            <BriefcaseBusiness className="h-4 w-4" />
            Partnership conversations
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-8 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl"
          >
            Clear collaborations, not inflated claims.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-slate-300 sm:text-lg"
          >
            VERSO AIR INC. welcomes conversations with credible partners, service
            providers, and organizations aligned with a verified launch in Toronto
            and Canada. We keep partnerships evidence-based and only announce them
            when they are real and approved.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"
          >
            <Link href="/contact">
              <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300">
                Start a conversation
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="outline" className="border-slate-600 bg-slate-900 text-white hover:bg-slate-800">
                Learn about the company
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-20">
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={viewport}
          className="mb-12 text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">
            What we prioritize
          </p>
          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            Partnership criteria that match a credible launch
          </h2>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              icon: Building2,
              title: "Clear business fit",
              text: "We assess partnerships against the actual launch offer, verified market fit, and company direction.",
            },
            {
              icon: ShieldCheck,
              title: "Evidence first",
              text: "Public claims, programs, and publishing decisions only move forward with clear support and approval.",
            },
            {
              icon: Users,
              title: "Real collaboration",
              text: "We prefer practical, approved relationships over promotional placeholders or speculative announcements.",
            },
          ].map((item) => (
            <motion.article
              key={item.title}
              variants={fadeInUp}
              initial="hidden"
              whileInView="visible"
              viewport={viewport}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm"
            >
              <div className="mb-4 inline-flex rounded-xl bg-amber-100 p-3 text-amber-700">
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Current stance
          </p>
          <h3 className="mt-4 text-2xl font-bold text-slate-900">
            Partnership announcements are intentionally conservative.
          </h3>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            We do not publish partner lists, testimonials, or performance claims
            until they are confirmed, relevant, and representative of the actual
            business relationship. This keeps the public signal credible and fit
            for launch.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href="mailto:support@versoair.com">
              <Button variant="outline" className="border-slate-300 text-slate-900 hover:bg-slate-100">
                <Mail className="mr-2 h-4 w-4" />
                support@versoair.com
              </Button>
            </a>
            <Link href="/contact">
              <Button variant="ghost" className="text-slate-900 hover:bg-slate-100">
                Contact page
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <ScrollToTop />
    </div>
  );
}
