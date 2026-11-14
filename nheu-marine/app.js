// ══════════════════════════════════════════════════════════════
//  NheuMarine — Motor Principal y Renderizado AIS 60 FPS
// ══════════════════════════════════════════════════════════════

(function () {
  "use strict";

  const { VESSEL_CATEGORIES, classifyVessel, createVesselCanvas } = window.NheuMarineVessels;

  // Constantes de navegación
  const KNOTS_TO_KMH = 1.852;
  const DEG_TO_RAD = Math.PI / 180;
  const EARTH_RADIUS_KM = 6371;

  // Estado global
  let map;
  let canvasLayer;
  let vesselsStore = {};
  let selectedMmsi = null;
  let activeFilter = "all";
  let searchQuery = "";
  let interpTimer = null;

  // ══════════════════════════════════════════════════════════════
  //  CAPA CANVAS LEAFLET (Renderizado 60 FPS)
  // ══════════════════════════════════════════════════════════════
  const CanvasVesselLayer = L.Layer.extend({
    onAdd(map) {
      this._map = map;
      this._canvas = L.DomUtil.create("canvas", "leaflet-zoom-animated");
      const pane = map.getPane("overlayPane");
      pane.appendChild(this._canvas);
      this._ctx = this._canvas.getContext("2d");
      this._drawQueued = false;

      map.on("move", this._requestDraw, this);
      map.on("resize", this._requestDraw, this);
      map.on("click", this._onClick, this);
      map.on("mousemove", this._onMouseMove, this);
      map.on("mouseout", this._onMouseOut, this);

      this._resize();
      return this;
    },

    onRemove(map) {
      this._canvas.remove();
      map.off("move", this._requestDraw, this);
      map.off("resize", this._requestDraw, this);
      map.off("click", this._onClick, this);
      map.off("mousemove", this._onMouseMove, this);
      map.off("mouseout", this._onMouseOut, this);
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
      if (!this._map) return;

      const size = this._map.getSize();
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);
      this._canvas.style.transform = `translate3d(${topLeft.x}px, ${topLeft.y}px, 0px)`;

      this._canvas.width = size.x;
      this._canvas.height = size.y;

      const ctx = this._ctx;
      ctx.clearRect(0, 0, size.x, size.y);

      const bounds = this._map.getBounds();
      const pad = 0.4;
      const north = bounds.getNorth() + pad;
      const south = bounds.getSouth() - pad;
      const east = bounds.getEast() + pad;
      const west = bounds.getWest() - pad;

      const vessels = Object.values(vesselsStore);
      let visibleCount = 0;

      for (const v of vessels) {
        if (!vesselMatchesFilter(v)) continue;
        if (v.lat > north || v.lat < south || v.lon > east || v.lon < west) continue;
        if (searchQuery && !vesselMatchesSearch(v, searchQuery)) continue;

        visibleCount++;

        const pt = this._map.latLngToContainerPoint([v.lat, v.lon]);
        const isSelected = v.mmsi === selectedMmsi;
        const cls = v._cls || (v._cls = classifyVessel(v));

        // Tamaño según eslora relativa
        const lengthM = v.length || 60;
        const renderSize = isSelected ? 40 : Math.min(36, Math.max(22, Math.round(lengthM / 9)));
        const half = renderSize / 2;

        const img = createVesselCanvas(cls.shape, cls.color, renderSize, isSelected);

        ctx.save();
        ctx.translate(pt.x, pt.y);

        // Vector de velocidad/proa (línea indicadora hacia adelante)
        const speedKnots = v.sog || 0;
        if (speedKnots > 0.5) {
          const vectorLength = Math.min(45, Math.max(12, speedKnots * 1.8));
          ctx.save();
          ctx.rotate(((v.cog || 0) * Math.PI) / 180);
          ctx.beginPath();
          ctx.moveTo(0, -half);
          ctx.lineTo(0, -half - vectorLength);
          ctx.strokeStyle = cls.color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();
        }

        // Rotación del casco según el rumbo (COG)
        ctx.rotate(((v.cog || 0) * Math.PI) / 180);
        ctx.drawImage(img, -half, -half, renderSize, renderSize);
        ctx.restore();

        // Nombre del buque en zoom cercano
        if (this._map.getZoom() >= 11 || isSelected) {
          ctx.save();
          ctx.font = '600 10px "Inter", sans-serif';
          ctx.textAlign = "center";
          ctx.fillStyle = isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.85)";
          ctx.shadowColor = "#000";
          ctx.shadowBlur = 6;
          ctx.fillText(v.name || v.mmsi, pt.x, pt.y + half + 12);
          ctx.restore();
        }
      }

      updateVisibleCounter(visibleCount);
    },

    _findVesselAtPoint(containerPoint, radius = 18) {
      for (const v of Object.values(vesselsStore)) {
        if (!vesselMatchesFilter(v)) continue;
        const pt = this._map.latLngToContainerPoint([v.lat, v.lon]);
        const dx = pt.x - containerPoint.x;
        const dy = pt.y - containerPoint.y;
        if (dx * dx + dy * dy <= radius * radius) {
          return v;
        }
      }
      return null;
    },

    _onClick(e) {
      const v = this._findVesselAtPoint(e.containerPoint);
      if (v) {
        selectVessel(v.mmsi);
      } else {
        deselectVessel();
      }
    },

    _onMouseMove(e) {
      const v = this._findVesselAtPoint(e.containerPoint);
      const tooltip = document.getElementById("vesselTooltip");
      if (v) {
        this._canvas.style.cursor = "pointer";
        tooltip.style.display = "block";
        tooltip.style.left = `${e.containerPoint.x}px`;
        tooltip.style.top = `${e.containerPoint.y - 12}px`;
        const cls = v._cls || classifyVessel(v);
        tooltip.innerHTML = `<strong>${v.name || v.mmsi}</strong> · <span style="color:${cls.color}">${cls.name}</span> · ${v.sog || 0} kn`;
      } else {
        this._canvas.style.cursor = "";
        tooltip.style.display = "none";
      }
    },

    _onMouseOut() {
      this._canvas.style.cursor = "";
      document.getElementById("vesselTooltip").style.display = "none";
    },
  });

  // ══════════════════════════════════════════════════════════════
  //  FILTRADO Y BÚSQUEDA
  // ══════════════════════════════════════════════════════════════
  function vesselMatchesFilter(v) {
    if (activeFilter === "all") return true;
    const cls = v._cls || (v._cls = classifyVessel(v));
    return cls.id === activeFilter;
  }

  function vesselMatchesSearch(v, query) {
    const q = query.toLowerCase().trim();
    return (
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.mmsi && String(v.mmsi).includes(q)) ||
      (v.callsign && v.callsign.toLowerCase().includes(q)) ||
      (v.destination && v.destination.toLowerCase().includes(q))
    );
  }

  function applyFilter(filterId) {
    activeFilter = filterId;
    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.filter === filterId);
    });
    if (canvasLayer) canvasLayer.redraw();
  }

  // ══════════════════════════════════════════════════════════════
  //  DETALLE Y SELECCIÓN DE BUQUE
  // ══════════════════════════════════════════════════════════════
  function selectVessel(mmsi) {
    selectedMmsi = mmsi;
    const v = vesselsStore[mmsi];
    if (!v) return;

    const card = document.getElementById("vesselCard");
    const cls = v._cls || (v._cls = classifyVessel(v));

    document.getElementById("cardName").textContent = v.name || `Buque MMSI ${v.mmsi}`;
    document.getElementById("cardCategoryText").textContent = cls.name;
    document.getElementById("cardCategoryText").style.color = cls.color;

    const badgeIcon = document.getElementById("cardBadgeIcon");
    badgeIcon.style.color = cls.color;
    badgeIcon.className = cls.id === "passenger" ? "fas fa-ship" : cls.id === "fishing" ? "fas fa-fish" : "fas fa-anchor";

    document.getElementById("cardSpeedKn").textContent = `${v.sog ?? 0} kn`;
    document.getElementById("cardSpeedKmh").textContent = `${Math.round((v.sog || 0) * KNOTS_TO_KMH)} km/h`;
    document.getElementById("cardCourse").textContent = `${Math.round(v.cog ?? 0)}°`;
    document.getElementById("cardMmsi").textContent = v.mmsi || "—";
    document.getElementById("cardImo").textContent = v.imo || "—";
    document.getElementById("cardDimensions").textContent = v.length ? `${v.length}m × ${v.width || 12}m` : "—";
    document.getElementById("cardDestination").textContent = v.destination || "En travesía";
    document.getElementById("cardCoords").textContent = `${v.lat.toFixed(3)}°, ${v.lon.toFixed(3)}°`;

    card.classList.add("active");
    if (canvasLayer) canvasLayer.redraw();
  }

  function deselectVessel() {
    selectedMmsi = null;
    document.getElementById("vesselCard").classList.remove("active");
    if (canvasLayer) canvasLayer.redraw();
  }

  function updateVisibleCounter(count) {
    const el = document.getElementById("visibleCount");
    if (el) el.textContent = count;
  }

  // ══════════════════════════════════════════════════════════════
  //  MOTOR DE INTERPOLACIÓN (NAVEGACIÓN CONTINUA)
  // ══════════════════════════════════════════════════════════════
  function startInterp() {
    let lastTime = performance.now();

    function frame(time) {
      interpTimer = requestAnimationFrame(frame);
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const safeDt = Math.min(dt, 0.5);

      for (const v of Object.values(vesselsStore)) {
        if (v.sog && v.sog > 0.5 && v.cog != null) {
          // Desplazamiento según velocidad real (nudos a km/s) y rumbo
          const speedKmPerSec = (v.sog * KNOTS_TO_KMH) / 3600;
          const distKm = speedKmPerSec * safeDt;
          const rad = v.cog * DEG_TO_RAD;

          const deltaLat = (distKm / EARTH_RADIUS_KM) * (180 / Math.PI) * Math.cos(rad);
          const deltaLon =
            ((distKm / EARTH_RADIUS_KM) * (180 / Math.PI) * Math.sin(rad)) /
            Math.cos(v.lat * DEG_TO_RAD);

          v.lat += deltaLat;
          v.lon += deltaLon;
        }
      }

      if (canvasLayer) canvasLayer.redraw();
    }

    interpTimer = requestAnimationFrame(frame);
  }

  // ══════════════════════════════════════════════════════════════
  //  INICIALIZACIÓN DEL MAPA
  // ══════════════════════════════════════════════════════════════
  function initMap() {
    map = L.map("map", {
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
    }).setView([40.2, 2.2], 7);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    // Mapa base Carto Dark
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap © CARTO · NheuMarine",
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);

    // Opcional: Capa de cartas náuticas OpenSeaMap (boyas, faros, balizas)
    L.tileLayer("https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png", {
      attribution: "Map data © OpenSeaMap",
      maxZoom: 18,
      opacity: 0.85,
    }).addTo(map);

    canvasLayer = new CanvasVesselLayer().addTo(map);

    startInterp();

    // Conectar con backend local AIS en vivo
    fetchVesselsFromBackend();
    setInterval(fetchVesselsFromBackend, 3000);
  }

  async function fetchVesselsFromBackend() {
    try {
      const res = await fetch("/api/vessels", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const currentMmsis = new Set();
          data.forEach((v) => {
            currentMmsis.add(v.mmsi);
            v._cls = classifyVessel(v);
            v.isLive = true;
            vesselsStore[v.mmsi] = v;
          });

          // Purgar buques que el servidor ya haya eliminado por inactividad
          for (const mmsi of Object.keys(vesselsStore)) {
            if (!currentMmsis.has(Number(mmsi))) {
              delete vesselsStore[mmsi];
            }
          }

          if (selectedMmsi && !vesselsStore[selectedMmsi]) {
            deselectVessel();
          }

          const statusBadge = document.getElementById("liveStatusText");
          if (statusBadge) {
            if (data.length > 0) {
              statusBadge.innerHTML = `<span style="color:#22c55e">● LIVE AIS (${data.length})</span>`;
            } else {
              statusBadge.innerHTML = `<span style="color:#f59e0b">● Conectando a AISStream... (0)</span>`;
            }
          }

          if (canvasLayer) canvasLayer.redraw();
        }
      }
    } catch {
      const statusBadge = document.getElementById("liveStatusText");
      if (statusBadge) {
        statusBadge.innerHTML = `<span style="color:#ef4444">● Sin conexión con servidor AIS</span>`;
      }
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  EVENTOS DE INTERFAZ
  // ══════════════════════════════════════════════════════════════
  function initEvents() {
    // Filtros
    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        applyFilter(chip.dataset.filter);
      });
    });

    // Buscador
    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value;
      if (canvasLayer) canvasLayer.redraw();
    });

    // Botón cerrar ficha
    document.getElementById("cardCloseBtn").addEventListener("click", deselectVessel);

    // Ubicación de usuario
    document.getElementById("locateBtn").addEventListener("click", () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            map.flyTo([pos.coords.latitude, pos.coords.longitude], 10, { duration: 1.2 });
          },
          () => alert("No se pudo obtener la ubicación actual.")
        );
      }
    });

    // Centrar en Mediterráneo
    document.getElementById("resetViewBtn").addEventListener("click", () => {
      map.flyTo([40.2, 2.2], 7, { duration: 1.2 });
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    initMap();
    initEvents();
  });
})();
