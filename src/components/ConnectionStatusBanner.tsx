import React, { useEffect, useState } from 'react';
import { CONNECTED, CONNECTING, DISCONNECTED, ERROR } from '@/constants';
import type { ConnectionStatus } from '@/constants';

interface ConnectionStatusBannerProps {
  polymarketStatus: ConnectionStatus;
  kalshiStatus: ConnectionStatus;
  polymarketLastUpdate?: Date | null;
  kalshiLastUpdate?: Date | null;
}

const STALE_THRESHOLD_MS = 12000; // mark stale after 12 seconds

export const ConnectionStatusBanner: React.FC<ConnectionStatusBannerProps> = ({
  polymarketStatus,
  kalshiStatus,
  polymarketLastUpdate,
  kalshiLastUpdate,
}) => {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hasConnectionIssues =
    polymarketStatus === ERROR || kalshiStatus === ERROR;
  const isDisconnected = 
    polymarketStatus === DISCONNECTED && kalshiStatus === DISCONNECTED;
  const isStale = (lastUpdate?: Date | null) => {
    if (!lastUpdate) return false;
    return currentTime - lastUpdate.getTime() > STALE_THRESHOLD_MS;
  };

  const polymarketStale = isStale(polymarketLastUpdate);
  const kalshiStale = isStale(kalshiLastUpdate);

  const getConnectionStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case CONNECTED:
        return 'text-green-600';
      case CONNECTING:
        return 'text-yellow-600';
      case DISCONNECTED:
        return 'text-red-600';
      case ERROR:
        return 'text-red-600';
      default:
        return 'text-slate-300';
    }
  };

  const getConnectionStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case CONNECTED:
        return '●';
      case CONNECTING:
        return '◐';
      case DISCONNECTED:
        return '○';
      case ERROR:
        return '●';
      default:
        return '○';
    }
  };

  if (hasConnectionIssues || polymarketStale || kalshiStale) {
    return (
      <div className="mb-4 p-3 bg-slate-800 border border-rose-500/40 rounded-md">
        <div className="flex flex-col gap-1">
          <span className="text-rose-300 text-sm">
            ⚠️ Connection issues detected. Some data may be unavailable.
          </span>
          {polymarketStale && (
            <span className="text-amber-200 text-xs">
              Polymarket data is stale (no updates in 12s).
            </span>
          )}
          {kalshiStale && (
            <span className="text-amber-200 text-xs">
              Kalshi data is stale (no updates in 12s).
            </span>
          )}
        </div>
      </div>
    );
  }

  if (isDisconnected && !hasConnectionIssues) {
    return (
      <div className="mb-4 p-3 bg-slate-800 border border-cyan-500/40 rounded-md">
        <div className="flex items-center">
          <span className="text-cyan-200 text-sm">
            📡 Connecting to data sources...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4 text-sm">
      <div className="flex items-center space-x-1">
        <span className={getConnectionStatusColor(polymarketStatus)}>
          {getConnectionStatusText(polymarketStatus)}
        </span>
        <span className="text-slate-300">Polymarket</span>
      </div>
      <div className="flex items-center space-x-1">
        <span className={getConnectionStatusColor(kalshiStatus)}>
          {getConnectionStatusText(kalshiStatus)}
        </span>
        <span className="text-slate-300">Kalshi</span>
      </div>
    </div>
  );
};
