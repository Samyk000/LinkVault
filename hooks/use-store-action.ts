/**
 * @file hooks/use-store-action.ts
 * @description Hook to handle async store actions with loading states and error handling
 * @created 2025-11-02
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface UseStoreActionOptions {
  successMessage?: string;
  errorMessage?: string;
  showSuccess?: boolean;
  showError?: boolean;
}

/**
 * Hook to handle async store actions with automatic error handling and toast notifications
 * @param {Function} action - The async store action to wrap
 * @param {UseStoreActionOptions} options - Configuration options
 * @returns {Object} - Object with execute function, loading state, and error state
 */
export function useStoreAction<T extends (...args: any[]) => Promise<void>>(
  action: T,
  options: UseStoreActionOptions = {}
) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const {
    successMessage,
    errorMessage = 'Operation failed. Please try again.',
    showSuccess = false,
    showError = true,
  } = options;

  const execute = useCallback(
    async (...args: Parameters<T>) => {
      setIsLoading(true);
      setError(null);

      try {
        await action(...args);

        if (showSuccess && successMessage) {
          toast({
            title: 'Success',
            description: successMessage,
            variant: 'success',
          });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);

        if (showError) {
          toast({
            title: 'Error',
            description: errorMessage,
            variant: 'destructive',
          });
        }

        throw error; // Re-throw for component-level handling if needed
      } finally {
        setIsLoading(false);
      }
    },
    [action, successMessage, errorMessage, showSuccess, showError, toast]
  );

  return {
    execute,
    isLoading,
    error,
  };
}
