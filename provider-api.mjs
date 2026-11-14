export async function handleProviderRequest(url, getSecret) {
  const path = url.pathname.replace(/^\/flight(?=\/api\/)/, "");
  if (path === "/api/provider-status") {
    return Response.json({ carto: Boolean(getSecret("CARTO_API_KEY")) }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  if (path === "/api/aviationstack") {
    const key = getSecret("AVIATIONSTACK_API_KEY");
    if (!key) return new Response(null, { status: 503 });

    const flight = url.searchParams.get("flight") || "";
    if (!/^[A-Z0-9-]{3,12}$/.test(flight)) return new Response(null, { status: 400 });

    const upstream = new URL("https://api.aviationstack.com/v1/flights");
    const field = /^[A-Z]{2}[0-9]/.test(flight) ? "flight_iata" : "flight_icao";
    upstream.searchParams.set(field, flight);
    upstream.searchParams.set("access_key", key);
    try {
      const response = await fetch(upstream, { signal: AbortSignal.timeout(5500), redirect: "error" });
      if (!response.ok) return new Response(null, { status: response.status === 429 ? 429 : 502 });

      const data = await response.json();
      if (data.error) {
        const quota = ["usage_limit_reached", "rate_limit_reached", 104].includes(data.error.code);
        return new Response(null, { status: quota ? 429 : 502 });
      }
      const flights = Array.isArray(data.data) ? data.data : [];
      const item = flights.find(flight => flight.flight_status === "active") || flights[0];
      const fields = ["actual", "actual_runway", "estimated", "estimated_runway",
        "scheduled", "airport", "iata", "icao", "terminal", "gate"];
      const select = info => Object.fromEntries(fields.map(field => [field, info?.[field] ?? null]));
      return Response.json({
        data: item ? [{
          departure: select(item.departure),
          arrival: select(item.arrival),
          airline: { name: item.airline?.name },
          flight_status: item.flight_status,
        }] : [],
      }, { headers: { "Cache-Control": "public, max-age=300" } });
    } catch {
      return new Response(null, { status: 502 });
    }
  }

  const tile = path.match(/^\/api\/carto\/(dark_all|light_all|dark_only_labels)\/(\d{1,2})\/(\d{1,6})\/(\d{1,6})(@2x)?\.png$/);
  if (!tile || +tile[2] > 19 || +tile[3] >= 2 ** +tile[2] || +tile[4] >= 2 ** +tile[2]) {
    return new Response(null, { status: 404 });
  }
  const key = getSecret("CARTO_API_KEY");
  if (!key) return new Response(null, { status: 503 });

  const upstream = new URL(path.replace("/api/carto/", "/"), "https://a.basemaps.cartocdn.com");
  upstream.searchParams.set("key", key);
  try {
    const response = await fetch(upstream, { signal: AbortSignal.timeout(5000), redirect: "error" });
    const contentType = response.headers.get("Content-Type");
    if (!response.ok || !contentType?.startsWith("image/")) {
      await response.body?.cancel();
      return new Response(null, { status: 502 });
    }
    return new Response(response.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": response.headers.get("Cache-Control") || "public, max-age=3600",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
}
