(function () {
  'use strict';

  const STORAGE_FAVORITES = 'nheuflight_favorites';
  const STORAGE_ALERTS = 'nheuflight_alerts';
  const alertHits = {};
  let favorites = [];
  let alerts = [];

  function fallbackRead(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || '[]') || [];
    } catch {
      return [];
    }
  }

  function fallbackWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch { }
  }

  function cleanKey(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  }

  function planeIdentity(plane) {
    const hex = cleanKey(plane?.hex);
    const callsign = cleanKey(plane?.call || plane?.flight);
    const reg = cleanKey(plane?.r || plane?.reg);
    return { hex, callsign, reg };
  }

  async function persist() {
    fallbackWrite(STORAGE_FAVORITES, favorites);
    fallbackWrite(STORAGE_ALERTS, alerts);
    if (window.NheuDB) {
      await window.NheuDB.set('kv', STORAGE_FAVORITES, favorites);
      await window.NheuDB.set('kv', STORAGE_ALERTS, alerts);
    }
  }

  async function init() {
    const dbFavs = await window.NheuDB?.get('kv', STORAGE_FAVORITES);
    const dbAlerts = await window.NheuDB?.get('kv', STORAGE_ALERTS);
    favorites = Array.isArray(dbFavs) ? dbFavs : fallbackRead(STORAGE_FAVORITES);
    alerts = Array.isArray(dbAlerts) ? dbAlerts : fallbackRead(STORAGE_ALERTS);
    return { favorites, alerts };
  }

  function listFavorites() {
    return [...favorites];
  }

  function listAlerts() {
    return [...alerts];
  }

  async function addFavorite(plane) {
    const id = planeIdentity(plane);
    const key = id.hex || id.callsign || id.reg;
    if (!key) return null;
    const item = {
      key,
      hex: id.hex,
      callsign: id.callsign,
      reg: id.reg,
      label: plane?.call || plane?.r || plane?.reg || plane?.hex || key,
      route: plane?.orig || plane?.dest ? `${plane.orig || '---'} -> ${plane.dest || '---'}` : '',
      addedAt: Date.now()
    };
    favorites = [item, ...favorites.filter(f => f.key !== key)].slice(0, 40);
    await persist();
    return item;
  }

  async function removeFavorite(key) {
    const clean = cleanKey(key);
    favorites = favorites.filter(item => item.key !== clean);
    await persist();
  }

  async function addAlert(plane) {
    const id = planeIdentity(plane);
    const key = id.hex || id.callsign || id.reg;
    if (!key) return null;
    const item = {
      key,
      hex: id.hex,
      callsign: id.callsign,
      reg: id.reg,
      label: plane?.call || plane?.r || plane?.reg || plane?.hex || key,
      enabled: true,
      addedAt: Date.now()
    };
    alerts = [item, ...alerts.filter(a => a.key !== key)].slice(0, 40);
    await persist();
    return item;
  }

  async function removeAlert(key) {
    const clean = cleanKey(key);
    alerts = alerts.filter(item => item.key !== clean);
    delete alertHits[clean];
    await persist();
  }

  function matchesRule(plane, rule) {
    const id = planeIdentity(plane);
    return Boolean(rule.enabled !== false && (
      (rule.hex && id.hex === cleanKey(rule.hex)) ||
      (rule.callsign && id.callsign === cleanKey(rule.callsign)) ||
      (rule.reg && id.reg === cleanKey(rule.reg))
    ));
  }

  function matchingAlerts(plane) {
    return alerts.filter(rule => matchesRule(plane, rule));
  }

  function shouldNotify(ruleKey, minGapMs = 10 * 60 * 1000) {
    const now = Date.now();
    if (now - (alertHits[ruleKey] || 0) < minGapMs) return false;
    alertHits[ruleKey] = now;
    return true;
  }

  window.NheuWatch = {
    init,
    listFavorites,
    listAlerts,
    addFavorite,
    removeFavorite,
    addAlert,
    removeAlert,
    matchingAlerts,
    shouldNotify,
    cleanKey
  };
})();
