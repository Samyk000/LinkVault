/**
 * @file lib/theme/theme-utils.ts
 * @description Theme utility functions for easier theme management
 * @created 2025-01-27
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ThemeConfig, ThemeMode } from './theme-config';

/**
 * Utility function to merge CSS classes with Tailwind CSS
 * Enhanced version of cn utility with theme awareness
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Theme-aware class name generator
 * Generates CSS classes based on current theme mode
 */
export class ThemeClassGenerator {
  private theme: ThemeConfig;

  constructor(theme: ThemeConfig) {
    this.theme = theme;
  }

  /**
   * Generate background classes
   */
  background(variant: keyof ThemeConfig['colors']['background'] = 'primary'): string {
    const isDark = this.theme.mode === ThemeMode.DARK;
    
    switch (variant) {
      case 'primary':
        return isDark ? 'bg-slate-900' : 'bg-white';
      case 'secondary':
        return isDark ? 'bg-slate-800' : 'bg-gray-50';
      case 'tertiary':
        return isDark ? 'bg-slate-700' : 'bg-gray-100';
      case 'surface':
        return isDark ? 'bg-slate-800' : 'bg-white';
      default:
        return isDark ? 'bg-slate-900' : 'bg-white';
    }
  }

  /**
   * Generate text classes
   */
  text(variant: keyof ThemeConfig['colors']['text'] = 'primary'): string {
    const isDark = this.theme.mode === ThemeMode.DARK;
    
    switch (variant) {
      case 'primary':
        return isDark ? 'text-gray-100' : 'text-gray-900';
      case 'secondary':
        return isDark ? 'text-gray-300' : 'text-gray-600';
      case 'tertiary':
        return isDark ? 'text-gray-400' : 'text-gray-500';
      case 'inverse':
        return isDark ? 'text-gray-900' : 'text-gray-100';
      case 'muted':
        return isDark ? 'text-gray-500' : 'text-gray-400';
      default:
        return isDark ? 'text-gray-100' : 'text-gray-900';
    }
  }

  /**
   * Generate border classes
   */
  border(variant: keyof ThemeConfig['colors']['border'] = 'primary'): string {
    const isDark = this.theme.mode === ThemeMode.DARK;
    
    switch (variant) {
      case 'primary':
        return isDark ? 'border-slate-700' : 'border-gray-200';
      case 'secondary':
        return isDark ? 'border-slate-600' : 'border-gray-300';
      case 'focus':
        return isDark ? 'border-blue-400' : 'border-blue-500';
      case 'error':
        return isDark ? 'border-red-400' : 'border-red-500';
      default:
        return isDark ? 'border-slate-700' : 'border-gray-200';
    }
  }

  /**
   * Generate component-specific classes
   */
  component(componentName: keyof ThemeConfig['components']): Record<string, string> {
    const component = this.theme.components[componentName];
    
    switch (componentName) {
      case 'bulkActionBar':
        return {
          container: cn(
            'fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50',
            'flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg',
            'border-2',
            this.theme.mode === ThemeMode.DARK 
              ? 'bg-white text-black border-black/30' 
              : 'bg-black text-white border-white/30'
          ),
          button: cn(
            'gap-1 px-2 h-8',
            this.theme.mode === ThemeMode.DARK
              ? 'text-black hover:bg-black/10'
              : 'text-white hover:bg-white/10'
          ),
          deleteButton: cn(
            'gap-1 px-2 h-8',
            this.theme.mode === ThemeMode.DARK
              ? 'text-red-500 hover:bg-red-50'
              : 'text-red-400 hover:bg-red-950/20'
          ),
          divider: cn(
            'h-6 w-px',
            this.theme.mode === ThemeMode.DARK
              ? 'bg-black/30'
              : 'bg-white/30'
          ),
          text: cn(
            'text-sm font-medium',
            this.theme.mode === ThemeMode.DARK
              ? 'text-black'
              : 'text-white'
          ),
          checkbox: cn(
            this.theme.mode === ThemeMode.DARK
              ? 'border-black data-[state=checked]:bg-black data-[state=checked]:text-white'
              : 'border-white data-[state=checked]:bg-white data-[state=checked]:text-black'
          ),
        };
        
      case 'toast':
        return {
          container: cn(
            'border rounded-lg px-3 py-2.5',
            this.theme.mode === ThemeMode.DARK
              ? 'bg-zinc-900 text-gray-100 border-zinc-700'
              : 'bg-white text-gray-900 border-gray-200'
          ),
          action: cn(
            'h-6 px-2 text-xs border rounded',
            this.theme.mode === ThemeMode.DARK
              ? 'text-white border-zinc-600 hover:bg-zinc-800'
              : 'text-black border-gray-300 hover:bg-gray-50'
          ),
        };
        
      default:
        return {};
    }
  }
}

/**
 * Predefined theme-aware class combinations
 */
export const themeClasses = {
  /**
   * Card component classes
   */
  card: {
    light: 'bg-white border-gray-200 hover:bg-gray-50',
    dark: 'bg-slate-800 border-slate-700 hover:bg-slate-700',
    get base() {
      return 'border rounded-lg transition-colors';
    },
  },

  /**
   * Button component classes
   */
  button: {
    primary: {
      light: 'bg-blue-600 text-white hover:bg-blue-700',
      dark: 'bg-blue-500 text-white hover:bg-blue-600',
    },
    secondary: {
      light: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
      dark: 'bg-slate-700 text-gray-100 hover:bg-slate-600',
    },
    ghost: {
      light: 'text-gray-600 hover:bg-gray-100',
      dark: 'text-gray-300 hover:bg-slate-700',
    },
  },

  /**
   * Input component classes
   */
  input: {
    light: 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500',
    dark: 'bg-slate-800 border-slate-600 text-gray-100 placeholder-gray-400 focus:border-blue-400',
    get base() {
      return 'border rounded-md px-3 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20';
    },
  },

  /**
   * Text component classes
   */
  text: {
    primary: {
      light: 'text-gray-900',
      dark: 'text-gray-100',
    },
    secondary: {
      light: 'text-gray-600',
      dark: 'text-gray-300',
    },
    muted: {
      light: 'text-gray-500',
      dark: 'text-gray-400',
    },
  },
} as const;

/**
 * Generate responsive theme classes
 */
export function generateResponsiveClasses(
  baseClasses: string,
  smClasses?: string,
  mdClasses?: string,
  lgClasses?: string,
  xlClasses?: string
): string {
  return cn(
    baseClasses,
    smClasses && `sm:${smClasses}`,
    mdClasses && `md:${mdClasses}`,
    lgClasses && `lg:${lgClasses}`,
    xlClasses && `xl:${xlClasses}`
  );
}

/**
 * Generate theme-aware hover and focus states
 */
export function generateInteractiveStates(
  baseClasses: string,
  hoverClasses: string,
  focusClasses?: string,
  activeClasses?: string
): string {
  return cn(
    baseClasses,
    `hover:${hoverClasses}`,
    focusClasses && `focus:${focusClasses}`,
    activeClasses && `active:${activeClasses}`,
    'transition-colors duration-200'
  );
}

/**
 * Validate CSS class string
 */
export function validateClasses(classes: string): boolean {
  try {
    // Basic validation - check if string contains valid CSS class patterns
    const classPattern = /^[a-zA-Z0-9\s\-_:\/\[\]\.]+$/;
    return classPattern.test(classes);
  } catch {
    return false;
  }
}

/**
 * Extract theme-specific classes from a class string
 */
export function extractThemeClasses(classes: string): {
  light: string[];
  dark: string[];
  neutral: string[];
} {
  const classArray = classes.split(/\s+/).filter(Boolean);
  
  const light: string[] = [];
  const dark: string[] = [];
  const neutral: string[] = [];
  
  classArray.forEach(cls => {
    if (cls.startsWith('dark:')) {
      dark.push(cls.replace('dark:', ''));
    } else if (cls.includes('light') || cls.includes('white') || cls.includes('gray-')) {
      light.push(cls);
    } else {
      neutral.push(cls);
    }
  });
  
  return { light, dark, neutral };
}

/**
 * Convert hex color to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate luminance of a color
 */
export function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 1;
  
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check if color combination meets WCAG contrast requirements
 */
export function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  size: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  
  const requirements = {
    'AA': { normal: 4.5, large: 3.0 },
    'AAA': { normal: 7.0, large: 4.5 }
  };
  
  return ratio >= requirements[level][size];
}