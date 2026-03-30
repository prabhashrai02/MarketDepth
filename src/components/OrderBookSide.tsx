import React from 'react';
import type { OrderBookLevel } from '@/types/market';
import { OrderBookLevelItem } from './OrderBookLevelItem';
import { calculateLevelPercentage } from '@/utils/formatters';

interface OrderBookSideProps {
  levels: OrderBookLevel[];
  type: 'bid' | 'ask';
  maxLevels?: number;
  title: string;
}

export const OrderBookSide: React.FC<OrderBookSideProps> = ({
  levels,
  type,
  maxLevels = 10,
  title,
}) => {
  const displayLevels = levels.slice(0, maxLevels);
  const totalSize = displayLevels.reduce((sum, level) => sum + level.size, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <span className="text-xs text-gray-500">
          {levels.length} levels
        </span>
      </div>
      <div className="space-y-0 border border-gray-200 rounded-md overflow-hidden">
        {displayLevels.map((level, index) => {
          const percentage = calculateLevelPercentage(level.size, totalSize);
          return (
            <OrderBookLevelItem
              key={`${level.price}-${index}-${level.venue}`}
              level={level}
              type={type}
              percentage={percentage}
              index={index}
            />
          );
        })}
      </div>
    </div>
  );
};