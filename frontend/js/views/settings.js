/**
 * Settings view – paths, language, audio preferences, danger zone.
 */

import { API }  from '../api.js';
import { I18n } from '../i18n.js';

const LANGUAGES = [
  { code: 'auto', label: 'Auto (system)' },
  { code: 'en',   label: 'English' },
  { code: 'de',   label: 'Deutsch' },
  { code: 'fr',   label: 'Français' },
  { code: 'es',   label: 'Español' },
  { code: 'it',   label: 'Italiano' },
  { code: 'pt',   label: 'Português' },
  { code: 'ja',   label: '日本語' },
  { code: 'ko',   label: '한국어' },
  { code: 'zh',   label: '中文' },
];

export class SettingsView {
  constructor(app) {
    this.app = app;
    this._cfg = {};
  }

  async render(container) {
    this._cfg = { ...this.app.state.config };

    container.innerHTML = `
<div class="px-6 py-8 max-w-4xl mx-auto space-y-10 pb-28 md:pb-8">

  <!-- Header -->
  <div class="space-y-1">
    <h2 class="font-headline text-3xl font-extrabold text-primary tracking-tight"
        data-i18n="settings_title">Settings</h2>
    <p class="text-on-surface-variant text-sm" data-i18n="settings_desc">
      Configure paths, defaults, and application preferences.
    </p>
  </div>

  <!-- Storage paths -->
  <section class="space-y-5">
    <div class="flex items-center gap-3">
      <span class="material-symbols-outlined text-primary">folder_shared</span>
      <h3 class="font-headline font-bold text-xl text-on-surface" data-i18n="storage_paths">Storage Paths</h3>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5">

      ${['output_dir','cache_dir','model_dir'].map(key => `
      <div class="bg-surface-container rounded-xl p-5 space-y-3">
        <label class="text-[9px] uppercase tracking-wider font-medium text-on-surface-variant"
               data-i18n="path_${key}">${_pathLabel(key)}</label>
        <div class="flex gap-2">
          <div class="flex-1 bg-surface-container-lowest rounded-lg px-3 py-2.5 flex items-center gap-2
                      overflow-hidden">
            <span class="material-symbols-outlined text-outline text-sm shrink-0">${_pathIcon(key)}</span>
            <input type="text" id="inp-${key}" readonly
                   class="bg-transparent border-none text-sm text-on-surface w-full focus:ring-0"
                   value="${_esc(this._cfg[key] || '')}"/>
          </div>
          <button data-browse="${key}"
                  class="px-3 py-2 bg-surface-container-highest text-primary rounded-xl
                         text-xs font-bold hover:bg-surface-bright transition-all"
                  data-i18n="browse">Browse</button>
        </div>
      </div>`).join('')}

    </div>
  </section>

  <!-- Conversion defaults -->
  <section class="space-y-5">
    <div class="flex items-center gap-3">
      <span class="material-symbols-outlined text-primary">tune</span>
      <h3 class="font-headline font-bold text-xl text-on-surface" data-i18n="conversion_defaults">Conversion Defaults</h3>
    </div>
    <div class="bg-surface-container rounded-xl overflow-hidden divide-y divide-outline-variant/10">

      <!-- Words per chunk -->
      <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4
                  hover:bg-surface-bright/10 transition-colors">
        <div>
          <p class="font-medium text-on-surface text-sm" data-i18n="max_words">Max Words per Chunk</p>
          <p class="text-xs text-on-surface-variant" data-i18n="max_words_hint">
            Smaller = more natural breaks, larger = fewer API calls.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <input type="range" id="rng-words" min="50" max="300" step="10"
                 value="${this._cfg.max_words_per_chunk || 150}"
                 class="w-32 accent-primary"/>
          <span id="words-label" class="text-sm font-mono text-primary w-8 text-right">
            ${this._cfg.max_words_per_chunk || 150}
          </span>
        </div>
      </div>

      <!-- Pause between chunks -->
      <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4
                  hover:bg-surface-bright/10 transition-colors">
        <div>
          <p class="font-medium text-on-surface text-sm" data-i18n="pause_chunks">Pause Between Chunks (s)</p>
          <p class="text-xs text-on-surface-variant" data-i18n="pause_chunks_hint">
            Silence gap inserted between synthesised segments.
          </p>
        </div>
        <div class="flex items-center gap-3">
          <input type="range" id="rng-pause" min="0" max="2" step="0.1"
                 value="${this._cfg.pause_between_chunks || 0.6}"
                 class="w-32 accent-primary"/>
          <span id="pause-label" class="text-sm font-mono text-primary w-8 text-right">
            ${(this._cfg.pause_between_chunks || 0.6).toFixed(1)}s
          </span>
        </div>
      </div>

      <!-- Default output format -->
      <div class="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4
                  hover:bg-surface-bright/10 transition-colors">
        <div>
          <p class="font-medium text-on-surface text-sm" data-i18n="default_format">Default Output Format</p>
        </div>
        <div class="flex gap-1 p-1 bg-surface-container-lowest rounded-xl">
          ${['m4b','m4a','wav'].map(f => `
          <button data-fmt="${f}"
                  class="fmt-btn px-4 py-2 rounded-lg text-xs font-semibold transition-all
                         ${(this._cfg.default_output_format || 'm4b') === f
                           ? 'bg-surface-container-highest text-primary'
                           : 'text-on-surface-variant hover:text-on-surface'}">
            ${f.toUpperCase()}
          </button>`).join('')}
        </div>
      </div>

    </div>
  </section>

  <!-- Interface language -->
  <section class="space-y-5">
    <div class="flex items-center gap-3">
      <span class="material-symbols-outlined text-primary">language</span>
      <h3 class="font-headline font-bold text-xl text-on-surface" data-i18n="interface_language">Interface Language</h3>
    </div>
    <div class="bg-surface-container rounded-xl p-5">
      <div class="relative max-w-xs">
        <select id="sel-lang"
                class="sunken-input w-full px-4 py-3 rounded-xl text-on-surface appearance-none pr-10 text-sm">
          ${LANGUAGES.map(l => `
            <option value="${l.code}" ${(this._cfg.ui_language || 'auto') === l.code ? 'selected' : ''}>
              ${_esc(l.label)}
            </option>`).join('')}
        </select>
        <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2
                     pointer-events-none text-outline text-sm">expand_more</span>
      </div>
      <p class="text-xs text-on-surface-variant mt-2" data-i18n="lang_note">
        Language change takes effect after restart.
      </p>
    </div>
  </section>

  <!-- Save button -->
  <div class="flex justify-end">
    <button id="save-btn"
            class="px-8 py-3 bg-gradient-to-br from-primary to-primary-container text-on-primary
                   rounded-2xl font-bold shadow-lg shadow-primary-container/20 active:scale-95
                   transition-all flex items-center gap-2">
      <span class="material-symbols-outlined">save</span>
      <span data-i18n="save_settings">Save Settings</span>
    </button>
  </div>

  <!-- Danger zone -->
  <section class="pt-4">
    <div class="bg-error-container/10 border border-error-container/20 rounded-xl p-5
                flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <p class="font-headline font-bold text-error" data-i18n="reset_title">Reset Application</p>
        <p class="text-xs text-on-error-container/60 mt-0.5" data-i18n="reset_desc">
          Reset all settings to defaults. Jobs history is preserved.
        </p>
      </div>
      <button id="reset-btn"
              class="px-5 py-2 border border-error-container/40 text-error rounded-xl text-xs
                     font-bold uppercase tracking-wider hover:bg-error-container/20 transition-all"
              data-i18n="reset_btn">Reset All</button>
    </div>
  </section>

</div>`;

    I18n.applyAll();
    this._attachEvents(container);
  }

  _attachEvents(container) {
    // Range sliders
    const rngWords = container.querySelector('#rng-words');
    rngWords?.addEventListener('input', () => {
      container.querySelector('#words-label').textContent = rngWords.value;
    });
    const rngPause = container.querySelector('#rng-pause');
    rngPause?.addEventListener('input', () => {
      container.querySelector('#pause-label').textContent = parseFloat(rngPause.value).toFixed(1) + 's';
    });

    // Format buttons
    let selectedFmt = this._cfg.default_output_format || 'm4b';
    container.querySelectorAll('.fmt-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFmt = btn.dataset.fmt;
        container.querySelectorAll('.fmt-btn').forEach(b => {
          b.classList.toggle('bg-surface-container-highest', b.dataset.fmt === selectedFmt);
          b.classList.toggle('text-primary', b.dataset.fmt === selectedFmt);
          b.classList.toggle('text-on-surface-variant', b.dataset.fmt !== selectedFmt);
        });
      });
    });

    // Browse folder buttons (native dialog)
    container.querySelectorAll('[data-browse]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const key = btn.dataset.browse;
        const path = await API.selectFolderNative();
        if (path) {
          this._cfg[key] = path;
          container.querySelector(`#inp-${key}`).value = path;
        } else {
          // Fallback: let user type
          container.querySelector(`#inp-${key}`).removeAttribute('readonly');
          container.querySelector(`#inp-${key}`).focus();
        }
      });
    });

    // Allow typing in path fields directly (click input to edit)
    container.querySelectorAll('[id^="inp-"]').forEach(inp => {
      inp.addEventListener('dblclick', () => inp.removeAttribute('readonly'));
      inp.addEventListener('blur', () => inp.setAttribute('readonly', ''));
    });

    // Save
    container.querySelector('#save-btn')?.addEventListener('click', async () => {
      const patch = {
        output_dir:           container.querySelector('#inp-output_dir')?.value  || this._cfg.output_dir,
        cache_dir:            container.querySelector('#inp-cache_dir')?.value   || this._cfg.cache_dir,
        model_dir:            container.querySelector('#inp-model_dir')?.value   || this._cfg.model_dir,
        max_words_per_chunk:  parseInt(rngWords?.value || '150'),
        pause_between_chunks: parseFloat(rngPause?.value || '0.6'),
        default_output_format: selectedFmt,
        ui_language:          container.querySelector('#sel-lang')?.value || 'auto',
      };
      try {
        await API.updateConfig(patch);
        this.app.state.config = { ...this.app.state.config, ...patch };
        this.app.showToast(I18n.t('settings_saved') || 'Settings saved!', 'success');
      } catch (e) {
        this.app.showToast(`Error: ${e.message}`, 'error');
      }
    });

    // Reset
    container.querySelector('#reset-btn')?.addEventListener('click', async () => {
      if (!confirm(I18n.t('confirm_reset') || 'Reset all settings to defaults?')) return;
      try {
        const cfg = await API.resetConfig();
        this.app.state.config = cfg;
        this._cfg = cfg;
        this.render(container);
        this.app.showToast(I18n.t('settings_reset') || 'Settings reset.', 'info');
      } catch (e) {
        this.app.showToast(`Error: ${e.message}`, 'error');
      }
    });
  }

  unmount() {}
}

function _pathLabel(key) {
  return { output_dir: 'Output Folder', cache_dir: 'Cache Folder', model_dir: 'Model Folder' }[key] || key;
}
function _pathIcon(key) {
  return { output_dir: 'output', cache_dir: 'cached', model_dir: 'model_training' }[key] || 'folder';
}
function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
