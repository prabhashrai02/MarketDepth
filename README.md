# MarketDepth — Prediction Market Aggregator

A real-time order book aggregator that combines liquidity from **Polymarket** and **Kalshi** into a single unified view. Built with React + Zustand + TypeScript + Rsbuild/Rspack.

---

## What this app does

### Market view

Displays a single prediction market with two outcomes (yes/no). For the selected market:

- Shows the current order book for one outcome, updated in real time as new data arrives
- Combines liquidity from both Polymarket and Kalshi into a single aggregated book
- Shows per-venue books alongside the combined book so you can see where liquidity is concentrated, how prices differ across venues, and how the combined book compares to either venue individually

### Live aggregation

Data is sourced from both venues simultaneously:

- Listens for live WebSocket updates from Polymarket and Kalshi
- Reconciles format differences (Polymarket uses 0–1 price fractions; Kalshi uses snapshot + delta updates) into a uniform internal `OrderBook` shape
- Merges depth by price level, sorting bids descending and asks ascending
- Caps depth at 200 levels per side to prevent memory growth over long runtimes
- Shows per-venue connection status (connecting / connected / disconnected / error) — if one venue drops, the app continues functioning on the other and makes the outage visible

### Quote experience

- Enter a dollar amount and select a side (buy/sell)
- The app simulates how that order would be filled across the combined book
- Shows total shares received, average fill price, slippage, and unfilled amount if the book is insufficient
- Shows a per-venue breakdown of how the fill is split — which shares come from Polymarket, which from Kalshi
- No real orders are placed; this is a pricing/quoting simulation only

### Long-running behavior

Designed to stay open for extended periods:

- Bounded book state (200 levels) prevents unbounded memory growth
- Invalid data (NaN, Infinity, negative prices/sizes) is filtered before entering the store
- WebSocket connections reconnect automatically with backoff if interrupted
- Listeners are cleaned up on reinitialize to avoid leaks

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EXTERNAL APIs                               │
│                                                                     │
│   ┌─────────────────────────┐     ┌─────────────────────────────┐  │
│   │       Polymarket        │     │          Kalshi             │  │
│   │   CLOB WebSocket API    │     │   REST + WebSocket API      │  │
│   │   (public, no auth)     │     │   (requires API key)        │  │
│   └────────────┬────────────┘     └──────────────┬──────────────┘  │
└────────────────│──────────────────────────────────│─────────────────┘
                 │ WS messages                       │ authenticated requests
                 │ raw price levels                  │
                 │                    ┌──────────────▼──────────────┐
                 │                    │       BACKEND PROXY         │
                 │                    │      Node.js (port 3001)    │
                 │                    │                             │
                 │                    │  - signs requests w/ RSA    │
                 │                    │  - proxies Kalshi WS feed   │
                 │                    └──────────────┬──────────────┘
                 │                                   │ proxied WS feed
                 │                                   │
┌────────────────▼───────────────────────────────────▼─────────────────┐
│                          SERVICES LAYER                               │
│                                                                       │
│   ┌──────────────────────────────────────────────────────────────┐   │
│   │              SimplifiedWebSocketService (base)               │   │
│   │          heartbeat · reconnect · exponential backoff         │   │
│   └──────────────────────┬───────────────────┬───────────────────┘   │
│                  extends │                   │ extends                │
│   ┌──────────────────────▼──────┐  ┌─────────▼──────────────────┐   │
│   │       PolymarketWs          │  │         KalshiWs           │   │
│   │                             │  │                            │   │
│   │  - direct WS connection     │  │  - snapshot bootstrap      │   │
│   │  - normalize 0–1 → cents    │  │  - buffer deltas until     │   │
│   │  - emit OrderBook on update │  │    snapshot confirmed       │   │
│   │                             │  │  - normalize to cents       │   │
│   └──────────────┬──────────────┘  └─────────────┬──────────────┘   │
└──────────────────│─────────────────────────────────│──────────────────┘
                   │ normalized OrderBook             │ normalized OrderBook
                   │                                  │
┌──────────────────▼──────────────────────────────────▼─────────────────┐
│                            CORE LOGIC                                  │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐  │
│   │                  orderBookAggregator.ts                        │  │
│   │                                                                │  │
│   │  1. validate  →  drop NaN / Infinity / negative values        │  │
│   │  2. merge     →  combine levels at same price from both venues│  │
│   │  3. sort      →  bids descending · asks ascending             │  │
│   │  4. cap       →  trim to 200 levels per side                  │  │
│   └─────────────────────────────┬──────────────────────────────────┘  │
│                                 │ merged OrderBook                     │
│   ┌─────────────────────────────▼──────────────────────────────────┐  │
│   │                   quoteCalculator.ts                           │  │
│   │                                                                │  │
│   │  - walk price levels from best to worst                        │  │
│   │  - simulate fill across combined book                          │  │
│   │  - compute shares · avg price · slippage · unfilled amount     │  │
│   │  - split fill attribution per venue                            │  │
│   └─────────────────────────────┬──────────────────────────────────┘  │
└─────────────────────────────────│──────────────────────────────────────┘
                                  │ quote result
┌─────────────────────────────────▼──────────────────────────────────────┐
│                             STATE LAYER                                 │
│                                                                         │
│   ┌──────────────────────────────────────────────────────────────────┐ │
│   │                  useMarketStore.ts  (Zustand)                    │ │
│   │                                                                  │ │
│   │    polymarketBook   ·   kalshiBook   ·   aggregatedBook          │ │
│   │    polymarketStatus               ·   kalshiStatus               │ │
│   └──────────┬──────────────────┬──────────────────┬─────────────────┘ │
└──────────────│──────────────────│──────────────────│────────────────────┘
               │                  │                  │ reads state
┌──────────────▼──────────────────▼──────────────────▼────────────────────┐
│                               UI LAYER                                   │
│                                                                          │
│   ┌────────────────────────────┐      ┌──────────────────────────────┐  │
│   │    OrderBook component     │      │      QuoteEngine.tsx         │  │
│   │                            │      │                              │  │
│   │  per-venue books side      │      │  dollar input · side select  │  │
│   │  by side + combined view   │      │  fill breakdown per venue    │  │
│   │  connection status badges  │      │  routing table · slippage    │  │
│   └────────────────────────────┘      └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### How data flows through the system

The app has five distinct layers, each with a single job.

**External APIs → Services**
Polymarket's CLOB WebSocket is public, so `PolymarketWs` connects directly from the browser. Kalshi requires RSA-signed requests, so the Node.js backend handles auth and proxies the feed over a local WebSocket to `KalshiWs`. Both services extend `SimplifiedWebSocketService`, which owns all reconnect and heartbeat logic so neither venue client has to reimplement it.

**Services → Core logic**
Before any data reaches the aggregator, each service normalizes its venue's price format into a shared `OrderBook` type (prices always in cents, sizes always in shares). `PolymarketWs` multiplies raw prices by 100. `KalshiWs` applies the snapshot first, then buffers any deltas that arrive early until the snapshot is confirmed, then replays them in order. After normalization the two streams are identical in shape and the aggregator treats them the same.

**Core logic → State**
`orderBookAggregator.ts` is a pure function: it takes two `OrderBook` inputs and returns one merged `OrderBook`. It merges levels at the same price across venues, sorts bids descending and asks ascending, then trims to 200 levels per side. The result is written into Zustand alongside each venue's individual book and connection status. `quoteCalculator.ts` reads the aggregated book from the store and simulates a fill walk, computing how a given dollar amount would be filled across both venues.

**State → UI**
Both UI components subscribe to Zustand and re-render when their slice of state changes. The `OrderBook` component shows three views simultaneously: Polymarket's book, Kalshi's book, and the combined book, with connection status badges so users can see immediately if a venue has dropped. `QuoteEngine` shows the fill simulation results including per-venue share attribution and the routing table.

---

## How to run

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Start the backend proxy (required for Kalshi)

Kalshi requires API key authentication, so a lightweight Node.js proxy handles auth and forwards data to the frontend over a local WebSocket.

**Setup:**

Create a `.env` file in `backend/`:

```env
PORT=3001
KALSHI_API_KEY=your_api_key_here
```

Place your Kalshi RSA private key at:

```
backend/kalshi_private_key.pem
```

**Start the proxy:**

```bash
cd backend
npm install
node ./src/index.js
```

The proxy listens on port 3001 and forwards Kalshi order book updates to the frontend.

### 3. Start the frontend

From the project root:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Key files

| File | Responsibility |
|---|---|
| `src/store/useMarketStore.ts` | Zustand store — holds per-venue and aggregated book state, connection statuses |
| `src/utils/orderBookAggregator.ts` | Pure aggregation logic — merge, sort, cap at 200 levels |
| `src/services/SimplifiedWebSocketService.ts` | Generic WebSocket client with heartbeat and reconnect/backoff |
| `src/services/kalshiWs.ts` | Kalshi-specific WS — handles subscription, snapshot bootstrap, delta application |
| `src/utils/quoteCalculator.ts` | Pure quote simulation — fill walk, slippage, venue split |
| `src/components/QuoteEngine.tsx` | Quote UI — input, results, per-venue routing table |

---

## Requirements covered

| Requirement | Status |
|---|---|
| Market view with real-time combined order book | ✅ |
| Per-venue and aggregated book displayed together | ✅ |
| Live WebSocket aggregation from both venues | ✅ |
| One-venue outage handling with visible status | ✅ |
| Quote calculator with cross-venue fill split | ✅ |
| Long-running robustness (bounded depth, reconnect, data guards) | ✅ |

---

## Design decisions & tradeoffs

**Minimal backend.** The frontend connects directly to Polymarket (public API, no auth required). The Node.js backend exists only to hold the Kalshi API key and proxy the WebSocket feed — it has no business logic. Everything else runs in the browser.

**Depth cap at 200 levels.** Prediction market order books are rarely deep enough for 200 levels to matter in practice, but in long-running sessions with high-frequency updates, an unbounded map will grow indefinitely. 200 is a safe ceiling that covers all realistic liquidity without memory risk.

**Aggregator as a pure function.** `orderBookAggregator.ts` takes two `OrderBook` inputs and returns a merged one. It has no side effects and no store dependency. This makes it straightforward to unit test and to swap out independently.

**Zustand over Redux or Context.** The state shape is simple — two venue books, one aggregated book, two connection statuses. Zustand handles this with minimal boilerplate and, importantly, allows store state to be read outside React components (needed by the quote calculator and service layer).

**Quote-only, no execution.** No order placement is implemented. The quote engine simulates fills against the live book purely for pricing purposes, which is all the assignment requires.

---

## Edge cases handled

- `NaN`, `Infinity`, and negative price/size values are dropped before entering the store
- Empty order books produce clean zero-fill quotes rather than errors
- Kalshi snapshot arrives before deltas are applied; if deltas arrive first they are buffered
- One venue disconnecting does not affect the other venue's book or the quote engine
- Duplicate or empty WS updates do not trigger unnecessary re-renders
- Book map is trimmed to 200 entries on every update to prevent growth over time

---

## What I'd improve with more time

### Correctness

**Explicit price normalization layer.** Polymarket prices are 0–1 fractions; Kalshi uses cents (0–100). Currently normalization is implicit and scattered. I'd add a `NormalizedLevel` type with a strict contract that all prices entering the aggregator are always in the same unit, with the conversion happening explicitly in each venue's service layer. Without this contract being enforced by the type system, the merged book can be silently wrong.

**Reconnect → snapshot handoff in `KalshiWsService`.** When the WebSocket reconnects, the service must treat it as a fresh connection: reset the snapshot flag, clear any buffered deltas, and re-request a full snapshot before applying new deltas. Currently this handoff isn't guaranteed — a reconnect can leave the Kalshi book in a corrupted intermediate state. I'd make `onReconnect()` an explicit lifecycle method in `KalshiWsService` that enforces this sequence.

**Sequence number tracking.** Kalshi sends sequence numbers on every delta. I'd track `lastSeq` and drop any delta where `seq <= lastSeq` (duplicate or out-of-order). If a gap is detected (`seq !== lastSeq + 1`), force a re-snapshot rather than silently applying a potentially inconsistent delta. Without this, the book is eventually consistent in good conditions and silently wrong after any network blip.

### Performance

**RAF-based update throttling.** Polymarket can emit 10–50 WebSocket messages per second on an active market. Each message currently triggers a Zustand state update and a full React re-render of the order book. I'd batch pending updates from both venues and flush them via `requestAnimationFrame`, capping renders at ~60fps regardless of incoming message rate. This is the difference between "works in a demo" and "stays responsive after 4 hours on a live market."

### Engineering quality

**Store / logic separation.** The store currently owns both state and some update orchestration. I'd make it a pure state container (`polymarketBook`, `kalshiBook`, `aggregatedBook`, connection statuses) and move all update logic into the service layer, calling `aggregateBooks` as a pure function from outside the store. This makes the aggregator testable without mocking Zustand.

**Unit tests on the two core utilities.** The highest-value tests are on `orderBookAggregator` (merge correctness at the same price level, depth cap enforcement, NaN filtering, sort order) and `quoteCalculator` (single-venue fill, cross-venue split, empty book, partial fill with unfilled remainder). About 10 focused tests would catch the correctness issues above in seconds without a live API connection.

**Historical depth chart.** A time-series view of bid/ask depth over time would make it much easier to see how liquidity shifts between venues during active trading. This is purely additive — the data is already flowing, it just needs to be retained and rendered.

---

## Quick manual checks

1. Start both backend and frontend, observe the combined order book populating from both venues
2. Kill the backend (simulating Kalshi outage) — Polymarket book should continue updating, connection status should show Kalshi as disconnected
3. Enter a large dollar amount in the quote engine to trigger a partial fill and verify the unfilled amount is correct
4. Leave the app running for an extended period and confirm book depth stays bounded and UI remains responsive