import {
  CONNECTED,
  DISCONNECTED,
  ERROR,
  CONNECTING,
  POLYMARKET,
  KALSHI,
} from '@/constants/index';
import type { ConnectionStatus } from '@/constants/index';

export interface StatusConfig {
  icon: string;
  text: string;
  colorClasses: {
    text: string;
    bg: string;
    border: string;
    badgeBg: string;
    badgeText: string;
  };
  spin?: boolean;
}

export const STATUS_CONFIG: Record<ConnectionStatus, StatusConfig> = {
  [CONNECTED]: {
    icon: '✅',
    text: 'Connected',
    colorClasses: {
      text: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      badgeBg: 'bg-green-100',
      badgeText: 'text-green-800',
    },
  },
  [CONNECTING]: {
    icon: '🔄',
    text: 'Connecting...',
    colorClasses: {
      text: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      badgeBg: 'bg-blue-100',
      badgeText: 'text-blue-800',
    },
    spin: true,
  },
  [DISCONNECTED]: {
    icon: '❌',
    text: 'Disconnected',
    colorClasses: {
      text: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800',
    },
  },
  [ERROR]: {
    icon: '⚠️',
    text: 'Connection Error',
    colorClasses: {
      text: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      badgeBg: 'bg-red-100',
      badgeText: 'text-red-800',
    },
  },
};

export interface ServiceConfig {
  id: string;
  name: string;
  description: string;
  shortName: string;
}

export const SERVICE_CONFIGS: Record<string, ServiceConfig> = {
  [POLYMARKET]: {
    id: POLYMARKET,
    name: 'Polymarket',
    description: 'Prediction markets',
    shortName: 'PM',
  },
  [KALSHI]: {
    id: KALSHI,
    name: 'Kalshi',
    description: 'Event contracts',
    shortName: 'KL',
  },
};

export const getOverallStatus = (
  statuses: Record<string, ConnectionStatus>,
): string => {
  const values = Object.values(statuses);

  if (values.every((s) => s === CONNECTED)) {
    return 'All systems operational';
  }

  if (values.some((s) => s === ERROR)) {
    return 'Connection issues detected';
  }

  if (values.some((s) => s === CONNECTING)) {
    return 'Establishing connections...';
  }

  return 'Connecting to data sources...';
};
