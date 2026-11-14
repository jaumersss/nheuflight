// Netlify Edge Function — NheuFlight Stock Quotes Proxy (Yahoo Finance)
export default async (request, context) => {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "*",
    "cache-control": "public, max-age=15"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  const symbols = ["SPY", "NVDA", "AAPL", "MSFT", "TSLA", "AMZN", "GOOGL"];
  try {
    const results = await Promise.all(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d`, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NheuFlight/1.0",
              "Accept": "application/json"
            }
          });
          if (!res.ok) return null;
          const data = await res.json();
          const meta = data?.chart?.result?.[0]?.meta;
          if (!meta) return null;
          const price = meta.regularMarketPrice;
          const prev = meta.chartPreviousClose || price;
          const changePct = prev ? ((price - prev) / prev) * 100 : 0;
          return {
            symbol: sym,
            price: parseFloat(price.toFixed(2)),
            changePct: parseFloat(changePct.toFixed(2)),
            currency: meta.currency || "USD"
          };
        } catch (e) {
          return null;
        }
      })
    );
    const valid = results.filter(Boolean);
    return new Response(JSON.stringify({ ok: true, data: valid }), { status: 200, headers });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: err.message, data: [] }), { status: 500, headers });
  }
};
