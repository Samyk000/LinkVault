/**
 * @file components/error-boundary.tsx
 * @description Global error boundary for catching and handling React errors
 * @created 2025-11-11
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  level?: 'critical' | 'warning' | 'info';
  showDetails?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree and displays a fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  static defaultProps = {
    level: 'critical' as const,
    showDetails: false,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    logger.error('ErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Send to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry.captureException(error);
    }

    this.setState({
      errorInfo,
    });
  }

  handleReset = () => {
    // Reset the error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Log the reset
    logger.info('ErrorBoundary reset triggered');
  };

  handleRefresh = () => {
    // Refresh the page
    window.location.reload();
  };

  handleGoHome = () => {
    // Navigate to home page
    window.location.href = '/app';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      const { level, showDetails } = this.props;
      const isDevelopment = process.env.NODE_ENV === 'development';
      const shouldShowDetails = showDetails || (isDevelopment && level === 'critical');

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle className="text-2xl font-bold text-destructive">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">
                  We apologize for the inconvenience. An unexpected error has occurred.
                </p>
                
                {shouldShowDetails && this.state.error && (
                  <div className="mt-6 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-left">
                    <h3 className="mb-2 font-semibold text-destructive">Error Details</h3>
                    <p className="mb-2 font-mono text-sm">
                      <strong>Error:</strong> {this.state.error.message}
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-muted-foreground">
                        View stack trace
                      </summary>
                      <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 font-mono text-xs">
                        {this.state.error.stack}
                      </pre>
                    </details>
                    {this.state.errorInfo && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm text-muted-foreground">
                          View component stack
                        </summary>
                        <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 font-mono text-xs">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
                
                <Button
                  onClick={this.handleRefresh}
                  variant="outline"
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
                
                <Button
                  onClick={this.handleGoHome}
                  className="flex-1 sm:flex-none"
                >
                  <Home className="mr-2 h-4 w-4" />
                  Go to Home
                </Button>
              </div>

              <div className="mt-6 border-t pt-4 text-center">
                <p className="text-sm text-muted-foreground">
                  If this problem persists, please contact support with the error details above.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 * @param {React.ComponentType} Component - Component to wrap
 * @param {ReactNode} fallback - Optional fallback UI
 * @returns {React.ComponentType} Wrapped component
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  // Preserve component name for debugging
  const componentName = Component.displayName || Component.name || 'Component';
  WrappedComponent.displayName = `withErrorBoundary(${componentName})`;

  return WrappedComponent;
}

/**
 * Global error handler for uncaught errors
 */
export function setupGlobalErrorHandlers(): void {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    logger.error('Uncaught error:', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error,
      timestamp: new Date().toISOString(),
    });

    // Prevent default browser error handling
    event.preventDefault();
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled promise rejection:', {
      reason: event.reason,
      timestamp: new Date().toISOString(),
    });

    // Prevent default browser handling
    event.preventDefault();
  });

  logger.info('Global error handlers setup complete');
}