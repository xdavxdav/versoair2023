import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "@/hooks/use-toast";
import {
  User,
  Lock,
  Mail,
  Shield,
  ArrowRight,
  Eye,
  EyeOff,
  Phone,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Loader2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
import { getDashboardDestination } from "@/lib/dashboard-routes";
import {
  isValidEmail,
  isPasswordStrong,
  checkPasswordLength,
  checkPasswordUpper,
  checkPasswordNumber,
  passwordStrengthLevel,
  isValidPhone,
  validateRegistrationForm,
} from "@/lib/auth-validation";

// Helper to get query params
const getQueryParam = (param: string) => {
  const url = new URL(window.location.href);
  return url.searchParams.get(param);
};

const getLoginDashboardPath = (userData: any) =>
  getDashboardDestination({
    id: String(userData?.id || userData?.userId || ""),
    email: String(userData?.email || ""),
    role: userData?.role,
    portals: userData?.portals,
    hasArtistProfile: userData?.hasArtistProfile,
    isContractor: userData?.isContractor,
  }).path;

const businessTypes = [
  {
    id: "business-owner",
    icon: "🧑‍💼",
    label: "Business Owner",
    description: "Owns and runs the business (main buyer)",
  },
  {
    id: "small-commerce",
    icon: "🧾",
    label: "Small Commerce Owner",
    description: "Retail/shop owner — small-scale operations",
  },
  {
    id: "service-provider",
    icon: "💼",
    label: "Service Provider",
    description: "Runs a hands-on trade or service business",
  },
  {
    id: "self-employed",
    icon: "🧑‍🔧",
    label: "Self-Employed / Freelancer",
    description: "One-person operation (e.g., plumber, tutor)",
  },
  {
    id: "independent-trader",
    icon: "🧑‍🌾",
    label: "Independent Trader",
    description: "Informal or market-based business operator",
  },
  {
    id: "franchise-manager",
    icon: "🏢",
    label: "Local Franchise Manager",
    description: "Manages a branded location (e.g., Subway)",
  },
  {
    id: "side-hustler",
    icon: "🪪",
    label: "Side Hustler",
    description: "Part-time business, may want exposure",
  },
  {
    id: "traditional-owner",
    icon: "🧓",
    label: "Traditional Business Owner",
    description: "Older clients used to print directories",
  },
];

export default function SignIn() {
  const [step, setStep] = useState(() => {
    const mode = getQueryParam("mode");
    if (mode === "register") return "register";
    return "login";
  }); // 'login', 'register', 'forgot-password', 'reset-sent', 'mfa', 'verify-sent'
  const [selectedBusinessType, setSelectedBusinessType] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState(["", "", "", "", "", ""]);
  const [resetError, setResetError] = useState("");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [loginError, setLoginError] = useState("");
  const [registerError, setRegisterError] = useState("");
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { user: authUser, login: authLogin } = useAuthContext();

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/");
    }
  };

  // Onboarding: display name prompt after first login
  const [onboardingName, setOnboardingName] = useState("");
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingError, setOnboardingError] = useState("");
  const [pendingLoginData, setPendingLoginData] = useState<any>(null);

  // Forced password change (accounts on a temporary/shared password)
  const [newPasswordValue, setNewPasswordValue] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordChangeSaving, setPasswordChangeSaving] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState("");

  // Staff 2FA (admin/moderator) — one-time email code after password check
  const [otpToken, setOtpToken] = useState("");
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpResending, setOtpResending] = useState(false);

  // Celebration countdown for post-verification auto-login
  const [countdown, setCountdown] = useState(5);

  // Recall returning user's first name from localStorage
  const returningName = (() => {
    if (authUser?.name) return authUser.name.split(" ")[0];
    try {
      const cached = localStorage.getItem("auth_user");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.name) return parsed.name.split(" ")[0];
      }
    } catch {}
    return "";
  })();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    businessName: "",
    phone: "",
  });

  // Handle SSO initiation — redirects to provider or shows error
  const handleSsoLogin = async (provider: "google" | "microsoft" | "apple") => {
    setSsoLoading(provider);
    setLoginError("");
    try {
      const redirect = getQueryParam("redirect") || "";
      const res = await fetch(
        `/auth/oauth/${provider}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`,
        { redirect: "manual" },
      );

      if (res.type === "opaqueredirect" || res.status === 0) {
        // Browser will follow the redirect to the OAuth provider
        window.location.href = `/auth/oauth/${provider}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`;
        return;
      }

      if (res.status === 501) {
        const data = await res.json();
        setLoginError(
          data.message || `${provider} sign-in is not yet configured.`,
        );
        setSsoLoading(null);
        return;
      }

      // For 3xx responses that fetch didn't follow
      const location = res.headers.get("location");
      if (location) {
        window.location.href = location;
        return;
      }

      // Fallback: redirect directly
      window.location.href = `/auth/oauth/${provider}${redirect ? `?redirect=${encodeURIComponent(redirect)}` : ""}`;
    } catch {
      setLoginError(`Failed to connect to ${provider}. Please try again.`);
      setSsoLoading(null);
    }
  };

  // Check for OAuth error from redirect
  useEffect(() => {
    const oauthError = getQueryParam("error");
    if (oauthError) {
      setLoginError(decodeURIComponent(oauthError).replace(/_/g, " "));
      // Clean the URL
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const handleBusinessTypeSelect = (typeId: string) => {
    setSelectedBusinessType(typeId);
    setStep("register");
  };

  const handleMfaCodeChange = (index: number, value: string) => {
    if (value.length <= 1) {
      const newCode = [...mfaCode];
      newCode[index] = value;
      setMfaCode(newCode);

      // Auto-focus next input
      if (value && index < 5) {
        const nextInput = document.getElementById(`mfa-${index + 1}`);
        nextInput?.focus();
      }
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      // Handle unverified email
      if (data.requiresVerification) {
        setVerificationEmail(data.email || formData.email);
        setStep("verify-sent");
        return;
      }

      // Staff 2FA — password was correct, code was emailed
      if (data.requiresOtp) {
        setOtpToken(data.otpToken);
        setMfaCode(["", "", "", "", "", ""]);
        setOtpError("");
        setStep("login-otp");
        return;
      }

      if (data.success && data.token && data.user) {
        // Forced password change takes priority (temporary/shared password)
        if (data.needsPasswordChange) {
          authLogin(data.token, {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
          });
          setPendingLoginData(data);
          setStep("change-password");
          return;
        }

        // If user hasn't set their display name yet, show onboarding prompt
        if (data.needsDisplayName) {
          // Store token so the set-display-name call is authenticated
          authLogin(data.token, {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
          });
          setPendingLoginData(data);
          setStep("set-display-name");
          return;
        }

        // Normal login — user already has a display name
        authLogin(data.token, {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
        });
        localStorage.setItem("signin_timestamp", new Date().toISOString());
        toast({
          title: "✅ Signed in",
          description: returningName
            ? `Welcome back, ${data.user.name || data.user.email}!`
            : `Welcome, ${data.user.name || data.user.email}!`,
        });

        const redirectTarget = getQueryParam("redirect");
        if (redirectTarget && redirectTarget.startsWith("/")) {
          navigate(redirectTarget);
        } else {
          // Role-based dashboard routing — full priority chain
          const portals = data.user.portals || [];
          if (portals.includes("community") && !portals.includes("artist")) {
            navigate("/blog");
          } else {
            navigate(getLoginDashboardPath(data.user));
          }
        }
      } else if (!data.requiresVerification) {
        // Login failed — show the error message from server
        setLoginError(
          data.message || "Invalid email or password. Please try again.",
        );
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setLoginError("Sign in failed. Please try again.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");

    const validation = validateRegistrationForm({
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      phone: formData.phone,
    });
    if (!validation.valid) {
      setRegisterError(validation.error);
      return;
    }

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          businessName: formData.businessName,
          businessType: selectedBusinessType,
          phone: formData.phone,
        }),
      });

      const data = await response.json();

      if (data.requiresVerification) {
        // Show "check your email" screen
        setVerificationEmail(formData.email);
        setStep("verify-sent");
      } else if (data.success && data.token && data.user) {
        // Fallback: if server auto-logged in (shouldn't happen with new flow)
        authLogin(data.token, {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
        });
        localStorage.setItem("signin_timestamp", new Date().toISOString());
        toast({
          title: "✅ Account created",
          description: `Welcome, ${data.user.name || data.user.email}!`,
        });
        const redirectTarget = getQueryParam("redirect");
        if (redirectTarget && redirectTarget.startsWith("/")) {
          navigate(redirectTarget);
        } else {
          const portals = data.user.portals || [];
          if (portals.includes("community") && !portals.includes("artist")) {
            navigate("/blog");
          } else {
            navigate(getLoginDashboardPath(data.user));
          }
        }
      } else {
        setRegisterError(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Register error:", error);
      setRegisterError("Registration failed. Please try again.");
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail) return;
    setResendLoading(true);
    setResendMessage("");
    try {
      const response = await fetch("/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail }),
      });
      const data = await response.json();
      setResendMessage(data.message || "Verification email sent!");
    } catch {
      setResendMessage("Failed to resend. Please try again.");
    } finally {
      setResendLoading(false);
    }
  };

  // Check for verification status from URL (after clicking email link)
  const verificationStatus = getQueryParam("verification");
  const autoLogin = getQueryParam("autologin") === "1";
  const verifiedName = getQueryParam("name")
    ? decodeURIComponent(getQueryParam("name")!)
    : "";
  const verifiedNeedsName = getQueryParam("needsName") === "1";
  const verifiedRole = getQueryParam("role") || "user";

  // ─── Auto-login celebration: user just verified email and was auto-logged in ───
  useEffect(() => {
    if (verificationStatus === "success" && autoLogin && verifiedName) {
      // The server already set the JWT cookie — sync the auth context
      // Fetch the session info to hydrate properly
      fetch("/auth/session", { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data.user) {
            authLogin(data.token || "", {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name || verifiedName,
              role: data.user.role || verifiedRole,
            });
          }
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Countdown timer for celebration screen (runs only when auto-login verification is active)
  useEffect(() => {
    if (!(verificationStatus === "success" && autoLogin)) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    const nav = setTimeout(() => {
      if (verifiedNeedsName) {
        setStep("set-display-name");
        window.history.replaceState({}, "", "/signin");
      } else {
        navigate(getLoginDashboardPath({ role: verifiedRole }));
      }
    }, 5000);
    return () => {
      clearInterval(timer);
      clearTimeout(nav);
    };
  }, [verificationStatus, autoLogin]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── CELEBRATION SCREEN: Email verified + auto-logged in ───
  if (verificationStatus === "success" && autoLogin) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0d0d1a] overflow-hidden relative items-center justify-center">
        {/* Confetti particles */}
        <style>{`
          @keyframes confetti-fall {
            0%   { transform: translateY(-80px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
          @keyframes scale-in {
            0%   { transform: scale(0) rotate(-20deg); opacity: 0; }
            60%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); opacity: 1; }
          }
          @keyframes fade-up {
            from { transform: translateY(20px); opacity: 0; }
            to   { transform: translateY(0); opacity: 1; }
          }
          .confetti-piece {
            position: absolute;
            top: -20px;
            width: 10px;
            height: 10px;
            border-radius: 2px;
            animation: confetti-fall linear infinite;
          }
        `}</style>
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              backgroundColor: [
                "#bf831c",
                "#d4a037",
                "#22c55e",
                "#3b82f6",
                "#8b5cf6",
                "#ec4899",
                "#f59e0b",
              ][i % 7],
              animationDuration: `${2 + Math.random() * 3}s`,
              animationDelay: `${Math.random() * 2}s`,
              width: `${6 + Math.random() * 8}px`,
              height: `${6 + Math.random() * 8}px`,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            }}
          />
        ))}

        <div className="text-center z-10 max-w-md mx-auto px-6">
          {/* Animated checkmark */}
          <div
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30"
            style={{ animation: "scale-in 0.6s ease-out forwards" }}
          >
            <CheckCircle2 className="h-12 w-12 text-white" />
          </div>

          <h1
            className="text-3xl font-bold text-white mb-3"
            style={{ animation: "fade-up 0.5s ease-out 0.3s both" }}
          >
            Email Verified! 🎉
          </h1>
          <p
            className="text-lg text-[#8080b0] mb-2"
            style={{ animation: "fade-up 0.5s ease-out 0.5s both" }}
          >
            Welcome to{" "}
            <span className="text-[#d4a037] font-semibold">Verso Air</span>,{" "}
            {verifiedName}!
          </p>
          <p
            className="text-[#5a5a80] mb-8"
            style={{ animation: "fade-up 0.5s ease-out 0.7s both" }}
          >
            Your account is now active and ready to go.
          </p>

          {/* Progress bar */}
          <div
            className="w-full max-w-xs mx-auto mb-4 bg-[#1a1a2e] rounded-full h-2 overflow-hidden"
            style={{ animation: "fade-up 0.5s ease-out 0.9s both" }}
          >
            <div
              className="h-full bg-gradient-to-r from-[#bf831c] to-[#d4a037] rounded-full transition-all duration-1000"
              style={{ width: `${((5 - countdown) / 5) * 100}%` }}
            />
          </div>
          <p
            className="text-[#5a5a80] text-sm"
            style={{ animation: "fade-up 0.5s ease-out 1s both" }}
          >
            {verifiedNeedsName
              ? `Setting up your profile in ${countdown}s...`
              : `Taking you to your dashboard in ${countdown}s...`}
          </p>

          {/* Skip button */}
          <button
            onClick={() => {
              if (verifiedNeedsName) {
                setStep("set-display-name");
                window.history.replaceState({}, "", "/signin");
              } else {
                navigate(getLoginDashboardPath({ role: verifiedRole }));
              }
            }}
            className="mt-4 text-[#d4a037] hover:text-[#bf831c] text-sm font-medium transition-colors"
            style={{ animation: "fade-up 0.5s ease-out 1.2s both" }}
          >
            Skip →{" "}
            {verifiedNeedsName ? "Set up profile now" : "Go to dashboard now"}
          </button>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-center text-xs text-[#40407a]">
          🦅 <strong className="text-[#bf831c]">Verso Air</strong> — Your
          business, amplified
        </div>
      </div>
    );
  }

  // Show "Check Your Email" celebration screen
  if (step === "verify-sent") {
    return (
      <div className="flex flex-col min-h-screen bg-[#0d0d1a] py-12 overflow-hidden relative">
        {/* CSS confetti particles */}
        <style>{`
          @keyframes confetti-fall {
            0%   { transform: translateY(-80px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
          @keyframes pulse-ring {
            0%   { transform: scale(0.9); opacity: .7; }
            50%  { transform: scale(1.05); opacity: 1; }
            100% { transform: scale(0.9); opacity: .7; }
          }
          @keyframes slide-up {
            from { transform: translateY(24px); opacity: 0; }
            to   { transform: translateY(0);   opacity: 1; }
          }
          .confetti-piece {
            position: absolute;
            top: -20px;
            width: 10px;
            height: 10px;
            border-radius: 2px;
            animation: confetti-fall linear infinite;
          }
          .celebrate-card { animation: slide-up .5s ease both; }
          .pulse-icon     { animation: pulse-ring 2.5s ease-in-out infinite; }
        `}</style>

        {/* Confetti burst */}
        {[...Array(28)].map((_, i) => {
          const colors = [
            "#d4a037",
            "#bf831c",
            "#f0c060",
            "#e05c5c",
            "#5ce0a8",
            "#5ca8e0",
            "#b05ce0",
            "#e05cb0",
          ];
          const left = `${(i * 3.7) % 100}%`;
          const delay = `${(i * 0.22) % 3}s`;
          const duration = `${3.2 + (i % 5) * 0.4}s`;
          const size = `${8 + (i % 4) * 4}px`;
          return (
            <div
              key={i}
              className="confetti-piece"
              style={{
                left,
                background: colors[i % colors.length],
                width: size,
                height: size,
                animationDelay: delay,
                animationDuration: duration,
                borderRadius: i % 3 === 0 ? "50%" : i % 3 === 1 ? "2px" : "0",
              }}
            />
          );
        })}

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-lg mx-auto">
            <div className="celebrate-card bg-gradient-to-b from-[#16162a] to-[#0e0e1e] rounded-3xl shadow-2xl shadow-black/60 border border-[#bf831c]/20 overflow-hidden">
              {/* Hero glow strip */}
              <div className="h-1.5 bg-gradient-to-r from-[#bf831c] via-[#f0c060] to-[#bf831c]" />

              <div className="p-8 text-center">
                {/* Animated icon */}
                <div className="pulse-icon w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#bf831c]/20 to-[#d4a037]/10 border border-[#bf831c]/30 flex items-center justify-center">
                  <span className="text-5xl">🚀</span>
                </div>

                <div className="inline-block bg-[#bf831c]/10 border border-[#bf831c]/30 text-[#d4a037] text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-5">
                  Account Created!
                </div>

                <h2 className="text-3xl font-extrabold text-white mb-2 tracking-tight">
                  You're almost in 🎉
                </h2>
                <p className="text-[#9090b0] text-sm mb-2">
                  We just fired a verification link to:
                </p>
                <p className="text-[#f0b445] font-bold text-base mb-8 bg-[#bf831c]/10 rounded-lg px-4 py-2 inline-block border border-[#bf831c]/20">
                  {verificationEmail}
                </p>

                {/* Step cards */}
                <div className="space-y-3 mb-8 text-left">
                  {[
                    {
                      icon: "📬",
                      step: "1",
                      title: "Open your inbox",
                      desc: "Check the email we sent you right now",
                    },
                    {
                      icon: "✅",
                      step: "2",
                      title: 'Click "Verify My Email"',
                      desc: "The golden button in the email — it expires in 24h",
                    },
                    {
                      icon: "🏆",
                      step: "3",
                      title: "Sign in & explore",
                      desc: "Your full dashboard awaits",
                    },
                  ].map(({ icon, step, title, desc }) => (
                    <div
                      key={step}
                      className="flex items-start gap-3 bg-[#12122a] rounded-xl p-3.5 border border-white/5"
                    >
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[#bf831c] to-[#d4a037] flex items-center justify-center text-black font-extrabold text-sm">
                        {step}
                      </div>
                      <div>
                        <p className="text-white font-semibold text-sm">
                          {icon} {title}
                        </p>
                        <p className="text-[#6060a0] text-xs mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Spam note */}
                <p className="text-[#50508a] text-xs mb-5">
                  Can't find it? Check your{" "}
                  <strong className="text-[#8080c0]">Spam / Promotions</strong>{" "}
                  folder.
                </p>

                {/* Resend button */}
                <Button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  variant="outline"
                  className="border-[#bf831c]/50 text-[#d4a037] hover:bg-[#bf831c]/10 hover:border-[#bf831c] mb-3 w-full bg-transparent"
                >
                  {resendLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {resendLoading ? "Sending..." : "Resend Verification Email"}
                </Button>
                {resendMessage && (
                  <p className="text-sm text-emerald-400 mb-3">
                    {resendMessage}
                  </p>
                )}

                {/* Go to sign in */}
                <Button
                  onClick={() => setStep("login")}
                  className="w-full bg-gradient-to-r from-[#bf831c] to-[#d4a037] hover:from-[#a6701a] hover:to-[#c0841c] text-black font-bold"
                >
                  I've Verified — Sign In →
                </Button>
              </div>

              {/* Footer strip */}
              <div className="bg-[#0a0a14] px-8 py-4 text-center text-xs text-[#40407a] border-t border-white/5">
                🌍 <strong className="text-[#bf831c]">Verso Air</strong> —
                Business Intelligence Platform
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Set Display Name (post-login onboarding) ────────────────────────────
  if (step === "set-display-name") {
    const handleSetDisplayName = async () => {
      const trimmed = onboardingName.trim();
      if (trimmed.length < 2) {
        setOnboardingError("Your name must be at least 2 characters");
        return;
      }
      if (trimmed.length > 50) {
        setOnboardingError("Name cannot exceed 50 characters");
        return;
      }
      setOnboardingSaving(true);
      setOnboardingError("");
      try {
        const token =
          localStorage.getItem("authToken") ||
          localStorage.getItem("auth_token");
        const res = await fetch("/auth/account/set-display-name", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ displayName: trimmed }),
        });
        const result = await res.json();
        if (result.success) {
          // Update the cached user name
          const cached = localStorage.getItem("auth_user");
          if (cached) {
            try {
              const u = JSON.parse(cached);
              u.name = trimmed;
              localStorage.setItem("auth_user", JSON.stringify(u));
            } catch {}
          }
          authLogin(pendingLoginData.token, {
            ...pendingLoginData.user,
            name: trimmed,
          });
          localStorage.setItem("signin_timestamp", new Date().toISOString());
          toast({
            title: "🎉 Welcome to Verso Air!",
            description: `Great to meet you, ${trimmed}!`,
          });

          // Navigate to dashboard — full priority chain
          const portals = pendingLoginData.user.portals || [];
          if (portals.includes("community") && !portals.includes("artist")) {
            navigate("/blog");
          } else {
            navigate(getLoginDashboardPath(pendingLoginData.user));
          }
        } else {
          setOnboardingError(result.message || "Failed to save name");
        }
      } catch {
        setOnboardingError("Something went wrong. Please try again.");
      } finally {
        setOnboardingSaving(false);
      }
    };

    return (
      <div className="flex flex-col min-h-screen bg-[#0d0d1a] py-12 overflow-hidden relative">
        {/* Subtle floating particles */}
        <style>{`
          @keyframes float-up {
            0%   { transform: translateY(100vh) scale(0); opacity: 0; }
            20%  { opacity: 1; }
            100% { transform: translateY(-20vh) scale(1); opacity: 0; }
          }
          .float-particle {
            position: absolute;
            border-radius: 50%;
            animation: float-up linear infinite;
            pointer-events: none;
          }
          @keyframes name-glow { 0%,100% { box-shadow: 0 0 20px rgba(191,131,28,.15); } 50% { box-shadow: 0 0 40px rgba(191,131,28,.3); } }
          .name-card { animation: name-glow 3s ease-in-out infinite; }
        `}</style>

        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="float-particle"
            style={{
              left: `${(i * 8.3) % 100}%`,
              width: `${4 + (i % 3) * 3}px`,
              height: `${4 + (i % 3) * 3}px`,
              background:
                i % 2 === 0 ? "rgba(191,131,28,0.4)" : "rgba(212,160,55,0.3)",
              animationDuration: `${6 + (i % 4) * 2}s`,
              animationDelay: `${(i * 0.6) % 4}s`,
            }}
          />
        ))}

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-md mx-auto">
            <div className="name-card bg-gradient-to-b from-[#16162a] to-[#0e0e1e] rounded-3xl shadow-2xl shadow-black/60 border border-[#bf831c]/20 overflow-hidden">
              {/* Top glow strip */}
              <div className="h-1.5 bg-gradient-to-r from-[#bf831c] via-[#f0c060] to-[#bf831c]" />

              <div className="p-8 text-center">
                {/* Icon */}
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#bf831c]/20 to-[#d4a037]/10 border border-[#bf831c]/30 flex items-center justify-center">
                  <Sparkles className="h-10 w-10 text-[#d4a037]" />
                </div>

                <div className="inline-block bg-[#bf831c]/10 border border-[#bf831c]/30 text-[#d4a037] text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-5">
                  One Last Thing
                </div>

                <h2 className="text-2xl font-extrabold text-white mb-2">
                  What should we call you?
                </h2>
                <p className="text-[#8080b0] text-sm mb-6">
                  This name will appear on your dashboard, messages, and
                  profile.
                  <br />
                  <span className="text-[#5a5a80] text-xs">
                    You can change it later in Settings.
                  </span>
                </p>

                {/* Name input */}
                <div className="relative mb-4">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#bf831c]/60" />
                  <input
                    type="text"
                    value={onboardingName}
                    onChange={(e) => setOnboardingName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleSetDisplayName()
                    }
                    maxLength={50}
                    autoFocus
                    placeholder="e.g. Joseph, Maria K., Jean-Pierre..."
                    className="w-full pl-10 pr-4 py-3.5 bg-[#0a0a18] border border-[#bf831c]/30 rounded-xl text-white placeholder:text-[#40406a] focus:outline-none focus:border-[#d4a037] focus:ring-1 focus:ring-[#d4a037]/50 transition-all text-base"
                  />
                  {onboardingName.trim().length > 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {onboardingName.trim().length >= 2 ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Preview */}
                {onboardingName.trim().length >= 2 && (
                  <div className="bg-[#0a0a18] rounded-lg border border-white/5 p-3 mb-4 text-left">
                    <p className="text-[#5a5a80] text-xs mb-1">
                      Dashboard preview
                    </p>
                    <p className="text-white text-sm font-semibold">
                      Welcome back,{" "}
                      <span className="text-[#d4a037]">
                        {onboardingName.trim()}
                      </span>
                      ! 👋
                    </p>
                  </div>
                )}

                {onboardingError && (
                  <p className="text-red-400 text-sm mb-3 flex items-center justify-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {onboardingError}
                  </p>
                )}

                <Button
                  onClick={handleSetDisplayName}
                  disabled={
                    onboardingSaving || onboardingName.trim().length < 2
                  }
                  className="w-full bg-gradient-to-r from-[#bf831c] to-[#d4a037] hover:from-[#a6701a] hover:to-[#c0841c] text-black font-bold py-3 text-base"
                >
                  {onboardingSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  {onboardingSaving ? "Saving..." : "Continue to Dashboard →"}
                </Button>
              </div>

              {/* Footer */}
              <div className="bg-[#0a0a14] px-8 py-4 text-center text-xs text-[#40407a] border-t border-white/5">
                🌍 <strong className="text-[#bf831c]">Verso Air</strong> — Your
                identity, your way
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Forced Password Change (accounts on a temporary/shared password) ────
  if (step === "change-password") {
    const navigateAfterPasswordChange = () => {
      const portals = pendingLoginData?.user?.portals || [];
      if (portals.includes("community") && !portals.includes("artist")) {
        navigate("/blog");
      } else {
        navigate(getLoginDashboardPath(pendingLoginData?.user));
      }
    };

    const handleChangePassword = async () => {
      setPasswordChangeError("");
      if (newPasswordValue.length < 8) {
        setPasswordChangeError("New password must be at least 8 characters");
        return;
      }
      if (newPasswordValue !== newPasswordConfirm) {
        setPasswordChangeError("Passwords do not match");
        return;
      }
      if (newPasswordValue === formData.password) {
        setPasswordChangeError(
          "Please choose a password different from the temporary one",
        );
        return;
      }
      setPasswordChangeSaving(true);
      try {
        const token =
          localStorage.getItem("authToken") ||
          localStorage.getItem("auth_token");
        const res = await fetch("/auth/account/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            currentPassword: formData.password,
            newPassword: newPasswordValue,
          }),
        });
        const result = await res.json();
        if (result.success) {
          toast({
            title: "🔒 Password updated",
            description: "Your new password is now active.",
          });
          localStorage.setItem("signin_timestamp", new Date().toISOString());
          if (pendingLoginData?.needsDisplayName) {
            setStep("set-display-name");
          } else {
            navigateAfterPasswordChange();
          }
        } else {
          setPasswordChangeError(result.message || "Failed to change password");
        }
      } catch {
        setPasswordChangeError("Something went wrong. Please try again.");
      } finally {
        setPasswordChangeSaving(false);
      }
    };

    return (
      <div className="flex flex-col min-h-screen bg-[#0d0d1a] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-[#12121f] rounded-2xl border border-white/10 overflow-hidden">
              <div className="p-8">
                <div className="text-center mb-6">
                  <Shield className="h-10 w-10 mx-auto mb-3 text-[#bf831c]" />
                  <h1 className="text-2xl font-bold text-white mb-2">
                    Set a new password
                  </h1>
                  <p className="text-sm text-[#8a8ab0]">
                    This account is using a temporary password. Choose a new one
                    to continue — you'll only need to do this once.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-[#8a8ab0] mb-1 block">
                      New password
                    </label>
                    <input
                      type="password"
                      value={newPasswordValue}
                      onChange={(e) => setNewPasswordValue(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-[#5a5a80] focus:outline-none focus:border-[#bf831c]"
                      placeholder="At least 8 characters"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[#8a8ab0] mb-1 block">
                      Confirm new password
                    </label>
                    <input
                      type="password"
                      value={newPasswordConfirm}
                      onChange={(e) => setNewPasswordConfirm(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-[#5a5a80] focus:outline-none focus:border-[#bf831c]"
                      placeholder="Re-enter new password"
                    />
                  </div>

                  {passwordChangeError && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <AlertCircle className="h-3.5 w-3.5" />{" "}
                      {passwordChangeError}
                    </div>
                  )}

                  <Button
                    onClick={handleChangePassword}
                    disabled={
                      passwordChangeSaving ||
                      newPasswordValue.length < 8 ||
                      !newPasswordConfirm
                    }
                    className="w-full bg-[#bf831c] hover:bg-[#a8721a] text-white"
                  >
                    {passwordChangeSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    {passwordChangeSaving
                      ? "Updating..."
                      : "Set password & continue"}
                  </Button>
                </div>
              </div>

              <div className="bg-[#0a0a14] px-8 py-4 text-center text-xs text-[#40407a] border-t border-white/5">
                🌍 <strong className="text-[#bf831c]">Verso Air</strong> — Your
                identity, your way
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Staff 2FA: email one-time code (admin / moderator) ──────────────────
  if (step === "login-otp") {
    const handleVerifyOtp = async () => {
      const code = mfaCode.join("");
      if (code.length !== 6) {
        setOtpError("Enter the full 6-digit code");
        return;
      }
      setOtpVerifying(true);
      setOtpError("");
      try {
        const res = await fetch("/auth/verify-login-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ otpToken, code }),
        });
        const data = await res.json();
        if (!data.success) {
          setOtpError(data.message || "Incorrect or expired code");
          return;
        }

        if (data.needsPasswordChange) {
          authLogin(data.token, {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
          });
          setPendingLoginData(data);
          setStep("change-password");
          return;
        }
        if (data.needsDisplayName) {
          authLogin(data.token, {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
          });
          setPendingLoginData(data);
          setStep("set-display-name");
          return;
        }

        authLogin(data.token, {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
        });
        localStorage.setItem("signin_timestamp", new Date().toISOString());
        toast({
          title: "✅ Signed in",
          description: `Welcome back, ${data.user.name || data.user.email}!`,
        });
        const role = (data.user.role || "user").toLowerCase();
        if (role === "admin" || role === "moderator") {
          navigate("/geo-admin/dashboard");
        } else {
          navigate("/dashboard");
        }
      } catch {
        setOtpError("Something went wrong. Please try again.");
      } finally {
        setOtpVerifying(false);
      }
    };

    const handleResendOtp = async () => {
      setOtpResending(true);
      setOtpError("");
      try {
        const res = await fetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });
        const data = await res.json();
        if (data.requiresOtp) {
          setOtpToken(data.otpToken);
          setMfaCode(["", "", "", "", "", ""]);
          toast({ title: "📧 New code sent", description: data.email });
        } else {
          setOtpError("Couldn't resend — please sign in again");
        }
      } catch {
        setOtpError("Couldn't resend — please sign in again");
      } finally {
        setOtpResending(false);
      }
    };

    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Enter Verification Code
                </h2>
                <p className="text-gray-600 mt-2">
                  We've emailed a 6-digit code to
                  <br />
                  <span className="font-medium">{formData.email}</span>
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-center space-x-3">
                    {mfaCode.map((digit, index) => (
                      <input
                        key={index}
                        id={`mfa-${index}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) =>
                          handleMfaCodeChange(index, e.target.value)
                        }
                        className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-[#bf831c]"
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !digit && index > 0) {
                            const prevInput = document.getElementById(
                              `mfa-${index - 1}`,
                            );
                            prevInput?.focus();
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>

                {otpError && (
                  <div className="flex items-center justify-center gap-2 text-red-500 text-sm">
                    <AlertCircle className="h-3.5 w-3.5" /> {otpError}
                  </div>
                )}

                <Button
                  onClick={handleVerifyOtp}
                  disabled={otpVerifying || mfaCode.join("").length !== 6}
                  className="w-full bg-gradient-to-r from-[#bf831c] to-[#d4941f] hover:from-[#a6701a] hover:to-[#c0841c] text-white py-3 rounded-lg font-medium"
                >
                  {otpVerifying ? "Verifying..." : "Verify & Continue"}
                </Button>

                <div className="text-center space-y-3">
                  <p className="text-gray-600 text-sm">
                    Didn't receive the code?{" "}
                    <button
                      onClick={handleResendOtp}
                      disabled={otpResending}
                      className="text-[#bf831c] hover:underline font-medium"
                    >
                      {otpResending ? "Sending..." : "Resend Code"}
                    </button>
                  </p>
                  <button
                    onClick={() => setStep("login")}
                    className="text-[#bf831c] hover:underline font-medium"
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "select-type") {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to Verso Air ™️
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Let's identify your business to provide you with the best
                experience
              </p>
              <p className="text-lg text-[#bf831c] font-medium">
                Select your business type to continue:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8">
              {businessTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleBusinessTypeSelect(type.id)}
                  className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-[#bf831c] hover:shadow-lg transition-all duration-300 text-left group"
                >
                  <div className="flex items-start space-x-4">
                    <span className="text-3xl">{type.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#bf831c] transition-colors">
                        {type.label}
                      </h3>
                      <p className="text-gray-600 text-sm mt-2">
                        {type.description}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-[#bf831c] transition-colors" />
                  </div>
                </button>
              ))}
            </div>

            <div className="text-center">
              <p className="text-gray-600 mb-4">Already have an account?</p>
              <Button
                variant="outline"
                onClick={() => setStep("login")}
                className="border-[#bf831c] text-[#bf831c] hover:bg-[#bf831c] hover:text-white"
              >
                Sign In Instead
              </Button>
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => window.history.back()}
                className="text-[#bf831c] hover:text-[#a6701a] text-sm font-medium"
              >
                ← Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "register") {
    const selectedType = businessTypes.find(
      (type) => type.id === selectedBusinessType,
    );

    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            {/* Back Button */}
            <button
              onClick={() => setStep("login")}
              className="flex items-center space-x-2 text-[#bf831c] hover:text-[#a6701a] mb-6 transition-colors duration-200 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="text-sm font-medium">Back to Sign In</span>
            </button>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Create Your Account
                </h2>
                <p className="text-gray-600 mt-2">
                  Join Verso Air — artists, listeners & business owners welcome
                </p>
              </div>

              <form onSubmit={handleRegister} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Name{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) =>
                      setFormData({ ...formData, businessName: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                    placeholder="Leave blank if not a business"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent ${
                        formData.email && !isValidEmail(formData.email)
                          ? "border-red-400"
                          : formData.email && isValidEmail(formData.email)
                            ? "border-green-400"
                            : "border-gray-300"
                      }`}
                      placeholder="john@business.com"
                    />
                    {formData.email && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {isValidEmail(formData.email) ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                  {formData.email && !isValidEmail(formData.email) && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Enter a valid email
                      (e.g. name@example.com)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent ${
                        formData.phone && !isValidPhone(formData.phone)
                          ? "border-red-400"
                          : formData.phone && isValidPhone(formData.phone)
                            ? "border-green-400"
                            : "border-gray-300"
                      }`}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                  {formData.phone && !isValidPhone(formData.phone) && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> Enter a valid phone
                      number
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                      placeholder="Create a strong password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {/* Password strength bar */}
                  {formData.password && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3].map((level) => (
                          <div
                            key={level}
                            className={`h-1 flex-1 rounded-full transition-colors ${
                              passwordStrengthLevel(formData.password) >= level
                                ? passwordStrengthLevel(formData.password) === 1
                                  ? "bg-red-400"
                                  : passwordStrengthLevel(formData.password) ===
                                      2
                                    ? "bg-amber-400"
                                    : "bg-green-500"
                                : "bg-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <div className="grid grid-cols-1 gap-0.5">
                        <p
                          className={`text-xs flex items-center gap-1 ${checkPasswordLength(formData.password) ? "text-green-600" : "text-gray-400"}`}
                        >
                          {checkPasswordLength(formData.password) ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          At least 8 characters
                        </p>
                        <p
                          className={`text-xs flex items-center gap-1 ${checkPasswordUpper(formData.password) ? "text-green-600" : "text-gray-400"}`}
                        >
                          {checkPasswordUpper(formData.password) ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          One uppercase letter (A–Z)
                        </p>
                        <p
                          className={`text-xs flex items-center gap-1 ${checkPasswordNumber(formData.password) ? "text-green-600" : "text-gray-400"}`}
                        >
                          {checkPasswordNumber(formData.password) ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          One number (0–9)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          confirmPassword: e.target.value,
                        })
                      }
                      className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent ${
                        formData.confirmPassword &&
                        formData.password !== formData.confirmPassword
                          ? "border-red-400"
                          : formData.confirmPassword &&
                              formData.password === formData.confirmPassword
                            ? "border-green-400"
                            : "border-gray-300"
                      }`}
                      placeholder="Confirm your password"
                    />
                    {formData.confirmPassword && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        {formData.password === formData.confirmPassword ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                      </div>
                    )}
                  </div>
                  {formData.confirmPassword &&
                    formData.password !== formData.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Passwords do not
                        match
                      </p>
                    )}
                </div>

                {/* Registration Error */}
                {registerError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {registerError}
                  </div>
                )}

                <Button
                  className="w-full bg-gradient-to-r from-[#bf831c] to-[#d4941f] hover:from-[#a6701a] hover:to-[#c0841c] text-white py-3 rounded-lg font-medium"
                  type="submit"
                >
                  Create Account
                </Button>
              </form>

              {/* ─── SSO Divider ─── */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">
                  or sign up with
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* ─── General SSO Providers ─── */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {/* Google */}
                <button
                  type="button"
                  onClick={() => handleSsoLogin("google")}
                  disabled={!!ssoLoading}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-700 transition-all text-xs font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ssoLoading === "google" ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Google
                </button>
                {/* Microsoft */}
                <button
                  type="button"
                  onClick={() => handleSsoLogin("microsoft")}
                  disabled={!!ssoLoading}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-700 transition-all text-xs font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ssoLoading === "microsoft" ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                      <rect
                        x="13"
                        y="1"
                        width="10"
                        height="10"
                        fill="#7FBA00"
                      />
                      <rect
                        x="1"
                        y="13"
                        width="10"
                        height="10"
                        fill="#00A4EF"
                      />
                      <rect
                        x="13"
                        y="13"
                        width="10"
                        height="10"
                        fill="#FFB900"
                      />
                    </svg>
                  )}
                  Microsoft
                </button>
                {/* Apple */}
                <button
                  type="button"
                  onClick={() => handleSsoLogin("apple")}
                  disabled={!!ssoLoading}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-900 rounded-xl text-white transition-all text-xs font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ssoLoading === "apple" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  )}
                  Apple
                </button>
              </div>

              <div className="text-center mt-6 space-y-3">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <button
                    onClick={() => setStep("login")}
                    className="text-[#bf831c] hover:underline font-medium"
                  >
                    Sign In
                  </button>
                </p>
                <Link href="/blog">
                  <Button
                    variant="ghost"
                    className="text-[#bf831c] hover:text-[#a6701a] text-sm"
                  >
                    Join Community Blog →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "login") {
    return (
      <div className="relative flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] py-12">
        <button
          type="button"
          onClick={handleBack}
          className="absolute left-4 top-4 z-10 inline-flex items-center gap-2 text-sm font-medium text-amber-700 hover:text-amber-900 hover:underline"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {verificationStatus === "success"
                    ? "Welcome to Verso Air"
                    : returningName
                      ? `Welcome Back, ${returningName}`
                      : "Sign In"}
                </h2>
                <p className="text-gray-600 mt-2">
                  {verificationStatus === "success"
                    ? "Your email is verified — sign in to get started"
                    : returningName
                      ? "Sign in to continue"
                      : "Sign in to your account"}
                </p>
              </div>

              {/* Verification status banners */}
              {verificationStatus === "success" && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-green-800 font-semibold">
                      Email verified! ✅
                    </p>
                    <p className="text-green-700 text-sm">
                      Your account is now active. Sign in below.
                    </p>
                  </div>
                </div>
              )}
              {verificationStatus === "expired" && (
                <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-orange-800 font-semibold">
                      Verification link expired
                    </p>
                    <p className="text-orange-700 text-sm">
                      Try logging in — you'll be prompted to resend a new link.
                    </p>
                  </div>
                </div>
              )}
              {verificationStatus === "invalid" && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-800 font-semibold">
                      Invalid verification link
                    </p>
                    <p className="text-red-700 text-sm">
                      The link may have already been used. Try signing in.
                    </p>
                  </div>
                </div>
              )}
              {verificationStatus === "already" && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-blue-800 font-semibold">
                      Already verified
                    </p>
                    <p className="text-blue-700 text-sm">
                      Your email is already verified. Sign in below.
                    </p>
                  </div>
                </div>
              )}

              {/* Login error */}
              {loginError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm">{loginError}</p>
                </div>
              )}

              <form onSubmit={handleSignIn} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                      placeholder="Your password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-[#bf831c] focus:ring-[#bf831c]"
                    />
                    <span className="ml-2 text-sm text-gray-600">
                      Remember me
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep("forgot-password")}
                    className="text-sm text-[#bf831c] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-[#bf831c] to-[#d4941f] hover:from-[#a6701a] hover:to-[#c0841c] text-white py-3 rounded-lg font-medium"
                  type="submit"
                >
                  Sign In
                </Button>
              </form>

              {/* ─── SSO Divider ─── */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">
                  or continue with
                </span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              {/* ─── General SSO Providers ─── */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {/* Google */}
                <button
                  type="button"
                  onClick={() => handleSsoLogin("google")}
                  disabled={!!ssoLoading}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-700 transition-all text-xs font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ssoLoading === "google" ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                  )}
                  Google
                </button>
                {/* Microsoft */}
                <button
                  type="button"
                  onClick={() => handleSsoLogin("microsoft")}
                  disabled={!!ssoLoading}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-gray-700 transition-all text-xs font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ssoLoading === "microsoft" ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
                      <rect
                        x="13"
                        y="1"
                        width="10"
                        height="10"
                        fill="#7FBA00"
                      />
                      <rect
                        x="1"
                        y="13"
                        width="10"
                        height="10"
                        fill="#00A4EF"
                      />
                      <rect
                        x="13"
                        y="13"
                        width="10"
                        height="10"
                        fill="#FFB900"
                      />
                    </svg>
                  )}
                  Microsoft
                </button>
                {/* Apple */}
                <button
                  type="button"
                  onClick={() => handleSsoLogin("apple")}
                  disabled={!!ssoLoading}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 bg-gray-900 hover:bg-gray-800 border border-gray-900 rounded-xl text-white transition-all text-xs font-medium shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ssoLoading === "apple" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                    </svg>
                  )}
                  Apple
                </button>
              </div>

              <div className="text-center mt-6 space-y-3">
                <p className="text-gray-600">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setStep("register")}
                    className="text-[#bf831c] hover:underline font-medium"
                  >
                    Create Account
                  </button>
                </p>
                <Link href="/blog">
                  <Button
                    variant="ghost"
                    className="text-[#bf831c] hover:text-[#a6701a] text-sm"
                  >
                    Visit Community Blog →
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "forgot-password") {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Reset Password
                </h2>
                <p className="text-gray-600 mt-2">
                  We'll send you a secure verification code
                </p>
              </div>

              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                      placeholder="Enter your email address"
                    />
                  </div>
                </div>

                <Button
                  onClick={async () => {
                    setResetError("");
                    if (!formData.email) {
                      setResetError("Please enter your email address.");
                      return;
                    }
                    try {
                      await fetch("/auth/forgot-password", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                        body: JSON.stringify({ email: formData.email }),
                      });
                      setStep("reset-sent");
                    } catch {
                      setResetError(
                        "Failed to send reset email. Please try again.",
                      );
                    }
                  }}
                  type="button"
                  className="w-full bg-gradient-to-r from-[#bf831c] to-[#d4941f] hover:from-[#a6701a] hover:to-[#c0841c] text-white py-3 rounded-lg font-medium"
                >
                  Send Verification Code
                </Button>
                {resetError && (
                  <p className="text-red-500 text-sm text-center">
                    {resetError}
                  </p>
                )}
              </form>

              <div className="text-center mt-6">
                <button
                  onClick={() => setStep("login")}
                  className="text-[#bf831c] hover:underline font-medium"
                >
                  ← Back to Sign In
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "reset-sent") {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Check Your Email
              </h2>
              <p className="text-gray-600 mb-6">
                If <span className="font-medium">{formData.email}</span> is
                registered, we've sent a password reset link. Check your inbox
                and follow the link.
              </p>
              <button
                onClick={() => setStep("login")}
                className="text-[#bf831c] hover:underline font-medium"
              >
                ← Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === "mfa") {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Enter Verification Code
                </h2>
                <p className="text-gray-600 mt-2">
                  We've sent a 6-digit code to
                  <br />
                  <span className="font-medium">{formData.email}</span>
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4 text-center">
                    Verification Code
                  </label>
                  <div className="flex justify-center space-x-3">
                    {mfaCode.map((digit, index) => (
                      <input
                        key={index}
                        id={`mfa-${index}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) =>
                          handleMfaCodeChange(index, e.target.value)
                        }
                        className="w-12 h-12 text-center text-xl font-bold border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-[#bf831c]"
                        onKeyDown={(e) => {
                          if (e.key === "Backspace" && !digit && index > 0) {
                            const prevInput = document.getElementById(
                              `mfa-${index - 1}`,
                            );
                            prevInput?.focus();
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>

                <Button className="w-full bg-gradient-to-r from-[#bf831c] to-[#d4941f] hover:from-[#a6701a] hover:to-[#c0841c] text-white py-3 rounded-lg font-medium">
                  Verify & Reset Password
                </Button>

                <div className="text-center space-y-3">
                  <p className="text-gray-600 text-sm">
                    Didn't receive the code?{" "}
                    <button className="text-[#bf831c] hover:underline font-medium">
                      Resend Code
                    </button>
                  </p>
                  <button
                    onClick={() => setStep("forgot-password")}
                    className="text-[#bf831c] hover:underline font-medium"
                  >
                    ← Change Email Address
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
