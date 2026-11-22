/**
 * Section-specific guest introduction card for vxpp.
 * Replaces the generic shared ViewOnlyGate so Feed, Marketplace, and Profile
 * each communicate their exact purpose without mixing unrelated copy.
 */
import React, { useState } from "react";
import {
  ArrowLeft,
  Camera,
  Loader2,
  MessageCircle,
  Newspaper,
  ShieldCheck,
  ShoppingBag,
  Tag,
  User,
  Users,
} from "lucide-react";
import { useLanguage } from "@/components/LanguageSwitcher";

export type VxppGuestSection = "feed" | "marketplace" | "profile";

interface VxppGuestIntroProps {
  section: VxppGuestSection;
  onSignIn: () => void;
  onSignUp: () => void;
  onBack?: () => void;
  redirectPath?: string;
}

const SECTION_COPY = {
  feed: {
    en: {
      badge: "vxpp · Social Feed",
      title: "Share updates & follow your community",
      subtitle:
        "Sign in with your Verso Air account to publish posts, share photos, comment, follow members, and message people directly.",
      ctaPrimary: "Sign in to Feed",
      ctaSecondary: "Create free account",
      highlights: [
        { icon: Newspaper, title: "Posts & photos", desc: "Share updates, ideas, and images with members." },
        { icon: Users, title: "Follow & engage", desc: "React, comment, and build your personal network." },
        { icon: MessageCircle, title: "Direct inbox", desc: "Start private conversations from any profile." },
      ],
    },
    fr: {
      badge: "vxpp · Fil social",
      title: "Partagez et suivez votre communauté",
      subtitle:
        "Connectez-vous avec votre compte Verso Air pour publier, partager des photos, commenter, suivre des membres et échanger par message.",
      ctaPrimary: "Se connecter au fil",
      ctaSecondary: "Créer un compte gratuit",
      highlights: [
        { icon: Newspaper, title: "Publications et photos", desc: "Partagez vos idées et images avec la communauté." },
        { icon: Users, title: "Suivre et échanger", desc: "Réagissez, commentez et développez votre réseau." },
        { icon: MessageCircle, title: "Messagerie directe", desc: "Démarrez une discussion privée depuis un profil." },
      ],
    },
    es: {
      badge: "vxpp · Feed social",
      title: "Comparte y sigue a tu comunidad",
      subtitle:
        "Inicia sesión con tu cuenta de Verso Air para publicar, subir fotos, comentar, seguir miembros y enviar mensajes directos.",
      ctaPrimary: "Entrar al feed",
      ctaSecondary: "Crear cuenta gratis",
      highlights: [
        { icon: Newspaper, title: "Publicaciones y fotos", desc: "Comparte novedades e imágenes con la comunidad." },
        { icon: Users, title: "Seguir y participar", desc: "Reacciona, comenta y amplía tu red personal." },
        { icon: MessageCircle, title: "Mensajes directos", desc: "Inicia conversaciones privadas desde cualquier perfil." },
      ],
    },
  },
  marketplace: {
    en: {
      badge: "vxpp · Marketplace",
      title: "Buy, sell & contact local sellers",
      subtitle:
        "Marketplace listings are separate from the social feed. Sign in to browse active items, save favorites, publish listings, and message sellers with full listing context.",
      ctaPrimary: "Sign in to Marketplace",
      ctaSecondary: "Create free account",
      highlights: [
        { icon: ShoppingBag, title: "Dedicated listings", desc: "Structured prices, categories, and item conditions." },
        { icon: Tag, title: "Publish your items", desc: "List goods or services from your verified account." },
        { icon: MessageCircle, title: "Seller messaging", desc: "Every inquiry links directly to the listing in your inbox." },
      ],
    },
    fr: {
      badge: "vxpp · Marché",
      title: "Achetez, vendez et contactez les vendeurs",
      subtitle:
        "Les annonces du Marché sont distinctes du fil social. Connectez-vous pour parcourir, publier des annonces et écrire aux vendeurs avec le contexte de l'article.",
      ctaPrimary: "Accéder au Marché",
      ctaSecondary: "Créer un compte gratuit",
      highlights: [
        { icon: ShoppingBag, title: "Annonces dédiées", desc: "Prix, catégories et état clairement structurés." },
        { icon: Tag, title: "Publier vos articles", desc: "Mettez en vente des biens ou services depuis votre compte." },
        { icon: MessageCircle, title: "Messages vendeurs", desc: "Chaque discussion conserve la référence de l'annonce." },
      ],
    },
    es: {
      badge: "vxpp · Mercado",
      title: "Compra, vende y contacta vendedores",
      subtitle:
        "Los anuncios del Mercado están separados del feed social. Inicia sesión para explorar, publicar artículos y escribir a vendedores con contexto del anuncio.",
      ctaPrimary: "Entrar al Mercado",
      ctaSecondary: "Crear cuenta gratis",
      highlights: [
        { icon: ShoppingBag, title: "Anuncios dedicados", desc: "Precios, categorías y estado claros." },
        { icon: Tag, title: "Publica tus artículos", desc: "Ofrece productos o servicios con tu cuenta." },
        { icon: MessageCircle, title: "Mensajes con contexto", desc: "Cada consulta conserva la referencia del anuncio." },
      ],
    },
  },
  profile: {
    en: {
      badge: "vxpp · Personal Identity",
      title: "Your personal Verso Air profile",
      subtitle:
        "Sign in to customize your profile picture, cover photo, bio, and interests — one unified identity across Feed, Communities, Messages, Marketplace, Careers, and Contractors.",
      ctaPrimary: "Sign in to My Profile",
      ctaSecondary: "Create free account",
      highlights: [
        { icon: Camera, title: "Photo & cover banner", desc: "Persistent profile and cover images synced across devices." },
        { icon: User, title: "Public & private control", desc: "Share your bio and work while keeping account details private." },
        { icon: ShieldCheck, title: "One account, clear roles", desc: "Access your eligible portals without mixing permissions." },
      ],
    },
    fr: {
      badge: "vxpp · Identité personnelle",
      title: "Votre profil personnel Verso Air",
      subtitle:
        "Connectez-vous pour personnaliser votre photo de profil, bannière de couverture, bio et centres d'intérêt sur tout vxpp.",
      ctaPrimary: "Voir mon profil",
      ctaSecondary: "Créer un compte gratuit",
      highlights: [
        { icon: Camera, title: "Photo et couverture", desc: "Images persistées et synchronisées sur tous vos appareils." },
        { icon: User, title: "Public et privé séparés", desc: "Affichez votre bio tout en protégeant vos données privées." },
        { icon: ShieldCheck, title: "Un compte, des rôles clairs", desc: "Accédez à vos portails autorisés en toute sécurité." },
      ],
    },
    es: {
      badge: "vxpp · Identidad personal",
      title: "Tu perfil personal en Verso Air",
      subtitle:
        "Inicia sesión para personalizar tu foto de perfil, portada, biografía e intereses en toda la experiencia vxpp.",
      ctaPrimary: "Ir a mi perfil",
      ctaSecondary: "Crear cuenta gratis",
      highlights: [
        { icon: Camera, title: "Foto y portada", desc: "Imágenes guardadas y sincronizadas en todos tus dispositivos." },
        { icon: User, title: "Control público/privado", desc: "Muestra tu biografía manteniendo privados tus datos personales." },
        { icon: ShieldCheck, title: "Una cuenta, roles claros", desc: "Accede a tus portales autorizados sin mezclar permisos." },
      ],
    },
  },
} as const;

export default function VxppGuestIntro({
  section,
  onSignIn,
  onSignUp,
  onBack,
  redirectPath,
}: VxppGuestIntroProps) {
  const { currentLang } = useLanguage();
  const lang = currentLang === "fr" || currentLang === "es" ? currentLang : "en";
  const copy = SECTION_COPY[section][lang];
  const [ssoBusy, setSsoBusy] = useState<string | null>(null);
  const [ssoError, setSsoError] = useState("");

  const targetRedirect =
    redirectPath ||
    (section === "marketplace" ? "/marketplace" : section === "profile" ? "/profile" : "/blog");

  const startSso = async (provider: "google" | "linkedin") => {
    setSsoBusy(provider);
    setSsoError("");
    const url = `/auth/oauth/${provider}?redirect=${encodeURIComponent(targetRedirect)}`;
    try {
      const res = await fetch(url, { redirect: "manual" });
      if (res.status === 501) {
        const body = await res.json().catch(() => null);
        setSsoError(body?.message || `${provider} sign-in is not configured yet.`);
        setSsoBusy(null);
        return;
      }
      window.location.href = url;
    } catch {
      setSsoError("Could not reach sign-in provider. Please try again.");
      setSsoBusy(null);
    }
  };

  return (
    <div
      data-testid={`vxpp-guest-intro-${section}`}
      className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8"
    >
      <div className="w-full max-w-2xl rounded-3xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-sm">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-5 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 min-h-[38px]"
          >
            <ArrowLeft className="h-4 w-4" />
            {lang === "fr" ? "Retour" : lang === "es" ? "Volver" : "Back"}
          </button>
        )}

        <div className="inline-flex items-center gap-2 rounded-full bg-amber-600/12 border border-amber-600/25 px-3 py-1 text-xs font-semibold text-amber-900 dark:text-amber-300 mb-4">
          {copy.badge}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-3">
          {copy.title}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-7">
          {copy.subtitle}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
          {copy.highlights.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="rounded-2xl border border-stone-200/90 dark:border-slate-800 bg-[#faf8f4] dark:bg-slate-950/60 p-4"
              >
                <Icon className="h-5 w-5 text-amber-700 dark:text-amber-400 mb-2" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {item.title}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onSignIn}
            className="flex-1 inline-flex items-center justify-center rounded-xl bg-amber-700 hover:bg-amber-800 text-white font-semibold text-sm px-5 py-3 min-h-[46px] transition-colors"
          >
            {copy.ctaPrimary}
          </button>
          <button
            type="button"
            onClick={onSignUp}
            className="flex-1 inline-flex items-center justify-center rounded-xl border border-stone-300 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-stone-100 dark:hover:bg-slate-800 font-semibold text-sm px-5 py-3 min-h-[46px] transition-colors"
          >
            {copy.ctaSecondary}
          </button>
        </div>

        <div className="mt-5 pt-5 border-t border-stone-200/80 dark:border-slate-800">
          {ssoError && (
            <p role="alert" className="text-xs text-red-600 dark:text-red-400 mb-3 text-center">
              {ssoError}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={Boolean(ssoBusy)}
              onClick={() => startSso("google")}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-stone-50 dark:hover:bg-slate-700 min-h-[44px] disabled:opacity-50"
            >
              {ssoBusy === "google" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="font-bold text-blue-600">G</span>
              )}
              Google
            </button>
            <button
              type="button"
              disabled={Boolean(ssoBusy)}
              onClick={() => startSso("linkedin")}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-stone-50 dark:hover:bg-slate-700 min-h-[44px] disabled:opacity-50"
            >
              {ssoBusy === "linkedin" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="font-bold text-[#0a66c2]">in</span>
              )}
              LinkedIn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
