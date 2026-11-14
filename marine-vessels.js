// ══════════════════════════════════════════════════════════════
//  NheuMarine — Clasificación de Buques y Renderizado AIS
// ══════════════════════════════════════════════════════════════

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NheuMarineVessels = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // Categorías AIS estándar y su codificación
  const VESSEL_CATEGORIES = {
    cargo: {
      id: "cargo",
      name: "Carga / Mercante",
      color: "#22c55e",
      shape: "cargo",
      glow: "rgba(34, 197, 94, 0.4)",
    },
    tanker: {
      id: "tanker",
      name: "Petrolero / Quimiquero",
      color: "#ef4444",
      shape: "tanker",
      glow: "rgba(239, 68, 68, 0.4)",
    },
    passenger: {
      id: "passenger",
      name: "Pasaje / Ferry / Crucero",
      color: "#3b82f6",
      shape: "passenger",
      glow: "rgba(59, 130, 246, 0.4)",
    },
    fishing: {
      id: "fishing",
      name: "Pesquero",
      color: "#f97316",
      shape: "fishing",
      glow: "rgba(249, 115, 22, 0.4)",
    },
    tug: {
      id: "tug",
      name: "Remolcador / Práctico",
      color: "#a855f7",
      shape: "tug",
      glow: "rgba(168, 85, 247, 0.4)",
    },
    pleasure: {
      id: "pleasure",
      name: "Recreo / Yate / Velero",
      color: "#06b6d4",
      shape: "pleasure",
      glow: "rgba(6, 182, 212, 0.4)",
    },
    military: {
      id: "military",
      name: "Salvamento / Guardacostas",
      color: "#eab308",
      shape: "military",
      glow: "rgba(234, 179, 8, 0.4)",
    },
    other: {
      id: "other",
      name: "Otro Buque",
      color: "#94a3b8",
      shape: "other",
      glow: "rgba(148, 163, 184, 0.4)",
    },
  };

  /**
   * Clasifica un buque según el código numérico AIS estándar (ShipType 0-99),
   * designación textual, nombre del buque, MMSI o dimensiones.
   */
  function classifyVessel(vessel) {
    if (!vessel) return VESSEL_CATEGORIES.other;

    const rawType = parseInt(vessel.shipType ?? vessel.type ?? 0, 10);
    const desc = String(vessel.typeName || vessel.vesselType || "").toLowerCase();
    const name = String(vessel.name || "").trim().toUpperCase();
    const callsign = String(vessel.callsign || "").trim().toUpperCase();
    const mmsi = String(vessel.mmsi || "").trim();
    const length = parseInt(vessel.length || 0, 10);

    // 1. Por código numérico AIS oficial (OMI / ITU-R M.1371)
    if (rawType >= 70 && rawType <= 79) return VESSEL_CATEGORIES.cargo;
    if (rawType === 100) return VESSEL_CATEGORIES.cargo;

    if (rawType >= 80 && rawType <= 89) return VESSEL_CATEGORIES.tanker;

    // Pasaje y ferris (incluyendo High Speed Craft / catamaranes rápidos códigos 40-49)
    if ((rawType >= 60 && rawType <= 69) || (rawType >= 40 && rawType <= 49)) {
      return VESSEL_CATEGORIES.passenger;
    }

    if (rawType === 30) return VESSEL_CATEGORIES.fishing;

    // Remolcadores, prácticos, dragas y servicios auxiliares de puerto
    if (
      rawType === 52 ||
      rawType === 50 || // Pilot vessel (prácticos)
      rawType === 53 || // Port tender
      rawType === 31 || // Towing
      rawType === 32 || // Towing large
      rawType === 33 || // Dragas
      rawType === 34    // Operaciones submarinas / puerto
    ) {
      return VESSEL_CATEGORIES.tug;
    }

    // Recreo, veleros, yates
    if (rawType === 36 || rawType === 37) return VESSEL_CATEGORIES.pleasure;

    // Salvamento Marítimo, guardacostas, policía marítima, militar
    if (
      rawType === 51 || // SAR (Search and Rescue - Salvamento Marítimo)
      rawType === 54 || // Anti-pollution vessel
      rawType === 55 || // Law enforcement / patrulleras
      rawType === 58 || // Medical transport
      rawType === 35    // Military ops
    ) {
      return VESSEL_CATEGORIES.military;
    }

    // 2. MMSI especial (SAR / Salvamento Marítimo mundial)
    if (mmsi.startsWith("111")) return VESSEL_CATEGORIES.military;

    // 3. Deducción inteligente por NOMBRE del buque
    if (name) {
      // Salvamento / Autoridad / Guardacostas
      if (
        /^(SALVAMAR|GUARDAMAR|SAR\b|RESCUE|CLARA\s*CAMPOAMOR|DON\s*INDA|MIGUEL\s*DE\s*CERVANTES|PATRULLER[AO]|GUARDIA\s*CIVIL|ADUANAS|SEGEMAR|COAST\s*GUARD|LIFEBOAT|EMERGENCIAS)/i.test(name) ||
        /\b(SALVAMAR|GUARDAMAR|RESCUE|PATROL)\b/i.test(name)
      ) {
        return VESSEL_CATEGORIES.military;
      }

      // Pasaje / Ferris / Cruceros
      if (
        /^(BALEARIA|FRED\s*OLSEN|TRASMED|GRIMALDI|GNV\b|FERRY|CRUISE|MSC\s+[A-Z]|COSTA\s+[A-Z]|AIDA[A-Z]|ROYAL\s*CARIBBEAN|CELEBRITY|NORWEGIAN|TUI|DISNEY|PULLMANTUR|CORSICA|FAST\s*FERRY|CATAMARAN)/i.test(name) ||
        /\b(FERRY|CRUISES?|EXPRESS|CATAMARAN)\b/i.test(name)
      ) {
        return VESSEL_CATEGORIES.passenger;
      }

      // Remolcadores / Prácticos
      if (
        /^(REMOLCADOR|TUG\b|PILOT\b|PRACTIC[OO]|PRÀCTIC|BARCINO|SERTOSA|BOLUDA|IBAIZABAL|FAIRPLAY|SMIT|KOTUG|VB\s+[A-Z])/i.test(name) ||
        /\b(REMOLCADOR|TUG|PILOT|PRACTICO)\b/i.test(name)
      ) {
        return VESSEL_CATEGORIES.tug;
      }

      // Pesqueros
      if (
        /^(PESQUER[AO]|PLAYA\s*DE|HERMANOS|HNOS|VILLA\s*DE|NUEV[AO]|PESCADOR|TRAWLER|LONJA|SIEMPRE)/i.test(name) ||
        /\b(PESQUER[AO]|TRAWLER)\b/i.test(name)
      ) {
        return VESSEL_CATEGORIES.fishing;
      }

      // Petroleros / Gaseros
      if (
        /^(TANKER|CHEMICAL|LNG\b|LPG\b|BUNKER|REPSOL|CEPSA)/i.test(name) ||
        /\b(TANKER|OIL|CHEMICAL|GAS|LNG|LPG|BUNKER)\b/i.test(name)
      ) {
        return VESSEL_CATEGORIES.tanker;
      }

      // Carga / Mercantes / Portacontenedores
      if (
        /^(MAERSK|CMA\s*CGM|COSCO|EVERGREEN|HAPAG|ONE\s+[A-Z]|CONTAINER|CARGO|FEEDER)/i.test(name) ||
        /\b(CONTAINER|CARGO|CARRIER|BULKER|FEEDER)\b/i.test(name)
      ) {
        return VESSEL_CATEGORIES.cargo;
      }

      // Recreo / Yates
      if (
        /^(YACHT|VELERO|SAILING|MY\s+[A-Z]|SY\s+[A-Z])/i.test(name) ||
        /\b(YACHT|VELERO|SAILING)\b/i.test(name)
      ) {
        return VESSEL_CATEGORIES.pleasure;
      }
    }

    // 4. Por texto descriptivo si la fuente externa envía typeName
    if (desc) {
      if (desc.includes("cargo") || desc.includes("container") || desc.includes("bulk") || desc.includes("carrier") || desc.includes("freight")) {
        return VESSEL_CATEGORIES.cargo;
      }
      if (desc.includes("tanker") || desc.includes("oil") || desc.includes("lng") || desc.includes("lpg") || desc.includes("chemical") || desc.includes("petrolero")) {
        return VESSEL_CATEGORIES.tanker;
      }
      if (desc.includes("ferry") || desc.includes("passenger") || desc.includes("cruise") || desc.includes("ro-ro") || desc.includes("crucero") || desc.includes("pasaje") || desc.includes("hsc")) {
        return VESSEL_CATEGORIES.passenger;
      }
      if (desc.includes("fishing") || desc.includes("pesquero") || desc.includes("trawler") || desc.includes("pesca")) {
        return VESSEL_CATEGORIES.fishing;
      }
      if (desc.includes("tug") || desc.includes("pilot") || desc.includes("towing") || desc.includes("dredg") || desc.includes("remolcador") || desc.includes("práctico") || desc.includes("practico")) {
        return VESSEL_CATEGORIES.tug;
      }
      if (desc.includes("yacht") || desc.includes("sailing") || desc.includes("pleasure") || desc.includes("velero") || desc.includes("recreo") || desc.includes("yate")) {
        return VESSEL_CATEGORIES.pleasure;
      }
      if (desc.includes("salvamento") || desc.includes("guard") || desc.includes("rescue") || desc.includes("patrol") || desc.includes("military") || desc.includes("armada") || desc.includes("sar")) {
        return VESSEL_CATEGORIES.military;
      }
    }

    // 5. Inferencia por dimensiones (grandes buques oceánicos comerciales)
    if (length >= 160) {
      return VESSEL_CATEGORIES.cargo;
    }

    return VESSEL_CATEGORIES.other;
  }

  // Caché de imágenes de barcos por tipo, color y tamaño
  const VESSEL_CANVAS_CACHE = new Map();

  /**
   * Dibuja la silueta vectorial de un barco orientada hacia arriba (rumbo 0°).
   * La proa apunta hacia el norte (arriba).
   */
  function createVesselCanvas(shape, color, size = 32, isSelected = false) {
    const cacheKey = `${shape}_${color}_${size}_${isSelected ? 1 : 0}`;
    if (VESSEL_CANVAS_CACHE.has(cacheKey)) {
      return VESSEL_CANVAS_CACHE.get(cacheKey);
    }

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const cx = size / 2;
    const cy = size / 2;

    ctx.save();
    ctx.translate(cx, cy);

    // Anillo de selección
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.44, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, size * 0.48, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Dibujo del casco según tipo de embarcación
    ctx.fillStyle = color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    const w = size * 0.32;
    const h = size * 0.72;

    ctx.beginPath();

    switch (shape) {
      case "cargo":
      case "tanker": {
        // Casco largo con proa afilada y popa cuadrada
        ctx.moveTo(0, -h * 0.5); // Proa
        ctx.lineTo(w * 0.5, -h * 0.25);
        ctx.lineTo(w * 0.5, h * 0.42);
        ctx.lineTo(w * 0.35, h * 0.5); // Popa estribor
        ctx.lineTo(-w * 0.35, h * 0.5); // Popa babor
        ctx.lineTo(-w * 0.5, h * 0.42);
        ctx.lineTo(-w * 0.5, -h * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Detalle de superestructura / puente en popa
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-w * 0.3, h * 0.2, w * 0.6, h * 0.18);
        break;
      }

      case "passenger": {
        // Ferry / Crucero con cubierta escalonada
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.5, -h * 0.2);
        ctx.lineTo(w * 0.45, h * 0.45);
        ctx.lineTo(0, h * 0.5);
        ctx.lineTo(-w * 0.45, h * 0.45);
        ctx.lineTo(-w * 0.5, -h * 0.2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cubiertas blancas superiores
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-w * 0.25, -h * 0.15, w * 0.5, h * 0.45);
        break;
      }

      case "fishing":
      case "tug": {
        // Barco más ancho, compacto y con puente central
        const tw = w * 1.1;
        const th = h * 0.8;
        ctx.moveTo(0, -th * 0.5);
        ctx.lineTo(tw * 0.5, -th * 0.15);
        ctx.lineTo(tw * 0.45, th * 0.5);
        ctx.lineTo(-tw * 0.45, th * 0.5);
        ctx.lineTo(-tw * 0.5, -th * 0.15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cabina
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(0, 0, tw * 0.25, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case "pleasure": {
        // Yate / Velero estilizado muy afilado
        const yw = w * 0.8;
        ctx.moveTo(0, -h * 0.52);
        ctx.lineTo(yw * 0.5, -h * 0.05);
        ctx.lineTo(yw * 0.4, h * 0.48);
        ctx.lineTo(-yw * 0.4, h * 0.48);
        ctx.lineTo(-yw * 0.5, -h * 0.05);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      default: {
        // Silueta universal (flecha náutica)
        ctx.moveTo(0, -h * 0.5);
        ctx.lineTo(w * 0.5, h * 0.45);
        ctx.lineTo(0, h * 0.3);
        ctx.lineTo(-w * 0.5, h * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
    }

    ctx.restore();

    VESSEL_CANVAS_CACHE.set(cacheKey, canvas);
    return canvas;
  }

  return {
    VESSEL_CATEGORIES,
    classifyVessel,
    createVesselCanvas,
  };
});
