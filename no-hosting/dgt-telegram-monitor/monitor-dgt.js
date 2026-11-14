#!/usr/bin/env node
"use strict";

const fs = require("node:fs/promises");
const path = require("node:path");
const {
  getDgtAircraftId,
  getDgtNickname,
  isDgtAircraft,
} = require("./dgt-aircraft.js");

const ADSB_APIS = [
  "https://api.adsb.lol/v2",
  "https://api.airplanes.live/v2",
  "https://api.adsb.one/v2",
];

const SPAIN_SECTORS = [
  { name: "Noroeste peninsula", lat: 42.9, lon: -7.2, radiusNm: 190 },
  { name: "Norte peninsula", lat: 43.1, lon: -3.6, radiusNm: 180 },
  { name: "Nordeste peninsula", lat: 41.8, lon: 1.2, radiusNm: 190 },
  { name: "Centro peninsula", lat: 40.3, lon: -3.7, radiusNm: 210 },
  { name: "Oeste peninsula", lat: 39.2, lon: -6.4, radiusNm: 175 },
  { name: "Este peninsula", lat: 39.2, lon: -0.7, radiusNm: 185 },
  { name: "Sur peninsula", lat: 37.2, lon: -4.4, radiusNm: 210 },
  { name: "Baleares", lat: 39.6, lon: 2.9, radiusNm: 130 },
  { name: "Canarias oeste", lat: 28.3, lon: -16.6, radiusNm: 115 },
  { name: "Canarias este", lat: 28.3, lon: -14.1, radiusNm: 115 },
  { name: "Ceuta Melilla", lat: 35.5, lon: -3.9, radiusNm: 125 },
];

const STATE_PATH = path.resolve(process.env.DGT_STATE_FILE || "state.json");
const SOURCE_LABEL = "ADS-B public APIs";
const ABSENT_RUNS_BEFORE_OFF = Number.parseInt(
  process.env.DGT_ABSENT_RUNS_BEFORE_OFF || "2",
  10,
);

function log(message, extra) {
  const suffix = extra == null ? "" : ` ${JSON.stringify(extra)}`;
  console.log(`[dgt-monitor] ${message}${suffix}`);
}

function clean(value) {
  return String(value || "").trim();
}

function numberOrNull(value) {
  if (value == null || value === "ground") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeAircraft(ac, source) {
  const lat = numberOrNull(ac.lat);
  const lon = numberOrNull(ac.lon);
  const gs = numberOrNull(ac.gs ?? ac.speed);
  const alt = numberOrNull(ac.alt_baro ?? ac.altitude ?? ac.alt_geom);
  const hex = clean(ac.hex || ac.icao || ac.icao24).toUpperCase();
  const call = clean(ac.flight || ac.call || ac.callsign || hex).toUpperCase();
  const reg = clean(ac.r || ac.registration || ac.reg).toUpperCase();

  return {
    ...ac,
    hex,
    call,
    flight: call,
    r: reg,
    reg,
    lat,
    lon,
    alt,
    spd: gs,
    spdKmh: gs == null ? null : Math.round(gs * 1.852),
    source,
  };
}

function isInSpain(lat, lon) {
  if (lat == null || lon == null) return false;

  const mainlandAndBalearic =
    lat >= 35.7 && lat <= 43.9 && lon >= -9.6 && lon <= 4.6;
  const canaryIslands = lat >= 27.4 && lat <= 29.5 && lon >= -18.5 && lon <= -13.2;
  const ceutaMelilla = lat >= 35.0 && lat <= 35.95 && lon >= -5.8 && lon <= -2.6;

  return mainlandAndBalearic || canaryIslands || ceutaMelilla;
}

async function fetchJson(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: { "User-Agent": "NheuFlight DGT Monitor/1.0" },
  });
  if (!response.ok) throw new Error(`${url} HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data?.ac)) throw new Error(`${url} response without ac[]`);
  return data.ac;
}

async function fetchSector(sector) {
  let lastError = null;
  for (const base of ADSB_APIS) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const url = `${base}/point/${sector.lat.toFixed(4)}/${sector.lon.toFixed(4)}/${sector.radiusNm}`;
    try {
      const ac = await fetchJson(url, controller.signal);
      clearTimeout(timeout);
      log(`sector ok: ${sector.name}`, { provider: base, aircraft: ac.length });
      return ac.map((item) => normalizeAircraft(item, base));
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      log(`sector failed: ${sector.name}`, { provider: base, error: error.message });
    }
  }
  throw lastError || new Error(`No provider available for ${sector.name}`);
}

async function fetchSpainAircraft() {
  const settled = await Promise.allSettled(SPAIN_SECTORS.map(fetchSector));
  const byHex = new Map();
  let failures = 0;

  for (const result of settled) {
    if (result.status !== "fulfilled") {
      failures += 1;
      log("sector unavailable", { error: result.reason?.message || String(result.reason) });
      continue;
    }

    for (const ac of result.value) {
      if (ac.gnd || ac.lat == null || ac.lon == null || !isInSpain(ac.lat, ac.lon)) continue;
      const key = ac.hex || `${ac.call}-${ac.lat}-${ac.lon}`;
      if (!byHex.has(key)) byHex.set(key, ac);
    }
  }

  if (!byHex.size && failures === SPAIN_SECTORS.length) {
    throw new Error("All ADS-B sectors failed");
  }

  return [...byHex.values()];
}

async function readState() {
  try {
    const raw = await fs.readFile(STATE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return {
      version: 1,
      aircraft: {},
      ...parsed,
      aircraft: parsed.aircraft && typeof parsed.aircraft === "object" ? parsed.aircraft : {},
    };
  } catch (error) {
    if (error.code !== "ENOENT") log("state read failed, starting fresh", { error: error.message });
    return { version: 1, aircraft: {} };
  }
}

async function writeState(state) {
  await fs.writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function summarizeAircraft(ac) {
  return {
    id: getDgtAircraftId(ac),
    hex: ac.hex || "",
    callsign: clean(ac.call || ac.flight || ac.callsign || ac.hex || ""),
    registration: clean(ac.r || ac.reg || ac.registration || ""),
    nick: getDgtNickname(ac),
    lat: ac.lat,
    lon: ac.lon,
    alt: ac.alt,
    speedKmh: ac.spdKmh,
    source: ac.source || SOURCE_LABEL,
  };
}

function formatTelegramMessage(ac) {
  const item = summarizeAircraft(ac);
  const hora = new Date().toLocaleString("es-ES", { timeZone: "Europe/Madrid" });
  const position =
    item.lat != null && item.lon != null
      ? `${Number(item.lat).toFixed(4)},${Number(item.lon).toFixed(4)}`
      : "sin posicion";

  return [
    "🚁 Detectado helicoptero DGT en vuelo",
    `Matricula: ${item.registration || "desconocida"}`,
    `Callsign: ${item.callsign || "desconocido"}`,
    item.hex ? `ICAO hex: ${item.hex}` : null,
    item.nick ? `Unidad: ${item.nick}` : null,
    `Hora: ${hora}`,
    `Posicion: ${position}`,
    item.alt != null ? `Altitud: ${item.alt} ft` : null,
    item.speedKmh != null ? `Velocidad: ${item.speedKmh} km/h` : null,
    `Fuente: ${item.source}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendTelegram(ac) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: formatTelegramMessage(ac),
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Telegram HTTP ${response.status}: ${body.slice(0, 300)}`);
  }

  return true;
}

function updateStateWithDetections(state, detections, nowIso) {
  const currentIds = new Set(detections.map(getDgtAircraftId));
  const alerts = [];
  let changed = false;

  for (const ac of detections) {
    const id = getDgtAircraftId(ac);
    const previous = state.aircraft[id];
    if (!previous || previous.detected !== true) {
      alerts.push(ac);
      state.aircraft[id] = {
        ...(previous || {}),
        detected: true,
        missingCount: 0,
        firstSeenAt: previous?.firstSeenAt || nowIso,
        lastSeenAt: nowIso,
        lastDetection: summarizeAircraft(ac),
      };
      changed = true;
      continue;
    }

    if (previous.missingCount) {
      state.aircraft[id] = {
        ...previous,
        missingCount: 0,
        lastSeenAt: nowIso,
        lastDetection: summarizeAircraft(ac),
      };
      changed = true;
    }
  }

  for (const [id, item] of Object.entries(state.aircraft)) {
    if (!item.detected || currentIds.has(id)) continue;

    const missingCount = Number(item.missingCount || 0) + 1;
    if (missingCount >= ABSENT_RUNS_BEFORE_OFF) {
      state.aircraft[id] = {
        ...item,
        detected: false,
        missingCount,
        lastMissingAt: nowIso,
      };
    } else {
      state.aircraft[id] = { ...item, missingCount, lastMissingAt: nowIso };
    }
    changed = true;
  }

  state.updatedAt = nowIso;
  return { alerts, changed };
}

async function main() {
  log("starting polling run");
  const state = await readState();
  const aircraft = await fetchSpainAircraft();
  const detections = aircraft.filter(isDgtAircraft);

  log("polling complete", {
    aircraft: aircraft.length,
    dgtDetected: detections.length,
    detectedIds: detections.map(getDgtAircraftId),
  });

  const nowIso = new Date().toISOString();
  const { alerts, changed } = updateStateWithDetections(state, detections, nowIso);

  let alertFailed = false;
  for (const ac of alerts) {
    log("new DGT detection", summarizeAircraft(ac));
    try {
      await sendTelegram(ac);
      const id = getDgtAircraftId(ac);
      state.aircraft[id].lastAlertedAt = nowIso;
      log("Telegram alert sent", { id });
    } catch (error) {
      log("Telegram alert failed", { error: error.message });
      alertFailed = true;
    }
  }

  if (alertFailed) {
    log("state not saved because an alert failed");
    process.exitCode = 1;
    return;
  }

  if (changed || alerts.length) {
    await writeState(state);
    log("state saved", { path: STATE_PATH });
  } else {
    log("state unchanged");
  }
}

main().catch((error) => {
  log("fatal error", { error: error.message });
  process.exitCode = 1;
});
