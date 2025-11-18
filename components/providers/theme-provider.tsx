"use client";

/**
 * @file components/providers/theme-provider.tsx
 * @description Integrated theme provider combining next-themes and centralized theme system
 * @created 2025-10-18
 */

import * as React from "react";
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps as NextThemeProviderProps } from "next-themes";
import { ThemeProvider as CentralizedThemeProvider } from "@/lib/theme";

/**
 * Props for the ThemeProvider component
 */
type ThemeProviderProps = NextThemeProviderProps;

/**
 * Integrated theme provider component that combines next-themes and centralized theme system
 * @param children - React children components
 * @param props - Theme provider configuration props
 * @returns JSX element
 */
export function ThemeProvider({ 
  children, 
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  ...props 
}: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      attribute={attribute}
      defaultTheme={defaultTheme}
      enableSystem={enableSystem}
      disableTransitionOnChange={disableTransitionOnChange}
      {...props}
    >
      <CentralizedThemeProvider>
        {children}
      </CentralizedThemeProvider>
    </NextThemesProvider>
  );
}
