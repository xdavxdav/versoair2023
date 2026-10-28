// Footer link data. Only pages that are open to everyone belong here: the test in
// footer-translations.test.ts rejects any path in LOCAL_PREVIEW_ONLY_PATHS.
export const FOOTER_COLUMNS = [
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Explore",
    links: [
      { href: "/services", label: "Services" },
      { href: "/marketplace", label: "Marketplace" },
      { href: "/events", label: "Events" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    heading: "Support",
    links: [
      { href: "/help", label: "Help Center" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
] as const;

export const FOOTER_SOCIAL_LINKS = [
  { href: "https://linkedin.com/company/versoair", label: "LinkedIn" },
  { href: "https://twitter.com/versoair", label: "X / Twitter" },
  { href: "https://facebook.com/versoair", label: "Facebook" },
] as const;
