import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle({
  className = "",
  iconClassName = "h-4 w-4",
}: {
  className?: string;
  iconClassName?: string;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      data-testid="theme-toggle"
      className={`inline-flex items-center justify-center rounded-full p-1.5 transition-colors hover:text-amber-200 ${className}`}
    >
      {isDark ? (
        <Sun className={iconClassName} aria-hidden="true" />
      ) : (
        <Moon className={iconClassName} aria-hidden="true" />
      )}
    </button>
  );
}
