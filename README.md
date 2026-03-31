# Prediction Market Aggregator (MarketDepth)

A simple front-end app combining liquidity from Polymarket and Kalshi in a single prediction market view. Built with React + Zustand + TypeScript + Rsbuild/Rspack.

---

## 🚀 What this app does

### Market view
- Displays a single prediction market with two outcomes (yes/no style order book).
- Shows per-venue and combined order books in real time:
  - Polymarket
  - Kalshi
- Visual cues for liquidity distribution and price differences.

### Live aggregation
- Listens for updates from both venues via WebSocket.
- Reconciles format differences between APIs into uniform `OrderBook` shape.
- Merges aggregated depth by price, sorting: bids desc, asks asc.
- Limits depth to 200 levels per side to prevent long-run degradation.
- Shows connection status (connected/disconnected/error/connecting) for each venue.

### Quote experience
- User can enter USD amount and select buy/sell side.
- App calculates fill expectation across combined book + per venue.
- Returns total shares, cost, average price, slippage, and unfilled amount.
- Shows per-venue breakdown and routing table.

### Long-running behavior
- Safe for extended runtimes:
  - bounded book state
  - stale/invalid data filtering
  - reconnect with backoff
  - cleanup on reinitialize to avoid listener leaks

---

## 🏃 How to run

### 1. Install dependencies

```bash
npm install
```

### 2. Backend proxy (required)
Run the required backend proxy that feeds Kalshi updates.

1. Create `.env` in project root or `backend/`:

```env
PORT=3001
KALSHI_API_KEY=your_api_key_here
```

2. Place Kalshi private key at:

- `backend/kalshi_private_key.pem`

3. Start backend proxy:

```bash
cd backend
npm install
node run ./src/index.js
```

This backend listens on `PORT=3001` and proxies Kalshi data for the frontend.

### 3. Run frontend

From project root:

```bash
npm run dev
```

Open http://localhost:3000


> Note: automated tests are not included in this repository currently.

---

```env
PORT=3001
KALSHI_API_KEY=your_api_key_here
```

---

## 🧩 Key files

- `src/store/useMarketStore.ts` — store + update chart + aggregator state
- `src/utils/orderBookAggregator.ts` — combining logic + capping
- `src/services/SimplifiedWebSocketService.ts` — generic ws with heartbeat + reconnect
- `src/services/kalshiWs.ts` — Kalshi-specific ws + subscriptions
- `src/utils/quoteCalculator.ts` — quote calc and slippage
- `src/components/QuoteEngine.tsx` — quote UI

---

## 📝 Requirements covered

✅ Market view with combined liquidity

✅ Live aggregation (Polymarket + Kalshi)

✅ One-venue break handling (continues with status indicator)

✅ Quote calculator with venue split

✅ Long-running robustness (bounded depth, invalid data guard)

---

## 🛡️ Edge cases handled

- `NaN` / `Infinity` / negative price/size ignored
- empty order book (clean quotes)
- Kalshi snapshot + delta normalization
- one venue disconnect + reconnect safe
- duplicated/empty updates no churn
- map trimming to cap growth (200)

---

## 🔧 Design decisions & tradeoffs

- Focused frontend-only implementation for speed; backend optional.
- Depth cap 200 for UX + memory safety.
- Core logic in portable utilities to facilitate tests.
- No order execution; quote-only to align with assignment.

---

## 🧪 What I'd add with more time

- full unit/integration tests for ws input variants
- per-venue sequence deduping + timestamp lag handling
- better performance throttling for update storm.
- historical depth chart + heatmap.

---

## 📌 Quick manual checks

1. start local server, observe combined book.
2. disconnect a venue, ensure UI still works.
3. high/low quote values with eventual unfilled amount.
4. run long polling to confirm no memory/unbounded growth.

---

## 📁 Backend

- Optional local mock in `backend/` (Kalshi stub, use for demo mode).