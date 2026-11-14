const http = require('http');
const fs = require('fs');
const path = require('path');
const { Readable } = require('node:stream');
const providerApi = import('./provider-api.mjs');

const secretsFile = process.env.NHEU_SECRETS_FILE || path.join(
  process.env.LOCALAPPDATA || path.join(require("os").homedir(), ".config"),
  "NheuFlight", ".env",
);
try {
  process.loadEnvFile(secretsFile);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const PORT = parseInt(process.env.PORT || '8080', 10);
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.geojson': 'application/geo+json; charset=utf-8'
};

// Cache en memoria para evitar saturar las APIs upstream
const memoryCache = new Map();
const CACHE_TTL_MS = 4000;

async function fetchUpstreamAdsb(lat, lon, radiusNm) {
  const dist = Math.max(10, Math.min(250, parseInt(radiusNm, 10) || 250));
  const cacheKey = `${lat.toFixed(2)}_${lon.toFixed(2)}_${dist}`;
  const now = Date.now();

  if (memoryCache.has(cacheKey)) {
    const cached = memoryCache.get(cacheKey);
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }
  }

  const apis = [
    `https://opendata.adsb.fi/api/v3/lat/${lat.toFixed(4)}/lon/${lon.toFixed(4)}/dist/${dist}`,
    `https://api.adsb.lol/v2/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${dist}`,
    `https://api.airplanes.live/v2/point/${lat.toFixed(4)}/${lon.toFixed(4)}/${dist}`
  ];

  let lastError = null;
  for (const apiUrl of apis) {
    try {
      const res = await fetch(apiUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NheuFlight/1.0'
        },
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const list = Array.isArray(data?.ac)
        ? data.ac
        : Array.isArray(data?.aircraft)
          ? data.aircraft
          : [];

      const result = { ac: list, total: list.length, now: Date.now() };
      memoryCache.set(cacheKey, { timestamp: now, data: result });
      return result;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('No se pudo contactar con los proveedores ADS-B');
}

// ══════════════════════════════════════════════════════════════
//  CONECTOR AISSTREAM.IO EN SERVIDOR (BUQUES EN TIEMPO REAL)
// ══════════════════════════════════════════════════════════════
const liveVesselsMap = new Map();
const VESSEL_TTL_MS = 25 * 60 * 1000;
const AIS_API_KEY = process.env.AIS_KEY;
let aisWs = null;
let aisReconnectTimer = null;
let currentAisBox = [[26.0, -19.0], [45.5, 6.5]];

function connectServerAis() {
  if (!AIS_API_KEY || typeof WebSocket === "undefined") return;
  clearTimeout(aisReconnectTimer);

  try {
    aisWs = new WebSocket("wss://stream.aisstream.io/v0/stream");
    aisWs.onopen = () => {
      console.log("⚓ Servidor: ¡Conectado a AISStream.io! Transmitiendo buques en vivo...");
      aisWs.send(JSON.stringify({
        APIKey: AIS_API_KEY,
        BoundingBoxes: [currentAisBox],
        FilterMessageTypes: ["PositionReport", "StandardClassBPositionReport", "ShipStaticData"]
      }));
    };

    aisWs.onmessage = async (event) => {
      try {
        const rawText = typeof event.data === "string" ? event.data : await event.data.text();
        const msg = JSON.parse(rawText);
        const mmsi = msg?.MetaData?.MMSI;
        if (!mmsi) return;

        const now = Date.now();
        const existing = liveVesselsMap.get(mmsi) || { mmsi };

        const rawName = msg.MetaData.ShipName?.replace(/@/g, " ").trim();
        if (rawName && rawName !== "UNKNOWN" && rawName !== "DESCONOCIDO") {
          existing.name = rawName;
        }

        if (msg.MetaData.latitude != null && msg.MetaData.longitude != null) {
          existing.lat = msg.MetaData.latitude;
          existing.lon = msg.MetaData.longitude;
        }

        if (msg.MessageType === "PositionReport" || msg.MessageType === "StandardClassBPositionReport") {
          const pr = msg.Message.PositionReport || msg.Message.StandardClassBPositionReport;
          if (pr.Cog != null) existing.cog = pr.Cog;
          if (pr.Sog != null) existing.sog = pr.Sog;
          if (pr.TrueHeading != null && pr.TrueHeading < 360) existing.heading = pr.TrueHeading;
        } else if (msg.MessageType === "ShipStaticData") {
          const st = msg.Message.ShipStaticData;
          if (st.Type) existing.type = st.Type;
          if (st.ImoNumber && st.ImoNumber > 0) existing.imo = st.ImoNumber;
          if (st.CallSign) existing.callsign = st.CallSign.replace(/@/g, " ").trim();
          if (st.Destination) existing.destination = st.Destination.replace(/@/g, " ").trim();
          if (st.Dimension) {
            existing.length = (st.Dimension.A || 0) + (st.Dimension.B || 0);
            existing.width = (st.Dimension.C || 0) + (st.Dimension.D || 0);
          }
        }

        existing.updatedAt = now;
        existing.isLive = true;

        if (existing.lat != null && existing.lon != null) {
          liveVesselsMap.set(mmsi, existing);
        }
      } catch (err) {}
    };

    aisWs.onerror = () => {};
    aisWs.onclose = () => {
      aisReconnectTimer = setTimeout(connectServerAis, 5000);
    };
  } catch (err) {
    aisReconnectTimer = setTimeout(connectServerAis, 8000);
  }
}

connectServerAis();

setInterval(() => {
  const now = Date.now();
  for (const [mmsi, v] of liveVesselsMap.entries()) {
    if (now - (v.updatedAt || 0) > VESSEL_TTL_MS) {
      liveVesselsMap.delete(mmsi);
    }
  }
}, 60000);

const server = http.createServer(async (req, res) => {
  // CORS universal
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  if (/^(?:\/flight)?\/api\/(?:provider-status$|aviationstack$|carto\/)/.test(pathname)) {
    if (req.method !== 'GET') {
      res.writeHead(405).end();
      return;
    }
    try {
      const { handleProviderRequest } = await providerApi;
      const response = await handleProviderRequest(parsedUrl, name => process.env[name]);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      if (response.body) {
        const body = Readable.fromWeb(response.body);
        body.on('error', () => res.destroy());
        res.on('close', () => body.destroy());
        body.pipe(res);
      } else {
        res.end();
      }
    } catch {
      if (res.headersSent) res.destroy();
      else res.writeHead(502).end();
    }
    return;
  }


  // Endpoint de salud
  if (pathname === '/api/health' || pathname === '/flight/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  // Proxy transparente compatible con Netlify / Vercel (_redirects)
  const isAdsbFiProxy = pathname.startsWith('/api/adsb/') || pathname.startsWith('/flight/api/adsb/');
  const isAdsbLolProxy = pathname.startsWith('/api/adsblol/') || pathname.startsWith('/flight/api/adsblol/');

  if (isAdsbFiProxy || isAdsbLolProxy) {
    const subPath = pathname.replace(/^(\/flight)?\/api\/adsb(lol)?/, '');
    const upstreamBase = isAdsbLolProxy ? 'https://api.adsb.lol/v2' : 'https://opendata.adsb.fi/api/v3';
    try {
      const upRes = await fetch(`${upstreamBase}${subPath}`, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NheuFlight/1.0'
        },
        signal: AbortSignal.timeout(8000)
      });
      const data = await upRes.text();
      res.writeHead(upRes.status, { 'Content-Type': 'application/json' });
      res.end(data);
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, ac: [] }));
    }
    return;
  }
  // Endpoint de fotos de aviones (Planespotters con User-Agent seguro + Fallback hexdb)
  if (pathname === '/api/photo' || pathname === '/flight/api/photo') {
    const hex = (parsedUrl.searchParams.get('hex') || '').trim().toLowerCase();
    const reg = (parsedUrl.searchParams.get('reg') || '').trim();
    const cacheKey = `photo_${hex}_${reg}`;
    const now = Date.now();

    if (memoryCache.has(cacheKey)) {
      const cached = memoryCache.get(cacheKey);
      if (now - cached.timestamp < 3600000) {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify(cached.data));
        return;
      }
    }

    let photoUrl = null;
    let photoLink = 'https://www.planespotters.net';

    if (reg && reg !== '—' && reg !== '---') {
      try {
        const r = await fetch(`https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`, {
          headers: { 'User-Agent': 'NheuFlight/1.0 (contact@nheu.cat)' },
          signal: AbortSignal.timeout(4500)
        });
        if (r.ok) {
          const d = await r.json();
          if (d.photos && d.photos.length) {
            photoUrl = d.photos[0].thumbnail_large?.src || d.photos[0].thumbnail?.src;
            photoLink = d.photos[0].link || photoLink;
          }
        }
      } catch (e) {}
    }

    if (!photoUrl && hex) {
      try {
        const r = await fetch(`https://api.planespotters.net/pub/photos/hex/${hex}`, {
          headers: { 'User-Agent': 'NheuFlight/1.0 (contact@nheu.cat)' },
          signal: AbortSignal.timeout(4500)
        });
        if (r.ok) {
          const d = await r.json();
          if (d.photos && d.photos.length) {
            photoUrl = d.photos[0].thumbnail_large?.src || d.photos[0].thumbnail?.src;
            photoLink = d.photos[0].link || photoLink;
          }
        }
      } catch (e) {}
    }

    if (!photoUrl && hex) {
      try {
        const r = await fetch(`https://hexdb.io/hex-image?hex=${hex}`, {
          signal: AbortSignal.timeout(4000)
        });
        if (r.ok) {
          const txt = (await r.text()).trim();
          if (txt.startsWith('http')) {
            photoUrl = txt;
            photoLink = `https://www.planespotters.net/search?q=${encodeURIComponent(reg || hex)}`;
          }
        }
      } catch (e) {}
    }

    const result = { photoUrl, photoLink, success: !!photoUrl };
    memoryCache.set(cacheKey, { timestamp: now, data: result });
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(result));
    return;
  }

  // Endpoint de aviones proxy directo
  if (pathname === '/api/planes' || pathname === '/flight/api/planes') {
    const lat = parseFloat(parsedUrl.searchParams.get('lat') || '40.4168');
    const lon = parseFloat(parsedUrl.searchParams.get('lon') || '-3.7038');
    const radius = parseFloat(parsedUrl.searchParams.get('radius_nm') || '250');

    try {
      const data = await fetchUpstreamAdsb(lat, lon, radius);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (err) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message, ac: [] }));
    }
    return;
  }

  // Endpoint de barcos proxy / estado
  if (pathname === '/api/vessels' || pathname === '/flight/api/vessels') {
    const s = parseFloat(parsedUrl.searchParams.get('south'));
    const w = parseFloat(parsedUrl.searchParams.get('west'));
    const n = parseFloat(parsedUrl.searchParams.get('north'));
    const e = parseFloat(parsedUrl.searchParams.get('east'));

    if (!isNaN(s) && !isNaN(w) && !isNaN(n) && !isNaN(e)) {
      const box = [[Math.max(-89.9, s), Math.max(-179.9, w)], [Math.min(89.9, n), Math.min(179.9, e)]];
      currentAisBox = box;
      if (aisWs && aisWs.readyState === 1) {
        try {
          aisWs.send(JSON.stringify({
            APIKey: AIS_API_KEY,
            BoundingBoxes: [box],
            FilterMessageTypes: ["PositionReport", "StandardClassBPositionReport", "ShipStaticData"]
          }));
        } catch (err) {}
      }
    }

    const all = Array.from(liveVesselsMap.values());
    let filtered = all;
    if (!isNaN(s) && !isNaN(n) && !isNaN(w) && !isNaN(e)) {
      filtered = all.filter(v => v.lat >= s - 0.2 && v.lat <= n + 0.2 && v.lon >= w - 0.2 && v.lon <= e + 0.2);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(filtered));
    return;
  }

  // Archivos estáticos
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') safePath = '/index.html';
  const filePath = path.join(ROOT, safePath);

  if (safePath.split(/[\\/]/).some(part => part.startsWith('.'))) {
    res.writeHead(404).end();
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  NheuFlight Server activo en: http://localhost:${PORT}`);
  console.log('  Proxy ADS-B listo para enviar aviones al navegador');
  console.log('═══════════════════════════════════════════════════════');
});
