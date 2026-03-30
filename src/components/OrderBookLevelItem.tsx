import { ORDER_BOOK_STYLES } from '@/constants/venues';
import type { OrderBookLevel } from '@/types/market';
import { formatPercentage, formatPrice, formatSize } from '@/utils/formatters';
import React from 'react';
import { VenueIndicator } from './VenueIndicator';

interface OrderBookLevelItemProps {
  level: OrderBookLevel;
  type: 'bid' | 'ask';
  percentage: number;
  index: number;
  className?: string;
  showVenue?: boolean;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export const OrderBookLevelItem: React.FC<OrderBookLevelItemProps> = ({
  level,
  type,
  percentage,
  index,
  className = '',
  showVenue = true,
  showPercentage = true,
  size = 'md',
  interactive = true,
}) => {
  const styles = ORDER_BOOK_STYLES[type];
  
  const sizeClasses = {
    sm: 'py-1 px-2 text-xs',
    md: 'py-2 px-3 text-sm',
    lg: 'py-3 px-4 text-base',
  };

  const interactiveClasses = interactive 
    ? 'hover:bg-gray-50 transition-all duration-200 cursor-pointer' 
    : '';

  return (
    <div
      className={`relative flex items-center justify-between ${sizeClasses[size]} ${interactiveClasses} border-b border-gray-100 last:border-b-0 order-book-level animate-fade-in ${className}`}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <div
        className={`absolute left-0 top-0 h-full ${styles.bgColor} opacity-10 transition-all duration-300 ease-out`}
        style={{ width: `${percentage}%` }}
      />
      <div className="flex items-center space-x-3 z-10">
        <span className={`font-mono font-medium ${styles.textColor} transition-colors`}>
          {formatPrice(level.price)}
        </span>
        {showVenue && <VenueIndicator venue={level.venue} />}
      </div>
      <div className="flex items-center space-x-3 z-10">
        <span className="font-mono text-gray-700 font-medium">
          {formatSize(level.size)}
        </span>
        {showPercentage && (
          <span className="text-gray-500 font-medium">
            {formatPercentage(percentage)}
          </span>
        )}
      </div>
    </div>
  );
};