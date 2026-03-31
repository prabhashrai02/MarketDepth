/**
 * Order book styling utilities and constants
 */

export const ORDER_BOOK_STYLES = {
  bid: {
    bgColor: 'bg-cyan-500',
    textColor: 'text-cyan-300',
    bgOpacityClass: 'bg-cyan-500 opacity-20',
  },
  ask: {
    bgColor: 'bg-fuchsia-500',
    textColor: 'text-fuchsia-300',
    bgOpacityClass: 'bg-fuchsia-500 opacity-20',
  },
} as const;

export const SIZE_CLASSES = {
  sm: 'py-1 px-2 text-xs',
  md: 'py-2 px-3 text-sm',
  lg: 'py-3 px-4 text-base',
} as const;

export const INTERACTIVE_CLASSES = {
  base: 'hover:bg-slate-800 transition-all duration-200 cursor-pointer',
  static: '',
} as const;

export const ANIMATION_CLASSES = {
  fadeIn: '',
  slideIn: '',
  pulse: '',
} as const;

export const LAYOUT_CLASSES = {
  container:
    'bg-slate-900/80 rounded-lg shadow-lg p-4 hover-lift transition-all',
  grid: 'grid grid-cols-2 gap-4',
  section: 'space-y-0 border border-slate-700 rounded-md overflow-hidden',
  levelItem:
    'relative flex items-center justify-between border-b border-slate-700 last:border-b-0',
} as const;

export const TEXT_CLASSES = {
  price: 'font-mono font-medium transition-colors',
  size: 'font-mono text-slate-100 font-medium',
  percentage: 'text-cyan-200 font-medium',
  title: 'text-sm font-medium text-slate-100',
  subtitle: 'text-xs text-slate-300',
} as const;
