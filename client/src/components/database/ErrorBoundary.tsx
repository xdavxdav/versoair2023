import React from "react";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  level?: "page" | "section" | "component";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call optional callback for logging, etc.
    this.props.onError?.(error, errorInfo);

    // Log error details
    console.error("Error caught by boundary:", error);
    console.error("Error info:", errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, level = "component" } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      const isProd = process.env.NODE_ENV === "production";

      return (
        <div className="w-full p-4">
          <Alert variant="destructive" className="border-red-300 bg-red-50">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <AlertTitle className="text-red-900 ml-3 font-semibold">
              {level === "page"
                ? "Page Error"
                : level === "section"
                  ? "Section Error"
                  : "Component Error"}
            </AlertTitle>
            <AlertDescription className="ml-3 text-red-800 mt-2">
              <p className="font-medium mb-2">
                {error?.message || "An unexpected error occurred"}
              </p>
              {!isProd && errorInfo && (
                <details className="mt-2 cursor-pointer">
                  <summary className="text-sm font-medium text-red-700 hover:text-red-900">
                    Details
                  </summary>
                  <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-h-40">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 mt-4">
            <Button
              onClick={this.handleReset}
              variant="outline"
              className="gap-2 text-red-600 hover:text-red-700"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
            <Button
              onClick={() => (window.location.href = "/")}
              variant="outline"
              className="gap-2 text-gray-600 hover:text-gray-700"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
        </div>
      );
    }

    return children;
  }
}

/**
 * Hook-based error boundary alternative (for functional components)
 * Usage: useErrorHandler(error)
 */
export function useErrorHandler(error: Error | null) {
  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
}
