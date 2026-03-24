import { useState, useEffect } from "react";
import { Button } from "./button";
import { X, ChevronLeft, ChevronRight, Star, Quote } from "lucide-react";

interface Testimonial {
  id: number;
  name: string;
  title: string;
  company: string;
  message: string;
  rating: number;
  industry: string;
}

const testimonials: Testimonial[] = [
  {
    id: 1,
    name: "Sarah Chen",
    title: "PDG",
    company: "TechFlow Solutions",
    message: "Cette plateforme a transformé notre processus décisionnel. Nous disposons désormais d'analyses en temps réel qui nous aident à anticiper les tendances du marché et à optimiser nos opérations efficacement.",
    rating: 5,
    industry: "Technologie"
  },
  {
    id: 2,
    name: "Marcus Johnson",
    title: "Directeur des opérations",
    company: "Global Hotels Group",
    message: "Les analyses d'hôtellerie sont incroyables. Nous avons augmenté nos taux d'occupation de 23 % et nos scores de satisfaction client de 18 % depuis la mise en place de ce système.",
    rating: 5,
    industry: "Hôtellerie"
  },
  {
    id: 3,
    name: "Elena Rodriguez",
    title: "Responsable financier",
    company: "Metro Construction",
    message: "Le suivi de projets et l'optimisation des ressources nous ont permis d'économiser plus de 2 M$ l'an dernier. Les rapports en temps réel nous aident à prendre des décisions critiques plus rapidement que jamais.",
    rating: 5,
    industry: "Construction"
  },
  {
    id: 4,
    name: "David Kim",
    title: "Responsable analytique",
    company: "Retail Plus",
    message: "Plateforme exceptionnelle pour l'analytique commerce. Nos taux de conversion ont progressé de 35 % et la gestion des stocks est devenue fluide. Hautement recommandé pour toute entreprise de détail.",
    rating: 5,
    industry: "Commerce de détail"
  },
  {
    id: 5,
    name: "Amanda Foster",
    title: "VP des opérations",
    company: "AutoMax Dealerships",
    message: "Les analyses du secteur automobile sont parfaites. Nous avons optimisé la gestion de notre flotte et nos processus de vente, ce qui a entraîné une hausse de 28 % du chiffre d'affaires trimestriel.",
    rating: 5,
    industry: "Automobile"
  }
];

export default function TestimonialsFloating() {
  const [isVisible, setIsVisible] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    // Check if testimonials have been shown before
    const hasSeenTestimonials = localStorage.getItem('hasSeenTestimonials');
    
    if (!hasSeenTestimonials) {
      // Show the testimonials box after 3 seconds on first visit
      const timer = setTimeout(() => {
        setIsVisible(true);
        localStorage.setItem('hasSeenTestimonials', 'true');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // Auto-rotate testimonials every 8 seconds when not minimized
    if (!isMinimized && isVisible) {
      const interval = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
      }, 8000);

      return () => clearInterval(interval);
    }
  }, [isMinimized, isVisible]);

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const currentTestimonial = testimonials[currentIndex];

  if (!isVisible) return null;

  // Show reopener button when closed
  if (isClosed) {
    return (
      <div className="fixed bottom-2 sm:bottom-6 left-2 sm:left-6 z-50">
        <Button
          onClick={() => setIsClosed(false)}
          className="bg-gradient-to-r from-primary to-secondary text-white p-2 sm:p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group"
        >
          <Quote className="h-4 w-4 sm:h-5 sm:w-5 group-hover:scale-110 transition-transform" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-2 sm:bottom-6 left-2 sm:left-6 z-50">
      <div className={`bg-white rounded-xl shadow-2xl border transition-all duration-500 ease-in-out ${
        isMinimized ? 'w-72 sm:w-80 h-16' : 'w-80 sm:w-96 h-72 sm:h-80'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-gradient-to-r from-primary/5 to-secondary/5 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-primary to-secondary rounded-full flex items-center justify-center">
              <Quote className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
            </div>
            <span className="font-semibold text-gray-800 text-sm sm:text-base">Avis clients</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMinimized(!isMinimized)}
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
            >
              {isMinimized ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsClosed(true)}
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="p-3 sm:p-6 flex flex-col h-56 sm:h-64">
            {/* Rating Stars */}
            <div className="flex items-center gap-1 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < currentTestimonial.rating
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
              <span className="text-sm text-gray-500 ml-2">({currentTestimonial.rating}/5)</span>
            </div>

            {/* Testimonial Message */}
            <div className="flex-1 mb-4">
              <p className="text-gray-700 text-sm leading-relaxed italic">
                "{currentTestimonial.message}"
              </p>
            </div>

            {/* Client Info */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 text-sm">{currentTestimonial.name}</h4>
                  <p className="text-xs text-gray-500">{currentTestimonial.title}, {currentTestimonial.company}</p>
                  <p className="text-xs text-primary font-medium">{currentTestimonial.industry}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={prevTestimonial}
                    className="h-8 w-8 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-gray-400">
                    {currentIndex + 1}/{testimonials.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={nextTestimonial}
                    className="h-8 w-8 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Minimized Content - Completely hidden when minimized */}

        {/* Progress Indicator */}
        {!isMinimized && (
          <div className="px-6 pb-4">
            <div className="flex gap-1">
              {testimonials.map((_, index) => (
                <div
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                    index === currentIndex ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}