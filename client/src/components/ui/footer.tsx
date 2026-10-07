import { Link } from "wouter";

const links = [
  { href: "/about", label: "À propos" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Confidentialité" },
  { href: "/terms", label: "Conditions d’utilisation" },
  { href: "/cookies", label: "Cookies" },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-[#f5f1ea] text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <Link
            href="/"
            className="font-semibold tracking-wide"
          >
            VERSO AIR INC.
          </Link>
          <p className="mt-1 text-sm text-slate-600">
            Société constituée en Ontario · Toronto, Canada
          </p>
        </div>
        <nav aria-label="Liens de l’entreprise">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            {links.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="underline-offset-4 hover:text-slate-900 hover:underline"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <p className="pb-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} VERSO AIR INC. Tous droits réservés.
      </p>
    </footer>
  );
}
