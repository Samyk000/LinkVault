/**
 * @file hooks/use-debounce.ts
 * @description Custom hook for debouncing values
 * @created 2025-10-18
 */

import React, { useEffect, useState } from 'react';
import { DEBOUNCE_DELAY } from '@/constants';

/**
 * Custom hook that debounces a value
 * 
 * @example
 * const debouncedSearchTerm = useDebounce(searchTerm, 500);
 * 
 * @example
 * useDebounce('search term', 500)
 * // 'search term' (returned after 500 ms of no changes)
 * 
 * @param {T} value - The value to debounce.
 * @param {number} [delay=DEBOUNCE_DELAY] - Delay in milliseconds before updating the debounced value.
 * @returns {T} The debounced value.
 */
export function useDebounce<T>(value: T, delay: number = DEBOUNCE_DELAY): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
