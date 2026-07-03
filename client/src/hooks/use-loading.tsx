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

  // Dismiss the initial cold-load overlay fast (50ms visible → 180ms gone)
  useEffect(() => {
    const t1 = setTimeout(() => setIsFadingOut(true), 50);
    const t2 = setTimeout(() => {
      setIsLoading(false);
      setIsFadingOut(false);
    }, 180);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const showEagleLoader = useCallback((duration = 80) => {
    setIsLoading(true);
    setIsFadingOut(false);
    setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        setIsLoading(false);
        setIsFadingOut(false);
      }, 120);
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
