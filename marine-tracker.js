// ══════════════════════════════════════════════════════════════
//  NheuFlight — Módulo de Buques en Vivo (AIS Global Dinámico)
// ══════════════════════════════════════════════════════════════

(function (window) {
  "use strict";

  const VESSEL_TTL_MS = 25 * 60 * 1000;

  let map = null;
  let canvasLayer = null;
  let vesselPollTimer;
  let vesselRequest;
  let subDebounceTimer = null;
  let vesselsStore = {};
  let selectedMmsi = null;
  let isEnabled = false;
  let activeFilter = "all";

  function getVesselsHelper() {
    return window.NheuMarineVessels || {};
  }

  function getVesselClassification(v) {
    if (!v) return { id: "other", shape: "other", color: "#94a3b8", name: "Otro Buque" };
    const helpers = getVesselsHelper();
    if (typeof helpers.classifyVessel !== "function") {
      return { id: "other", shape: "other", color: "#94a3b8", name: "Otro Buque" };
    }
    if (!v._cls || v._cls.id === "other") {
      v._cls = helpers.classifyVessel(v);
    }
    return v._cls;
  }

  function getMapInstance() {
    if (map) return map;
    if (window.map) {
      init(window.map);
      return map;
    }
    return null;
  }

  // ── CAPA CANVAS LEAFLET 60 FPS ──
  const CanvasVesselLayer = L.Layer.extend({
    onAdd(leafletMap) {
      this._map = leafletMap;
      this._canvas = L.DomUtil.create("canvas", "leaflet-zoom-animated");
      this._canvas.style.pointerEvents = "none";
      this._canvas.style.zIndex = "450";
      const pane = leafletMap.getPane("overlayPane");
      pane.appendChild(this._canvas);
      this._ctx = this._canvas.getContext("2d");
      this._drawQueued = false;

      leafletMap.on("move", this._requestDraw, this);
      leafletMap.on("resize", this._requestDraw, this);
      leafletMap.on("click", this._onMapClick, this);
      leafletMap.on("mousemove", this._onMapMouseMove, this);

      this._resize();
      return this;
    },

    onRemove(leafletMap) {
      if (this._canvas && this._canvas.parentNode) {
        this._canvas.parentNode.removeChild(this._canvas);
      }
      leafletMap.off("move", this._requestDraw, this);
      leafletMap.off("resize", this._requestDraw, this);
      leafletMap.off("click", this._onMapClick, this);
      leafletMap.off("mousemove", this._onMapMouseMove, this);
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

    redraw() {
      this._requestDraw();
    },

    _draw() {
      const m = this._map || getMapInstance();
      if (!m || !this._canvas) return;

      const size = m.getSize();
      const topLeft = m.containerPointToLayerPoint([0, 0]);
      const position = L.DomUtil.getPosition(this._canvas);
      if (!position || !position.equals(topLeft)) {
        L.DomUtil.setPosition(this._canvas, topLeft);
        this._canvas.style.transform = `translate3d(${topLeft.x}px, ${topLeft.y}px, 0px)`;
      }

      if (this._canvas.width !== size.x) this._canvas.width = size.x;
      if (this._canvas.height !== size.y) this._canvas.height = size.y;

      const ctx = this._ctx;
      ctx.clearRect(0, 0, size.x, size.y);

      const bounds = m.getBounds();
      const pad = 0.35;
      const north = bounds.getNorth() + pad;
      const south = bounds.getSouth() - pad;
      const east = bounds.getEast() + pad;
      const west = bounds.getWest() - pad;

      const vessels = Object.values(vesselsStore);
      const zoom = m.getZoom();
      const helpers = getVesselsHelper();

      for (const v of vessels) {
        if (v.lat > north || v.lat < south || v.lon > east || v.lon < west) continue;

        const isSelected = v.mmsi === selectedMmsi;
        const cls = getVesselClassification(v);

        // Filtrado por categoría
        if (!isSelected && activeFilter !== "all" && cls.id !== activeFilter) {
          continue;
        }

        const pt = m.latLngToContainerPoint([v.lat, v.lon]);
        const lengthM = v.length || 50;
        const renderSize = isSelected ? 38 : Math.min(32, Math.max(20, Math.round(lengthM / 9)));
        const half = renderSize / 2;

        const img = typeof helpers.createVesselCanvas === "function"
          ? helpers.createVesselCanvas(cls.shape, cls.color, renderSize, isSelected)
          : null;

        ctx.save();
        ctx.translate(pt.x, pt.y);

        const speedKnots = v.sog || 0;
        if (speedKnots > 0.5) {
          const vectorLen = Math.min(40, Math.max(10, speedKnots * 1.6));
          ctx.save();
          ctx.rotate(((v.cog || v.heading || 0) * Math.PI) / 180);
          ctx.beginPath();
          ctx.moveTo(0, -half);
          ctx.lineTo(0, -half - vectorLen);
          ctx.strokeStyle = cls.color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }

        ctx.rotate(((v.cog || v.heading || 0) * Math.PI) / 180);
        if (img) {
          ctx.drawImage(img, -half, -half, renderSize, renderSize);
        } else {
          ctx.fillStyle = cls.color;
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();

        if (zoom >= 11 || isSelected) {
          ctx.save();
          ctx.font = '600 10px "Inter", sans-serif';
          ctx.textAlign = "center";
          ctx.fillStyle = isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.9)";
          ctx.shadowColor = "#000000";
          ctx.shadowBlur = 4;
          ctx.fillText(v.name || `MMSI ${v.mmsi}`, pt.x, pt.y + half + 12);
          ctx.restore();
        }
      }
    },

    _findVesselAtPoint(containerPoint, radius = 22) {
      const m = this._map || getMapInstance();
      if (!m) return null;
      for (const v of Object.values(vesselsStore)) {
        if (activeFilter !== "all" && v.mmsi !== selectedMmsi) {
          const cls = getVesselClassification(v);
          if (cls.id !== activeFilter) continue;
        }
        const pt = m.latLngToContainerPoint([v.lat, v.lon]);
        const dx = pt.x - containerPoint.x;
        const dy = pt.y - containerPoint.y;
        if (dx * dx + dy * dy <= radius * radius) {
          return v;
        }
      }
      return null;
    },

    _onMapClick(e) {
      if (!isEnabled) return;
      const v = this._findVesselAtPoint(e.containerPoint);
      if (v) {
        selectMarineVessel(v.mmsi);
      }
    },

    _onMapMouseMove(e) {
      if (!isEnabled) return;
      const v = this._findVesselAtPoint(e.containerPoint);
      const tip = document.getElementById("canvasTooltip");
      const m = this._map || getMapInstance();
      if (v) {
        if (m && m._container) m._container.style.cursor = "pointer";
        if (tip) {
          const cls = getVesselClassification(v);
          tip.innerHTML = `
            <div style="font-weight:700;color:${cls.color};display:flex;align-items:center;gap:5px;">
              <i class="fas fa-ship"></i> ${v.name || `MMSI ${v.mmsi}`}
            </div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">
              ${cls.name} • ${(v.sog || 0).toFixed(1)} kn • ${Math.round(v.cog || v.heading || 0)}°
            </div>
          `;
          tip.style.display = "block";
          tip.style.left = e.containerPoint.x + "px";
          tip.style.top = (e.containerPoint.y - 12) + "px";
        }
      } else {
        if (m && m._container && !window.hoveredHex) m._container.style.cursor = "";
      }
    }
  });

  // ── CARGA INMEDIATA DESDE SERVIDOR LOCAL / PROXY ──
  async function fetchServerVessels() {
    const m = getMapInstance();
    if (!m || !isEnabled || vesselRequest) return;
    const controller = new AbortController();
    vesselRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const b = m.getBounds();
      const base = window.NHEU_MARINE_BACKEND_API || window.NHEU_FLIGHT_BACKEND_API || location.origin;
      const url = new URL(base.replace(/\/$/, "") + "/api/vessels");
      url.searchParams.set("south", (b.getSouth() - 0.3).toFixed(3));
      url.searchParams.set("west", (b.getWest() - 0.3).toFixed(3));
      url.searchParams.set("north", (b.getNorth() + 0.3).toFixed(3));
      url.searchParams.set("east", (b.getEast() + 0.3).toFixed(3));

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return;
      const list = await res.json();
      if (!controller.signal.aborted && isEnabled && Array.isArray(list)) {
        list.forEach((v) => {
          if (v.mmsi && v.lat != null && v.lon != null) {
            vesselsStore[v.mmsi] = Object.assign(vesselsStore[v.mmsi] || {}, v);
          }
        });
        if (canvasLayer) canvasLayer.redraw();
      }
    } catch {
      // La siguiente actualización volverá a consultar al servidor.
    } finally {
      clearTimeout(timeout);
      if (vesselRequest === controller) vesselRequest = null;
    }
  }

  function queueDynamicSubscription() {
    clearTimeout(subDebounceTimer);
    if (!isEnabled) return;
    subDebounceTimer = setTimeout(() => {
      fetchServerVessels();
      pruneOffscreenVessels();
    }, 450);
  }

  function pruneOffscreenVessels() {
    const m = getMapInstance();
    if (!m) return;
    const b = m.getBounds();
    const pad = 1.0;
    const north = b.getNorth() + pad;
    const south = b.getSouth() - pad;
    const east = b.getEast() + pad;
    const west = b.getWest() - pad;
    const now = Date.now();

    for (const [mmsi, v] of Object.entries(vesselsStore)) {
      if (mmsi === selectedMmsi) continue;
      if (v.lat > north || v.lat < south || v.lon > east || v.lon < west || (now - v.updatedAt > VESSEL_TTL_MS)) {
        delete vesselsStore[mmsi];
      }
    }
    if (canvasLayer) canvasLayer.redraw();
  }

  // ── SELECCIÓN Y DETALLES EN VESSEL-CARD ──
  function selectMarineVessel(mmsi) {
    selectedMmsi = mmsi;
    const v = vesselsStore[mmsi];
    if (!v) return;

    if (canvasLayer) canvasLayer.redraw();

    if (typeof window.deselectPlane === "function") {
      window.deselectPlane();
    }

    showMarineCard(v);
  }

  function deselectMarineVessel() {
    selectedMmsi = null;
    if (canvasLayer) canvasLayer.redraw();
  }

  function showMarineCard(v) {
    const card = document.getElementById("vesselCard");
    if (!card) return;

    const cls = getVesselClassification(v);

    const cardName = document.getElementById("cardName");
    if (cardName) cardName.textContent = v.name || `MMSI ${v.mmsi}`;

    const cardCatText = document.getElementById("cardCategoryText");
    if (cardCatText) cardCatText.textContent = `${cls.name} • MMSI ${v.mmsi}`;

    const cardBadge = document.getElementById("cardBadgeIcon") || document.getElementById("cardBadge");
    if (cardBadge) {
      cardBadge.innerHTML = `<i class="fas fa-ship"></i>`;
      cardBadge.style.color = cls.color;
      cardBadge.style.borderColor = cls.color + "55";
    }

    const speedKn = v.sog != null ? v.sog.toFixed(1) : "0.0";
    const speedKmh = v.sog != null ? (v.sog * 1.852).toFixed(1) : "0.0";
    const speedKnEl = document.getElementById("cardSpeedKn") || document.getElementById("cardSpeedKt");
    if (speedKnEl) speedKnEl.textContent = `${speedKn} kn`;
    const speedKmhEl = document.getElementById("cardSpeedKmh");
    if (speedKmhEl) speedKmhEl.textContent = `${speedKmh} km/h`;

    const altFt = document.getElementById("cardAltFt");
    if (altFt) altFt.textContent = "Nivel Mar";
    const altM = document.getElementById("cardAltM");
    if (altM) altM.textContent = v.length ? `Eslora: ${v.length}m` : "0 m";

    const course = document.getElementById("cardCourse");
    if (course) course.textContent = `${Math.round(v.heading || v.cog || 0)}°`;

    const vspeed = document.getElementById("cardVspeed");
    if (vspeed) {
      vspeed.textContent = v.sog > 0.5 ? "Navegando" : "Fondeado";
      vspeed.style.color = v.sog > 0.5 ? "#22c55e" : "#94a3b8";
    }

    const reg = document.getElementById("cardReg");
    if (reg) reg.textContent = v.callsign || `MMSI: ${v.mmsi}`;

    const squawk = document.getElementById("cardSquawk");
    if (squawk) squawk.textContent = v.imo ? `IMO: ${v.imo}` : `MMSI: ${v.mmsi}`;

    const dest = document.getElementById("cardDestination");
    if (dest) dest.textContent = v.destination || "En travesía / Mar abierto";

    const destIcon = document.getElementById("cardDestIcon");
    if (destIcon) destIcon.className = "fas fa-anchor";

    const photoCont = document.getElementById("cardPhotoContainer");
    if (photoCont) photoCont.style.display = "none";

    const cockpitBtn = document.getElementById("cardCockpitBtn");
    if (cockpitBtn) cockpitBtn.style.display = "none";

    card.classList.add("active");
  }

  // ── INICIALIZACIÓN DEL MÓDULO ──
  function init(leafletMap) {
    if (!leafletMap) return;
    map = leafletMap;

    if (!canvasLayer) {
      canvasLayer = new CanvasVesselLayer();
    }

    map.off("moveend", queueDynamicSubscription);
    map.on("moveend", queueDynamicSubscription);

    // Barcos desactivados por defecto al iniciar la web (solo aviones activos por defecto)
    setMarineLayerEnabled(false, false);
  }

  function setMarineFilter(filter) {
    activeFilter = filter || "all";
    if (canvasLayer) canvasLayer.redraw();
  }

  function setMarineLayerEnabled(enabled, persist = true) {
    isEnabled = !!enabled;
    if (persist) {
      localStorage.setItem("nheu_marine_layer", isEnabled ? "1" : "0");
    }

    const btn = document.getElementById("marineToggleBtn");
    if (btn) {
      btn.classList.toggle("active", isEnabled);
      btn.style.color = isEnabled ? "#38bdf8" : "";
    }

    const m = getMapInstance();
    clearInterval(vesselPollTimer);
    if (isEnabled) {
      if (m && canvasLayer && !m.hasLayer(canvasLayer)) {
        canvasLayer.addTo(m);
      }
      fetchServerVessels();
      vesselPollTimer = setInterval(() => {
        fetchServerVessels();
        pruneOffscreenVessels();
      }, 4000);
      console.log("⚓ [NheuMarine] Capa de barcos activada");
    } else {
      if (m && canvasLayer && m.hasLayer(canvasLayer)) {
        m.removeLayer(canvasLayer);
      }
      vesselRequest?.abort();
      vesselRequest = null;
      clearTimeout(subDebounceTimer);
      deselectMarineVessel();
      console.log("⚓ [NheuMarine] Capa de barcos desactivada");
    }

    if (typeof window.updateModernLayerUI === "function") {
      window.updateModernLayerUI();
    }
  }

  function toggleMarineLayer() {
    setMarineLayerEnabled(!isEnabled);
  }

  // Exponer API global
  window.MarineTracker = {
    init,
    toggle: toggleMarineLayer,
    setEnabled: setMarineLayerEnabled,
    isEnabled: () => isEnabled,
    getMap: () => map,
    selectVessel: selectMarineVessel,
    deselectVessel: deselectMarineVessel,
    getVessels: () => vesselsStore,
    setFilter: setMarineFilter,
    getFilter: () => activeFilter,
  };

  // Intentar conectar con el mapa inmediatamente o en eventos de carga
  if (window.map) {
    init(window.map);
  } else {
    window.addEventListener("DOMContentLoaded", () => {
      if (window.map) init(window.map);
    });
    window.addEventListener("load", () => {
      if (window.map) init(window.map);
    });
  }
})(typeof window !== "undefined" ? window : this);
