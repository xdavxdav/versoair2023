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

  // Dismiss the initial cold-load overlay after 5s
  useEffect(() => {
    const t1 = setTimeout(() => setIsFadingOut(true), 5000);
    const t2 = setTimeout(() => {
      setIsLoading(false);
      setIsFadingOut(false);
    }, 5400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

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
