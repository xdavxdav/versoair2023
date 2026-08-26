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
    <footer className="relative bg-gray-950 text-white overflow-hidden">
      {/* Gradient top accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

      {/* Subtle ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[30rem] h-40 bg-amber-500/[0.03] blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 pt-20 pb-8">
        {/* ── Brand Hero ── */}
        <div className="mb-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
            <div>
              <h2 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                  Verso Air
                </span>
                <span className="text-amber-400 text-3xl lg:text-4xl align-super ml-1">
                  ™
                </span>
              </h2>
              <p className="text-gray-500 text-base sm:text-lg mt-4 max-w-md leading-relaxed">
                L'intelligence d'affaires, réinventée.
                <br />
                De l'analyse à l'action — nous propulsons ce qui vous anime.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/pricing"
                className="group inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-semibold px-7 py-3.5 rounded-full transition-all duration-200"
              >
                Commencer
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-medium px-7 py-3.5 rounded-full transition-all duration-200"
              >
                Nous contacter
              </Link>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-800/60 mb-12" />

        {/* ── Navigation Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-10 mb-16">
          {navSections.map(({ title, links }) => (
            <div key={title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-5">
                {title}
              </h4>
              <ul className="space-y-3">
                {links.map(({ href, label }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-gray-400 hover:text-white text-sm transition-colors duration-200 inline-flex items-center gap-1 group"
                    >
                      {label}
                      <ChevronRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Newsletter */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500 mb-5">
              Restez informé
            </h4>
            <p className="text-gray-500 text-sm mb-4 leading-relaxed">
              Mises à jour produit, analyses sectorielles et plus encore.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 min-w-0 bg-white/[0.03] border border-gray-800 rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/10 transition-all"
              />
              <button
                className="bg-white/[0.06] hover:bg-white/[0.1] border border-gray-800 hover:border-gray-700 text-gray-400 hover:text-white px-3.5 py-2.5 rounded-lg transition-all duration-200"
                aria-label="Subscribe"
              >
                <Mail className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="h-px bg-gray-800/60 mb-8" />

        {/* ── Bottom Bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-start sm:items-center gap-2">
            <div className="flex items-center gap-3">
              {socials.map(({ href, Icon, label }) => (
                <Link
                  key={label}
                  href={href}
                  title={label}
                  className="w-9 h-9 rounded-full bg-white/[0.04] border border-gray-800 flex items-center justify-center text-gray-600 hover:text-white hover:bg-white/[0.08] hover:border-gray-700 transition-all duration-200"
                >
                  <Icon className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-gray-500">
              Réseaux bientôt disponibles
            </p>
          </div>

          <p
            className="text-[11px] sm:text-xs tracking-[0.35em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-white to-amber-400 font-light select-none notranslate"
            style={{
              fontFamily: "'Caveat', cursive",
              fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
              letterSpacing: "0.4em",
            }}
          >
            STRΔΦGHT TΩ THΞ PΩΦΠT
          </p>

          <p className="text-gray-600 text-xs">
            © {new Date().getFullYear()}{" "}
            <span className="notranslate">Verso Air™</span>. Tous droits
            réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
