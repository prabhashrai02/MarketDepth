require('dotenv').config();
const WebSocket = require('ws');
const http = require('http');
const { signWs } = require('./signer');

const API_KEY = process.env.KALSHI_API_KEY;
const PORT = process.env.PORT || 3001;

// ✅ CORRECT endpoint
const KALSHI_WS_URL = 'wss://api.elections.kalshi.com/trade-api/ws/v2';

const server = http.createServer();
const wss = new WebSocket.Server({ server });

wss.on('connection', (frontendClient, req) => {
  console.log('🖥️ Frontend connected');

  const timestamp = Date.now().toString();
  const signature = signWs(timestamp);

  const kalshi = new WebSocket(KALSHI_WS_URL, {
    headers: {
      'KALSHI-ACCESS-KEY': API_KEY,
      'KALSHI-ACCESS-SIGNATURE': signature,
      'KALSHI-ACCESS-TIMESTAMP': timestamp,
    },
  });

  // 🔥 message queue (IMPORTANT)
  const queue = [];

  // ----------------------------
  // Kalshi → Frontend
  // ----------------------------
  kalshi.on('open', () => {
    console.log('✅ Connected to Kalshi');

    // flush queued messages
    while (queue.length > 0) {
      kalshi.send(queue.shift());
    }
  });

  kalshi.on('message', (data) => {
    console.log('📡 FROM KALSHI:', data.toString());

    if (frontendClient.readyState === WebSocket.OPEN) {
      frontendClient.send(data.toString());
    }
  });

  kalshi.on('error', (err) => {
    console.error('❌ Kalshi error:', err.message);
  });

  kalshi.on('close', (code, reason) => {
    console.log('🔌 Kalshi closed:', code, reason.toString());
    // ❌ DO NOT close frontend
  });

  // ----------------------------
  // Frontend → Kalshi
  // ----------------------------
  frontendClient.on('message', (msg) => {
    const text = msg.toString();
    console.log('📥 FROM FRONTEND:', text);

    if (kalshi.readyState === WebSocket.OPEN) {
      kalshi.send(text);
    } else {
      console.log('⏳ Queueing message...');
      queue.push(text);
    }
  });

  frontendClient.on('close', () => {
    console.log('👋 Frontend disconnected');
    kalshi.close();
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Proxy running on ws://localhost:${PORT}`);
});
