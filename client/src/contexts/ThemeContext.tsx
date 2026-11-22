import { createContext, useContext, useEffect, useState } from "react";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  theme: ThemePreference;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = "verso_theme";

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: ThemePreference): ResolvedTheme {
  const resolvedTheme = theme === "system" ? getSystemTheme() : theme;
  const root = document.documentElement;
  root.classList.toggle("dark", resolvedTheme === "dark");
  root.classList.toggle("light", resolvedTheme === "light");
  root.style.colorScheme = resolvedTheme;
  return resolvedTheme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === "light" || saved === "dark" || saved === "system"
      ? saved
      : "light";
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    applyTheme(theme),
  );

  const setTheme = (nextTheme: ThemePreference) => {
    setThemeState(nextTheme);
    localStorage.setItem(THEME_KEY, nextTheme);
    setResolvedTheme(applyTheme(nextTheme));
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = () => {
      if (theme === "system") setResolvedTheme(applyTheme("system"));
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () =>
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme]);

  useEffect(() => {
    // An explicit choice made on this device (toggle or account settings) wins;
    // the saved account theme only seeds devices that never chose one.
    if (localStorage.getItem(THEME_KEY) !== null) return;
    const token =
      localStorage.getItem("auth_token") ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("token");
    if (!token) return;

    fetch("/auth/account/preferences", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (localStorage.getItem(THEME_KEY) !== null) return;
        const savedTheme = payload?.preferences?.theme;
        if (
          savedTheme === "light" ||
          savedTheme === "dark" ||
          savedTheme === "system"
        ) {
          setThemeState(savedTheme);
          setResolvedTheme(applyTheme(savedTheme));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    // Keep every open tab on the same theme when one of them switches.
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_KEY) return;
      const next =
        event.newValue === "dark" || event.newValue === "system"
          ? event.newValue
          : "light";
      setThemeState(next);
      setResolvedTheme(applyTheme(next));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const handleThemePreference = (event: Event) => {
      const nextTheme = (event as CustomEvent<ThemePreference>).detail;
      if (
        nextTheme === "light" ||
        nextTheme === "dark" ||
        nextTheme === "system"
      ) {
        setTheme(nextTheme);
      }
    };
    window.addEventListener("verso:theme-change", handleThemePreference);
    return () =>
      window.removeEventListener("verso:theme-change", handleThemePreference);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
