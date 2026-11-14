// Shared DGT helicopter detection helpers for the browser radar and headless monitor.
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.NHEUDGT = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DGT_CALL_RE =
    /^(HE[ABCDEFGHIJKLMNOPQRSTUVWXYZ]\d|PEGASUS|AGUILA|HALCON|CONDOR|FENIX|PAPAGAYO|GEO\d)/i;

  const DGT_REGS = new Map([
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

  function clean(value) {
    return String(value || "").trim().toUpperCase();
  }

  function getDgtAircraftId(ac) {
    const hex = clean(ac?.hex || ac?.icao || ac?.icao24);
    const reg = clean(ac?.r || ac?.registration || ac?.reg);
    const call = clean(ac?.flight || ac?.call || ac?.callsign).replace(/\s+/g, "");
    return reg || call || hex || "UNKNOWN";
  }

  function isDgtAircraft(ac) {
    const reg = clean(ac?.r || ac?.registration || ac?.reg);
    const call = clean(ac?.flight || ac?.call || ac?.callsign).replace(/\s+/g, "");
    return DGT_REGS.has(reg) || DGT_CALL_RE.test(call);
  }

  function getDgtNickname(ac) {
    const reg = clean(ac?.r || ac?.registration || ac?.reg);
    return DGT_REGS.get(reg) || null;
  }

  return {
    DGT_CALL_RE,
    DGT_REGS,
    getDgtAircraftId,
    getDgtNickname,
    isDgtAircraft,
  };
});
