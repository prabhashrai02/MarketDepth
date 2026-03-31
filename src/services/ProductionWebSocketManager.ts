// Simple event emitter for browser environment
type EventHandler = (...args: unknown[]) => void;

class EventEmitter {
  private listeners: Map<string, EventHandler[]> = new Map();

  on(event: string, listener: EventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, ...args: unknown[]): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(...args));
    }
  }

  removeListener(event: string, listener: EventHandler): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
}

export interface WebSocketMessage {
  type: 'snapshot' | 'delta' | 'heartbeat';
  sequence: number;
  timestamp: number;
  venue: string;
  data: unknown;
}

export interface ConnectionConfig {
  url: string;
  venue: string;
  reconnectBaseDelay: number;
  maxReconnectDelay: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageTimeout: number;
}

export interface ConnectionState {
  status:
    | 'disconnected'
    | 'connecting'
    | 'connected'
    | 'error'
    | 'reconnecting';
  lastMessageTime: number;
  lastSequence: number;
  reconnectAttempts: number;
  latency: number;
}

export class ProductionWebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: ConnectionConfig;
  private state: ConnectionState;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private isProcessing = false;
  private readonly maxQueueSize = 1000;

  constructor(config: ConnectionConfig) {
    super();
    this.config = config;
    this.state = {
      status: 'disconnected',
      lastMessageTime: 0,
      lastSequence: 0,
      reconnectAttempts: 0,
      latency: 0,
    };
  }

  connect(): void {
    if (
      this.state.status === 'connecting' ||
      this.state.status === 'connected'
    ) {
      return;
    }

    this.state.status = 'connecting';
    this.emit('statusChange', this.state);

    try {
      this.ws = new WebSocket(this.config.url);
      this.setupEventHandlers();
    } catch (error) {
      this.handleConnectionError(error);
    }
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.state.status = 'connected';
      this.state.reconnectAttempts = 0;
      this.state.lastMessageTime = Date.now();
      this.startHeartbeat();
      this.emit('statusChange', this.state);
      this.emit('connected');
    };

    this.ws.onmessage = (event) => {
      this.state.lastMessageTime = Date.now();
      this.handleMessage(event.data);
    };

    this.ws.onclose = (event) => {
      this.handleDisconnection(event);
    };

    this.ws.onerror = (error) => {
      this.handleConnectionError(error);
    };
  }

  private handleMessage(rawData: string): void {
    try {
      const message = JSON.parse(rawData) as WebSocketMessage;

      // Validate message structure
      if (!this.validateMessage(message)) {
        console.warn(`Invalid message from ${this.config.venue}:`, message);
        return;
      }

      // Handle out-of-order messages
      if (message.sequence < this.state.lastSequence) {
        console.warn(
          `Out-of-order message detected: ${message.sequence} < ${this.state.lastSequence}`,
        );
        // Queue for later processing or request resync
        this.requestResync();
        return;
      }

      this.state.lastSequence = message.sequence;

      // Throttle processing to prevent UI thrashing
      this.messageQueue.push(message);
      if (this.messageQueue.length > this.maxQueueSize) {
        this.messageQueue.shift(); // Drop oldest messages
      }

      this.processMessageQueue();
    } catch (error) {
      console.error(
        `Failed to parse message from ${this.config.venue}:`,
        error,
      );
    }
  }

  private validateMessage(message: unknown): message is WebSocketMessage {
    if (!message || typeof message !== 'object') return false;
    const msg = message as Record<string, unknown>;

    return (
      typeof msg.sequence === 'number' &&
      typeof msg.timestamp === 'number' &&
      typeof msg.type === 'string' &&
      ['snapshot', 'delta', 'heartbeat'].includes(msg.type)
    );
  }

  private processMessageQueue(): void {
    if (this.isProcessing || this.messageQueue.length === 0) return;

    this.isProcessing = true;

    // Process messages in batch to reduce UI updates
    const messages = this.messageQueue.splice(0, 10);

    messages.forEach((message) => {
      this.emit('message', message);
    });

    // Use requestAnimationFrame for UI throttling
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        this.isProcessing = false;
        if (this.messageQueue.length > 0) {
          setTimeout(() => this.processMessageQueue(), 0);
        }
      });
    } else {
      this.isProcessing = false;
      setTimeout(() => {
        if (this.messageQueue.length > 0) {
          setTimeout(() => this.processMessageQueue(), 0);
        }
      }, 0);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.state.status !== 'connected') return;

      const timeSinceLastMessage = Date.now() - this.state.lastMessageTime;

      if (timeSinceLastMessage > this.config.messageTimeout) {
        console.warn(`Heartbeat timeout for ${this.config.venue}`);
        this.reconnect();
        return;
      }

      // Send ping if supported
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.config.heartbeatInterval);
  }

  private handleDisconnection(event: CloseEvent): void {
    this.cleanup();

    if (!event.wasClean) {
      console.warn(
        `WebSocket disconnected unexpectedly: ${event.code} ${event.reason}`,
      );
      this.scheduleReconnect();
    } else {
      this.state.status = 'disconnected';
      this.emit('statusChange', this.state);
    }
  }

  private handleConnectionError(error: unknown): void {
    console.error(`WebSocket error for ${this.config.venue}:`, error);
    this.state.status = 'error';
    this.emit('statusChange', this.state);
    this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.state.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error(`Max reconnect attempts reached for ${this.config.venue}`);
      this.state.status = 'disconnected';
      this.emit('statusChange', this.state);
      return;
    }

    this.state.status = 'reconnecting';
    this.state.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectBaseDelay *
        Math.pow(2, this.state.reconnectAttempts - 1),
      this.config.maxReconnectDelay,
    );

    console.log(
      `Reconnecting to ${this.config.venue} in ${delay}ms (attempt ${this.state.reconnectAttempts})`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private requestResync(): void {
    // Request full snapshot to recover from out-of-order messages
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({ type: 'resync', sequence: this.state.lastSequence }),
      );
    }
  }

  reconnect(): void {
    this.disconnect();
    this.connect();
  }

  disconnect(): void {
    this.cleanup();
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
  }

  private cleanup(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.messageQueue = [];
    this.isProcessing = false;
  }

  getState(): ConnectionState {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.status === 'connected';
  }
}
