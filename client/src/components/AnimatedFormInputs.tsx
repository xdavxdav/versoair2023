import React from "react";
import AnimatedKeyboardText from "./AnimatedKeyboardText";

interface AnimatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  animatedLabel?: boolean;
  variant?: "default" | "slow" | "fast" | "glowing";
}

export const AnimatedInput = React.forwardRef<
  HTMLInputElement,
  AnimatedInputProps
>(
  (
    {
      label,
      error,
      helperText,
      animatedLabel = true,
      variant = "fast",
      className = "",
      ...props
    },
    ref,
  ) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {animatedLabel ? (
              <AnimatedKeyboardText
                text={label}
                variant={variant}
                delay={80}
                as="span"
              />
            ) : (
              label
            )}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2 border rounded-lg 
            transition-all duration-300
            focus:outline-none focus:ring-2 focus:ring-amber-500
            dark:bg-slate-800 dark:border-slate-600 dark:text-white
            ${error ? "border-red-500 focus:ring-red-500" : "border-gray-300"}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

AnimatedInput.displayName = "AnimatedInput";

interface AnimatedTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  animatedLabel?: boolean;
  variant?: "default" | "slow" | "fast" | "glowing";
}

export const AnimatedTextArea = React.forwardRef<
  HTMLTextAreaElement,
  AnimatedTextAreaProps
>(
  (
    {
      label,
      error,
      helperText,
      animatedLabel = true,
      variant = "fast",
      className = "",
      ...props
    },
    ref,
  ) => {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {animatedLabel ? (
              <AnimatedKeyboardText
                text={label}
                variant={variant}
                delay={80}
                as="span"
              />
            ) : (
              label
            )}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full px-4 py-2 border rounded-lg 
            transition-all duration-300
            focus:outline-none focus:ring-2 focus:ring-amber-500
            dark:bg-slate-800 dark:border-slate-600 dark:text-white
            ${error ? "border-red-500 focus:ring-red-500" : "border-gray-300"}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

AnimatedTextArea.displayName = "AnimatedTextArea";
