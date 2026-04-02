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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";
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
    return mode === "login" ? "login" : "select-type";
  }); // 'select-type', 'login', 'register', 'forgot-password', 'reset-sent', 'mfa', 'verify-sent'
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

      if (data.success && data.token && data.user) {
        // Use AuthContext to persist login across page refreshes
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

        const redirectTarget = getQueryParam("redirect");
        if (redirectTarget && redirectTarget.startsWith("/")) {
          navigate(redirectTarget);
        } else {
          // Role-based dashboard routing
          const role = (data.user.role || "user").toLowerCase();
          if (role === "superuser") {
            navigate("/dashboard?from=sv");
          } else if (role === "admin" || role === "moderator") {
            navigate("/geo-admin/dashboard");
          } else {
            navigate("/dashboard");
          }
        }
      } else {
        setLoginError(data.message || "Invalid credentials");
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
          const role = (data.user.role || "user").toLowerCase();
          if (role === "superuser") {
            navigate("/dashboard?from=sv");
          } else if (role === "admin" || role === "moderator") {
            navigate("/geo-admin/dashboard");
          } else {
            navigate("/dashboard");
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

  // Show "Check Your Email" screen
  if (step === "verify-sent") {
    return (
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Check Your Email
              </h2>
              <p className="text-gray-600 mb-2">
                We sent a verification link to:
              </p>
              <p className="text-[#bf831c] font-semibold text-lg mb-6">
                {verificationEmail}
              </p>
              <div className="bg-[#fff9e5] border border-[#bf831c]/20 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-700 mb-2">
                  <strong>📧 Next steps:</strong>
                </p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Open your email inbox</li>
                  <li>
                    Click the <strong>"Verify My Email"</strong> button
                  </li>
                  <li>Come back here and sign in</li>
                </ol>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Didn't receive the email? Check your spam folder or click below
                to resend.
              </p>
              <Button
                onClick={handleResendVerification}
                disabled={resendLoading}
                variant="outline"
                className="border-[#bf831c] text-[#bf831c] hover:bg-[#bf831c] hover:text-white mb-3 w-full"
              >
                {resendLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {resendLoading ? "Sending..." : "Resend Verification Email"}
              </Button>
              {resendMessage && (
                <p className="text-sm text-green-600 mb-3">{resendMessage}</p>
              )}
              <Button
                onClick={() => setStep("login")}
                className="w-full bg-gradient-to-r from-[#bf831c] to-[#d4941f] hover:from-[#a6701a] hover:to-[#c0841c] text-white"
              >
                Go to Sign In
              </Button>
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
              onClick={() => setStep("select-type")}
              className="flex items-center space-x-2 text-[#bf831c] hover:text-[#a6701a] mb-6 transition-colors duration-200 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
              <span className="text-sm font-medium">
                Back to Business Type Selection
              </span>
            </button>

            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">{selectedType?.icon}</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Create Your Account
                </h2>
                <p className="text-gray-600 mt-2">
                  Registering as:{" "}
                  <span className="font-medium text-[#bf831c]">
                    {selectedType?.label}
                  </span>
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
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) =>
                      setFormData({ ...formData, businessName: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                    placeholder="Your Business Name"
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
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-[#fff9e5] via-white to-[#fff9e5] py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-[#bf831c] to-[#d4941f] rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {returningName
                    ? `Welcome Back, ${returningName}`
                    : "Welcome Back"}
                </h2>
                <p className="text-gray-600 mt-2">
                  {returningName
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
                    onClick={() => setStep("select-type")}
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
