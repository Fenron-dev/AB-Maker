/**
 * TTS Configuration view – choose engine, voice, mode, output format.
 */

import { API }  from '../api.js';
import { I18n } from '../i18n.js';

export class TTSConfigView {
  constructor(app) {
    this.app = app;
    this._engines = [];
    this._selectedEngine = null;
    this._cfg = {};
  }

  async render(container) {
    // Load engines + current config
    try {
      this._engines = await API.getEngines();
    } catch { this._engines = []; }

    const appCfg = this.app.state.config || {};
    this._cfg = {
      voice_mode:         'standard',
      language:           appCfg.default_language  || 'English',
      speaker:            appCfg.default_speaker   || 'sohee',
      instruction:        '',
      clone_audio_path:   '',
      clone_transcript:   '',
      model_size:         appCfg.default_model_size || '1.7b',
    };
    this._selectedEngine = appCfg.default_engine || (this._engines[0]?.id ?? 'qwen3-tts');

    const eng = this._engines.find(e => e.id === this._selectedEngine) || this._engines[0];
    const voices    = eng?.voices    || [];
    const languages = eng?.languages || ['English'];
    const sizes     = eng?.model_sizes || [];

    const fileCount = this.app.state.pendingFiles.length;

    container.innerHTML = `
<div class="px-6 py-8 max-w-6xl mx-auto space-y-8 pb-28 md:pb-8">

  <!-- Header -->
  <div class="space-y-1">
    <p class="text-[10px] uppercase tracking-[0.12em] text-primary font-semibold"
       data-i18n="config_subtitle">Architectural Setup</p>
    <h2 class="font-headline text-3xl font-extrabold text-on-surface tracking-tight"
        data-i18n="config_title">Engine Configuration</h2>
    <p class="text-on-surface-variant text-sm max-w-2xl" data-i18n="config_desc">
      Select your synthesis core and configure voice parameters before conversion.
    </p>
  </div>

  ${fileCount === 0 ? `
  <div class="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20 flex items-center gap-3">
    <span class="material-symbols-outlined text-primary">info</span>
    <p class="text-sm text-on-surface-variant" data-i18n="no_files_selected">
      No files selected. Go to the Dashboard and add files first.
    </p>
  </div>` : `
  <div class="p-3 bg-surface-container-low rounded-2xl border border-outline-variant/20 flex items-center gap-3">
    <span class="material-symbols-outlined text-secondary">check_circle</span>
    <p class="text-sm text-on-surface">
      <span class="font-bold text-primary">${fileCount}</span>
      <span data-i18n="files_ready"> file(s) ready for conversion.</span>
    </p>
  </div>`}

  <!-- Engine selection grid -->
  <section class="space-y-3">
    <h3 class="font-headline font-bold text-lg text-on-surface" data-i18n="select_engine">Select Engine</h3>
    <div id="engine-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      ${this._engines.map(e => this._engineCard(e)).join('') || `
        <div class="col-span-3 text-center py-8 text-on-surface-variant text-sm"
             data-i18n="no_engines">No engines available.</div>`}
    </div>
  </section>

  <!-- Voice & output params -->
  <section class="grid grid-cols-1 lg:grid-cols-3 gap-6">

    <!-- Left: params -->
    <div class="lg:col-span-2 bg-surface-container rounded-2xl p-6 space-y-7">
      <h3 class="font-headline text-lg font-bold" data-i18n="engine_params">Engine Parameters</h3>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Voice mode -->
        <div class="space-y-2">
          <label class="text-[9px] uppercase tracking-widest text-primary font-bold block"
                 data-i18n="voice_mode">Voice Mode</label>
          <div class="flex gap-1 p-1 bg-surface-container-lowest rounded-xl">
            ${['standard','instruction','clone'].map(m => `
            <button data-mode="${m}"
                    class="mode-btn flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all
                           ${this._cfg.voice_mode === m
                             ? 'bg-surface-container-highest text-primary'
                             : 'text-on-surface-variant hover:text-on-surface'}"
                    data-i18n="mode_${m}">
              ${m.charAt(0).toUpperCase() + m.slice(1)}
            </button>`).join('')}
          </div>
        </div>

        <!-- Language -->
        <div class="space-y-2">
          <label class="text-[9px] uppercase tracking-widest text-primary font-bold block"
                 data-i18n="language">Language</label>
          <div class="relative">
            <select id="sel-language" class="sunken-input w-full px-4 py-3 rounded-xl
                                             text-on-surface appearance-none pr-10 text-sm">
              ${languages.map(l => `
                <option value="${_esc(l)}" ${l === this._cfg.language ? 'selected' : ''}>${_esc(l)}</option>
              `).join('')}
            </select>
            <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2
                         pointer-events-none text-outline text-sm">expand_more</span>
          </div>
        </div>

        <!-- Voice (standard/instruction) -->
        <div id="voice-section" class="space-y-2">
          <label class="text-[9px] uppercase tracking-widest text-primary font-bold block"
                 data-i18n="voice_profile">Voice Profile</label>
          <div class="relative">
            <select id="sel-voice" class="sunken-input w-full px-4 py-3 rounded-xl
                                          text-on-surface appearance-none pr-10 text-sm">
              ${voices.map(v => `
                <option value="${_esc(v.id)}" ${v.id === this._cfg.speaker ? 'selected' : ''}>
                  ${_esc(v.name)}${v.description ? ' – ' + _esc(v.description) : ''}
                </option>
              `).join('')}
            </select>
            <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2
                         pointer-events-none text-outline text-sm">expand_more</span>
          </div>
        </div>

        <!-- Output format -->
        <div class="space-y-2">
          <label class="text-[9px] uppercase tracking-widest text-primary font-bold block"
                 data-i18n="output_format">Output Format</label>
          <div class="flex gap-1 p-1 bg-surface-container-lowest rounded-xl">
            ${['m4b','m4a','wav'].map(f => `
            <button data-fmt="${f}"
                    class="fmt-btn flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all
                           ${f === 'm4b'
                             ? 'bg-surface-container-highest text-primary'
                             : 'text-on-surface-variant hover:text-on-surface'}">
              ${f.toUpperCase()}
            </button>`).join('')}
          </div>
        </div>

        <!-- Instruction (mode=instruction) -->
        <div id="instruction-section" class="md:col-span-2 space-y-2 hidden">
          <label class="text-[9px] uppercase tracking-widest text-primary font-bold block"
                 data-i18n="voice_instruction">Style Instruction</label>
          <textarea id="inp-instruction" rows="3"
                    class="sunken-input w-full px-4 py-3 rounded-xl text-on-surface resize-none text-sm"
                    data-i18n-attr="placeholder" data-i18n="instruction_placeholder"
                    placeholder="e.g. Speak slowly and clearly with a warm tone."></textarea>
        </div>

        <!-- Clone audio (mode=clone) -->
        <div id="clone-section" class="md:col-span-2 space-y-4 hidden">
          <div class="space-y-2">
            <label class="text-[9px] uppercase tracking-widest text-primary font-bold block"
                   data-i18n="reference_audio">Reference Audio</label>
            <div class="flex gap-2">
              <div class="flex-1 sunken-input px-4 py-3 rounded-xl text-sm text-on-surface-variant
                          flex items-center gap-2 overflow-hidden">
                <span class="material-symbols-outlined text-outline text-sm shrink-0">mic</span>
                <span id="clone-path-label" class="truncate" data-i18n="no_file_selected">No file selected</span>
              </div>
              <button id="clone-browse-btn"
                      class="px-4 py-3 bg-surface-container-highest text-primary rounded-xl
                             text-xs font-bold hover:bg-surface-bright transition-all">
                <span data-i18n="browse">Browse</span>
              </button>
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-[9px] uppercase tracking-widest text-primary font-bold block"
                   data-i18n="clone_transcript">Transcript (optional, improves quality)</label>
            <textarea id="inp-transcript" rows="2"
                      class="sunken-input w-full px-4 py-3 rounded-xl text-on-surface resize-none text-sm"
                      placeholder="Transcript of the reference audio…"></textarea>
          </div>
        </div>

        <!-- Model size (Qwen3) -->
        ${sizes.length > 1 ? `
        <div class="space-y-2">
          <label class="text-[9px] uppercase tracking-widest text-primary font-bold block"
                 data-i18n="model_size">Model Size</label>
          <div class="flex gap-1 p-1 bg-surface-container-lowest rounded-xl">
            ${sizes.map(s => `
            <button data-size="${_esc(s.id)}"
                    class="size-btn flex-1 py-2 text-xs font-semibold rounded-lg transition-all
                           ${s.id === this._cfg.model_size
                             ? 'bg-surface-container-highest text-primary'
                             : 'text-on-surface-variant hover:text-on-surface'}"
                    title="${_esc(s.description)}">
              ${_esc(s.label)}
            </button>`).join('')}
          </div>
        </div>` : ''}

      </div>
    </div>

    <!-- Right: preview / start -->
    <div class="bg-surface-container-high rounded-2xl p-6 flex flex-col gap-6
                items-center text-center justify-between">

      <div class="w-full space-y-2">
        <span class="material-symbols-outlined text-4xl text-primary">graphic_eq</span>
        <h4 class="font-headline font-bold text-lg" data-i18n="ready_to_convert">Ready to Convert</h4>
        <p class="text-xs text-on-surface-variant leading-relaxed" data-i18n="ready_desc">
          Configure your engine and click Start to begin synthesis.
        </p>
      </div>

      <!-- Waveform decoration -->
      <div class="flex items-end justify-center gap-1 h-16 w-full">
        ${Array.from({length:16}, (_,i) => {
          const h = [40,60,30,80,50,70,40,90,20,60,40,80,30,70,50,90][i];
          const d = (i * 0.12).toFixed(2);
          return `<div class="waveform-bar w-1 bg-tertiary rounded-full"
                       style="height:${h}%;animation-delay:${d}s"></div>`;
        }).join('')}
      </div>

      <div class="w-full space-y-3">
        <div class="text-xs text-on-surface-variant space-y-1">
          <div class="flex justify-between">
            <span data-i18n="files">Files</span>
            <span class="text-primary font-bold">${fileCount}</span>
          </div>
          <div class="flex justify-between">
            <span data-i18n="engine">Engine</span>
            <span id="summary-engine" class="text-on-surface font-medium">
              ${_esc(eng?.name || '—')}
            </span>
          </div>
        </div>

        <button id="start-btn"
                class="w-full py-4 bg-gradient-to-br from-primary to-primary-container
                       text-on-primary font-bold rounded-2xl flex items-center justify-center gap-2
                       active:scale-95 transition-all shadow-lg shadow-primary-container/20
                       ${fileCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}">
          <span class="material-symbols-outlined icon-fill">play_arrow</span>
          <span data-i18n="start_conversion">Start Conversion</span>
        </button>
      </div>
    </div>
  </section>

</div>`;

    I18n.applyAll();
    this._attachEvents(container);
    this._updateModeUI(container);
  }

  _engineCard(e) {
    const active = e.id === this._selectedEngine;
    return `
<div data-engine-id="${_esc(e.id)}"
     class="engine-card p-5 rounded-xl cursor-pointer transition-all border-2
            ${active
              ? 'bg-surface-container-highest/40 border-primary/40'
              : 'bg-surface-container border-transparent hover:bg-surface-container-highest/50 hover:border-outline-variant/20'}">
  <div class="flex justify-between items-start mb-3">
    <div class="w-11 h-11 rounded-lg ${active ? 'bg-primary-container' : 'bg-surface-container-lowest'}
                flex items-center justify-center">
      <span class="material-symbols-outlined ${active ? 'text-primary' : 'text-on-surface-variant'} text-2xl">
        psychology
      </span>
    </div>
    ${active ? `<span class="bg-primary/20 text-primary text-[9px] font-bold px-2 py-0.5
                             rounded-full uppercase tracking-wider" data-i18n="active">Active</span>` : ''}
  </div>
  <h3 class="font-headline text-base font-bold mb-1">${_esc(e.name)}</h3>
  <p class="text-on-surface-variant text-xs leading-relaxed mb-3">${_esc(e.description)}</p>
  <div class="flex gap-3 text-[9px] text-on-surface-variant/60 font-medium flex-wrap">
    ${e.supports_cloning ? `<span class="flex items-center gap-1">
      <span class="material-symbols-outlined text-sm">record_voice_over</span> Voice Cloning</span>` : ''}
    ${e.supports_instruction ? `<span class="flex items-center gap-1">
      <span class="material-symbols-outlined text-sm">edit_note</span> Instructions</span>` : ''}
    <span class="flex items-center gap-1">
      <span class="material-symbols-outlined text-sm">language</span> ${e.languages?.length || 1} langs
    </span>
  </div>
</div>`;
  }

  _attachEvents(container) {
    // Engine card selection
    container.querySelectorAll('.engine-card').forEach(card => {
      card.addEventListener('click', () => {
        this._selectedEngine = card.dataset.engineId;
        this.render(container);
      });
    });

    // Mode buttons
    container.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._cfg.voice_mode = btn.dataset.mode;
        this._updateModeUI(container);
        // Restyle buttons
        container.querySelectorAll('.mode-btn').forEach(b => {
          b.classList.toggle('bg-surface-container-highest', b.dataset.mode === this._cfg.voice_mode);
          b.classList.toggle('text-primary', b.dataset.mode === this._cfg.voice_mode);
          b.classList.toggle('text-on-surface-variant', b.dataset.mode !== this._cfg.voice_mode);
        });
      });
    });

    // Format buttons
    let selectedFmt = 'm4b';
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

    // Size buttons
    container.querySelectorAll('.size-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._cfg.model_size = btn.dataset.size;
        container.querySelectorAll('.size-btn').forEach(b => {
          b.classList.toggle('bg-surface-container-highest', b.dataset.size === this._cfg.model_size);
          b.classList.toggle('text-primary', b.dataset.size === this._cfg.model_size);
          b.classList.toggle('text-on-surface-variant', b.dataset.size !== this._cfg.model_size);
        });
      });
    });

    // Clone audio browse
    container.querySelector('#clone-browse-btn')?.addEventListener('click', async () => {
      const paths = await API.selectFilesNative();
      if (paths?.[0]) {
        this._cfg.clone_audio_path = paths[0];
        const label = container.querySelector('#clone-path-label');
        if (label) label.textContent = paths[0].split(/[\\/]/).pop();
      }
    });

    // Start conversion
    container.querySelector('#start-btn')?.addEventListener('click', async () => {
      if (this.app.state.pendingFiles.length === 0) {
        this.app.showToast(I18n.t('no_files_selected') || 'No files selected', 'error');
        return;
      }
      await this._startConversion(container, selectedFmt);
    });
  }

  async _startConversion(container, outputFmt) {
    const btn = container.querySelector('#start-btn');
    if (btn) { btn.disabled = true; btn.textContent = I18n.t('starting') || 'Starting…'; }

    // Collect latest field values
    const lang = container.querySelector('#sel-language')?.value || this._cfg.language;
    const spk  = container.querySelector('#sel-voice')?.value   || this._cfg.speaker;
    const inst = container.querySelector('#inp-instruction')?.value || '';
    const trs  = container.querySelector('#inp-transcript')?.value  || '';

    const engineCfg = {
      ...this._cfg,
      language:       lang,
      speaker:        spk,
      instruction:    inst,
      clone_transcript: trs,
    };

    try {
      const result = await API.createJob({
        input_files:   this.app.state.pendingFiles.map(f => f.path),
        engine:        this._selectedEngine,
        engine_config: engineCfg,
        output_format: outputFmt,
      });

      this.app.state.currentJobId = result.job_id;
      this.app.state.pendingFiles = []; // clear queue after submitting
      this.app.navigate('progress', { jobId: result.job_id });
    } catch (e) {
      this.app.showToast(`Error: ${e.message}`, 'error');
      if (btn) { btn.disabled = false; btn.textContent = I18n.t('start_conversion') || 'Start Conversion'; }
    }
  }

  _updateModeUI(container) {
    const mode = this._cfg.voice_mode;
    const voice = container.querySelector('#voice-section');
    const instr = container.querySelector('#instruction-section');
    const clone = container.querySelector('#clone-section');
    if (voice) voice.classList.toggle('hidden', mode === 'clone');
    if (instr) instr.classList.toggle('hidden', mode !== 'instruction');
    if (clone) clone.classList.toggle('hidden', mode !== 'clone');
  }

  unmount() {}
}

function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
