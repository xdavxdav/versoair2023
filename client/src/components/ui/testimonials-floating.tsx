import { useState } from "react";
import { Button } from "./button";
import { ChevronLeft, ChevronRight, Quote, X } from "lucide-react";

export default function TestimonialsFloating() {
  const [isMinimized, setIsMinimized] = useState(true);
  const [isClosed, setIsClosed] = useState(false);

  if (isClosed) {
    return (
      <div className="fixed bottom-2 left-2 z-50 sm:bottom-6 sm:left-6">
        <Button
          onClick={() => setIsClosed(false)}
          aria-label="Open testimonials placeholder"
          className="rounded-full bg-gradient-to-r from-primary to-secondary p-2 text-white shadow-lg transition-all duration-300 hover:shadow-xl sm:p-3"
        >
          <Quote className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-2 left-2 z-50 sm:bottom-6 sm:left-6">
      <div
        className={`max-w-[calc(100vw-1rem)] rounded-xl border bg-white shadow-2xl transition-all duration-300 ${
          isMinimized
            ? "h-12 w-12 sm:h-16 sm:w-72"
            : "max-h-[45svh] w-[min(24rem,calc(100vw-1rem))] overflow-y-auto sm:min-h-64 sm:max-h-none sm:overflow-visible"
        }`}
      >
        <div
          className={`flex items-center justify-between rounded-t-xl border-b bg-gradient-to-r from-primary/5 to-secondary/5 ${
            isMinimized ? "p-0 sm:p-4" : "p-3 sm:p-4"
          }`}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="Expand testimonials"
            onClick={() => setIsMinimized(false)}
            className="h-12 w-12 rounded-xl bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 hover:bg-primary sm:hidden"
          >
            <Quote className="h-5 w-5" />
          </Button>
          <div
            className={`items-center gap-2 ${
              isMinimized ? "hidden sm:flex" : "flex"
            }`}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary sm:h-8 sm:w-8">
              <Quote className="h-3 w-3 text-white sm:h-4 sm:w-4" />
            </div>
            <span className="text-sm font-semibold text-gray-800 sm:text-base">
              Avis clients et utilisateurs
            </span>
          </div>
          <div
            className={`items-center gap-1 ${
              isMinimized ? "hidden sm:flex" : "flex"
            }`}
          >
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                isMinimized ? "Expand testimonials" : "Collapse testimonials"
              }
              onClick={() => setIsMinimized((minimized) => !minimized)}
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
            >
              {isMinimized ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close testimonials"
              onClick={() => setIsClosed(true)}
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {!isMinimized && (
          <div className="p-4 sm:p-6">
            <p className="mb-4 text-sm leading-relaxed text-gray-700">
              A client or user testimonial will appear here after it has been
              received and approved for publication.
            </p>
            <div className="border-t pt-4">
              <p className="text-sm font-semibold text-gray-800">
                Témoignages à venir
              </p>
              <p className="text-xs text-gray-500">
                Les témoignages seront publiés après approbation.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
