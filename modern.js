// ══════════════════════════════════════════════════════════════
//  NHEUFLIGHT — CONTROLADOR DE LA INTERFAZ MODERNA (ESTILO NHEUMARINE)
// ══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", () => {
  initModernUI();
});

// En caso de que DOMContentLoaded ya haya disparado
if (document.readyState === "complete" || document.readyState === "interactive") {
  setTimeout(initModernUI, 100);
}

function initModernUI() {
  if (window._modernUIInitialized) return;
  window._modernUIInitialized = true;

  // 1. Buscador en la barra superior
  const searchInput = document.getElementById("searchBox");
  const clearBtn = document.getElementById("searchClearBtn");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const val = e.target.value.trim().toLowerCase();
      if (val === "demo" || val === "demonheu") {
        if (typeof openDemoMode === "function") openDemoMode();
        return;
      }
      if (clearBtn) clearBtn.style.display = val ? "flex" : "none";
      if (typeof searchPlane === "function") {
        searchPlane(val);
      }
    });
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        searchInput.value = "";
        clearBtn.style.display = "none";
        if (typeof searchPlane === "function") searchPlane("");
        searchInput.focus();
      });
    }
  }

  // 2. Botón centrar mapa (Compass)
  const resetBtn = document.getElementById("resetViewBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (typeof window.returnToUserPlanePosition === "function") {
        window.returnToUserPlanePosition();
      } else if (window.map) {
        const lat = window.userLat || 40.4168;
        const lon = window.userLon || -3.7038;
        window.map.setView([lat, lon], 7);
      }
    });
  }

  // 3. Menú desplegable de Capas (Layers)
  const layersBtn = document.getElementById("layersToggleBtn");
  const layersDropdown = document.getElementById("layersDropdown");
  if (layersBtn && layersDropdown) {
    layersBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isVisible = layersDropdown.style.display === "flex";
      layersDropdown.style.display = isVisible ? "none" : "flex";
    });
    document.addEventListener("click", (e) => {
      if (!layersDropdown.contains(e.target) && !layersBtn.contains(e.target)) {
        layersDropdown.style.display = "none";
      }
    });
  }

  // Delegación de clic para desplegables de datos técnicos (garantiza apertura/cierre en Safari y WebKit)
  document.addEventListener("click", (e) => {
    const summary = e.target.closest(".sel-details-summary");
    if (summary) {
      const details = summary.closest("details");
      if (details) {
        e.preventDefault();
        details.open = !details.open;
      }
    }
  });

  // Aislar scroll para permitir deslizar (#selPanel) sin que Leaflet capture los eventos táctiles o de rueda
  const selPanel = document.getElementById("selPanel");
  if (selPanel) {
    if (window.L && L.DomEvent) {
      L.DomEvent.disableScrollPropagation(selPanel);
      L.DomEvent.disableClickPropagation(selPanel);
    }
    selPanel.addEventListener("wheel", (e) => e.stopPropagation(), { passive: true });
    selPanel.addEventListener("touchmove", (e) => e.stopPropagation(), { passive: true });
  }

  function updateModernLayerUI() {
    const planesOn = window.isPlanesEnabled !== false;
    const marineOn = !!(window.MarineTracker && window.MarineTracker.isEnabled());

    // 1. Botón Aviones en Dropdown
    const planesBtn = document.getElementById("planesToggleBtn");
    const planesCheck = document.getElementById("planesCheckIcon");
    const planesIcon = planesBtn ? planesBtn.querySelector("i.fa-plane") : null;
    if (planesBtn) {
      planesBtn.classList.toggle("active", planesOn);
      if (planesIcon) planesIcon.style.color = planesOn ? "#38bdf8" : "var(--text-muted)";
      if (planesCheck) planesCheck.style.display = planesOn ? "inline-block" : "none";
    }

    // 2. Botón Barcos en Dropdown
    const marineBtn = document.getElementById("marineToggleBtn");
    const marineCheck = document.getElementById("marineCheckIcon");
    const marineIcon = marineBtn ? marineBtn.querySelector("i.fa-ship") : null;
    if (marineBtn) {
      marineBtn.classList.toggle("active", marineOn);
      if (marineIcon) marineIcon.style.color = marineOn ? "#06b6d4" : "var(--text-muted)";
      if (marineCheck) marineCheck.style.display = marineOn ? "inline-block" : "none";
    }

    // 2.5. Botón J.A.R.V.I.S. en Dropdown y Barra Superior
    const jarvisOn = !!(window.Osiris && (window.Osiris.isJarvisActive || window.Osiris.isHorusActive));
    const osirisBtn = document.getElementById("osirisToggleBtn");
    const osirisMenuBtn = document.getElementById("osirisMenuBtn");
    const osirisCheck = document.getElementById("osirisCheckIcon");
    if (osirisBtn) osirisBtn.classList.toggle("active", jarvisOn);
    if (osirisMenuBtn) osirisMenuBtn.classList.toggle("active", jarvisOn);
    if (osirisCheck) osirisCheck.style.display = jarvisOn ? "inline-block" : "none";

    // 3. Subtítulo en la cabecera
    const liveStatus = document.getElementById("liveStatusText");
    if (liveStatus) {
      if (jarvisOn) {
        liveStatus.textContent = "Modo J.A.R.V.I.S. — Inteligencia Global Activa";
      } else if (planesOn && marineOn) {
        liveStatus.textContent = "Radar Aéreo y Marítimo en Tiempo Real";
      } else if (marineOn && !planesOn) {
        liveStatus.textContent = "Radar Marítimo en Tiempo Real (AIS)";
      } else if (planesOn && !marineOn) {
        liveStatus.textContent = "Radar Aéreo en Tiempo Real";
      } else {
        liveStatus.textContent = "Capas desactivadas (selecciona en menú)";
      }
    }

    // 4. Selector de Pestaña y Tiras de Filtros del Dock
    const dockSelector = document.getElementById("dockModeSelector");
    const tabPlanes = document.getElementById("dockTabPlanes");
    const tabMarine = document.getElementById("dockTabMarine");
    const planeStrip = document.getElementById("planeFilterStrip");
    const marineStrip = document.getElementById("marineFilterStrip");

    // Ajustar tab activo si uno de los dos modos se apaga
    if (!planesOn && marineOn) {
      dockActiveTab = "marine";
    } else if (planesOn && !marineOn) {
      dockActiveTab = "planes";
    }

    if (planesOn && marineOn) {
      if (dockSelector) dockSelector.style.display = "flex";
      if (tabPlanes) tabPlanes.classList.toggle("active", dockActiveTab === "planes");
      if (tabMarine) tabMarine.classList.toggle("active", dockActiveTab === "marine");
      if (planeStrip) planeStrip.style.display = dockActiveTab === "planes" ? "flex" : "none";
      if (marineStrip) marineStrip.style.display = dockActiveTab === "marine" ? "flex" : "none";
    } else if (planesOn) {
      if (dockSelector) dockSelector.style.display = "none";
      if (planeStrip) planeStrip.style.display = "flex";
      if (marineStrip) marineStrip.style.display = "none";
    } else if (marineOn) {
      if (dockSelector) dockSelector.style.display = "none";
      if (planeStrip) planeStrip.style.display = "none";
      if (marineStrip) marineStrip.style.display = "flex";
    } else {
      if (dockSelector) dockSelector.style.display = "none";
      if (planeStrip) planeStrip.style.display = "none";
      if (marineStrip) marineStrip.style.display = "none";
    }

    // Sincronizar chips activos
    if (planeStrip && planeStrip.style.display !== "none") {
      const curFilter = typeof activeFilter === "string" ? activeFilter : "all";
      planeStrip.querySelectorAll(".filter-chip[data-filter]").forEach((c) => {
        c.classList.toggle("active", c.dataset.filter === curFilter);
      });
    }

    if (marineStrip && marineStrip.style.display !== "none" && window.MarineTracker) {
      const curMarFilter = window.MarineTracker.getFilter ? window.MarineTracker.getFilter() : "all";
      marineStrip.querySelectorAll(".filter-chip[data-marine-filter]").forEach((c) => {
        c.classList.toggle("active", c.dataset.marineFilter === curMarFilter);
      });
    }
  }

  window.updateModernLayerUI = updateModernLayerUI;

  // 3.0. Botón Capa Aviones (ADS-B)
  const planesBtn = document.getElementById("planesToggleBtn");
  if (planesBtn) {
    planesBtn.addEventListener("click", () => {
      const willEnable = !(window.isPlanesEnabled !== false);
      if (willEnable) {
        dockActiveTab = "planes";
      }
      if (typeof window.togglePlanesLayer === "function") {
        window.togglePlanesLayer();
      }
    });
  }

  // 3.1. Botón Capa Barcos (AIS)
  const marineBtn = document.getElementById("marineToggleBtn");
  if (marineBtn) {
    marineBtn.addEventListener("click", () => {
      if (window.MarineTracker) {
        const willEnable = !window.MarineTracker.isEnabled();
        if (willEnable) {
          dockActiveTab = "marine";
        }
        window.MarineTracker.toggle();
      }
    });
  }

  // 3.2. Pestañas de Modo en el Dock
  const tabPlanes = document.getElementById("dockTabPlanes");
  if (tabPlanes) {
    tabPlanes.addEventListener("click", () => {
      dockActiveTab = "planes";
      updateModernLayerUI();
    });
  }

  const tabMarine = document.getElementById("dockTabMarine");
  if (tabMarine) {
    tabMarine.addEventListener("click", () => {
      dockActiveTab = "marine";
      updateModernLayerUI();
    });
  }

  // 4. Chips de Filtros de Aviones (dock inferior)
  const planeFilterChips = document.querySelectorAll("#planeFilterStrip .filter-chip[data-filter]");
  planeFilterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      planeFilterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.filter;
      if (typeof applyFilter === "function") {
        applyFilter(filter);
      }
    });
  });

  // 5. Chips de Filtros de Barcos (dock inferior)
  const marineFilterChips = document.querySelectorAll("#marineFilterStrip .filter-chip[data-marine-filter]");
  marineFilterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      marineFilterChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      const filter = chip.dataset.marineFilter;
      if (window.MarineTracker && typeof window.MarineTracker.setFilter === "function") {
        window.MarineTracker.setFilter(filter);
      }
    });
  });

  // Inicializar estado de las capas en UI
  updateModernLayerUI();

  // 6. Chip de Aeropuertos -> abre modal buscador de aeropuerto
  const apModalChip = document.getElementById("airportModalChip");
  if (apModalChip) {
    apModalChip.addEventListener("click", () => {
      if (typeof openAirportModal === "function") openAirportModal();
      else {
        const modal = document.getElementById("airportModal");
        if (modal) modal.style.display = "flex";
      }
    });
  }

  // 7. Acciones dentro de la ficha de avión / barco (#vesselCard)
  const cardCloseBtn = document.getElementById("cardCloseBtn");
  const vesselCard = document.getElementById("vesselCard");
  if (cardCloseBtn && vesselCard) {
    cardCloseBtn.addEventListener("click", () => {
      vesselCard.classList.remove("active");
      if (typeof deselectPlane === "function") deselectPlane();
      else if (typeof window.deselectPlane === "function") window.deselectPlane();
      if (window.MarineTracker) window.MarineTracker.deselectVessel();
    });
  }

  const cardCockpitBtn = document.getElementById("cardCockpitBtn");
  if (cardCockpitBtn) {
    cardCockpitBtn.style.display = "none";
  }

  const cardFollowBtn = document.getElementById("cardFollowBtn");
  if (cardFollowBtn) {
    cardFollowBtn.addEventListener("click", () => {
      if (typeof centerOnSelected === "function") centerOnSelected();
      else if (typeof window.centerOnSelected === "function") window.centerOnSelected();
    });
  }

  const cardShareBtn = document.getElementById("cardShareBtn");
  if (cardShareBtn) {
    cardShareBtn.addEventListener("click", () => {
      if (typeof shareSelectedPlane === "function") {
        shareSelectedPlane();
      } else if (typeof window.shareSelectedPlane === "function") {
        window.shareSelectedPlane();
      } else {
        const mobBtn = document.getElementById("mobileFlightShareBtn");
        if (mobBtn) mobBtn.click();
        else if (navigator.share && (window.selectedHex || selectedHex)) {
          navigator.share({
            title: "NheuFlight",
            text: `Mira este vuelo en vivo en NheuFlight`,
            url: window.location.href
          }).catch(() => {});
        }
      }
    });
  }

  // 8. Interceptar renderSelected para actualizar la ficha moderna
  hookModernSelection();
}

function hookModernSelection() {
  const origRenderSelected = window.renderSelected;
  if (typeof origRenderSelected === "function" && !origRenderSelected._hooked) {
    window.renderSelected = async function (hex, forcePhotoFetch, fetchAcDetails) {
      const result = await origRenderSelected.apply(this, arguments);
      const card = document.getElementById("vesselCard");
      if (card) card.classList.remove("active");
      const selPanel = document.getElementById("selPanel");
      if (selPanel) selPanel.classList.add("active");
      return result;
    };
    window.renderSelected._hooked = true;
  }

  const origDeselectPlane = window.deselectPlane;
  if (typeof origDeselectPlane === "function" && !origDeselectPlane._hooked) {
    window.deselectPlane = function () {
      const result = origDeselectPlane.apply(this, arguments);
      const card = document.getElementById("vesselCard");
      if (card) card.classList.remove("active");
      const selPanel = document.getElementById("selPanel");
      if (selPanel) selPanel.classList.remove("active");
      return result;
    };
    window.deselectPlane._hooked = true;
  }
}

function updateModernVesselCard(hex) {
  const card = document.getElementById("vesselCard");
  if (!card) return;
  const p = (window.planeStore && window.planeStore[hex]) || (typeof planeStore !== "undefined" && planeStore[hex]) || null;
  if (!p) {
    card.classList.remove("active");
    return;
  }

  if (window.MarineTracker) window.MarineTracker.deselectVessel();
  const cockpitBtn = document.getElementById("cardCockpitBtn");
  if (cockpitBtn) cockpitBtn.style.display = "none";

  const cls = typeof classifyAircraft === "function" ? classifyAircraft(p) : { label: "Avión", hex: "#38bdf8" };

  // Nombre / Callsign
  const cardName = document.getElementById("cardName");
  if (cardName) cardName.textContent = p.call || p.r || p.reg || hex;

  // Categoría
  const catText = document.getElementById("cardCategoryText");
  const modelo = p.t || p.type || p.desc || p._acModel || cls.label;
  if (catText) catText.textContent = `${cls.label} • ${modelo}`;

  // Icono del badge
  const badgeIcon = document.getElementById("cardBadgeIcon");
  if (badgeIcon) {
    badgeIcon.innerHTML = `<i class="fas fa-plane"></i>`;
    badgeIcon.style.color = cls.hex || "#38bdf8";
    badgeIcon.style.borderColor = (cls.hex || "#38bdf8") + "44";
  }

  // Velocidad
  const speedKn = document.getElementById("cardSpeedKn");
  const speedKmh = document.getElementById("cardSpeedKmh");
  const spd = p.spd != null ? Math.round(+p.spd) : (p.gs != null ? Math.round(+p.gs) : null);
  const spdK = p.spdKmh != null ? Math.round(+p.spdKmh) : (spd != null ? Math.round(spd * 1.852) : null);
  if (speedKn) speedKn.textContent = spd != null ? `${spd} kn` : "—";
  if (speedKmh) speedKmh.textContent = spdK != null ? `${spdK} km/h` : "—";

  // Altitud
  const altFt = document.getElementById("cardAltFt");
  const altM = document.getElementById("cardAltM");
  const alt = p.alt != null ? +p.alt : (p.alt_baro != null ? +p.alt_baro : (p.altitude != null ? +p.altitude : null));
  if (altFt) altFt.textContent = alt != null ? `${alt.toLocaleString()} ft` : "—";
  if (altM) altM.textContent = alt != null ? `${Math.round(alt * 0.3048).toLocaleString()} m` : "—";

  // Rumbo
  const course = document.getElementById("cardCourse");
  if (course) course.textContent = p.trk != null ? `${Math.round(p.trk)}°` : "—";

  // V. Vertical
  const vspeed = document.getElementById("cardVspeed");
  if (vspeed) {
    const vr = p.baro_rate != null ? Math.round(p.baro_rate) : null;
    if (vr != null) {
      vspeed.textContent = `${vr > 0 ? "+" : ""}${vr} ft/m`;
      vspeed.style.color = vr > 50 ? "#22c55e" : (vr < -50 ? "#ef4444" : "#fff");
    } else {
      vspeed.textContent = "—";
      vspeed.style.color = "#fff";
    }
  }

  // Matrícula
  const reg = document.getElementById("cardReg");
  if (reg) reg.textContent = p.r || p.reg || p.hex || "—";

  // Squawk
  const squawk = document.getElementById("cardSquawk");
  if (squawk) squawk.textContent = p.squawk || "—";

  // Ruta / Destino
  const destIcon = document.getElementById("cardDestIcon");
  if (destIcon) destIcon.className = "fas fa-plane-departure";
  const dest = document.getElementById("cardDestination");
  const origCode = p.orig || "";
  const destCode = p.dest || "";
  const origCity = p.origCity || (window.cityName ? window.cityName(origCode) : "") || "";
  const destCity = p.destCity || (window.cityName ? window.cityName(destCode) : "") || "";
  if (dest) {
    if (origCode && destCode) {
      dest.textContent = `${origCode}${origCity ? ` (${origCity})` : ""} ➔ ${destCode}${destCity ? ` (${destCity})` : ""}`;
    } else if (origCode || destCode) {
      dest.textContent = `${origCode || "?"} ➔ ${destCode || "?"}`;
    } else {
      dest.textContent = "Buscando ruta / En vuelo";
    }
  }

  // Foto si existe
  const photoCont = document.getElementById("cardPhotoContainer");
  const photoImg = document.getElementById("cardPhotoImg");
  const selPhotoImg = document.getElementById("selPhotoImg");
  const pcPhoto = document.getElementById("pcPhoto");
  const candidateSrc = (selPhotoImg && selPhotoImg.src && selPhotoImg.style.display !== "none" && !selPhotoImg.src.includes("/#")) ? selPhotoImg.src
                     : (pcPhoto && pcPhoto.src && pcPhoto.classList.contains("visible") && !pcPhoto.src.includes("/#")) ? pcPhoto.src
                     : null;
  if (photoCont && photoImg) {
    if (candidateSrc && candidateSrc.startsWith("http")) {
      photoImg.src = candidateSrc;
      photoCont.style.display = "block";
    } else if (!photoImg.src || !photoImg.src.startsWith("http")) {
      photoCont.style.display = "none";
    }
  }

  // Mostrar la ficha
  card.classList.add("active");
}

window.updateModernVesselCard = updateModernVesselCard;
