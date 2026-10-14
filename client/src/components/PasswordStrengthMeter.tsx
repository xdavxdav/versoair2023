import { CheckCircle2, Circle, XCircle } from "lucide-react";
import {
  checkPasswordLength,
  checkPasswordNumber,
  checkPasswordUpper,
} from "@/lib/auth-validation";

interface PasswordStrengthMeterProps {
  password: string;
  variant?: "light" | "dark";
}

const requiredChecks = [
  { label: "At least 8 characters", test: checkPasswordLength },
  { label: "One uppercase letter (A–Z)", test: checkPasswordUpper },
  { label: "One number (0–9)", test: checkPasswordNumber },
];

const recommendedChecks = [
  {
    label: "12 or more characters",
    test: (value: string) => value.length >= 12,
  },
  {
    label: "One lowercase letter",
    test: (value: string) => /[a-z]/.test(value),
  },
  {
    label: "One symbol",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
];

export function PasswordStrengthMeter({
  password,
  variant = "light",
}: PasswordStrengthMeterProps) {
  if (!password) return null;

  const required = requiredChecks.map((check) => ({
    ...check,
    passed: check.test(password),
  }));
  const recommended = recommendedChecks.map((check) => ({
    ...check,
    passed: check.test(password),
  }));
  const requiredPassed = required.filter((check) => check.passed).length;
  const meetsRequirements = requiredPassed === required.length;
  return (
    <div className="mt-2 space-y-2">
      <div
        role="meter"
        aria-label={`Password requirements: ${meetsRequirements ? "met" : `${requiredPassed} of ${required.length} met`}`}
        aria-valuemin={0}
        aria-valuemax={required.length}
        aria-valuenow={requiredPassed}
        className="flex gap-1"
      >
        {required.map((check) => (
          <div
            key={check.label}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              check.passed ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-xs font-semibold ${
          meetsRequirements
            ? "text-emerald-600"
            : variant === "dark"
              ? "text-red-400"
              : "text-red-600"
        }`}
      >
        {meetsRequirements
          ? "Password meets all required checks"
          : `Required checks: ${requiredPassed}/${required.length}`}
      </p>
      <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {required.map(({ label, passed }) => (
          <li
            key={label}
            className={`flex items-center gap-1.5 text-xs ${
              passed
                ? "text-emerald-600"
                : variant === "dark"
                  ? "text-red-400"
                  : "text-red-600"
            }`}
          >
            {passed ? (
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <XCircle
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
            )}
            {label}
          </li>
        ))}
        {recommended.map(({ label, passed }) => (
          <li
            key={label}
            className={`flex items-center gap-1.5 text-xs ${
              passed
                ? variant === "dark"
                  ? "text-emerald-300"
                  : "text-emerald-600"
                : variant === "dark"
                  ? "text-amber-300"
                  : "text-amber-700"
            }`}
          >
            {passed ? (
              <CheckCircle2
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
            ) : (
              <Circle
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
            )}
            {label} (recommended)
          </li>
        ))}
      </ul>
    </div>
  );
}
