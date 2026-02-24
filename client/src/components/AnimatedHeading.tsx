import React from "react";
import AnimatedKeyboardText from "./AnimatedKeyboardText";

interface AnimatedHeadingProps {
  text: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  variant?: "default" | "slow" | "fast" | "glowing";
  className?: string;
  delay?: number;
  description?: string;
}

export default function AnimatedHeading({
  text,
  level = 2,
  variant = "slow",
  className = "",
  delay = 100,
  description,
}: AnimatedHeadingProps) {
  const headingClass = {
    1: "text-4xl md:text-5xl font-bold",
    2: "text-3xl md:text-4xl font-bold",
    3: "text-2xl md:text-3xl font-bold",
    4: "text-xl md:text-2xl font-bold",
    5: "text-lg md:text-xl font-bold",
    6: "text-base md:text-lg font-bold",
  };

  const Component = `h${level}` as const;

  return (
    <div className="space-y-2">
      <Component className={`${headingClass[level]} ${className}`}>
        <AnimatedKeyboardText
          text={text}
          variant={variant}
          delay={delay}
          as="span"
        />
      </Component>
      {description && (
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
}
