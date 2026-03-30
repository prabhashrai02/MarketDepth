import React from 'react';
import { VENUE_CONFIG } from '@/constants/venues';
import type { Venue } from '@/constants';

interface VenueIndicatorProps {
  venue: Venue | 'combined';
  className?: string;
}

export const VenueIndicator: React.FC<VenueIndicatorProps> = ({ venue, className = '' }) => {
  const config = VENUE_CONFIG[venue];

  if (!config) return null;

  return (
    <span
      className={`text-xs px-2 py-1 rounded-full font-medium ${config.color} ${className}`}
    >
      {config.shortName}
    </span>
  );
};