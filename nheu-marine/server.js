// ══════════════════════════════════════════════════════════════
//  NheuMarine — Servidor Local y Conector AISStream en Vivo
// ══════════════════════════════════════════════════════════════

const http = require("http");
const fs = require("fs");
const path = require("path");

const secretsFile = process.env.NHEU_SECRETS_FILE || path.join(
  process.env.LOCALAPPDATA || path.join(require("os").homedir(), ".config"),
  "NheuFlight", ".env",
);
try {
  process.loadEnvFile(secretsFile);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const PORT = parseInt(process.env.PORT || "8085", 10);
const ROOT = __dirname;
const AIS_API_KEY = process.env.AIS_KEY;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Almacén en memoria de buques reales en vivo
const liveVesselsMap = new Map();
const VESSEL_TTL_MS = 25 * 60 * 1000; // 25 minutos sin señal antes de purgar

let aisWs = null;
let reconnectTimer = null;
let lastAisMessageTime = 0;

// ══════════════════════════════════════════════════════════════
//  CONECTOR AISSTREAM.IO WEBSOCKET (DATOS 100% REALES EN VIVO)
// ══════════════════════════════════════════════════════════════
function connectAisStream() {
  if (!AIS_API_KEY) {
    console.log("ℹ️  No hay AIS_API_KEY configurada. Servidor en modo local.");
    return;
  }

  clearTimeout(reconnectTimer);
  console.log("🌐 Conectando a AISStream.io con clave API...");

  try {
    aisWs = new WebSocket("wss://stream.aisstream.io/v0/stream");

    aisWs.onopen = () => {
      console.log("⚓ ¡Conectado a AISStream.io! Transmitiendo buques en vivo...");
      const subscription = {
        APIKey: AIS_API_KEY,
        // Cobertura: Península Ibérica, Baleares, Estrecho de Gibraltar y Canarias
        BoundingBoxes: [
          [[26.0, -19.0], [45.5, 6.5]]
        ],
        FilterMessageTypes: ["PositionReport", "StandardClassBPositionReport", "ShipStaticData"]
      };
      aisWs.send(JSON.stringify(subscription));
    };

    aisWs.onmessage = async (event) => {
      try {
        lastAisMessageTime = Date.now();
        const rawText = typeof event.data === "string" ? event.data : await event.data.text();
        const msg = JSON.parse(rawText);

        const mmsi = msg?.MetaData?.MMSI;
        if (!mmsi) return;

        const now = Date.now();
        const existing = liveVesselsMap.get(mmsi) || { mmsi };

        // Datos del encabezado Metadata
        const rawName = msg.MetaData.ShipName?.replace(/@/g, " ").trim();
        if (rawName && rawName !== "UNKNOWN" && rawName !== "DESCONOCIDO") {
          existing.name = rawName;
        }

        if (msg.MetaData.latitude != null && msg.MetaData.longitude != null) {
          existing.lat = msg.MetaData.latitude;
          existing.lon = msg.MetaData.longitude;
        }

        // Datos según tipo de reporte AIS
        if (msg.MessageType === "PositionReport") {
          const pr = msg.Message.PositionReport;
          if (pr.Cog != null) existing.cog = pr.Cog;
          if (pr.Sog != null) existing.sog = pr.Sog;
          if (pr.TrueHeading != null && pr.TrueHeading < 360) existing.heading = pr.TrueHeading;
        } else if (msg.MessageType === "StandardClassBPositionReport") {
          const b = msg.Message.StandardClassBPositionReport;
          if (b.Cog != null) existing.cog = b.Cog;
          if (b.Sog != null) existing.sog = b.Sog;
          if (b.TrueHeading != null && b.TrueHeading < 360) existing.heading = b.TrueHeading;
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

        // Solo guardar si tiene posición válida
        if (existing.lat != null && existing.lon != null) {
          liveVesselsMap.set(mmsi, existing);
        }
      } catch (err) {
        // Ignorar mensajes individuales malformados
      }
    };

    aisWs.onerror = (err) => {
      console.warn("⚠️ Aviso WebSocket AISStream:", err.message || "Error de conexión");
    };

    aisWs.onclose = () => {
      console.log("🔄 Conexión AISStream cerrada. Reconectando en 5 segundos...");
      reconnectTimer = setTimeout(connectAisStream, 5000);
    };
  } catch (err) {
    console.error("Error al inicializar WebSocket AISStream:", err.message);
    reconnectTimer = setTimeout(connectAisStream, 8000);
  }
}

// Limpieza periódica de buques viejos sin señal (> 25 min)
setInterval(() => {
  const now = Date.now();
  for (const [mmsi, v] of liveVesselsMap.entries()) {
    if (now - (v.updatedAt || 0) > VESSEL_TTL_MS) {
      liveVesselsMap.delete(mmsi);
    }
  }
}, 60000);

// Iniciar conector AIS
connectAisStream();

// ══════════════════════════════════════════════════════════════
//  SERVIDOR HTTP Y API REST
// ══════════════════════════════════════════════════════════════
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = parsedUrl.pathname;

  // Endpoint de salud
  if (pathname === "/api/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      service: "NheuMarine",
      liveVessels: liveVesselsMap.size,
      lastMessage: lastAisMessageTime ? new Date(lastAisMessageTime).toISOString() : null,
      uptime: process.uptime()
    }));
    return;
  }

  // Endpoint de barcos en vivo
  if (pathname === "/api/vessels") {
    const vessels = Array.from(liveVesselsMap.values());
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(vessels));
    return;
  }

  // Endpoint para inyectar buques manualmente
  if (pathname === "/api/vessels/ingest" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        const list = Array.isArray(payload) ? payload : [payload];
        list.forEach((v) => {
          if (v.mmsi) {
            v.updatedAt = Date.now();
            v.isLive = true;
            liveVesselsMap.set(v.mmsi, v);
          }
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, count: liveVesselsMap.size }));
      } catch (err) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "JSON inválido" }));
      }
    });
    return;
  }

  // Servir archivos estáticos del radar
  let safePath = path.normalize(pathname).replace(/^(\.\.[\/\\])+/, "");
  if (safePath === "/" || safePath === "\\") safePath = "/index.html";
  const filePath = path.join(ROOT, safePath);

  if (safePath.split(/[\\/]/).some(part => part.startsWith('.'))) {
    res.writeHead(404).end();
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 No Encontrado");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("═════════════════════════════════════════════════════════");
  console.log(`  ⚓ NheuMarine Server activo en: http://localhost:${PORT}`);
  console.log("  📡 Conexión satelital AISStream.io ACTIVADA");
  console.log("  Recibiendo buques reales en vivo en tiempo real");
  console.log("═════════════════════════════════════════════════════════");
});
