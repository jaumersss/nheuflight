// Netlify Serverless Function — NheuFlight ADS-B Proxy
// Permite que la web en nheu.cat cargue aviones en vivo en cualquier navegador sin errores CORS

exports.handler = async function (event, context) {
  const params = event.queryStringParameters || {};
  const lat = parseFloat(params.lat || "41.3879");
  const lon = parseFloat(params.lon || "2.1699");
  const radius = Math.min(250, parseInt(params.radius_nm || params.dist || "150", 10));

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=3"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  // 1. Probar opendata.adsb.fi v3
  try {
    const url = "https://opendata.adsb.fi/api/v3/lat/" + lat.toFixed(4) + "/lon/" + lon.toFixed(4) + "/dist/" + radius;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NheuFlight/1.0",
        "Accept": "application/json"
      },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      const ac = Array.isArray(data?.ac) ? data.ac : (Array.isArray(data?.aircraft) ? data.aircraft : []);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ac, total: ac.length, now: Date.now() })
      };
    }
  } catch (e) {}

  // 2. Probar api.adsb.lol v2 point
  try {
    const url = "https://api.adsb.lol/v2/point/" + lat.toFixed(4) + "/" + lon.toFixed(4) + "/" + radius;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) NheuFlight/1.0",
        "Accept": "application/json"
      },
      signal: AbortSignal.timeout(6000)
    });
    if (res.ok) {
      const data = await res.json();
      const ac = Array.isArray(data?.ac) ? data.ac : (Array.isArray(data?.aircraft) ? data.aircraft : []);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ac, total: ac.length, now: Date.now() })
      };
    }
  } catch (e) {}

  return {
    statusCode: 502,
    headers,
    body: JSON.stringify({ error: "Upstream ADS-B unavailable", ac: [] })
  };
};
