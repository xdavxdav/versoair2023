import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import ScrollToTop from "@/components/ScrollToTop";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  defaultViewport,
} from "@/lib/animations";
import { useScrollLock } from "@/hooks/use-scroll-lock";

// Community activities data
const COMMUNITY_ACTIVITIES = [
  {
    id: 1,
    title: "Volunteer",
    subtitle: "Share Your Skills",
    description:
      "Join our team of passionate volunteers helping artisan communities across Côte d'Ivoire. Share your expertise in business, technology, or marketing.",
    images: [
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
    ],
    cta: "Join Team",
    details:
      "Help mentor artisans, conduct workshops, or manage community projects. Work alongside passionate professionals making real impact.",
  },
  {
    id: 2,
    title: "Donate",
    subtitle: "Support Our Mission",
    description:
      "Help us empower businesses through better data insights and community development programs. Every contribution makes a difference.",
    images: [
      "https://images.unsplash.com/photo-1559027615-cd2628902d4a?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1559027615-cd2628902d4a?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1559027615-cd2628902d4a?w=800&h=600&fit=crop",
    ],
    cta: "Donate Now",
    details:
      "Your generous donation supports scholarships, equipment, and training programs for artisan communities.",
  },
  {
    id: 3,
    title: "Partner",
    subtitle: "Build With Us",
    description:
      "Build integrations and expand the Verso Air ecosystem. Partner with us to create innovative solutions.",
    images: [
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
    ],
    cta: "Learn More",
    details:
      "Join our partner ecosystem and help us build the future of African business intelligence.",
  },
  {
    id: 4,
    title: "Feedback",
    subtitle: "Shape the Future",
    description:
      "Your voice matters. Share your feedback and ideas to help shape the future of Verso Air.",
    images: [
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=600&fit=crop",
    ],
    cta: "Send Feedback",
    details:
      "We actively listen to our community. Share your suggestions to improve our platform.",
  },
];

// Carousel component for card images
function CardCarousel({ images }: { images: string[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000); // Auto-shift every 5 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  return (
    <div className="relative w-full h-64 md:h-72 overflow-hidden rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 group">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt="Activity"
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        />
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Image indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, idx) => (
          <motion.div
            key={idx}
            className={`h-1.5 rounded-full transition-all ${
              idx === currentIndex
                ? "bg-white w-6"
                : "bg-white/40 w-1.5 hover:bg-white/60 cursor-pointer"
            }`}
            onClick={() => setCurrentIndex(idx)}
          />
        ))}
      </div>
    </div>
  );
}

// Detail Modal
function DetailModal({
  activity,
  isOpen,
  onClose,
}: {
  activity: (typeof COMMUNITY_ACTIVITIES)[0] | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [carouselIndex, setCarouselIndex] = useState(0);

  useEffect(() => {
    if (!isOpen || !activity) return;

    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % (activity?.images.length || 3));
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen, activity]);

  if (!activity) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-slate-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-slate-700 shadow-2xl">
              {/* Close button */}
              <div className="sticky top-0 flex justify-end p-4 bg-slate-900/95 border-b border-slate-700 z-10">
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-slate-800 rounded-lg transition-colors"
                >
                  <X className="h-6 w-6 text-slate-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Photo carousel */}
                <div className="relative w-full h-80 rounded-xl overflow-hidden mb-8 bg-slate-800">
                  <AnimatePresence mode="wait">
                    <motion.img
                      key={carouselIndex}
                      src={activity.images[carouselIndex]}
                      alt={activity.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  </AnimatePresence>

                  {/* Indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {activity.images.map((_, idx) => (
                      <motion.button
                        key={idx}
                        className={`h-2 rounded-full transition-all ${
                          idx === carouselIndex
                            ? "bg-white w-6"
                            : "bg-white/40 w-2 hover:bg-white/60"
                        }`}
                        onClick={() => setCarouselIndex(idx)}
                      />
                    ))}
                  </div>
                </div>

                {/* Title and subtitle */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="mb-6"
                >
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    {activity.title}
                  </h2>
                  <p className="text-emerald-400 text-lg font-medium">
                    {activity.subtitle}
                  </p>
                </motion.div>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="text-slate-300 text-base leading-relaxed mb-6"
                >
                  {activity.details}
                </motion.p>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-slate-900 font-semibold py-3 px-8 rounded-lg">
                    {activity.cta}
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default function GetInvolved() {
  const [selectedActivity, setSelectedActivity] = useState<
    (typeof COMMUNITY_ACTIVITIES)[0] | null
  >(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  useScrollLock(isModalOpen);

  const openModal = (activity: (typeof COMMUNITY_ACTIVITIES)[0]) => {
    setSelectedActivity(activity);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setSelectedActivity(null), 300);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-4 overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 right-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-[95vw] mx-auto z-10">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            className="text-center mb-4"
          >
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-4 py-2 mb-6">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-emerald-300 text-sm font-medium">
                Join the Movement
              </span>
            </div>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 text-center leading-tight"
          >
            Get Involved
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
            className="text-xl text-slate-300 text-center max-w-2xl mx-auto leading-relaxed"
          >
            Be part of something bigger. Join our community and help empower
            businesses across Africa.
          </motion.p>
        </div>
      </section>

      {/* ONG Culturelle Banner */}
      <section className="py-16 px-4 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border-y border-amber-500/30">
        <div className="max-w-[95vw] mx-auto">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-center"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Découvrez Notre ONG Culturelle
            </h2>
            <p className="text-slate-300 mb-6 max-w-2xl mx-auto">
              Célébrer la culture africaine. Partager les talents. Unir le monde
              à travers la musique, l'art et la tradition.
            </p>
            <Link href="/ong-culturelle">
              <Button className="bg-amber-600 hover:bg-amber-700 text-slate-900 font-semibold py-3 px-8 rounded-lg">
                En Savoir Plus
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Activity Cards - Carousel Style */}
      <section className="py-20 px-4">
        <div className="max-w-[95vw] mx-auto">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 lg:gap-10"
          >
            {COMMUNITY_ACTIVITIES.map((activity) => (
              <motion.div
                key={activity.id}
                variants={staggerItem}
                className="group cursor-pointer"
                onClick={() => openModal(activity)}
              >
                <div className="space-y-4 h-full">
                  {/* Carousel */}
                  <div className="relative rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-500">
                    <CardCarousel images={activity.images} />

                    {/* Hover overlay */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center rounded-lg"
                    >
                      <Button
                        variant="outline"
                        className="border-white text-slate-900 bg-white/10 hover:bg-white/20 backdrop-blur"
                      >
                        View Details
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </motion.div>
                  </div>

                  {/* Text Content - Minimalist */}
                  <div className="space-y-2 px-1">
                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-emerald-400 transition-colors">
                      {activity.title}
                    </h3>
                    <p className="text-emerald-400 text-sm font-medium">
                      {activity.subtitle}
                    </p>
                    <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 pt-2">
                      {activity.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-slate-800/30 border-y border-slate-700">
        <div className="max-w-[95vw] mx-auto">
          <motion.h2
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="text-3xl md:text-4xl font-bold text-slate-900 text-center mb-16"
          >
            Community Benefits
          </motion.h2>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              "Exclusive webinars and training",
              "Early access to new features",
              "Direct line to our product team",
              "Community recognition and badges",
              "Networking opportunities",
              "Special discounts on premium plans",
            ].map((benefit, idx) => (
              <motion.div
                key={idx}
                variants={staggerItem}
                className="flex items-start gap-4 p-4 rounded-lg bg-slate-900/50 border border-slate-700 hover:border-emerald-500/30 transition-colors"
              >
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-2 flex-shrink-0" />
                <p className="text-slate-300 font-medium">{benefit}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            whileInView="visible"
            viewport={defaultViewport}
            className="relative p-12 rounded-2xl bg-gradient-to-br from-emerald-600/20 via-teal-600/10 to-cyan-600/20 border border-emerald-500/30 backdrop-blur-sm overflow-hidden"
          >
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 text-center">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">
                Ready to Make an Impact?
              </h2>
              <p className="text-slate-300 mb-8 text-lg">
                Join thousands of community members making a real difference
              </p>
              <Link href="/contact">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-slate-900 font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-emerald-500/50 transition-all">
                  Get Started
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Detail Modal */}
      <DetailModal
        activity={selectedActivity}
        isOpen={isModalOpen}
        onClose={closeModal}
      />

      <ScrollToTop />
    </div>
  );
}
