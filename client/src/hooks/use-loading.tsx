import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
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
  const [isLoading, setIsLoading] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Dismiss the initial cold-load overlay quickly (150ms visible → 300ms gone)
  useEffect(() => {
    const t1 = setTimeout(() => setIsFadingOut(true), 150);
    const t2 = setTimeout(() => {
      setIsLoading(false);
      setIsFadingOut(false);
    }, 300);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const showEagleLoader = useCallback((duration = 150) => {
    setIsLoading(true);
    setIsFadingOut(false);
    // After the main display duration, start the fade-out phase
    setTimeout(() => {
      setIsFadingOut(true);
      // CSS exit animation (150ms) before fully hiding
      setTimeout(() => {
        setIsLoading(false);
        setIsFadingOut(false);
      }, 150);
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
