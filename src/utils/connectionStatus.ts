import { CONNECTED, DISCONNECTED, ERROR, CONNECTING } from '@/constants';
import { CONNECTION_STATUS_STYLES } from '@/constants/venues';
import type { ConnectionStatus } from '@/constants';

export interface ConnectionStatusMap {
  polymarket: ConnectionStatus;
  kalshi: ConnectionStatus;
}

export const getConnectionStatusStyle = (status: ConnectionStatus) => {
  return (
    CONNECTION_STATUS_STYLES[status as keyof typeof CONNECTION_STATUS_STYLES] ||
    CONNECTION_STATUS_STYLES.default
  );
};

export const getConnectionStatusColor = (status: ConnectionStatus): string => {
  return getConnectionStatusStyle(status).color;
};

export const getConnectionStatusSymbol = (status: ConnectionStatus): string => {
  return getConnectionStatusStyle(status).symbol;
};

export const getConnectionStatusText = (status: ConnectionStatus): string => {
  const statusMap: Record<ConnectionStatus, string> = {
    [CONNECTED]: 'Connected',
    [DISCONNECTED]: 'Disconnected',
    [ERROR]: 'Error',
    [CONNECTING]: 'Connecting...',
  };
  return statusMap[status] || status;
};

export const hasConnectionIssues = (
  connectionStatus: ConnectionStatusMap,
): boolean => {
  return (
    connectionStatus.polymarket === ERROR ||
    connectionStatus.kalshi === ERROR
  );
};

export const isDisconnected = (
  connectionStatus: ConnectionStatusMap,
): boolean => {
  return (
    connectionStatus.polymarket === DISCONNECTED ||
    connectionStatus.kalshi === DISCONNECTED
  );
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
