import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — catches uncaught render errors in any child component
 * and shows a recovery UI instead of a blank white screen.
 */
export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Google Translate mutates the DOM and breaks React's reconciliation.
    // Auto-recover instead of showing a crash screen.
    const msg = error.message || "";
    if (
      msg.includes("insertBefore") ||
      msg.includes("removeChild") ||
      msg.includes("not a child") ||
      msg.includes("pas un enfant")
    ) {
      console.warn(
        "[ErrorBoundary] Google Translate DOM conflict — auto-recovering",
      );
      this.setState({ hasError: false, error: null });
      return;
    }
    console.error("[ErrorBoundary] Caught:", error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
          <div className="max-w-md w-full bg-white/[0.04] backdrop-blur-xl rounded-2xl border border-white/10 p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <div>
              <h2 className="text-white text-xl font-bold mb-2">
                Something went wrong
              </h2>
              <p className="text-white/50 text-sm">
                An unexpected error occurred. This has been logged
                automatically.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-left">
                <p className="text-red-300 text-xs font-mono break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={this.handleGoHome}
                className="flex-1 py-3 rounded-xl border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all text-sm font-medium flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
              <button
                onClick={this.handleReload}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white text-sm font-bold hover:from-emerald-500 hover:to-emerald-400 transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reload Page
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
