/**
 * Payment Methods Configuration
 * Defines all available payment systems, countries, availability, and features
 * Supports: Wallet, PayPal, Stripe, Crypto, Mobile Money
 * Country variations: Brazil, Ivory Coast, etc.
 */

export type PaymentMethodId =
  | "wallet"
  | "paypal"
  | "stripe"
  | "crypto"
  | "mobile_money"
  | "bank_transfer"
  | "cashapp"
  | "venmo"
  | "apple_pay"
  | "google_pay"
  | "interac"
  | "pix"
  | "sepa";
export type CurrencyCode =
  | "USD"
  | "EUR"
  | "XOF"
  | "XAF"
  | "BRL"
  | "GBP"
  | "GHS"
  | "KES"
  | "NGN";
export type CryptoType = "BTC" | "USDT" | "ETH";
export type MobileMoneyProvider =
  | "orange_money"
  | "mtn_momo"
  | "wave"
  | "mpesa";

/** Currency symbols & display info */
export const CURRENCY_INFO: Record<
  CurrencyCode,
  { symbol: string; name: string; flag: string }
> = {
  USD: { symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  EUR: { symbol: "€", name: "Euro", flag: "🇪🇺" },
  XOF: { symbol: "CFA", name: "CFA Franc BCEAO (West)", flag: "🇨🇮" },
  XAF: { symbol: "FCFA", name: "CFA Franc BEAC (Central)", flag: "🇨🇲" },
  BRL: { symbol: "R$", name: "Brazilian Real", flag: "🇧🇷" },
  GBP: { symbol: "£", name: "British Pound", flag: "🇬🇧" },
  GHS: { symbol: "₵", name: "Ghanaian Cedi", flag: "🇬🇭" },
  KES: { symbol: "KSh", name: "Kenyan Shilling", flag: "🇰🇪" },
  NGN: { symbol: "₦", name: "Nigerian Naira", flag: "🇳🇬" },
};

/** Format an amount with the right currency symbol */
export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const info = CURRENCY_INFO[currency];
  if (!info) return `${amount.toFixed(2)}`;
  // CFA currencies use no decimals
  if (currency === "XOF" || currency === "XAF") {
    return `${Math.round(amount).toLocaleString()} ${info.symbol}`;
  }
  return `${info.symbol}${amount.toFixed(2)}`;
}

export interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  icon: string;
  description: string;
  available: boolean; // Is this method live?
  comingSoon: boolean;
  estimatedLaunch?: string;
  priority: number; // Lower = shown first
  minAmount: number;
  maxAmount: number;
  processingTime: string;
  fee: string; // "2%" or "Free" or "Variable"
  currencies: CurrencyCode[];
  countries: string[]; // ISO country codes
  features: string[];
  requiresKYC: boolean;
  requiresVerification: boolean;
}

export interface CountryConfig {
  code: string;
  name: string;
  currency: CurrencyCode;
  defaultPaymentMethod: PaymentMethodId;
  availableMethods: PaymentMethodId[];
  taxRate: number;
  requiresVAT: boolean;
  blockingRestrictions?: string;
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT METHODS DATABASE
// ═══════════════════════════════════════════════════════════════

export const PAYMENT_METHODS: Record<PaymentMethodId, PaymentMethod> = {
  wallet: {
    id: "wallet",
    name: "Platform Wallet",
    icon: "💰",
    description: "Pay with credits in your Verso Air wallet",
    available: true,
    comingSoon: false,
    priority: 1,
    minAmount: 0.01,
    maxAmount: 10000,
    processingTime: "Instant",
    fee: "Free",
    currencies: ["USD", "EUR", "XOF", "XAF", "BRL", "GBP", "GHS", "KES", "NGN"],
    countries: ["*"], // Available globally
    features: [
      "Instant transfers",
      "Earn credits from streaming",
      "Multi-currency support",
      "No transaction fees",
      "Mobile-friendly",
    ],
    requiresKYC: false,
    requiresVerification: false,
  },

  paypal: {
    id: "paypal",
    name: "PayPal",
    icon: "🅿️",
    description: "Safe & secure payments with PayPal",
    available: true,
    comingSoon: false,
    priority: 2,
    minAmount: 1,
    maxAmount: 25000,
    processingTime: "1-3 minutes",
    fee: "2-3% + $0.30",
    currencies: ["USD", "EUR", "GBP", "BRL"],
    countries: [
      "BR", // Brazil
      "US",
      "GB",
      "FR",
      "DE",
      "IT",
      "ES",
      "PT",
      "AU",
      "CA",
    ],
    features: [
      "Fast checkout",
      "Buyer protection",
      "Recurring billing",
      "No card needed",
      "Multi-currency",
      "+16% bonus on deposits ≥$50",
      "Available for artist payouts",
    ],
    requiresKYC: true,
    requiresVerification: true,
  },

  stripe: {
    id: "stripe",
    name: "Credit/Debit Card",
    icon: "💳",
    description: "Visa, Mastercard, Amex (Legal documents pending)",
    available: false,
    comingSoon: true,
    estimatedLaunch: "Q2 2026",
    priority: 3,
    minAmount: 0.5,
    maxAmount: 50000,
    processingTime: "Instant",
    fee: "2.9% + $0.30",
    currencies: ["USD", "EUR", "GBP", "BRL"],
    countries: [
      "BR", // Brazil - Will have special integration
      "*",
    ], // Eventually global
    features: [
      "Instant settlement",
      "3D Secure",
      "Subscription billing",
      "Verso Air Card (with points)",
      "135+ currencies",
      "Virtual cards for subscriptions",
    ],
    requiresKYC: true,
    requiresVerification: true,
  },

  crypto: {
    id: "crypto",
    name: "Cryptocurrency",
    icon: "₿",
    description: "Pay with Bitcoin, USDT, or Ethereum",
    available: false,
    comingSoon: true,
    estimatedLaunch: "Q2 2026",
    priority: 5,
    minAmount: 10,
    maxAmount: 100000,
    processingTime: "10-30 minutes (block confirmation)",
    fee: "Network fee (0.5-2%)",
    currencies: ["USD", "EUR", "BTC", "USDT", "ETH"],
    countries: ["*"], // Global, no restrictions
    features: [
      "Decentralized",
      "No intermediary",
      "BTC, USDT, ETH",
      "Fast international",
      "Cold storage safe",
      "Lower fees",
    ],
    requiresKYC: false, // Crypto is pseudonymous
    requiresVerification: true, // But still identity check
  },

  mobile_money: {
    id: "mobile_money",
    name: "Mobile Money",
    icon: "📱",
    description: "Orange Money, MTN MoMo, Wave, M-Pesa",
    available: false,
    comingSoon: true,
    estimatedLaunch: "Q3 2026",
    priority: 2, // High priority for African markets
    minAmount: 1,
    maxAmount: 5000,
    processingTime: "30 seconds - 2 minutes",
    fee: "1-3%",
    currencies: ["XOF", "XAF", "GHS", "KES", "NGN"],
    countries: [
      "CI", // Ivory Coast - Orange Money, Wave
      "SN",
      "ML",
      "BJ", // Benin - Orange Money
      "CM", // Cameroon - Orange Money
      "UG", // Uganda - MTN, Airtel
      "KE", // Kenya - M-Pesa
      "TZ", // Tanzania - M-Pesa
      "NG", // Nigeria - MTN, Airtel
      "GH", // Ghana
    ],
    features: [
      "No bank account needed",
      "Instant confirmation",
      "USSD dial-in option",
      "Works on basic phones",
      "Local currency support",
      "Lowest fees in Africa",
    ],
    requiresKYC: true,
    requiresVerification: true,
  },

  bank_transfer: {
    id: "bank_transfer",
    name: "Bank Transfer",
    icon: "🏦",
    description: "Direct bank account or wire transfer",
    available: true,
    comingSoon: false,
    priority: 4,
    minAmount: 25,
    maxAmount: 100000,
    processingTime: "1-3 business days",
    fee: "Bank fee (varies)",
    currencies: ["USD", "EUR", "XOF", "XAF", "BRL", "GBP"],
    countries: ["*"], // Global
    features: [
      "Highest trust",
      "Large amounts",
      "International wires",
      "Invoice generation",
      "Admin review",
      "Perfect for enterprise",
    ],
    requiresKYC: true,
    requiresVerification: true,
  },

  cashapp: {
    id: "cashapp",
    name: "Cash App",
    icon: "$",
    description: "Send money instantly with Cash App",
    available: true,
    comingSoon: false,
    priority: 3,
    minAmount: 1,
    maxAmount: 7500,
    processingTime: "Instant",
    fee: "Free (personal) / 2.75% (card)",
    currencies: ["USD", "GBP"],
    countries: ["US", "GB"],
    features: [
      "Instant transfers",
      "Cash App Card",
      "Bitcoin support",
      "Boost rewards",
      "Direct deposit",
      "No fees for personal",
    ],
    requiresKYC: true,
    requiresVerification: true,
  },

  venmo: {
    id: "venmo",
    name: "Venmo",
    icon: "V",
    description: "Pay and get paid with Venmo",
    available: true,
    comingSoon: false,
    priority: 4,
    minAmount: 1,
    maxAmount: 5000,
    processingTime: "Instant",
    fee: "Free (bank) / 3% (card)",
    currencies: ["USD"],
    countries: ["US"],
    features: [
      "Social payments",
      "Venmo debit card",
      "Instant transfer option",
      "Purchase protection",
      "Split bills easily",
      "QR code pay",
    ],
    requiresKYC: true,
    requiresVerification: true,
  },

  apple_pay: {
    id: "apple_pay",
    name: "Apple Pay",
    icon: "",
    description: "Fast, secure payment with Face ID or Touch ID",
    available: true,
    comingSoon: false,
    priority: 2,
    minAmount: 0.5,
    maxAmount: 50000,
    processingTime: "Instant",
    fee: "Free",
    currencies: ["USD", "EUR", "GBP", "BRL"],
    countries: ["US", "GB", "FR", "DE", "CA", "AU", "BR"],
    features: [
      "Face ID / Touch ID",
      "No card number shared",
      "Works in apps & web",
      "Express checkout",
      "Tokenized security",
      "Works with all cards",
    ],
    requiresKYC: false,
    requiresVerification: false,
  },

  google_pay: {
    id: "google_pay",
    name: "Google Pay",
    icon: "G",
    description: "Fast checkout with your Google account",
    available: true,
    comingSoon: false,
    priority: 2,
    minAmount: 0.5,
    maxAmount: 50000,
    processingTime: "Instant",
    fee: "Free",
    currencies: ["USD", "EUR", "GBP", "BRL", "NGN", "KES", "GHS"],
    countries: ["US", "GB", "FR", "DE", "NG", "KE", "GH", "BR"],
    features: [
      "One-tap checkout",
      "Biometric auth",
      "Loyalty cards",
      "Transit payments",
      "Bank-level security",
      "Works on Android & web",
    ],
    requiresKYC: false,
    requiresVerification: false,
  },

  interac: {
    id: "interac",
    name: "Interac e-Transfer",
    icon: "🍁",
    description: "Canada's trusted online payment network",
    available: true,
    comingSoon: false,
    priority: 2,
    minAmount: 1,
    maxAmount: 25000,
    processingTime: "Minutes to 30 min",
    fee: "Free (most banks)",
    currencies: ["USD"],
    countries: ["CA"],
    features: [
      "Bank-to-bank transfer",
      "Auto-deposit option",
      "Request money",
      "Used by 17M+ Canadians",
      "No card needed",
      "Instant with auto-deposit",
    ],
    requiresKYC: true,
    requiresVerification: true,
  },

  pix: {
    id: "pix",
    name: "PIX",
    icon: "⚡",
    description: "Brazil's instant payment system by Banco Central",
    available: true,
    comingSoon: false,
    priority: 1,
    minAmount: 0.01,
    maxAmount: 50000,
    processingTime: "Instant (24/7)",
    fee: "Free (personal)",
    currencies: ["BRL"],
    countries: ["BR"],
    features: [
      "Instant 24/7/365",
      "QR code payments",
      "CPF/CNPJ key",
      "Central Bank backed",
      "Zero fees for individuals",
      "150M+ users in Brazil",
    ],
    requiresKYC: true,
    requiresVerification: true,
  },

  sepa: {
    id: "sepa",
    name: "SEPA Transfer",
    icon: "🇪🇺",
    description: "European bank transfer (Single Euro Payments Area)",
    available: true,
    comingSoon: false,
    priority: 3,
    minAmount: 1,
    maxAmount: 100000,
    processingTime: "1 business day",
    fee: "Free – €0.20",
    currencies: ["EUR"],
    countries: ["FR", "DE", "GB", "IT", "ES", "PT", "NL", "BE"],
    features: [
      "36 European countries",
      "IBAN-based transfers",
      "Low/no fees",
      "Recurring payments",
      "Direct debit option",
      "Regulated by EU",
    ],
    requiresKYC: true,
    requiresVerification: true,
  },
};

// ═══════════════════════════════════════════════════════════════
// COUNTRY CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

export const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  // ── AMERICAS ──
  US: {
    code: "US",
    name: "United States 🇺🇸",
    currency: "USD",
    defaultPaymentMethod: "cashapp",
    availableMethods: [
      "wallet",
      "paypal",
      "cashapp",
      "venmo",
      "apple_pay",
      "google_pay",
      "stripe",
      "crypto",
      "bank_transfer",
    ],
    taxRate: 0.0,
    requiresVAT: false,
  },
  CA: {
    code: "CA",
    name: "Canada 🇨🇦",
    currency: "USD",
    defaultPaymentMethod: "interac",
    availableMethods: [
      "wallet",
      "paypal",
      "interac",
      "apple_pay",
      "google_pay",
      "stripe",
      "bank_transfer",
    ],
    taxRate: 0.05,
    requiresVAT: true,
  },
  BR: {
    code: "BR",
    name: "Brazil 🇧🇷",
    currency: "BRL",
    defaultPaymentMethod: "pix",
    availableMethods: [
      "wallet",
      "pix",
      "paypal",
      "apple_pay",
      "google_pay",
      "stripe",
      "bank_transfer",
    ],
    taxRate: 0.15,
    requiresVAT: false,
  },

  // ── EUROPE ──
  GB: {
    code: "GB",
    name: "United Kingdom 🇬🇧",
    currency: "GBP",
    defaultPaymentMethod: "apple_pay",
    availableMethods: [
      "wallet",
      "paypal",
      "apple_pay",
      "google_pay",
      "cashapp",
      "stripe",
      "sepa",
      "bank_transfer",
    ],
    taxRate: 0.2,
    requiresVAT: true,
  },
  FR: {
    code: "FR",
    name: "France 🇫🇷",
    currency: "EUR",
    defaultPaymentMethod: "apple_pay",
    availableMethods: [
      "wallet",
      "paypal",
      "apple_pay",
      "google_pay",
      "sepa",
      "stripe",
      "bank_transfer",
    ],
    taxRate: 0.2,
    requiresVAT: true,
  },
  DE: {
    code: "DE",
    name: "Germany 🇩🇪",
    currency: "EUR",
    defaultPaymentMethod: "sepa",
    availableMethods: [
      "wallet",
      "paypal",
      "sepa",
      "apple_pay",
      "google_pay",
      "stripe",
      "bank_transfer",
    ],
    taxRate: 0.19,
    requiresVAT: true,
  },

  // ── WEST AFRICA (XOF) ──
  CI: {
    code: "CI",
    name: "Ivory Coast 🇨🇮",
    currency: "XOF",
    defaultPaymentMethod: "mobile_money",
    availableMethods: [
      "wallet",
      "mobile_money",
      "paypal",
      "google_pay",
      "crypto",
      "bank_transfer",
    ],
    taxRate: 0.18,
    requiresVAT: true,
  },
  SN: {
    code: "SN",
    name: "Senegal 🇸🇳",
    currency: "XOF",
    defaultPaymentMethod: "mobile_money",
    availableMethods: [
      "wallet",
      "mobile_money",
      "paypal",
      "google_pay",
      "crypto",
      "bank_transfer",
    ],
    taxRate: 0.18,
    requiresVAT: true,
  },
  ML: {
    code: "ML",
    name: "Mali 🇲🇱",
    currency: "XOF",
    defaultPaymentMethod: "mobile_money",
    availableMethods: [
      "wallet",
      "mobile_money",
      "paypal",
      "google_pay",
      "crypto",
      "bank_transfer",
    ],
    taxRate: 0.18,
    requiresVAT: true,
  },
  BJ: {
    code: "BJ",
    name: "Benin 🇧🇯",
    currency: "XOF",
    defaultPaymentMethod: "mobile_money",
    availableMethods: [
      "wallet",
      "mobile_money",
      "paypal",
      "google_pay",
      "crypto",
      "bank_transfer",
    ],
    taxRate: 0.18,
    requiresVAT: true,
  },

  // ── CENTRAL AFRICA (XAF) ──
  CM: {
    code: "CM",
    name: "Cameroon 🇨🇲",
    currency: "XAF",
    defaultPaymentMethod: "mobile_money",
    availableMethods: [
      "wallet",
      "mobile_money",
      "paypal",
      "google_pay",
      "crypto",
      "bank_transfer",
    ],
    taxRate: 0.1925,
    requiresVAT: true,
  },
  GA: {
    code: "GA",
    name: "Gabon 🇬🇦",
    currency: "XAF",
    defaultPaymentMethod: "mobile_money",
    availableMethods: [
      "wallet",
      "mobile_money",
      "paypal",
      "google_pay",
      "crypto",
      "bank_transfer",
    ],
    taxRate: 0.18,
    requiresVAT: true,
  },
  TD: {
    code: "TD",
    name: "Chad 🇹🇩",
    currency: "XAF",
    defaultPaymentMethod: "mobile_money",
    availableMethods: [
      "wallet",
      "mobile_money",
      "paypal",
      "google_pay",
      "crypto",
      "bank_transfer",
    ],
    taxRate: 0.18,
    requiresVAT: true,
  },
  CG: {
    code: "CG",
    name: "Congo 🇨🇬",
    currency: "XAF",
    defaultPaymentMethod: "mobile_money",
    availableMethods: [
      "wallet",
      "mobile_money",
      "paypal",
      "google_pay",
      "crypto",
      "bank_transfer",
    ],
    taxRate: 0.18,
    requiresVAT: true,
  },

  // ── EAST / WEST AFRICA (other) ──
  KE: {
    code: "KE",
    name: "Kenya 🇰🇪",
    currency: "KES",
    defaultPaymentMethod: "mobile_money",
    availableMethods: [
      "wallet",
      "mobile_money",
      "paypal",
      "google_pay",
      "crypto",
      "stripe",
      "bank_transfer",
    ],
    taxRate: 0.16,
    requiresVAT: true,
  },
  NG: {
    code: "NG",
    name: "Nigeria 🇳🇬",
    currency: "NGN",
    defaultPaymentMethod: "mobile_money",
    availableMethods: [
      "wallet",
      "mobile_money",
      "paypal",
      "google_pay",
      "crypto",
      "stripe",
      "bank_transfer",
    ],
    taxRate: 0.075,
    requiresVAT: true,
  },
};

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get payment methods available for a specific country
 */
export function getAvailablePaymentMethods(
  countryCode: string,
): PaymentMethod[] {
  const countryConfig = COUNTRY_CONFIGS[countryCode];
  if (!countryConfig) {
    // Fallback to global methods
    return Object.values(PAYMENT_METHODS).filter(
      (m) => m.countries.includes("*") && (m.available || m.comingSoon),
    );
  }

  return countryConfig.availableMethods
    .map((id) => PAYMENT_METHODS[id])
    .filter((m) => m !== undefined)
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get recommended payment method for a country
 */
export function getDefaultPaymentMethod(
  countryCode: string,
): PaymentMethod | null {
  const countryConfig = COUNTRY_CONFIGS[countryCode];
  if (!countryConfig) return null;
  return PAYMENT_METHODS[countryConfig.defaultPaymentMethod] || null;
}

/**
 * Check if a payment method is available in a country
 */
export function isPaymentMethodAvailable(
  methodId: PaymentMethodId,
  countryCode: string,
): boolean {
  const method = PAYMENT_METHODS[methodId];
  if (!method) return false;
  if (!method.available) return false;

  const countryConfig = COUNTRY_CONFIGS[countryCode];
  if (!countryConfig) {
    // Check global availability
    return method.countries.includes("*");
  }

  return countryConfig.availableMethods.includes(methodId);
}

/**
 * Get payment methods sorted by availability & priority
 */
export function getSortedPaymentMethods(countryCode: string): PaymentMethod[] {
  const available = getAvailablePaymentMethods(countryCode)
    .filter((m) => m.available)
    .sort((a, b) => a.priority - b.priority);

  const comingSoon = Object.values(PAYMENT_METHODS)
    .filter((m) => m.comingSoon && !available.includes(m))
    .sort((a, b) => a.priority - b.priority);

  return [...available, ...comingSoon];
}

/**
 * Format amount to payment method requirements
 */
export function formatAmountForPayment(
  amount: number,
  methodId: PaymentMethodId,
): string {
  const method = PAYMENT_METHODS[methodId];
  if (!method) return amount.toFixed(2);

  if (amount < method.minAmount) {
    return `Minimum ${method.minAmount} required`;
  }
  if (amount > method.maxAmount) {
    return `Maximum ${method.maxAmount} allowed`;
  }

  return amount.toFixed(2);
}

/**
 * Calculate fee for payment method
 */
export function calculatePaymentFee(
  amount: number,
  methodId: PaymentMethodId,
): number {
  if (methodId === "wallet") return 0; // No fees for wallet
  if (methodId === "paypal") return amount * 0.029 + 0.3; // 2.9% + $0.30
  if (methodId === "stripe") return amount * 0.029 + 0.3; // 2.9% + $0.30
  if (methodId === "mobile_money") return amount * 0.02; // 2%
  if (methodId === "bank_transfer") return 0; // Bank handles fees
  if (methodId === "crypto") return amount * 0.01; // ~1% network fee estimate
  return 0;
}

/**
 * Get localized payment method name & description
 */
export function getPaymentMethodLabel(
  methodId: PaymentMethodId,
  language: string = "en",
): { name: string; description: string } {
  const method = PAYMENT_METHODS[methodId];
  if (!method)
    return { name: "Unknown", description: "Unknown payment method" };

  // Translation would go here - for now return English
  return {
    name: method.name,
    description: method.description,
  };
}
