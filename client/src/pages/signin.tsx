import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthContext } from "@/contexts/AuthContext";

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
  const [step, setStep] = useState("select-type"); // 'select-type', 'login', 'register', 'forgot-password', 'reset-sent', 'mfa'
  const [selectedBusinessType, setSelectedBusinessType] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mfaCode, setMfaCode] = useState(["", "", "", "", "", ""]);
  const [resetError, setResetError] = useState("");
  const [, navigate] = useLocation();
  const { login: authLogin } = useAuthContext();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    businessName: "",
    phone: "",
  });

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
      if (data.success && data.token && data.user) {
        // Use AuthContext to persist login across page refreshes
        authLogin(data.token, {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
        });
        localStorage.setItem("signin_timestamp", new Date().toISOString());

        const redirectTarget = getQueryParam("redirect");
        if (redirectTarget === "sponsor") {
          navigate("/sponsor");
        } else {
          navigate("/dashboard");
        }
      } else {
        alert(data.message || "Invalid credentials");
      }
    } catch (error) {
      console.error("Sign in error:", error);
      alert("Sign in failed. Please try again.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
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
      if (data.success && data.token && data.user) {
        // Use AuthContext to persist registration/login
        authLogin(data.token, {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
        });
        localStorage.setItem("signin_timestamp", new Date().toISOString());

        const redirectTarget = getQueryParam("redirect");
        if (redirectTarget === "sponsor") {
          navigate("/sponsor");
        } else {
          navigate("/dashboard");
        }
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Register error:", error);
      alert("Registration failed. Please try again.");
    }
  };

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
              <Link href="/">
                <Button
                  variant="ghost"
                  className="text-[#bf831c] hover:text-[#a6701a]"
                >
                  ← Back to Home
                </Button>
              </Link>
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                      placeholder="john@business.com"
                    />
                  </div>
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                      placeholder="+1 (555) 123-4567"
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
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#bf831c] focus:border-transparent"
                      placeholder="Confirm your password"
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-[#bf831c] to-[#d4941f] hover:from-[#a6701a] hover:to-[#c0841c] text-white py-3 rounded-lg font-medium"
                  type="submit"
                >
                  Create Account
                </Button>
              </form>

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
                  Welcome Back
                </h2>
                <p className="text-gray-600 mt-2">Sign in to your account</p>
              </div>

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
