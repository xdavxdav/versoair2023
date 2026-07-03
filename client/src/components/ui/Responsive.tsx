import React from "react";

/**
 * Responsive design utilities and helpers
 */

export interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: "small" | "medium" | "large";
  className?: string;
}

/**
 * Responsive grid component with tailwind classes
 */
export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  cols = { default: 1, md: 2, lg: 3 },
  gap = "medium",
  className = "",
}) => {
  const gapClasses = {
    small: "gap-2",
    medium: "gap-4",
    large: "gap-6",
  };

  const gridClasses = [
    `grid grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={`${gridClasses} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Responsive breakpoint context and hook
 */
const BreakpointContext = React.createContext<{
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}>({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
});

export const useBreakpoint = () => React.useContext(BreakpointContext);

export interface BreakpointProviderProps {
  children: React.ReactNode;
}

/**
 * Provider that tracks viewport size
 */
export const BreakpointProvider: React.FC<BreakpointProviderProps> = ({
  children,
}) => {
  const [breakpoint, setBreakpoint] = React.useState({
    isMobile: typeof window !== "undefined" ? window.innerWidth < 768 : false,
    isTablet:
      typeof window !== "undefined"
        ? window.innerWidth >= 768 && window.innerWidth < 1024
        : false,
    isDesktop: typeof window !== "undefined" ? window.innerWidth >= 1024 : true,
  });

  React.useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setBreakpoint({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <BreakpointContext.Provider value={breakpoint}>
      {children}
    </BreakpointContext.Provider>
  );
};

/**
 * Conditional render based on breakpoint
 */
export interface ResponsiveProps {
  mobile?: React.ReactNode;
  tablet?: React.ReactNode;
  desktop?: React.ReactNode;
}

export const Responsive: React.FC<ResponsiveProps> = ({
  mobile,
  tablet,
  desktop,
}) => {
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  if (isMobile) return <>{mobile}</>;
  if (isTablet) return <>{tablet || desktop}</>;
  return <>{desktop}</>;
};

/**
 * Mobile-first container with responsive padding
 */
export interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className = "",
  maxWidth = "lg",
}) => {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
  };

  return (
    <div
      className={`
        w-full px-4 sm:px-6 lg:px-8
        ${maxWidthClasses[maxWidth]}
        mx-auto
        ${className}
      `}
    >
      {children}
    </div>
  );
};

/**
 * Stack component for flexbox layouts
 */
export interface StackProps {
  direction?: "row" | "col";
  spacing?: "xs" | "sm" | "md" | "lg" | "xl";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "between" | "around" | "evenly";
  children: React.ReactNode;
  className?: string;
}

export const Stack: React.FC<StackProps> = ({
  direction = "col",
  spacing = "md",
  align = "start",
  justify = "start",
  children,
  className = "",
}) => {
  const directionClass = direction === "row" ? "flex-row" : "flex-col";
  const spacingClasses = {
    xs: direction === "row" ? "gap-1" : "gap-1",
    sm: direction === "row" ? "gap-2" : "gap-2",
    md: direction === "row" ? "gap-4" : "gap-4",
    lg: direction === "row" ? "gap-6" : "gap-6",
    xl: direction === "row" ? "gap-8" : "gap-8",
  };

  const alignClasses = {
    start: "items-start",
    center: "items-center",
    end: "items-end",
    stretch: "items-stretch",
  };

  const justifyClasses = {
    start: "justify-start",
    center: "justify-center",
    between: "justify-between",
    around: "justify-around",
    evenly: "justify-evenly",
  };

  return (
    <div
      className={`
        flex ${directionClass}
        ${spacingClasses[spacing]}
        ${alignClasses[align]}
        ${justifyClasses[justify]}
        ${className}
      `}
    >
      {children}
    </div>
  );
};
