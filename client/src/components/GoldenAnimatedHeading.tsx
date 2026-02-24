import React from "react";
import AnimatedKeyboardText from "./AnimatedKeyboardText";

type AnimationVariant = "default" | "slow" | "fast" | "unified" | "glowing";
type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

interface GoldenAnimatedHeadingProps {
  text: string;
  level?: HeadingLevel;
  variant?: AnimationVariant;
  description?: string;
  className?: string;
  glowing?: boolean;
}

const GoldenAnimatedHeading: React.FC<GoldenAnimatedHeadingProps> = ({
  text,
  level = "h2",
  variant = "slow",
  description,
  className = "",
  glowing = false,
}) => {
  const HeadingTag = level as any;
  const baseSizes: { [key in HeadingLevel]: string } = {
    h1: "text-4xl sm:text-5xl md:text-6xl",
    h2: "text-3xl sm:text-4xl md:text-5xl",
    h3: "text-base sm:text-lg md:text-xl lg:text-2xl",
    h4: "text-xl sm:text-2xl md:text-3xl",
    h5: "text-lg sm:text-xl md:text-2xl",
    h6: "text-base sm:text-lg md:text-xl",
  };

  const headingSize = baseSizes[level];

  return (
    <HeadingTag className={`${headingSize} font-bold gold-text ${className}`}>
      <span className="gold-text__shine" data-text={text}>
        <AnimatedKeyboardText
          text={text}
          variant={variant}
          delay={100}
          // glowing prop removed - not supported by AnimatedKeyboardText
          className="text-transparent"
        />
      </span>
      {description && (
        <p className="text-lg text-amber-700 mt-2 leading-relaxed">
          {description}
        </p>
      )}
    </HeadingTag>
  );
};

export default GoldenAnimatedHeading;
