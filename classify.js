// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  CLASIFICACIÃ“N DE AERONAVES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const HEMS_CALL_PREFIXES = [
  "HELIMER",
  "HELISEM",
  "TRAUMA",
  "SANITARIO",
  "MEDICO",
  "RESCUE",
  "LIFEGUARD",
  "EMED",
  "GUARDIA",
  "ADSUM",
  "BABCOCK",
  "INAER",
  "ELIANCE",
  "ERA",
  "NHV",
  "PEGASUS",
  "AGUILA",
  "HALCON",
  "CONDOR",
  "FENIX",
  "PAPAGAYO",
  "BRAVO",
  "DELTA",
  "SIERRA",
  "NOVEMBER",
];
const DGT_CALL_RE =
  globalThis.NHEUDGT?.DGT_CALL_RE ||
  /^(HE[ABCDEFGHIJKLMNOPQRSTUVWXYZ]\d|PEGASUS|AGUILA|HALCON|CONDOR|FENIX|PAPAGAYO|GEO\d)/i;

const DGT_REGS =
  globalThis.NHEUDGT?.DGT_REGS ||
  new Map([
    ["EC-LKL", "Pegasus"],
    ["EC-JMK", "Pegasus"],
    ["EC-KJJ", "Pegasus"],
    ["EC-LBD", "Pegasus"],
    ["EC-HNY", null],
    ["EC-GPS", null],
    ["EC-GZE", null],
    ["EC-FBZ", null],
    ["EC-IJU", null],
    ["EC-MCO", null],
    ["EC-MCN", null],
    ["EC-LDD", null],
    ["EC-FJJ", null],
  ]);
const MOSSOS_REGS = new Map([
  ["EC-MRA", "Pròxima"],
  ["EC-LJS", "Pròxima"],
  ["EC-KSD", "Pròxima"],
  ["EC-NRT", "Pròxima"],
]);
const GCIVIL_REGS = new Map([
  ["HU.26-22", "Cucos"],
  ["HU.26-25", "Cucos"],
  ["EC-FRP", "Cucos"],
  ["EC-GZJ", "Cucos"],
  ["HU.15-67", "Cucos"],
  ["HU.30-01", "Cucos"],
  ["HU.26-01", "Cucos"],
  ["HU.26-03", "Cucos"],
  ["HU.26-05", "Cucos"],
  ["HU.26-06", "Cucos"],
  ["HU.26-09", "Cucos"],
  ["HU.26-13", "Cucos"],
  ["HU.26-16", "Cucos"],
  ["HU.26-17", "Cucos"],
  ["HU.26-18", "Cucos"],
  ["HU.26-19", "Cucos"],
  ["HU.26-28", "Cucos"],
  ["HU.26-29", "Cucos"],
  ["HU.26-30", "Cucos"],
  ["HU.26-31A", "Cucos"],
  ["HU.26-36A", "Cucos"],
  ["HU.26-37A", "Cucos"],
  ["HU.26-40A", "Cucos"],
]);
const POLNAC_REGS = new Map([
  ["EC-LKA", "Ángeles"],
  ["EC-OLD", "Ángeles"],
  ["EC-MGM", "Ángeles"],
  ["EC-NZE", "Ángeles"],
  ["EC-OEZ", "Ángeles"],
  ["EC-OCD", "Ángeles"],
  ["EC-NZK", "Ángeles"],
  ["EC-NZX", "Ángeles"],
  ["EC-DRE", "Ángeles"],
  ["EC-HZU", "Ángeles"],
  ["EC-KMI", "Ángeles"],
  ["EC-LAV", "Ángeles"],
]);
const BOMB_SEM_REGS = new Set([
  "EC-NMY",
  "EC-NMP",
  "EC-LKR",
  "EC-MKI",
  "EC-MLU",
  "EC-NJS",
]);
const SEM_CALL_RE =
  /^(HELIMER|HELISEM|TRAUMA|SANITARIO|EMED|ADSUM|BRIF\d|BAMBI)|(SEM|112|EMERGENCIA|RESCUE112|HELICAT|HELISCS|BOMBERS)/i;
const BOMB_CALL_RE =
  /^(BOMB|BRIF|CANADAIR|FIREBIRD|FIREHAWK)|(HELIBOMBA|BOMBERS|HELI.?BOMB)/i;
const HEMS_CALL_RE =
  /^(BABCOCK|INAER|ELIANCE|ERA|NHV|RESCUE|LIFEGUARD|MEDICO)/i;

const HELI_TYPES = new Set([
  "EC35",
  "EC45",
  "EC55",
  "EC65",
  "EC75",
  "EC85",
  "EC95",
  "EC20",
  "EC25",
  "EC30",
  "EC35",
  "EC45",
  "EC55",
  "EC65",
  "EC75",
  "EC85",
  "EC95",
  "EC00",
  "AS32",
  "AS35",
  "AS50",
  "AS55",
  "AS65",
  "AS32",
  "AS3B",
  "BO10",
  "BO15",
  "BO20",
  "BO25",
  "BO30",
  "BO35",
  "BO40",
  "BO45",
  "BO50",
  "BO55",
  "BO60",
  "BO65",
  "BO70",
  "BO75",
  "BO80",
  "BO85",
  "BO90",
  "BO95",
  "H60",
  "H64",
  "H47",
  "H53",
  "CH47",
  "UH60",
  "S61",
  "S70",
  "S76",
  "S92",
  "MD50",
  "MD60",
  "MD90",
  "R22",
  "R44",
  "R66",
  "B06",
  "B07",
  "B12",
  "B17",
  "B21",
  "B27",
  "AW09",
  "AW13",
  "AW16",
  "AW19",
  "AW33",
  "AW36",
  "AW61",
  "AW69",
  "AW72",
  "AW85",
  "AW90",
  "AW95",
  "AW99",
  "A109",
  "A119",
  "A129",
  "A139",
  "A149",
  "A169",
  "A189",
  "NH90",
  "SA31",
  "SA33",
  "SA34",
  "SA36",
  "SA34",
  "SA36",
  "SA37",
  "SA38",
  "SA39",
  "MIL4",
  "MIL8",
  "MI8",
  "MI17",
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
//  VECTORES CON SOPORTE DE HÃ‰LICES ANIMADAS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
]);

function isHelicopterType(type) {
  if (!type) return false;
  if (HELI_TYPES.has(type)) return true;
  if (/^(EC|AS|BO|NH|SA|AW|MD|R[2-9]\d|H\d{2}|UH|CH|MIL|MI|KA)\d/i.test(type))
    return true;
  return false;
}

const GA_TYPES = new Set([
  "C150",
  "C152",
  "C162",
  "C172",
  "C177",
  "C180",
  "C182",
  "C185",
  "C190",
  "C195",
  "C205",
  "C206",
  "C207",
  "C208",
  "C210",
  "C310",
  "C335",
  "C336",
  "C340",
  "C401",
  "C402",
  "C404",
  "C411",
  "C414",
  "P28A",
  "P28B",
  "P28R",
  "PA18",
  "PA24",
  "PA28",
  "PA30",
  "PA31",
  "PA32",
  "PA34",
  "PA38",
  "PA44",
  "PA46",
  "BE18",
  "BE19",
  "BE23",
  "BE24",
  "BE33",
  "BE35",
  "BE36",
  "BE55",
  "BE58",
  "BE60",
  "BE76",
  "BE77",
  "BE80",
  "BE99",
  "DA20",
  "DA40",
// (la lÃ³gica de dibujo estÃ¡ integrada en el mÃ©todo _draw del layer)
  "DA50",
  "DA62",
  "DR40",
  "TB10",
  "TB20",
  "TB21",
  "TB30",
  "SR20",
  "SR22",
  "TBM7",
  "TBM8",
  "TBM9",
  "PC6",
  "PC12",
  "AA1",
  "AA5",
  "G115",
  "G120",
  "G140",
  "RV6",
  "RV7",
  "RV8",
  "RV9",
  "RV10",
  "M20",
  "M7",
  "M20M",
  "PA46",
  "MX2",
  "CAP10",
  "CAP20",
  "CAP21",
  "CAP22",
  "F33",
  "F150",
  "F152",
  "F172",
  "F177",
  "F182",
  "F206",
  "A5",
  "ULAC",
  "S2",
  "KISS",
  "JORA",
  "AVID",
  "DRGT",
]);

const REGIONAL_TURBO = new Set([
  "AT4",
  "AT7",
  "AT72",
  "AT75",
  "AT76",
  "DH8",
  "DH84",
  "DH83",
  "SF3",
  "SF34",
  "JS32",
  "JS41",
  "CVLT",
  "C212",
  "CN35",
  "DHC2",
  "DHC3",
  "DHC4",
  "DHC5",
  "DHC6",
]);
const PRIVATE_JET_PREFIXES = [
  "C25A",
  "C25B",
  "C25C",
  "C25M",
  "C25X",
  "C500",
  "C501",
  "C510",
  "C525",
  "C550",
  "C560",
  "C56X",
  "C650",
  "C680",
  "C68A",
  "C68X",
  "C700",
  "C750",
  "LJ23",
  "LJ24",
  "LJ25",
  "LJ28",
  "LJ31",
  "LJ35",
  "LJ40",
  "LJ45",
  "LJ55",
  "LJ60",
  "LJ70",
  "LJ75",
  "GLF2",
  "GLF3",
  "GLF4",
  "GLF5",
  "GLF6",
  "GL5T",
  "GL6T",
  "GLEX",
  "CL30",
  "CL35",
  "CL60",
  "CL64",
  "CL65",
  "CL6T",
  "F2TH",
  "F2EX",
  "F2LX",
  "FA20",
  "FA50",
  "FA5X",
  "FA6X",
  "FA7X",
  "FA8X",
  "F900",
  "F100",
  "E35L",
  "E45X",
  "E50P",
  "E545",
  "E550",
  "E55P",
  "GALX",
  "G150",
  "G200",
  "G280",
  "G350",
  "G450",
  "G500",
  "G550",
  "G600",
  "G650",
  "HA4T",
  "HDJT",
  "PC24",
  "PRM1",
  "PAY1",
  "PAY2",
  "PAY3",
  "PAY4",
  "SF50",
];
const PRIVATE_OPERATOR_PREFIXES = [
  "NJE",
  "VJT",
  "LXJ",
  "FJO",
  "EJM",
  "MJF",
  "VLZ",
  "HFM",
  "JCB",
  "XJC",
  "MLM",
  "DCM",
  "AJT",
  "PVD",
  "SVW",
  "WWI",
  "OJT",
  "BJO",
  "LWG",
  "GMA",
  "MCK",
  "NOH",
  "AYY",
  "SHE",
  "IFT",
  "BZE",
  "JME",
  "BRO",
  "MTM",
  "IJM",
  "FLX",
  "CNJ",
  "MAB",
];
const COMMERCIAL_TYPE_PREFIXES = [
  "A19",
  "A20",
  "A21",
  "A30",
  "A31",
  "A32",
  "A33",
  "A34",
  "A35",
  "A36",
  "A38",
  "A39",
  "B35",
  "B36",
  "B37",
  "B38",
  "B39",
  "B70",
  "B71",
  "B72",
  "B73",
  "B74",
  "B75",
  "B76",
  "B77",
  "B78",
  "B79",
  "E13",
  "E14",
  "E17",
  "E19",
  "E27",
  "E29",
  "E35",
  "E37",
  "E38",
  "E39",
  "E45",
  "E55",
  "E75",
  "E85",
  "E90",
  "E95",
  "CRJ",
  "CR7",
  "CR9",
  "CRK",
  "DH4",
  "DH8",
  "SF3",
  "MD1",
  "MD8",
  "MD9",
  "DC1",
  "DC8",
  "DC9",
  "IL9",
  "TU1",
  "TU2",
];
const COMMERCIAL_CALL_RE = /^[A-Z]{2,3}\d{1,4}[A-Z]{0,2}$/;

function startsWithAny(value, prefixes) {
  return prefixes.some((prefix) => value.startsWith(prefix));
}

// Los datos de cada aeronave se reemplazan al recibir nueva telemetría.
const aircraftClassifications = new WeakMap();

function classifyAircraft(ac) {
  let classification = aircraftClassifications.get(ac);
  if (!classification) {
    classification = computeAircraftClassification(ac);
    aircraftClassifications.set(ac, classification);
  }
  return classification;
}

function computeAircraftClassification(ac) {
  const dbFlags = ac.dbFlags || 0;
  const cat = (ac.category || "").toUpperCase();
  const type = (ac.t || ac.type || "").toUpperCase().trim();
  const call = (ac.flight || ac.call || "").trim().toUpperCase();
  const isMil = !!(dbFlags & 1);
  const isPrivateJet = startsWithAny(type, PRIVATE_JET_PREFIXES);
  const isPrivateOperator = startsWithAny(call, PRIVATE_OPERATOR_PREFIXES);
  const isCommercialType = startsWithAny(type, COMMERCIAL_TYPE_PREFIXES);
  const isRegionalCommercial =
    REGIONAL_TURBO.has(type) ||
    Array.from(REGIONAL_TURBO).some((rt) => type.startsWith(rt));
  const speedKmh = Math.round(ac.spdKmh || 0);
  const altFt = Math.round(ac.alt || 0);
  const isLikelyBizjet =
    !isPrivateJet &&
    !isCommercialType &&
    !isRegionalCommercial &&
    !GA_TYPES.has(type) &&
    cat === "A2" &&
    (speedKmh >= 560 || altFt >= 22000);
  const shouldTreatAsPrivate =
    isPrivateJet || isPrivateOperator || isLikelyBizjet;
  const isSmallCategory = cat === "A1" || cat === "A2";

  const isHeli = cat === "A7" || isHelicopterType(type);
  if (isHeli) {
    const reg = (ac.r || ac.registration || ac.reg || "").trim().toUpperCase();
    const dgtNick = DGT_REGS.get(reg);
    const mossosNick = MOSSOS_REGS.get(reg);
    const gcivilNick = GCIVIL_REGS.get(reg);
    const polnacNick = POLNAC_REGS.get(reg);

    const isDGT = DGT_CALL_RE.test(call) || DGT_REGS.has(reg);
    const isMossos =
      /^(PROXIMA|PRÒXIMA|MOSSOS|ARGO|N-[0-9])/i.test(call) ||
      MOSSOS_REGS.has(reg);
    const isGCivil =
      /^(CUCOS|AGUILA|ARCANGEL|FENIX|GCR|GCRV)/i.test(call) ||
      GCIVIL_REGS.has(reg);
    const isPolNac =
      /^(ANGELES|ANGEL[0-9]|CNP|HALCON)/i.test(call) || POLNAC_REGS.has(reg);
    const isBombSEM = BOMB_SEM_REGS.has(reg);

    if (isDGT) {
      return {
        label: "Helicóptero DGT",
        color: "heli_dgt",
        hex: "#f97316",
        shadow: "#f9731655",
        shape: "heli",
        badge: "DGT",
        nick: dgtNick,
      };
    }
    if (isMossos) {
      return {
        label: "Helicóptero Mossos",
        color: "heli_mossos",
        hex: "#3b82f6",
        shadow: "#3b82f655",
        shape: "heli",
        badge: "MOSSOS",
        nick: mossosNick,
      };
    }
    if (isGCivil) {
      return {
        label: "Helicóptero G. Civil",
        color: "heli_gcivil",
        hex: "#22c55e",
        shadow: "#22c55e55",
        shape: "heli",
        badge: "G.CIV",
        nick: gcivilNick,
      };
    }
    if (isPolNac) {
      return {
        label: "Helicóptero Policía Nac.",
        color: "heli_polnac",
        hex: "#ff2d55",
        shadow: "#ff2d5555",
        shape: "heli",
        badge: "P.NAC",
        nick: polnacNick,
      };
    }
    if (isBombSEM || BOMB_CALL_RE.test(call) || /^BOMB\d/i.test(call))
      return {
        label: "Helicóptero Bomberos",
        color: "heli_bomb",
        hex: "#dc2626",
        shadow: "#dc262655",
        shape: "heli",
        badge: "BOMB",
      };
    if (SEM_CALL_RE.test(call))
      return {
        label: "Helicóptero SEM/112",
        color: "heli_sem",
        hex: "#ef4444",
        shadow: "#ef444455",
        shape: "heli",
        badge: "SEM",
      };
    if (HEMS_CALL_RE.test(call) || /AMBU|HOSP|MED|SANI/i.test(call))
      return {
        label: "Helicóptero Medicalizado",
        color: "heli_med",
        hex: "#ec4899",
        shadow: "#ec489955",
        shape: "heli",
        badge: "MED",
      };
    if (isMil)
      return {
        label: "Helicóptero militar",
        color: "military",
        hex: "#ef4444",
        shadow: "#ef444455",
        shape: "heli",
        badge: "MIL",
      };
    return {
      label: "Helicóptero",
      color: "heli",
      hex: "#a855f7",
      shadow: "#a855f755",
      shape: "heli",
    };
  }

  if (isMil)
    return {
      label: "Militar",
      color: "military",
      hex: "#ef4444",
      shadow: "#ef444455",
      shape: "military",
    };
  if (cat === "A6")
    return {
      label: "Alto rendimiento",
      color: "military",
      hex: "#ef4444",
      shadow: "#ef444455",
      shape: "military",
    };

  const privTypes = [
    "C550",
    "C560",
    "C56X",
    "C680",
    "C750",
    "LJ35",
    "LJ45",
    "LJ60",
    "LJ75",
    "GLF4",
    "GLF5",
    "GLF6",
    "CL60",
    "CL30",
    "CL35",
    "BE40",
    "F2TH",
    "FA50",
    "FA7X",
    "F900",
    "GALX",
    "G150",
    "G280",
    "G350",
    "G450",
    "G500",
    "G550",
    "G600",
    "G650",
    "GLEX",
    "E50P",
    "E55P",
    "PC24",
    "HA4T",
    "HDJT",
    "PHENOM",
    "EMB50",
  ];
  if (privTypes.some((pt) => type.startsWith(pt)) || shouldTreatAsPrivate)
    return {
      label: "Jet privado",
      color: "private",
      hex: "#22c55e",
      shadow: "#22c55e55",
      shape: "private",
    };

  if (cat === "A3" || cat === "A4" || cat === "A5")
    return {
      label: "Comercial",
      color: "commercial",
      hex: "#3b82f6",
      shadow: "#3b82f655",
      shape: "commercial",
    };
  if (isCommercialType)
    return {
      label: "Comercial",
      color: "commercial",
      hex: "#3b82f6",
      shadow: "#3b82f655",
      shape: "commercial",
    };
  if (isRegionalCommercial)
    return {
      label: "Comercial regional",
      color: "commercial",
      hex: "#3b82f6",
      shadow: "#3b82f655",
      shape: "commercial",
    };
  if (
    COMMERCIAL_CALL_RE.test(call) &&
    call.length >= 4 &&
    !isSmallCategory &&
    !shouldTreatAsPrivate
  )
    return {
      label: "Comercial",
      color: "commercial",
      hex: "#3b82f6",
      shadow: "#3b82f655",
      shape: "commercial",
    };
  if (
    (ac.orig_iata || ac.orig) &&
    (ac.dest_iata || ac.dest) &&
    !GA_TYPES.has(type) &&
    !shouldTreatAsPrivate &&
    !isSmallCategory
  )
    return {
      label: "Comercial",
      color: "commercial",
      hex: "#3b82f6",
      shadow: "#3b82f655",
      shape: "commercial",
    };
  if (
    GA_TYPES.has(type) ||
    cat === "A1" ||
    (cat === "A2" &&
      !shouldTreatAsPrivate &&
      !isCommercialType &&
      !isRegionalCommercial)
  )
    return {
      label: "Avioneta",
      color: "general",
      hex: "#f59e0b",
      shadow: "#f59e0b55",
      shape: "small",
    };

  return {
    label: "Avioneta",
    color: "general",
    hex: "#f59e0b",
    shadow: "#f59e0b55",
    shape: "small",
  };
}

function getPlaneRenderScale(ac, cls = null) {
  const info = cls || classifyAircraft(ac);
  if (info.shape !== "commercial") return 1;

  const type = (ac.t || ac.type || "").toUpperCase().trim();
  if (!type || type === "ADSB_ICAO") return 1;

  if (
    startsWithAny(type, [
      "AT4",
      "AT7",
      "AT72",
      "AT75",
      "AT76",
      "DH8",
      "DH84",
      "DH83",
      "SF3",
      "SF34",
      "JS32",
      "JS41",
      "CVLT",
      "C212",
      "CN35",
      "DHC2",
      "DHC3",
      "DHC4",
      "DHC5",
      "DHC6",
      "CRJ",
      "CR7",
      "CR9",
      "CRK",
      "E13",
      "E14",
      "E17",
      "E19",
      "E27",
      "E29",
    ])
  ) {
    return 0.92;
  }

  if (
    startsWithAny(type, [
      "A19",
      "A318",
      "A319",
      "B712",
      "B717",
      "BCS1",
      "BCS3",
      "E75",
      "E90",
      "E95",
    ])
  ) {
    return 0.97;
  }

  if (startsWithAny(type, ["A38", "B748"])) {
    return 1.14;
  }

  if (startsWithAny(type, ["A35", "B77", "B74", "MD11"])) {
    return 1.11;
  }

  if (
    startsWithAny(type, [
      "A306",
      "A310",
      "A33",
      "A34",
      "B76",
      "B78",
      "IL9",
      "TU2",
    ])
  ) {
    return 1.07;
  }

  return 1;
}

function getPlaneRenderSize(ac, cls = null, selected = false) {
  const baseSize = selected ? 38 : 26;
  const scale = getPlaneRenderScale(ac, cls);
  const size = Math.round(baseSize * scale);
  return Math.max(selected ? 35 : 22, size);
}

// =============================================================
//  VECTORES CON SOPORTE DE HELICES ANIMADAS
// =============================================================

const PLANE_IMGS = {
  commercial:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21,16v-2l-8-5V3.5c0-0.83-0.67-1.5-1.5-1.5S10,2.67,10,3.5V9l-8,5v2l8-2.5V19l-2,1.5V22l3.5-1l3.5,1v-1.5L13,19v-5.5L21,16z" fill="white"/></svg>',
  military:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,2L15,12l7,4v2l-7-3v4l2,1v2l-4-1l-4,1v-2l2-1v-4l-7,3v-2l7-4L12,2z" fill="white"/></svg>',
  private:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12,1 C11.5,1 11,2 11,4 L11,9 L3,16 L3,18 L11,14.5 L11,17.5 C10,17.7 9,18 9,19 L9,20 L11,19.5 L8,22 L8,23 L12,22 L16,23 L16,22 L13,19.5 L15,20 L15,19 C15,18 14,17.7 13,17.5 L13,14.5 L21,18 L21,16 L13,9 L13,4 C13,2 12.5,1 12,1 Z" fill="white"/></svg>',
  small:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M29.5 4.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V17l15.8 4.6c2.46.72 4.2 2.97 4.2 5.54v2.36H39.2l-4.7 3.9v8.04l8.6 3.2v4.08L32 46.72 20.9 48.8v-4.08l8.6-3.2v-8.04l-4.7-3.9H9.5V27.1c0-2.57 1.74-4.82 4.2-5.54L29.5 17V4.5zm-.2 27.9 2.7 2.22 2.7-2.22h-5.4z" fill="white"/></svg>',
  heli: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="white"><rect x="36" y="24" width="1.5" height="24" rx="1"/><rect x="62.5" y="24" width="1.5" height="24" rx="1"/><rect x="37" y="33" width="7" height="1.5"/><rect x="37" y="43" width="7" height="1.5"/><rect x="56" y="33" width="7" height="1.5"/><rect x="56" y="43" width="7" height="1.5"/><path d="M 41,30 C 41,12 59,12 59,30 C 59,42 54,52 52,65 L 52,82 L 48,82 L 48,65 C 46,52 41,42 41,30 Z"/><rect x="39" y="80" width="22" height="4" rx="0.5"/><path d="M 49,84 L 51,84 L 51,96 L 49,96 Z"/><rect x="51" y="86" width="1.5" height="10"/><rect x="47" y="90" width="5" height="1"/></g></svg>',
  heli_rotor:
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="white"><rect x="50.5" y="15" width="2.5" height="35"/><rect x="47.5" y="25" width="1" height="25"/><path d="M 50,50 L 16,72 L 18,75 L 50,52 Z"/><path d="M 50,50 L 84,72 L 82,75 L 50,52 Z"/><circle cx="50" cy="50" r="2.5"/></g></svg>',
};

const LOADED_IMGS = {};
const PLANE_CACHE = {};

Object.keys(PLANE_IMGS).forEach((k) => {
  const img = new Image();
  img.src = PLANE_IMGS[k];
  LOADED_IMGS[k] = img;
});

function makePlaneImage(shape, color, renderSize, selected, hideRing = false) {
  const key = `${shape}_${color}_${renderSize}_${selected ? 1 : 0}_${hideRing ? 1 : 0}`;
  if (PLANE_CACHE[key]) return PLANE_CACHE[key];

  const size = renderSize;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");

  const srcImg = LOADED_IMGS[shape] || LOADED_IMGS["commercial"];

  if (srcImg && srcImg.complete && srcImg.naturalWidth !== 0) {
    const imgSize = Math.round(size * (selected ? 0.68 : 0.84));
    const tempC = document.createElement("canvas");
    tempC.width = size;
    tempC.height = size;
    const tCtx = tempC.getContext("2d");

    tCtx.save();
    tCtx.translate(size / 2, size / 2);
    tCtx.drawImage(srcImg, -imgSize / 2, -imgSize / 2, imgSize, imgSize);
    tCtx.restore();

    tCtx.globalCompositeOperation = "source-in";
    tCtx.fillStyle = color;
    tCtx.fillRect(0, 0, size, size);

    if (selected && !hideRing) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.strokeStyle = color + "aa";
      ctx.lineWidth = Math.max(2, Math.round(size * 0.055));
      ctx.stroke();
      ctx.shadowColor = color;
      ctx.shadowBlur = 6;
    }

    ctx.drawImage(tempC, 0, 0);
    PLANE_CACHE[key] = c;
    return c;
  } else {
    return c;
  }
}

// drawPlane es usado por el CanvasPlaneLayer en app.js
// (la logica de dibujo esta integrada en el metodo _draw del layer)
