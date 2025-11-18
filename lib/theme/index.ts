/**
 * @file lib/theme/index.ts
 * @description Theme system exports for easy importing
 * @created 2025-01-27
 */

// Theme configuration
export {
  ThemeMode,
  lightTheme,
  darkTheme,
  cssVariables,
  generateCSSVariables,
  applyThemeVariables,
  getThemeConfig,
  CONTRAST_REQUIREMENTS,
  calculateContrastRatio,
  validateThemeContrast,
  type ColorPalette,
  type ComponentTheme,
  type ThemeConfig,
} from './theme-config';

// Theme context and hooks
export {
  ThemeProvider,
  useTheme,
  useThemeClasses,
  useComponentTheme,
  useColorPalette,
  type ThemeContextType,
} from './theme-context';

// Theme utilities
export {
  cn,
  ThemeClassGenerator,
  themeClasses,
  generateResponsiveClasses,
  generateInteractiveStates,
  validateClasses,
  extractThemeClasses,
  hexToRgb,
  getLuminance,
  getContrastRatio,
  meetsContrastRequirement,
} from './theme-utils';

// Re-export common types for convenience
export type { ClassValue } from 'clsx';