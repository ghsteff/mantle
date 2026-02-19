import { Component, type ReactNode } from "react";
import { Button } from "./ui";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("Unhandled UI error:", error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="h-full flex flex-col items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="space-y-1">
            <h1 className="font-mono text-lg font-bold">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              The UI hit an unexpected error. Reload to try again.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-muted-foreground font-mono">
                {this.state.error.message}
              </p>
            )}
          </div>
          <Button onClick={this.handleReload}>
            Reload
          </Button>
        </div>
      </div>
    );
  }
}
