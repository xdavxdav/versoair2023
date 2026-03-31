/**
 * PayPal Deposit & Authorization Portal
 * ──────────────────────────────────────
 * Automated flow:
 *   1. User selects deposit amount (or enters custom)
 *   2. Platform calls /api/paypal/create-order
 *   3. User is redirected to PayPal for authorization
 *   4. On return, /api/paypal/capture-order completes the deposit
 *   5. User sees confirmation + updated balance
 */
import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authenticatedFetch } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Wallet,
  Shield,
  CheckCircle2,
  Loader2,
  Zap,
  Gift,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Clock,
  TrendingUp,
  DollarSign,
} from "lucide-react";
import { PayPalLogo, WalletLogo } from "@/components/PaymentLogos";

/* ── Preset deposit amounts ── */
const PRESETS = [
  { amount: 10, label: "$10", bonus: "+10%", credits: 11, popular: false },
  { amount: 25, label: "$25", bonus: "+12%", credits: 28, popular: false },
  { amount: 50, label: "$50", bonus: "+16%", credits: 58, popular: true },
  { amount: 100, label: "$100", bonus: "+16%", credits: 116, popular: false },
  { amount: 250, label: "$250", bonus: "+16%", credits: 290, popular: false },
  { amount: 500, label: "$500", bonus: "+16%", credits: 580, popular: false },
];

type Step = "select" | "processing" | "redirecting" | "success" | "error";

export default function PayPalPortal() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("select");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [depositResult, setDepositResult] = useState<any>(null);

  /* ── Fetch PayPal config (is it configured?) ── */
  const { data: ppConfig, isLoading: configLoading } = useQuery({
    queryKey: ["/api/paypal/config"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/paypal/config");
      if (!res.ok) throw new Error("PayPal not configured");
      return res.json();
    },
    retry: false,
  });

  /* ── Fetch wallet balance ── */
  const { data: walletData } = useQuery({
    queryKey: ["/api/wallet/balance"],
    queryFn: async () => {
      const res = await authenticatedFetch("/api/wallet/balance");
      if (!res.ok) return { balance: 0 };
      return res.json();
    },
    retry: false,
  });

  const balance = parseFloat(
    walletData?.balance || walletData?.data?.balance || "0",
  );

  /* ── Handle PayPal return params ── */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paypalResult = params.get("paypal");
    const orderId = params.get("token");

    if (paypalResult === "success") {
      setStep("success");
      setDepositResult({ message: "Deposit completed successfully!" });
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balance"] });
      // Clean URL
      window.history.replaceState({}, "", "/account/paypal");
    } else if (paypalResult === "cancelled") {
      setStep("select");
      setErrorMsg("PayPal authorization was cancelled. You can try again.");
      window.history.replaceState({}, "", "/account/paypal");
    } else if (paypalResult === "error") {
      setStep("error");
      setErrorMsg(
        "Something went wrong with the PayPal payment. Please try again.",
      );
      window.history.replaceState({}, "", "/account/paypal");
    }
  }, []);

  /* ── Create PayPal order mutation ── */
  const createOrder = useMutation({
    mutationFn: async (amount: number) => {
      const res = await authenticatedFetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          purpose: "wallet_deposit",
          returnUrl: `${window.location.origin}/account/paypal?paypal=success`,
          cancelUrl: `${window.location.origin}/account/paypal?paypal=cancelled`,
        }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: "PayPal order failed" }));
        throw new Error(err.error || "Failed to create PayPal order");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.approvalUrl) {
        setStep("redirecting");
        // Auto-redirect to PayPal in 1.5s for visual feedback
        setTimeout(() => {
          window.location.href = data.approvalUrl;
        }, 1500);
      } else {
        setStep("error");
        setErrorMsg("No PayPal approval URL received. Please try again.");
      }
    },
    onError: (err: Error) => {
      setStep("error");
      setErrorMsg(err.message);
    },
  });

  const effectiveAmount = useCustom
    ? parseFloat(customAmount) || 0
    : selectedAmount || 0;

  const bonusPercent =
    effectiveAmount >= 50
      ? 16
      : effectiveAmount >= 25
        ? 12
        : effectiveAmount >= 10
          ? 10
          : 0;
  const creditAmount =
    Math.round(effectiveAmount * (1 + bonusPercent / 100) * 100) / 100;

  const ppReady = !!ppConfig?.configured;

  const handleDeposit = useCallback(() => {
    if (effectiveAmount < 5) {
      setErrorMsg("Minimum deposit is $5.00");
      return;
    }
    if (effectiveAmount > 1000) {
      setErrorMsg("Maximum deposit is $1,000.00");
      return;
    }
    setErrorMsg("");
    setStep("processing");
    createOrder.mutate(effectiveAmount);
  }, [effectiveAmount, createOrder, ppConfig]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* ═══ HEADER ═══ */}
        <div className="flex items-center gap-4">
          <Link href="/account/billing">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <PayPalLogo size={30} /> PayPal Deposit Portal
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Authorize a deposit — funds credited instantly to your Verso Air
              wallet
            </p>
          </div>
        </div>

        {/* ═══ WALLET BALANCE BAR ═══ */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between p-4 rounded-xl border border-purple-500/20 bg-purple-950/20"
        >
          <div className="flex items-center gap-3">
            <WalletLogo size={36} />
            <div>
              <p className="text-xs text-gray-400">Current Balance</p>
              <p className="text-xl font-bold text-white">
                ${balance.toFixed(2)}{" "}
                <span className="text-xs text-gray-500">USD</span>
              </p>
            </div>
          </div>
          <Badge className="bg-green-900/30 text-green-400 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
          </Badge>
        </motion.div>

        {/* ═══ PAYPAL CONFIG STATUS ═══ */}
        {configLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-400" />
          </div>
        ) : (
          <>
            {!ppConfig?.configured && (
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 flex items-center gap-2 text-sm text-amber-300">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                PayPal sandbox credentials not detected — deposits will connect
                once credentials are configured.
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* ── STEP: SELECT AMOUNT ── */}
              {step === "select" && (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-5"
                >
                  {/* Error banner */}
                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 flex items-center gap-2 text-sm text-red-300">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      {errorMsg}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-red-400"
                        onClick={() => setErrorMsg("")}
                      >
                        ✕
                      </Button>
                    </div>
                  )}

                  {/* Bonus tiers banner */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-950/30 to-transparent border border-amber-500/20">
                    <Gift className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <p className="text-xs text-amber-200/80">
                      <strong>Bonus credits!</strong> Deposit ≥$10 → +10%
                      &nbsp;|&nbsp; ≥$25 → +12% &nbsp;|&nbsp; ≥$50 →{" "}
                      <strong>+16%</strong>
                    </p>
                  </div>

                  {/* Preset amounts */}
                  <Card className="bg-white/5 border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center gap-2 text-base">
                        <DollarSign className="w-5 h-5 text-green-400" /> Select
                        Deposit Amount
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-2">
                        {PRESETS.map((p) => {
                          const isSelected =
                            !useCustom && selectedAmount === p.amount;
                          return (
                            <button
                              key={p.amount}
                              onClick={() => {
                                setSelectedAmount(p.amount);
                                setUseCustom(false);
                                setErrorMsg("");
                              }}
                              className={`relative p-3 rounded-xl border-2 text-center transition-all ${
                                isSelected
                                  ? "border-purple-400 bg-purple-500/20 shadow-lg shadow-purple-500/25 scale-[1.03]"
                                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
                              }`}
                            >
                              {p.popular && (
                                <Badge
                                  className={`absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] px-1.5 py-0 transition-all ${
                                    isSelected
                                      ? "bg-purple-600 text-white"
                                      : "bg-gray-700 text-gray-400 opacity-60"
                                  }`}
                                >
                                  POPULAR
                                </Badge>
                              )}
                              <p
                                className={`text-lg font-bold ${isSelected ? "text-purple-200" : "text-white"}`}
                              >
                                {p.label}
                              </p>
                              <p
                                className={`text-[11px] font-medium ${isSelected ? "text-green-300" : "text-green-400/70"}`}
                              >
                                {p.bonus}
                              </p>
                              <p className="text-[10px] text-gray-500 mt-0.5">
                                → {p.credits} credits
                              </p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom amount */}
                      <div className="flex items-center gap-3">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-xs text-gray-500">
                          or enter custom
                        </span>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                            $
                          </span>
                          <Input
                            type="number"
                            min="5"
                            max="1000"
                            step="1"
                            placeholder="5.00 – 1,000.00"
                            value={customAmount}
                            onChange={(e) => {
                              setCustomAmount(e.target.value);
                              setUseCustom(true);
                              setErrorMsg("");
                            }}
                            onFocus={() => setUseCustom(true)}
                            className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-gray-600"
                          />
                        </div>
                        {useCustom && customAmount && (
                          <Badge className="bg-green-900/30 text-green-400 border-green-500/30 self-center">
                            +{bonusPercent}%
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary + Authorize button */}
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="py-5 space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-400">You pay</span>
                        <span className="text-white font-bold text-lg">
                          ${effectiveAmount.toFixed(2)} USD
                        </span>
                      </div>
                      {bonusPercent > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400 flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" /> Bonus (
                            {bonusPercent}%)
                          </span>
                          <span className="text-green-400 font-medium">
                            +${(creditAmount - effectiveAmount).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="h-px bg-white/10" />
                      <div className="flex items-center justify-between">
                        <span className="text-gray-300 font-medium">
                          Total credits
                        </span>
                        <span className="text-white font-bold text-xl">
                          {creditAmount.toFixed(2)}{" "}
                          <span className="text-xs text-gray-500">credits</span>
                        </span>
                      </div>

                      <Button
                        className={`w-full h-12 font-bold text-base gap-3 rounded-xl ${
                          ppReady
                            ? "bg-[#0070ba] hover:bg-[#005ea6] text-white"
                            : "bg-gray-700 text-gray-400 cursor-not-allowed"
                        }`}
                        onClick={handleDeposit}
                        disabled={
                          !ppReady ||
                          effectiveAmount < 5 ||
                          createOrder.isPending
                        }
                      >
                        <PayPalLogo size={22} />
                        {ppReady
                          ? "Authorize with PayPal"
                          : "PayPal Not Available Yet"}
                        {ppReady && <ArrowRight className="w-4 h-4 ml-auto" />}
                      </Button>

                      {!ppReady && (
                        <p className="text-center text-[11px] text-amber-400/70 flex items-center justify-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          PayPal credentials pending — deposits will activate
                          once configured
                        </p>
                      )}

                      <div className="flex items-center justify-center gap-2 text-[10px] text-gray-500">
                        <Shield className="w-3 h-3" />
                        Secured by PayPal Buyer Protection • 256-bit SSL
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── STEP: PROCESSING ── */}
              {step === "processing" && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="bg-white/5 border-white/10">
                    <CardContent className="py-16 text-center space-y-4">
                      <Loader2 className="h-12 w-12 animate-spin text-[#0070ba] mx-auto" />
                      <h3 className="text-xl font-bold text-white">
                        Creating PayPal Order…
                      </h3>
                      <p className="text-sm text-gray-400">
                        Setting up your ${effectiveAmount.toFixed(2)} deposit.
                        You'll be redirected to PayPal shortly.
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── STEP: REDIRECTING TO PAYPAL ── */}
              {step === "redirecting" && (
                <motion.div
                  key="redirecting"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="bg-blue-950/20 border-blue-500/30">
                    <CardContent className="py-16 text-center space-y-4">
                      <div className="flex justify-center">
                        <PayPalLogo size={48} />
                      </div>
                      <h3 className="text-xl font-bold text-blue-200">
                        Redirecting to PayPal…
                      </h3>
                      <p className="text-sm text-blue-300/60">
                        You're being sent to PayPal to authorize your deposit of{" "}
                        <strong>${effectiveAmount.toFixed(2)}</strong>.
                        <br />
                        Verify your account and approve the payment to continue.
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-4">
                        <div
                          className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        />
                        <div
                          className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        />
                        <div
                          className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 flex items-center justify-center gap-1 mt-4">
                        <ExternalLink className="w-3 h-3" /> If you aren't
                        redirected automatically,
                        <button
                          className="text-blue-400 underline"
                          onClick={() => window.location.reload()}
                        >
                          click here
                        </button>
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── STEP: SUCCESS ── */}
              {step === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="bg-green-950/20 border-green-500/30">
                    <CardContent className="py-12 text-center space-y-4">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                      >
                        <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-green-200">
                        Deposit Successful!
                      </h3>
                      <p className="text-sm text-green-300/60">
                        Your PayPal payment has been authorized and captured.
                        Credits have been added to your wallet.
                      </p>
                      <div className="flex items-center justify-center gap-3 pt-4">
                        <WalletLogo size={36} />
                        <div className="text-left">
                          <p className="text-xs text-gray-400">
                            Updated Balance
                          </p>
                          <p className="text-xl font-bold text-white">
                            ${balance.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex justify-center gap-3 pt-4">
                        <Button
                          className="bg-green-600 hover:bg-green-500 text-white gap-2"
                          onClick={() => {
                            setStep("select");
                            setErrorMsg("");
                          }}
                        >
                          <RefreshCw className="w-4 h-4" /> Deposit Again
                        </Button>
                        <Link href="/account/billing">
                          <Button
                            variant="outline"
                            className="border-white/10 text-white hover:bg-white/10 gap-2"
                          >
                            <ArrowLeft className="w-4 h-4" /> Back to Billing
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* ── STEP: ERROR ── */}
              {step === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="bg-red-950/20 border-red-500/30">
                    <CardContent className="py-12 text-center space-y-4">
                      <AlertTriangle className="h-12 w-12 text-red-400 mx-auto" />
                      <h3 className="text-xl font-bold text-red-200">
                        Payment Error
                      </h3>
                      <p className="text-sm text-red-300/60">
                        {errorMsg || "An unexpected error occurred."}
                      </p>
                      <div className="flex justify-center gap-3 pt-4">
                        <Button
                          className="bg-purple-600 hover:bg-purple-500 text-white gap-2"
                          onClick={() => {
                            setStep("select");
                            setErrorMsg("");
                          }}
                        >
                          <RefreshCw className="w-4 h-4" /> Try Again
                        </Button>
                        <Link href="/account/billing">
                          <Button
                            variant="outline"
                            className="border-white/10 text-white hover:bg-white/10"
                          >
                            Back to Billing
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* ═══ HOW IT WORKS ═══ */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-sm">
              How PayPal Deposits Work
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                {
                  step: "1",
                  title: "Choose Amount",
                  desc: "Select preset or enter custom",
                  icon: <DollarSign className="w-5 h-5" />,
                },
                {
                  step: "2",
                  title: "Authorize",
                  desc: "Redirected to PayPal securely",
                  icon: <ExternalLink className="w-5 h-5" />,
                },
                {
                  step: "3",
                  title: "Verify & Pay",
                  desc: "Confirm in your PayPal account",
                  icon: <Shield className="w-5 h-5" />,
                },
                {
                  step: "4",
                  title: "Credits Added",
                  desc: "Instantly deposited + bonus",
                  icon: <Zap className="w-5 h-5" />,
                },
              ].map((s) => (
                <div key={s.step} className="text-center space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    {s.icon}
                  </div>
                  <p className="text-xs font-bold text-white">{s.title}</p>
                  <p className="text-[10px] text-gray-500">{s.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ═══ SECURITY FOOTER ═══ */}
        <div className="text-center space-y-2 pb-8">
          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-600">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> PayPal Buyer Protection
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> Instant Processing
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Bonus Credits
            </span>
          </div>
          <p className="text-[10px] text-gray-600">
            Verso Air does not store your PayPal credentials. All transactions
            are processed by PayPal Inc.
          </p>
        </div>
      </div>
    </div>
  );
}
