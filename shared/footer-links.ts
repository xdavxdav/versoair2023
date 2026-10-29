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
// Organization JSON-LD (sameAs) both read this list. Every entry must open for a
// logged-out stranger: no admin/dashboard URLs and no guessed handles (Verso Air
// has no X account, so there is no X link). LinkedIn must use the public vanity
// URL: the numeric company-ID form sends logged-out visitors to a sign-in wall,
// while /company/verso-air-inc/ (organization 144004640) is public.
// server/utils/public-links.test.ts rejects the known dead forms.
export const FOOTER_SOCIAL_LINKS = [
  { href: "https://www.linkedin.com/company/verso-air-inc/", label: "LinkedIn" },
  {
    href: "https://www.facebook.com/p/Verso_air-100054657030816/",
    label: "Facebook",
  },
] as const;
