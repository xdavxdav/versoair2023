import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Sparkles,
  ArrowRight,
  Music,
  Globe,
  Crown,
  MessageSquare,
  Building2,
  Briefcase,
  Star,
  Zap,
  Heart,
  Gift,
  Trophy,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Confetti from "react-confetti";

interface PortalConfig {
  id: string;
  name: string;
  gradient: string;
  icon: React.ElementType;
  redirectPath: string;
}

interface SuccessCelebrationProps {
  portal: PortalConfig;
  userName: string;
  onComplete: () => void;
  countdownSeconds?: number;
}

// Portal-specific celebration messages
const PORTAL_MESSAGES: Record<
  string,
  {
    headline: string;
    subheadline: string;
    features: string[];
    ctaText: string;
    emoji: string;
  }
> = {
  general: {
    headline: "Bienvenue dans l'univers Verso Air!",
    subheadline: "Votre compte est prêt. Explorez tout ce qui vous attend.",
    features: [
      "Parcourez notre répertoire d'entreprises",
      "Effectuez des réservations en un clic",
      "Sauvegardez vos favoris",
      "Laissez des avis authentiques",
      "Accédez au Marketplace",
    ],
    ctaText: "Explorer maintenant",
    emoji: "🌍",
  },
  artist: {
    headline: "Bienvenue au Verso Air™ Music Label!",
    subheadline: "Votre voyage musical commence ici. Le monde vous attend.",
    features: [
      "Téléversez vos morceaux illimités",
      "Suivez vos streams en temps réel",
      "Participez au StreamRoyale",
      "Recevez vos royalties",
      "Obtenez votre badge artiste",
    ],
    ctaText: "Accéder au portail artiste",
    emoji: "🎵",
  },
  subscriber: {
    headline: "Bienvenue, membre Premium!",
    subheadline: "Vous avez débloqué des fonctionnalités exclusives.",
    features: [
      "Support prioritaire 24/7",
      "Analytics avancées",
      "Accès GeoAdmin complet",
      "Badge Premium visible",
      "Gestion des litiges prioritaire",
    ],
    ctaText: "Accéder au tableau de bord",
    emoji: "👑",
  },
  community: {
    headline: "Bienvenue dans la communauté Artisans!",
    subheadline: "Partagez votre savoir-faire avec le monde entier.",
    features: [
      "Créez votre profil artisan",
      "Publiez votre portfolio",
      "Connectez-vous avec d'autres créateurs",
      "Recevez des commandes",
      "Accédez au blog communautaire",
    ],
    ctaText: "Créer mon profil",
    emoji: "🎨",
  },
  contractor: {
    headline: "Bienvenue, Professionnel!",
    subheadline: "Trouvez vos premiers projets dès aujourd'hui.",
    features: [
      "Parcourez les offres de projets",
      "Créez votre portfolio professionnel",
      "Gérez vos contrats",
      "Définissez vos tarifs",
      "Connectez-vous avec des entreprises",
    ],
    ctaText: "Voir les projets",
    emoji: "🔧",
  },
  business: {
    headline: "Bienvenue, Propriétaire d'entreprise!",
    subheadline: "Développez votre visibilité sur Verso Air.",
    features: [
      "Créez votre fiche entreprise",
      "Répondez aux avis clients",
      "Accédez à vos analytics",
      "Gérez vos réservations",
      "Boostez votre visibilité",
    ],
    ctaText: "Configurer mon entreprise",
    emoji: "🏢",
  },
};

// Floating particle component
const FloatingParticle = ({
  delay,
  size,
  x,
}: {
  delay: number;
  size: number;
  x: number;
}) => (
  <motion.div
    initial={{ y: "100vh", opacity: 0, x }}
    animate={{
      y: "-100vh",
      opacity: [0, 1, 1, 0],
      x: x + Math.random() * 100 - 50,
    }}
    transition={{
      duration: 4 + Math.random() * 2,
      delay,
      repeat: Infinity,
      ease: "easeOut",
    }}
    className="absolute pointer-events-none"
    style={{ left: `${x}%` }}
  >
    <Sparkles className="text-white/30" style={{ width: size, height: size }} />
  </motion.div>
);

export default function SuccessCelebration({
  portal,
  userName,
  onComplete,
  countdownSeconds = 8,
}: SuccessCelebrationProps) {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [showConfetti, setShowConfetti] = useState(true);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const messages = PORTAL_MESSAGES[portal.id] || PORTAL_MESSAGES.general;
  const PortalIcon = portal.icon;

  // Window size for confetti
  useEffect(() => {
    const updateSize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) {
      onComplete();
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, onComplete]);

  // Stop confetti after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br ${portal.gradient} overflow-hidden`}
      >
        {/* Confetti */}
        {showConfetti && (
          <Confetti
            width={windowSize.width}
            height={windowSize.height}
            recycle={false}
            numberOfPieces={300}
            gravity={0.15}
            colors={["#fff", "#ffd700", "#ff69b4", "#00ffff", "#90ee90"]}
          />
        )}

        {/* Floating particles background */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 15 }).map((_, i) => (
            <FloatingParticle
              key={i}
              delay={i * 0.3}
              size={12 + Math.random() * 20}
              x={Math.random() * 100}
            />
          ))}
        </div>

        {/* Radial glow */}
        <div className="absolute inset-0 bg-gradient-radial from-white/10 via-transparent to-transparent" />

        {/* Main content */}
        <div className="relative z-10 max-w-lg mx-auto px-6 text-center">
          {/* Animated checkmark → Icon morph */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.2,
            }}
            className="mx-auto mb-8"
          >
            <div className="relative">
              {/* Outer ring pulse */}
              <motion.div
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 rounded-full bg-white/30"
                style={{ width: 120, height: 120 }}
              />

              {/* Icon container */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="relative w-[120px] h-[120px] rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center border-2 border-white/40"
              >
                <motion.div
                  initial={{ scale: 1.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                >
                  <PortalIcon className="w-14 h-14 text-white" />
                </motion.div>
              </motion.div>

              {/* Success check badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
                className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-lg"
              >
                <Check className="w-6 h-6 text-white" />
              </motion.div>
            </div>
          </motion.div>

          {/* Emoji */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-5xl mb-4"
          >
            {messages.emoji}
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-3xl md:text-4xl font-bold text-white mb-3 notranslate"
          >
            {messages.headline}
          </motion.h1>

          {/* User greeting */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xl text-white/90 mb-2"
          >
            Bonjour, <span className="font-semibold">{userName || "ami"}</span>!
            👋
          </motion.p>

          {/* Subheadline */}
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="text-white/70 mb-8"
          >
            {messages.subheadline}
          </motion.p>

          {/* Features unlocked */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <Gift className="w-5 h-5 text-yellow-300" />
              <span className="text-white font-semibold">
                Fonctionnalités débloquées
              </span>
            </div>
            <ul className="space-y-2 text-left">
              {messages.features.map((feature, index) => (
                <motion.li
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1 + index * 0.1 }}
                  className="flex items-center gap-2 text-white/90 text-sm"
                >
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span
                    dangerouslySetInnerHTML={{
                      __html: feature
                        .replace(
                          /StreamRoyale/g,
                          '<span class="notranslate">StreamRoyale</span>',
                        )
                        .replace(
                          /Marketplace/g,
                          '<span class="notranslate">Marketplace</span>',
                        )
                        .replace(
                          /GeoAdmin/g,
                          '<span class="notranslate">GeoAdmin</span>',
                        )
                        .replace(
                          /Verso Air/g,
                          '<span class="notranslate">Verso Air</span>',
                        ),
                    }}
                  />
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <Button
              onClick={onComplete}
              size="lg"
              className="bg-white text-slate-900 hover:bg-white/90 font-semibold px-8 py-6 text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all"
            >
              {messages.ctaText}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>

          {/* Countdown */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
            className="mt-6 text-white/50 text-sm"
          >
            Redirection automatique dans{" "}
            <span className="font-mono text-white/70">{countdown}s</span>
          </motion.p>

          {/* Skip link */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.5 }}
            onClick={onComplete}
            className="mt-2 text-white/40 hover:text-white/60 text-xs underline transition-colors"
          >
            Passer cette animation
          </motion.button>
        </div>

        {/* Corner decorations */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: "spring" }}
          className="absolute top-8 left-8"
        >
          <Star className="w-8 h-8 text-yellow-300/50" />
        </motion.div>
        <motion.div
          initial={{ scale: 0, rotate: 45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.4, type: "spring" }}
          className="absolute top-8 right-8"
        >
          <Rocket className="w-8 h-8 text-white/30" />
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="absolute bottom-8 left-8"
        >
          <Heart className="w-6 h-6 text-pink-300/40" />
        </motion.div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6, type: "spring" }}
          className="absolute bottom-8 right-8"
        >
          <Trophy className="w-7 h-7 text-amber-300/40" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
