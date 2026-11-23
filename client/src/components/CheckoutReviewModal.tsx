/**
 * CheckoutReviewModal — Pre-checkout trust, purpose clarity, and verified
 * billing identity collection before redirecting to Stripe Checkout.
 *
 * Ensures every buyer sees:
 *  - Who they are paying (VERSO AIR INC.)
 *  - Exactly what the payment covers and what unlocks immediately
 *  - Total in CAD, billing frequency, and official itemized receipt guarantee
 *  - Required billing details: full legal name, phone number, full billing address
 *  - PCI-DSS Level 1 Stripe security reassurance (Verso Air never stores raw cards)
 *  - Direct Terms, Privacy, and Support links + explicit consent checkbox
 */
import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  BILLING_COUNTRIES,
  MERCHANT_LEGAL_NAME,
  billingDetailsSchema,
  type BillingDetailsInput,
} from "@shared/billing-details";
import { authenticatedFetch } from "@/lib/auth";
import { useAuthContext } from "@/contexts/AuthContext";
import { useLanguage } from "@/components/LanguageSwitcher";
import { useScrollLock } from "@/hooks/use-scroll-lock";

export interface CheckoutSummaryItem {
  label: string;
  detail?: string;
  amountCents?: number;
}

export interface CheckoutReviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  purpose: string;
  deliverable: string;
  totalCents: number;
  billingFrequencyLabel: string;
  items?: CheckoutSummaryItem[];
  busy?: boolean;
  serverError?: string | null;
  onConfirm: (billingDetails: BillingDetailsInput) => Promise<void> | void;
}

const formatCad = (cents: number) => `CA$${(cents / 100).toFixed(2)}`;

export default function CheckoutReviewModal({
  open,
  onClose,
  title,
  purpose,
  deliverable,
  totalCents,
  billingFrequencyLabel,
  items,
  busy = false,
  serverError = null,
  onConfirm,
}: CheckoutReviewModalProps) {
  useScrollLock(open);
  const { user } = useAuthContext();
  const { currentLang } = useLanguage();
  const isFr = currentLang === "fr";
  const isEs = currentLang === "es";
  const tr = (en: string, fr: string, es: string) =>
    isFr ? fr : isEs ? es : en;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("CA");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValidationError(null);
    setAcceptedTerms(false);
    let cancelled = false;
    setLoadingProfile(true);
    authenticatedFetch("/api/v1/payments/billing-profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const p = json?.data;
        if (p) {
          setFullName(p.fullName || user?.displayName || user?.name || "");
          setPhone(p.phone || "");
          setAddressLine1(p.addressLine1 || "");
          setAddressLine2(p.addressLine2 || "");
          setCity(p.city || "");
          setRegion(p.region || "");
          setPostalCode(p.postalCode || "");
          setCountry(p.country || "CA");
        } else {
          setFullName((prev) => prev || user?.displayName || user?.name || "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFullName((prev) => prev || user?.displayName || user?.name || "");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, user?.displayName, user?.name]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    const parsed = billingDetailsSchema.safeParse({
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      region,
      postalCode,
      country,
      acceptedTerms,
    });
    if (!parsed.success) {
      setValidationError(
        parsed.error.issues[0]?.message ||
          tr(
            "Please complete all required billing fields.",
            "Veuillez remplir tous les champs de facturation requis.",
            "Completa todos los campos de facturación obligatorios.",
          ),
      );
      return;
    }
    await onConfirm(parsed.data);
  };

  const displayError = validationError || serverError;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-review-title"
      data-testid="checkout-review-modal"
    >
      <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-stone-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl">
        {/* Top Merchant Trust Header */}
        <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-stone-200 dark:border-slate-800 px-5 sm:px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 mb-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="notranslate" translate="no">
                {MERCHANT_LEGAL_NAME}
              </span>
              <span>·</span>
              <span>{tr("Verified Secure Checkout", "Paiement sécurisé vérifié", "Pago seguro verificado")}</span>
            </div>
            <h2
              id="checkout-review-title"
              className="text-lg sm:text-xl font-extrabold tracking-tight"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label={tr("Close", "Fermer", "Cerrar")}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-stone-100 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Purpose & Itemized Order Transparency Card */}
          <div className="rounded-2xl border border-amber-200/90 dark:border-amber-900/60 bg-[#faf7f2] dark:bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  {tr("Where your payment goes", "À quoi sert ce paiement", "Destino de tu pago")}
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">
                  {purpose}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {deliverable}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums notranslate" translate="no">
                  {formatCad(totalCents)}
                </p>
                <p className="text-[11px] font-medium text-slate-500">
                  {billingFrequencyLabel}
                </p>
              </div>
            </div>

            {items && items.length > 0 && (
              <ul className="pt-2 border-t border-amber-200/70 dark:border-slate-800 space-y-1 text-xs">
                {items.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between gap-2 text-slate-700 dark:text-slate-300">
                    <span className="truncate">
                      {item.label}
                      {item.detail ? ` · ${item.detail}` : ""}
                    </span>
                    {typeof item.amountCents === "number" && (
                      <span className="font-semibold tabular-nums shrink-0 notranslate" translate="no">
                        {formatCad(item.amountCents)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="pt-2 border-t border-amber-200/70 dark:border-slate-800 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-amber-700" />
                {tr("Official PDF invoice & receipt emailed", "Facture et reçu PDF officiels par courriel", "Factura y recibo PDF oficial por correo")}
              </span>
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                {tr("Payee: VERSO AIR INC.", "Bénéficiaire : VERSO AIR INC.", "Beneficiario: VERSO AIR INC.")}
              </span>
            </div>
          </div>

          {/* Required Customer Billing Identity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {tr(
                  "Billing & Receipt Details (Required)",
                  "Coordonnées de facturation et reçu (Obligatoire)",
                  "Datos de facturación y recibo (Obligatorio)",
                )}
              </h3>
              {loadingProfile && <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700" />}
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tr("Full Legal Name *", "Nom légal complet *", "Nombre legal completo *")}
                </span>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm min-h-[42px]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tr("Phone Number *", "Numéro de téléphone *", "Teléfono *")}
                </span>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (416) 555-0199"
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm min-h-[42px]"
                />
              </label>
            </div>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tr("Street Address *", "Adresse civique *", "Dirección *")}
              </span>
              <input
                type="text"
                required
                autoComplete="address-line1"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="123 Main Street"
                className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm min-h-[42px]"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tr("Apt, Suite, Unit (Optional)", "Appartement / Bureau (Optionnel)", "Depto / Oficina (Opcional)")}
              </span>
              <input
                type="text"
                autoComplete="address-line2"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Suite 400"
                className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm min-h-[42px]"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tr("City *", "Ville *", "Ciudad *")}
                </span>
                <input
                  type="text"
                  required
                  autoComplete="address-level2"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Toronto"
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm min-h-[42px]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tr("Province / State *", "Province / État *", "Provincia / Estado *")}
                </span>
                <input
                  type="text"
                  required
                  autoComplete="address-level1"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Ontario"
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm min-h-[42px]"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tr("Postal / ZIP Code *", "Code postal *", "Código postal *")}
                </span>
                <input
                  type="text"
                  required
                  autoComplete="postal-code"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="M5V 2T6"
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm min-h-[42px]"
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {tr("Country *", "Pays *", "País *")}
                </span>
                <select
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-xl border border-stone-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm min-h-[42px]"
                >
                  {BILLING_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Security & Privacy Reassurance */}
          <div className="rounded-2xl border border-stone-200 dark:border-slate-800 bg-stone-50 dark:bg-slate-950/60 p-3.5 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
            <p className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400" />
              {tr(
                "Bank-grade Stripe encryption (PCI-DSS Level 1)",
                "Chiffrement bancaire Stripe (PCI-DSS Niveau 1)",
                "Cifrado bancario de Stripe (PCI-DSS Nivel 1)",
              )}
            </p>
            <p className="leading-relaxed">
              {tr(
                "Card details are entered directly on Stripe's hosted checkout page. VERSO AIR INC. never sees or stores your card number. Need help before paying? Visit ",
                "Votre carte est saisie directement sur la page sécurisée Stripe. VERSO AIR INC. ne voit ni ne stocke jamais votre numéro de carte. Besoin d'aide ? ",
                "Tu tarjeta se ingresa directamente en el checkout cifrado de Stripe. VERSO AIR INC. nunca ve ni guarda tu número de tarjeta. ¿Dudas? ",
              )}
              <Link href="/sav" className="text-amber-800 dark:text-amber-300 font-semibold underline">
                {tr("24/7 Support", "Support 24/7", "Soporte 24/7")}
              </Link>
              .
            </p>
          </div>

          {/* Explicit Consent */}
          <label className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-amber-700 shrink-0"
            />
            <span className="leading-relaxed">
              {tr(
                "I confirm my billing details and authorize this payment to VERSO AIR INC. for the stated purpose, under the ",
                "Je confirme mes coordonnées et j'autorise ce paiement à VERSO AIR INC. selon les ",
                "Confirmo mis datos y autorizo este pago a VERSO AIR INC. según los ",
              )}
              <Link href="/terms" target="_blank" className="underline font-semibold text-amber-800 dark:text-amber-300">
                {tr("Terms of Service", "Conditions d'utilisation", "Términos de servicio")}
              </Link>{" "}
              {tr("and", "et la", "y la")}{" "}
              <Link href="/privacy" target="_blank" className="underline font-semibold text-amber-800 dark:text-amber-300">
                {tr("Privacy Policy", "Politique de confidentialité", "Política de privacidad")}
              </Link>
              .
            </span>
          </label>

          {displayError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-xl border border-stone-300 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-stone-100 dark:hover:bg-slate-800 min-h-[44px]"
            >
              {tr("Cancel", "Annuler", "Cancelar")}
            </button>
            <button
              type="submit"
              disabled={busy || !acceptedTerms}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-5 py-2.5 text-sm font-bold min-h-[44px] disabled:opacity-50 transition-colors"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {tr(
                `Continue to Stripe (${formatCad(totalCents)})`,
                `Continuer vers Stripe (${formatCad(totalCents)})`,
                `Continuar a Stripe (${formatCad(totalCents)})`,
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
