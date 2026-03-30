import type { ConnectionStatus } from '../../../constants';

interface ConnectionStatusBannerProps {
  polymarketStatus: ConnectionStatus;
  kalshiStatus: ConnectionStatus;
}

export const ConnectionStatusBanner: React.FC<ConnectionStatusBannerProps> = ({
  polymarketStatus,
  kalshiStatus,
}) => {
  const hasConnectionIssues = 
    polymarketStatus === 'error' || kalshiStatus === 'error';
  const isDisconnected = 
    polymarketStatus === 'disconnected' && kalshiStatus === 'disconnected';

  const getConnectionStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'disconnected':
        return 'text-red-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getConnectionStatusText = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return '●';
      case 'connecting':
        return '◐';
      case 'disconnected':
        return '○';
      case 'error':
        return '●';
      default:
        return '○';
    }
  };

  if (hasConnectionIssues) {
    return (
      <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
        <div className="flex items-center">
          <span className="text-orange-600 text-sm">
            ⚠️ Connection issues detected. Some data may be unavailable.
          </span>
        </div>
      </div>
    );
  }

  if (isDisconnected && !hasConnectionIssues) {
    return (
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
        <div className="flex items-center">
          <span className="text-yellow-600 text-sm">
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
        <span className="text-gray-600">Polymarket</span>
      </div>
      <div className="flex items-center space-x-1">
        <span className={getConnectionStatusColor(kalshiStatus)}>
          {getConnectionStatusText(kalshiStatus)}
        </span>
        <span className="text-gray-600">Kalshi</span>
      </div>
    </div>
  );
};