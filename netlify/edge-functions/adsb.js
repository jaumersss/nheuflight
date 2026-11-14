// Netlify Edge Function — NheuFlight ADS-B Proxy
export default async (request, context) => {
  const url = new URL(request.url);
  const lat = parseFloat(url.searchParams.get("lat") || "41.3879");
  const lon = parseFloat(url.searchParams.get("lon") || "2.1699");
  const dist = Math.min(250, parseInt(url.searchParams.get("radius_nm") || url.searchParams.get("dist") || "150", 10));

  const headers = {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "*",
    "cache-control": "public, max-age=3"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // 1. opendata.adsb.fi v3
  try {
    const target = "https://opendata.adsb.fi/api/v3/lat/" + lat.toFixed(4) + "/lon/" + lon.toFixed(4) + "/dist/" + dist;
    const res = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NheuFlight/1.0",
        "Accept": "application/json"
      }
    });
    if (res.ok) {
      const text = await res.text();
      return new Response(text, { status: 200, headers });
    }
  } catch (err) {}

  // 2. api.adsb.lol v2 point
  try {
    const target = "https://api.adsb.lol/v2/point/" + lat.toFixed(4) + "/" + lon.toFixed(4) + "/" + dist;
    const res = await fetch(target, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NheuFlight/1.0",
        "Accept": "application/json"
      }
    });
    if (res.ok) {
      const text = await res.text();
      return new Response(text, { status: 200, headers });
    }
  } catch (err) {}

  return new Response(JSON.stringify({ error: "Upstream ADS-B unavailable", ac: [] }), {
    status: 502,
    headers
  });
};
