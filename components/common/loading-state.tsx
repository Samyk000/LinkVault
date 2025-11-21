/**
 * @file components/common/loading-state.tsx
 * @description Reusable loading spinner component with consistent styling
 * @created 2025-01-21
 */

import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
    /**
     * Size variant of the loading spinner
     */
    size?: 'sm' | 'md' | 'lg';

    /**
     * Optional message to display below the spinner
     */
    message?: string;

    /**
     * Additional CSS classes
     */
    className?: string;

    /**
     * Whether to center the loading state
     */
    centered?: boolean;
}

const sizeClasses = {
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
};

/**
 * Reusable loading spinner component
 * @param {LoadingStateProps} props - Component props
 * @returns {JSX.Element} Loading spinner
 */
export function LoadingState({
    size = 'md',
    message,
    className,
    centered = false
}: LoadingStateProps): React.JSX.Element {
    return (
        <div
            className={cn(
                'flex flex-col items-center gap-3',
                centered && 'justify-center min-h-[200px]',
                className
            )}
            role="status"
            aria-live="polite"
            aria-label={message || 'Loading'}
        >
            <Loader2
                className={cn(
                    'animate-spin text-primary',
                    sizeClasses[size]
                )}
            />
            {message && (
                <p className="text-sm text-muted-foreground font-medium">
                    {message}
                </p>
            )}
            <span className="sr-only">Loading...</span>
        </div>
    );
}

/**
 * Full page loading state
 */
export function PageLoadingState({ message }: { message?: string }): React.JSX.Element {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <LoadingState size="lg" message={message || 'Loading...'} />
        </div>
    );
}
