import React from "react";
import { Loader2, AlertCircle } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  variant?: "loading" | "error";
  error?: string;
}

/**
 * Loading overlay with optional error state
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = "Loading...",
  variant = "loading",
  error,
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm text-center">
        {variant === "loading" ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto mb-4" />
            <p className="text-slate-700 font-medium">{message}</p>
          </>
        ) : (
          <>
            <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
            <p className="text-slate-900 font-semibold mb-2">Error</p>
            <p className="text-slate-600 text-sm">{error || message}</p>
          </>
        )}
      </div>
    </div>
  );
};

interface InlineLoadingProps {
  isLoading: boolean;
  isFetching?: boolean;
  children: React.ReactNode;
}

/**
 * Inline loading indicator with backdrop blur
 */
export const InlineLoading: React.FC<InlineLoadingProps> = ({
  isLoading,
  isFetching = false,
  children,
}) => {
  return (
    <div className="relative">
      {(isLoading || isFetching) && (
        <div className="absolute inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-40 rounded-lg">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      )}
      <div className={isLoading ? "opacity-50" : "opacity-100"}>{children}</div>
    </div>
  );
};

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
}

/**
 * Button with loading state
 */
export const LoadingButton: React.FC<LoadingButtonProps> = ({
  isLoading = false,
  loadingText = "Loading...",
  children,
  disabled,
  className = "",
  ...props
}) => {
  return (
    <button
      disabled={isLoading || disabled}
      className={`inline-flex items-center gap-2 ${className}`}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {isLoading ? loadingText : children}
    </button>
  );
};

interface SkeletonLoaderProps {
  count?: number;
  height?: string;
  className?: string;
}

/**
 * Skeleton content placeholder
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  count = 1,
  height = "h-4",
  className = "",
}) => (
  <div className={`space-y-2 ${className}`}>
    {[...Array(count)].map((_, i) => (
      <div
        key={i}
        className={`${height} bg-slate-200 rounded animate-pulse w-full`}
      ></div>
    ))}
  </div>
);
