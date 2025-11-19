import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { Component, type ReactNode } from 'react';

import { Button } from '@/shared/ui/button';

interface DefaultFallbackProps {
  error: unknown;
  onRetry: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (params: { error: unknown; reset: () => void }) => ReactNode;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  error: unknown;
  hasError: boolean;
}

interface InternalErrorBoundaryProps extends Omit<ErrorBoundaryProps, 'children'> {
  children: ReactNode;
  onReset?: () => void;
}

/**
 * InternalErrorBoundary captures rendering errors and renders the configured fallback UI.
 *
 * @param {InternalErrorBoundaryProps} props - Component props
 * @param {ReactNode} props.children - Child components to render
 * @param {(params: { error: unknown; reset: () => void }) => ReactNode} [props.fallback] - Custom fallback UI renderer
 * @param {unknown[]} [props.resetKeys] - Array of values that trigger error boundary reset when changed
 * @param {() => void} [props.onReset] - Callback invoked when error boundary is reset
 *
 * @returns {JSX.Element | ReactNode} Rendered children or fallback UI if error occurred
 */
class InternalErrorBoundary extends Component<InternalErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null,
    hasError: false,
  };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error, hasError: true };
  }

  componentDidCatch(error: unknown, info: unknown) {
    // log error for debugging
    console.error('error boundary caught an error', error, info);
  }

  componentDidUpdate(prevProps: InternalErrorBoundaryProps) {
    const { resetKeys } = this.props;
    if (resetKeys && haveResetKeysChanged(prevProps.resetKeys, resetKeys)) {
      this.resetErrorBoundary();
    }
  }

  override render() {
    if (this.state.hasError) {
      const { fallback } = this.props;

      return (
        fallback?.({ error: this.state.error, reset: this.resetErrorBoundary }) ?? (
          <DefaultFallback error={this.state.error} onRetry={this.resetErrorBoundary} />
        )
      );
    }

    return this.props.children;
  }

  resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({ error: null, hasError: false });
  };
}

/**
 * ErrorBoundary wires together query reset handling with a class-based boundary to catch render errors.
 *
 * @param {ErrorBoundaryProps} props - Component props
 * @param {ReactNode} props.children - Child components to render
 * @param {(params: { error: unknown; reset: () => void }) => ReactNode} [props.fallback] - Custom fallback UI renderer
 * @param {unknown[]} [props.resetKeys] - Array of values that trigger error boundary reset when changed
 *
 * @returns {JSX.Element} Error boundary wrapper with TanStack Query integration
 */
export function ErrorBoundary({ children, fallback, resetKeys }: ErrorBoundaryProps) {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <InternalErrorBoundary fallback={fallback} onReset={reset} resetKeys={resetKeys}>
          {children}
        </InternalErrorBoundary>
      )}
    </QueryErrorResetBoundary>
  );
}

/**
 * DefaultFallback presents a generic error recovery UI when no bespoke fallback is provided.
 *
 * @param {DefaultFallbackProps} props - Component props
 * @param {unknown} props.error - The error that was caught
 * @param {() => void} props.onRetry - Callback to retry/reset the error boundary
 *
 * @returns {JSX.Element} Generic error recovery UI with retry and reload options
 */
function DefaultFallback({ error, onRetry }: DefaultFallbackProps) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';

  return (
    <div className="bg-background/90 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
      <div className="border-destructive bg-destructive/10 w-[min(90vw,480px)] rounded-lg border p-6 text-center shadow-lg">
        <h2 className="text-destructive mb-2 text-lg font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground mb-6 text-sm">{message}</p>
        <div className="flex justify-center gap-2">
          <Button onClick={onRetry} variant="outline">
            Try again
          </Button>
          <Button onClick={() => window.location.reload()} variant="destructive">
            Reload page
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * haveResetKeysChanged mimics react-error-boundary semantics, allowing consumer-provided keys to drive resets.
 *
 * @param {unknown[]} [prevResetKeys] - Previous reset keys array
 * @param {unknown[]} [resetKeys] - Current reset keys array
 *
 * @returns {boolean} True if reset keys have changed, false otherwise
 */
function haveResetKeysChanged(prevResetKeys: unknown[] = [], resetKeys: unknown[] = []) {
  if (prevResetKeys.length !== resetKeys.length) {
    return true;
  }

  return prevResetKeys.some((value, index) => !Object.is(value, resetKeys[index]));
}
