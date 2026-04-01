/**
 * AB-Maker – main SPA controller.
 * Handles routing, global state, navigation highlighting, toasts.
 */

import { I18n }          from './i18n.js';
import { API }           from './api.js';
import { DashboardView } from './views/dashboard.js';
import { TTSConfigView } from './views/tts_config.js';
import { ProgressView }  from './views/progress.js';
import { LibraryView }   from './views/library.js';
import { SettingsView }  from './views/settings.js';

class App {
  constructor() {
    this.views = {
      dashboard: DashboardView,
      config:    TTSConfigView,
      progress:  ProgressView,
      library:   LibraryView,
      settings:  SettingsView,
    };

    this.state = {
      pendingFiles:  [],   // { name, path, isNative } entries waiting for conversion
      currentJobId:  null, // UUID of the running job
      config:        {},   // mirror of backend /api/config
    };

    this._currentViewInstance = null;
    this._pollInterval = null;
  }

  // ── init ─────────────────────────────────────────────────────

  async init() {
    try {
      this.state.config = await API.getConfig();
    } catch (e) {
      console.warn('[app] Could not load config:', e);
    }

    // Detect UI language
    const uiLang = this._resolveLanguage(this.state.config.ui_language);
    await I18n.load(uiLang);

    this._setupNavigation();
    this._setupMobileMenu();

    // Resume running job badge if any
    this._checkRunningJob();

    // Start on dashboard
    this.navigate('dashboard');
  }

  _resolveLanguage(setting) {
    if (!setting || setting === 'auto') {
      const sys = (navigator.language || 'en').split('-')[0];
      const supported = ['en','de','fr','es','it','pt','ja','ko','zh'];
      return supported.includes(sys) ? sys : 'en';
    }
    return setting;
  }

  // ── navigation ────────────────────────────────────────────────

  _setupNavigation() {
    document.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', e => {
        e.preventDefault();
        this.navigate(el.dataset.view);
      });
    });
  }

  navigate(viewName, params = {}) {
    // Teardown previous view
    if (this._currentViewInstance?.unmount) {
      this._currentViewInstance.unmount();
    }

    const container = document.getElementById('view-container');
    if (!container) return;
    container.innerHTML = '';

    const ViewClass = this.views[viewName];
    if (!ViewClass) { console.warn('[app] Unknown view:', viewName); return; }

    this._currentViewInstance = new ViewClass(this, params);
    this._currentViewInstance.render(container);

    // Highlight active nav items
    document.querySelectorAll('[data-view]').forEach(el => {
      const active = el.dataset.view === viewName;
      el.classList.toggle('bg-surface-container-highest', active);
      el.classList.toggle('text-primary', active);
      el.classList.toggle('text-on-surface/60', !active);
    });

    // Reapply translations for any new data-i18n elements
    I18n.applyAll();
  }

  // ── mobile menu ──────────────────────────────────────────────

  _setupMobileMenu() {
    const btn     = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    if (!btn || !sidebar) return;

    let open = false;
    btn.addEventListener('click', () => {
      open = !open;
      sidebar.classList.toggle('hidden',   !open);
      sidebar.classList.toggle('fixed',     open);
      sidebar.classList.toggle('inset-0',   open);
      sidebar.classList.toggle('z-50',      open);
      sidebar.classList.toggle('w-64',      open);
    });

    // Close on nav item click (mobile)
    sidebar.querySelectorAll('[data-view]').forEach(el => {
      el.addEventListener('click', () => {
        if (open) { open = false; sidebar.classList.add('hidden'); }
      });
    });
  }

  // ── running job badge ────────────────────────────────────────

  async _checkRunningJob() {
    try {
      const jobs = await API.listJobs();
      const running = jobs.find(j => ['running','pending'].includes(j.status));
      if (running) {
        this.state.currentJobId = running.id;
        this._showJobIndicator(true);
        document.getElementById('progress-badge')?.classList.remove('hidden');
      }
    } catch {}
  }

  _showJobIndicator(show) {
    const el = document.getElementById('active-job-indicator');
    if (!el) return;
    if (show) { el.classList.remove('hidden'); el.classList.add('flex'); }
    else      { el.classList.add('hidden');    el.classList.remove('flex'); }
  }

  // ── toasts ───────────────────────────────────────────────────

  showToast(message, type = 'info') {
    const container = document.getElementById('toasts');
    if (!container) return;

    const colorMap = {
      error:   'bg-error-container text-on-error-container',
      success: 'bg-secondary-container text-on-secondary-container',
      info:    'bg-surface-container-highest text-on-surface',
    };

    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-xl text-sm font-medium shadow-2xl pointer-events-auto
      transition-all duration-300 opacity-0 translate-x-4
      ${colorMap[type] || colorMap.info}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.remove('opacity-0', 'translate-x-4');
    });

    // Animate out + remove
    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-4');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
}

// Boot
const app = new App();
document.addEventListener('DOMContentLoaded', () => app.init());

export { app };
