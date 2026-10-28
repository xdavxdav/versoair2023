import { ArrowUpRight, Flag } from "lucide-react";
import { Link } from "wouter";
import { useLanguage } from "@/components/LanguageSwitcher";
import { NativeLabel } from "@/components/NativeLabel";
import { FEEDBACK_FORM_URL } from "@/lib/feedback";
import { FOOTER_COLUMNS, FOOTER_SOCIAL_LINKS } from "@shared/footer-links";

const linkClass =
  "inline-flex min-h-11 items-center rounded-sm text-emerald-50/75 underline-offset-4 transition-colors hover:text-amber-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80";

export default function Footer() {
  const { translateText } = useLanguage();

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

      <div className="mx-auto max-w-7xl px-5 pb-[calc(env(safe-area-inset-bottom)+8.5rem)] pt-10 sm:px-8 sm:pb-[calc(env(safe-area-inset-bottom)+6.5rem)] sm:pt-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-14">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.32em] text-amber-200/75">
              <NativeLabel text="Incorporated in Ontario · Toronto, Canada" />
            </p>
            <Link
              href="/"
              className="group inline-flex min-h-11 items-center gap-2 rounded-sm text-3xl font-semibold tracking-[-0.05em] text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 sm:text-5xl"
            >
              <span className="notranslate">VERSO AIR INC.</span>
              <ArrowUpRight
                aria-hidden="true"
                className="h-5 w-5 shrink-0 text-amber-200/80 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1"
              />
            </Link>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-emerald-100/65">
              <NativeLabel text="The professional network connecting businesses, craftspeople and artists." />
            </p>
            <a
              href={FEEDBACK_FORM_URL}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="footer-feedback-link"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full border border-amber-200/40 px-4 text-sm font-medium text-amber-100 transition-colors hover:bg-amber-200/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
            >
              <Flag aria-hidden="true" className="h-4 w-4 shrink-0" />
              <NativeLabel text="Report an issue" />
              <span className="sr-only">
                <NativeLabel text="(new tab)" />
              </span>
            </a>
          </div>

          <nav aria-label={translateText("Footer navigation")}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-8 break-words sm:grid-cols-4">
              {FOOTER_COLUMNS.map(({ heading, links }) => (
                <div key={heading}>
                  <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-amber-200/80">
                    <NativeLabel text={heading} />
                  </h2>
                  <ul className="text-sm">
                    {links.map(({ href, label }) => (
                      <li key={href}>
                        <Link href={href} className={linkClass}>
                          <NativeLabel text={label} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-emerald-50/10 pt-5 text-xs text-emerald-100/65 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()}{" "}
            <span className="notranslate">VERSO AIR INC.</span>{" "}
            <NativeLabel text="All rights reserved." />
          </p>
          <nav aria-label={translateText("Social media")}>
            <ul className="flex flex-wrap gap-x-1 gap-y-1">
              {FOOTER_SOCIAL_LINKS.map(({ href, label }) => (
                <li key={href}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="notranslate inline-flex min-h-11 items-center rounded-sm px-2 underline-offset-4 transition-colors hover:text-amber-200 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80"
                  >
                    {label}
                    <span className="sr-only">
                      {" "}
                      <NativeLabel text="(new tab)" />
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
