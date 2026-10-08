import { useState } from "react";
import { Button } from "./button";
import { ChevronDown, ChevronRight, Quote, X } from "lucide-react";

export default function TestimonialsFloating() {
  const [isMinimized, setIsMinimized] = useState(true);
  const [isClosed, setIsClosed] = useState(false);

  if (isClosed) {
    return (
      <div className="fixed bottom-2 left-2 z-50 sm:bottom-6 sm:left-6">
        <Button
          onClick={() => {
            setIsClosed(false);
            setIsMinimized(false);
          }}
          aria-label="Open user reviews"
          className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-secondary p-0 text-white shadow-lg transition-all duration-300 hover:shadow-xl sm:h-12 sm:w-12"
        >
          <Quote className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-2 left-2 z-50 sm:bottom-6 sm:left-6">
        <Button
          onClick={() => setIsMinimized(false)}
          aria-label="Expand user reviews"
          className="h-12 w-12 rounded-full bg-gradient-to-r from-primary to-secondary p-0 text-white shadow-lg transition-all duration-300 hover:shadow-xl sm:w-auto sm:rounded-xl sm:px-4"
        >
          <Quote className="h-5 w-5 sm:mr-2" />
          <span className="hidden sm:inline">User reviews</span>
          <ChevronRight className="hidden h-4 w-4 sm:ml-2 sm:block" />
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-2 left-2 z-50 sm:bottom-6 sm:left-6">
      <div
        className="flex max-h-[45svh] w-[min(20rem,calc(100vw-1rem))] flex-col overflow-hidden rounded-xl border bg-white shadow-2xl transition-all duration-300 sm:max-h-[55svh]"
      >
        <div className="flex items-center justify-between rounded-t-xl border-b bg-gradient-to-r from-primary/5 to-secondary/5 p-3 sm:p-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-primary to-secondary sm:flex">
              <Quote className="h-3 w-3 text-white sm:h-4 sm:w-4" />
            </div>
            <span className="truncate text-sm font-semibold text-gray-800 sm:text-base">
              User reviews
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Collapse user reviews"
              onClick={() => setIsMinimized(true)}
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close user reviews"
              onClick={() => setIsClosed(true)}
              className="h-8 w-8 text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          <p className="mb-4 text-sm leading-relaxed text-gray-700">
            A client or user testimonial will appear here after it has been
            received and approved for publication.
          </p>
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-800">
              Testimonials coming soon
            </p>
            <p className="text-xs text-gray-500">
              Reviews will be published after approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
