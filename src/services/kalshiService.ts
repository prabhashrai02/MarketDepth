type Order = {
  price: number;
  size: number;
  venue: "kalshi";
};

export type OrderBook = {
  bids: Order[];
  asks: Order[];
};

// ⚠️ replace with real ticker
const MARKET_TICKER = "kxpresperson-28";


export async function fetchKalshiOrderbook(): Promise<OrderBook> {
  try {
    const res = await fetch(
      `https://trading-api.kalshi.com/v1/markets/${MARKET_TICKER}`
    );
    const data = await res.json();

    const ob = data.orderbook || { bids: [], asks: [] };

    return {
      bids: ob.bids.map((b: any) => ({
        price: b.price / 100,
        size: b.size,
        venue: "kalshi",
      })),
      asks: ob.asks.map((a: any) => ({
        price: a.price / 100,
        size: a.size,
        venue: "kalshi",
      })),
    };
  } catch (e) {
    console.error("Kalshi error", e);
    return { bids: [], asks: [] };
  }
}