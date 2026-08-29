import { Link } from "wouter";
import { useState } from "react";
import {
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  ArrowUpRight,
  Mail,
  ChevronRight,
} from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");

  const navSections = [
    {
      title: "Plateforme",
      links: [
        { href: "/", label: "Accueil" },
        { href: "/logement", label: "Logement" },
        { href: "/businesses-directory", label: "Annuaire d'entreprises" },
        { href: "/reservations", label: "Réservations" },
        { href: "/geo-admin", label: "Geo Admin" },
        { href: "/pricing", label: "Tarifs" },
        { href: "/demo", label: "Demander une démo" },
      ],
    },
    {
      title: "Industries",
      links: [
        { href: "/commerce", label: "Commerce" },
        { href: "/hotellerie", label: "Hôtellerie" },
        { href: "/batiment", label: "Bâtiment" },
        { href: "/automobile", label: "Automobile" },
        { href: "/finances", label: "Finances" },
        { href: "/sante", label: "Santé" },
        { href: "/divertissement", label: "Divertissement" },
      ],
    },
    {
      title: "Ressources",
      links: [
        { href: "/sav", label: "SAV 24/7" },
        { href: "/versoai", label: "VersoAI" },
        { href: "/docs", label: "Documentation" },
        { href: "/contact", label: "Contact" },
        { href: "/status", label: "État du système" },
      ],
    },
    {
      title: "Juridique",
      links: [
        { href: "/information", label: "Centre d'information" },
        { href: "/privacy", label: "Politique de confidentialité" },
        { href: "/terms", label: "Conditions d'utilisation" },
        { href: "/cookies", label: "Politique de cookies" },
        { href: "/gdpr", label: "Protection des données" },
      ],
    },
  ];

  const socials = [
    { href: "/about", Icon: Facebook, label: "Facebook" },
    { href: "/blog", Icon: Twitter, label: "X" },
    { href: "/marketplace", Icon: Linkedin, label: "LinkedIn" },
    { href: "/contact", Icon: Instagram, label: "Instagram" },
  ];

  return (
    <footer className="relative overflow-hidden border-t border-slate-200 bg-[#f5f1ea] text-slate-900">
      {/* Gradient top accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />

      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30rem] h-40 bg-amber-500/[0.08] blur-3xl rounded-full pointer-events-none" />

      <div className="relative mx-auto max-w-[1600px] px-4 pb-8 pt-16 sm:px-6 lg:px-8">
        {/* ── Brand Hero ── */}
        <div className="mb-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-7xl">
                <span className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500 bg-clip-text text-transparent">
                  Verso Air
                </span>
                <span className="ml-1 align-super text-3xl text-amber-500 lg:text-4xl">
                  ™
                </span>
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-slate-600 sm:text-lg">
                L'intelligence d'affaires, réinventée.
                <br />
                De l'analyse à l'action — nous propulsons ce qui vous anime.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/pricing"
                className="group inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-7 py-3.5 font-semibold text-white transition-all duration-200 hover:bg-slate-800"
              >
                Commencer
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 font-medium text-slate-700 transition-all duration-200 hover:border-slate-400 hover:text-slate-900"
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-800/60 mb-12" />

        {/* ── Navigation Grid ── */}
        <div className="mb-16 grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
          {navSections.map(({ title, links }) => (
            <div key={title}>
              <h4 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="inline-flex items-center gap-1 text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900 group"
                    >
                      {label}
                      <ChevronRight className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <h4 className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Restez informé
            </h4>
            <p className="mb-4 text-sm leading-relaxed text-slate-600">
              Mises à jour produit, analyses sectorielles et plus encore.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all"
              />
              <button
                className="rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-slate-600 transition-all duration-200 hover:border-slate-400 hover:text-slate-900"
                aria-label="Subscribe"
              >
                <Mail className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="mb-8 h-px bg-slate-300/80" />

        {/* ── Bottom Bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-start sm:items-center gap-2">
            <div className="flex items-center gap-3">
              {socials.map(({ href, Icon, label }) => (
                <Link
                  key={label}
                  href={href}
                  title={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 transition-all duration-200 hover:border-slate-400 hover:text-slate-900"
                >
                  <Icon className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">
              Réseaux bientôt disponibles
            </p>
          </div>

          <p
            className="select-none bg-gradient-to-r from-amber-500 via-slate-700 to-amber-500 bg-clip-text text-[11px] font-light uppercase tracking-[0.35em] text-transparent sm:text-xs notranslate"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
              letterSpacing: "0.4em",
            }}
          >
            STRΔΦGHT TΩ THΞ PΩΦΠT
          </p>

          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()}{" "}
            <span className="notranslate">Verso Air™</span>. Tous droits
            réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
