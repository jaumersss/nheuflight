(function () {
  'use strict';

  const HTML_ESCAPE = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };

  function storageGet(key, fallback = '') {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch { }
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => HTML_ESCAPE[char]);
  }

  function escapeJSString(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/[\r\n]/g, ' ');
  }

  function safeColor(value, fallback = '#64748b') {
    const text = String(value ?? '').trim();
    if (/^#[0-9a-f]{3,8}$/i.test(text)) return text;
    if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/i.test(text)) return text;
    if (/^var\(--[a-z0-9-]+\)$/i.test(text)) return text;
    return fallback;
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
    return el;
  }

  window.NheuUtils = {
    storageGet,
    storageSet,
    escapeHTML,
    escapeJSString,
    safeColor,
    setText
  };
})();
