import { Link } from "wouter";
import { Newspaper } from "lucide-react";
import { SeoHead } from "@/components/seo/SeoHead";

export default function NewsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-16 text-white">
      <SeoHead
        title="News & Updates | Verso Air"
        description="Public platform announcements and updates from Verso Air."
        canonicalPath="/news"
      />
      <section className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-8 text-center shadow-xl sm:p-12">
        <Newspaper className="mx-auto h-12 w-12 text-amber-400" />
        <h1 className="mt-5 text-3xl font-bold">News & Updates</h1>
        <p className="mt-4 text-slate-300">
          This is the public journal for platform-wide Verso Air announcements
          and updates.
        </p>
        <p className="mt-3 text-sm text-slate-400">
          Personal notifications, including account activity across Verso Air
          services, are available after signing in.
        </p>
        <p className="mt-8 rounded-lg border border-white/10 bg-slate-900 p-4 text-sm text-slate-300">
          No public announcements have been posted yet.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-md bg-amber-400 px-4 py-2 font-semibold text-slate-950 hover:bg-amber-300"
        >
          Return to Verso Air
        </Link>
      </section>
    </main>
  );
}
