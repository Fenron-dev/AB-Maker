/**
 * Lightweight i18n module.
 * Loads a JSON locale file from /api/locales/{lang} and exposes t(key, vars).
 */

const I18n = (() => {
  let _tr = {};
  let _lang = 'en';

  async function load(lang) {
    try {
      const res = await fetch(`/api/locales/${lang}`);
      if (res.ok) {
        _tr = await res.json();
        _lang = lang;
      }
    } catch (e) {
      console.warn('[i18n] Failed to load locale:', lang, e);
    }
    applyAll();
  }

  /** Translate key, replacing {placeholders} with vars object. */
  function t(key, vars = {}) {
    let text = _tr[key] ?? key;
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{${k}}`, v);
    }
    return text;
  }

  /** Apply data-i18n attributes across the current document. */
  function applyAll() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const attr = el.dataset.i18nAttr; // e.g. "placeholder"
      const translated = t(key);
      if (attr) {
        el.setAttribute(attr, translated);
      } else {
        el.textContent = translated;
      }
    });
  }

  function currentLang() { return _lang; }

  return { load, t, applyAll, currentLang };
})();

export { I18n };
