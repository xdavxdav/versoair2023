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

// Single source of truth for the company's social profiles: the footer and the
// Organization JSON-LD (sameAs) both read this list. LinkedIn uses the page's
// numeric company ID; the /admin/ dashboard URL is private and must not be used.
export const FOOTER_SOCIAL_LINKS = [
  { href: "https://www.linkedin.com/company/144004640/", label: "LinkedIn" },
  { href: "https://twitter.com/versoair", label: "X / Twitter" },
  {
    href: "https://www.facebook.com/p/Verso_air-100054657030816/",
    label: "Facebook",
  },
] as const;
