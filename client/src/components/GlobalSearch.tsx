import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Search, X, FileText, HelpCircle, Store, Mic2, Newspaper, Tag } from "lucide-react";

type Hit = { key: string; title: string; hint: string; path: string; kind: "page" | "faq" | "business" | "artist" | "post" | "listing" };

const PAGES: { title: string; path: string; keywords: string }[] = [
  { title: "Home", path: "/", keywords: "accueil verso air" },
  { title: "Marketplace", path: "/marketplace", keywords: "shop buy sell boutique" },
  { title: "Blog", path: "/blog", keywords: "news articles community" },
  { title: "Reserve a dwelling", path: "/reservations", keywords: "booking hotel stay reservation logement" },
  { title: "Services", path: "/services", keywords: "service prestations" },
  { title: "Careers", path: "/services/careers", keywords: "jobs emploi hiring work" },
  { title: "Marketing", path: "/marketing", keywords: "advertise promotion ads" },
  { title: "Artist portal", path: "/artist-portal", keywords: "music artiste login code" },
  { title: "Artists directory", path: "/artistes", keywords: "musicians artistes" },
  { title: "Artisans directory", path: "/artisans", keywords: "craft artisan" },
  { title: "Businesses directory", path: "/businesses-directory", keywords: "business entreprises annuaire" },
  { title: "Geo Admin", path: "/geo-admin", keywords: "geo admin map location seo" },
  { title: "FAQ", path: "/faq", keywords: "help aide questions support" },
  { title: "Recognize Verso Air IDs", path: "/id-guide", keywords: "matricule staff id code card role badge" },
];

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<Hit[]>([]);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQ("");
      setRemote([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRemote([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      const enc = encodeURIComponent(term);
      const [faq, biz, site] = await Promise.allSettled([
        fetch(`/api/faq/search?q=${enc}&limit=4`, { signal: ctrl.signal }).then((r) => r.json()),
        fetch(`/api/businesses?search=${enc}&limit=4`, { signal: ctrl.signal }).then((r) => r.json()),
        fetch(`/api/site-search?q=${enc}`, { signal: ctrl.signal }).then((r) => r.json()),
      ]);
      const hits: Hit[] = [];
      if (faq.status === "fulfilled" && faq.value?.success)
        for (const f of faq.value.data || [])
          hits.push({ key: `f${f.id}`, title: f.title, hint: "FAQ", path: `/faq?topic=${f.id}`, kind: "faq" });
      if (biz.status === "fulfilled" && biz.value?.success)
        for (const b of biz.value.data || [])
          hits.push({ key: `b${b.id}`, title: b.name, hint: b.city_name || b.location || "Business", path: `/business/${b.id}`, kind: "business" });
      if (site.status === "fulfilled" && site.value?.success)
        for (const s of site.value.data || [])
          hits.push({ key: `${s.kind}${s.id}`, title: s.title, hint: s.hint, path: s.path, kind: s.kind });
      setRemote(hits);
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const term = q.trim().toLowerCase();
  const pageHits: Hit[] = PAGES.filter(
    (p) => !term || `${p.title} ${p.keywords}`.toLowerCase().includes(term),
  )
    .slice(0, 8)
    .map((p) => ({ key: p.path, title: p.title, hint: "Page", path: p.path, kind: "page" as const }));
  const hits = [...pageHits, ...remote];
  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };
  const Icon = { page: FileText, faq: HelpCircle, business: Store, artist: Mic2, post: Newspaper, listing: Tag };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline notranslate" translate="no">
          ⌘K
        </span>
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/70 px-3 pt-[12vh] backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <div
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#0b0614] text-white shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <form
                className="flex items-center gap-2 border-b border-white/10 px-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (hits[0]) go(hits[0].path);
                  else if (term) go(`/businesses-directory?search=${encodeURIComponent(q.trim())}`);
                }}
              >
                <Search className="h-4 w-4 text-white/50" />
                <input
                  ref={inputRef}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search pages, help, businesses…"
                  className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-white/40"
                />
                <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="h-4 w-4 text-white/50" />
                </button>
              </form>
              <ul className="max-h-[50vh] overflow-y-auto p-2">
                {hits.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-white/50">No results</li>
                )}
                {hits.map((h) => {
                  const I = Icon[h.kind];
                  return (
                    <li key={h.key}>
                      <button
                        type="button"
                        onClick={() => go(h.path)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/10"
                      >
                        <I className="h-4 w-4 shrink-0 text-white/50" />
                        <span className="flex-1 truncate">{h.title}</span>
                        <span className="text-xs text-white/40">{h.hint}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
