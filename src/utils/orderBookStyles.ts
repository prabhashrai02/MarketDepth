/**
 * Order book styling utilities and constants
 */

export const ORDER_BOOK_STYLES = {
  bid: {
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    bgOpacityClass: 'bg-green-500 opacity-10',
  },
  ask: {
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    bgOpacityClass: 'bg-red-500 opacity-10',
  },
} as const;

export const SIZE_CLASSES = {
  sm: 'py-1 px-2 text-xs',
  md: 'py-2 px-3 text-sm',
  lg: 'py-3 px-4 text-base',
} as const;

export const INTERACTIVE_CLASSES = {
  base: 'hover:bg-gray-50 transition-all duration-200 cursor-pointer',
  static: '',
} as const;

export const ANIMATION_CLASSES = {
  fadeIn: 'animate-fade-in',
  slideIn: 'animate-slide-in',
  pulse: 'animate-pulse-slow',
} as const;

export const LAYOUT_CLASSES = {
  container: 'bg-white rounded-lg shadow-lg p-4 hover-lift transition-all',
  grid: 'grid grid-cols-2 gap-4',
  section: 'space-y-0 border border-gray-200 rounded-md overflow-hidden',
  levelItem: 'relative flex items-center justify-between border-b border-gray-100 last:border-b-0',
} as const;

export const TEXT_CLASSES = {
  price: 'font-mono font-medium transition-colors',
  size: 'font-mono text-gray-700 font-medium',
  percentage: 'text-gray-500 font-medium',
  title: 'text-sm font-medium text-gray-700',
  subtitle: 'text-xs text-gray-500',
} as const;