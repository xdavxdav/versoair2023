import { useCallback, useEffect, useState } from "react";
import { CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  GEOADMIN_PLAN_DETAILS,
  GEOADMIN_PLAN_ORDER,
} from "@/lib/geoadmin-pricing";
import { TIERS, type TierKey } from "@/lib/tiers";
import { Button } from "@/components/ui/button";

interface GeoAdminPlanCarouselProps {
  selectedTier: TierKey;
  onSelect: (tier: TierKey) => void;
  formatPrice: (tier: TierKey) => string;
  dark?: boolean;
  actionLabel?: string;
}

export default function GeoAdminPlanCarousel({
  selectedTier,
  onSelect,
  formatPrice,
  dark = false,
  actionLabel = "Select this plan",
}: GeoAdminPlanCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [activeIndex, setActiveIndex] = useState(
    GEOADMIN_PLAN_ORDER.indexOf(selectedTier),
  );
  const handleApi = useCallback((carouselApi: CarouselApi) => {
    setApi(carouselApi);
  }, []);

  useEffect(() => {
    if (!api) return;
    const updateActiveIndex = () => {
      const index = api.selectedScrollSnap();
      setActiveIndex(index);
      onSelect(GEOADMIN_PLAN_ORDER[index]);
    };
    updateActiveIndex();
    api.on("select", updateActiveIndex);
    return () => {
      api.off("select", updateActiveIndex);
    };
  }, [api, onSelect]);

  useEffect(() => {
    const selectedIndex = GEOADMIN_PLAN_ORDER.indexOf(selectedTier);
    if (selectedIndex >= 0 && selectedIndex !== activeIndex) {
      api?.scrollTo(selectedIndex);
    }
  }, [activeIndex, api, selectedTier]);

  const colors = dark
    ? {
        card: "border-white/10 bg-slate-900/80",
        title: "text-white",
        description: "text-slate-300",
        price: "text-amber-200",
        benefit: "text-slate-200",
        activeDot: "bg-amber-300",
        inactiveDot: "bg-white/25 hover:bg-white/50",
        arrow: "border-white/20 bg-slate-900 text-white hover:bg-slate-800",
        selection: "border-amber-300 bg-amber-300/10 text-amber-100",
        label: "text-slate-400",
      }
    : {
        card: "border-slate-200 bg-white",
        title: "text-slate-900",
        description: "text-slate-600",
        price: "text-emerald-800",
        benefit: "text-slate-700",
        activeDot: "bg-emerald-700",
        inactiveDot: "bg-slate-300 hover:bg-slate-500",
        arrow: "border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        selection: "border-emerald-700 bg-emerald-50 text-emerald-900",
        label: "text-slate-500",
      };

  return (
    <div aria-label="GeoAdmin plan options">
      <Carousel
        setApi={handleApi}
        opts={{ align: "start", startIndex: activeIndex }}
        tabIndex={0}
        className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        <CarouselContent className="ml-0">
          {GEOADMIN_PLAN_ORDER.map((tier) => {
            const annualPrice = formatPrice(tier);
            const hasAnnualPrice = tier !== "enterprise";
            return (
              <CarouselItem key={tier} className="pl-0">
                <article
                  className={`flex min-h-[310px] flex-col rounded-2xl border p-5 shadow-lg sm:min-h-[330px] sm:p-7 ${colors.card}`}
                  aria-label={`${TIERS[tier].name} plan`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p
                        className={`text-xs font-semibold uppercase tracking-[0.18em] ${colors.label}`}
                      >
                        GeoAdmin annual plan
                      </p>
                      <h3 className={`mt-1 text-2xl font-bold sm:text-3xl ${colors.title}`}>
                        {TIERS[tier].name}
                      </h3>
                    </div>
                    {TIERS[tier].popular && (
                      <span
                        className={`rounded-full bg-amber-300/15 px-3 py-1 text-xs font-bold uppercase ${
                          dark ? "text-amber-200" : "text-amber-800"
                        }`}
                      >
                        Popular
                      </span>
                    )}
                  </div>
                  <p className={`mt-3 text-base leading-relaxed ${colors.description}`}>
                    {GEOADMIN_PLAN_DETAILS[tier].shortDescription}
                  </p>
                  <p className={`mt-4 text-xl font-bold sm:text-2xl ${colors.price}`}>
                    {annualPrice}
                    {hasAnnualPrice && (
                      <span className={`text-sm font-normal ${colors.label}`}>
                        {" "}
                        / year
                      </span>
                    )}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {GEOADMIN_PLAN_DETAILS[tier].benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className={`flex items-start gap-2 text-sm leading-relaxed ${colors.benefit}`}
                      >
                        <CheckCircle
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                        />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    type="button"
                    variant="outline"
                    aria-pressed={selectedTier === tier}
                    onClick={() => onSelect(tier)}
                    className={`mt-5 min-h-11 w-full whitespace-normal text-center ${colors.selection}`}
                  >
                    {actionLabel}
                  </Button>
                </article>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      <div className="mt-4 flex items-center justify-center gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Previous GeoAdmin plan"
          disabled={activeIndex === 0}
          onClick={() => api?.scrollPrev()}
          className={`h-11 w-11 rounded-full ${colors.arrow}`}
        >
          <ChevronLeft aria-hidden="true" className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2" aria-label="Choose a plan">
          {GEOADMIN_PLAN_ORDER.map((tier, index) => (
            <button
              key={tier}
              type="button"
              aria-label={`Show ${TIERS[tier].name} plan`}
              aria-current={activeIndex === index ? "true" : undefined}
              onClick={() => api?.scrollTo(index)}
              className={`h-3 w-3 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 ${colors.inactiveDot} ${
                activeIndex === index ? colors.activeDot : ""
              }`}
            />
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Next GeoAdmin plan"
          disabled={activeIndex === GEOADMIN_PLAN_ORDER.length - 1}
          onClick={() => api?.scrollNext()}
          className={`h-11 w-11 rounded-full ${colors.arrow}`}
        >
          <ChevronRight aria-hidden="true" className="h-5 w-5" />
        </Button>
      </div>
      <p className={`mt-2 text-center text-xs ${colors.label}`}>
        Swipe, use the arrows, or focus the carousel and press the left/right arrow keys.
      </p>
    </div>
  );
}
