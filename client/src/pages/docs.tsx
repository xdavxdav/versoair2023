import {
  BookOpen,
  Code2,
  MessageSquare,
  Search,
  CreditCard,
} from "lucide-react";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import { useState } from "react";

export default function Documentation() {
  const [searchTerm, setSearchTerm] = useState("");

  const docs = [
    {
      title: "Help Center",
      description: "Browse help topics and popular questions",
      href: "/help",
      icon: <BookOpen className="h-6 w-6" />,
    },
    {
      title: "Product Help",
      description: "Guidance for product features and setup",
      href: "/help/product",
      icon: <MessageSquare className="h-6 w-6" />,
    },
    {
      title: "API Reference",
      description: "Review API endpoints and integration guidance",
      href: "/api",
      icon: <Code2 className="h-6 w-6" />,
    },
    {
      title: "Account Help",
      description: "Get help with account access and settings",
      href: "/help/account",
      icon: <BookOpen className="h-6 w-6" />,
    },
    {
      title: "Payments Help",
      description: "Find support for payment and billing questions",
      href: "/help/payments",
      icon: <CreditCard className="h-6 w-6" />,
    },
  ];

  const filteredDocs = docs.filter((doc) =>
    `${doc.title} ${doc.description}`
      .toLowerCase()
      .includes(searchTerm.trim().toLowerCase()),
  );

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="relative pt-20 pb-16 px-4">
        <div className="max-w-[95vw] mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 text-center">
            Documentation
          </h1>
          <p className="text-xl text-slate-300 text-center max-w-2xl mx-auto">
            Everything you need to master Verso Air
          </p>

          <div className="mt-8 max-w-2xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-3 h-5 w-5 text-slate-500" />
              <input
                type="text"
                aria-label="Search help and documentation"
                placeholder="Search documentation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[95vw] mx-auto px-4 py-16">
        {filteredDocs.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocs.map((doc) => (
              <Link
                key={doc.href}
                href={doc.href}
                className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 backdrop-blur p-6 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-all group focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500"
              >
                <div className="text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                  {doc.icon}
                </div>
                <h2 className="text-lg font-bold text-white mb-2">
                  {doc.title}
                </h2>
                <p className="text-slate-400 text-sm">{doc.description}</p>
              </Link>
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-slate-300" role="status">
            No help topics match "{searchTerm}".
          </p>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 p-8 md:p-12 rounded-xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Still Need Help?
          </h2>
          <p className="text-slate-300 mb-8">
            Browse help topics or contact our support team for assistance.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300"
          >
            Contact Support
          </Link>
        </div>
      </div>

      <ScrollToTop />
    </div>
  );
}
