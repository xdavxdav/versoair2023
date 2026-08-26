import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Home, ShoppingBag } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen w-full items-center justify-center bg-slate-950 px-4 py-16">
      <Card className="w-full max-w-lg border-slate-800 bg-slate-900/80 text-white shadow-2xl">
        <CardContent className="pt-8 pb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="rounded-full bg-red-500/15 p-2">
              <AlertCircle className="h-7 w-7 text-red-400" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Page introuvable
            </h1>
          </div>

          <p className="text-sm text-slate-300 leading-6">
            Cette page n’existe pas ou n’est plus disponible dans la version
            beta. Vérifiez l’URL ou revenez à l’accueil.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-amber-400"
            >
              <Home className="h-4 w-4" />
              Accueil
            </Link>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-slate-500 hover:bg-slate-800/90"
            >
              <ShoppingBag className="h-4 w-4" />
              Marketplace
            </Link>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
