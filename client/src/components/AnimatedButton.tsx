import React from "react";
import AnimatedKeyboardText from "./AnimatedKeyboardText";

interface AnimatedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  animationVariant?: "default" | "slow" | "fast" | "unified" | "glowing";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const AnimatedButton = React.forwardRef<
  HTMLButtonElement,
  AnimatedButtonProps
>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      animated = true,
      animationVariant = "fast",
      icon,
      iconPosition = "left",
      className = "",
      ...props
    },
    ref,
  ) => {
    const variantClasses = {
      primary:
        "bg-amber-500 hover:bg-amber-600 text-white shadow-lg hover:shadow-xl",
      secondary: "bg-gray-300 hover:bg-gray-400 text-gray-900",
      danger: "bg-red-500 hover:bg-red-600 text-white",
      ghost:
        "bg-transparent hover:bg-gray-100 text-gray-900 dark:hover:bg-gray-800",
    };

    const sizeClasses = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2 text-base",
      lg: "px-6 py-3 text-lg",
    };

    const baseClasses =
      "font-semibold rounded-lg transition-all duration-200 inline-flex items-center gap-2 active:scale-95";

    const textContent =
      typeof children === "string" ? (
        animated ? (
          <AnimatedKeyboardText
            text={children}
            variant={animationVariant}
            delay={60}
            as="span"
          />
        ) : (
          children
        )
      ) : (
        children
      );

    return (
      <button
        ref={ref}
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {icon && iconPosition === "left" && <span>{icon}</span>}
        {textContent}
        {icon && iconPosition === "right" && <span>{icon}</span>}
      </button>
    );
  },
);

AnimatedButton.displayName = "AnimatedButton";
