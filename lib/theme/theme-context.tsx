/**
 * @file lib/theme/theme-context.tsx
 * @description Theme context provider for centralized theme management
 * @created 2025-01-27
 */

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { ThemeMode, ThemeConfig, getThemeConfig, applyThemeVariables } from './theme-config';

/**
 * Theme context interface
 */
export interface ThemeContextType {
  /** Current theme mode */
  mode: ThemeMode;
  /** Current theme configuration */
  theme: ThemeConfig;
  /** Set theme mode */
  setTheme: (mode: ThemeMode) => void;
  /** Toggle between light and dark themes */
  toggleTheme: () => void;
  /** Check if theme is currently dark */
  isDark: boolean;
  /** Check if theme is currently light */
  isLight: boolean;
  /** Check if system theme preference is being used */
  isSystem: boolean;
}

/**
 * Theme context
 */
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * Local storage key for theme preference
 */
const THEME_STORAGE_KEY = 'linkvault-theme';

/**
 * Theme provider props
 */
interface ThemeProviderProps {
  children: React.ReactNode;
  /** Default theme mode */
  defaultTheme?: ThemeMode;
  /** Storage key for theme preference */
  storageKey?: string;
  /** Disable system theme detection */
  disableSystemTheme?: boolean;
}

/**
 * Theme provider component
 * Manages theme state and applies CSS variables
 * Integrates with next-themes for basic theme switching
 * 
 * @param children - Child components
 * @param defaultTheme - Default theme mode (defaults to system)
 * @param storageKey - Local storage key for theme preference
 * @param disableSystemTheme - Disable system theme detection
 */
export function ThemeProvider({
  children,
  defaultTheme = ThemeMode.LIGHT, // Changed from SYSTEM to LIGHT for better UX
  storageKey = THEME_STORAGE_KEY,
  disableSystemTheme = false,
}: ThemeProviderProps) {
  const { theme: nextTheme, setTheme: setNextTheme, resolvedTheme } = useNextTheme();
  const [theme, setThemeConfig] = useState<ThemeConfig>(() => getThemeConfig(defaultTheme));

  /**
   * Convert next-themes string to ThemeMode enum
   */
  const getThemeModeFromString = useCallback((themeString: string | undefined): ThemeMode => {
    switch (themeString) {
      case 'light':
        return ThemeMode.LIGHT;
      case 'dark':
        return ThemeMode.DARK;
      case 'system':
        return ThemeMode.SYSTEM;
      default:
        return ThemeMode.SYSTEM;
    }
  }, []);

  /**
   * Convert ThemeMode enum to next-themes string
   */
  const getStringFromThemeMode = useCallback((mode: ThemeMode): string => {
    switch (mode) {
      case ThemeMode.LIGHT:
        return 'light';
      case ThemeMode.DARK:
        return 'dark';
      case ThemeMode.SYSTEM:
        return 'system';
      default:
        return 'system';
    }
  }, []);

  /**
   * Get current theme mode from next-themes
   */
  const mode = getThemeModeFromString(nextTheme);

  /**
   * Set theme mode (delegates to next-themes)
   */
  const setTheme = useCallback((newMode: ThemeMode): void => {
    const themeString = getStringFromThemeMode(newMode);
    setNextTheme(themeString);
  }, [setNextTheme, getStringFromThemeMode]);

  /**
   * Toggle between light and dark themes
   */
  const toggleTheme = useCallback((): void => {
    const currentMode = getThemeModeFromString(resolvedTheme);
    const newMode = currentMode === ThemeMode.DARK ? ThemeMode.LIGHT : ThemeMode.DARK;
    setTheme(newMode);
  }, [resolvedTheme, setTheme, getThemeModeFromString]);

  /**
   * Sync with next-themes and apply CSS variables
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Get the effective theme mode (resolved theme for system preference)
    const effectiveMode = resolvedTheme === 'dark' ? ThemeMode.DARK : ThemeMode.LIGHT;
    const newTheme = getThemeConfig(effectiveMode);

    setThemeConfig(newTheme);
    applyThemeVariables(newTheme);
  }, [resolvedTheme]);

  /**
   * Computed theme state
   */
  const isDark = theme.mode === ThemeMode.DARK;
  const isLight = theme.mode === ThemeMode.LIGHT;
  const isSystem = mode === ThemeMode.SYSTEM;

  const contextValue: ThemeContextType = {
    mode,
    theme,
    setTheme,
    toggleTheme,
    isDark,
    isLight,
    isSystem,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to use theme context
 * 
 * @returns Theme context value
 * @throws Error if used outside ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}

/**
 * Hook to get theme-aware CSS classes
 * Utility hook for applying theme-specific styles
 * 
 * @param lightClasses - Classes for light theme
 * @param darkClasses - Classes for dark theme
 * @returns Combined CSS classes based on current theme
 */
export function useThemeClasses(lightClasses: string, darkClasses: string): string {
  const { isDark } = useTheme();
  return isDark ? darkClasses : lightClasses;
}

/**
 * Hook to get component-specific theme values
 * 
 * @param component - Component name from theme config
 * @returns Component theme configuration
 */
export function useComponentTheme<T extends keyof ThemeConfig['components']>(
  component: T
): ThemeConfig['components'][T] {
  const { theme } = useTheme();
  return theme.components[component];
}

/**
 * Hook to get color palette
 * 
 * @returns Current theme color palette
 */
export function useColorPalette(): ThemeConfig['colors'] {
  const { theme } = useTheme();
  return theme.colors;
}