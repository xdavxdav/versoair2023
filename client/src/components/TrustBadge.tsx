/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VERSO AIR — TRUST BADGE EMBED COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Verified badge for businesses + embeddable widget code snippet.
 * Shows verification status, tier, rating, and escrow guarantee.
 */

import { Shield, Star, CheckCircle, Award, ExternalLink } from "lucide-react";

interface TrustBadgeProps {
  businessId: number;
  businessName: string;
  isVerified: boolean;
  tier: "free" | "premium" | "enterprise";
  rating: number;
  reviewCount: number;
  escrowEnabled?: boolean;
  compact?: boolean;
}

export function TrustBadge({
  businessId,
  businessName,
  isVerified,
  tier,
  rating,
  reviewCount,
  escrowEnabled = false,
  compact = false,
}: TrustBadgeProps) {
  const tierConfig = {
    free: {
      label: "Répertorié",
      color: "text-slate-500",
      bg: "bg-slate-100",
      border: "border-slate-200",
    },
    premium: {
      label: "Premium",
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-emerald-200",
    },
    enterprise: {
      label: "Enterprise",
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-amber-200",
    },
  };

  const config = tierConfig[tier] || tierConfig.free;

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full border bg-white/90 backdrop-blur-sm shadow-sm text-xs font-medium">
        {isVerified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
        <span className={config.color}>{config.label}</span>
        {rating > 0 && (
          <>
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-slate-600">{rating.toFixed(1)}</span>
          </>
        )}
        {escrowEnabled && <Shield className="w-3.5 h-3.5 text-blue-500" />}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border ${config.border} ${config.bg} p-4 shadow-sm`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          {isVerified ? (
            <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle className="w-6 h-6 text-white" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-slate-300 flex items-center justify-center">
              <Shield className="w-6 h-6 text-slate-500" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm text-slate-900 truncate">
              {businessName}
            </h4>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${config.bg} ${config.color} border ${config.border}`}
            >
              {config.label}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-600">
            {isVerified && (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle className="w-3 h-3" />
                Vérifié par Verso Air
              </span>
            )}
            {rating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {rating.toFixed(1)} ({reviewCount} avis)
              </span>
            )}
          </div>

          {escrowEnabled && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg w-fit">
              <Shield className="w-3.5 h-3.5" />
              Paiement sécurisé par Escrow
            </div>
          )}
        </div>

        <a
          href={`/businesses/${businessId}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Voir ${businessName}`}
          className="flex-shrink-0 p-2 hover:bg-white/50 rounded-lg transition-colors"
        >
          <ExternalLink className="w-4 h-4 text-slate-400" />
        </a>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200/50">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <Award className="w-3 h-3" />
          Certifié sur verso-air.com
        </div>
      </div>
    </div>
  );
}

/**
 * Generates an embeddable HTML snippet for business owners to put on their websites.
 */
export function generateEmbedCode(
  businessId: number,
  theme: "light" | "dark" = "light",
): string {
  const baseUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://verso-air.com";
  return `<!-- Verso Air Trust Badge -->
<div id="verso-badge-${businessId}"></div>
<script>
(function(){var d=document,s=d.createElement('script');
s.src='${baseUrl}/embed/trust-badge.js?id=${businessId}&theme=${theme}';
s.async=true;d.body.appendChild(s);})();
</script>`;
}

export default TrustBadge;
