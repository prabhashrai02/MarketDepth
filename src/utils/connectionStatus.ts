import { CONNECTION_STATUS_STYLES } from '@/constants/venues';

export interface ConnectionStatusMap {
  polymarket: 'connected' | 'disconnected' | 'error' | 'connecting';
  kalshi: 'connected' | 'disconnected' | 'error' | 'connecting';
}

export const getConnectionStatusStyle = (status: string) => {
  return CONNECTION_STATUS_STYLES[status as keyof typeof CONNECTION_STATUS_STYLES] ||
    CONNECTION_STATUS_STYLES.default;
};

export const getConnectionStatusColor = (status: string): string => {
  return getConnectionStatusStyle(status).color;
};

export const getConnectionStatusSymbol = (status: string): string => {
  return getConnectionStatusStyle(status).symbol;
};

export const getConnectionStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    error: 'Error',
    connecting: 'Connecting...',
  };
  return statusMap[status] || status;
};

export const hasConnectionIssues = (connectionStatus: ConnectionStatusMap): boolean => {
  return connectionStatus.polymarket === 'error' || connectionStatus.kalshi === 'error';
};

export const isDisconnected = (connectionStatus: ConnectionStatusMap): boolean => {
  return connectionStatus.polymarket === 'disconnected' || connectionStatus.kalshi === 'disconnected';
};

export const getConnectionSummary = (connectionStatus: ConnectionStatusMap) => {
  return {
    hasIssues: hasConnectionIssues(connectionStatus),
    isDisconnected: isDisconnected(connectionStatus),
    polymarket: {
      status: connectionStatus.polymarket,
      color: getConnectionStatusColor(connectionStatus.polymarket),
      symbol: getConnectionStatusSymbol(connectionStatus.polymarket),
    },
    kalshi: {
      status: connectionStatus.kalshi,
      color: getConnectionStatusColor(connectionStatus.kalshi),
      symbol: getConnectionStatusSymbol(connectionStatus.kalshi),
    },
  };
};