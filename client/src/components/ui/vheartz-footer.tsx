import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";

const visionLinks = [
  { href: "/vheartz", label: "The vision" },
  { href: "/ong-culturelle", label: "Culture" },
  { href: "/get-involved", label: "Get involved" },
  { href: "/partners", label: "Partnerships" },
];

export default function VHeartzFooter() {
  return (
    <footer className="relative isolate overflow-hidden border-t border-amber-200/15 bg-[#071d19] text-emerald-50">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-40"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 15% 0%, rgba(31, 132, 99, .42), transparent 48%), radial-gradient(ellipse at 88% 100%, rgba(190, 128, 51, .16), transparent 40%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-24 -z-10 h-64 w-64 rounded-full border border-amber-200/10 sm:-right-4 sm:-top-36 sm:h-96 sm:w-96"
      />

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="grid gap-9 sm:grid-cols-[1.15fr_1fr] sm:items-end">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-200/75">
              Culture · exchange · community
            </p>
            <Link
              href="/vheartz"
              className="group inline-flex items-baseline gap-2 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl"
            >
              <span className="notranslate">vHeartz</span>
              <ArrowUpRight
                aria-hidden="true"
                className="h-5 w-5 text-amber-200/80 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
              />
            </Link>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-emerald-100/65">
              An independent cultural and community vision in development,
              distinct from VERSO AIR INC. Updates will be shared as plans are
              confirmed.
            </p>
          </div>

          <nav aria-label="vHeartz links">
            <ul className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:justify-items-end">
              {visionLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-emerald-50/75 underline-offset-4 transition-colors hover:text-amber-200 hover:underline"
                  >
                    {label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/contact"
                  className="text-emerald-50/75 underline-offset-4 transition-colors hover:text-amber-200 hover:underline"
                >
                  Contact
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-emerald-50/10 pt-5 text-xs text-emerald-100/50 sm:mt-10 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} vHeartz. A future organization; not a
            VERSO AIR INC. service.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link className="hover:text-amber-200" href="/privacy">
              Privacy
            </Link>
            <Link className="hover:text-amber-200" href="/terms">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
