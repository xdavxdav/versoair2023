import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";

interface LoadingContextType {
  isLoading: boolean;
  isFadingOut: boolean;
  setIsLoading: (loading: boolean) => void;
  showEagleLoader: (duration?: number) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const showEagleLoader = useCallback((duration = 900) => {
    setIsLoading(true);
    setIsFadingOut(false);
    // After the main display duration, start the fade-out phase
    setTimeout(() => {
      setIsFadingOut(true);
      // Wait for the CSS exit animation (400ms) before fully hiding
      setTimeout(() => {
        setIsLoading(false);
        setIsFadingOut(false);
      }, 400);
    }, duration);
  }, []);

  return (
    <LoadingContext.Provider
      value={{ isLoading, isFadingOut, setIsLoading, showEagleLoader }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}
