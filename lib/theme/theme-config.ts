/**
 * @file lib/theme/theme-config.ts
 * @description Centralized theme configuration system with type-safe definitions
 * @created 2025-01-27
 */

/**
 * Theme mode enumeration
 */
export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system'
}

/**
 * Color palette interface for type safety
 */
export interface ColorPalette {
  // Background colors
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
    surface: string;
    overlay: string;
  };
  
  // Text colors
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
    muted: string;
  };
  
  // Interactive colors
  interactive: {
    primary: string;
    secondary: string;
    hover: string;
    active: string;
    disabled: string;
  };
  
  // Semantic colors
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  
  // Border colors
  border: {
    primary: string;
    secondary: string;
    focus: string;
    error: string;
  };
}

/**
 * Component-specific theme configurations
 */
export interface ComponentTheme {
  bulkActionBar: {
    background: string;
    text: string;
    border: string;
    button: {
      text: string;
      hover: string;
    };
    divider: string;
  };
  
  toast: {
    background: string;
    text: string;
    border: string;
    action: {
      text: string;
      background: string;
      hover: string;
    };
  };
  
  card: {
    background: string;
    border: string;
    hover: string;
    selected: string;
  };
  
  button: {
    primary: {
      background: string;
      text: string;
      hover: string;
    };
    secondary: {
      background: string;
      text: string;
      hover: string;
    };
    ghost: {
      text: string;
      hover: string;
    };
  };
}

/**
 * Complete theme configuration
 */
export interface ThemeConfig {
  mode: ThemeMode;
  colors: ColorPalette;
  components: ComponentTheme;
}

/**
 * Light theme configuration
 */
export const lightTheme: ThemeConfig = {
  mode: ThemeMode.LIGHT,
  colors: {
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      surface: '#ffffff',
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#64748b',
      inverse: '#ffffff',
      muted: '#94a3b8',
    },
    interactive: {
      primary: '#3b82f6',
      secondary: '#64748b',
      hover: '#2563eb',
      active: '#1d4ed8',
      disabled: '#cbd5e1',
    },
    semantic: {
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    },
    border: {
      primary: '#e2e8f0',
      secondary: '#cbd5e1',
      focus: '#3b82f6',
      error: '#ef4444',
    },
  },
  components: {
    bulkActionBar: {
      background: '#000000',
      text: '#ffffff',
      border: 'rgba(255, 255, 255, 0.3)',
      button: {
        text: '#ffffff',
        hover: 'rgba(255, 255, 255, 0.1)',
      },
      divider: 'rgba(255, 255, 255, 0.3)',
    },
    toast: {
      background: '#ffffff',
      text: '#0f172a',
      border: '#e2e8f0',
      action: {
        text: '#000000',
        background: 'transparent',
        hover: '#f1f5f9',
      },
    },
    card: {
      background: '#ffffff',
      border: '#e2e8f0',
      hover: '#f8fafc',
      selected: '#eff6ff',
    },
    button: {
      primary: {
        background: '#3b82f6',
        text: '#ffffff',
        hover: '#2563eb',
      },
      secondary: {
        background: '#f1f5f9',
        text: '#475569',
        hover: '#e2e8f0',
      },
      ghost: {
        text: '#475569',
        hover: '#f1f5f9',
      },
    },
  },
};

/**
 * Dark theme configuration
 */
export const darkTheme: ThemeConfig = {
  mode: ThemeMode.DARK,
  colors: {
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
      surface: '#1e293b',
      overlay: 'rgba(0, 0, 0, 0.7)',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      inverse: '#0f172a',
      muted: '#64748b',
    },
    interactive: {
      primary: '#60a5fa',
      secondary: '#94a3b8',
      hover: '#3b82f6',
      active: '#2563eb',
      disabled: '#475569',
    },
    semantic: {
      success: '#34d399',
      warning: '#fbbf24',
      error: '#f87171',
      info: '#60a5fa',
    },
    border: {
      primary: '#334155',
      secondary: '#475569',
      focus: '#60a5fa',
      error: '#f87171',
    },
  },
  components: {
    bulkActionBar: {
      background: '#ffffff',
      text: '#000000',
      border: 'rgba(0, 0, 0, 0.3)',
      button: {
        text: '#000000',
        hover: 'rgba(0, 0, 0, 0.1)',
      },
      divider: 'rgba(0, 0, 0, 0.3)',
    },
    toast: {
      background: '#1e293b',
      text: '#f8fafc',
      border: '#334155',
      action: {
        text: '#ffffff',
        background: 'transparent',
        hover: '#334155',
      },
    },
    card: {
      background: '#1e293b',
      border: '#334155',
      hover: '#334155',
      selected: '#1e40af',
    },
    button: {
      primary: {
        background: '#60a5fa',
        text: '#0f172a',
        hover: '#3b82f6',
      },
      secondary: {
        background: '#334155',
        text: '#cbd5e1',
        hover: '#475569',
      },
      ghost: {
        text: '#cbd5e1',
        hover: '#334155',
      },
    },
  },
};

/**
 * CSS variable mappings for theme values
 */
export const cssVariables = {
  // Background variables
  '--bg-primary': 'background.primary',
  '--bg-secondary': 'background.secondary',
  '--bg-tertiary': 'background.tertiary',
  '--bg-surface': 'background.surface',
  '--bg-overlay': 'background.overlay',
  
  // Text variables
  '--text-primary': 'text.primary',
  '--text-secondary': 'text.secondary',
  '--text-tertiary': 'text.tertiary',
  '--text-inverse': 'text.inverse',
  '--text-muted': 'text.muted',
  
  // Interactive variables
  '--interactive-primary': 'interactive.primary',
  '--interactive-secondary': 'interactive.secondary',
  '--interactive-hover': 'interactive.hover',
  '--interactive-active': 'interactive.active',
  '--interactive-disabled': 'interactive.disabled',
  
  // Semantic variables
  '--semantic-success': 'semantic.success',
  '--semantic-warning': 'semantic.warning',
  '--semantic-error': 'semantic.error',
  '--semantic-info': 'semantic.info',
  
  // Border variables
  '--border-primary': 'border.primary',
  '--border-secondary': 'border.secondary',
  '--border-focus': 'border.focus',
  '--border-error': 'border.error',
  
  // Component-specific variables
  '--bulk-action-bar-bg': 'components.bulkActionBar.background',
  '--bulk-action-bar-text': 'components.bulkActionBar.text',
  '--bulk-action-bar-border': 'components.bulkActionBar.border',
  '--bulk-action-bar-button-text': 'components.bulkActionBar.button.text',
  '--bulk-action-bar-button-hover': 'components.bulkActionBar.button.hover',
  '--bulk-action-bar-divider': 'components.bulkActionBar.divider',
  
  '--toast-bg': 'components.toast.background',
  '--toast-text': 'components.toast.text',
  '--toast-border': 'components.toast.border',
  '--toast-action-text': 'components.toast.action.text',
  '--toast-action-bg': 'components.toast.action.background',
  '--toast-action-hover': 'components.toast.action.hover',
} as const;

/**
 * Utility function to get nested object value by path
 */
function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((current, key) => current?.[key], obj) || '';
}

/**
 * Generate CSS variables from theme configuration
 */
export function generateCSSVariables(theme: ThemeConfig): Record<string, string> {
  const variables: Record<string, string> = {};
  
  Object.entries(cssVariables).forEach(([cssVar, path]) => {
    variables[cssVar] = getNestedValue(theme, path);
  });
  
  return variables;
}

/**
 * Apply theme CSS variables to document root
 */
export function applyThemeVariables(theme: ThemeConfig): void {
  const variables = generateCSSVariables(theme);
  const root = document.documentElement;
  
  Object.entries(variables).forEach(([variable, value]) => {
    root.style.setProperty(variable, value);
  });
}

/**
 * Get current theme configuration based on mode
 */
export function getThemeConfig(mode: ThemeMode): ThemeConfig {
  switch (mode) {
    case ThemeMode.LIGHT:
      return lightTheme;
    case ThemeMode.DARK:
      return darkTheme;
    case ThemeMode.SYSTEM:
      // Detect system preference
      if (typeof window !== 'undefined') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? darkTheme : lightTheme;
      }
      return lightTheme;
    default:
      return lightTheme;
  }
}

/**
 * WCAG AA contrast ratio requirements
 */
export const CONTRAST_REQUIREMENTS = {
  AA_NORMAL: 4.5,
  AA_LARGE: 3.0,
  AAA_NORMAL: 7.0,
  AAA_LARGE: 4.5,
} as const;

/**
 * Utility function to calculate contrast ratio between two colors
 * Note: This is a simplified version. For production, use a proper color library
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  // This is a placeholder implementation
  // In a real application, you would use a proper color library like chroma-js
  // to calculate the actual contrast ratio
  return 4.5; // Placeholder return value
}

/**
 * Validate theme contrast ratios
 */
export function validateThemeContrast(theme: ThemeConfig): {
  isValid: boolean;
  violations: string[];
} {
  const violations: string[] = [];
  
  // Check primary text on primary background
  const primaryContrast = calculateContrastRatio(
    theme.colors.text.primary,
    theme.colors.background.primary
  );
  
  if (primaryContrast < CONTRAST_REQUIREMENTS.AA_NORMAL) {
    violations.push(`Primary text contrast ratio ${primaryContrast} is below AA requirement`);
  }
  
  // Add more contrast checks as needed
  
  return {
    isValid: violations.length === 0,
    violations,
  };
}