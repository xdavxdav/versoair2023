/**
 * PaymentLogos — Real brand SVG logos for all payment methods
 * Used across billing, music vault, reservations, streamer portal, etc.
 */

interface LogoProps {
  className?: string;
  size?: number;
}

/* ═══ PayPal ═══ */
export function PayPalLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 124 33"
      width={size * 1.8}
      height={size}
      className={className}
      aria-label="PayPal"
    >
      <path
        d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802l-2.766 17.537a.57.57 0 0 0 .564.658h3.265a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.165c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.985-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM66.654 13.075h-3.275a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.03 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .562.66h2.95a.95.95 0 0 0 .939-.804l1.77-11.209a.568.568 0 0 0-.561-.656zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM84.096 13.075h-3.291a.954.954 0 0 0-.787.417l-4.539 6.686-1.924-6.425a.953.953 0 0 0-.912-.678h-3.234a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.287a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.468-.895z"
        fill="#253B80"
      />
      <path
        d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802l-2.766 17.537a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.983-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM115.434 13.075h-3.273a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.03 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.804l1.771-11.209a.571.571 0 0 0-.565-.656zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM119.295 7.23l-2.807 17.858a.569.569 0 0 0 .562.658h2.822a.949.949 0 0 0 .939-.803l2.768-17.536a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.562.482z"
        fill="#179BD7"
      />
      <path
        d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73a2.21 2.21 0 0 0-2.183 1.866l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z"
        fill="#253B80"
      />
      <path
        d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z"
        fill="#179BD7"
      />
      <path
        d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177H11.41a1.17 1.17 0 0 0-1.159.992L8.924 17.06l-.036.222c.103-.652.66-1.132 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.344 6.344 0 0 0-.977-.388 8.72 8.72 0 0 0-1.2-.516z"
        fill="#222D65"
      />
    </svg>
  );
}

/* ═══ Stripe (Visa / Mastercard / Amex) ═══ */
export function StripeLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Visa */}
      <svg
        width={size * 1.2}
        height={size * 0.8}
        viewBox="0 0 750 471"
        aria-label="Visa"
      >
        <rect width="750" height="471" rx="40" fill="#1A1F71" />
        <path
          d="M278.198 334.228l33.361-195.763h53.359l-33.384 195.763H278.198zm246.11-191.54c-10.57-3.966-27.135-8.222-47.822-8.222-52.725 0-89.863 26.551-90.18 64.604-.318 28.128 26.508 43.822 46.754 53.185 20.771 9.598 27.752 15.716 27.652 24.283-.133 13.121-16.586 19.116-31.924 19.116-21.355 0-32.701-2.966-50.225-10.274l-6.878-3.112-7.487 43.823c12.463 5.466 35.508 10.199 59.438 10.445 56.09 0 92.502-26.248 92.916-66.884.199-22.27-14.016-39.216-44.801-53.188-18.65-9.056-30.072-15.099-29.951-24.269 0-8.137 9.668-16.839 30.559-16.839 17.453-.271 30.086 3.534 39.936 7.5l4.781 2.259 7.232-42.427zm137.31-4.223h-41.232c-12.773 0-22.332 3.486-27.94 16.234l-79.244 179.402h56.031s9.159-24.121 11.232-29.418c6.123 0 60.555.084 68.336.084 1.596 6.854 6.492 29.334 6.492 29.334h49.512l-43.187-195.636zm-65.417 126.408c4.414-11.279 21.26-54.723 21.26-54.723-.316.521 4.381-11.334 7.074-18.684l3.605 16.879s10.219 46.729 12.354 56.528h-44.293zm-363.42-126.408l-52.24 133.496-5.565-27.129c-9.726-31.274-40.025-65.155-73.898-82.118l47.767 171.204 56.455-.064 84.004-195.39h-56.523z"
          fill="white"
        />
        <path
          d="M146.918 138.54H60.879l-.682 4.073c66.938 16.204 111.232 55.363 129.618 102.415l-18.71-89.96c-3.229-12.396-12.597-16.095-24.187-16.528z"
          fill="#F9A533"
        />
      </svg>
      {/* Mastercard */}
      <svg
        width={size * 0.9}
        height={size * 0.8}
        viewBox="0 0 152 100"
        aria-label="Mastercard"
      >
        <rect width="152" height="100" rx="12" fill="#252525" />
        <circle cx="60" cy="50" r="30" fill="#EB001B" />
        <circle cx="92" cy="50" r="30" fill="#F79E1B" />
        <path
          d="M76 27.5a29.9 29.9 0 0 1 0 45A29.9 29.9 0 0 1 76 27.5z"
          fill="#FF5F00"
        />
      </svg>
    </div>
  );
}

/* ═══ Bitcoin / Crypto ═══ */
export function CryptoLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-label="Bitcoin"
    >
      <circle cx="32" cy="32" r="32" fill="#F7931A" />
      <path
        d="M46.11 27.441c.636-4.258-2.606-6.547-7.039-8.074l1.438-5.768-3.512-.875-1.4 5.616c-.923-.23-1.871-.447-2.813-.662l1.41-5.653-3.509-.875-1.439 5.766c-.764-.174-1.514-.346-2.242-.527l.004-.018-4.842-1.209-.934 3.75s2.605.597 2.55.634c1.422.355 1.68 1.296 1.636 2.042l-1.638 6.571c.098.025.225.061.365.117l-.371-.093-2.296 9.205c-.174.432-.615 1.08-1.609.834.035.051-2.552-.637-2.552-.637l-1.743 4.02 4.57 1.139c.85.213 1.683.436 2.502.646l-1.453 5.835 3.507.875 1.439-5.772c.958.26 1.888.5 2.798.726l-1.434 5.745 3.511.875 1.453-5.823c5.987 1.133 10.489.676 12.384-4.739 1.527-4.36-.076-6.875-3.226-8.515 2.294-.529 4.022-2.038 4.483-5.155zm-8.022 11.249c-1.085 4.36-8.426 2.003-10.806 1.412l1.928-7.729c2.38.594 10.012 1.77 8.878 6.317zm1.086-11.312c-.99 3.966-7.1 1.951-9.082 1.457l1.748-7.01c1.982.494 8.365 1.416 7.334 5.553z"
        fill="white"
      />
    </svg>
  );
}

/* ═══ Mobile Money (Orange Money / Wave / M-Pesa) ═══ */
export function MobileMoneyLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-label="Mobile Money"
    >
      <rect width="64" height="64" rx="14" fill="#FF6600" />
      {/* Phone outline */}
      <rect x="20" y="8" width="24" height="48" rx="4" fill="white" />
      <rect x="22" y="14" width="20" height="32" rx="1" fill="#FF6600" />
      {/* Dollar sign */}
      <text
        x="32"
        y="35"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="18"
        fontWeight="bold"
        fill="white"
        fontFamily="sans-serif"
      >
        $
      </text>
      {/* Home button */}
      <circle cx="32" cy="52" r="3" fill="#FF6600" />
    </svg>
  );
}

/* ═══ Bank Transfer ═══ */
export function BankTransferLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-label="Bank Transfer"
    >
      <rect width="64" height="64" rx="14" fill="#1E3A5F" />
      {/* Roof */}
      <polygon points="32,10 8,28 56,28" fill="white" />
      {/* Pillars */}
      <rect x="14" y="30" width="6" height="20" rx="1" fill="white" />
      <rect x="26" y="30" width="6" height="20" rx="1" fill="white" />
      <rect x="38" y="30" width="6" height="20" rx="1" fill="white" />
      <rect
        x="50"
        y="30"
        width="6"
        height="20"
        rx="1"
        fill="white"
        opacity="0.5"
      />
      {/* Base */}
      <rect x="8" y="50" width="48" height="6" rx="1" fill="white" />
    </svg>
  );
}

/* ═══ Platform Wallet — VersoAir logo in credit-card shape ═══ */
export function WalletLogo({ className = "", size = 32 }: LogoProps) {
  // Scale up ~40% so the card stands out among other logos
  const s = Math.round(size * 1.4);
  // Credit-card aspect ratio ≈ 1.586 (85.6mm × 53.98mm)
  const cardW = s;
  const cardH = Math.round(s / 1.586);
  const imgSize = Math.round(cardH * 0.65);
  return (
    <div
      className={`inline-flex items-center justify-center rounded-sm bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 shadow-lg shadow-purple-500/30 ${className}`}
      style={{
        width: cardW,
        height: cardH,
        borderRadius: Math.max(2, Math.round(size * 0.06)),
      }}
    >
      <img
        src="https://i.ibb.co/8DL5vH7M/v-logo-extracted.png"
        alt="VersoAir Wallet"
        width={imgSize}
        height={imgSize}
        className="object-contain brightness-150 contrast-110 drop-shadow-[0_0_6px_rgba(168,85,247,0.7)]"
        style={{
          width: imgSize,
          height: imgSize,
          filter:
            "brightness(1.5) contrast(1.1) drop-shadow(0 0 6px rgba(168,85,247,0.7))",
        }}
        onError={(e) => {
          const el = e.currentTarget;
          el.style.display = "none";
          const fb = el.nextElementSibling;
          if (fb) (fb as HTMLElement).style.display = "flex";
        }}
      />
      {/* Fallback "V" if image fails */}
      <span
        className="hidden items-center justify-center text-purple-300 font-bold"
        style={{ fontSize: imgSize * 0.6 }}
      >
        V
      </span>
    </div>
  );
}

/* ═══ Cash App ═══ */
export function CashAppLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-label="Cash App"
    >
      <rect width="64" height="64" rx="14" fill="#00D632" />
      <text
        x="32"
        y="38"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="34"
        fontWeight="bold"
        fill="white"
        fontFamily="sans-serif"
      >
        $
      </text>
    </svg>
  );
}

/* ═══ Venmo ═══ */
export function VenmoLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-label="Venmo"
    >
      <rect width="64" height="64" rx="14" fill="#3D95CE" />
      <path
        d="M42.5 14c1.8 2.9 2.6 5.9 2.6 9.7 0 12.1-10.3 27.8-18.7 38.8H14.1L9.5 16.1l11.2-1.1 2.8 22.5c2.6-4.2 5.8-10.8 5.8-15.3 0-3.6-.6-6-1.6-8L42.5 14z"
        fill="white"
      />
    </svg>
  );
}

/* ═══ Apple Pay ═══ */
export function ApplePayLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 50"
      width={size * 2.4}
      height={size}
      className={className}
      aria-label="Apple Pay"
    >
      <rect width="120" height="50" rx="8" fill="#000" />
      {/* Apple logo */}
      <path
        d="M25.6 16.2c-.9 1.1-2.4 1.9-3.8 1.8-.2-1.5.5-3.1 1.4-4.1.9-1.1 2.5-1.8 3.7-1.9.2 1.6-.5 3.1-1.3 4.2zm1.3 2.1c-2.1-.1-3.9 1.2-4.9 1.2s-2.5-1.1-4.2-1.1c-2.1 0-4.1 1.3-5.2 3.2-2.2 3.8-.6 9.5 1.6 12.6 1.1 1.5 2.3 3.2 4 3.2 1.6-.1 2.2-1 4.1-1s2.5 1 4.2 1 2.8-1.6 3.8-3.1c1.2-1.8 1.7-3.5 1.7-3.6 0 0-3.3-1.3-3.3-5 0-3.2 2.6-4.7 2.7-4.8-1.5-2.2-3.8-2.4-4.5-2.5z"
        fill="white"
      />
      {/* "Pay" text */}
      <text
        x="55"
        y="30"
        fontSize="18"
        fontWeight="600"
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.5"
      >
        Pay
      </text>
    </svg>
  );
}

/* ═══ Google Pay ═══ */
export function GooglePayLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 120 50"
      width={size * 2.4}
      height={size}
      className={className}
      aria-label="Google Pay"
    >
      <rect
        width="120"
        height="50"
        rx="8"
        fill="#fff"
        stroke="#dadce0"
        strokeWidth="1"
      />
      {/* Google G */}
      <path
        d="M25.76 25.27c0-.79-.07-1.55-.2-2.27h-9.6v4.3h5.5a4.7 4.7 0 0 1-2.04 3.08v2.56h3.3c1.93-1.78 3.04-4.4 3.04-7.67z"
        fill="#4285F4"
      />
      <path
        d="M15.96 33.5c2.76 0 5.07-.92 6.76-2.48l-3.3-2.56c-.92.62-2.09.98-3.46.98-2.66 0-4.91-1.8-5.71-4.22H6.84v2.64a10.2 10.2 0 0 0 9.12 5.64z"
        fill="#34A853"
      />
      <path
        d="M10.25 25.22a6.13 6.13 0 0 1 0-3.94V18.64H6.84a10.2 10.2 0 0 0 0 9.22l3.41-2.64z"
        fill="#FBBC04"
      />
      <path
        d="M15.96 17.06a5.52 5.52 0 0 1 3.9 1.52l2.93-2.93a9.82 9.82 0 0 0-6.83-2.65 10.2 10.2 0 0 0-9.12 5.64l3.41 2.64c.8-2.42 3.05-4.22 5.71-4.22z"
        fill="#EA4335"
      />
      {/* "Pay" text */}
      <text
        x="38"
        y="29"
        fontSize="16"
        fontWeight="500"
        fill="#5f6368"
        fontFamily="system-ui, sans-serif"
        letterSpacing="0.3"
      >
        Pay
      </text>
    </svg>
  );
}

/* ═══ Interac (Canada) ═══ */
export function InteracLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 50"
      width={size * 2}
      height={size}
      className={className}
      aria-label="Interac"
    >
      <rect width="100" height="50" rx="8" fill="#F5A623" />
      <text
        x="50"
        y="22"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="800"
        fill="#1A1A1A"
        fontFamily="system-ui, sans-serif"
        letterSpacing="1.5"
      >
        INTERAC
      </text>
      {/* Signature arrow / flash */}
      <path
        d="M30 32 L50 28 L45 35 L70 30"
        fill="none"
        stroke="#1A1A1A"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ═══ PIX (Brazil) ═══ */
export function PixLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-label="PIX"
    >
      <rect width="64" height="64" rx="14" fill="#32BCAD" />
      {/* PIX diamond shapes */}
      <g transform="translate(32,32) rotate(45)">
        <rect x="-14" y="-14" width="12" height="12" rx="2" fill="white" />
        <rect x="2" y="-14" width="12" height="12" rx="2" fill="white" />
        <rect x="-14" y="2" width="12" height="12" rx="2" fill="white" />
        <rect
          x="2"
          y="2"
          width="12"
          height="12"
          rx="2"
          fill="white"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}

/* ═══ SEPA (EU Bank Transfer) ═══ */
export function SepaLogo({ className = "", size = 32 }: LogoProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 50"
      width={size * 2}
      height={size}
      className={className}
      aria-label="SEPA"
    >
      <rect width="100" height="50" rx="8" fill="#003399" />
      {/* EU stars circle (simplified) */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
        <circle
          key={angle}
          cx={22 + 10 * Math.cos((angle * Math.PI) / 180)}
          cy={25 + 10 * Math.sin((angle * Math.PI) / 180)}
          r="1.5"
          fill="#FFCC00"
        />
      ))}
      <text
        x="62"
        y="29"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="16"
        fontWeight="700"
        fill="white"
        fontFamily="system-ui, sans-serif"
        letterSpacing="1"
      >
        SEPA
      </text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════
// UNIVERSAL RENDERER
// ═══════════════════════════════════════════════════════════════

/**
 * Render the correct real logo for a payment method ID.
 * Use this anywhere you'd show method.icon.
 *
 * @example <PaymentLogo methodId="paypal" size={28} />
 */
export function PaymentLogo({
  methodId,
  size = 28,
  className = "",
}: {
  methodId: string;
  size?: number;
  className?: string;
}) {
  switch (methodId) {
    case "paypal":
      return <PayPalLogo size={size} className={className} />;
    case "stripe":
      return <StripeLogo size={size} className={className} />;
    case "crypto":
      return <CryptoLogo size={size} className={className} />;
    case "mobile_money":
      return <MobileMoneyLogo size={size} className={className} />;
    case "bank_transfer":
      return <BankTransferLogo size={size} className={className} />;
    case "wallet":
      return <WalletLogo size={size} className={className} />;
    case "cashapp":
      return <CashAppLogo size={size} className={className} />;
    case "venmo":
      return <VenmoLogo size={size} className={className} />;
    case "apple_pay":
      return <ApplePayLogo size={size} className={className} />;
    case "google_pay":
      return <GooglePayLogo size={size} className={className} />;
    case "interac":
      return <InteracLogo size={size} className={className} />;
    case "pix":
      return <PixLogo size={size} className={className} />;
    case "sepa":
      return <SepaLogo size={size} className={className} />;
    default:
      return <span className={`text-xl ${className}`}>💳</span>;
  }
}

export default PaymentLogo;
