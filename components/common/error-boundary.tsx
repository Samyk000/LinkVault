/**
 * @file components/common/error-boundary.tsx
 * @description Error boundary component to catch unhandled errors in auth flow
 * @created 2025-01-21
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/utils/logger';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallbackTitle?: string;
    fallbackMessage?: string;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * Error boundary component to catch and display errors gracefully
 * Implements React error boundary pattern for better error handling
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
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

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error details for debugging
        logger.error('Error boundary caught an error:', {
            error: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
        });

        this.setState({
            error,
            errorInfo,
        });
    }

    handleReset = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });

        // Reload the page to recover from the error
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    };

    render(): ReactNode {
        if (this.state.hasError) {
            const { fallbackTitle, fallbackMessage } = this.props;
            const { error } = this.state;

            return (
                <div className="flex items-center justify-center min-h-screen bg-background p-4">
                    <Card className="w-full max-w-md border-destructive/50">
                        <CardHeader className="text-center">
                            <div className="flex justify-center mb-4">
                                <div className="p-4 bg-destructive/10 rounded-full">
                                    <AlertTriangle className="size-8 text-destructive" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl">
                                {fallbackTitle || 'Something went wrong'}
                            </CardTitle>
                            <CardDescription className="text-base mt-2">
                                {fallbackMessage || 'An unexpected error occurred. Please try refreshing the page.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {error && process.env.NODE_ENV === 'development' && (
                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm font-mono text-muted-foreground break-all">
                                        {error.message}
                                    </p>
                                </div>
                            )}
                            <Button
                                onClick={this.handleReset}
                                className="w-full"
                                size="lg"
                            >
                                <RefreshCw className="mr-2 size-4" />
                                Refresh Page
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}
