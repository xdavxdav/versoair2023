/**
 * QuickSignIn — Modal overlay for fast authentication
 * Opens as a wildcard shortcut instead of full page redirect
 * Use anywhere: <QuickSignIn open={open} onClose={() => setOpen(false)} />
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  Music2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuthContext } from "@/contexts/AuthContext";

interface QuickSignInProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  redirectTo?: string;
}

export function QuickSignIn({
  open,
  onClose,
  onSuccess,
  redirectTo,
}: QuickSignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const { toast } = useToast();
  const { login, restoreAuth } = useAuthContext();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Champs requis",
        description: "Email et mot de passe requis",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const endpoint =
        mode === "signin" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || data.message || "Erreur d'authentification",
        );
      }

      toast({
        title: mode === "signin" ? "Connecté ✓" : "Compte créé ✓",
        description: `Bienvenue${data.user?.username ? `, ${data.user.username}` : ""}!`,
      });

      // Refresh auth state
      await restoreAuth();

      onClose();
      if (onSuccess) onSuccess();
      if (redirectTo) window.location.href = redirectTo;
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Connexion échouée",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo accounts for quick access
  const demoAccounts = [
    {
      label: "Superadmin",
      email: "superadmin@versoair.test",
      password: "admin123",
    },
    { label: "CEO", email: "ceo@versoair.test", password: "admin123" },
  ];

  const quickLogin = async (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");

      toast({
        title: "Connecté ✓",
        description: `Bienvenue, ${data.user?.username || "User"}!`,
      });
      await restoreAuth();
      onClose();
      if (onSuccess) onSuccess();
      if (redirectTo) window.location.href = redirectTo;
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md p-4"
          >
            <div className="bg-[#0f0a1a] border border-purple-500/30 rounded-2xl shadow-2xl shadow-purple-500/20 overflow-hidden">
              {/* Header */}
              <div className="relative p-6 pb-4 bg-gradient-to-br from-purple-900/40 via-fuchsia-900/20 to-transparent">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Music2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {mode === "signin"
                        ? "Connexion rapide"
                        : "Créer un compte"}
                    </h2>
                    <p className="text-sm text-white/50">Musical Universe</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/60" />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-500/50"
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-purple-400/60" />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Mot de passe"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-11 pr-11 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-purple-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-semibold shadow-lg shadow-purple-500/25"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : mode === "signin" ? (
                    "Se connecter"
                  ) : (
                    "Créer le compte"
                  )}
                </Button>

                {/* Toggle mode */}
                <p className="text-center text-sm text-white/50">
                  {mode === "signin" ? "Pas de compte?" : "Déjà un compte?"}{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setMode(mode === "signin" ? "signup" : "signin")
                    }
                    className="text-purple-400 hover:text-purple-300 font-medium"
                  >
                    {mode === "signin" ? "Créer un compte" : "Se connecter"}
                  </button>
                </p>

                {/* Quick access for dev */}
                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-white/30 text-center mb-3 flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" /> Accès rapide (dev)
                  </p>
                  <div className="flex gap-2">
                    {demoAccounts.map((acc) => (
                      <Button
                        key={acc.email}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => quickLogin(acc.email, acc.password)}
                        disabled={isLoading}
                        className="flex-1 text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/20 hover:text-white"
                      >
                        {acc.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default QuickSignIn;
