import { CheckCircle2, Circle } from "lucide-react";

interface PasswordStrengthMeterProps {
  password: string;
  variant?: "light" | "dark";
}

const strengthChecks = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One number", test: (value: string) => /[0-9]/.test(value) },
  { label: "12 or more characters (recommended)", test: (value: string) => value.length >= 12 },
  { label: "One lowercase letter (recommended)", test: (value: string) => /[a-z]/.test(value) },
  { label: "One symbol (recommended)", test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export function PasswordStrengthMeter({
  password,
  variant = "light",
}: PasswordStrengthMeterProps) {
  if (!password) return null;

  const checks = strengthChecks.map(({ label, test }) => ({
    label,
    passed: test(password),
  }));
  const completed = checks.filter((check) => check.passed).length;
  const strength =
    completed <= 1
      ? "Very weak"
      : completed <= 3
        ? "Fair"
        : completed <= 5
          ? "Good"
          : "Strong";
  const barColor =
    completed <= 1
      ? "bg-red-500"
      : completed <= 3
        ? "bg-amber-500"
        : "bg-emerald-500";
  const textColor = variant === "dark" ? "text-white/70" : "text-gray-600";
  const pendingColor = variant === "dark" ? "text-white/40" : "text-gray-400";
  const emptyBar = variant === "dark" ? "bg-white/10" : "bg-gray-200";

  return (
    <div className="mt-2 space-y-2">
      <div
        role="meter"
        aria-label={`Password strength: ${strength}`}
        aria-valuemin={0}
        aria-valuemax={checks.length}
        aria-valuenow={completed}
        className="flex gap-1"
      >
        {checks.map((check, index) => (
          <div
            key={check.label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              index < completed ? barColor : emptyBar
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColor}`}>
        Password strength: {strength} ({completed}/{checks.length})
      </p>
      <p className={`text-xs ${pendingColor}`}>
        Use a unique password and avoid personal or account details.
      </p>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {checks.map(({ label, passed }) => (
          <li
            key={label}
            className={`flex items-center gap-1.5 text-xs ${
              passed ? "text-emerald-500" : pendingColor
            }`}
          >
            {passed ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            ) : (
              <Circle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
