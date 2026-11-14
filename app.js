// ══════════════════════════════════════════════════════════════
//  NHEU FLIGHT — LÓGICA PRINCIPAL
// ══════════════════════════════════════════════════════════════

function getAdsbApis() {
  const list = [];
  if (
    typeof window !== "undefined" &&
    window.location &&
    window.location.protocol.startsWith("http")
  ) {
    const origin = window.location.origin;
    const pathname = window.location.pathname.replace(/\/[^/]*$/, "");
    if (pathname && pathname !== "/") {
      list.push(`${origin}${pathname}/api/planes`);
      list.push(`${origin}${pathname}/api/adsb`);
      list.push(`${origin}${pathname}/api/adsblol`);
    }
    list.push(`${origin}/api/planes`);
    list.push(`${origin}/flight/api/planes`);
    list.push(`${origin}/api/adsb`);
    list.push(`${origin}/flight/api/adsb`);
    list.push(`${origin}/api/adsblol`);
    list.push(`${origin}/flight/api/adsblol`);
    list.push(`${origin}/.netlify/functions/planes`);
    list.push(`${origin}/flight/.netlify/functions/planes`);
  }
  list.push("https://opendata.adsb.fi/api/v3");
  list.push("https://api.adsb.lol/v2");
  list.push("https://opendata.adsb.fi/api/v2");
  list.push("https://api.airplanes.live/v2");
  return list;
}

const BACKEND_API = String(
  window.NHEU_FLIGHT_BACKEND_API ||
    (typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.protocol === "file:")
      ? (window.location.protocol === "file:" ? "http://localhost:8080" : window.location.origin)
      : ""),
).replace(/\/+$/, "");
const providerApiBase = BACKEND_API || new URL(".", location.href).href.replace(/\/$/, "");
let cartoProxyAvailable = false;

const R_KM = 6371,
  DEG = Math.PI / 180;
const FILTERS = ["all", "commercial", "private", "military", "general", "heli", "emergency"];
const STORAGE_KEYS = {
  theme: "nheuflight_theme",
  filter: "nheuflight_filter",
  dgtSeen: "nheu_dgt_seen",
  lastPlanes: "nheuflight_last_planes",
  cartoApiKey: "nheuflight_carto_api_key",
};

const AIRLINE_PREFIXES = {
  VLG: "Vueling",
  IBE: "Iberia",
  ANE: "Air Nostrum",
  AEA: "Air Europa",
  RYR: "Ryanair",
  MAY: "Malta Air",
  RYS: "Buzz",
  LDA: "Lauda Europe",
  EJU: "easyJet Europe",
  EZY: "easyJet",
  WZZ: "Wizz Air",
  WMT: "Wizz Air Malta",
  VOE: "Volotea",
  BAW: "British Airways",
  DLH: "Lufthansa",
  AFR: "Air France",
  KLM: "KLM",
  TAP: "TAP Air Portugal",
  SWR: "Swiss",
  THY: "Turkish Airlines",
  QTR: "Qatar Airways",
  UAE: "Emirates",
};

const AIR_CORRIDORS = [
  {
    id: "lebl-24r-maresme",
    airport: "LEBL",
    runway: "24R",
    name: "Entrada mar Maresme 24R",
    note: "Guia visual aproximada para spotting, no apta para navegacion",
    color: "#38bdf8",
    points: [
      [41.57, 2.6],
      [41.5, 2.51],
      [41.425, 2.39],
      [41.35, 2.27],
      [41.297, 2.105],
    ],
  },
  {
    id: "lebl-24l-mar",
    airport: "LEBL",
    runway: "24L",
    name: "Final paralela 24L",
    note: "Trazado orientativo paralelo al eje de pista",
    color: "#60a5fa",
    points: [
      [41.5, 2.65],
      [41.43, 2.52],
      [41.35, 2.38],
      [41.285, 2.205],
      [41.27, 2.085],
    ],
  },
  {
    id: "lebl-vector-mar",
    airport: "LEBL",
    runway: "24",
    name: "Vector mar / base norte",
    note: "Zona orientativa de vectores antes de interceptar final",
    color: "#f5a623",
    points: [
      [41.62, 2.52],
      [41.565, 2.43],
      [41.505, 2.33],
      [41.44, 2.26],
      [41.37, 2.24],
    ],
  },
];
const RUNWAYS_CSV_URL = "https://ourairports.com/data/runways.csv";
const CORRIDOR_ARRIVAL_COLOR = "#38bdf8";
const CORRIDOR_DEPARTURE_COLOR = "#22e87a";
const CORRIDOR_NOTE =
  "Pasillo visual aproximado basado en cabecera de pista; no apto para navegacion";
const SQUAWK_ALERTS = {
  7500: {
    label: "Interferencia ilicita",
    detail: "Posible interferencia ilicita",
    short: "7500",
    color: "#ff2d55",
    priority: 0,
  },
  7600: {
    label: "Fallo de radio",
    detail: "Comunicaciones perdidas",
    short: "7600",
    color: "#f59e0b",
    priority: 1,
  },
  7700: {
    label: "Emergencia general",
    detail: "Emergencia declarada",
    short: "7700",
    color: "#ef4444",
    priority: 0,
  },
};
const RAINVIEWER_API = "https://api.rainviewer.com/public/weather-maps.json";
const AWC_DATA_API = "https://aviationweather.gov/api/data";
const AWC_PROXY_ENDPOINT = "";
const HTML_ESCAPE = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function storageGet(key, fallback = "") {
  return window.NheuUtils?.storageGet
    ? window.NheuUtils.storageGet(key, fallback)
    : fallback;
}

function storageSet(key, value) {
  if (window.NheuUtils?.storageSet) window.NheuUtils.storageSet(key, value);
}

function normalizeFilter(filter) {
  return FILTERS.includes(filter) ? filter : "all";
}

function escapeHTML(value) {
  return window.NheuUtils?.escapeHTML
    ? window.NheuUtils.escapeHTML(value)
    : String(value ?? "").replace(/[&<>"']/g, (char) => HTML_ESCAPE[char]);
}

function escapeJSString(value) {
  return window.NheuUtils?.escapeJSString
    ? window.NheuUtils.escapeJSString(value)
    : String(value ?? "")
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/[\r\n]/g, " ");
}

function normalizeSquawk(value) {
  const match = String(value ?? "")
    .trim()
    .match(/[0-7]{4}/);
  return match ? match[0] : "";
}

function getSquawkAlert(p) {
  const code = normalizeSquawk(p?.squawk ?? p?.sqk ?? p?.sq);
  return code ? SQUAWK_ALERTS[code] || null : null;
}

function normalizeOperatorKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getAirlineFromCallsign(call) {
  const clean = String(call || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const prefix = clean.match(/^[A-Z]{3}/)?.[0];
  return prefix ? AIRLINE_PREFIXES[prefix] || "" : "";
}

function getSpecialOperatorOverride(p) {
  const cls = classifyAircraft(p || {});
  if (cls.color === "heli_polnac") return "Policía Nacional";
  if (cls.color === "heli_gcivil") return "Guardia Civil";
  if (cls.color === "heli_mossos") return "Mossos d'Esquadra";
  if (cls.color === "heli_dgt") return "DGT";
  return "";
}

function getPlaneOperatorLabel(p) {
  const special = getSpecialOperatorOverride(p);
  if (special) return special;
  const direct =
    p?._acOperator || p?.operator || p?.ownOp || p?.owner || p?.airline || "";
  return direct || getAirlineFromCallsign(p?.call || p?.flight);
}

const AIRLINE_GROUPS = {
  ryanair: ["ryanair", "maltaair", "buzz", "laudaeurope"],
  maltaair: ["ryanair", "maltaair"],
  easyjet: ["easyjet", "easyjeteurope", "easyjetswitzerland"],
  easyjeteurope: ["easyjet", "easyjeteurope"],
  iberia: ["iberia", "airnostrum", "iberiaexpress"],
  airnostrum: ["iberia", "airnostrum"],
  lufthansa: ["lufthansa", "lufthansacityline", "eurowings"],
  wizzair: ["wizzair", "wizzairmalta", "wizzairuk"],
};

function planeMatchesOperatorFocus(p) {
  if (!activeOperatorFilter) return true;
  const candidate = getPlaneOperatorLabel(p);
  if (!candidate) return false;
  const candidateKey = normalizeOperatorKey(candidate);
  const targetKey = activeOperatorFilter.key;

  if (
    candidateKey === targetKey ||
    candidateKey.includes(targetKey) ||
    targetKey.includes(candidateKey)
  ) {
    return true;
  }

  // Comprobar grupos de aerolíneas (ej. Ryanair y Malta Air operan los mismos vuelos)
  const targetGroup = AIRLINE_GROUPS[targetKey];
  if (targetGroup && targetGroup.includes(candidateKey)) return true;

  const candidateGroup = AIRLINE_GROUPS[candidateKey];
  if (candidateGroup && candidateGroup.includes(targetKey)) return true;

  return false;
}

function setOperatorFocus(label) {
  const clean = String(label || "").trim();
  if (!clean || clean === "--" || clean === "—") return;
  const key = normalizeOperatorKey(clean);
  // Si ya está activa la misma aerolínea, actuar como interruptor (toggle) y desactivar
  if (activeOperatorFilter && activeOperatorFilter.key === key) {
    clearOperatorFocus();
    return;
  }
  activeOperatorFilter = { label: clean, key };
  updateOperatorFocusUI();
  updateMobileNearbyList();
  if (canvasLayer) canvasLayer.redraw();
}

function highlightOperatorFromSelected() {
  if (!selectedHex || !planeStore[selectedHex]) return;
  setOperatorFocus(getPlaneOperatorLabel(planeStore[selectedHex]));
}

function clearOperatorFocus() {
  activeOperatorFilter = null;
  updateOperatorFocusUI();
  updateMobileNearbyList();
  if (canvasLayer) canvasLayer.redraw();
}

function updateOperatorFocusUI() {
  const wrap = document.getElementById("operatorFocus");
  const text = document.getElementById("operatorFocusText");
  const pill = document.getElementById("modernOperatorPill");
  const pillName = document.getElementById("mopName");
  const pillCount = document.getElementById("mopCount");

  if (!activeOperatorFilter) {
    if (wrap) {
      wrap.classList.remove("visible");
      if (text) text.textContent = "";
    }
    if (pill) {
      pill.classList.remove("active");
      pill.style.display = "none";
      if (pillName) pillName.textContent = "—";
      if (pillCount) pillCount.textContent = "";
    }
    return;
  }

  const count = Object.values(planeStore).filter(
    planeMatchesOperatorFocus,
  ).length;

  if (wrap && text) {
    text.textContent = `${activeOperatorFilter.label} · ${count} visibles/recibidos`;
    wrap.classList.add("visible");
  }

  if (pill) {
    if (pillName) pillName.textContent = activeOperatorFilter.label;
    if (pillCount) pillCount.textContent = `${count} ${count === 1 ? "avión" : "aviones"}`;
    pill.classList.add("active");
    pill.style.display = "flex";
  }
}

// ── ALERTAS DGT ──────────────────────────────────────────────
// Si quieres reactivar Telegram, hazlo a traves de un backend/proxy
// y expone aqui solo la URL segura de ese endpoint.
const TELEGRAM_ALERT_ENDPOINT = "";
let _dgtSeen = {};
try {
  _dgtSeen = JSON.parse(storageGet(STORAGE_KEYS.dgtSeen, "{}")) || {};
} catch {
  _dgtSeen = {};
}

async function sendTelegramDGT(p) {
  if (!TELEGRAM_ALERT_ENDPOINT) return false;

  const callsign = p.call || p.hex;
  const matricula = p.r || p.reg || "—";
  const lat = p.ilat.toFixed(4);
  const lon = p.ilon.toFixed(4);
  const altitud = p.alt || "—";
  const velocidad = Math.round(p.spdKmh || 0);
  const hora = new Date().toLocaleString("es-ES");

  const payload = {
    callsign,
    matricula,
    lat,
    lon,
    altitud,
    velocidad,
    hora,
    hex: p.hex,
  };

  try {
    const response = await fetch(TELEGRAM_ALERT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (e) {
    console.error("Error enviando alerta DGT:", e);
    return false;
  }
}

// ── Estado global ────────────────────────────────────────────
let map, tileLayer, canvasLayer;
let userLat = 40.4165,
  userLon = -3.7026;
window.userLat = userLat;
window.userLon = userLon;
let mapTheme = storageGet(STORAGE_KEYS.theme, "dark");
if (mapTheme !== "dark" && mapTheme !== "light" && mapTheme !== "satellite") {
  mapTheme = "dark";
}
let labelsLayer = null;
let planeStore = {};
window.planeStore = planeStore;
let fetchTimer = null,
  interpTimer = null;
let selectedHex = null;
window.selectedHex = null;
let routeLine = null;
let activeFilter = normalizeFilter(storageGet(STORAGE_KEYS.filter, "all"));
let activeOperatorFilter = null;
let lastPhotoHex = null;

// ── Control de Capa de Aviones (ADS-B) ──────────────────────
// Por defecto siempre activos al iniciar para evitar bloqueos
window.isPlanesEnabled = true;
try {
  storageSet("nheu_planes_layer", "1");
} catch (e) {}

window.togglePlanesLayer = function (forceState, persist = true) {
  if (typeof forceState === "boolean") {
    window.isPlanesEnabled = forceState;
  } else {
    window.isPlanesEnabled = !window.isPlanesEnabled;
  }

  const enabled = window.isPlanesEnabled;
  if (persist) {
    try {
      storageSet("nheu_planes_layer", enabled ? "1" : "0");
    } catch (e) {}
  }

  if (!enabled) {
    if (selectedHex) {
      deselectPlane();
    }
    if (canvasLayer) {
      canvasLayer.redraw();
    }
  } else {
    if (canvasLayer) {
      canvasLayer.redraw();
    }
    startInterp();
    fetchPlanes();
  }

  if (typeof updateVisibleCount === "function") {
    updateVisibleCount();
  }
  if (typeof window.updateModernLayerUI === "function") {
    window.updateModernLayerUI();
  }

  return enabled;
};

function updateCounts() {
  return typeof updateVisibleCount === "function" ? updateVisibleCount() : 0;
}
window.updateCounts = updateCounts;
const ICAO_TO_IATA = {
  IBE: 'IB', IAW: 'IB', IBS: 'I2', VLG: 'VY', ANE: 'YW', AEA: 'UX',
  EXS: 'LS', RYR: 'FR', EZY: 'U2', EZS: 'U2', EJS: 'U2', BAW: 'BA', EGL: 'LM', BEE: 'BE',
  DLH: 'LH', DLX: 'LH', EWG: 'EW', LHA: 'LH',
  AFR: 'AF', TRA: 'HV',
  TAP: 'TP', AZA: 'AZ', ITY: 'AZ',
  KLM: 'KL', KLR: 'KL', BEL: 'SN',
  WZZ: 'W6', WMT: 'W6', WAB: 'W6', WUK: 'W6',
  AAL: 'AA', UAL: 'UA', DAL: 'DL', UAE: 'EK', QTR: 'QR', SWR: 'LX', THY: 'TK', SAS: 'SK', FIN: 'AY', EIN: 'EI'
};
let lastMobileFlightPhotoHex = null;
let deferredInstallPrompt = null;
let fetchController = null;
let fetchSeq = 0;
let scheduledFetchHandle = null;
let lastFetchBoundsKey = "";
let lastFetchAt = 0;
let nearbyMobileHexes = [];
let viewportResizeFrame = null;
let viewportRefreshTimers = [];
let airportsLoaded = false;
let isAirportsLoading = false;
let airportsLoadPromise = null;
let mobilePanelTouchStartY = null;
let pendingMobileOpenHex = null;

// ── Historial de Vuelos (Estelas/Trails) ────────────────────
const flightTrails = {}; // posiciones GPS reales (cada 15s)
const interpTrails = {}; // posiciones interpoladas (60fps)
const historicalTrails = {}; // historial base del vuelo cuando el proveedor lo permite
let activeTrail = null;
let lastTrailUpdateTime = 0;
const TRAIL_INTERP_INTERVAL = 2000;

// ── Gráfica de Telemetría ────────────────────────────────────
let telemetryChart = null;
let telemetryChartHex = null;
let telemetryChartSeedSource = "";

// ── Info del avión (adsbdb) ──────────────────────────────────
const acHistoryCache = {};
const acHistoryPending = {};
const callsignRouteCache = {};

// ── Aeropuertos globales ─────────────────────────────────────
let globalAirports = [];
let airportMarkers = [];
let showAirports = false;

// ── FIR ──────────────────────────────────────────────────────
let firLayer = null;
let showFir = false;
let isFirLoading = false;

// â”€â”€ Meteorologia â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
let showRainRadar = false;
let rainRadarLayer = null;
let rainRadarLoading = false;
let rainRadarFrameTime = null;
let rainRadarRefreshTimer = null;
const aviationWeatherCache = {};
let showAirCorridors = false;
let airCorridorLayer = null;
let airportRunwaysByIcao = {};
let airportRunwaysLoaded = false;
let airportRunwaysLoadPromise = null;
let corridorAirportCode = "LEBL";
let corridorMode = "both";

// ── Modal búsqueda aeropuerto ────────────────────────────────
let apTab = "arr";
let apLastCode = "";
let apResults = { arr: [], dep: [] };

// ── Mobile ───────────────────────────────────────────────────
let _mobileFullData = null;
let mobileChart = null;
let mobileModalTouchStartY = null;
let mobileModalLastTouchY = null;
let mobileMiniTouchStartX = null;

// ── Frecuencias locales ──────────────────────────────────────
const LOCAL_FREQS = {
  LEMD: { twr: "118.150", atis: "121.975" },
  LEBL: { twr: "118.100", atis: "121.975" },
  LEMG: { twr: "118.375", atis: "121.750" },
  LEPA: { twr: "118.300", atis: "128.200" },
  LEAL: { twr: "118.150", atis: "121.600" },
  LEVC: { twr: "118.100", atis: "121.700" },
  LEZL: { twr: "118.100", atis: "121.800" },
  LEBB: { twr: "118.100", atis: "121.800" },
  GCTS: { twr: "118.900", atis: "121.650" },
  GCXO: { twr: "118.300", atis: "121.950" },
  GCLP: { twr: "118.550", atis: "121.600" },
  LEIB: { twr: "118.100", atis: "121.625" },
  LERS: { twr: "118.450" },
  LEGE: { twr: "119.300" },
  LELL: { twr: "119.825" },
  LEAG: { twr: "122.100" },
  LEBZ: { twr: "118.250" },
  LEXJ: { twr: "118.050" },
  LEVX: { twr: "118.100" },
  LESO: { twr: "118.025" },
  LERJ: { twr: "121.000" },
  LEZG: { twr: "118.225", atis: "121.975" },
  GCFV: { twr: "118.700" },
  GCRR: { twr: "118.450" },
  LFPG: { twr: "119.250", atis: "125.700" },
  EGLL: { twr: "118.500", atis: "113.750" },
  EHAM: { twr: "118.100", atis: "132.975" },
  EDDF: { twr: "119.900", atis: "114.200" },
  LIRF: { twr: "118.700", atis: "121.750" },
  LSZH: { twr: "118.100", atis: "134.525" },
  LEPP: { twr: "118.125" },
  LPPT: { twr: "118.100", atis: "126.250" },
  LEAM: { twr: "119.200" },
};

// ── Favoritos, alertas y cache persistente ──────────────────
function findPlaneByWatchKey(key) {
  const clean = window.NheuWatch?.cleanKey
    ? window.NheuWatch.cleanKey(key)
    : String(key || "").toUpperCase();
  return (
    Object.values(planeStore).find((p) => {
      const hex = window.NheuWatch?.cleanKey
        ? window.NheuWatch.cleanKey(p.hex)
        : String(p.hex || "").toUpperCase();
      const call = window.NheuWatch?.cleanKey
        ? window.NheuWatch.cleanKey(p.call)
        : String(p.call || "").toUpperCase();
      const reg = window.NheuWatch?.cleanKey
        ? window.NheuWatch.cleanKey(p.r || p.reg)
        : String(p.r || p.reg || "").toUpperCase();
      return hex === clean || call === clean || reg === clean;
    }) || null
  );
}

function renderWatchList(containerId, items, type) {
  const box = document.getElementById(containerId);
  if (!box) return;
  if (!items.length) {
    box.innerHTML = `<div class="watch-empty">${type === "alerts" ? "Sin alertas guardadas" : "Sin favoritos guardados"}</div>`;
    return;
  }
  box.innerHTML = items
    .map((item) => {
      const plane = findPlaneByWatchKey(item.key);
      const liveText = plane
        ? "En pantalla ahora"
        : item.route || item.hex || item.callsign || item.reg || "Guardado";
      const removeAction = type === "alerts" ? "alert" : "favorite";
      const icon =
        type === "alerts"
          ? '<span class="watch-alert-dot"></span>'
          : '<i class="fas fa-bookmark" style="color:var(--accent)"></i>';
      return `<div class="watch-row" data-watch-key="${escapeHTML(item.key)}">
      ${icon}
      <button class="watch-row-main" type="button" data-watch-open="${escapeHTML(item.key)}">
        <strong>${escapeHTML(item.label || item.key)}</strong>
        <span>${escapeHTML(liveText)}</span>
      </button>
      <button class="watch-remove" type="button" data-watch-remove="${escapeHTML(item.key)}" data-watch-type="${removeAction}" title="Eliminar">
        <i class="fas fa-xmark"></i>
      </button>
    </div>`;
    })
    .join("");
}

function updateWatchPanel() {
  if (!window.NheuWatch) return;
  const favs = window.NheuWatch.listFavorites();
  renderWatchList(
    "favoritesModalList",
    favs,
    "favorites",
  );
  renderWatchList("alertList", window.NheuWatch.listAlerts(), "alerts");
}

async function addSelectedFavorite() {
  if (!selectedHex || !planeStore[selectedHex] || !window.NheuWatch) {
    setStatus("Selecciona un avión para guardarlo", "error");
    return;
  }
  await window.NheuWatch.addFavorite(planeStore[selectedHex]);
  updateWatchPanel();
  setStatus("Favorito guardado", "ok");
}

async function addSelectedAlert() {
  if (!selectedHex || !planeStore[selectedHex] || !window.NheuWatch) {
    setStatus("Selecciona un avión para crear una alerta", "error");
    return;
  }
  if ("Notification" in window && Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch {}
  }
  await window.NheuWatch.addAlert(planeStore[selectedHex]);
  updateWatchPanel();
  setStatus("Alerta guardada", "ok");
}

function openWatchItem(key) {
  const plane = findPlaneByWatchKey(key);
  if (!plane) {
    setStatus("Ese favorito no está visible ahora mismo", "error");
    return;
  }
  selectPlane(plane.hex);
  centerOnSelected();
  closeFavoritesModal();
}

async function removeWatchItem(type, key) {
  if (!window.NheuWatch) return;
  if (type === "alert") await window.NheuWatch.removeAlert(key);
  else await window.NheuWatch.removeFavorite(key);
  updateWatchPanel();
}

function openSearchFromCard() {
  if (isMobile()) {
    closeMobileModal();
    const mobileSearchBox = document.getElementById("mobileSearchBox");
    if (mobileSearchBox) {
      setTimeout(() => {
        mobileSearchBox.focus();
      }, 100);
    }
  } else {
    const searchBox = document.getElementById("searchBox");
    if (searchBox) {
      searchBox.focus();
      searchBox.scrollIntoView({ behavior: "smooth" });
    }
  }
}

function openFavoritesModal() {
  const modal = document.getElementById("favoritesModal");
  if (modal) {
    updateWatchPanel();
    modal.style.display = "flex";
  }
}

function closeFavoritesModal() {
  const modal = document.getElementById("favoritesModal");
  if (modal) {
    modal.style.display = "none";
  }
}

function openFavoritesFromCard() {
  openFavoritesModal();
}

function notifyPlaneAlert(rule, plane) {
  const label = plane.call || plane.r || plane.reg || plane.hex;
  const body = [
    plane.r || plane.reg,
    plane.orig || plane.dest
      ? `${plane.orig || "---"} -> ${plane.dest || "---"}`
      : "",
    plane.alt != null ? `${plane.alt.toLocaleString("es-ES")} ft` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const notification = new Notification(`NheuFlight: ${label}`, {
        body: body || "Avión vigilado detectado",
        icon: "icon-192.png",
        tag: `nheuflight-${rule.key}`,
      });
      notification.onclick = () => {
        window.focus();
        openWatchItem(rule.key);
        notification.close();
      };
      return;
    } catch {}
  }
  setStatus(`Alerta: ${label} está visible`, "ok");
}

function processWatchAlerts(planes) {
  if (!window.NheuWatch) return;
  planes.forEach((plane) => {
    window.NheuWatch.matchingAlerts(plane).forEach((rule) => {
      if (window.NheuWatch.shouldNotify(rule.key))
        notifyPlaneAlert(rule, plane);
    });
  });
}

async function savePlanesSnapshot(acList) {
  const snapshot = {
    time: Date.now(),
    ac: acList.slice(0, 2500),
  };
  storageSet(STORAGE_KEYS.lastPlanes, JSON.stringify(snapshot));
  if (window.NheuDB)
    await window.NheuDB.set("kv", STORAGE_KEYS.lastPlanes, snapshot);
}

async function hydratePlanesSnapshot() {
  let snapshot = await window.NheuDB?.get("kv", STORAGE_KEYS.lastPlanes);
  if (!snapshot) {
    try {
      snapshot = JSON.parse(storageGet(STORAGE_KEYS.lastPlanes, ""));
    } catch {
      snapshot = null;
    }
  }
  if (!snapshot?.ac?.length) {
    if (Array.isArray(window.INITIAL_PLANES_SNAPSHOT) && window.INITIAL_PLANES_SNAPSHOT.length > 0) {
      ingest(window.INITIAL_PLANES_SNAPSHOT, { fromCache: true });
      setStatus(`${window.INITIAL_PLANES_SNAPSHOT.length} aviones en radar`, "ok");
      return true;
    }
    return false;
  }
  ingest(snapshot.ac, { fromCache: true });
  const count = snapshot.ac.length;
  setStatus(`${count} aviones en radar`, "ok");
  return true;
}

// ══════════════════════════════════════════════════════════════
//  MAPA
// ══════════════════════════════════════════════════════════════
const WORLD_BOUNDS = L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180));

function initMap() {
  map = L.map("map", {
    zoomControl: true,
    preferCanvas: true,
    minZoom: 2,
    maxBounds: WORLD_BOUNDS,
    maxBoundsViscosity: 1.0,
    worldCopyJump: false,
  }).setView(
    [userLat, userLon],
    7,
  );
  window.map = map;

  // Garantizar que Leaflet aplique márgenes seguros globales para que los popups nunca queden tapados por la barra superior
  if (window.L && window.L.Popup) {
    window.L.Popup.prototype.options.autoPan = true;
    window.L.Popup.prototype.options.autoPanPaddingTopLeft = [30, 120];
    window.L.Popup.prototype.options.autoPanPaddingBottomRight = [30, 60];
  }

  map.on("popupopen", (e) => {
    if (!e.popup) return;
    const adjust = () => {
      const el = e.popup.getElement();
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const minTop = 118;
      const maxBottom = window.innerHeight - 45;
      let dy = 0;
      if (rect.top < minTop) {
        dy = minTop - rect.top;
      } else if (rect.bottom > maxBottom) {
        dy = maxBottom - rect.bottom;
      }
      if (dy !== 0) {
        map.panBy([0, -dy], { animate: true, duration: 0.25 });
      }
    };
    requestAnimationFrame(adjust);
    setTimeout(adjust, 200);
    setTimeout(adjust, 500);
  });

  let dragStartCenterLng = null;
  if (map.dragging && map.dragging._draggable) {
    map.dragging._draggable.on("dragstart", function () {
      dragStartCenterLng = map.getCenter().lng;
    });

    map.dragging._draggable.on("predrag", function () {
      const size = map.getSize ? map.getSize() : null;
      const containerW = (size && size.x > 0 ? size.x : null) || window.innerWidth || 390;
      const z = map.getZoom();
      const worldW = 256 * Math.pow(2, z);

      // Si la pantalla es más ancha que el mapa completo (ej. PC monitor panorámico en zoom mínimo),
      // mantenemos el mapa centrado horizontalmente para evitar márgenes vacíos o duplicación.
      if (worldW <= containerW) {
        this._newPos.x = this._startPos.x;
        return;
      }

      // En móvil o vistas donde el mapa es más ancho que la pantalla:
      // Permitir desplazamiento horizontal libre limitado exactamente a los bordes del mundo (-180° a 180°).
      if (dragStartCenterLng == null) {
        dragStartCenterLng = map.getCenter().lng;
      }
      const halfSpanLng = (containerW / worldW) * 180;
      const maxCenterLng = Math.max(0, 180 - halfSpanLng);
      const deltaX = this._newPos.x - this._startPos.x;
      const minDeltaX = ((dragStartCenterLng - maxCenterLng) / 360) * worldW;
      const maxDeltaX = ((dragStartCenterLng + maxCenterLng) / 360) * worldW;
      const clampedDeltaX = Math.max(minDeltaX, Math.min(maxDeltaX, deltaX));
      this._newPos.x = this._startPos.x + clampedDeltaX;
    });

    map.dragging._draggable.on("dragend", function () {
      dragStartCenterLng = null;
    });
  }

  let isLockingH = false;
  function enforceHorizontalBounds() {
    // Solo aplicar cuando el mapa está en reposo (no en vuelo o navegación activa)
    if (isLockingH || window._isNavigating) return;
    const size = map.getSize ? map.getSize() : null;
    const containerW = (size && size.x > 0 ? size.x : null) || window.innerWidth || 390;
    const z = map.getZoom();
    const worldW = 256 * Math.pow(2, z);
    const center = map.getCenter();

    if (worldW <= containerW) {
      if (Math.abs(center.lng) > 0.05) {
        isLockingH = true;
        map.setView([center.lat, 0], z, { animate: false });
        isLockingH = false;
      }
    } else {
      const halfSpanLng = (containerW / worldW) * 180;
      const maxCenterLng = Math.max(0, 180 - halfSpanLng);
      if (center.lng < -maxCenterLng || center.lng > maxCenterLng) {
        isLockingH = true;
        const clamped = Math.max(-maxCenterLng, Math.min(maxCenterLng, center.lng));
        map.setView([center.lat, clamped], z, { animate: false });
        isLockingH = false;
      }
    }
  }

  // IMPORTANTE: NO registrar enforceHorizontalBounds en "move" porque aborta animaciones y vuelos programáticos.
  // Solo se evalúa cuando el mapa se detiene al final de un zoom, arrastre o redimensión de ventana.
  map.on("zoomend dragend", enforceHorizontalBounds);
  window.addEventListener("resize", enforceHorizontalBounds);

  if (window.MarineTracker && typeof window.MarineTracker.init === "function") {
    window.MarineTracker.init(map);
  }
  if (window.Osiris && typeof window.Osiris.init === "function") {
    window.Osiris.init(map);
  }
  setTiles(mapTheme);
  fetch(`${providerApiBase}/api/provider-status`, { signal: AbortSignal.timeout(4000) })
    .then(response => response.ok ? response.json() : null)
    .then(status => {
      if (status?.carto) {
        cartoProxyAvailable = true;
        if (!getCartoApiKey()) setTiles(mapTheme);
      }
    })
    .catch(() => {});
  canvasLayer = new CanvasPlaneLayer().addTo(map);
  map.on("click", () => hideTooltip());
  if (typeof Chart === "function") initChart();
}

function getCartoApiKey() {
  return storageGet(STORAGE_KEYS.cartoApiKey, "").trim();
}

window.setCartoKey = function (key) {
  if (key && typeof key === "string" && key.trim()) {
    storageSet(STORAGE_KEYS.cartoApiKey, key.trim());
    console.log("[NheuFlight] Clave CARTO configurada. Recargando capas...");
  } else {
    storageSet(STORAGE_KEYS.cartoApiKey, "");
    console.log("[NheuFlight] Clave CARTO eliminada. Usando mapas ESRI...");
  }
  setTiles(mapTheme);
};

function setTiles(theme) {
  mapTheme = theme;
  storageSet(STORAGE_KEYS.theme, theme);

  if (tileLayer) {
    map.removeLayer(tileLayer);
    tileLayer = null;
  }
  if (labelsLayer) {
    map.removeLayer(labelsLayer);
    labelsLayer = null;
  }

  const icon = document.getElementById("themeIcon");
  const cartoKey = getCartoApiKey();
  const cartoTiles = style => cartoKey
    ? `https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`
    : `${providerApiBase}/api/carto/${style}/{z}/{x}/{y}{r}.png`;

  if (theme === "dark") {
    if (cartoKey || cartoProxyAvailable) {
      tileLayer = L.tileLayer(
        cartoTiles("dark_all"),
        { attribution: "© OpenStreetMap © CARTO", maxZoom: 19, subdomains: "abcd" }
      ).addTo(map);
    } else {
      tileLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles © Esri — Esri, DeLorme, NAVTEQ",
          maxNativeZoom: 16,
          maxZoom: 19,
          className: "esri-dark-tiles",
        }
      ).addTo(map);

      labelsLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "© Esri",
          maxNativeZoom: 16,
          maxZoom: 19,
          zIndex: 300,
        }
      ).addTo(map);
    }
    document.body.classList.remove("light-theme");
    if (icon) icon.className = "fas fa-moon";
  } else if (theme === "light") {
    if (cartoKey || cartoProxyAvailable) {
      tileLayer = L.tileLayer(
        cartoTiles("light_all"),
        { attribution: "© OpenStreetMap © CARTO", maxZoom: 19, subdomains: "abcd" }
      ).addTo(map);
    } else {
      tileLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "Tiles © Esri — Esri, DeLorme, NAVTEQ",
          maxNativeZoom: 16,
          maxZoom: 19,
        }
      ).addTo(map);

      labelsLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "© Esri",
          maxNativeZoom: 16,
          maxZoom: 19,
          zIndex: 300,
        }
      ).addTo(map);
    }
    document.body.classList.add("light-theme");
    if (icon) icon.className = "fas fa-sun";
  } else if (theme === "satellite") {
    tileLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        attribution: "Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
        maxZoom: 19,
      }
    ).addTo(map);

    if (cartoKey || cartoProxyAvailable) {
      labelsLayer = L.tileLayer(
        cartoTiles("dark_only_labels"),
        { attribution: "© CARTO", maxZoom: 19, zIndex: 300, subdomains: "abcd" }
      ).addTo(map);
    } else {
      labelsLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "© Esri",
          maxNativeZoom: 16,
          maxZoom: 19,
          zIndex: 300,
        }
      ).addTo(map);
    }

    document.body.classList.remove("light-theme");
    if (icon) icon.className = "fas fa-globe";
  }

  updateMobileChrome();
}

function detectStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function updateViewportMetrics() {
  const standalone = detectStandalone();
  const viewport = window.visualViewport;
  const width = Math.round(
    (!standalone && viewport?.width) ||
      window.innerWidth ||
      document.documentElement.clientWidth ||
      0,
  );

  // In standalone PWA, window.innerHeight excludes the home-indicator safe area,
  // causing Leaflet to leave a black strip at the bottom.
  // Use screen.height (physical pixels / devicePixelRatio) or dvh as ground truth.
  let height;
  if (standalone) {
    // dvh via a temporary element is the most reliable on iOS
    const dvhEl = document.createElement("div");
    dvhEl.style.cssText =
      "position:fixed;top:0;left:0;width:1px;height:100dvh;pointer-events:none;visibility:hidden;";
    document.documentElement.appendChild(dvhEl);
    height = dvhEl.offsetHeight || window.innerHeight;
    document.documentElement.removeChild(dvhEl);
  } else {
    height = Math.round(
      viewport?.height ||
        window.innerHeight ||
        document.documentElement.clientHeight ||
        0,
    );
  }

  if (standalone) document.documentElement.style.removeProperty("--app-height");
  else
    document.documentElement.style.setProperty("--app-height", `${height}px`);
  document.documentElement.style.setProperty("--app-width", `${width}px`);

  const mapEl = document.getElementById("map");
  if (mapEl) {
    if (standalone) {
      // Force the map container to the true physical height so Leaflet tiles fill it
      mapEl.style.height = height + "px";
    } else {
      mapEl.style.removeProperty("width");
      mapEl.style.removeProperty("height");
    }
  }
  if (map) {
    cancelAnimationFrame(viewportResizeFrame);
    viewportResizeFrame = requestAnimationFrame(() =>
      map.invalidateSize(false),
    );
  }
}

function updateDisplayModeUI() {
  const standalone = detectStandalone();
  const mobile = window.innerWidth <= 768;
  document.body.classList.toggle("standalone-mode", standalone);
  document.body.classList.toggle("browser-mode", !standalone);
  document.body.classList.toggle("browser-mobile", mobile && !standalone);
  if (!mobile) document.body.classList.remove("mobile-panel-expanded");
  if (!mobile) {
    document.body.classList.remove(
      "mobile-filters-open",
      "mobile-more-open",
      "mobile-searching",
      "mobile-plane-selected",
    );
    pendingMobileOpenHex = null;
  }
}

function runViewportRefresh() {
  updateViewportMetrics();
  updateDisplayModeUI();
  updateHudStats();
  updateVisibleCount();
  updateMobileChrome();
  updateMobileNearbyList();
}

function scheduleViewportRefresh() {
  viewportRefreshTimers.forEach((timer) => clearTimeout(timer));
  viewportRefreshTimers = [];

  [0, 120, 320, 900].forEach((delay) => {
    const timer = setTimeout(() => {
      if (!document.body) return;
      runViewportRefresh();
      if (map) {
        cancelAnimationFrame(viewportResizeFrame);
        viewportResizeFrame = requestAnimationFrame(() =>
          map.invalidateSize(false),
        );
      }
    }, delay);
    viewportRefreshTimers.push(timer);
  });
}

function setMobilePanelExpanded(expanded) {
  if (!isMobile()) return;
  document.body.classList.toggle("mobile-panel-expanded", expanded);
  const toggle = document.getElementById("mobilePanelToggle");
  if (toggle)
    toggle.setAttribute(
      "aria-label",
      expanded ? "Cerrar panel" : "Abrir panel",
    );
}

function toggleMobilePanel() {
  if (!isMobile()) return;
  setMobilePanelExpanded(
    !document.body.classList.contains("mobile-panel-expanded"),
  );
}

function toggleMobileFilters() {
  if (!isMobile()) return;
  const next = !document.body.classList.contains("mobile-filters-open");
  document.body.classList.toggle("mobile-filters-open", next);
  if (next) document.body.classList.remove("mobile-more-open");
  updateMobileChrome();
}

function toggleMobileMore() {
  if (!isMobile()) return;
  const next = !document.body.classList.contains("mobile-more-open");
  document.body.classList.toggle("mobile-more-open", next);
  if (next) document.body.classList.remove("mobile-filters-open");
  updateMobileChrome();
}

function closeMobileMenus() {
  document.body.classList.remove("mobile-filters-open", "mobile-more-open");
  updateMobileChrome();
}

function syncSearchClearButton() {
  const searchBox = document.getElementById("searchBox");
  const clearBtn = document.getElementById("searchClearBtn");
  if (!searchBox || !clearBtn) return;
  clearBtn.classList.toggle("visible", Boolean(searchBox.value.trim()));
  const mobileClearBtn = document.getElementById("mobileSearchClearBtn");
  const mobileSearchBox = document.getElementById("mobileSearchBox");
  if (mobileClearBtn && mobileSearchBox) {
    mobileClearBtn.style.visibility = mobileSearchBox.value.trim()
      ? "visible"
      : "hidden";
  }
}

function clearSearchBox() {
  const searchBox = document.getElementById("searchBox");
  const mobileSearchBox = document.getElementById("mobileSearchBox");
  if (searchBox) searchBox.value = "";
  if (mobileSearchBox) mobileSearchBox.value = "";
  searchPlane("");
  syncSearchClearButton();
  if (isMobile()) mobileSearchBox?.focus();
  else searchBox?.focus();
}

function promptInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    deferredInstallPrompt.userChoice.finally(() => {
      deferredInstallPrompt = null;
      const banner = document.getElementById("installBanner");
      if (banner) banner.style.display = "none";
    });
    return;
  }
  setStatus("En iPhone: compartir → Añadir a pantalla de inicio", "ok");
}

function locateUserAndCenter() {
  if (!navigator.geolocation) {
    setStatus("Geolocalización no disponible", "error");
    return;
  }
  setStatus("Centrando en tu ubicación...", "loading");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;
      window.userLat = userLat;
      window.userLon = userLon;
      map.setView([userLat, userLon], Math.max(map.getZoom(), 8), {
        animate: true,
      });
      setStatus("Mapa centrado en tu ubicación", "ok");
    },
    () => setStatus("No se pudo obtener tu ubicación", "error"),
    { enableHighAccuracy: true, timeout: 8000 },
  );
}

function returnToUserPlanePosition(customCenter, customZoom) {
  // 1. Reactivar siempre la capa de aviones
  if (typeof window.togglePlanesLayer === "function") {
    window.togglePlanesLayer(true, true);
  }

  // 2. Determinar coordenadas y zoom objetivo
  let targetLat, targetLon, targetZoom;
  if (customCenter && typeof customZoom === "number") {
    targetLat = Array.isArray(customCenter)
      ? customCenter[0]
      : (customCenter.lat !== undefined ? customCenter.lat : customCenter[0]);
    targetLon = Array.isArray(customCenter)
      ? customCenter[1]
      : (customCenter.lng !== undefined ? customCenter.lng : customCenter[1]);
    targetZoom = customZoom;
  } else {
    targetLat = typeof window.userLat === "number" ? window.userLat : (typeof userLat === "number" ? userLat : 40.4165);
    targetLon = typeof window.userLon === "number" ? window.userLon : (typeof userLon === "number" ? userLon : -3.7026);
    targetZoom = 8;
  }

  if (map) {
    // Detener inercias o animaciones en curso que pudieran interferir
    try {
      map.stop();
    } catch (e) {}

    window._isNavigating = true;
    map._flyToActive = true;

    const onFlightEnd = () => {
      window._isNavigating = false;
      map._flyToActive = false;
      map.off("moveend", onFlightEnd);
      if (typeof fetchPlanes === "function") fetchPlanes();
      if (typeof updateVisibleCount === "function") updateVisibleCount();
    };

    map.once("moveend", onFlightEnd);

    // Salvaguarda garantizada ("esté como esté el mapa"): si el vuelo se interrumpe o Leaflet no llega al destino, forzarlo
    setTimeout(() => {
      if (window._isNavigating || map._flyToActive) {
        window._isNavigating = false;
        map._flyToActive = false;
        map.off("moveend", onFlightEnd);
      }
      const curZ = map.getZoom();
      const curCenter = map.getCenter();
      if (
        curZ < targetZoom - 0.5 ||
        Math.abs(curCenter.lat - targetLat) > 0.05 ||
        Math.abs(curCenter.lng - targetLon) > 0.05
      ) {
        map.setView([targetLat, targetLon], targetZoom, { animate: false });
      }
      if (typeof fetchPlanes === "function") fetchPlanes();
      if (typeof updateVisibleCount === "function") updateVisibleCount();
    }, 1500);

    try {
      map.flyTo([targetLat, targetLon], targetZoom, { duration: 1.2 });
    } catch (e) {
      console.warn("[NheuFlight] Error en flyTo, usando setView:", e);
      map.setView([targetLat, targetLon], targetZoom);
      onFlightEnd();
    }
  }

  // 3. Forzar refresco inmediato de los aviones
  setTimeout(() => {
    if (typeof fetchPlanes === "function") fetchPlanes();
    if (typeof updateVisibleCount === "function") updateVisibleCount();
  }, 350);

  // 4. Si la geolocalización está activa, verificar si hay coordenadas actualizadas (sin abortar el vuelo activo)
  if (navigator.geolocation && !customCenter) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat = pos.coords.latitude;
        userLon = pos.coords.longitude;
        window.userLat = userLat;
        window.userLon = userLon;
        if (map && !window._isNavigating && !map._flyToActive) {
          const curZ = map.getZoom();
          if (curZ >= 7) {
            map.panTo([userLat, userLon], { animate: true, duration: 0.6 });
          }
          if (typeof fetchPlanes === "function") fetchPlanes();
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 4000 },
    );
  }
}
window.returnToUserPlanePosition = returnToUserPlanePosition;

function updateHudStats() {
  const hudSelected = document.getElementById("hudSelected");
  const hudFilter = document.getElementById("hudFilter");
  const mobileHudSelected = document.getElementById("mobileHudSelected");
  const mobileHudFilter = document.getElementById("mobileHudFilter");
  if (hudSelected)
    hudSelected.textContent =
      selectedHex && planeStore[selectedHex]
        ? planeStore[selectedHex].call || selectedHex
        : "Ninguno";
  if (mobileHudSelected)
    mobileHudSelected.textContent =
      selectedHex && planeStore[selectedHex]
        ? planeStore[selectedHex].call || selectedHex
        : "Ninguno";
  if (hudFilter) {
    const labels = {
      all: "Todos",
      commercial: "Comercial",
      private: "Privado",
      military: "Militar",
      general: "Avioneta",
      heli: "Helicóptero",
    };
    hudFilter.textContent = labels[activeFilter] || activeFilter;
    if (mobileHudFilter)
      mobileHudFilter.textContent = labels[activeFilter] || activeFilter;
  }
}

function updateMobileChrome() {
  const mobileStatusLine = document.getElementById("mobileStatusLine");
  const mobileCnt = document.getElementById("mobileCnt");
  const airportsBtn = document.getElementById("mobileAirportsBtn");
  const firBtn = document.getElementById("mobileFirBtn");
  const rainBtn = document.getElementById("mobileRainBtn");
  const corridorBtn = document.getElementById("mobileCorridorBtn");
  const filtersBtn = document.getElementById("mobileFiltersToggleBtn");
  const moreBtn = document.getElementById("mobileMoreToggleBtn");
  if (mobileStatusLine)
    mobileStatusLine.textContent =
      document.getElementById("liveBarText")?.textContent ||
      "Radar en tiempo real";
  if (mobileCnt)
    mobileCnt.textContent = document.getElementById("cnt")?.textContent || "—";
  if (airportsBtn) airportsBtn.classList.toggle("active", showAirports);
  if (firBtn) firBtn.classList.toggle("active", showFir);
  if (rainBtn) rainBtn.classList.toggle("active", showRainRadar);
  if (corridorBtn) corridorBtn.classList.toggle("active", showAirCorridors);
  if (filtersBtn)
    filtersBtn.classList.toggle(
      "active",
      document.body.classList.contains("mobile-filters-open"),
    );
  if (moreBtn)
    moreBtn.classList.toggle(
      "active",
      document.body.classList.contains("mobile-more-open"),
    );
  document.querySelectorAll(".mobile-filter-chip").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === activeFilter);
  });
  const mobileThemeIcon = document.getElementById("mobileThemeIcon");
  if (mobileThemeIcon) {
    mobileThemeIcon.className =
      mapTheme === "dark"
        ? "fas fa-moon"
        : mapTheme === "light"
        ? "fas fa-sun"
        : "fas fa-globe";
  }
}

function syncSearchInputs(source = "desktop") {
  const desktop = document.getElementById("searchBox");
  const mobile = document.getElementById("mobileSearchBox");
  if (!desktop || !mobile) return;
  if (source === "desktop") mobile.value = desktop.value;
  else desktop.value = mobile.value;
  syncSearchClearButton();
}

function getVisibleFilteredPlanes() {
  if (!map) return [];
  const bounds = map.getBounds();
  return Object.values(planeStore).filter(
    (p) => bounds.contains([p.ilat, p.ilon]) && planeMatchesFilter(p),
  );
}

function updateVisibleCount() {
  if (window.isPlanesEnabled === false) {
    let countText = "0";
    if (window.MarineTracker && window.MarineTracker.isEnabled()) {
      countText = String(Object.keys(window.MarineTracker.getVessels()).length);
    }
    const countEl = document.getElementById("cnt");
    const mobileCountEl = document.getElementById("mobileCnt");
    if (countEl) countEl.textContent = countText;
    if (mobileCountEl) mobileCountEl.textContent = countText;
    return 0;
  }
  const visibleCount = getVisibleFilteredPlanes().length;
  const countText = String(visibleCount);
  const countEl = document.getElementById("cnt");
  const mobileCountEl = document.getElementById("mobileCnt");
  if (countEl) countEl.textContent = countText;
  if (mobileCountEl) mobileCountEl.textContent = countText;
  return visibleCount;
}

function buildFetchBoundsKey() {
  if (!map) return "boot";
  const b = map.getBounds();
  const c = b.getCenter();
  return [
    map.getZoom(),
    c.lat.toFixed(2),
    c.lng.toFixed(2),
    (b.getNorth() - b.getSouth()).toFixed(2),
    (b.getEast() - b.getWest()).toFixed(2),
  ].join(":");
}

function scheduleFetchPlanes(delay = 220) {
  clearTimeout(scheduledFetchHandle);
  scheduledFetchHandle = setTimeout(() => {
    scheduledFetchHandle = null;
    fetchPlanes();
  }, delay);
}

function updateMobileNearbyList() {
  const sheet = document.getElementById("mobileNearbySheet");
  const list = document.getElementById("mobileNearbyList");
  const count = document.getElementById("mobileNearbyCount");
  if (!sheet || !list || !count) return;
  if (!isMobile()) {
    sheet.classList.remove("visible");
    return;
  }

  const center = map?.getCenter();
  if (!center) return;

  const visible = getVisibleFilteredPlanes()
    .map((p) => ({
      p,
      distKm: haversineKm(center.lat, center.lng, p.ilat, p.ilon),
    }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, 8);

  nearbyMobileHexes = visible.map((item) => item.p.hex);
  count.textContent = String(visible.length);
  sheet.classList.toggle("visible", visible.length > 0);

  if (!visible.length) {
    list.innerHTML =
      '<div class="mobile-nearby-empty">No hay aviones cercanos con el filtro actual</div>';
    return;
  }

  list.innerHTML = visible
    .map(({ p, distKm }) => {
      const cls = classifyAircraft(p);
      const route =
        p.orig || p.dest
          ? `${p.orig || "?"} → ${p.dest || "?"}`
          : "Ruta no disponible";
      const distance =
        distKm < 10 ? `${distKm.toFixed(1)} km` : `${Math.round(distKm)} km`;
      const selected = p.hex === selectedHex ? " active" : "";
      const hex = escapeJSString(p.hex);
      return `<button class="mobile-nearby-chip${selected}" type="button" data-select-plane="${escapeHTML(p.hex)}">
      <span class="mobile-nearby-top">
        <strong style="color:${cls.hex}">${escapeHTML(p.call || p.hex)}</strong>
        <em>${escapeHTML(distance)}</em>
      </span>
      <span class="mobile-nearby-route">${escapeHTML(route)}</span>
    </button>`;
    })
    .join("");
}

function selectNearbyPlaneByOffset(offset) {
  if (!nearbyMobileHexes.length) return;
  const currentIdx = Math.max(0, nearbyMobileHexes.indexOf(selectedHex));
  const nextIdx =
    (currentIdx + offset + nearbyMobileHexes.length) % nearbyMobileHexes.length;
  selectPlane(nearbyMobileHexes[nextIdx]);
}

// ══════════════════════════════════════════════════════════════
//  CONTADOR GLOBAL VUELOS MUNDIALES
// ══════════════════════════════════════════════════════════════
async function fetchGlobalCount() {
  const el = document.getElementById("globalCnt");
  if (navigator.onLine === false) {
    if (el) el.textContent = "—";
    return;
  }

  function extractCount(d) {
    const candidates = [
      d.aircraft,
      d.total,
      d.planes,
      d.ac_count,
      d.aircraftCount,
      d.total_aircraft,
      d.total_aircraft_with_pos,
      d.count,
      d.stats?.aircraft,
      d.stats?.total,
      d.now,
    ];
    for (const v of candidates) {
      const n = Number(v);
      if (!isNaN(n) && n > 100) return n;
    }
    if (typeof d === "number" && d > 100) return d;
    return null;
  }

  async function tryFetch(url, timeout = 6000) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      clearTimeout(tid);
      return null;
    }
  }

  const apis = [
    "https://api.adsb.lol/v2/stats",
    "https://api.adsb.fi/v2/stats",
    "https://api.adsb.one/v2/stats",
    "https://api.airplanes.live/v2/stats",
  ];

  for (const url of apis) {
    const d = await tryFetch(url);
    if (!d) continue;
    const total = extractCount(d);
    if (total != null) {
      el.textContent = total.toLocaleString("es-ES");
      return;
    }
  }

  try {
    const d = await tryFetch("https://api.adsb.lol/v2/point/0/0/20000", 10000);
    const ac = d?.ac ?? d?.aircraft ?? [];
    if (Array.isArray(ac) && ac.length > 50) {
      el.textContent = ac.length.toLocaleString("es-ES") + "+";
      return;
    }
  } catch {
    /* silencio */
  }

  el.textContent = "No disp.";
}

// ══════════════════════════════════════════════════════════════
//  GRID DE SECTORES
// ══════════════════════════════════════════════════════════════
function gridCenters(bounds, maxRadiusNM) {
  const maxRadiusDeg = maxRadiusNM / 60;
  const diameter = maxRadiusDeg * 2 * 0.85;

  const south = bounds.getSouth(),
    north = bounds.getNorth();
  const west = bounds.getWest(),
    east = bounds.getEast();

  const latSpan = north - south;
  const lngSpan = east - west;

  const rowsNeeded = Math.ceil(latSpan / diameter);
  const colsNeeded = Math.ceil(
    lngSpan / (diameter / Math.cos((((south + north) / 2) * Math.PI) / 180)),
  );

  const rows = Math.min(rowsNeeded, 5);
  const cols = Math.min(colsNeeded, 5);

  const latStep = latSpan / rows;
  const lngStep = lngSpan / cols;

  const centers = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      centers.push({
        lat: south + latStep * (r + 0.5),
        lng: west + lngStep * (c + 0.5),
      });
    }
  }
  return centers;
}

const SPECIAL_HELI_COLORS = new Set([
  "heli_sem",
  "heli_dgt",
  "heli_med",
  "heli_bomb",
  "heli_mossos",
  "heli_gcivil",
  "heli_polnac",
]);

const SPECIAL_HELI_PRIORITY = {
  heli_sem: 0,
  heli_med: 1,
  heli_bomb: 2,
  heli_dgt: 3,
  heli_mossos: 4,
  heli_gcivil: 5,
  heli_polnac: 6,
};

function hexToRgba(hex, alpha) {
  const raw = String(hex || "")
    .replace("#", "")
    .trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : raw;
  if (!/^[0-9a-f]{6}$/i.test(full)) return `rgba(34,232,122,${alpha})`;
  const value = Number.parseInt(full, 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function getSpecialHelicopters() {
  const bounds = map?.getBounds?.() || null;
  return Object.values(planeStore)
    .map((p) => ({ p, cls: classifyAircraft(p) }))
    .filter(({ cls }) => SPECIAL_HELI_COLORS.has(cls.color))
    .sort((a, b) => {
      const aVisible =
        bounds &&
        a.p.ilat != null &&
        a.p.ilon != null &&
        bounds.contains([a.p.ilat, a.p.ilon])
          ? 0
          : 1;
      const bVisible =
        bounds &&
        b.p.ilat != null &&
        b.p.ilon != null &&
        bounds.contains([b.p.ilat, b.p.ilon])
          ? 0
          : 1;
      if (aVisible !== bVisible) return aVisible - bVisible;

      const aMoving = (a.p.spdKmh || 0) > 30 ? 0 : 1;
      const bMoving = (b.p.spdKmh || 0) > 30 ? 0 : 1;
      if (aMoving !== bMoving) return aMoving - bMoving;

      const aPriority = SPECIAL_HELI_PRIORITY[a.cls.color] ?? 99;
      const bPriority = SPECIAL_HELI_PRIORITY[b.cls.color] ?? 99;
      if (aPriority !== bPriority) return aPriority - bPriority;

      return (b.p.spdKmh || 0) - (a.p.spdKmh || 0);
    });
}

function buildSpecialHeliPillText(entry) {
  const badge = (entry.cls.badge || "").trim().toUpperCase();
  const nick = (entry.cls.nick || "").trim().toUpperCase();
  const call = (entry.p.call || "").trim().toUpperCase();

  const preferred = nick || badge || call || "HELI";
  return preferred.length > 11 ? preferred.slice(0, 10) + "…" : preferred;
}

function updateMobileLivePill(entries) {
  const pill = document.getElementById("mobileLivePill");
  if (!pill) return;

  const dot = pill.querySelector(".mobile-live-dot");
  const text = pill.querySelector(".mobile-live-text");
  const target = entries[0] || null;

  if (!target) {
    pill.classList.remove("heli-alert");
    pill.dataset.hex = "";
    pill.setAttribute("aria-label", "Estado en directo");
    pill.removeAttribute("title");
    pill.style.removeProperty("border-color");
    pill.style.removeProperty("background");
    pill.style.removeProperty("box-shadow");
    if (dot) {
      dot.style.background = "#22e87a";
      dot.style.boxShadow =
        "0 0 10px rgba(34,232,122,0.9), 0 0 20px rgba(34,232,122,0.45)";
    }
    if (text) text.textContent = "LIVE";
    return;
  }

  const accent = target.cls.hex || "#f97316";
  const label = buildSpecialHeliPillText(target);
  const fullLabel = [
    target.cls.label,
    target.cls.nick,
    target.p.call || target.p.r || target.p.hex,
  ]
    .filter(Boolean)
    .join(" · ");

  pill.classList.add("heli-alert");
  pill.dataset.hex = target.p.hex;
  pill.setAttribute("aria-label", `Ir a ${fullLabel}`);
  pill.title = fullLabel;
  pill.style.borderColor = hexToRgba(accent, 0.34);
  pill.style.background = `linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04)), linear-gradient(135deg, ${hexToRgba(accent, 0.34)}, rgba(8,12,22,0.86))`;
  pill.style.boxShadow = `inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -10px 24px ${hexToRgba(accent, 0.14)}, 0 10px 24px rgba(0,0,0,0.18)`;
  if (dot) {
    dot.style.background = accent;
    dot.style.boxShadow = `0 0 10px ${hexToRgba(accent, 0.9)}, 0 0 20px ${hexToRgba(accent, 0.42)}`;
  }
  if (text) text.textContent = label;
}

// ══════════════════════════════════════════════════════════════
//  HELICÓPTEROS SEM / DGT / Medicalizados
// ══════════════════════════════════════════════════════════════
function updateHeliWatch() {
  const emergency = getSpecialHelicopters();
  updateMobileLivePill(emergency);

  // Limpieza de _dgtSeen (más de 2 horas)
  const now = Date.now();
  const twoHours = 2 * 60 * 60 * 1000;
  for (const hex in _dgtSeen) {
    if (now - _dgtSeen[hex] > twoHours) {
      delete _dgtSeen[hex];
    }
  }

  // Comprobación de nuevos Pegasus DGT
  emergency.forEach(({ p, cls }) => {
    if (cls.color === "heli_dgt" && !_dgtSeen[p.hex]) {
      _dgtSeen[p.hex] = now;
      storageSet(STORAGE_KEYS.dgtSeen, JSON.stringify(_dgtSeen));
      sendTelegramDGT(p);
    }
  });

  const wrap = document.getElementById("heliWatch");
  const list = document.getElementById("heliWatchList");
  if (!wrap || !list) return;
  if (emergency.length === 0) {
    wrap.style.display = "none";
    list.innerHTML = "";
    return;
  }
  wrap.style.display = "block";
  list.innerHTML = emergency
    .map(({ p, cls }) => {
      const typeMap = {
        heli_sem: "sem",
        heli_dgt: "dgt",
        heli_bomb: "bomb",
        heli_med: "med",
        heli_mossos: "mossos",
        heli_gcivil: "gcivil",
        heli_polnac: "polnac",
      };
      const type = typeMap[cls.color] || "med";
      const alt =
        p.alt != null ? p.alt.toLocaleString("es-ES") + " ft" : "En tierra";
      const spd =
        p.spdKmh != null && p.spdKmh > 5 ? Math.round(p.spdKmh) + " km/h" : "";
      const isMoving = p.spdKmh != null && p.spdKmh > 30;
      const dotColor = isMoving ? cls.hex : "#3a3a55";
      const hex = escapeJSString(p.hex);
      const nickTag =
        cls.nick && cls.color !== "heli_polnac"
          ? `<span style="font-size:8.5px;color:#f97316;font-weight:700;margin-left:3px">· ${cls.nick}</span>`
          : "";
      return `<div class="heli-row ${type}" data-select-plane="${escapeHTML(p.hex)}" data-center-after="true">
      <div class="heli-dot" style="background:${dotColor};box-shadow:0 0 6px ${dotColor}"></div>
      <span class="heli-badge ${type}">${type.toUpperCase()}</span>
      <div style="flex:1;overflow:hidden">
        <div style="display:flex;align-items:center;gap:2px">
          <span class="heli-call" style="color:${cls.hex}">${escapeHTML(p.call)}</span>${nickTag}
        </div>
        ${cls.label !== "Helicóptero DGT" && cls.label.includes("·") ? "" : ""}
      </div>
      <div class="heli-alt">
        <div>${escapeHTML(alt)}</div>
        ${spd ? `<div style="font-size:9px;color:var(--text-faint)">${escapeHTML(spd)}</div>` : ""}
      </div>
    </div>`;
    })
    .join("");
}

// ══════════════════════════════════════════════════════════════
//  INFO DEL AVIÓN (adsbdb.com)
// ══════════════════════════════════════════════════════════════
function getActiveSquawkAlerts() {
  return Object.values(planeStore)
    .map((p) => ({
      p,
      alert: getSquawkAlert(p),
      code: normalizeSquawk(p.squawk),
    }))
    .filter((item) => item.alert)
    .sort(
      (a, b) =>
        a.alert.priority - b.alert.priority ||
        (a.p.call || a.p.hex).localeCompare(b.p.call || b.p.hex),
    );
}

function updateSquawkAlerts() {
  const wrap = document.getElementById("squawkAlerts");
  const list = document.getElementById("squawkAlertList");
  if (!wrap || !list) return;

  const alerts = getActiveSquawkAlerts();
  wrap.style.display = alerts.length ? "block" : "none";
  if (!alerts.length) {
    list.innerHTML = "";
    return;
  }

  list.innerHTML = alerts
    .slice(0, 6)
    .map(({ p, alert, code }) => {
      const alt =
        p.alt != null
          ? p.alt.toLocaleString("es-ES") + " ft"
          : "Altitud no disponible";
      const spd =
        p.spdKmh != null
          ? Math.round(p.spdKmh) + " km/h"
          : "Velocidad no disponible";
      return `<button class="squawk-row" type="button" data-select-plane="${escapeHTML(p.hex)}" data-center-after="true" style="border-color:${alert.color}88">
      <span class="squawk-code" style="background:${alert.color}">${escapeHTML(code)}</span>
      <span class="squawk-main">
        <strong>${escapeHTML(p.call || p.hex)} · ${escapeHTML(alert.label)}</strong>
        <span>${escapeHTML(alert.detail)} · ${escapeHTML(alt)} · ${escapeHTML(spd)}</span>
      </span>
      <i class="fas fa-crosshairs" style="color:${alert.color}"></i>
    </button>`;
    })
    .join("");
}

async function fetchAircraftHistory(hex, callsign) {
  const wrap = document.getElementById("acHistory");
  const box = document.getElementById("acHistoryContent");
  if (!wrap || !box) return;

  wrap.style.display = "block";
  box.innerHTML = `<div style="padding:10px;text-align:center;color:var(--text-faint);font-size:10.5px">
    <i class="fas fa-spinner fa-spin"></i> Buscando info...</div>`;

  const cacheKey = hex + "_" + (callsign || "");
  if (acHistoryCache[cacheKey]) {
    renderAircraftHistory(acHistoryCache[cacheKey], hex);
    return acHistoryCache[cacheKey];
  }
  if (acHistoryPending[cacheKey]) return acHistoryPending[cacheKey];

  const request = (async () => {
    const ac =
      (await window.NheuDB?.cached(
        `aircraft:${hex.toUpperCase()}`,
        7 * 24 * 60 * 60 * 1000,
        async () => {
          const acRes = await fetch(
            `https://api.adsbdb.com/v0/aircraft/${hex.toUpperCase()}`,
          );
          return acRes.ok
            ? (await acRes.json())?.response?.aircraft || null
            : null;
        },
      )) ??
      (await (async () => {
        const acRes = await fetch(
          `https://api.adsbdb.com/v0/aircraft/${hex.toUpperCase()}`,
        );
        return acRes.ok
          ? (await acRes.json())?.response?.aircraft || null
          : null;
      })());

    let route = null;
    if (callsign && callsign.replace(/\s/g, "").length > 3) {
      const cleanCallsign = callsign.trim().replace(/\s/g, "");
      route =
        (await window.NheuDB?.cached(
          `route:${cleanCallsign}`,
          30 * 60 * 1000,
          async () => {
            const csRes = await fetch(
              `https://api.adsbdb.com/v0/callsign/${cleanCallsign}`,
            );
            return csRes.ok
              ? (await csRes.json())?.response?.flightroute || null
              : null;
          },
        )) ??
        (await (async () => {
          const csRes = await fetch(
            `https://api.adsbdb.com/v0/callsign/${cleanCallsign}`,
          );
          return csRes.ok
            ? (await csRes.json())?.response?.flightroute || null
            : null;
        })());
    }

    const result = { ac, route };
    acHistoryCache[cacheKey] = result;
    return result;
  })();

  acHistoryPending[cacheKey] = request;

  try {
    const result = await request;
    renderAircraftHistory(result, hex);
    return result;
  } catch (e) {
    box.innerHTML = `<div style="padding:8px;text-align:center;color:var(--text-faint);font-size:10px;font-style:italic">Sin datos disponibles</div>`;
    return null;
  } finally {
    delete acHistoryPending[cacheKey];
  }
}

function renderAircraftHistory({ ac, route }, targetHex = selectedHex) {
  const box = document.getElementById("acHistoryContent");
  if (!box) return;
  let html = "";
  if (ac && targetHex && planeStore[targetHex]) {
    planeStore[targetHex]._acOperator =
      getSpecialOperatorOverride(planeStore[targetHex]) ||
      ac.registered_owner ||
      "";
    planeStore[targetHex]._acManufact = ac.manufacturer || "";
    planeStore[targetHex]._acModel = ac.type || "";
    planeStore[targetHex]._acCountry = ac.registered_owner_country_name || "";
    if (targetHex === selectedHex) {
      renderSelected(targetHex, false, false);
      if (
        isMobile() &&
        document.getElementById("mobileModal")?.classList.contains("open")
      ) {
        openMobileModal_full();
      }
    }
  }

  if (ac) {
    const rows = [
      getSpecialOperatorOverride(planeStore[targetHex]) || ac.registered_owner
        ? [
            "Operador",
            getSpecialOperatorOverride(planeStore[targetHex]) ||
              ac.registered_owner,
          ]
        : null,
      ac.manufacturer ? ["Fabricante", ac.manufacturer] : null,
      ac.type ? ["Modelo", ac.type] : null,
      ac.registration ? ["Matrícula", ac.registration] : null,
      ac.registered_owner_country_name
        ? ["País", ac.registered_owner_country_name]
        : null,
    ].filter(Boolean);

    if (rows.length) {
      html +=
        `<div class="ach-info">` +
        rows
          .map(
            ([l, v]) =>
              `<div class="ach-row"><span class="ach-lbl">${escapeHTML(l)}</span><span class="ach-val">${escapeHTML(v)}</span></div>`,
          )
          .join("") +
        `</div>`;
    }
  }

  if (route) {
    const { origin: o, destination: d, airline } = route;
    if (o && d) {
      html += `<div class="ach-route">
        <div style="flex:1;text-align:center">
          <div class="ach-route-code">${escapeHTML(o.iata_code || o.icao_code || "?")}</div>
          <div class="ach-route-city">${escapeHTML(o.municipality || "")}</div>
        </div>
        <div class="ach-route-arrow"><i class="fas fa-arrow-right"></i></div>
        <div style="flex:1;text-align:center">
          <div class="ach-route-code">${escapeHTML(d.iata_code || d.icao_code || "?")}</div>
          <div class="ach-route-city">${escapeHTML(d.municipality || "")}</div>
        </div>
      </div>`;
    }
    if (airline?.name) {
      let logoHTML = "";
      if (airline.iata) {
        logoHTML = `<img src="https://pics.avs.io/200/80/${airline.iata.toUpperCase()}.png" style="height:14px;width:auto;object-fit:contain;vertical-align:middle;margin-right:6px"/>`;
      }
      html += `<div class="ach-airline" style="display:flex;align-items:center;gap:4px">
        ${logoHTML ? logoHTML : `<i class="fas fa-building" style="color:var(--accent);font-size:10px"></i>`}
        <span>${escapeHTML(airline.name)}</span>
        ${airline.iata ? `<span style="opacity:.5">· ${airline.iata}</span>` : ""}
      </div>`;
    }
  }

  if (!html)
    html = `<div style="padding:8px;text-align:center;color:var(--text-faint);font-size:10px;font-style:italic">Sin datos disponibles</div>`;
  box.innerHTML = html;
}

// ══════════════════════════════════════════════════════════════
//  LEFT PLANE CARD
// ══════════════════════════════════════════════════════════════
function updatePlaneCard(p, cls) {
  const card = document.getElementById("planeCard");
  if (!card) return;
  card.classList.add("visible");

  const callEl = document.getElementById("pcCall");
  callEl.textContent = p.call || "—";
  callEl.style.color = cls.hex;

  const badgeWrap = document.getElementById("pcBadgeWrap");
  if (badgeWrap && cls.label) {
    badgeWrap.innerHTML = `<span style="background:rgba(0,0,0,0.72);border:1px solid ${cls.hex}55;color:${cls.hex};font-size:8px;font-weight:700;padding:2px 7px;border-radius:5px;letter-spacing:.05em">${cls.label}</span>`;
  }

  const orig = p.orig || "?",
    dest = p.dest || "?";
  document.getElementById("pcOrig").textContent = orig;
  document.getElementById("pcDest").textContent = dest;
  document.getElementById("pcRoute").style.opacity =
    orig === "?" && dest === "?" ? "0.35" : "1";

  document.getElementById("pcAlt").textContent =
    p.alt != null ? p.alt.toLocaleString("es-ES") + " ft" : "—";
  document.getElementById("pcSpd").textContent =
    p.spdKmh != null ? Math.round(p.spdKmh) + " km/h" : "—";
  document.getElementById("pcTrk").textContent =
    p.trk != null ? Math.round(p.trk) + "°" : "—";
  const vr = p.baro_rate;
  const vsEl = document.getElementById("pcVspd");
  vsEl.textContent =
    vr != null
      ? (vr > 0 ? "↑ " : "↓ ") +
        Math.abs(Math.round(vr)).toLocaleString("es-ES") +
        " ft/m"
      : "—";
  vsEl.style.color = vr > 50 ? "#22e87a" : vr < -50 ? "#f87171" : "var(--text)";
  document.getElementById("pcType").textContent = (
    p.t ||
    p.type ||
    "—"
  ).toUpperCase();
  document.getElementById("pcReg").textContent = p.r || p.reg || "—";

  const pcPhoto = document.getElementById("pcPhoto");
  const pcPH = document.getElementById("pcPhotoPlaceholder");
  pcPhoto.classList.remove("visible");
  if (pcPH) {
    pcPH.style.display = "flex";
    pcPH.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cargando foto...';
  }
}

function updatePlaneCardPhoto(src, link) {
  const pcPhoto = document.getElementById("pcPhoto");
  const pcPH = document.getElementById("pcPhotoPlaceholder");
  if (pcPhoto) {
    if (src) {
      pcPhoto.src = src;
      pcPhoto.dataset.link = link || "";
      pcPhoto.onload = () => {
        pcPhoto.classList.add("visible");
        if (pcPH) pcPH.style.display = "none";
      };
      pcPhoto.onerror = () => {
        if (pcPH) {
          pcPH.innerHTML = '<i class="fas fa-image" style="opacity:.25"></i>';
        }
      };
    } else {
      pcPhoto.src = "";
      pcPhoto.classList.remove("visible");
      if (pcPH)
        pcPH.innerHTML = '<i class="fas fa-image" style="opacity:.25"></i>';
    }
  }

  const cardPhotoCont = document.getElementById("cardPhotoContainer");
  const cardPhotoImg = document.getElementById("cardPhotoImg");
  if (cardPhotoCont && cardPhotoImg) {
    if (src) {
      cardPhotoImg.src = src;
      cardPhotoCont.style.display = "block";
    } else {
      cardPhotoCont.style.display = "none";
      cardPhotoImg.src = "";
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  FETCH DE AVIONES
// ══════════════════════════════════════════════════════════════
async function fetchPlanes() {
  clearTimeout(fetchTimer);
  clearTimeout(scheduledFetchHandle);
  scheduledFetchHandle = null;

  if (window.isPlanesEnabled === false) {
    fetchTimer = setTimeout(fetchPlanes, 8000);
    return;
  }

  const boundsKey = buildFetchBoundsKey();
  const now = Date.now();
  if (boundsKey === lastFetchBoundsKey && now - lastFetchAt < 3500) {
    fetchTimer = setTimeout(fetchPlanes, 15000);
    return;
  }

  if (navigator.onLine === false) {
    updateNetworkState(false);
    fetchTimer = setTimeout(fetchPlanes, 15000);
    return;
  }

  setStatus("Cargando aviones...", "loading");
  document.getElementById("cnt").textContent = "…";
  const mobileCountEl = document.getElementById("mobileCnt");
  if (mobileCountEl) mobileCountEl.textContent = "…";

  if (fetchController) fetchController.abort();
  const controller = new AbortController();
  const signal = controller.signal;
  fetchController = controller;
  const seq = ++fetchSeq;

  try {
    const b = map.getBounds();
    const center = b.getCenter();
    const corner = b.getNorthEast();

    const radiusNM = Math.ceil(center.distanceTo(corner) / 1852);
    const MAX_NM = 250;

    let acList = [];
    if (BACKEND_API) {
      try {
        const r = Math.max(10, Math.min(radiusNM, 2000));
        acList = await fetchBackendPlanes(center.lat, center.lng, r, signal);
      } catch (backendError) {
        console.warn(
          "Backend NheuFlight no disponible, usando ADS-B directo:",
          backendError,
        );
        acList = await fetchAdsbPlanes(b, center, radiusNM, MAX_NM, signal);
      }
    } else {
      acList = await fetchAdsbPlanes(b, center, radiusNM, MAX_NM, signal);
    }

    if (seq !== fetchSeq || signal.aborted) return;
    lastFetchBoundsKey = boundsKey;
    lastFetchAt = Date.now();
    ingest(acList);
  } catch (e) {
    if (e.name === "AbortError") return;
    console.warn("Actualización ADS-B en segundo plano:", e);

    const currentCount = Object.keys(planeStore).length;
    if (currentCount > 0) {
      // Ya hay aviones en pantalla: mantenerlos y mostrar estado limpio
      setStatus(`${currentCount} aviones en radar`, "ok");
      document.getElementById("cnt").textContent = currentCount;
      const mobileCountEl = document.getElementById("mobileCnt");
      if (mobileCountEl) mobileCountEl.textContent = currentCount;
    } else {
      // Si la tienda estaba vacía, hidratar con el snapshot de respaldo
      if (Array.isArray(window.INITIAL_PLANES_SNAPSHOT) && window.INITIAL_PLANES_SNAPSHOT.length > 0) {
        ingest(window.INITIAL_PLANES_SNAPSHOT, { fromCache: true });
        setStatus(`${window.INITIAL_PLANES_SNAPSHOT.length} aviones en radar`, "ok");
      } else {
        setStatus("Abre 'iniciar.bat' para conectar los aviones en vivo", "error");
        document.getElementById("cnt").textContent = "!";
        const mobileCountEl = document.getElementById("mobileCnt");
        if (mobileCountEl) mobileCountEl.textContent = "!";
      }
    }
  }

  if (seq === fetchSeq) fetchTimer = setTimeout(fetchPlanes, 15000);
}

async function fetchBackendPlanes(lat, lon, radiusNM, signal) {
  const url = new URL(`${BACKEND_API}/api/planes`);
  url.searchParams.set("lat", lat.toFixed(4));
  url.searchParams.set("lon", lon.toFixed(4));
  url.searchParams.set("radius_nm", Math.ceil(radiusNM));

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 12000);
  if (signal) {
    signal.addEventListener("abort", () => ac.abort(), { once: true });
  }

  try {
    const res = await fetch(url.toString(), { signal: ac.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`Backend ${res.status}`);
    const data = await res.json();
    return Array.isArray(data?.ac) ? data.ac : [];
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchAdsbJson(path, signal) {
  let lastError = null;
  const apis = getAdsbApis();
  for (const base of apis) {
    try {
      let fullUrl = "";
      if (base.endsWith("/api/planes") || base.includes("/functions/planes")) {
        let lat = 41.38, lon = 2.17, dist = 150;
        if (path.startsWith("/point/")) {
          const parts = path.split("/");
          lat = parts[2];
          lon = parts[3];
          dist = Math.min(250, parseInt(parts[4], 10) || 150);
        } else if (path.startsWith("/lat/")) {
          const parts = path.split("/");
          lat = parts[2];
          lon = parts[4];
          dist = Math.min(250, parseInt(parts[6], 10) || 150);
        }
        fullUrl = `${base}?lat=${lat}&lon=${lon}&dist=${dist}&radius_nm=${dist}`;
      } else {
        let apiPath = path;
        const isFi =
          base.includes("adsb.fi") ||
          (base.includes("/api/adsb") && !base.includes("adsblol"));
        // Normalizar ruta para opendata.adsb.fi (/lat/.../lon/.../dist/...) con limite de 250 NM
        if (isFi && apiPath.startsWith("/point/")) {
          const parts = apiPath.split("/");
          const dist = Math.min(250, parseInt(parts[4], 10) || 250);
          apiPath = `/lat/${parts[2]}/lon/${parts[3]}/dist/${dist}`;
        }
        fullUrl = `${base}${apiPath}`;
      }

      const res = await fetch(fullUrl, {
        signal,
        headers: { "Accept": "application/json" }
      });
      if (!res.ok) throw new Error(`${base} ${res.status}`);

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("json"))
        throw new Error(`${base} no devolvio JSON`);

      const data = await res.json();
      const list = Array.isArray(data?.ac)
        ? data.ac
        : Array.isArray(data?.aircraft)
          ? data.aircraft
          : null;
      if (!list)
        throw new Error(`${base} respuesta sin lista de aviones`);
      data.ac = list;
      return data;
    } catch (err) {
      if (err.name === "AbortError") throw err;
      lastError = err;
      console.warn("Proveedor ADS-B no disponible:", err);
    }
  }
  throw lastError || new Error("Sin proveedores ADS-B disponibles");
}

async function fetchAdsbPlanes(bounds, center, radiusNM, maxNM, signal) {
  // api.adsb.lol soporta hasta 500 NM en una sola petición limpia
  const effectiveMaxNM = 500;
  if (radiusNM <= effectiveMaxNM) {
    const r = Math.max(10, Math.min(radiusNM, effectiveMaxNM));
    const data = await fetchAdsbJson(
      `/point/${center.lat.toFixed(4)}/${center.lng.toFixed(4)}/${r}`,
      signal,
    );
    return data.ac || [];
  }

  // Zoom muy alejado (>500 NM): petición amplia central
  try {
    const data = await fetchAdsbJson(
      `/point/${center.lat.toFixed(4)}/${center.lng.toFixed(4)}/500`,
      signal,
    );
    if (Array.isArray(data?.ac) && data.ac.length > 50) {
      return data.ac;
    }
  } catch (err) {
    console.warn("Fallo petición central amplia:", err);
  }

  // Sectores secuenciales espaciados para evitar error 420 por saturación
  const pts = gridCenters(bounds, 250).slice(0, 6);
  setStatus(`Cubriendo zona (${pts.length} sectores)…`, "loading");

  const acList = [];
  const hexSeen = new Set();
  for (const pt of pts) {
    if (signal?.aborted) break;
    try {
      const data = await fetchAdsbJson(
        `/point/${pt.lat.toFixed(4)}/${pt.lng.toFixed(4)}/250`,
        signal,
      );
      for (const ac of (data.ac || [])) {
        if (ac.hex && !hexSeen.has(ac.hex)) {
          hexSeen.add(ac.hex);
          acList.push(ac);
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    } catch (secErr) {
      console.warn("Error en sector:", secErr);
    }
  }
  return acList;
}

const WORLD_CACHE_TTL = 5 * 60 * 1000;

function ingest(ac, options = {}) {
  const now = Date.now();
  const seen = new Set();
  const normalizedPlanes = [];

  ac.filter((a) => a.lat != null && a.lon != null && !a.gnd).forEach((a) => {
    const hex = (a.hex || "?").toUpperCase();
    seen.add(hex);
    const spdKmh = a.gs != null ? +a.gs * 1.852 : 0;
    let origCode = a.orig_iata || a.orig_icao || a.origin || "";
    let destCode = a.dest_iata || a.dest_icao || a.destination || "";
    if (!origCode && a.route) {
      const parts = a.route.replace(/\s/g, "").split("-");
      origCode = parts[0] || "";
      destCode = destCode || parts[1] || "";
    }
    if (!origCode && a.desc) {
      const m = a.desc.match(/([A-Z]{3,4})-([A-Z]{3,4})/);
      if (m) {
        origCode = m[1];
        destCode = destCode || m[2];
      }
    }
    const prev = planeStore[hex];
    const newLat = +a.lat,
      newLon = +a.lon;

    let ilat = newLat;
    let ilon = newLon;
    if (prev) {
      const dist = haversineKm(prev.ilat, prev.ilon, newLat, newLon);
      if (dist < 15) {
        ilat = prev.ilat;
        ilon = prev.ilon;
      }
    }

    if (!flightTrails[hex]) flightTrails[hex] = [];
    const _lp = flightTrails[hex][flightTrails[hex].length - 1];
    const _moved =
      !_lp ||
      Math.abs(_lp[0] - newLat) > 0.0008 ||
      Math.abs(_lp[1] - newLon) > 0.0008;
    if (_moved) {
      const _alt =
        a.alt_baro != null
          ? +a.alt_baro
          : a.altitude != null
            ? +a.altitude
            : null;
      flightTrails[hex].push([newLat, newLon, _alt, now]);
      if (flightTrails[hex].length > 12000) flightTrails[hex].shift();
    }

    planeStore[hex] = {
      ...a,
      hex,
      call: (a.flight || "").trim() || hex,
      lat: newLat,
      lon: newLon,
      alt:
        a.alt_baro != null
          ? Math.round(+a.alt_baro)
          : a.altitude != null
            ? Math.round(+a.altitude)
            : null,
      spd:
        a.gs != null
          ? Math.round(+a.gs)
          : a.speed != null
            ? Math.round(+a.speed)
            : null,
      spdKmh,
      trk:
        a.track != null
          ? +a.track
          : a.true_heading != null
            ? +a.true_heading
            : 0,
      orig: origCode || (prev && prev.orig) || "",
      dest: destCode || (prev && prev.dest) || "",
      origCity: cityName(origCode) || (prev && prev.origCity) || "",
      destCity: cityName(destCode) || (prev && prev.destCity) || "",
      squawk: normalizeSquawk(a.squawk ?? a.sqk ?? a.sq ?? prev?.squawk),
      fetchedAt: now,
      ilat,
      ilon,
      targetLat: newLat,
      targetLon: newLon,
    };
    normalizedPlanes.push(planeStore[hex]);

    if (selectedHex === hex) updateChart(planeStore[hex]);
  });

  Object.keys(planeStore).forEach((h) => {
    const age = now - (planeStore[h].fetchedAt || 0);
    if (age > WORLD_CACHE_TTL) delete planeStore[h];
  });

  if (selectedHex && !planeStore[selectedHex]) deselectPlane();

  updateVisibleCount();
  updateHeliWatch();
  updateSquawkAlerts();
  updateOperatorFocusUI();
  processWatchAlerts(normalizedPlanes);
  updateWatchPanel();
  updateMobileNearbyList();
  if (selectedHex) {
    updateDistanceTravelled(selectedHex);
    updateFlightTime(selectedHex);
    if (planeStore[selectedHex]) {
      const _p = planeStore[selectedHex];
      const _pcAlt = document.getElementById("pcAlt");
      const _pcSpd = document.getElementById("pcSpd");
      const _pcTrk = document.getElementById("pcTrk");
      const _pcVspd = document.getElementById("pcVspd");
      if (_pcAlt)
        _pcAlt.textContent =
          _p.alt != null ? _p.alt.toLocaleString("es-ES") + " ft" : "—";
      if (_pcSpd)
        _pcSpd.textContent =
          _p.spdKmh != null ? Math.round(_p.spdKmh) + " km/h" : "—";
      if (_pcTrk)
        _pcTrk.textContent = _p.trk != null ? Math.round(_p.trk) + "°" : "—";
      if (_pcVspd) {
        const _vr = _p.baro_rate;
        _pcVspd.textContent =
          _vr != null
            ? (_vr > 0 ? "↑ " : "↓ ") +
              Math.abs(Math.round(_vr)).toLocaleString("es-ES") +
              " ft/m"
            : "—";
        _pcVspd.style.color =
          _vr > 50 ? "#22e87a" : _vr < -50 ? "#f87171" : "var(--text)";
      }
    }
  }

  const t = new Date().toLocaleTimeString("es-ES");
  const total = Object.keys(planeStore).length;
  setStatus(
    `Actualizado ${t} · ${seen.size} recibidos · ${total} en cache`,
    "ok",
  );
  document.getElementById("liveBarText").textContent = `Actualizado a las ${t}`;
  if (!options.fromCache) savePlanesSnapshot(ac).catch(() => {});

  startInterp();
  if (selectedHex && planeStore[selectedHex])
    renderSelected(selectedHex, false);
  updateHudStats();
  updateMobileChrome();
}

// ══════════════════════════════════════════════════════════════
//  INTERPOLACIÓN 60FPS
// ══════════════════════════════════════════════════════════════
function startInterp() {
  if (interpTimer !== null || window.isPlanesEnabled === false) return;
  let lastFrameTime = performance.now();
  function frame(time) {
    const planes = window.isPlanesEnabled === false ? [] : Object.values(planeStore);
    if (!planes.length) {
      interpTimer = null;
      canvasLayer.redraw();
      return;
    }
    interpTimer = requestAnimationFrame(frame);
    const dt = (time - lastFrameTime) / 1000;
    lastFrameTime = time;

    const safeDt = Math.min(dt, 0.5);
    const easingFactor = 1 - Math.exp(-2.2 * safeDt);

    planes.forEach((p) => {
      if (p.spdKmh && p.trk) {
        const distKm = (p.spdKmh / 3600) * safeDt;
        const trkRad = p.trk * DEG;
        p.targetLat = (p.targetLat ?? p.lat) + (distKm / R_KM) * (180 / Math.PI) * Math.cos(trkRad);
        p.targetLon = (p.targetLon ?? p.lon) + ((distKm / R_KM) * (180 / Math.PI) * Math.sin(trkRad)) / Math.cos(p.targetLat * DEG);
      }

      if (p.targetLat != null && p.targetLon != null) {
        p.ilat += (p.targetLat - p.ilat) * easingFactor;
        p.ilon += (p.targetLon - p.ilon) * easingFactor;
      }
    });

    if (typeof canvasLayer !== "undefined") canvasLayer.redraw();

    if (time - lastTrailUpdateTime > TRAIL_INTERP_INTERVAL) {
      lastTrailUpdateTime = time;
      const now = Date.now();
      planes.forEach((p) => {
        if (!interpTrails[p.hex]) interpTrails[p.hex] = [];
        interpTrails[p.hex].push([p.ilat, p.ilon, p.alt, now]);
        if (interpTrails[p.hex].length > 800) interpTrails[p.hex].shift();
      });
      if (selectedHex && planeStore[selectedHex]) {
        drawTrail(selectedHex, classifyAircraft(planeStore[selectedHex]).hex);
      }
    }

    if (
      selectedHex &&
      planeStore[selectedHex] &&
      time - lastSelectedProgressUpdate > 1000
    ) {
      lastSelectedProgressUpdate = time;
      updateSelectedRouteProgress();
    }
  }
  interpTimer = requestAnimationFrame(frame);
}

let lastSelectedProgressUpdate = 0;

function updateSelectedRouteProgress() {
  if (!selectedHex) return;
  const p = planeStore[selectedHex];
  if (!p) return;

  const fillEl = document.getElementById("fr24ProgressFill");
  const iconEl = document.getElementById("fr24ProgressIcon");
  const trailDistEl = document.getElementById("fr24TrailDistVal");
  const remDistEl = document.getElementById("fr24RemDistVal");
  if (!fillEl && !trailDistEl) return;

  const origCode = p.orig || "";
  const destCode = p.dest || "";
  const origCoords = getAirportCoords(origCode);
  const destCoords = getAirportCoords(destCode);

  const lat = p.ilat ?? p.lat;
  const lon = p.ilon ?? p.lon;
  if (lat == null || lon == null) return;

  let trailKm = 0;
  if (origCoords) {
    trailKm = Math.round(haversineKm(origCoords.lat, origCoords.lon, lat, lon));
  } else {
    trailKm = calcTrailDistance(selectedHex);
  }

  let distKm = 0;
  if (destCoords) {
    distKm = Math.round(haversineKm(lat, lon, destCoords.lat, destCoords.lon));
  }

  const totalDist = (trailKm || 0) + (distKm || 0);
  const pct = totalDist > 0 && (trailKm > 0 || distKm > 0)
    ? Math.min(98, Math.max(2, Math.round(((trailKm || 0) / totalDist) * 100)))
    : 0;

  if (fillEl) fillEl.style.width = `${pct}%`;
  if (iconEl) iconEl.style.left = `calc(${pct}% - 6px)`;
  if (trailDistEl) trailDistEl.textContent = (origCoords && trailKm > 0) ? `${trailKm.toLocaleString("es-ES")} km recorridos` : "—";
  if (remDistEl) remDistEl.textContent = (destCoords && distKm > 0) ? `${distKm.toLocaleString("es-ES")} km restantes` : "—";

  const arrTimeLblEl = document.getElementById("fr24ArrTimeLbl");
  const arrTimeValEl = document.getElementById("fr24ArrTimeVal");
  if (arrTimeLblEl && arrTimeLblEl.textContent.includes("Est.") && arrTimeValEl && p.spdKmh >= 30 && distKm > 0) {
    const etaMin = Math.round((distKm / p.spdKmh) * 60);
    if (etaMin >= 0 && etaMin <= 900) {
      const arrDate = new Date(Date.now() + etaMin * 60 * 1000);
      arrTimeValEl.textContent = arrDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    }
  }
}

// ══════════════════════════════════════════════════════════════
//  FILTROS
// ══════════════════════════════════════════════════════════════
function planeMatchesFilter(p) {
  if (!activeFilter || activeFilter === "all") return true;
  const cls = classifyAircraft(p);
  if (activeFilter === "heli") return cls.shape === "heli";
  if (activeFilter === "emergency") {
    const isEmergHeli = ["heli_sem", "heli_bomb", "heli_med", "heli_dgt", "heli_polnac", "heli_gcivil"].includes(cls.color);
    const squawk = String(p.squawk || "");
    const isSquawkAlert = squawk === "7700" || squawk === "7600" || squawk === "7500";
    return isEmergHeli || isSquawkAlert;
  }
  if (activeFilter === "military") {
    return cls.color === "military" || cls.shape === "military";
  }
  if (activeFilter === "commercial") {
    return cls.color === "commercial" || cls.shape === "commercial";
  }
  if (activeFilter === "private") {
    return cls.color === "private" || cls.shape === "private";
  }
  if (activeFilter === "general") {
    return cls.color === "general" || cls.shape === "small";
  }
  return cls.color === activeFilter;
}

function applyFilter(f) {
  activeFilter = normalizeFilter(f);
  storageSet(STORAGE_KEYS.filter, activeFilter);
  document.querySelectorAll(".leg-filter").forEach((b) => {
    b.classList.toggle("factive", b.dataset.filter === activeFilter);
  });
  document.querySelectorAll("#planeFilterStrip .filter-chip[data-filter]").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === activeFilter);
  });
  updateVisibleCount();
  updateHudStats();
  if (canvasLayer) canvasLayer.redraw();
  updateMobileNearbyList();
  updateMobileChrome();
}
window.applyFilter = applyFilter;

function cycleFilter() {
  const current = Math.max(0, FILTERS.indexOf(activeFilter));
  applyFilter(FILTERS[(current + 1) % FILTERS.length]);
}

// ══════════════════════════════════════════════════════════════
//  SELECCIÓN
// ══════════════════════════════════════════════════════════════
function searchPlane(query) {
  if (!query) return;
  const rawQ = query.trim().toLowerCase();
  if (rawQ.length < 2) return;
  const q = rawQ.toUpperCase();
  const found = Object.values(planeStore).find(
    (p) =>
      (p.call || "").toUpperCase().includes(q) ||
      (p.r || "").toUpperCase().includes(q) ||
      (p.reg || "").toUpperCase().includes(q) ||
      (p.hex || "").toUpperCase().includes(q) ||
      (p.orig || "").toUpperCase().includes(q) ||
      (p.dest || "").toUpperCase().includes(q) ||
      (p.origCity || "").toUpperCase().includes(q) ||
      (p.destCity || "").toUpperCase().includes(q) ||
      (p.t || p.type || "").toUpperCase().includes(q) ||
      (p._acOperator || "").toUpperCase().includes(q),
  );
  if (found) {
    selectPlane(found.hex);
    map.setView([found.ilat, found.ilon], Math.max(map.getZoom(), 9), {
      animate: true,
    });
    document.getElementById("searchBox").blur();
  }
}

function centerOnSelected() {
  if (selectedHex && planeStore[selectedHex]) {
    const p = planeStore[selectedHex];
    map.setView([p.ilat, p.ilon], Math.max(map.getZoom(), 9), {
      animate: true,
    });
  }
}

async function shareSelectedPlane() {
  if (!selectedHex || !planeStore[selectedHex]) return;
  const p = planeStore[selectedHex];
  const shareText = [
    p.call || selectedHex,
    p.r || p.reg || "",
    p.orig || p.dest ? `${p.orig || "---"} -> ${p.dest || "---"}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  try {
    if (navigator.share) {
      await navigator.share({
        title: p.call || "NheuFlight",
        text: shareText || "Vuelo visto en NheuFlight",
        url: window.location.href,
      });
      return;
    }
  } catch (e) {}

  try {
    await navigator.clipboard.writeText(
      `${shareText}\n${window.location.href}`.trim(),
    );
    setStatus("Enlace copiado al portapapeles", "ok");
  } catch (e) {
    setStatus("No se pudo compartir el vuelo", "error");
  }
}

function selectPlane(hex) {
  selectedHex = hex;
  window.selectedHex = hex;
  window.planeStore = planeStore;
  if (isMobile()) document.body.classList.add("mobile-plane-selected");
  updateHudStats();
  if (isMobile()) pendingMobileOpenHex = null;
  renderSelected(hex, true);
  updateMobileNearbyList();

  // Activar panel lateral moderno y ocultar tarjeta central
  const selPanel = document.getElementById("selPanel");
  if (selPanel) selPanel.classList.add("active");
  const vesselCard = document.getElementById("vesselCard");
  if (vesselCard) vesselCard.classList.remove("active");
  if (isDemoModeActive) updateDemoPlaneInfo();
}

function deselectPlane() {
  const acH = document.getElementById("acHistory");
  if (acH) acH.style.display = "none";
  const pc = document.getElementById("planeCard");
  if (pc) pc.classList.remove("visible");
  const vc = document.getElementById("vesselCard");
  if (vc) vc.classList.remove("active");
  const cardPhotoCont = document.getElementById("cardPhotoContainer");
  if (cardPhotoCont) cardPhotoCont.style.display = "none";
  selectedHex = null;
  window.selectedHex = null;
  lastPhotoHex = null;
  lastMobileFlightPhotoHex = null;
  _mobileFullData = null;
  if (isDemoModeActive) updateDemoPlaneInfo();
  document.getElementById("selPanel").classList.remove("active");
  const selPhoto = document.getElementById("selPhoto");
  if (selPhoto) {
    selPhoto.classList.remove("active", "has-photo");
    selPhoto.style.display = "none";
  }
  const selPhotoLoad = document.getElementById("selPhotoLoading");
  if (selPhotoLoad) selPhotoLoad.style.display = "none";
  const selPhotoImg = document.getElementById("selPhotoImg");
  if (selPhotoImg) selPhotoImg.style.display = "none";
  document.getElementById("mobileMiniCard").classList.remove("visible");
  document.getElementById("mobileFlightCard")?.classList.remove("visible");
  clearActiveTrail();
  if (window._destMarker) {
    try {
      map.removeLayer(window._destMarker);
    } catch (e) {}
    window._destMarker = null;
  }
  clearChart();
  telemetryChartHex = null;
  telemetryChartSeedSource = "";
  const oldTrailDiv = document.getElementById("trailInfoDiv");
  if (oldTrailDiv) oldTrailDiv.remove();
  closeMobileModal();
  closeMobileMenus();
  if (mobileChart) {
    mobileChart.destroy();
    mobileChart = null;
  }
  document.body.classList.remove("mobile-plane-selected");
  updateHudStats();
  updateMobileNearbyList();
}

// ══════════════════════════════════════════════════════════════
//  DISTANCIA RECORRIDA
// ══════════════════════════════════════════════════════════════
function haversineKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * DEG,
    dLon = (lon2 - lon1) * DEG;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG) * Math.cos(lat2 * DEG) * Math.sin(dLon / 2) ** 2;
  return R_KM * 2 * Math.asin(Math.sqrt(a));
}

const ICAO_TO_IATA_AIRPORTS = {
  LEBL: "BCN", LEMD: "MAD", LEPA: "PMI", LEMG: "AGP", LEAL: "ALC", LEVC: "VLC",
  LEZL: "SVQ", LEBB: "BIO", GCTS: "TFS", GCXO: "TFN", GCLP: "LPA", LEIB: "IBZ",
  LEXJ: "SDR", LEVT: "VGO", LEAS: "OVD", LEZG: "ZAZ", LEGR: "GRX", GCFV: "FUE",
  GCRR: "ACE", GEML: "MLN", GCLA: "SPC", GCGM: "GMZ", GCHI: "VDE", LEAM: "LEI",
  LERS: "REU", LERJ: "RJL", LEBG: "BGS", LEPP: "PNA", LEST: "SCQ", LELC: "MJV",
  LEGE: "GRO", LECO: "LCG", EGLL: "LHR", EGKK: "LGW", EGSS: "STN", EGGW: "LTN",
  EGLC: "LCY", EGCC: "MAN", EGPH: "EDI", EGPF: "GLA", EGBB: "BHX", EGGP: "LPL",
  LFPG: "CDG", LFPO: "ORY", LFMN: "NCE", LFLL: "LYS", LFML: "MRS", LFBO: "TLS",
  LFBD: "BOD", LFRS: "NTE", EDDF: "FRA", EDDM: "MUC", EDDB: "BER", EDDH: "HAM",
  EDDL: "DUS", EDDK: "CGN", EDDS: "STR", EHAM: "AMS", EHEH: "EIN", EHRD: "RTM",
  LIRF: "FCO", LIMC: "MXP", LIML: "LIN", LIPZ: "VCE", LIRN: "NAP", LIME: "BGY",
  LIRP: "PSA", LICC: "CTA", LIPE: "BLQ", LICJ: "PMO", LSZH: "ZRH", LSGG: "GVA",
  LFSB: "BSL", LOWW: "VIE", LOWS: "SZG", LOWG: "GRZ", EBBR: "BRU", EBLG: "LGG",
  EBCI: "CRL", LPPT: "LIS", LPPR: "OPO", LPFR: "FAO", LPPD: "PDL", LPMA: "FNC",
  LGAV: "ATH", LGTS: "SKG", LGIR: "HER", LGRP: "RHO", LGKR: "CFU", LTFM: "IST",
  LTFJ: "SAW", LTAC: "ESB", LTAI: "AYT", EKCH: "CPH", ESSA: "ARN", ESGG: "GOT",
  EFHK: "HEL", ENGM: "OSL", ENBR: "BGO", ENVA: "TRD", EIDW: "DUB", EINN: "SNN",
  EICK: "ORK", EPWA: "WAW", EPKK: "KRK", EPGD: "GDN", EPWR: "WRO", LKPR: "PRG",
  LHBP: "BUD", LROP: "OTP", LBSF: "SOF", LYBE: "BEG", LDZA: "ZAG", LDSP: "SPU",
  LDDU: "DBV", KJFK: "JFK", KLGA: "LGA", KEWR: "EWR", KLAX: "LAX", KSFO: "SFO",
  KORD: "ORD", KMDW: "MDW", KDFW: "DFW", KATL: "ATL", KMIA: "MIA", KFLL: "FLL",
  KMCO: "MCO", KBOS: "BOS", OMDB: "DXB", OTHH: "DOH", WSSS: "SIN", RJTT: "HND",
  RJAA: "NRT", RKSI: "ICN", ZBAA: "PEK", ZSPD: "PVG", VHHH: "HKG", VIDP: "DEL",
  VABB: "BOM", YSSY: "SYD", SBGR: "GRU", SAEZ: "EZE", SKBO: "BOG", CYYZ: "YYZ",
  CYUL: "YUL", MMMX: "MEX", MMUN: "CUN"
};

function getAirportCoords(code) {
  if (!code) return null;
  const clean = String(code).trim().toUpperCase();

  // 1. Directo en AIRPORT_COORDS o AIRPORT_COORDS_ETA
  if (window.AIRPORT_COORDS?.[clean]) return window.AIRPORT_COORDS[clean];
  const etaCoords = window.AIRPORT_COORDS_ETA?.[clean];
  if (Array.isArray(etaCoords) && etaCoords.length >= 2) {
    return { lat: etaCoords[0], lon: etaCoords[1] };
  }

  // 2. Mapeo ICAO -> IATA común
  if (ICAO_TO_IATA_AIRPORTS[clean]) {
    const iata = ICAO_TO_IATA_AIRPORTS[clean];
    if (window.AIRPORT_COORDS?.[iata]) return window.AIRPORT_COORDS[iata];
    const eta = window.AIRPORT_COORDS_ETA?.[iata];
    if (Array.isArray(eta) && eta.length >= 2) return { lat: eta[0], lon: eta[1] };
  }

  // 3. Buscar en globalAirports (miles de aeropuertos mundiales)
  if (Array.isArray(globalAirports) && globalAirports.length > 0) {
    const ap = globalAirports.find(
      (a) =>
        (a.iata && a.iata.toUpperCase() === clean) ||
        (a.icao && a.icao.toUpperCase() === clean)
    );
    if (ap) {
      const lat = toFiniteNumber(ap.lat ?? ap.latitude);
      const lon = toFiniteNumber(ap.lon ?? ap.longitude);
      if (lat != null && lon != null) return { lat, lon };
    }
  }

  return null;
}

function pushUniqueTrailPoint(target, point) {
  if (!point || point[0] == null || point[1] == null) return;
  const prev = target[target.length - 1];
  if (!prev) {
    target.push(point);
    return;
  }
  if (
    Math.abs(prev[0] - point[0]) < 0.00005 &&
    Math.abs(prev[1] - point[1]) < 0.00005
  )
    return;
  target.push(point);
}

function simplifyTrailPoints(points, maxPoints = 1400) {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const simplified = [];
  for (let i = 0; i < points.length; i += step) simplified.push(points[i]);
  const last = points[points.length - 1];
  if (simplified[simplified.length - 1] !== last) simplified.push(last);
  return simplified;
}

function buildSyntheticOriginTrail(hex, originCode) {
  const plane = planeStore[hex];
  const origin = getAirportCoords(originCode);
  if (!plane || !origin) return [];
  const firstLiveTs =
    (flightTrails[hex] && flightTrails[hex][0] && flightTrails[hex][0][3]) ||
    Date.now();
  const synthetic = [];
  pushUniqueTrailPoint(synthetic, [origin.lat, origin.lon, 0, firstLiveTs]);
  (flightTrails[hex] || []).forEach((pt) =>
    pushUniqueTrailPoint(synthetic, pt),
  );
  pushUniqueTrailPoint(synthetic, [
    plane.ilat,
    plane.ilon,
    plane.alt,
    Date.now(),
  ]);
  return synthetic;
}

async function fetchOpenSkyTrack(hex) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 6500);
  try {
    const res = await fetch(
      `https://opensky-network.org/api/tracks/all?icao24=${hex.toLowerCase()}&time=0`,
      {
        signal: ctrl.signal,
      },
    );
    clearTimeout(tid);
    if (!res.ok) return [];
    const data = await res.json();
    const path = Array.isArray(data?.path) ? data.path : [];
    if (!path.length) return [];

    let startIdx = 0;
    for (let i = 1; i < path.length; i++) {
      const prevGround = Boolean(path[i - 1]?.[5]);
      const currGround = Boolean(path[i]?.[5]);
      if (prevGround && !currGround) startIdx = Math.max(0, i - 1);
    }

    const normalized = [];
    for (const row of path.slice(startIdx)) {
      const lat = Number(row?.[1]);
      const lon = Number(row?.[2]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const altMeters = Number(row?.[3]);
      const altFeet = Number.isFinite(altMeters)
        ? Math.round(altMeters * 3.28084)
        : null;
      const ts = Number.isFinite(Number(row?.[0]))
        ? Number(row[0]) * 1000
        : null;
      pushUniqueTrailPoint(normalized, [lat, lon, altFeet, ts]);
    }
    return simplifyTrailPoints(normalized);
  } catch {
    clearTimeout(tid);
    return [];
  }
}

async function fetchBackendTrail(hex) {
  if (!BACKEND_API || !hex) return [];
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), 6500);
  try {
    const res = await fetch(
      `${BACKEND_API}/api/trail/${encodeURIComponent(hex.toLowerCase())}?hours=24`,
      {
        signal: ctrl.signal,
      },
    );
    clearTimeout(tid);
    if (!res.ok) return [];
    const data = await res.json();
    const points = Array.isArray(data?.points) ? data.points : [];
    const normalized = [];
    for (const row of points) {
      const lat = Number(row?.[0]);
      const lon = Number(row?.[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const alt = row?.[2] == null ? null : Number(row[2]);
      const ts = row?.[3] == null ? null : Number(row[3]);
      pushUniqueTrailPoint(normalized, [
        lat,
        lon,
        Number.isFinite(alt) ? alt : null,
        Number.isFinite(ts) ? ts : null,
      ]);
    }
    return simplifyTrailPoints(normalized);
  } catch {
    clearTimeout(tid);
    return [];
  }
}

async function ensureHistoricalTrail(hex, originCode = "") {
  const cached = historicalTrails[hex];
  if (
    cached?.status === "ready" &&
    (cached.points?.length || !originCode || cached.source)
  )
    return cached;
  if (cached?.status === "loading" && cached.promise) return cached.promise;

  const promise = (async () => {
    const plane = planeStore[hex];
    let points = await fetchBackendTrail(hex);
    let source = points.length > 4 ? "backend" : "";

    if (points.length < 2) {
      points = plane ? await fetchOpenSkyTrack(hex) : [];
      source = points.length > 4 ? "opensky" : "";
    }

    if (plane && points.length > 1) {
      const last = points[points.length - 1];
      if (haversineKm(last[0], last[1], plane.ilat, plane.ilon) > 150) {
        points = [];
        source = "";
      }
    }

    if (points.length < 2 && originCode) {
      points = buildSyntheticOriginTrail(hex, originCode);
      source = points.length > 1 ? "origin-anchor" : "";
    }

    const ready = {
      status: "ready",
      points: simplifyTrailPoints(points),
      source,
    };
    historicalTrails[hex] = ready;
    return ready;
  })();

  historicalTrails[hex] = {
    status: "loading",
    points: [],
    source: "",
    promise,
  };
  return promise;
}

function getCombinedTrailPoints(hex, includeCurrent = true) {
  const plane = planeStore[hex];
  const merged = [];
  const history = historicalTrails[hex]?.points || [];
  const live = flightTrails[hex] || [];
  const interp = interpTrails[hex] || [];

  history.forEach((pt) => pushUniqueTrailPoint(merged, pt));
  (history.length ? live : live.length >= 2 ? live : interp).forEach((pt) =>
    pushUniqueTrailPoint(merged, pt),
  );
  if (includeCurrent && plane)
    pushUniqueTrailPoint(merged, [
      plane.ilat,
      plane.ilon,
      plane.alt,
      Date.now(),
    ]);
  return simplifyTrailPoints(merged);
}

function calcTrailDistance(hex) {
  const pts = getCombinedTrailPoints(hex);
  if (pts.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < pts.length; i++)
    total += haversineKm(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
  return Math.round(total);
}

function updateDistanceTravelled(hex) {
  const el = document.getElementById("selDistVal");
  if (!el) return;
  const km = calcTrailDistance(hex);
  if (km > 0) el.textContent = km.toLocaleString("es-ES") + " km";
}

function calcFlightMinutes(hex) {
  const pts = getCombinedTrailPoints(hex, false).filter((pt) =>
    Number.isFinite(pt?.[3]),
  );
  if (pts.length < 2) return 0;
  const firstTs = pts[0][3];
  const lastTs = pts[pts.length - 1][3];
  if (
    !Number.isFinite(firstTs) ||
    !Number.isFinite(lastTs) ||
    lastTs <= firstTs
  )
    return 0;
  return Math.round((lastTs - firstTs) / 60000);
}

function formatFlightDuration(minutes) {
  if (!minutes || minutes < 1) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function updateFlightTime(hex) {
  const el = document.getElementById("selFlightTimeVal");
  if (!el) return;
  el.textContent = formatFlightDuration(calcFlightMinutes(hex));
}

function hasRealHistoricalTrail(hex) {
  return (
    historicalTrails[hex]?.source === "opensky" &&
    (historicalTrails[hex]?.points?.length || 0) > 2
  );
}

function buildHistoricalChartSeed(hex, maxPoints = 20) {
  const points = (historicalTrails[hex]?.points || []).filter(
    (pt) => pt[2] != null && Number.isFinite(pt[3]),
  );
  if (points.length < 2) return null;

  const step = Math.max(1, Math.ceil(points.length / maxPoints));
  const sampled = [];
  for (let i = 0; i < points.length; i += step) sampled.push(points[i]);
  const last = points[points.length - 1];
  if (sampled[sampled.length - 1] !== last) sampled.push(last);

  return {
    labels: sampled.map((pt) =>
      new Date(pt[3]).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    ),
    altitude: sampled.map((pt) => Math.round(pt[2] || 0)),
  };
}

function seedTelemetryChartFromHistory(hex) {
  if (!telemetryChart) return false;
  const seed = buildHistoricalChartSeed(hex);
  if (!seed) return false;
  telemetryChart.data.labels = seed.labels;
  telemetryChart.data.datasets[0].data = seed.altitude;
  telemetryChart.data.datasets[1].data = new Array(seed.labels.length).fill(
    null,
  );
  telemetryChart.update("none");
  telemetryChartHex = hex;
  telemetryChartSeedSource = "history";
  return true;
}

// ══════════════════════════════════════════════════════════════
//  TRAIL (ESTELA)
// ══════════════════════════════════════════════════════════════
function segmentColor(pts, i, baseColor) {
  const alt = pts[i + 1] ? pts[i + 1][2] : null;
  if (alt == null) return baseColor;
  
  if (alt < 1500) return "#ef4444"; // Rojo (Takeoff/Landing)
  if (alt < 5000) return "#f97316"; // Naranja
  if (alt < 10000) return "#eab308"; // Amarillo
  if (alt < 18000) return "#22c55e"; // Verde
  if (alt < 26000) return "#06b6d4"; // Cian
  if (alt < 34000) return "#3b82f6"; // Azul
  return "#a855f7"; // Morado (Crucero alto)
}

function clearActiveTrail() {
  if (!activeTrail) return;
  activeTrail.group.clearLayers();
  activeTrail.group.remove();
  activeTrail = null;
}

function drawTrail(hex, baseColor) {
  const plane = planeStore[hex];
  if (!plane || activeTrail?.hex !== hex) clearActiveTrail();
  if (!plane) return;

  if (!activeTrail) {
    activeTrail = {
      hex,
      group: L.layerGroup().addTo(map),
      segments: [],
      origin: null,
      points: [],
      baseColor,
    };
  }

  const trail = activeTrail;
  const points = getCombinedTrailPoints(hex);
  const total = points.length;
  const segmentCount = Math.max(0, total - 1);

  while (trail.segments.length > segmentCount) {
    trail.group.removeLayer(trail.segments.pop());
  }

  for (let i = 0; i < segmentCount; i++) {
    const from = points[i];
    const to = points[i + 1];
    const previousFrom = trail.points[i];
    const previousTo = trail.points[i + 1];
    const coordsChanged = !previousTo ||
      from[0] !== previousFrom[0] || from[1] !== previousFrom[1] ||
      to[0] !== previousTo[0] || to[1] !== previousTo[1];
    const styleChanged = total !== trail.points.length ||
      to[2] !== previousTo?.[2] || baseColor !== trail.baseColor;

    let segment = trail.segments[i];
    if (!segment || styleChanged) {
      const progress = (i + 1) / total;
      const style = {
        color: segmentColor(points, i, baseColor),
        weight: 0.7 + progress * 3.3,
        opacity: 0.05 + progress * 0.88,
      };
      if (!segment) {
        segment = L.polyline([from.slice(0, 2), to.slice(0, 2)], {
          ...style, lineCap: "round", lineJoin: "round",
        });
        trail.segments.push(segment);
        trail.group.addLayer(segment);
        continue;
      }
      segment.setStyle(style);
    }

    if (coordsChanged) {
      segment.setLatLngs([from.slice(0, 2), to.slice(0, 2)]);
    }
  }

  if (total > 3) {
    const [lat, lon] = points[0];
    const originLabel = historicalTrails[hex]?.source === "origin-anchor"
      ? "Origen estimado"
      : "Origen";
    if (!trail.origin) {
      trail.origin = L.circleMarker([lat, lon], {
        radius: 5,
        color: "#22e87a",
        fillColor: "#22e87a",
        fillOpacity: 0.5,
        weight: 2,
        opacity: 0.9,
      }).bindTooltip(`✈ ${originLabel}`, {
        permanent: false,
        direction: "top",
        className: "nheu-tooltip",
      });
      trail.group.addLayer(trail.origin);
    } else {
      const position = trail.origin.getLatLng();
      if (position.lat !== lat || position.lng !== lon) trail.origin.setLatLng([lat, lon]);
      if (trail.originLabel !== originLabel) trail.origin.setTooltipContent(`✈ ${originLabel}`);
    }
    trail.originLabel = originLabel;
    if (total > trail.points.length) trail.origin.bringToFront();
  } else if (trail.origin) {
    trail.group.removeLayer(trail.origin);
    trail.origin = null;
  }

  trail.points = points;
  trail.baseColor = baseColor;
}

// ══════════════════════════════════════════════════════════════
//  FOTO PLANESPOTTERS
// ══════════════════════════════════════════════════════════════
async function fetchPlanePhoto(hex, reg) {
  const photoWrap = document.getElementById("selPhoto");
  const photoImg = document.getElementById("selPhotoImg");
  const photoLoad = document.getElementById("selPhotoLoading");
  if (!photoWrap || !photoImg || !photoLoad) return;

  photoWrap.classList.add("active");
  photoWrap.classList.remove("has-photo");
  photoWrap.style.display = "block";
  photoLoad.style.display = "flex";
  photoImg.style.display = "none";

  try {
    let photoUrl = null;
    let photoLink = "https://www.planespotters.net";

    // 1. Intentar a través del proxy /api/photo (aporta el User-Agent exigido por Planespotters + caché)
    try {
      const proxyBase = BACKEND_API ? BACKEND_API : "";
      const r = await fetch(
        `${proxyBase}/api/photo?hex=${encodeURIComponent(hex || "")}&reg=${encodeURIComponent(reg || "")}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (r.ok) {
        const data = await r.json();
        if (data && data.photoUrl) {
          photoUrl = data.photoUrl;
          photoLink = data.photoLink || photoLink;
        }
      }
    } catch (e) {}

    // 2. Si no hay backend local, probar Planespotters directo (por matrícula y hex)
    if (!photoUrl && reg && reg !== "—" && reg !== "---") {
      try {
        const r = await fetch(`https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`, { signal: AbortSignal.timeout(3500) });
        if (r.ok) {
          const data = await r.json();
          if (data.photos && data.photos.length) {
            photoUrl = data.photos[0].thumbnail_large?.src || data.photos[0].thumbnail?.src;
            photoLink = data.photos[0].link || photoLink;
          }
        }
      } catch (e) {}
    }
    if (!photoUrl && hex) {
      try {
        const r = await fetch(`https://api.planespotters.net/pub/photos/hex/${hex}`, { signal: AbortSignal.timeout(3500) });
        if (r.ok) {
          const data = await r.json();
          if (data.photos && data.photos.length) {
            photoUrl = data.photos[0].thumbnail_large?.src || data.photos[0].thumbnail?.src;
            photoLink = data.photos[0].link || photoLink;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback a hexdb.io (cobertura global de fotos de aviones con CORS libre)
    if (!photoUrl && hex) {
      try {
        const r = await fetch(`https://hexdb.io/hex-image?hex=${hex}`, { signal: AbortSignal.timeout(3500) });
        if (r.ok) {
          const txt = (await r.text()).trim();
          if (txt.startsWith("http")) {
            photoUrl = txt;
            photoLink = `https://www.planespotters.net/search?q=${encodeURIComponent(reg || hex)}`;
          }
        }
      } catch (e) {}
    }

    if (!photoUrl) throw new Error("Sin fotos");

    photoImg.onload = () => {
      photoLoad.style.display = "none";
      photoImg.style.display = "block";
      photoWrap.classList.add("has-photo");
      updatePlaneCardPhoto(photoUrl, photoLink);
    };
    photoImg.onerror = () => {
      if (hex && !photoUrl.includes("hexdb.io")) {
        fetch(`https://hexdb.io/hex-image?hex=${hex}`)
          .then(r => r.ok ? r.text() : null)
          .then(txt => {
            if (txt && txt.trim().startsWith("http")) {
              photoImg.src = txt.trim();
              updatePlaneCardPhoto(txt.trim(), photoLink);
              return;
            }
            throw new Error();
          })
          .catch(() => {
            photoWrap.classList.remove("active", "has-photo");
            photoWrap.style.display = "none";
            photoLoad.style.display = "none";
            updatePlaneCardPhoto(null, null, null);
          });
      } else {
        photoWrap.classList.remove("active", "has-photo");
        photoWrap.style.display = "none";
        photoLoad.style.display = "none";
        updatePlaneCardPhoto(null, null, null);
      }
    };
    photoImg.dataset.link = photoLink;
    photoImg.title = "Ver foto del avión";
    photoImg.src = photoUrl;
  } catch (e) {
    photoWrap.classList.remove("active", "has-photo");
    photoWrap.style.display = "none";
    photoLoad.style.display = "none";
  }
}

// ══════════════════════════════════════════════════════════════
//  MODAL MÓVIL
// ══════════════════════════════════════════════════════════════
const isMobile = () => window.innerWidth <= 768;

function openMobileModal(html) {
  const modal = document.getElementById("mobileModal");
  const inner = document.getElementById("mobileModalInner");
  inner.innerHTML = `<div id="mobileModalHandle"></div>` + html;
  modal.classList.add("open");
  setMobilePanelExpanded(false);
  closeMobileMenus();
}

function closeMobileModal() {
  document.getElementById("mobileModal").classList.remove("open");
}

function openMobileModal_full() {
  if (!_mobileFullData) return;
  const { p, cls, routeHTML, gridHTML, trailInfo, hex } = _mobileFullData;
  openMobileModal(`
    <div class="sel-header">
      <div>
        <div class="sel-callsign" style="font-size:22px;font-weight:900;color:#60a5fa">${escapeHTML(p.call)}</div>
        <span class="sel-type-badge" style="background:${cls.hex}22;color:${cls.hex};border:1px solid ${cls.hex}44;font-size:10px;font-weight:700;padding:3px 8px;border-radius:20px;margin-top:3px;display:inline-block">${escapeHTML(cls.label)}</span>
        ${p.r || p.reg ? `
          <a href="https://www.flightradar24.com/data/aircraft/${(p.r || p.reg).trim().replace(/\s/g, "").toLowerCase()}" target="_blank" style="color: var(--accent); font-size: 10px; text-decoration: none; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px;">
            <i class="fas fa-arrow-up-right-from-square"></i> Ver en Flightradar24
          </a>
        ` : p.call && p.call !== "—" && p.call !== "---" ? `
          <a href="https://www.google.com/search?q=${p.call.trim().replace(/\s/g, "").toLowerCase()}+flight+status" target="_blank" style="color: var(--accent); font-size: 10px; text-decoration: none; margin-top: 4px; display: inline-flex; align-items: center; gap: 4px;">
            <i class="fas fa-arrow-up-right-from-square"></i> Buscar en Google
          </a>
        ` : ""}
      </div>
      <div style="display:flex;gap:6px;align-items:flex-start">
        <button class="sel-close" data-mobile-action="center" title="Centrar"><i class="fas fa-crosshairs"></i></button>
        <button class="sel-close" data-mobile-action="search" title="Buscar vuelos"><i class="fas fa-magnifying-glass"></i></button>
        <button class="sel-close" data-mobile-action="close"><i class="fas fa-xmark"></i></button>
      </div>
    </div>
    <div id="mobileSelPhoto" style="margin-top:9px;border-radius:9px;overflow:hidden;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);display:block">
      <div id="mobilePhotoLoading" style="height:60px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:10.5px;color:#334155">
        <i class="fas fa-spinner fa-spin" style="color:#334155"></i><span>Buscando foto...</span>
      </div>
      <img id="mobilePhotoImg" src="" alt="Foto" style="width:100%;height:160px;object-fit:cover;display:none;cursor:pointer"/>
    </div>
    <div id="mobileSelRoute">${routeHTML}</div>
    <details class="sel-details-dropdown" open style="margin-top: 10px;">
      <summary class="sel-details-summary">
        <span><i class="fas fa-sliders" style="margin-right: 6px; color: var(--accent)"></i> Datos técnicos</span>
        <i class="fas fa-chevron-down caret-icon"></i>
      </summary>
      <div class="sel-grid" id="mobileSelGrid">${gridHTML}</div>
    </details>
    ${trailInfo ? `<div style="margin-top:5px;text-align:right">${trailInfo}</div>` : ""}
    <div id="mobileChartContainer" style="margin-top:9px;height:100px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:9px;padding:5px">
      <canvas id="mobileChart"></canvas>
    </div>
  `);
  initMobileChart();
  fetchMobileFlightPhoto(hex, p.r || p.reg);
}

function updateMobileFlightCard(data) {
  const card = document.getElementById("mobileFlightCard");
  if (!card) return;

  const {
    p,
    cls,
    origCode,
    destCode,
    origCity,
    destCity,
    alt,
    spdKmh,
    type,
    reg,
    operador,
    modelo,
    depTimeStr,
    arrTimeStr,
  } = data;

  const callEl = document.getElementById("mobileFlightCall");
  const badgeEl = document.getElementById("mobileFlightBadge");
  const typeEl = document.getElementById("mobileFlightType");
  const operatorEl = document.getElementById("mobileFlightOperator");
  const origEl = document.getElementById("mobileFlightOrig");
  const destEl = document.getElementById("mobileFlightDest");
  const origCityEl = document.getElementById("mobileFlightOrigCity");
  const destCityEl = document.getElementById("mobileFlightDestCity");
  const altEl = document.getElementById("mobileFlightAlt");
  const spdEl = document.getElementById("mobileFlightSpd");
  const modelEl = document.getElementById("mobileFlightModel");
  const regEl = document.getElementById("mobileFlightReg");

  if (callEl) callEl.textContent = p.call || p.hex || "---";
  if (badgeEl) {
    badgeEl.textContent = cls.label || "Vuelo";
    badgeEl.style.background = `${cls.hex}22`;
    badgeEl.style.color = cls.hex;
  }
  if (typeEl) typeEl.textContent = type || "---";
  if (operatorEl) operatorEl.textContent = operador || "Operador no disponible";
  if (origEl) origEl.textContent = origCode || "---";
  if (destEl) destEl.textContent = destCode || "---";
  if (origCityEl) origCityEl.textContent = (origCity || "Origen").slice(0, 22);
  if (destCityEl) destCityEl.textContent = (destCity || "Destino").slice(0, 22);
  if (altEl) altEl.textContent = alt;
  if (spdEl) spdEl.textContent = spdKmh;
  if (modelEl) modelEl.textContent = modelo || "Sin modelo";
  if (regEl) regEl.textContent = reg || "---";

  const depTimeEl = document.getElementById("mobileFlightDepTime");
  const arrTimeEl = document.getElementById("mobileFlightArrTime");
  const timesEl = document.getElementById("mobileFlightRouteTimes");
  if (timesEl) {
    if ((depTimeStr && depTimeStr !== "—") || (arrTimeStr && arrTimeStr !== "—")) {
      timesEl.style.display = "flex";
      if (depTimeEl) depTimeEl.textContent = depTimeStr || "—";
      if (arrTimeEl) arrTimeEl.textContent = arrTimeStr || "—";
    } else {
      timesEl.style.display = "none";
    }
  }

  card.classList.add("visible");
}

document.getElementById("mobileModal").addEventListener("click", function (e) {
  if (e.target === this) {
    closeMobileModal();
  }
});
document.getElementById("mobileModalInner").addEventListener("click", (e) => {
  const actionBtn = e.target.closest("[data-mobile-action]");
  if (!actionBtn) return;
  if (actionBtn.dataset.mobileAction === "center") centerOnSelected();
  if (actionBtn.dataset.mobileAction === "search") openSearchFromCard();
  if (actionBtn.dataset.mobileAction === "view-favorites") openFavoritesFromCard();
  if (actionBtn.dataset.mobileAction === "close") closeMobileModal();
});

document.getElementById("mobileModalInner").addEventListener(
  "touchstart",
  (e) => {
    mobileModalTouchStartY = e.touches[0]?.clientY ?? null;
    mobileModalLastTouchY = mobileModalTouchStartY;
  },
  { passive: true },
);

document.getElementById("mobileModalInner").addEventListener(
  "touchmove",
  (e) => {
    mobileModalLastTouchY = e.touches[0]?.clientY ?? mobileModalLastTouchY;
  },
  { passive: true },
);

document.getElementById("mobileModalInner").addEventListener(
  "touchend",
  () => {
    if (mobileModalTouchStartY == null || mobileModalLastTouchY == null) return;
    if (mobileModalLastTouchY - mobileModalTouchStartY > 90) closeMobileModal();
    mobileModalTouchStartY = null;
    mobileModalLastTouchY = null;
  },
  { passive: true },
);

document.getElementById("mobileMiniCard").addEventListener(
  "touchstart",
  (e) => {
    mobileMiniTouchStartX = e.touches[0]?.clientX ?? null;
  },
  { passive: true },
);

document.getElementById("mobileMiniCard").addEventListener(
  "touchend",
  (e) => {
    if (mobileMiniTouchStartX == null) return;
    const endX = e.changedTouches[0]?.clientX ?? mobileMiniTouchStartX;
    const deltaX = endX - mobileMiniTouchStartX;
    mobileMiniTouchStartX = null;
    if (Math.abs(deltaX) < 45) return;
    e.preventDefault();
    selectNearbyPlaneByOffset(deltaX < 0 ? 1 : -1);
  },
  { passive: false },
);

document
  .getElementById("mobilePanelToggle")
  .addEventListener("click", toggleMobilePanel);
document.getElementById("ph").addEventListener(
  "touchstart",
  (e) => {
    if (!isMobile()) return;
    mobilePanelTouchStartY = e.touches[0]?.clientY ?? null;
  },
  { passive: true },
);

document.getElementById("ph").addEventListener(
  "touchend",
  (e) => {
    if (!isMobile() || mobilePanelTouchStartY == null) return;
    const endY = e.changedTouches[0]?.clientY ?? mobilePanelTouchStartY;
    const deltaY = endY - mobilePanelTouchStartY;
    mobilePanelTouchStartY = null;
    if (Math.abs(deltaY) < 24) return;
    setMobilePanelExpanded(deltaY < 0);
  },
  { passive: true },
);

// ══════════════════════════════════════════════════════════════
//  ETA
// ══════════════════════════════════════════════════════════════
function calcEtaHTML(p, destCode) {
  let coords = null;
  if (destCode) {
    if (window.AIRPORT_COORDS_ETA && window.AIRPORT_COORDS_ETA[destCode]) {
      coords = window.AIRPORT_COORDS_ETA[destCode];
    } else if (window.AIRPORT_COORDS && window.AIRPORT_COORDS[destCode]) {
      const c = window.AIRPORT_COORDS[destCode];
      coords = [c.lat, c.lon];
    }
  }

  const lat = p.ilat ?? p.lat;
  const lon = p.ilon ?? p.lon;

  if (destCode && coords && lat != null && lon != null && p.spdKmh && p.spdKmh >= 30) {
    const distKm = haversineKm(lat, lon, coords[0], coords[1]);
    const etaH = distKm / p.spdKmh;
    const etaMin = Math.round(etaH * 60);
    if (etaMin >= 0 && etaMin <= 900) {
      const h = Math.floor(etaMin / 60),
        m = etaMin % 60;
      const etaValHTML =
        h > 0
          ? `<span>${h}h</span><span>${m}min</span>`
          : `<span>${m}min</span>`;
      const distStr =
        distKm > 1000
          ? (distKm / 1000).toFixed(1) + "k km"
          : Math.round(distKm) + " km";
      return `<div class="eta-bar">
        <div>
          <div class="eta-lbl"><i class="far fa-clock"></i> TIEMPO ESTIMADO LLEGADA</div>
          <div class="eta-dist">${distStr} restantes</div>
        </div>
        <div class="eta-val">${etaValHTML}</div>
      </div>`;
    }
  }

  // Fallback garantizado: siempre presente en todos los aviones para mantener la estructura visual
  return `<div class="eta-bar" style="opacity: 0.85;">
    <div>
      <div class="eta-lbl"><i class="far fa-clock"></i> TIEMPO ESTIMADO LLEGADA</div>
      <div class="eta-dist">${destCode ? "Calculando tiempo..." : "Destino no disponible"}</div>
    </div>
    <div class="eta-val" style="font-size: 15px; font-weight: 600; color: var(--text-muted, #94a3b8); line-height: 1;">—</div>
  </div>`;
}

function buildPlaneGridHTML(p, cls, hex, destCode, avData = null) {
  const alt = p.alt != null ? p.alt.toLocaleString("es-ES") + " ft" : "—";
  const spdKmh = p.spdKmh != null ? Math.round(p.spdKmh) + " km/h" : "—";
  const squawkAlert = getSquawkAlert(p);
  const type = (p.t || p.type || "—").toUpperCase();
  const reg = escapeHTML(p.r || p.reg || "—");
  const vspd =
    p.baro_rate != null
      ? (p.baro_rate > 0 ? "↑ " : "↓ ") +
        Math.abs(Math.round(p.baro_rate)).toLocaleString("es-ES") +
        " ft/m"
      : "—";
  const trkStr = p.trk != null ? Math.round(p.trk) + "°" : "—";

  const etaHTML = calcEtaHTML(p, destCode);

  const histSource = historicalTrails[hex]?.source || "";
  const hasRealHistory = histSource === "opensky" || histSource === "backend" || histSource === "raspberry";
  let trailKm = 0;
  if (hasRealHistory) {
    trailKm = calcTrailDistance(hex);
  } else if (p.orig) {
    const origin = getAirportCoords(p.orig);
    const lat = p.ilat ?? p.lat;
    const lon = p.ilon ?? p.lon;
    if (origin && lat != null && lon != null) {
      trailKm = Math.round(haversineKm(origin.lat, origin.lon, lat, lon));
    } else {
      trailKm = calcTrailDistance(hex);
    }
  } else {
    trailKm = calcTrailDistance(hex);
  }

  const showHistoricalMetrics = hasRealHistoricalTrail(hex);
  const flightMinutes = showHistoricalMetrics ? calcFlightMinutes(hex) : 0;
  const distCell = `<div class="sel-cell"><div class="sel-lbl"><i class="fas fa-route" style="color:#38bdf8"></i> Recorrido</div><div class="sel-val" id="selDistVal">${trailKm > 0 ? trailKm.toLocaleString("es-ES") + " km" : "—"}</div></div>`;
  const flightTimeCell = showHistoricalMetrics
    ? `<div class="sel-cell"><div class="sel-lbl"><i class="fas fa-clock" style="color:var(--amber)"></i> Tiempo de vuelo</div><div class="sel-val" id="selFlightTimeVal">${formatFlightDuration(flightMinutes)}</div></div>`
    : "";
  const squawkCell = p.squawk
    ? `<div class="sel-cell ${squawkAlert ? "sel-cell-alert" : ""}"><div class="sel-lbl"><i class="fas fa-tower-broadcast" style="color:${squawkAlert ? squawkAlert.color : "#a855f7"}"></i> Squawk</div><div class="sel-val" style="font-family:'Space Grotesk',monospace;color:${squawkAlert ? squawkAlert.color : "var(--text)"}">${escapeHTML(p.squawk)}${squawkAlert ? ` · ${escapeHTML(squawkAlert.label)}` : ""}</div></div>`
    : "";

  const terminalCell = (avData?.depTerminal || avData?.arrTerminal)
    ? `<div class="sel-cell"><div class="sel-lbl"><i class="fas fa-building" style="color:#60a5fa"></i> Terminal</div><div class="sel-val">${escapeHTML([avData.depTerminal ? `T${avData.depTerminal}` : null, avData.arrTerminal ? `T${avData.arrTerminal}` : null].filter(Boolean).join(" → "))}</div></div>`
    : "";
  const gateCell = (avData?.depGate || avData?.arrGate)
    ? `<div class="sel-cell"><div class="sel-lbl"><i class="fas fa-door-open" style="color:#a855f7"></i> Puerta</div><div class="sel-val">${escapeHTML([avData.depGate ? `Sal: ${avData.depGate}` : null, avData.arrGate ? `Lleg: ${avData.arrGate}` : null].filter(Boolean).join(" · "))}</div></div>`
    : "";

  const operador = getPlaneOperatorLabel(p) || "—";
  const fabricant = p._acManufact || "—";
  const modelo = p._acModel || "—";
  const pais = escapeHTML(p._acCountry || "—");

  let logoHTML = "";
  let airlineIata = "";
  const cleanCall = (p.call || "").trim().replace(/\s/g, "");
  const icaoMatch = cleanCall.match(/^[A-Z]{3}/);
  const iataMatch = cleanCall.match(/^[A-Z]{2}\d/);

  if (icaoMatch && ICAO_TO_IATA[icaoMatch[0]]) {
    airlineIata = ICAO_TO_IATA[icaoMatch[0]];
  } else if (iataMatch) {
    airlineIata = cleanCall.substring(0, 2);
  }

  const cachedRoute = acHistoryCache[hex + "_" + (p.call || "")];
  if (cachedRoute?.route?.airline?.iata) {
    airlineIata = cachedRoute.route.airline.iata;
  }

  if (airlineIata) {
    logoHTML = `<img src="https://pics.avs.io/200/80/${airlineIata.toUpperCase()}.png" style="height:12px;width:auto;object-fit:contain;vertical-align:middle;margin-right:4px"/>`;
  }

  return `
    ${etaHTML}
    <div class="sel-cell"><div class="sel-lbl">Altitud</div><div class="sel-val">${escapeHTML(alt)}</div></div>
    <div class="sel-cell"><div class="sel-lbl">Velocidad</div><div class="sel-val">${escapeHTML(spdKmh)}</div></div>
    <div class="sel-cell"><div class="sel-lbl">Rumbo</div><div class="sel-val">${trkStr}</div></div>
    <div class="sel-cell"><div class="sel-lbl">V. vertical</div><div class="sel-val" style="color:${p.baro_rate > 50 ? "#22e87a" : p.baro_rate < -50 ? "#ff4b6e" : "#ffffff"}">${escapeHTML(vspd)}</div></div>
    ${distCell}
    ${flightTimeCell}
    ${squawkCell}
    ${terminalCell}
    ${gateCell}
    <div class="sel-cell"><div class="sel-lbl">Tipo</div><div class="sel-val" style="font-family:'Space Grotesk',monospace">${escapeHTML(type)}</div></div>
    <div class="sel-cell"><div class="sel-lbl">Matrícula</div><div class="sel-val" style="font-family:'Space Grotesk',monospace">${reg}</div></div>
    <div class="sel-cell"><div class="sel-lbl">Operador</div><div class="sel-val" style="display:flex;align-items:center;gap:4px">${logoHTML}${operador && operador !== "—" ? `<button class="operator-focus-btn" type="button" data-operator-focus="${escapeHTML(operador)}">${escapeHTML(operador)}</button>` : escapeHTML(operador)}</div></div>
    <div class="sel-cell"><div class="sel-lbl">Fabricante</div><div class="sel-val">${escapeHTML(fabricant)}</div></div>
    <div class="sel-cell"><div class="sel-lbl">Modelo</div><div class="sel-val">${escapeHTML(modelo)}</div></div>
    <div class="sel-cell"><div class="sel-lbl">País</div><div class="sel-val">${pais}</div></div>
  `;
}

// ══════════════════════════════════════════════════════════════
//  AVIATIONSTACK API (HORARIOS OFICIALES DE DESPEGUE Y LLEGADA)
// ══════════════════════════════════════════════════════════════
const aviationStackCache = new Map();
function isAviationStackCacheFresh(entry) {
  const ttl = (entry.data ? 30 : 5) * 60 * 1000;
  return Date.now() - entry.ts < ttl;
}
let aviationStackQuotaExceeded = false;

function formatAvStackTime(isoStr) {
  if (!isoStr) return null;
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return null;
  }
}

async function fetchAviationStackSchedule(callsign, hex, isCommercial = true) {
  if (!isCommercial) return null;
  if (aviationStackQuotaExceeded) return null;
  if (!callsign) return null;

  const cleanCall = callsign.trim().toUpperCase().replace(/\s+/g, "");
  if (cleanCall.length < 3) return null;

  // Filtrar si el indicativo es una matrícula (ej: EC-XXX, N1234, etc.) que no sea de aerolínea comercial
  if (/^[A-Z]{1,2}-[A-Z0-9]{3,5}$/.test(cleanCall)) return null;

  // 1. Caché en memoria
  const cached = aviationStackCache.get(cleanCall);
  if (cached && isAviationStackCacheFresh(cached)) return cached.data;

  // 2. Caché local de horarios recientes
  try {
    const lsKey = `avstack_${cleanCall}`;
    const raw = localStorage.getItem(lsKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isAviationStackCacheFresh(parsed)) {
        aviationStackCache.set(cleanCall, parsed);
        return parsed.data;
      }
    }
  } catch {}

  // 3. Petición a Aviationstack con el parámetro más adecuado (flight_iata o flight_icao)
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 6500);
    const url = `${providerApiBase}/api/aviationstack?flight=${encodeURIComponent(cleanCall)}`;
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid);

    if (res.status === 429) {
      console.warn("[Aviationstack] Límite de cuota alcanzado (429). Volviendo al método estimado.");
      aviationStackQuotaExceeded = true;
      return null;
    }

    if (!res.ok) return null;
    const json = await res.json();

    if (json.error) {
      if (
        json.error.code === "usage_limit_reached" ||
        json.error.code === "rate_limit_reached" ||
        json.error.code === 104
      ) {
        console.warn("[Aviationstack] Cuota mensual agotada. Volviendo al método estimado.", json.error);
        aviationStackQuotaExceeded = true;
      }
      return null;
    }

    const item = Array.isArray(json?.data) && json.data.length > 0 ? json.data[0] : null;
    if (!item) {
      // Guardar null en caché de sesión para no repetir llamadas inútiles al mismo vuelo
      aviationStackCache.set(cleanCall, { ts: Date.now(), data: null });
      return null;
    }

    const flightData = {
      depActual: item.departure?.actual || item.departure?.actual_runway || null,
      depEstimated: item.departure?.estimated || item.departure?.estimated_runway || null,
      depScheduled: item.departure?.scheduled || null,
      depAirport: item.departure?.airport || "",
      depIata: item.departure?.iata || "",
      depIcao: item.departure?.icao || "",
      depTerminal: item.departure?.terminal || null,
      depGate: item.departure?.gate || null,
      arrActual: item.arrival?.actual || item.arrival?.actual_runway || null,
      arrEstimated: item.arrival?.estimated || item.arrival?.estimated_runway || null,
      arrScheduled: item.arrival?.scheduled || null,
      arrAirport: item.arrival?.airport || "",
      arrIata: item.arrival?.iata || "",
      arrIcao: item.arrival?.icao || "",
      arrTerminal: item.arrival?.terminal || null,
      arrGate: item.arrival?.gate || null,
      airlineName: item.airline?.name || "",
      status: item.flight_status || "",
    };

    aviationStackCache.set(cleanCall, { ts: Date.now(), data: flightData });
    try {
      localStorage.setItem(`avstack_${cleanCall}`, JSON.stringify({ ts: Date.now(), data: flightData }));
    } catch {}

    return flightData;
  } catch (e) {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════
//  PANEL AVIÓN SELECCIONADO
// ══════════════════════════════════════════════════════════════
async function renderSelected(
  hex,
  forcePhotoFetch = false,
  fetchAcDetails = true,
) {
  const p = planeStore[hex];
  if (!p) return;
  const cls = classifyAircraft(p);

  const panel = document.getElementById("selPanel");
  if (panel) {
    panel.classList.add("active");
    panel.scrollTop = 0;
  }

  // Asegurar que el desplegable de datos técnicos SIEMPRE esté abierto en cada avión
  const selDropdown = document.getElementById("selDetailsDropdown");
  if (selDropdown) selDropdown.open = true;

  const selCall = document.getElementById("selCall");
  if (selCall) selCall.textContent = p.call;

  const badge = document.getElementById("selBadge");
  if (badge) {
    badge.textContent = cls.label;
    badge.style.background = cls.hex + "22";
    badge.style.color = cls.hex;
    badge.style.border = `1px solid ${cls.hex}44`;
  }

  const cleanCall = (p.call || "").trim().replace(/\s/g, "").toUpperCase();
  const cleanReg = (p.r || p.reg || "").trim().replace(/\s/g, "").toUpperCase();

  const fr24Link = document.getElementById("selFr24Link");
  if (fr24Link) {
    if (cleanCall && cleanCall !== "—" && cleanCall !== "---") {
      fr24Link.href = `https://www.flightradar24.com/${cleanCall.toLowerCase()}`;
      fr24Link.style.display = "inline-flex";
    } else if (cleanReg && cleanReg !== "—" && cleanReg !== "---") {
      fr24Link.href = `https://www.flightradar24.com/data/aircraft/${cleanReg.toLowerCase()}`;
      fr24Link.style.display = "inline-flex";
    } else if (hex) {
      fr24Link.href = `https://www.flightradar24.com/${hex.toLowerCase()}`;
      fr24Link.style.display = "inline-flex";
    } else {
      fr24Link.style.display = "none";
    }
  }

  // Carga inmediata de la foto del avión (sin demoras)
  if (forcePhotoFetch || lastPhotoHex !== hex) {
    lastPhotoHex = hex;
    fetchPlanePhoto(hex, cleanReg);
  }

  const routeEl = document.getElementById("selRoute");
  if (routeEl)
    routeEl.innerHTML = `<div class="sel-rno-route" style="color:#475569">Buscando ruta...</div>`;

  let origCode = p.orig || "";
  let destCode = p.dest || "";
  let origCity = planeStore[hex]?.origCity || cityName(origCode) || origCode;
  let destCity = planeStore[hex]?.destCity || cityName(destCode) || destCode;

  // Renderizar la cuadrícula técnica de inmediato (síncrono, para que nunca falte en ningún avión)
  const selGrid = document.getElementById("selGrid");
  if (selGrid) selGrid.innerHTML = buildPlaneGridHTML(p, cls, hex, destCode);

  if (isMobile()) {
    document.getElementById("mobileMiniCall").textContent = p.call;
    const routeContainer = document.getElementById("mobileMiniRoute");
    if (origCode || destCode) {
      routeContainer.innerHTML = `<span class="mmr-code">${escapeHTML(origCode || "?")}</span>
        <i class="fas fa-arrow-right mmr-arrow"></i>
        <span class="mmr-code">${escapeHTML(destCode || "?")}</span>`;
    } else {
      routeContainer.innerHTML = `<span class="mmr-none">Buscando ruta...</span>`;
    }
    document.getElementById("mobileMiniCard").classList.add("visible");
    document.getElementById("mobileFlightCard")?.classList.add("visible");
  }

  // 1. PRIORIDAD 1: Consultar Aviationstack ÚNICAMENTE para aviones comerciales (ahorro estricto de peticiones)
  const isCommercial = cls && cls.color === "commercial";
  let avData = null;
  if (isCommercial && !aviationStackQuotaExceeded && p.call && p.call !== hex) {
    try {
      avData = await fetchAviationStackSchedule(p.call, hex, isCommercial);
    } catch (e) {
      avData = null;
    }
  }

  if (selectedHex !== hex) return;

  if (avData && (avData.depIata || avData.depIcao || avData.arrIata || avData.arrIcao)) {
    // La aerolínea tiene el vuelo activo hoy: usamos la ruta real del día
    if (avData.depIata || avData.depIcao) origCode = avData.depIata || avData.depIcao;
    if (avData.arrIata || avData.arrIcao) destCode = avData.arrIata || avData.arrIcao;
    if (avData.depAirport) origCity = avData.depAirport;
    if (avData.arrAirport) destCity = avData.arrAirport;

    if (planeStore[hex]) {
      planeStore[hex].orig = origCode;
      planeStore[hex].dest = destCode;
      planeStore[hex].origCity = origCity;
      planeStore[hex].destCity = destCity;
    }
  } else {
    // 2. RESPALDO SECUNDARIO (adsbdb.com):
    // Si Aviationstack no tiene el vuelo de hoy o la cuota se agotó, usamos la base histórica de adsbdb
    if ((!origCode || !destCode) && p.call && p.call !== hex) {
      try {
        const cs = p.call.trim().replace(/\s+/g, "");
        const route = await window.NheuDB?.cached(
          `route:${cs}`,
          30 * 60 * 1000,
          async () => {
            const r = await fetch(`https://api.adsbdb.com/v0/callsign/${cs}`);
            if (!r.ok) return null;
            const d = await r.json();
            return d?.response?.flightroute || null;
          },
        );
        if (route) {
          origCode = origCode || route.origin?.iata_code || route.origin?.icao_code || "";
          destCode = destCode || route.destination?.iata_code || route.destination?.icao_code || "";
          const origMun = route.origin?.municipality || cityName(origCode) || "";
          const destMun = route.destination?.municipality || cityName(destCode) || "";
          origCity = origMun + (route.origin?.country_name ? ` (${route.origin.country_name})` : "");
          destCity = destMun + (route.destination?.country_name ? ` (${route.destination.country_name})` : "");
          if (planeStore[hex]) {
            planeStore[hex].orig = origCode;
            planeStore[hex].dest = destCode;
            planeStore[hex].origCity = origCity;
            planeStore[hex].destCity = destCity;
          }
        }
      } catch (e) {}
    }
  }

  if (selectedHex !== hex) return;

  const findOrigin = () => getAirportCoords(origCode) || getAirportCoords(avData?.depIcao);
  const findDestination = () => getAirportCoords(destCode) || getAirportCoords(avData?.arrIcao);
  if (isCommercial && !airportsLoaded &&
      ((origCode && !findOrigin()) || (destCode && !findDestination()))) {
    fetchGlobalAirports().then(() => {
      if (airportsLoaded && selectedHex === hex && (findOrigin() || findDestination())) {
        renderSelected(hex, false);
      }
    });
  }

  const trailPoints = getCombinedTrailPoints(hex);
  const trailLen = trailPoints.length;
  const histSource = historicalTrails[hex]?.source || "";
  const trailLabel =
    histSource === "opensky"
      ? "historial de vuelo"
      : histSource === "origin-anchor"
        ? "desde salida"
        : "en vivo";
  const trailInfo =
    trailLen > 2
      ? `<span style="font-size:9px;color:#334155;margin-left:6px"><i class="fas fa-route" style="color:${cls.hex};opacity:.7"></i> ${trailLen} puntos · ${trailLabel}</span>`
      : "";

  const safeOrigCode = escapeHTML(origCode || "?");
  const safeDestCode = escapeHTML(destCode || "?");
  const safeOrigCity = escapeHTML(origCity || "");
  const safeDestCity = escapeHTML(destCity || "");

  const hasRealHistory = histSource === "opensky" || histSource === "backend" || histSource === "raspberry";

  // Puntos del recorrido en radar
  const pts = getCombinedTrailPoints(hex, false).filter((pt) =>
    Number.isFinite(pt?.[3]),
  );

  // 1. MÉTODO ANTIGUO / RADAR DIRECTO:
  // Detectar si el historial ADS-B captó el despegue real a ras de suelo (<3500 ft)
  const hasRealTakeoff = hasRealHistory && pts.length > 0 && pts[0][2] != null && pts[0][2] < 3500;

  let depTimeStr = "—";
  let depTimeLbl = "Despegue";
  let arrTimeStr = "—";
  let arrTimeLbl = "Llegada (Est.)";

  if (hasRealTakeoff) {
    // Extraído directamente del historial real de radar
    const depDate = new Date(pts[0][3]);
    depTimeStr = depDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
    depTimeLbl = "Despegó (Real)";
  } else if (avData) {
    const actualDep = formatAvStackTime(avData.depActual);
    const estDep = formatAvStackTime(avData.depEstimated) || formatAvStackTime(avData.depScheduled);
    if (actualDep) {
      depTimeStr = actualDep;
      depTimeLbl = "Despegó (Real)";
    } else if (estDep) {
      depTimeStr = estDep;
      depTimeLbl = "Despegue (Prog.)";
    }
  }

  if (avData) {
    const actualArr = formatAvStackTime(avData.arrActual);
    const estArr = formatAvStackTime(avData.arrEstimated) || formatAvStackTime(avData.arrScheduled);
    if (actualArr) {
      arrTimeStr = actualArr;
      arrTimeLbl = "Aterrizó (Real)";
    } else if (estArr) {
      arrTimeStr = estArr;
      arrTimeLbl = "Llegada (Prog.)";
    }
  }

  // 2. Calcular distancia recorrida
  let trailKm = 0;
  let originFound = false;
  if (origCode) {
    const origin = findOrigin();
    const lat = p.ilat ?? p.lat;
    const lon = p.ilon ?? p.lon;
    if (origin && lat != null && lon != null) {
      trailKm = Math.round(haversineKm(origin.lat, origin.lon, lat, lon));
      originFound = true;
    }
  }
  if (!originFound) {
    trailKm = calcTrailDistance(hex);
  }

  // 3. FALLBACK AL MÉTODO ANTERIOR / ESTIMADO:
  // Si no se obtuvo despegue real o programado (o la cuota de Aviationstack se agotó),
  // volvemos a la fórmula de estimación por velocidad y distancia recorrida
  if (depTimeStr === "—") {
    if (originFound && trailKm > 20) {
      const speed = p.spdKmh && p.spdKmh >= 100 ? p.spdKmh : 800;
      const elapsedHours = trailKm / speed;
      const depDate = new Date(Date.now() - elapsedHours * 60 * 60 * 1000);
      depTimeStr = depDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      depTimeLbl = "Despegue (Est.)";
    }
  }

  // Si no se obtuvo llegada de Aviationstack, calcular ETA matemática con distancia a destino
  let etaMin = 0;
  let distKm = 0;
  if (destCode) {
    const destCoords = findDestination();
    const lat = p.ilat ?? p.lat;
    const lon = p.ilon ?? p.lon;
    if (destCoords && lat != null && lon != null) {
      distKm = haversineKm(lat, lon, destCoords.lat, destCoords.lon);
      if (arrTimeStr === "—" && p.spdKmh && p.spdKmh >= 30) {
        const etaH = distKm / p.spdKmh;
        etaMin = Math.round(etaH * 60);
        if (etaMin >= 0 && etaMin <= 900) {
          const arrDate = new Date(Date.now() + etaMin * 60 * 1000);
          arrTimeStr = arrDate.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
          arrTimeLbl = "Llegada (Est.)";
        }
      }
    }
  }

  const totalDist = (trailKm || 0) + (distKm || 0);
  const pct = totalDist > 0 && (trailKm > 0 || distKm > 0)
    ? Math.min(98, Math.max(2, Math.round(((trailKm || 0) / totalDist) * 100)))
    : 0;

  const routeHTML =
    origCode || destCode
      ? `
    <div class="fr24-route-card">
      <div class="fr24-route-row">
        <div class="fr24-route-leg">
          <div class="fr24-code">${safeOrigCode}</div>
          <div class="fr24-city">${safeOrigCity || "Origen"}</div>
        </div>
        <div class="fr24-center-circle">
          <i class="fas fa-plane"></i>
        </div>
        <div class="fr24-route-leg">
          <div class="fr24-code">${safeDestCode}</div>
          <div class="fr24-city">${safeDestCity || "Destino"}</div>
        </div>
      </div>
      
      <div class="fr24-times-row">
        <div class="fr24-time-cell">
          <span class="fr24-time-lbl">${depTimeLbl}</span>
          <strong class="fr24-time-val" id="fr24DepTimeVal">${depTimeStr}</strong>
        </div>
        <div class="fr24-time-cell" style="text-align: right;">
          <span class="fr24-time-lbl" id="fr24ArrTimeLbl">${arrTimeLbl}</span>
          <strong class="fr24-time-val" id="fr24ArrTimeVal">${arrTimeStr}</strong>
        </div>
      </div>

      <div class="fr24-progress-container">
        <div class="fr24-progress-track">
          <div class="fr24-progress-fill" id="fr24ProgressFill" style="width: ${pct}%"></div>
          <i class="fas fa-plane fr24-progress-icon" id="fr24ProgressIcon" style="left: calc(${pct}% - 6px)"></i>
        </div>
      </div>

      <div class="fr24-dist-row">
        <div id="fr24TrailDistVal">${originFound && trailKm > 0 ? `${Math.round(trailKm)} km recorridos` : "—"}</div>
        <div id="fr24RemDistVal">${distKm > 0 ? `${Math.round(distKm)} km restantes` : "—"}</div>
      </div>
    </div>`
      : `
    <div class="fr24-route-card" style="opacity: 0.85;">
      <div style="text-align: center; font-size: 11px; color: var(--text-muted); font-style: italic; margin-bottom: 8px;">Ruta no disponible</div>
      <div class="fr24-times-row" style="margin-top: 0; border: none; padding-top: 0;">
        <div class="fr24-time-cell">
          <span class="fr24-time-lbl">Detectado en radar</span>
          <strong class="fr24-time-val">${(pts.length > 0 && pts[0][3]) ? new Date(pts[0][3]).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "—"}</strong>
        </div>
      </div>
    </div>`;

  const gridHTML = buildPlaneGridHTML(p, cls, hex, destCode, avData);
  if (routeEl) routeEl.innerHTML = routeHTML;
  if (selGrid) selGrid.innerHTML = gridHTML;

  const oldTrailDiv = document.getElementById("trailInfoDiv");
  if (oldTrailDiv) oldTrailDiv.remove();
  if (trailInfo && selGrid) {
    const trailDiv = document.createElement("div");
    trailDiv.id = "trailInfoDiv";
    trailDiv.style.cssText = "margin-top:5px;text-align:right";
    trailDiv.innerHTML = trailInfo;
    selGrid.after(trailDiv);
  }
  const chartContainer = document.getElementById("chartContainer");
  if (chartContainer) chartContainer.style.display = "none";
  if (forcePhotoFetch || lastPhotoHex !== hex) {
    lastPhotoHex = hex;
    fetchPlanePhoto(hex, cleanReg);
  }

  if (isMobile()) {
    _mobileFullData = { p, cls, routeHTML, gridHTML, trailInfo, hex };
    updateMobileFlightCard({
      p,
      cls,
      origCode,
      destCode,
      origCity,
      destCity,
      alt: p.alt != null ? p.alt.toLocaleString("es-ES") + " ft" : "—",
      spdKmh: p.spdKmh != null ? Math.round(p.spdKmh) + " km/h" : "—",
      type: (p.t || p.type || "—").toUpperCase(),
      reg: cleanReg,
      operador: getPlaneOperatorLabel(p),
      modelo: p._acModel,
      depTimeStr: depTimeStr !== "—" ? `${depTimeStr} (${depTimeLbl})` : "—",
      arrTimeStr: arrTimeStr !== "—" ? `${arrTimeStr} (${arrTimeLbl})` : "—",
    });
  }

  if (fetchAcDetails) fetchAircraftHistory(hex, p.call);

  if (window._destMarker) {
    map.removeLayer(window._destMarker);
    window._destMarker = null;
  }
  if (p.dest && window.AIRPORT_COORDS && window.AIRPORT_COORDS[p.dest]) {
    const dc = window.AIRPORT_COORDS[p.dest];
    window._destMarker = L.marker([dc.lat, dc.lon], {
      icon: L.divIcon({
        className: "",
        html: `<div style="background:rgba(9,9,18,0.92);border:1.5px solid var(--amber,#f5a623);border-radius:8px;padding:3px 7px;font-family:'Inter',sans-serif;font-size:10px;font-weight:600;color:#f5a623;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,0.5)">✈ ${p.dest}</div>`,
        iconAnchor: [20, 10],
      }),
    }).addTo(map);
  }

  drawTrail(hex, cls.hex);

  if (historicalTrails[hex]?.status !== "ready") {
    ensureHistoricalTrail(hex, origCode)
      .then(() => {
        if (selectedHex === hex && planeStore[hex]) {
          updateDistanceTravelled(hex);
          drawTrail(hex, cls.hex);
          renderSelected(hex, false);
        }
      })
      .catch(() => {});
  }
}

// ══════════════════════════════════════════════════════════════
//  CHART TELEMETRÍA
// ══════════════════════════════════════════════════════════════
function initChart() {
  const ctx = document.getElementById("telemetryChart").getContext("2d");
  Chart.defaults.color = "#64748b";
  Chart.defaults.font.size = 9;
  Chart.defaults.font.family = "system-ui";

  telemetryChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Altitud (ft)",
          borderColor: "#4ade80",
          backgroundColor: "rgba(74, 222, 128, 0.1)",
          data: [],
          yAxisID: "y",
          tension: 0.3,
          fill: true,
          pointRadius: 0,
          borderWidth: 1.5,
        },
        {
          label: "Velocidad (km/h)",
          borderColor: "#60a5fa",
          data: [],
          yAxisID: "y1",
          tension: 0.3,
          fill: false,
          pointRadius: 0,
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { display: false },
        y: {
          type: "linear",
          display: true,
          position: "left",
          grid: { color: "rgba(255,255,255,0.05)" },
        },
        y1: {
          type: "linear",
          display: true,
          position: "right",
          grid: { drawOnChartArea: false },
        },
      },
    },
  });
}

function updateChart(p) {
  if (!telemetryChart || !p) return;
  const timeLabel = new Date().toLocaleTimeString();

  if (
    telemetryChartSeedSource === "history" &&
    telemetryChart.data.labels.length >= 20
  ) {
    telemetryChart.data.labels.shift();
    telemetryChart.data.datasets[0].data.shift();
    telemetryChart.data.datasets[1].data.shift();
  }

  telemetryChart.data.labels.push(timeLabel);
  telemetryChart.data.datasets[0].data.push(p.alt || 0);
  telemetryChart.data.datasets[1].data.push(Math.round(p.spdKmh || 0));

  if (telemetryChart.data.labels.length > 20) {
    telemetryChart.data.labels.shift();
    telemetryChart.data.datasets[0].data.shift();
    telemetryChart.data.datasets[1].data.shift();
  }
  telemetryChart.update("none");
}

function clearChart() {
  if (!telemetryChart) return;
  telemetryChart.data.labels = [];
  telemetryChart.data.datasets[0].data = [];
  telemetryChart.data.datasets[1].data = [];
  telemetryChartSeedSource = "";
  telemetryChart.update();
}

// ══════════════════════════════════════════════════════════════
//  CANVAS LAYER (Motor 60 FPS)
// ══════════════════════════════════════════════════════════════
const CanvasPlaneLayer = L.Layer.extend({
  onAdd(map) {
    this._map = map;
    this._canvas = L.DomUtil.create("canvas", "leaflet-zoom-animated");
    const pane = map.getPane("overlayPane");
    pane.appendChild(this._canvas);
    this._ctx = this._canvas.getContext("2d");
    this._hitRadius = 24;
    this._drawQueued = false;
    this._rafId = null;

    map.on("move", this._requestDraw, this);
    map.on("resize", this._requestDraw, this);
    map.on("zoomanim", this._onZoomAnim, this);
    map.on("click", this._onClick, this);
    if (!L.Browser.touch) {
      map.on("mousemove", this._onHover, this);
      map.on("mouseout", this._onMouseOut, this);
    }

    this._resize();
    return this;
  },
  onRemove(map) {
    this._canvas.remove();
    map.off("move", this._requestDraw, this);
    map.off("resize", this._requestDraw, this);
    map.off("zoomanim", this._onZoomAnim, this);
    map.off("click", this._onClick, this);
    if (!L.Browser.touch) {
      map.off("mousemove", this._onHover, this);
      map.off("mouseout", this._onMouseOut, this);
    }
    if (this._rafId) cancelAnimationFrame(this._rafId);
  },
  _resize() {
    this._requestDraw();
  },
  _requestDraw() {
    if (this._drawQueued) return;
    this._drawQueued = true;
    this._rafId = requestAnimationFrame(() => {
      this._drawQueued = false;
      this._draw();
    });
  },
  _onZoomAnim(e) {
    const scale = this._map.getZoomScale(e.zoom, this._map.getZoom());
    const pos = this._map._latLngBoundsToNewLayerBounds(
      this._map.getBounds(),
      e.zoom,
      e.center,
    ).min;
    L.DomUtil.setTransform(this._canvas, pos, scale);
    this._zoomTransformed = true;
  },
  _draw() {
    if (!this._map || this._map._animatingZoom) return;

    const topLeft = this._map.containerPointToLayerPoint([0, 0]);
    const position = L.DomUtil.getPosition(this._canvas);
    if (!position || !position.equals(topLeft) || this._zoomTransformed) {
      L.DomUtil.setPosition(this._canvas, topLeft);
      this._canvas.style.transform = `translate3d(${topLeft.x}px, ${topLeft.y}px, 0px)`;
      this._zoomTransformed = false;
    }

    const size = this._map.getSize();
    if (this._canvas.width !== size.x) this._canvas.width = size.x;
    if (this._canvas.height !== size.y) this._canvas.height = size.y;

    const ctx = this._ctx;
    ctx.clearRect(0, 0, size.x, size.y);

    if (window.isPlanesEnabled === false) {
      return;
    }

    const bounds = this._map.getBounds();
    const latPad = 0.5;
    const lngPad = 0.5;
    const limitN = bounds.getNorth() + latPad;
    const limitS = bounds.getSouth() - latPad;
    const limitE = bounds.getEast() + lngPad;
    const limitW = bounds.getWest() - lngPad;

    const frameTime = performance.now();
    const planes = Object.values(planeStore);
    for (const p of planes) {
      if (
        p.ilat > limitN ||
        p.ilat < limitS ||
        p.ilon > limitE ||
        p.ilon < limitW
      )
        continue;

      if (!planeMatchesFilter(p)) continue;
      const pt = this._map.latLngToContainerPoint([p.ilat, p.ilon]);
      const cls = classifyAircraft(p);
      const squawkAlert = getSquawkAlert(p);
      const operatorDimmed =
        activeOperatorFilter && !planeMatchesOperatorFocus(p) && !squawkAlert;
      const pulse = squawkAlert
        ? 0.55 + 0.45 * Math.abs(Math.sin(frameTime / 180))
        : 0;
      const isSel = p.hex === selectedHex;
      const size2 = getPlaneRenderSize(p, cls, isSel) + (squawkAlert ? 4 : 0);
      const drawColor =
        squawkAlert && Math.floor(frameTime / 260) % 2 === 0
          ? squawkAlert.color
          : cls.hex;
      const img = makePlaneImage(
        cls.shape,
        drawColor,
        size2,
        isSel || Boolean(squawkAlert),
      );
      const half = size2 / 2;

      if (squawkAlert) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, size2 * (0.76 + pulse * 0.22), 0, Math.PI * 2);
        ctx.strokeStyle = squawkAlert.color;
        ctx.lineWidth = 2 + pulse * 2;
        ctx.globalAlpha = 0.35 + pulse * 0.35;
        ctx.shadowColor = squawkAlert.color;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      if (operatorDimmed) ctx.globalAlpha = 0.18;
      ctx.translate(pt.x, pt.y);
      ctx.rotate(((p.trk || 0) * Math.PI) / 180);
      ctx.drawImage(img, -half, -half, size2, size2);

      if (cls.shape === "heli") {
        const rotorImg = makePlaneImage(
          "heli_rotor",
          cls.hex,
          size2,
          isSel,
          true,
        );
        const rotorOffset = size2 * (isSel ? 0.075 : 0.093);
        ctx.translate(0, -rotorOffset);
        ctx.rotate((frameTime / 150) % (Math.PI * 2));
        ctx.drawImage(rotorImg, -half, -half, size2, size2);
      }
      ctx.restore();

      if (squawkAlert) {
        ctx.save();
        ctx.font = 'bold 9px "Space Grotesk", monospace';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const label = normalizeSquawk(p.squawk);
        const bw = 36;
        const bh = 14;
        const bx = pt.x - bw / 2;
        const by = pt.y - size2 / 2 - 18;
        ctx.beginPath();
        ctx.fillStyle = squawkAlert.color;
        ctx.shadowColor = squawkAlert.color;
        ctx.shadowBlur = 12;
        if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 5);
        else ctx.rect(bx, by, bw, bh);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.fillText(label, pt.x, by + bh / 2 + 0.5);
        ctx.restore();
      }

      if (cls.badge) {
        const bw = cls.badge === "DGT" ? 26 : cls.badge === "SEM" ? 28 : 26;
        const bh = 12;
        const bx = pt.x - bw / 2;
        const by = pt.y + (isSel ? 20 : 14);
        const bgColor =
          cls.badge === "DGT"
            ? "#f97316"
            : cls.badge === "SEM"
              ? "#ef4444"
              : "#ec4899";
        ctx.save();
        if (operatorDimmed) ctx.globalAlpha = 0.1;
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(bx, by, bw, bh, 4);
        } else {
          const r = 4;
          ctx.moveTo(bx + r, by);
          ctx.lineTo(bx + bw - r, by);
          ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
          ctx.lineTo(bx + bw, by + bh - r);
          ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
          ctx.lineTo(bx + r, by + bh);
          ctx.arcTo(bx, by + bh, bx, by, r);
          ctx.lineTo(bx, by + r);
          ctx.arcTo(bx, by, bx + bw, by, r);
        }
        ctx.fillStyle = bgColor;
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 8px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(cls.badge, pt.x, by + bh / 2);
        ctx.restore();
      }
    }
  },
  _findPlane(latlng) {
    if (window.isPlanesEnabled === false) return null;
    const point = this._map.latLngToContainerPoint(latlng);
    let best = null;
    let bestDistSquared = this._hitRadius ** 2;
    const planes = Object.values(planeStore);
    for (const p of planes) {
      if (!planeMatchesFilter(p)) continue;
      if (activeOperatorFilter && !planeMatchesOperatorFocus(p) && !getSquawkAlert(p)) continue;
      const pt = this._map.latLngToContainerPoint([p.ilat, p.ilon]);
      const distanceSquared = (pt.x - point.x) ** 2 + (pt.y - point.y) ** 2;
      if (distanceSquared < bestDistSquared) {
        best = p;
        bestDistSquared = distanceSquared;
      }
    }
    return best;
  },
  _onClick(e) {
    const p = this._findPlane(e.latlng);
    if (p) {
      selectPlane(p.hex);
    } else {
      hideTooltip();
    }
  },
  _onHover(e) {
    const p = this._findPlane(e.latlng);
    if (p) {
      const pt = this._map.latLngToContainerPoint([p.ilat, p.ilon]);
      showTooltip(p, pt.x, pt.y);
      this._canvas.style.cursor = "pointer";
    } else {
      hideTooltip();
      this._canvas.style.cursor = "";
    }
  },
  _onMouseOut() {
    hideTooltip();
    this._canvas.style.cursor = "";
  },
  redraw() {
    this._requestDraw();
  },
});

// ══════════════════════════════════════════════════════════════
//  TOOLTIP CANVAS
// ══════════════════════════════════════════════════════════════
function showTooltip(p, cx, cy) {
  const call = (p.call && p.call !== p.hex) ? p.call.trim() : "";
  const reg = (p.r || p.reg) ? (p.r || p.reg).trim() : "";
  let label = call || reg || p.hex || "—";
  if (call && reg && call !== reg) {
    label = `${call} (${reg})`;
  }
  const el = document.getElementById("canvasTooltip");
  if (!el) return;

  el.textContent = label;
  el.style.left = cx + "px";
  el.style.top = cy + "px";
  el.style.display = "block";
}

function hideTooltip() {
  const el = document.getElementById("canvasTooltip");
  if (el) el.style.display = "none";
}

// ══════════════════════════════════════════════════════════════
//  STATUS
// ══════════════════════════════════════════════════════════════
function setStatus(msg, state) {
  document.getElementById("st").textContent = msg;
  document.getElementById("sd").className = state;
  const mobileStatusLine = document.getElementById("mobileStatusLine");
  if (mobileStatusLine && state !== "ok") mobileStatusLine.textContent = msg;
}

function updateNetworkState(showStatus = false) {
  const offline = navigator.onLine === false;
  document.body.classList.toggle("is-offline", offline);

  if (offline) {
    setStatus("Sin conexion: usando datos ya cargados", "error");
    const liveBarText = document.getElementById("liveBarText");
    if (liveBarText) liveBarText.textContent = "Sin conexion";
    updateMobileChrome();
    return;
  }

  if (showStatus) {
    setStatus("Conexion recuperada", "ok");
    scheduleFetchPlanes(120);
    fetchGlobalCount();
  }
  updateMobileChrome();
}

// ══════════════════════════════════════════════════════════════
//  CHART MÓVIL
// ══════════════════════════════════════════════════════════════
function initMobileChart() {
  if (typeof Chart !== "function") return;
  const canvas = document.getElementById("mobileChart");
  if (!canvas) return;
  if (mobileChart) {
    mobileChart.destroy();
    mobileChart = null;
  }
  const ctx2 = canvas.getContext("2d");
  mobileChart = new Chart(ctx2, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Altitud (ft)",
          borderColor: "#4ade80",
          backgroundColor: "rgba(74,222,128,0.1)",
          data: [],
          yAxisID: "y",
          tension: 0.3,
          fill: true,
          pointRadius: 0,
          borderWidth: 1.5,
        },
        {
          label: "Velocidad (km/h)",
          borderColor: "#60a5fa",
          data: [],
          yAxisID: "y1",
          tension: 0.3,
          fill: false,
          pointRadius: 0,
          borderWidth: 1.5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: {
          display: true,
          position: "left",
          grid: { color: "rgba(255,255,255,0.05)" },
          ticks: { color: "#64748b", font: { size: 8 } },
        },
        y1: {
          display: true,
          position: "right",
          grid: { drawOnChartArea: false },
          ticks: { color: "#64748b", font: { size: 8 } },
        },
      },
    },
  });
  const p = planeStore[selectedHex];
  if (p) {
    const t = new Date().toLocaleTimeString();
    mobileChart.data.labels.push(t);
    mobileChart.data.datasets[0].data.push(p.alt || 0);
    mobileChart.data.datasets[1].data.push(Math.round(p.spdKmh || 0));
    mobileChart.update("none");
  }
}

async function fetchMobileFlightPhoto(hex) {
  const img = document.getElementById("mobileFlightPhotoImg");
  const fallback = document.getElementById("mobileFlightPhotoFallback");
  if (!img || !fallback) return;

  img.style.display = "none";
  fallback.style.display = "flex";

  try {
    const r = await fetch(
      `https://api.planespotters.net/pub/photos/hex/${hex}`,
    );
    if (!r.ok) throw new Error();
    const data = await r.json();
    const photo = data.photos?.[0];
    const url =
      photo?.thumbnail?.src ||
      photo?.thumbnail_large?.src ||
      photo?.thumbnail_small?.src;
    if (!url) throw new Error();

    img.onload = () => {
      fallback.style.display = "none";
      img.style.display = "block";
    };
    img.onerror = () => {
      img.style.display = "none";
      fallback.style.display = "flex";
    };
    img.src = url;
  } catch (e) {
    img.removeAttribute("src");
    img.style.display = "none";
    fallback.style.display = "flex";
  }
}

async function fetchMobileFlightPhoto(hex, reg) {
  const wrap = document.getElementById("mobileSelPhoto");
  const load = document.getElementById("mobilePhotoLoading");
  const img = document.getElementById("mobilePhotoImg");
  if (!wrap) return;
  wrap.style.display = "block";
  if (load) load.style.display = "flex";
  if (img) img.style.display = "none";

  try {
    let photoUrl = null;
    let photoLink = "https://www.planespotters.net";

    // 1. Intentar a través del proxy /api/photo
    try {
      const proxyBase = BACKEND_API ? BACKEND_API : "";
      const r = await fetch(
        `${proxyBase}/api/photo?hex=${encodeURIComponent(hex || "")}&reg=${encodeURIComponent(reg || "")}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (r.ok) {
        const data = await r.json();
        if (data && data.photoUrl) {
          photoUrl = data.photoUrl;
          photoLink = data.photoLink || photoLink;
        }
      }
    } catch (e) {}

    // 2. Planespotters directo si no hay proxy
    if (!photoUrl && reg && reg !== "—" && reg !== "---") {
      try {
        const r = await fetch(`https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(reg)}`, { signal: AbortSignal.timeout(3500) });
        if (r.ok) {
          const data = await r.json();
          if (data.photos && data.photos.length) {
            photoUrl = data.photos[0].thumbnail_large?.src || data.photos[0].thumbnail?.src;
            photoLink = data.photos[0].link || photoLink;
          }
        }
      } catch (e) {}
    }
    if (!photoUrl && hex) {
      try {
        const r = await fetch(`https://api.planespotters.net/pub/photos/hex/${hex}`, { signal: AbortSignal.timeout(3500) });
        if (r.ok) {
          const data = await r.json();
          if (data.photos && data.photos.length) {
            photoUrl = data.photos[0].thumbnail_large?.src || data.photos[0].thumbnail?.src;
            photoLink = data.photos[0].link || photoLink;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback hexdb
    if (!photoUrl && hex) {
      try {
        const r = await fetch(`https://hexdb.io/hex-image?hex=${hex}`, { signal: AbortSignal.timeout(3500) });
        if (r.ok) {
          const txt = (await r.text()).trim();
          if (txt.startsWith("http")) {
            photoUrl = txt;
            photoLink = `https://www.planespotters.net/search?q=${encodeURIComponent(reg || hex)}`;
          }
        }
      } catch (e) {}
    }

    if (!photoUrl) throw new Error();

    if (img) {
      img.onload = () => {
        if (load) load.style.display = "none";
        img.style.display = "block";
      };
      img.onerror = () => {
        wrap.style.display = "none";
      };
      img.dataset.link = photoLink;
      img.onclick = () => window.open(img.dataset.link, "_blank");
      img.src = photoUrl;
    }
  } catch (e) {
    wrap.style.display = "none";
  }
}

// ══════════════════════════════════════════════════════════════
//  FIR (Espacios Aéreos)
// ══════════════════════════════════════════════════════════════
async function toggleFir() {
  const btn = document.getElementById("firBtn");
  if (showFir) {
    map.removeLayer(firLayer);
    showFir = false;
    btn.style.color = "#94a3b8";
    updateMobileChrome();
    return;
  }

  if (!firLayer && !isFirLoading) {
    isFirLoading = true;
    btn.style.color = "#f59e0b";
    try {
      const res = await fetch(
        "https://raw.githubusercontent.com/dkozickis/AeroGeoJSON/master/fir.geojson",
      );
      const firData = await res.json();
      firLayer = L.geoJSON(firData, {
        style: {
          color: "#8b5cf6",
          weight: 2,
          fillColor: "#8b5cf6",
          fillOpacity: 0.05,
          dashArray: "6 6",
        },
        onEachFeature: (f, l) => {
          const p = f.properties || {};

          let name = "Región de Información de Vuelo (FIR)";
          const nameKeys = [
            "name",
            "firname",
            "fir_name",
            "title",
            "label",
            "desc",
            "fir",
            "ident",
          ];
          for (const k in p) {
            if (nameKeys.includes(k.toLowerCase()) && p[k]) {
              name = p[k];
              break;
            }
          }

          let icao = "N/A";
          const icaoKeys = [
            "icao",
            "ident",
            "id",
            "code",
            "designator",
            "fir_icao",
          ];
          for (const k in p) {
            if (icaoKeys.includes(k.toLowerCase()) && p[k]) {
              icao = p[k];
              break;
            }
          }

          l.bindTooltip(`<b>${name}</b>`, {
            sticky: true,
            className: "mil-tooltip",
          });

          const popupContent = `
          <div style="font-family:system-ui;min-width:180px;background:#0f172a;color:#e2e8f0;border-radius:8px">
            <div style="font-weight:800;font-size:14px;margin-bottom:2px;color:#8b5cf6">🌐 ${name}</div>
            <div style="color:#94a3b8;font-size:12px;margin-bottom:4px"><b>Código ICAO:</b> ${icao}</div>
            <div style="color:#475569;font-size:10px;margin-top:6px">Competencia de control de espacio aéreo</div>
          </div>`;
          l.bindPopup(popupContent, { className: "fir-popup" });
        },
      });
    } catch (e) {
      console.error("Error al cargar los FIR", e);
    }
    isFirLoading = false;
  }

  if (firLayer) {
    map.addLayer(firLayer);
    showFir = true;
    btn.style.color = "#8b5cf6";
  } else {
    btn.style.color = "#ef4444";
  }
  updateMobileChrome();
}

// ══════════════════════════════════════════════════════════════
//  AEROPUERTOS GLOBALES
// ══════════════════════════════════════════════════════════════
function updateWeatherButtons() {
  document
    .getElementById("airportBtn")
    ?.classList.toggle("active", showAirports);
  document
    .getElementById("mobileAirportsBtn")
    ?.classList.toggle("active", showAirports);
  document
    .getElementById("rainRadarBtn")
    ?.classList.toggle("active", showRainRadar);
  document
    .getElementById("corridorBtn")
    ?.classList.toggle("active", showAirCorridors);
  document
    .getElementById("mobileRainBtn")
    ?.classList.toggle("active", showRainRadar);
  document
    .getElementById("mobileCorridorBtn")
    ?.classList.toggle("active", showAirCorridors);
  updateCorridorUI();
  updateMobileChrome();
}

async function refreshRainRadar(showMessages = true) {
  if (rainRadarLoading || !map) return;
  rainRadarLoading = true;
  if (showMessages) setStatus("Cargando radar de lluvia...", "loading");

  try {
    const res = await fetch(RAINVIEWER_API, { cache: "no-store" });
    if (!res.ok) throw new Error("RainViewer HTTP " + res.status);
    const data = await res.json();
    const frames = [
      ...(data.radar?.past || []),
      ...(data.radar?.nowcast || []),
    ];
    const frame = frames[frames.length - 1];
    if (!data.host || !frame?.path)
      throw new Error("Sin frame de radar disponible");

    const tileUrl = `${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`;
    if (rainRadarLayer) map.removeLayer(rainRadarLayer);
    rainRadarLayer = L.tileLayer(tileUrl, {
      opacity: 0.48,
      zIndex: 450,
      maxNativeZoom: 7,
      maxZoom: 19,
      attribution: "Radar RainViewer",
    }).addTo(map);
    rainRadarFrameTime = frame.time;
    showRainRadar = true;
    updateWeatherButtons();
    if (showMessages) {
      const t = new Date(frame.time * 1000).toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
      setStatus(`Radar de lluvia actualizado ${t}`, "ok");
    }
  } catch (e) {
    showRainRadar = false;
    if (rainRadarLayer) {
      try {
        map.removeLayer(rainRadarLayer);
      } catch {}
      rainRadarLayer = null;
    }
    updateWeatherButtons();
    if (showMessages)
      setStatus("No se pudo cargar el radar de lluvia", "error");
  } finally {
    rainRadarLoading = false;
  }
}

async function toggleRainRadar() {
  if (showRainRadar) {
    showRainRadar = false;
    if (rainRadarLayer) {
      try {
        map.removeLayer(rainRadarLayer);
      } catch {}
      rainRadarLayer = null;
    }
    clearInterval(rainRadarRefreshTimer);
    rainRadarRefreshTimer = null;
    updateWeatherButtons();
    setStatus("Radar de lluvia oculto", "ok");
    return;
  }

  await refreshRainRadar(true);
  if (showRainRadar && !rainRadarRefreshTimer) {
    rainRadarRefreshTimer = setInterval(
      () => {
        if (showRainRadar) refreshRainRadar(false);
      },
      10 * 60 * 1000,
    );
  }
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function toFiniteNumber(value) {
  const num = Number(String(value ?? "").trim());
  return Number.isFinite(num) ? num : null;
}

function normalizeHeading(value) {
  const num = toFiniteNumber(value);
  if (num === null) return null;
  const heading = ((num % 360) + 360) % 360;
  return heading === 0 ? 360 : heading;
}

function normalizeRunwayIdent(value) {
  const ident = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (!ident || ident === "\\N" || ident === "N/A") return "";
  if (/^H\d*/.test(ident) || !/\d/.test(ident)) return "";
  return ident;
}

function headingFromRunwayIdent(ident) {
  const match = normalizeRunwayIdent(ident).match(/^(\d{1,2})/);
  if (!match) return null;
  const runwayNumber = Number(match[1]);
  if (!Number.isFinite(runwayNumber) || runwayNumber < 1 || runwayNumber > 36)
    return null;
  return runwayNumber === 36 ? 360 : runwayNumber * 10;
}

function parseRunwaysCsv(csvText) {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .filter(Boolean);
  if (lines.length < 2) return {};

  const headers = parseCsvLine(lines[0]).reduce((acc, header, index) => {
    acc[header] = index;
    return acc;
  }, {});
  const get = (row, key) => row[headers[key]] ?? "";
  const runways = {};

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);
    const airportIdent = String(get(row, "airport_ident")).trim().toUpperCase();
    if (!airportIdent || get(row, "closed") === "1") continue;

    const lengthFt = toFiniteNumber(get(row, "length_ft")) || 0;
    ["le", "he"].forEach((side) => {
      const ident = normalizeRunwayIdent(get(row, `${side}_ident`));
      if (!ident) return;
      const heading =
        normalizeHeading(get(row, `${side}_heading_degT`)) ??
        headingFromRunwayIdent(ident);
      if (heading === null) return;
      const end = {
        ident,
        heading,
        lat: toFiniteNumber(get(row, `${side}_latitude_deg`)),
        lon: toFiniteNumber(get(row, `${side}_longitude_deg`)),
        lengthFt,
        surface: get(row, "surface") || "",
      };
      if (!runways[airportIdent]) runways[airportIdent] = [];
      runways[airportIdent].push(end);
    });
  }

  Object.values(runways).forEach((ends) => {
    ends.sort((a, b) => (b.lengthFt || 0) - (a.lengthFt || 0));
  });
  return runways;
}

async function fetchAirportRunways() {
  if (airportRunwaysLoaded) return airportRunwaysByIcao;
  if (airportRunwaysLoadPromise) return airportRunwaysLoadPromise;

  airportRunwaysLoadPromise = fetch(RUNWAYS_CSV_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((csv) => {
      airportRunwaysByIcao = parseRunwaysCsv(csv);
      airportRunwaysLoaded = true;
      return airportRunwaysByIcao;
    })
    .catch((err) => {
      console.warn("No se pudieron cargar pistas OurAirports", err);
      airportRunwaysLoaded = true;
      return airportRunwaysByIcao;
    })
    .finally(() => {
      airportRunwaysLoadPromise = null;
    });

  return airportRunwaysLoadPromise;
}

function destinationPoint(lat, lon, bearingDeg, distanceKm) {
  const bearing = bearingDeg * DEG;
  const lat1 = lat * DEG;
  const lon1 = lon * DEG;
  const angularDistance = distanceKm / R_KM;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2),
    );
  return [lat2 / DEG, ((lon2 / DEG + 540) % 360) - 180];
}

function getAirportLatLon(ap) {
  const lat = toFiniteNumber(ap?.lat ?? ap?.latitude ?? ap?.latitude_deg);
  const lon = toFiniteNumber(
    ap?.lon ?? ap?.lng ?? ap?.longitude ?? ap?.longitude_deg,
  );
  if (lat === null || lon === null) return null;
  return { lat, lon };
}

function getAirportIcao(ap) {
  return String(ap?.icao || ap?.gps_code || ap?.ident || "")
    .trim()
    .toUpperCase();
}

function getAirportDisplayCode(ap) {
  return (
    getAirportIcao(ap) ||
    String(ap?.iata || "")
      .trim()
      .toUpperCase() ||
    "AP"
  );
}

function isLeblAirport(ap) {
  const icao = getAirportIcao(ap);
  const iata = String(ap?.iata || "")
    .trim()
    .toUpperCase();
  return icao === "LEBL" || iata === "BCN";
}

function getLocalCorridorAirports() {
  const airports = new Map();
  Object.entries(window.AIRPORT_COORDS || {}).forEach(([code, coords]) => {
    const latLon = getAirportLatLon(coords);
    if (latLon)
      airports.set(code, {
        iata: code,
        icao: code.length === 4 ? code : "",
        name: code,
        ...latLon,
      });
  });
  Object.entries(window.AIRPORT_COORDS_ETA || {}).forEach(([code, coords]) => {
    if (airports.has(code) || !Array.isArray(coords)) return;
    const lat = toFiniteNumber(coords[0]);
    const lon = toFiniteNumber(coords[1]);
    if (lat !== null && lon !== null)
      airports.set(code, {
        iata: code,
        icao: code.length === 4 ? code : "",
        name: code,
        lat,
        lon,
      });
  });
  return [...airports.values()];
}

function findAirportForCorridors(code) {
  const clean = String(code || "")
    .trim()
    .toUpperCase();
  if (!clean) return null;
  const sources = [globalAirports, getLocalCorridorAirports()];
  for (const source of sources) {
    const found = source.find((ap) => {
      const icao = getAirportIcao(ap);
      const iata = String(ap?.iata || "")
        .trim()
        .toUpperCase();
      return icao === clean || iata === clean;
    });
    if (found) return found;
  }
  const coords = getAirportCoords(clean) || getAirportCoords(clean.slice(1));
  if (coords)
    return {
      iata: clean.length === 3 ? clean : "",
      icao: clean.length === 4 ? clean : "",
      name: clean,
      lat: coords.lat,
      lon: coords.lon,
    };
  return null;
}

function getCorridorAirportCandidates() {
  if (!map) return [];
  const source = globalAirports.length
    ? globalAirports
    : getLocalCorridorAirports();
  const bounds = map.getBounds().pad(0.18);
  const center = map.getCenter();
  const zoom = map.getZoom();
  const maxAirports = zoom >= 10 ? 70 : zoom >= 8 ? 48 : zoom >= 6 ? 30 : 18;

  return source
    .map((ap) => ({ ap, latLon: getAirportLatLon(ap) }))
    .filter(
      (item) =>
        item.latLon && bounds.contains([item.latLon.lat, item.latLon.lon]),
    )
    .sort((a, b) => {
      const codeA = getAirportIcao(a.ap);
      const codeB = getAirportIcao(b.ap);
      const majorA =
        LOCAL_FREQS[codeA] || window.AIRPORT_COORDS?.[a.ap.iata] ? -1500000 : 0;
      const majorB =
        LOCAL_FREQS[codeB] || window.AIRPORT_COORDS?.[b.ap.iata] ? -1500000 : 0;
      const runwayA = airportRunwaysByIcao[codeA]?.length ? -650000 : 0;
      const runwayB = airportRunwaysByIcao[codeB]?.length ? -650000 : 0;
      const distA = center.distanceTo(L.latLng(a.latLon.lat, a.latLon.lon));
      const distB = center.distanceTo(L.latLng(b.latLon.lat, b.latLon.lon));
      return majorA + runwayA + distA - (majorB + runwayB + distB);
    })
    .slice(0, maxAirports)
    .map((item) => item.ap);
}

function getAirportRunwayEnds(ap) {
  const icao = getAirportIcao(ap);
  const zoom = map?.getZoom?.() || 7;
  const minLengthFt = zoom >= 9 ? 1200 : zoom >= 7 ? 2500 : 4200;
  const maxEnds = zoom >= 10 ? 6 : zoom >= 8 ? 4 : 2;
  const ends = airportRunwaysByIcao[icao] || [];
  const filtered = ends.filter(
    (end) => !end.lengthFt || end.lengthFt >= minLengthFt,
  );
  return filtered.slice(0, maxEnds);
}

function getCorridorDistanceKm() {
  const zoom = map?.getZoom?.() || 7;
  if (zoom >= 11) return 10;
  if (zoom >= 9) return 16;
  if (zoom >= 7) return 25;
  return 35;
}

function makeApproachPoints(lat, lon, runwayHeading, distanceKm) {
  const backBearing = runwayHeading + 180;
  return [
    destinationPoint(lat, lon, backBearing, distanceKm),
    destinationPoint(lat, lon, backBearing, distanceKm * 0.62),
    destinationPoint(lat, lon, backBearing, distanceKm * 0.28),
    [lat, lon],
  ];
}

function makeDeparturePoints(lat, lon, runwayHeading, distanceKm) {
  return [
    [lat, lon],
    destinationPoint(lat, lon, runwayHeading, distanceKm * 0.28),
    destinationPoint(lat, lon, runwayHeading, distanceKm * 0.62),
    destinationPoint(lat, lon, runwayHeading, distanceKm),
  ];
}

function shouldShowCorridorType(type) {
  return corridorMode === "both" || corridorMode === type;
}

function makeCorridorsForAirport(ap, options = {}) {
  const latLon = getAirportLatLon(ap);
  if (!latLon) return [];
  const code = getAirportDisplayCode(ap);
  const airportName = ap?.name || ap?.city || code;
  const distanceKm = getCorridorDistanceKm();
  const includeArrivals =
    options.includeArrivals !== false && shouldShowCorridorType("arrivals");
  const includeDepartures =
    options.includeDepartures !== false && shouldShowCorridorType("departures");

  return getAirportRunwayEnds(ap).flatMap((end, index) => {
    const runwayLat = end.lat ?? latLon.lat;
    const runwayLon = end.lon ?? latLon.lon;
    const heading = normalizeHeading(end.heading);
    if (heading === null) return [];
    const base = {
      airport: code,
      runway: end.ident,
      note: CORRIDOR_NOTE,
    };
    const corridors = [];
    if (includeArrivals) {
      corridors.push({
        ...base,
        id: `${code}-arr-${end.ident}-${index}`,
        type: "arrivals",
        label: `ARR ${end.ident}`,
        name: `${airportName} llegada RWY ${end.ident}`,
        color: CORRIDOR_ARRIVAL_COLOR,
        points: makeApproachPoints(runwayLat, runwayLon, heading, distanceKm),
      });
    }
    if (includeDepartures) {
      corridors.push({
        ...base,
        id: `${code}-dep-${end.ident}-${index}`,
        type: "departures",
        label: `DEP ${end.ident}`,
        name: `${airportName} salida RWY ${end.ident}`,
        color: CORRIDOR_DEPARTURE_COLOR,
        points: makeDeparturePoints(runwayLat, runwayLon, heading, distanceKm),
      });
    }
    return corridors;
  });
}

function addAirCorridorToGroup(group, corridor) {
  const halo = L.polyline(corridor.points, {
    color: corridor.color,
    weight: 18,
    opacity: 0.1,
    interactive: false,
  });
  const line = L.polyline(corridor.points, {
    color: corridor.color,
    weight: corridor.type === "departures" ? 2.8 : 2.5,
    opacity: 0.78,
    dashArray: corridor.type === "departures" ? "4 8" : "10 8",
  }).bindTooltip(
    `<b>${escapeHTML(corridor.airport)} ${escapeHTML(corridor.runway)}</b><br>${escapeHTML(corridor.name)}<br><span style="color:#94a3b8">${escapeHTML(corridor.note)}</span>`,
    {
      sticky: true,
      className: "nheu-tooltip",
    },
  );
  const start = corridor.points[0];
  const end = corridor.points[corridor.points.length - 1];
  const label = L.marker(start, {
    interactive: false,
    icon: L.divIcon({
      className: "",
      html: `<div class="corridor-label" style="border-color:${corridor.color};color:${corridor.color}">${escapeHTML(corridor.label || corridor.runway)}</div>`,
      iconAnchor: [18, 10],
    }),
  });
  const threshold = L.circleMarker(end, {
    radius: 5,
    color: corridor.color,
    weight: 2,
    fillColor: "#080810",
    fillOpacity: 0.8,
    interactive: false,
  });
  group.addLayer(halo);
  group.addLayer(line);
  group.addLayer(label);
  group.addLayer(threshold);
}

function corridorTouchesViewport(corridor) {
  if (!map) return false;
  const viewport = map.getBounds().pad(0.18);
  const corridorBounds = L.latLngBounds(corridor.points);
  return (
    viewport.intersects(corridorBounds) ||
    corridor.points.some((point) => viewport.contains(point))
  );
}

function buildAirCorridorLayer() {
  const group = L.layerGroup();
  const pointsForBounds = [];
  let corridorCount = 0;
  const airportCodes = new Set();
  const ap = findAirportForCorridors(corridorAirportCode);

  if (!ap) {
    return {
      layer: group,
      bounds: null,
      airportCount: 0,
      corridorCount,
      airportCode: corridorAirportCode,
      airportFound: false,
    };
  }

  const code = getAirportDisplayCode(ap);
  airportCodes.add(code);

  if (isLeblAirport(ap) && shouldShowCorridorType("arrivals")) {
    AIR_CORRIDORS.forEach((corridor) => {
      const leblCorridor = {
        ...corridor,
        type: "arrivals",
        label: `ARR ${corridor.runway}`,
        color: CORRIDOR_ARRIVAL_COLOR,
      };
      addAirCorridorToGroup(group, leblCorridor);
      pointsForBounds.push(...leblCorridor.points);
      corridorCount++;
    });
  }

  const generated = makeCorridorsForAirport(ap, {
    includeArrivals: !isLeblAirport(ap),
    includeDepartures: true,
  });
  generated.forEach((corridor) => {
    addAirCorridorToGroup(group, corridor);
    pointsForBounds.push(...corridor.points);
    corridorCount++;
  });

  return {
    layer: group,
    bounds: pointsForBounds.length ? L.latLngBounds(pointsForBounds) : null,
    airportCount: airportCodes.size,
    corridorCount,
    airportCode: code,
    airportFound: true,
  };
}

function updateCorridorAirportOptions() {
  const list = document.getElementById("corridorAirportOptions");
  if (!list || !map) return;
  const source = globalAirports.length
    ? globalAirports
    : getLocalCorridorAirports();
  const origin =
    userLat && userLon ? L.latLng(userLat, userLon) : map.getCenter();
  const options = source
    .map((ap) => {
      const latLon = getAirportLatLon(ap);
      if (!latLon) return null;
      const icao = getAirportIcao(ap);
      const iata = String(ap?.iata || "")
        .trim()
        .toUpperCase();
      const code = iata || icao;
      if (!code) return null;
      const name = ap?.name || ap?.city || icao || iata;
      const dist = origin.distanceTo(L.latLng(latLon.lat, latLon.lon));
      return { code, icao, iata, name, dist };
    })
    .filter(Boolean)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 30);
  list.innerHTML = options
    .map((ap) => {
      const label = [ap.icao && ap.icao !== ap.code ? ap.icao : "", ap.name]
        .filter(Boolean)
        .join(" · ");
      return `<option value="${escapeHTML(ap.code)}" label="${escapeHTML(label)}"></option>`;
    })
    .join("");
}

function updateCorridorUI() {
  document
    .getElementById("corridorPanel")
    ?.classList.toggle("visible", showAirCorridors);
  const input = document.getElementById("corridorAirportInput");
  if (input && document.activeElement !== input)
    input.value = corridorAirportCode || "";
  document.querySelectorAll(".corridor-mode-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.corridorMode === corridorMode);
  });
  const hint = document.getElementById("corridorHint");
  if (hint) {
    const modeText =
      corridorMode === "arrivals"
        ? "Solo llegadas en azul"
        : corridorMode === "departures"
          ? "Solo salidas en verde"
          : "Azul llegadas · Verde salidas";
    hint.textContent = showAirCorridors
      ? `${corridorAirportCode || "Aeropuerto"} · ${modeText}`
      : modeText;
  }
  updateCorridorAirportOptions();
}

function clearAirCorridors(message = "Pasillos aproximados ocultos") {
  showAirCorridors = false;
  try {
    map.removeLayer(airCorridorLayer);
  } catch {}
  airCorridorLayer = null;
  setStatus(message, "ok");
  updateWeatherButtons();
}

function renderAirCorridors(options = {}) {
  if (!showAirCorridors || !map) return;
  if (airCorridorLayer) {
    try {
      map.removeLayer(airCorridorLayer);
    } catch {}
    airCorridorLayer = null;
  }
  const built = buildAirCorridorLayer();
  airCorridorLayer = built.layer;
  airCorridorLayer.addTo(map);
  if (!options.silent) {
    if (!built.airportFound) {
      setStatus(`No encuentro el aeropuerto ${corridorAirportCode}`, "error");
    } else if (built.corridorCount) {
      setStatus(
        `Pasillos ${built.airportCode}: ${built.corridorCount} trazados`,
        "ok",
      );
      if (built.bounds && options.fit !== false) {
        map.flyToBounds(built.bounds, {
          padding: [40, 40],
          maxZoom: Math.max(map.getZoom(), 10),
          duration: 0.7,
        });
      }
    } else {
      setStatus(`Sin pistas suficientes para ${built.airportCode}`, "error");
    }
  }
  updateWeatherButtons();
}

async function showCorridorsForAirport(
  code = corridorAirportCode,
  options = {},
) {
  const clean = String(code || "")
    .trim()
    .toUpperCase();
  if (clean) corridorAirportCode = clean;
  showAirCorridors = true;
  updateWeatherButtons();
  setStatus("Cargando pistas para pasillos...", "loading");
  if (!airportsLoaded) await fetchGlobalAirports();
  await fetchAirportRunways();
  if (!showAirCorridors) return;
  renderAirCorridors(options);
}

async function toggleAirCorridors() {
  if (showAirCorridors) {
    clearAirCorridors();
  } else {
    await showCorridorsForAirport(corridorAirportCode);
  }
}

function airportWeatherId(icao) {
  return (
    "apWeather-" +
    String(icao || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
  );
}

function airportRunwaysId(icao) {
  return (
    "apRunways-" +
    String(icao || "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
  );
}

function getRawWeatherText(item) {
  return (
    item?.rawOb ||
    item?.rawTAF ||
    item?.raw_text ||
    item?.raw ||
    item?.report ||
    ""
  );
}

function formatMetarSummary(metar) {
  if (!metar) return '<div class="ap-weather-empty">Sin METAR reciente</div>';
  const windDir =
    metar.wdir === "VRB"
      ? "VRB"
      : metar.wdir != null
        ? `${metar.wdir}°`
        : "---";
  const windSpd = metar.wspd != null ? `${metar.wspd} kt` : "";
  const gust = metar.wgst != null ? `G${metar.wgst}` : "";
  const vis = metar.visib != null ? `${metar.visib} SM` : "---";
  const clouds =
    Array.isArray(metar.clouds) && metar.clouds.length
      ? metar.clouds
          .map((c) =>
            `${c.cover || ""}${c.base ? " " + c.base + " ft" : ""}`.trim(),
          )
          .filter(Boolean)
          .join(" · ")
      : "Sin nubes reportadas";
  const raw = getRawWeatherText(metar);
  return `<div class="ap-weather-grid">
    <div><span>Viento</span><strong>${escapeHTML([windDir, windSpd, gust].filter(Boolean).join(" "))}</strong></div>
    <div><span>Visibilidad</span><strong>${escapeHTML(vis)}</strong></div>
    <div><span>Regla</span><strong>${escapeHTML(metar.fltCat || metar.flightCategory || "---")}</strong></div>
    <div><span>Nubes</span><strong>${escapeHTML(clouds)}</strong></div>
  </div>
  ${raw ? `<div class="ap-weather-raw">${escapeHTML(raw)}</div>` : ""}`;
}

async function fetchAviationWeather(product, icao) {
  const url = `${AWC_DATA_API}/${product}?ids=${encodeURIComponent(icao)}&format=json`;
  const requestUrl = AWC_PROXY_ENDPOINT
    ? `${AWC_PROXY_ENDPOINT}${encodeURIComponent(url)}`
    : url;
  const res = await fetch(requestUrl, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error("AWC HTTP " + res.status);
  const data = await res.json();
  return Array.isArray(data) ? data[0] || null : data;
}

async function loadAirportWeatherInto(icao, targetId) {
  const id = String(icao || "").toUpperCase();
  const box = document.getElementById(targetId);
  if (!id || !box) return;

  const cached = aviationWeatherCache[id];
  if (cached && Date.now() - cached.time < 5 * 60 * 1000) {
    box.innerHTML = cached.html;
    return;
  }

  box.innerHTML =
    '<div class="ap-weather-loading"><i class="fas fa-spinner fa-spin"></i> Cargando METAR/TAF...</div>';
  try {
    const [metar, taf] = await Promise.all([
      fetchAviationWeather("metar", id),
      fetchAviationWeather("taf", id),
    ]);
    const tafRaw = getRawWeatherText(taf);
    const html = `<div class="ap-weather-title">METAR / TAF</div>
      ${formatMetarSummary(metar)}
      ${tafRaw ? `<div class="ap-weather-taf"><span>TAF</span>${escapeHTML(tafRaw)}</div>` : '<div class="ap-weather-empty">Sin TAF reciente</div>'}`;
    aviationWeatherCache[id] = { time: Date.now(), html };
    box.innerHTML = html;
  } catch (e) {
    const metarLink = `https://aviationweather.gov/data/metar/?ids=${encodeURIComponent(id)}`;
    const tafLink = `https://aviationweather.gov/data/taf/?ids=${encodeURIComponent(id)}`;
    box.innerHTML = `<div class="ap-weather-error">El navegador puede bloquear AviationWeather.gov por CORS en webs estaticas.</div>
      <div class="ap-weather-links">
        <a href="${metarLink}" target="_blank" rel="noopener">Abrir METAR</a>
        <a href="${tafLink}" target="_blank" rel="noopener">Abrir TAF</a>
      </div>`;
  }
}

async function loadAirportWeather(icao) {
  const id = String(icao || "").toUpperCase();
  return loadAirportWeatherInto(id, airportWeatherId(id));
}

async function loadAirportRunwaySummary(icao) {
  const id = String(icao || "")
    .trim()
    .toUpperCase();
  const box = document.getElementById(airportRunwaysId(id));
  if (!box) return;
  box.innerHTML =
    '<div class="ap-runway-loading"><i class="fas fa-spinner fa-spin"></i> Cargando pistas...</div>';
  await fetchAirportRunways();
  const ends = airportRunwaysByIcao[id] || [];
  if (!ends.length) {
    box.innerHTML =
      '<div class="ap-runway-empty">Sin pistas reales en el dataset</div>';
    return;
  }

  const pairs = new Map();
  ends.forEach((end) => {
    const lengthKey = end.lengthFt
      ? `${Math.round(end.lengthFt).toLocaleString("es-ES")} ft`
      : "longitud n/d";
    const key = `${lengthKey}|${end.surface || ""}`;
    if (!pairs.has(key)) pairs.set(key, []);
    pairs.get(key).push(end.ident);
  });

  const rows = [...pairs.entries()]
    .slice(0, 4)
    .map(([key, idents]) => {
      const [lengthText, surface] = key.split("|");
      return `<div class="ap-runway-row">
      <strong>${escapeHTML(idents.slice(0, 4).join(" / "))}</strong>
      <span>${escapeHTML(lengthText)}${surface ? ` · ${escapeHTML(surface)}` : ""}</span>
    </div>`;
    })
    .join("");

  const more =
    pairs.size > 4
      ? `<div class="ap-runway-more">+${pairs.size - 4} pistas mas</div>`
      : "";
  box.innerHTML = `<div class="ap-runway-title"><i class="fas fa-road"></i> Pistas reales</div>${rows}${more}`;
}

function createAirportIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
    <circle cx="16" cy="16" r="14" fill="#0f172a" stroke="#f97316" stroke-width="2"/>
    <path d="M17,11V3H7v4H3v14h18V11H17z M7,5h2v2H7V5z M7,9h2v2H7V9z M5,19v-2h2v2H5z M5,15v-2h2v2H5z M5,11v-2h2v2H5z M9,19v-2h2v2H9z M9,15v-2h2v2H9z M9,11v-2h2v2H9z M13,19v-2h2v2H13z M13,15v-2h2v2H13z M13,11V9h2v2H13z M13,7V5h2v2H13z M17,19v-2h2v2H17z M17,15v-2h2v2H17z M17,11V9h2v2H17z" fill="#f97316" transform="translate(4, 5)"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function buildAirportPopup(ap) {
  let rows = "";
  if (ap.twr)
    rows += `<tr><td style="padding:3px 8px;color:#94a3b8">TWR</td><td style="padding:3px 8px;color:#e2e8f0;font-weight:700">${escapeHTML(ap.twr)} MHz</td></tr>`;
  if (ap.atis)
    rows += `<tr><td style="padding:3px 8px;color:#94a3b8">ATIS</td><td style="padding:3px 8px;color:#e2e8f0;font-weight:700">${escapeHTML(ap.atis)} MHz</td></tr>`;

  const corridorCode = ap.icao || ap.iata || "";
  const airportModeBtn = corridorCode
    ? `<button type="button" class="ap-action ap-action-main" data-open-airport-mode="${escapeHTML(corridorCode)}"><i class="fas fa-plane-arrival"></i><span>Modo aeropuerto</span></button>`
    : "";
  const corridorLink = corridorCode
    ? `<button type="button" class="ap-action" data-show-corridors="${escapeHTML(corridorCode)}"><i class="fas fa-route"></i><span>Pasillos reales</span></button>`
    : "";

  return `<div style="font-family:system-ui;min-width:230px;background:#0f172a;color:#e2e8f0;border-radius:8px">
    <div style="font-weight:800;font-size:14px;margin-bottom:2px;color:#f97316">🏢 ${escapeHTML(ap.name)}</div>
    <div style="color:#64748b;font-size:11px;margin-bottom:8px">${escapeHTML(ap.icao || "")} / ${escapeHTML(ap.iata || "")} · ${escapeHTML(ap.city || ap.country || "")}</div>
    ${rows ? `<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:6px"><tbody>${rows}</tbody></table>` : '<div style="color:#64748b;font-size:11px;margin-bottom:6px">Frecuencias locales no registradas</div>'}
    <div class="ap-actions">${airportModeBtn}${corridorLink}</div>
  </div>`;
}

function renderAirports() {
  airportMarkers.forEach((m) => map.removeLayer(m));
  airportMarkers = [];
  if (!showAirports || map.getZoom() < 6 || globalAirports.length === 0) return;
  const bounds = map.getBounds().pad(0.2);
  let visibleAirports = globalAirports.filter((ap) =>
    bounds.contains([ap.lat, ap.lon]),
  );
  if (visibleAirports.length > 120) {
    visibleAirports = visibleAirports
      .sort(
        (a, b) =>
          Number(Boolean(b.twr || b.atis)) - Number(Boolean(a.twr || a.atis)),
      )
      .slice(0, 120);
  }
  visibleAirports.forEach((ap) => {
    const m = L.marker([ap.lat, ap.lon], {
      icon: createAirportIcon(),
      zIndexOffset: -100,
    })
      .bindPopup(buildAirportPopup(ap), {
        maxWidth: 300,
        className: "ap-popup",
      })
      .addTo(map);
    airportMarkers.push(m);
  });
}

// ══════════════════════════════════════════════════════════════
//  BASES MILITARES
// ══════════════════════════════════════════════════════════════
let militaryPolygons = [];

function renderMilitaryBases() {
  militaryPolygons.forEach((p) => map.removeLayer(p));
  militaryPolygons = [];
  if (map.getZoom() < 7) return;
  window.MILITARY_BASES.forEach((base) => {
    const poly = L.polygon(base.coords, {
      color: "#a855f7",
      weight: 2,
      opacity: 0.9,
      fillColor: "#a855f7",
      fillOpacity: 0.1,
      dashArray: "6 4",
    })
      .bindTooltip("🛡️ " + escapeHTML(base.name), {
        permanent: false,
        direction: "top",
        className: "mil-tooltip",
      })
      .addTo(map);
    militaryPolygons.push(poly);
  });
}

// ══════════════════════════════════════════════════════════════
//  AEROPUERTOS GLOBALES — Fetch
// ══════════════════════════════════════════════════════════════
async function fetchGlobalAirports() {
  if (airportsLoaded) return;
  if (airportsLoadPromise) return airportsLoadPromise;
  isAirportsLoading = true;
  airportsLoadPromise = fetch(
    "https://raw.githubusercontent.com/mwgg/Airports/master/airports.json",
  )
    .then((res) => res.json())
    .then((data) => {
      globalAirports = Object.values(data)
        .filter((a) => a.iata && a.iata !== "" && a.iata !== "\\N")
        .map((a) => {
          if (LOCAL_FREQS[a.icao]) {
            a.twr = LOCAL_FREQS[a.icao].twr;
            a.atis = LOCAL_FREQS[a.icao].atis;
          }
          return a;
        });
      airportsLoaded = true;
      renderAirports();
      updateCorridorAirportOptions();
      if (showAirCorridors) renderAirCorridors({ silent: true });
    })
    .catch((e) => {
      console.error("Error al cargar los aeropuertos globales", e);
    })
    .finally(() => {
      isAirportsLoading = false;
      airportsLoadPromise = null;
    });
  return airportsLoadPromise;
}

// ══════════════════════════════════════════════════════════════
//  BUSCADOR DE VUELOS POR AEROPUERTO
// ══════════════════════════════════════════════════════════════
function openAirportModal() {
  document.getElementById("airportModal").classList.add("open");
}
function closeAirportModal() {
  document.getElementById("airportModal").classList.remove("open");
}
function switchApTab(tab) {
  apTab = tab;
  document.querySelectorAll(".ap-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  renderApResults();
}

function getAirportSearchContext(code) {
  const raw = String(code || "")
    .trim()
    .toUpperCase();
  const ap = findAirportForCorridors(raw);
  const iata = String(ap?.iata || "")
    .trim()
    .toUpperCase();
  const icao = getAirportIcao(ap) || (raw.length === 4 ? raw : "");
  const codes = new Set([raw]);
  if (iata) codes.add(iata);
  if (icao) codes.add(icao);
  if (raw.length === 4 && raw.startsWith("LE")) {
    const known = globalAirports.find((item) => getAirportIcao(item) === raw);
    if (known?.iata) codes.add(String(known.iata).toUpperCase());
  }

  let lat = toFiniteNumber(ap?.lat);
  let lon = toFiniteNumber(ap?.lon);
  const coordsKey = iata || raw;
  const localCoords = getAirportCoords(coordsKey) || getAirportCoords(raw);
  if ((lat === null || lon === null) && localCoords) {
    lat = localCoords.lat;
    lon = localCoords.lon;
  }
  const etaCoords =
    window.AIRPORT_COORDS_ETA?.[iata] || window.AIRPORT_COORDS_ETA?.[raw];
  if ((lat === null || lon === null) && etaCoords) {
    lat = etaCoords[0];
    lon = etaCoords[1];
  }

  return { raw, ap, iata, icao, codes: [...codes].filter(Boolean), lat, lon };
}

function airportCodeMatches(value, ctx) {
  const code = String(value || "")
    .trim()
    .toUpperCase();
  if (!code) return false;
  return ctx.codes.some(
    (target) =>
      code === target || code.slice(1) === target || target.slice(1) === code,
  );
}

async function enrichPlaneRouteFromCallsign(p) {
  if (!p || (p.orig && p.dest)) return;
  const callsign = String(p.call || p.flight || "")
    .trim()
    .replace(/\s+/g, "");
  if (
    callsign.length < 4 ||
    callsign.toUpperCase() === String(p.hex || "").toUpperCase()
  )
    return;

  if (callsignRouteCache[callsign]) {
    const cached = callsignRouteCache[callsign];
    if (cached.orig || cached.dest) {
      p.orig = p.orig || cached.orig || "";
      p.dest = p.dest || cached.dest || "";
      p.origCity = p.origCity || cached.origCity || "";
      p.destCity = p.destCity || cached.destCity || "";
    }
    return;
  }

  try {
    const res = await fetch(
      `https://api.adsbdb.com/v0/callsign/${encodeURIComponent(callsign)}`,
    );
    const route = res.ok ? (await res.json())?.response?.flightroute : null;
    const cached = {
      orig: route?.origin?.iata_code || route?.origin?.icao_code || "",
      dest:
        route?.destination?.iata_code || route?.destination?.icao_code || "",
      origCity: route?.origin?.municipality || "",
      destCity: route?.destination?.municipality || "",
    };
    callsignRouteCache[callsign] = cached;
    if (cached.orig || cached.dest) {
      p.orig = p.orig || cached.orig;
      p.dest = p.dest || cached.dest;
      p.origCity = p.origCity || cached.origCity;
      p.destCity = p.destCity || cached.destCity;
    }
  } catch (e) {
    callsignRouteCache[callsign] = {};
  }
}

function collectAirportMatches(ctx) {
  const arrivals = [];
  const departures = [];
  for (const p of Object.values(planeStore)) {
    const dest =
      p.dest || p.dest_iata || p.dest_icao || p.destination || p.t_dest || "";
    const orig =
      p.orig || p.orig_iata || p.orig_icao || p.origin || p.t_orig || "";
    if (airportCodeMatches(dest, ctx) && p.ilat != null) arrivals.push(p);
    if (airportCodeMatches(orig, ctx) && p.ilat != null) departures.push(p);
  }
  return { arrivals, departures };
}

async function openAirportMode(code) {
  const clean = String(code || "")
    .trim()
    .toUpperCase();
  if (!clean) return;
  openAirportModal();
  const input = document.getElementById("airportCodeInput");
  if (input) input.value = clean;
  apLastCode = clean;
  apTab = "arr";
  document.querySelectorAll(".ap-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === apTab));
  const wrap = document.getElementById("airportResultsWrap");
  if (wrap)
    wrap.innerHTML = `<div class="ap-empty"><i class="fas fa-spinner fa-spin"></i> Cargando modo aeropuerto...</div>`;
  if (!airportsLoaded) await fetchGlobalAirports();
  await fetchAirportRunways();
  await doAirportSearch(clean);
}

document
  .getElementById("airportSearchModalBtn")
  ?.addEventListener("click", openAirportModal);
document
  .getElementById("airportModalClose")
  .addEventListener("click", closeAirportModal);
document.getElementById("airportModal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("airportModal")) closeAirportModal();
});
document
  .getElementById("airportSearchBtn")
  .addEventListener("click", doAirportSearch);
document.getElementById("airportCodeInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") doAirportSearch();
});

async function doAirportSearch(forcedCode = "") {
  const codeArg = typeof forcedCode === "string" ? forcedCode : "";
  const raw = String(
    codeArg || document.getElementById("airportCodeInput").value,
  )
    .trim()
    .toUpperCase();
  if (!raw) return;
  const input = document.getElementById("airportCodeInput");
  if (input && input.value.trim().toUpperCase() !== raw) input.value = raw;
  apLastCode = raw;
  if (!airportsLoaded) await fetchGlobalAirports();
  if (!airportRunwaysLoaded) await fetchAirportRunways();
  const ctx = getAirportSearchContext(raw);
  const wrap = document.getElementById("airportResultsWrap");
  wrap.innerHTML = `<div class="ap-empty"><i class="fas fa-spinner fa-spin"></i> Buscando vuelos...</div>`;

  let { arrivals, departures } = collectAirportMatches(ctx);

  if (
    arrivals.length + departures.length < 3 &&
    ctx.lat !== null &&
    ctx.lon !== null
  ) {
    try {
      const data = await fetchAdsbJson(
        `/point/${ctx.lat.toFixed(4)}/${ctx.lon.toFixed(4)}/180`,
      );
      const acs = data?.ac || [];
      if (acs.length) ingest(acs);
      const nearby = acs
        .map((a) => planeStore[String(a.hex || "").toUpperCase()])
        .filter(Boolean)
        .slice(0, 84);
      for (let i = 0; i < nearby.length; i += 12) {
        await Promise.allSettled(
          nearby.slice(i, i + 12).map(enrichPlaneRouteFromCallsign),
        );
        ({ arrivals, departures } = collectAirportMatches(ctx));
        if (arrivals.length + departures.length >= 6) break;
      }
    } catch (e) {
      console.warn("No se pudieron cargar vuelos cercanos al aeropuerto", e);
    }
  }

  const withEta = (list) =>
    list
      .map((p) => {
        let etaMin = null;
        const lat = p.ilat ?? p.lat;
        const lon = p.ilon ?? p.lon;
        if (
          ctx.lat !== null &&
          ctx.lon !== null &&
          p.spdKmh > 30 &&
          lat != null
        ) {
          const dist = haversineKm(lat, lon, ctx.lat, ctx.lon);
          etaMin = Math.round((dist / p.spdKmh) * 60);
        }
        return { p, etaMin };
      })
      .sort((a, b) => (a.etaMin ?? 9999) - (b.etaMin ?? 9999));

  apResults = { arr: withEta(arrivals), dep: withEta(departures) };
  renderApResults();
}

function renderApResults() {
  const wrap = document.getElementById("airportResultsWrap");
  const list = apResults[apTab];
  const airport = findAirportForCorridors(apLastCode);
  const icao = airport
    ? getAirportIcao(airport)
    : apLastCode.length === 4
      ? apLastCode
      : "";
  const ends = icao ? airportRunwaysByIcao[icao] || [] : [];
  const uniqueRunways = [
    ...new Set(ends.map((end) => end.ident).filter(Boolean)),
  ];
  const runwayText = uniqueRunways.length
    ? `${uniqueRunways.slice(0, 6).join(" / ")}${uniqueRunways.length > 6 ? ` +${uniqueRunways.length - 6}` : ""}`
    : "Sin pistas reales";
  const summary = `<div class="ap-mode-summary">
    <div>
      <span>Modo aeropuerto</span>
      <strong>${escapeHTML(apLastCode)}</strong>
      <small>${escapeHTML(runwayText)}</small>
    </div>
    <div class="ap-mode-actions">
      ${icao ? `<button type="button" data-show-corridors="${escapeHTML(icao)}"><i class="fas fa-route"></i><span>Pasillos</span></button>` : ""}
      ${icao ? `<button type="button" data-open-weather="${escapeHTML(icao)}"><i class="fas fa-cloud-sun-rain"></i><span>METAR</span></button>` : ""}
    </div>
  </div>`;
  if (!list || list.length === 0) {
    wrap.innerHTML = `${summary}<div class="ap-empty">No se han encontrado vuelos ${apTab === "arr" ? "llegando a" : "saliendo de"} <b>${escapeHTML(apLastCode)}</b> en este momento</div>`;
    return;
  }
  wrap.innerHTML =
    summary +
    list
      .map(({ p, etaMin }) => {
        const etaStr =
          etaMin != null && etaMin >= 0 && etaMin < 600
            ? etaMin < 60
              ? `${etaMin} min`
              : `${Math.floor(etaMin / 60)}h${etaMin % 60}m`
            : null;
        const etaClass =
          etaMin != null && etaMin < 20
            ? ""
            : etaMin != null && etaMin < 60
              ? ""
              : "far";
        const orig = p.orig || "?",
          dest = p.dest || "?";
        const routeTxt =
          apTab === "arr"
            ? `<b>${escapeHTML(orig)}</b> → ${escapeHTML(dest)}`
            : `${escapeHTML(orig)} → <b>${escapeHTML(dest)}</b>`;
        return `<div class="ap-flight-row" data-select-plane="${escapeHTML(p.hex)}" data-close-airport="true">
      <div class="ap-callsign">${escapeHTML(p.call || p.hex)}</div>
      <div class="ap-route">${routeTxt}</div>
      <div class="ap-eta ${etaStr ? etaClass : "unknown"}">${etaStr ? (apTab === "arr" ? "~" + escapeHTML(etaStr) : "en ruta") : "—"}</div>
    </div>`;
      })
      .join("");
}

// ══════════════════════════════════════════════════════════════
//  ESTILOS DINÁMICOS
// ══════════════════════════════════════════════════════════════
(function () {
  const s = document.createElement("style");
  s.textContent = `
    .mil-tooltip{background:rgba(30,27,75,0.8);color:#c4b5fd;border:1px solid #7c3aed;border-radius:6px;font-size:11px;font-weight:600;padding:2px 6px;backdrop-filter:blur(4px);white-space:nowrap}
    .ap-popup .leaflet-popup-content-wrapper{background:#0f172a;border:1px solid #f97316;border-radius:10px;color:#e2e8f0}
    .ap-popup .leaflet-popup-tip{background:#0f172a}
    .fir-popup .leaflet-popup-content-wrapper{background:#0f172a;border:1px solid #8b5cf6;border-radius:10px;color:#e2e8f0}
    .fir-popup .leaflet-popup-tip{background:#0f172a}
  `;
  document.head.appendChild(s);
})();

// ══════════════════════════════════════════════════════════════
//  EVENTOS
// ══════════════════════════════════════════════════════════════
document.getElementById("refreshBtn").addEventListener("click", fetchPlanes);
document
  .getElementById("rainRadarBtn")
  .addEventListener("click", toggleRainRadar);
document
  .getElementById("themeBtn")
  .addEventListener("click", () => {
    const next = mapTheme === "dark" ? "light" : mapTheme === "light" ? "satellite" : "dark";
    setTiles(next);
  });
document.getElementById("selClose").addEventListener("click", deselectPlane);
document
  .getElementById("selCenterBtn")
  .addEventListener("click", centerOnSelected);
document.getElementById("firBtn").addEventListener("click", toggleFir);
document
  .getElementById("locateBtn")
  .addEventListener("click", locateUserAndCenter);
document
  .getElementById("corridorBtn")
  .addEventListener("click", toggleAirCorridors);
document.getElementById("installBtn").addEventListener("click", promptInstall);
document
  .getElementById("searchClearBtn")
  .addEventListener("click", clearSearchBox);
document
  .getElementById("operatorFocusClear")
  ?.addEventListener("click", clearOperatorFocus);
document
  .getElementById("mopClearBtn")
  ?.addEventListener("click", (e) => {
    e.stopPropagation();
    clearOperatorFocus();
  });
function openPlanePhotoLink() {
  const photoImg = document.getElementById("selPhotoImg");
  const link = photoImg?.dataset.link;
  if (link) {
    window.open(link, "_blank", "noopener,noreferrer");
  } else if (selectedHex) {
    const p = planeStore[selectedHex];
    const query = (p && (p.r || p.reg)) || selectedHex;
    window.open(`https://www.planespotters.net/search?q=${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
  }
}
document.getElementById("selPhotoImg")?.addEventListener("click", (e) => {
  e.stopPropagation();
  openPlanePhotoLink();
});
document.getElementById("selPhoto")?.addEventListener("click", () => {
  openPlanePhotoLink();
});
document.querySelectorAll(".ap-tab").forEach((tab) => {
  tab.setAttribute("role", "button");
  tab.setAttribute("tabindex", "0");
  tab.addEventListener("click", () => switchApTab(tab.dataset.tab));
  tab.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      switchApTab(tab.dataset.tab);
    }
  });
});
document.getElementById("corridorApplyBtn").addEventListener("click", () => {
  showCorridorsForAirport(
    document.getElementById("corridorAirportInput")?.value ||
      corridorAirportCode,
  );
});
document
  .getElementById("corridorClearBtn")
  .addEventListener("click", () => clearAirCorridors());
document
  .getElementById("corridorAirportInput")
  .addEventListener("keydown", (e) => {
    if (e.key === "Enter")
      showCorridorsForAirport(e.currentTarget.value || corridorAirportCode);
  });
document
  .getElementById("corridorAirportInput")
  .addEventListener("change", (e) => {
    const value = e.currentTarget.value.trim();
    if (value) showCorridorsForAirport(value);
  });
document.querySelectorAll(".corridor-mode-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    corridorMode = btn.dataset.corridorMode || "both";
    updateCorridorUI();
    if (showAirCorridors)
      showCorridorsForAirport(corridorAirportCode, { fit: false });
  });
});
document.querySelectorAll(".leg-filter").forEach((btn) => {
  btn.setAttribute("role", "button");
  btn.setAttribute("tabindex", "0");
  btn.addEventListener("click", () => applyFilter(btn.dataset.filter));
  btn.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      applyFilter(btn.dataset.filter);
    }
  });
});
document
  .getElementById("selSearchBtn")
  ?.addEventListener("click", openSearchFromCard);

document.addEventListener("click", (e) => {
  const watchOpen = e.target.closest("[data-watch-open]");
  if (watchOpen) {
    openWatchItem(watchOpen.dataset.watchOpen);
    return;
  }
  const watchRemove = e.target.closest("[data-watch-remove]");
  if (watchRemove) {
    removeWatchItem(watchRemove.dataset.watchType, watchRemove.dataset.watchRemove);
    return;
  }
});

document.addEventListener("click", (e) => {
  const planeBtn = e.target.closest("[data-select-plane]");
  if (!planeBtn) return;
  const hex = planeBtn.dataset.selectPlane;
  if (!hex || !planeStore[hex]) return;
  if (planeBtn.dataset.closeAirport === "true") closeAirportModal();
  selectPlane(hex);
  if (planeBtn.dataset.centerAfter === "true")
    setTimeout(centerOnSelected, 100);
});
document.addEventListener("click", (e) => {
  const operatorBtn = e.target.closest("[data-operator-focus]");
  if (!operatorBtn) return;
  setOperatorFocus(operatorBtn.dataset.operatorFocus);
});
document.addEventListener("click", (e) => {
  const airportModeBtn = e.target.closest("[data-open-airport-mode]");
  const corridorBtn = e.target.closest("[data-show-corridors]");
  const weatherBtn = e.target.closest("[data-open-weather]");
  if (airportModeBtn) openAirportMode(airportModeBtn.dataset.openAirportMode);
  if (corridorBtn) showCorridorsForAirport(corridorBtn.dataset.showCorridors);
  if (weatherBtn)
    window.open(
      `https://aviationweather.gov/data/metar/?ids=${encodeURIComponent(weatherBtn.dataset.openWeather)}`,
      "_blank",
      "noopener",
    );
});
document.getElementById("pcPhoto")?.addEventListener("click", (e) => {
  const link = e.currentTarget.dataset.link;
  if (link) window.open(link, "_blank", "noopener");
});
document
  .getElementById("mobileMiniCard")
  ?.addEventListener("click", openMobileModal_full);
document
  .getElementById("mobileFlightCard")
  ?.addEventListener("click", openMobileModal_full);
document
  .getElementById("mobileFlightCloseBtn")
  ?.addEventListener("click", (e) => {
    e.stopPropagation();
    deselectPlane();
  });
document
  .getElementById("mobileFlightSearchBtn")
  ?.addEventListener("click", (e) => {
    e.stopPropagation();
    openSearchFromCard();
  });
document
  .getElementById("mobileFlightViewFavoritesBtn")
  ?.addEventListener("click", (e) => {
    e.stopPropagation();
    openFavoritesFromCard();
  });
document
  .getElementById("mobileFlightCenterBtn")
  ?.addEventListener("click", (e) => {
    e.stopPropagation();
    centerOnSelected();
  });
document
  .getElementById("mobileFlightInfoBtn")
  ?.addEventListener("click", (e) => {
    e.stopPropagation();
    openMobileModal_full();
  });
document
  .getElementById("mobileFlightFavoriteBtn")
  ?.addEventListener("click", (e) => {
    e.stopPropagation();
    addSelectedFavorite();
  });
document
  .getElementById("mobileFlightAlertBtn")
  ?.addEventListener("click", (e) => {
    e.stopPropagation();
    addSelectedAlert();
  });
document
  .getElementById("mobileFlightShareBtn")
  ?.addEventListener("click", (e) => {
    e.stopPropagation();
    shareSelectedPlane();
  });
document
  .getElementById("mobileFiltersToggleBtn")
  .addEventListener("click", toggleMobileFilters);
document
  .getElementById("mobileMoreToggleBtn")
  .addEventListener("click", toggleMobileMore);
document.getElementById("searchBox").addEventListener("input", (e) => {
  syncSearchInputs("desktop");
  const val = (e.target.value || "").trim().toLowerCase();
  if (val === "demo" || val === "demonheu") {
    openDemoMode();
    return;
  }
  searchPlane(e.target.value);
});
document.getElementById("searchBox").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const val = (e.target.value || "").trim().toLowerCase();
    if (val === "demo" || val === "demonheu") {
      e.preventDefault();
      openDemoMode();
      e.target.value = "";
      clearSearchBox();
    }
  }
});
document.getElementById("mobileSearchBox").addEventListener("input", (e) => {
  syncSearchInputs("mobile");
  const val = (e.target.value || "").trim().toLowerCase();
  if (val === "demo" || val === "demonheu") {
    openDemoMode();
    return;
  }
  searchPlane(e.target.value);
});
document.getElementById("mobileSearchBox").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const val = (e.target.value || "").trim().toLowerCase();
    if (val === "demo" || val === "demonheu") {
      e.preventDefault();
      openDemoMode();
      e.target.value = "";
      clearSearchBox();
    }
  }
});
document.getElementById("mobileSearchBox").addEventListener("focus", () => {
  if (!isMobile()) return;
  document.body.classList.add("mobile-searching");
  closeMobileMenus();
});
document.getElementById("mobileSearchBox").addEventListener("blur", () => {
  document.body.classList.remove("mobile-searching");
});
document
  .getElementById("mobileSearchFocusBtn")
  .addEventListener("click", () => {
    closeMobileMenus();
    document.getElementById("mobileSearchBox").focus();
  });
document
  .getElementById("mobileSearchClearBtn")
  .addEventListener("click", clearSearchBox);
document
  .getElementById("mobileAirportSearchBtn")
  .addEventListener("click", () => {
    closeMobileMenus();
    openAirportModal();
  });
document.getElementById("mobileAirportsBtn").addEventListener("click", () => {
  closeMobileMenus();
  document.getElementById("airportBtn").click();
});
document.getElementById("mobileLivePill").addEventListener("click", () => {
  const hex = document.getElementById("mobileLivePill")?.dataset.hex;
  if (!hex || !planeStore[hex]) return;
  closeMobileMenus();
  if (activeFilter !== "all" && activeFilter !== "heli") applyFilter("heli");
  selectPlane(hex);
  centerOnSelected();
});
document.getElementById("mobileFirBtn").addEventListener("click", () => {
  closeMobileMenus();
  document.getElementById("firBtn").click();
});
document.getElementById("mobileRainBtn").addEventListener("click", () => {
  closeMobileMenus();
  toggleRainRadar();
});
document.getElementById("mobileCorridorBtn").addEventListener("click", () => {
  closeMobileMenus();
  toggleAirCorridors();
});
document
  .getElementById("mobileLocateBtn")
  .addEventListener("click", locateUserAndCenter);
document
  .getElementById("mobileThemeBtn")
  .addEventListener("click", () => {
    const next = mapTheme === "dark" ? "light" : mapTheme === "light" ? "satellite" : "dark";
    setTiles(next);
  });

document.querySelectorAll(".mobile-filter-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    applyFilter(btn.dataset.filter);
    closeMobileMenus();
  });
});
document
  .getElementById("searchBox")
  .addEventListener("focus", () => setMobilePanelExpanded(true));

document.addEventListener("keydown", (e) => {
  const activeEl = document.activeElement;
  const activeTag = activeEl?.tagName || "";
  const isTyping =
    ["INPUT", "TEXTAREA"].includes(activeTag) || activeEl?.isContentEditable;

  if (e.key === "Escape") {
    deselectPlane();
    document.getElementById("searchBox").value = "";
    document.getElementById("mobileSearchBox").value = "";
    searchPlane("");
    syncSearchClearButton();
    clearOperatorFocus();
  }
  if (
    e.key === "Enter" &&
    document.activeElement === document.getElementById("searchBox")
  ) {
    searchPlane(document.getElementById("searchBox").value);
  }
  if (isTyping) return;

  const key = e.key.toLowerCase();
  if (key === "r") fetchPlanes();
  if (key === "/") {
    e.preventDefault();
    setMobilePanelExpanded(true);
    (isMobile()
      ? document.getElementById("mobileSearchBox")
      : document.getElementById("searchBox")
    ).focus();
  }
  if (key === "t") {
    const next = mapTheme === "dark" ? "light" : mapTheme === "light" ? "satellite" : "dark";
    setTiles(next);
  }
  if (key === "f") cycleFilter();
  if (key === "l") locateUserAndCenter();
});

document
  .getElementById("airportBtn")
  .addEventListener("click", async function () {
    showAirports = !showAirports;
    updateWeatherButtons();
    if (showAirports && !airportsLoaded) await fetchGlobalAirports();
    renderAirports();
    updateWeatherButtons();
  });

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const banner = document.getElementById("installBanner");
  if (banner && window.innerWidth <= 768 && !detectStandalone())
    banner.style.display = "flex";
});

window.addEventListener("online", () => updateNetworkState(true));
window.addEventListener("offline", () => updateNetworkState(true));

// ══════════════════════════════════════════════════════════════
//  ARRANQUE
// ══════════════════════════════════════════════════════════════
runViewportRefresh();
initMap();
scheduleViewportRefresh();
applyFilter(activeFilter);
updateNetworkState(false);
fetchGlobalCount();
setInterval(fetchGlobalCount, 60000);

map.on("moveend", () => {
  renderAirports();
  renderMilitaryBases();
  renderAirCorridors({ silent: true });
  updateCorridorAirportOptions();
});
setTimeout(() => {
  renderAirports();
  renderMilitaryBases();
  renderAirCorridors({ silent: true });
  updateCorridorAirportOptions();
}, 400);

let moveTimer = null;
map.on("move", () => {
  updateVisibleCount();
  updateHudStats();
  updateMobileChrome();
  clearTimeout(moveTimer);
  moveTimer = setTimeout(updateMobileNearbyList, 120);
});

map.on("moveend", () => {
  clearTimeout(moveTimer);
  updateMobileNearbyList();
  scheduleFetchPlanes(260);
});

updateHudStats();
updateVisibleCount();
syncSearchClearButton();
updateMobileNearbyList();
window.NheuWatch?.init()
  .then(updateWatchPanel)
  .catch(() => {});
hydratePlanesSnapshot().catch(() => {});

window.addEventListener("resize", () => {
  scheduleViewportRefresh();
});

window.addEventListener("orientationchange", scheduleViewportRefresh);
window.addEventListener("pageshow", scheduleViewportRefresh);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) scheduleViewportRefresh();
});

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", scheduleViewportRefresh);
  window.visualViewport.addEventListener("scroll", () => {
    if (!detectStandalone()) scheduleViewportRefresh();
  });
}

// Cargar aviones inmediatamente al abrir la web (sin demoras ni bloqueos)
fetchPlanes();

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLat = pos.coords.latitude;
      userLon = pos.coords.longitude;
      window.userLat = userLat;
      window.userLon = userLon;
      map.setView([userLat, userLon], 9);
      fetchPlanes();
    },
    () => {
      // Ubicación no concedida: los aviones ya se cargaron en la vista inicial
    },
    { enableHighAccuracy: false, timeout: 5000 },
  );
}

// Exportar funciones y estado clave a window para la interfaz moderna
window.planeStore = planeStore;
window.selectedHex = selectedHex;
window.selectPlane = selectPlane;
window.deselectPlane = deselectPlane;
window.renderSelected = renderSelected;
window.centerOnSelected = centerOnSelected;
window.shareSelectedPlane = shareSelectedPlane;
window.userLat = userLat;
window.userLon = userLon;
window.fetchPlanes = fetchPlanes;
window.returnToUserPlanePosition = returnToUserPlanePosition;
window.locateUserAndCenter = locateUserAndCenter;

// ══════════════════════════════════════════════════════════════
//  MODO DEMO Y SIMULACIÓN (ACTIVADO CON 'demo' + ENTER)
// ══════════════════════════════════════════════════════════════
let isDemoModeActive = false;
let demoOriginalPlaneBackups = {}; // Guarda estado original de aviones modificados
let demoSpawnedHexes = new Set(); // Guarda los hex de aviones ficticios creados

function openDemoMode() {
  isDemoModeActive = true;
  const modal = document.getElementById("demoNheuModal");
  if (modal) modal.classList.add("active");
  updateDemoPlaneInfo();
  setStatus("Modo Demo NheuFlight Activado", "ok");
}
window.openDemoMode = openDemoMode;

function closeDemoModal() {
  const modal = document.getElementById("demoNheuModal");
  if (modal) modal.classList.remove("active");
}

function exitDemoMode() {
  isDemoModeActive = false;
  closeDemoModal();

  // 1. Eliminar todos los aviones ficticios generados en la demo
  demoSpawnedHexes.forEach((h) => {
    delete planeStore[h];
  });
  demoSpawnedHexes.clear();

  // 2. Restaurar los aviones reales que fueron modificados durante la demo
  Object.keys(demoOriginalPlaneBackups).forEach((h) => {
    if (planeStore[h]) {
      planeStore[h] = { ...demoOriginalPlaneBackups[h] };
    }
  });
  demoOriginalPlaneBackups = {};

  // 3. Si el seleccionado era ficticio o modificado, deseleccionar
  if (selectedHex && (!planeStore[selectedHex] || selectedHex.startsWith("DEMO"))) {
    deselectPlane();
  } else if (selectedHex) {
    renderSelected(selectedHex, false, false);
  }

  // 4. Forzar recarga inmediata de aviones reales
  if (typeof fetchPlanes === "function") {
    fetchPlanes();
  }
  updateSquawkAlerts();
  updateVisibleCount();
  updateHudStats();
  if (canvasLayer) canvasLayer.redraw();
  setStatus("Modo Demo Apagado. Aviones reales restaurados", "ok");
}

function updateDemoPlaneInfo() {
  const info = document.getElementById("demoPlaneInfo");
  if (!info) return;
  if (selectedHex && planeStore[selectedHex]) {
    const p = planeStore[selectedHex];
    const cls = classifyAircraft(p);
    info.innerHTML = `<strong>Avión Seleccionado:</strong> ${escapeHTML(p.call || p.hex)} (${escapeHTML(p.r || p.reg || p.hex)})<br>` +
      `<span style="color: ${cls.hex}; font-weight: 600;">Tipo: ${escapeHTML(cls.label)}</span> · Squawk: <strong>${p.squawk || "—"}</strong> · Alt: ${p.alt || 0} ft`;
  } else {
    info.innerHTML = "<em>No hay ningún avión seleccionado. Puedes crear uno con los botones inferiores o tocar cualquier avión del mapa.</em>";
  }
}

function getMapCenterTarget() {
  if (map) {
    const c = map.getCenter();
    // Añadir una pequeña variación aleatoria para no solapar si se crean varios
    const dLat = (Math.random() - 0.5) * 0.05;
    const dLon = (Math.random() - 0.5) * 0.05;
    return { lat: c.lat + dLat, lon: c.lng + dLon };
  }
  return { lat: 41.3879, lon: 2.1699 };
}

function spawnDemoPlane(type) {
  const coords = getMapCenterTarget();
  const hex = "DEMO" + Math.floor(1000 + Math.random() * 9000);
  let plane = {
    hex,
    lat: coords.lat,
    lon: coords.lon,
    ilat: coords.lat,
    ilon: coords.lon,
    alt: 2500,
    spd: 120,
    spdKmh: 220,
    trk: Math.floor(Math.random() * 360),
    fetchedAt: Date.now() + 3600000, // Duración extendida en cache
    orig: "LEBL",
    dest: "LEMD",
    origCity: "Barcelona",
    destCity: "Madrid",
  };

  if (type === "dgt") {
    plane = {
      ...plane,
      call: "DGT01",
      r: "EC-LKL",
      reg: "EC-LKL",
      category: "A7",
      t: "EC35",
      type: "EC35",
      alt: 1200,
      spd: 90,
      spdKmh: 160,
      squawk: "7000",
      _acOperator: "DGT",
    };
  } else if (type === "sem") {
    plane = {
      ...plane,
      call: "HELISEM01",
      r: "EC-NMY",
      reg: "EC-NMY",
      category: "A7",
      t: "EC45",
      type: "EC45",
      alt: 1500,
      spd: 110,
      spdKmh: 200,
      squawk: "7000",
      _acOperator: "SEM / 112",
    };
  } else if (type === "mossos") {
    plane = {
      ...plane,
      call: "PROXIMA01",
      r: "EC-MRA",
      reg: "EC-MRA",
      category: "A7",
      t: "EC35",
      type: "EC35",
      alt: 1400,
      spd: 100,
      spdKmh: 185,
      squawk: "7000",
      _acOperator: "Mossos d'Esquadra",
    };
  } else if (type === "gcivil") {
    plane = {
      ...plane,
      call: "CUCOS01",
      r: "EC-FRP",
      reg: "EC-FRP",
      category: "A7",
      t: "EC35",
      type: "EC35",
      alt: 1600,
      spd: 95,
      spdKmh: 175,
      squawk: "7000",
      _acOperator: "Guardia Civil",
    };
  } else if (type === "mayday") {
    plane = {
      ...plane,
      call: "MAYDAY77",
      r: "EC-SOS",
      reg: "EC-SOS",
      category: "A3",
      t: "A320",
      type: "A320",
      alt: 8500,
      spd: 280,
      spdKmh: 518,
      squawk: "7700",
      _acOperator: "Iberia",
    };
  } else if (type === "ryanair") {
    plane = {
      ...plane,
      call: "RYR454",
      r: "9H-QAH",
      reg: "9H-QAH",
      category: "A3",
      t: "B738",
      type: "B738",
      alt: 32000,
      spd: 440,
      spdKmh: 815,
      squawk: "1000",
      _acOperator: "Ryanair",
      orig: "LEBL",
      dest: "EGSS",
      origCity: "Barcelona",
      destCity: "Londres",
    };
  }

  demoSpawnedHexes.add(hex);
  planeStore[hex] = plane;
  startInterp();
  selectPlane(hex);
  if (canvasLayer) canvasLayer.redraw();
  updateDemoPlaneInfo();
  setStatus(`Aeronave de prueba generada (${plane.call})`, "ok");
}

function modifySelectedPlane(patch) {
  if (!selectedHex || !planeStore[selectedHex]) {
    // Si no hay ninguno seleccionado, crear uno comercial base y aplicarle el parche
    spawnDemoPlane("ryanair");
  }
  const p = planeStore[selectedHex];
  if (!p) return;

  // Si es un avión real (no generado por demo), guardar copia de seguridad de su estado original
  if (!demoSpawnedHexes.has(selectedHex) && !demoOriginalPlaneBackups[selectedHex]) {
    demoOriginalPlaneBackups[selectedHex] = { ...p };
  }

  Object.assign(p, patch);
  aircraftClassifications.delete(p);
  p.fetchedAt = Date.now() + 3600000;

  renderSelected(selectedHex, false, false);
  if (canvasLayer) canvasLayer.redraw();
  updateDemoPlaneInfo();
  updateSquawkAlerts();
  setStatus(`Parámetros de ${p.call || p.hex} actualizados`, "ok");
}

// Event Listeners del Panel Demo
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("demoCloseBtn")?.addEventListener("click", closeDemoModal);
  document.getElementById("demoExitBtn")?.addEventListener("click", exitDemoMode);

  // Spawners
  document.getElementById("demoSpawnDGT")?.addEventListener("click", () => spawnDemoPlane("dgt"));
  document.getElementById("demoSpawnSEM")?.addEventListener("click", () => spawnDemoPlane("sem"));
  document.getElementById("demoSpawnMossos")?.addEventListener("click", () => spawnDemoPlane("mossos"));
  document.getElementById("demoSpawnGCivil")?.addEventListener("click", () => spawnDemoPlane("gcivil"));
  document.getElementById("demoSpawnMayday")?.addEventListener("click", () => spawnDemoPlane("mayday"));
  document.getElementById("demoSpawnCom")?.addEventListener("click", () => spawnDemoPlane("ryanair"));

  // Modificadores de avión seleccionado
  document.getElementById("demoSetDGT")?.addEventListener("click", () => {
    modifySelectedPlane({
      call: "DGT_DEMO",
      r: "EC-LKL",
      reg: "EC-LKL",
      category: "A7",
      t: "EC35",
      type: "EC35",
      _acOperator: "DGT",
    });
  });

  document.getElementById("demoSetSEM")?.addEventListener("click", () => {
    modifySelectedPlane({
      call: "HELISEM",
      r: "EC-NMY",
      reg: "EC-NMY",
      category: "A7",
      t: "EC45",
      type: "EC45",
      _acOperator: "SEM / 112",
    });
  });

  document.getElementById("demoSetMossos")?.addEventListener("click", () => {
    modifySelectedPlane({
      call: "PROXIMA",
      r: "EC-MRA",
      reg: "EC-MRA",
      category: "A7",
      t: "EC35",
      type: "EC35",
      _acOperator: "Mossos d'Esquadra",
    });
  });

  document.getElementById("demoSetGCivil")?.addEventListener("click", () => {
    modifySelectedPlane({
      call: "CUCOS",
      r: "EC-FRP",
      reg: "EC-FRP",
      category: "A7",
      t: "EC35",
      type: "EC35",
      _acOperator: "Guardia Civil",
    });
  });

  // Modificadores de Squawk / Transponder
  document.getElementById("demoSquawk7700")?.addEventListener("click", () => {
    modifySelectedPlane({ squawk: "7700" });
  });

  document.getElementById("demoSquawk7600")?.addEventListener("click", () => {
    modifySelectedPlane({ squawk: "7600" });
  });

  document.getElementById("demoSquawk7500")?.addEventListener("click", () => {
    modifySelectedPlane({ squawk: "7500" });
  });

  document.getElementById("demoSquawkNormal")?.addEventListener("click", () => {
    modifySelectedPlane({ squawk: "7000" });
  });
});


