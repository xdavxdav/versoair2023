import React from "react";
import styles from "./ui/versoair-logo.module.css";

interface AnimatedKeyboardTextProps {
  text: string;
  variant?: "default" | "slow" | "fast" | "unified" | "glowing";
  delay?: number; // milliseconds between character animations
  className?: string;
  as?: "span" | "h1" | "h2" | "h3" | "div" | "p";
}

const getAnimationName = (variant: string, charIndex: number): string => {
  const index = (charIndex % 8) + 1;

  switch (variant) {
    case "slow":
      return `pressSlow${index}`;
    case "fast":
      return `pressFast${index}`;
    case "unified":
      return "pressUnified";
    case "glowing":
      return `pressGlow${index}`;
    case "default":
    default:
      return `pressDown${index}`;
  }
};

const getAnimationDuration = (variant: string): string => {
  switch (variant) {
    case "slow":
      return "3.5s";
    case "fast":
      return "1.2s";
    case "unified":
      return "0.8s";
    case "glowing":
      return "2s";
    case "default":
    default:
      return "2.5s";
  }
};

export default function AnimatedKeyboardText({
  text,
  variant = "default",
  delay = 100,
  className = "",
  as: Component = "span",
}: AnimatedKeyboardTextProps) {
  const characters = text.split("");

  return (
    <Component className={`inline-block ${className}`}>
      {characters.map((char, index) => {
        const animationName = getAnimationName(variant, index);
        const duration = getAnimationDuration(variant);
        const animationDelay =
          variant === "unified" ? "0ms" : `${index * delay}ms`;

        return (
          <span
            key={index}
            style={{
              display: "inline-block",
              animation: `${animationName} ${duration} infinite`,
              animationDelay,
            }}
          >
            {char === " " ? "\u00A0" : char}
          </span>
        );
      })}
    </Component>
  );
}
