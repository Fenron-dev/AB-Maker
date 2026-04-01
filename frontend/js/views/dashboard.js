/**
 * Dashboard view – file selection, queue overview, quick-start.
 */

import { API }  from '../api.js';
import { I18n } from '../i18n.js';

export class DashboardView {
  constructor(app) {
    this.app = app;
    this._dragover = false;
  }

  render(container) {
    container.innerHTML = `
<div class="px-6 py-8 max-w-6xl mx-auto space-y-8 pb-28 md:pb-8">

  <!-- Hero header -->
  <div class="space-y-1">
    <p class="text-[10px] uppercase tracking-[0.12em] text-primary font-semibold"
       data-i18n="dashboard_subtitle">Audio Synthesis Studio</p>
    <h2 class="font-headline text-3xl font-extrabold text-on-surface tracking-tight"
        data-i18n="dashboard_title">Dashboard</h2>
  </div>

  <!-- Upload + stats row -->
  <section class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

    <!-- Drop zone -->
    <div id="drop-zone"
         class="lg:col-span-8 group relative overflow-hidden rounded-3xl
                bg-surface-container-low p-1 border border-outline-variant/10
                hover:border-primary/20 transition-all cursor-pointer">
      <div id="drop-inner"
           class="h-full w-full rounded-[1.3rem] bg-surface-container-lowest
                  border-2 border-dashed border-outline-variant/30
                  flex flex-col items-center justify-center p-10 text-center space-y-5
                  transition-colors group-hover:border-primary/40">

        <div class="w-20 h-20 rounded-2xl bg-primary-container/20 flex items-center justify-center
                    text-primary group-hover:scale-110 transition-transform duration-500">
          <span class="material-symbols-outlined text-4xl">upload_file</span>
        </div>

        <div class="space-y-1.5">
          <h3 class="font-headline text-xl font-bold text-on-surface"
              data-i18n="drop_title">Drop your books here</h3>
          <p class="text-on-surface-variant text-sm max-w-xs mx-auto leading-relaxed"
             data-i18n="drop_hint">EPUB, PDF or TXT – drag &amp; drop or click to browse</p>
        </div>

        <button id="browse-btn"
                class="px-7 py-2.5 bg-gradient-to-br from-primary to-primary-container
                       text-on-primary rounded-full font-bold tracking-wide shadow-lg
                       shadow-primary-container/20 active:scale-95 transition-all text-sm">
          <span data-i18n="browse_files">Browse Files</span>
        </button>

        <div class="flex gap-3 pt-1">
          <span class="text-[9px] uppercase tracking-wider font-bold text-outline
                       px-2.5 py-1 bg-surface-container rounded-lg">EPUB</span>
          <span class="text-[9px] uppercase tracking-wider font-bold text-outline
                       px-2.5 py-1 bg-surface-container rounded-lg">PDF</span>
          <span class="text-[9px] uppercase tracking-wider font-bold text-outline
                       px-2.5 py-1 bg-surface-container rounded-lg">TXT</span>
        </div>

        <!-- Hidden file input -->
        <input id="file-input" type="file" multiple accept=".txt,.epub,.pdf" class="hidden"/>
      </div>
    </div>

    <!-- Stats sidebar -->
    <div class="lg:col-span-4 flex flex-col gap-4">
      <div class="flex-1 glass-panel rounded-3xl p-6 border border-outline-variant/10
                  flex flex-col justify-between">
        <span class="text-[9px] uppercase tracking-widest text-primary/70 font-bold"
              data-i18n="stat_queue">Queue</span>
        <div>
          <span id="stat-queued" class="text-4xl font-headline font-black text-on-surface">0</span>
          <span class="text-on-surface-variant text-sm block" data-i18n="stat_queue_files">files selected</span>
        </div>
        <div class="h-1 bg-surface-container-highest rounded-full overflow-hidden">
          <div id="stat-bar" class="h-full w-0 bg-primary rounded-full transition-all duration-500"></div>
        </div>
      </div>

      <div class="flex-1 bg-primary-container rounded-3xl p-6 flex flex-col justify-between
                  text-on-primary-container">
        <span class="text-[9px] uppercase tracking-widest font-bold opacity-70"
              data-i18n="stat_completed">Completed</span>
        <div>
          <span id="stat-completed" class="text-4xl font-headline font-black">0</span>
          <span class="opacity-80 text-sm block" data-i18n="stat_audiobooks">audiobooks</span>
        </div>
        <span class="material-symbols-outlined self-end text-3xl opacity-40">library_music</span>
      </div>
    </div>
  </section>

  <!-- Selected files list -->
  <section id="selected-files-section" class="hidden space-y-4">
    <div class="flex items-center justify-between px-1">
      <h3 class="font-headline text-lg font-bold text-on-surface" data-i18n="selected_files">Selected Files</h3>
      <button id="clear-btn"
              class="text-xs text-on-surface-variant hover:text-error transition-colors font-medium"
              data-i18n="clear_all">Clear all</button>
    </div>
    <div id="file-list" class="space-y-2"></div>
    <div class="flex gap-3 pt-2">
      <button id="start-btn"
              class="flex-1 py-3.5 bg-gradient-to-br from-primary to-primary-container
                     text-on-primary rounded-2xl font-bold tracking-wide
                     shadow-lg shadow-primary-container/20 active:scale-95 transition-all
                     flex items-center justify-center gap-2">
        <span class="material-symbols-outlined">play_arrow</span>
        <span data-i18n="configure_convert">Configure &amp; Convert</span>
      </button>
    </div>
  </section>

  <!-- Recent jobs -->
  <section class="space-y-4">
    <div class="flex items-center justify-between px-1">
      <h3 class="font-headline text-lg font-bold text-on-surface" data-i18n="recent_jobs">Recent Transmissions</h3>
      <button class="text-primary text-xs font-semibold hover:underline flex items-center gap-1"
              data-view-link="library">
        <span data-i18n="view_all">View all</span>
        <span class="material-symbols-outlined text-sm">arrow_forward</span>
      </button>
    </div>
    <div id="jobs-list" class="space-y-2">
      <div class="text-on-surface-variant text-sm text-center py-8"
           data-i18n="no_jobs">No recent conversions yet.</div>
    </div>
  </section>

</div>`;

    I18n.applyAll();
    this._attachEvents(container);
    this._loadStats();
    this._renderJobsList();
  }

  _attachEvents(container) {
    const dropZone  = container.querySelector('#drop-zone');
    const dropInner = container.querySelector('#drop-inner');
    const fileInput = container.querySelector('#file-input');
    const browseBtn = container.querySelector('#browse-btn');
    const clearBtn  = container.querySelector('#clear-btn');
    const startBtn  = container.querySelector('#start-btn');

    // Drag & drop
    dropZone.addEventListener('dragover', e => {
      e.preventDefault();
      dropInner.classList.add('border-primary/60', 'bg-surface-container');
    });
    dropZone.addEventListener('dragleave', () => {
      dropInner.classList.remove('border-primary/60', 'bg-surface-container');
    });
    dropZone.addEventListener('drop', async e => {
      e.preventDefault();
      dropInner.classList.remove('border-primary/60', 'bg-surface-container');
      await this._handleDroppedFiles(e.dataTransfer.files);
    });
    dropZone.addEventListener('click', e => {
      if (e.target.closest('#browse-btn')) return;
      this._openPicker();
    });

    // Browse button
    browseBtn.addEventListener('click', e => { e.stopPropagation(); this._openPicker(); });

    // File input change (browser fallback)
    fileInput.addEventListener('change', async () => {
      if (fileInput.files.length) await this._handleDroppedFiles(fileInput.files);
      fileInput.value = '';
    });

    // Clear
    clearBtn?.addEventListener('click', () => {
      this.app.state.pendingFiles = [];
      this._updateFileList(container);
    });

    // Start
    startBtn?.addEventListener('click', () => {
      if (this.app.state.pendingFiles.length) {
        this.app.navigate('config');
      }
    });

    // "View all" link
    container.querySelector('[data-view-link="library"]')
      ?.addEventListener('click', () => this.app.navigate('library'));
  }

  async _openPicker() {
    // Try native pywebview dialog first
    const native = await API.selectFilesNative();
    if (native && native.length > 0) {
      this._addPaths(native.map(p => ({ name: p.split(/[\\/]/).pop(), path: p, isNative: true })));
      return;
    }
    // Fall back to HTML file input
    const input = document.querySelector('#file-input');
    if (input) input.click();
  }

  async _handleDroppedFiles(fileList) {
    this.app.showToast(I18n.t('uploading_files') || 'Uploading…', 'info');
    try {
      const result = await API.uploadFiles(fileList);
      const entries = result.files.map(p => ({
        name: p.split(/[\\/]/).pop(),
        path: p,
        isNative: false,
      }));
      this._addPaths(entries);
    } catch (e) {
      this.app.showToast(I18n.t('upload_error') || 'Upload failed: ' + e.message, 'error');
    }
  }

  _addPaths(entries) {
    for (const e of entries) {
      if (!this.app.state.pendingFiles.find(f => f.path === e.path)) {
        this.app.state.pendingFiles.push(e);
      }
    }
    this._updateFileList(document.getElementById('view-container'));
  }

  _updateFileList(container) {
    const files   = this.app.state.pendingFiles;
    const section = container?.querySelector('#selected-files-section');
    const list    = container?.querySelector('#file-list');
    const bar     = container?.querySelector('#stat-bar');
    const count   = container?.querySelector('#stat-queued');
    if (!section) return;

    section.classList.toggle('hidden', files.length === 0);
    if (count) count.textContent = files.length;
    if (bar)   bar.style.width = files.length > 0 ? '100%' : '0%';

    if (!list) return;
    list.innerHTML = files.map((f, i) => `
      <div class="flex items-center gap-3 p-3 bg-surface-container rounded-xl
                  border border-outline-variant/10 group">
        <div class="w-9 h-9 rounded-lg bg-surface-container-lowest flex items-center
                    justify-center text-primary shrink-0">
          <span class="material-symbols-outlined text-lg">${_fileIcon(f.name)}</span>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-on-surface truncate">${_esc(f.name)}</p>
          <p class="text-[10px] text-outline truncate">${_esc(f.path)}</p>
        </div>
        <button data-remove="${i}"
                class="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg
                       text-on-surface-variant hover:text-error hover:bg-error/10
                       transition-all">
          <span class="material-symbols-outlined text-sm">close</span>
        </button>
      </div>`).join('');

    list.querySelectorAll('[data-remove]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.remove);
        this.app.state.pendingFiles.splice(idx, 1);
        this._updateFileList(container);
      });
    });
  }

  async _loadStats() {
    try {
      const lib = await API.getLibrary();
      const el = document.getElementById('stat-completed');
      if (el) el.textContent = lib.length;
    } catch {}
  }

  async _renderJobsList() {
    try {
      const jobs = await API.listJobs();
      const recent = jobs.slice(-5).reverse();
      const list = document.getElementById('jobs-list');
      if (!list) return;

      if (recent.length === 0) return;

      list.innerHTML = recent.map(j => {
        const icon   = _jobIcon(j.status);
        const color  = _jobColor(j.status);
        const label  = I18n.t('status_' + j.status) || j.status;
        const name   = (j.input_files?.[0] || 'Unknown').split(/[\\/]/).pop();
        const prog   = j.progress;
        const pct    = prog?.total > 0 ? Math.round((prog.current / prog.total) * 100) : 0;

        return `
<div class="flex flex-col md:flex-row md:items-center justify-between p-4
            bg-surface-container rounded-2xl border border-transparent
            hover:bg-surface-container-highest/50 transition-all gap-3">
  <div class="flex items-center gap-4">
    <div class="w-11 h-11 rounded-xl bg-surface-container-lowest flex items-center
                justify-center text-${color} relative shrink-0">
      <span class="material-symbols-outlined">${icon}</span>
      ${j.status === 'running' ? `<div class="absolute -top-1 -right-1 w-2.5 h-2.5
        bg-tertiary rounded-full animate-pulse"></div>` : ''}
    </div>
    <div>
      <p class="font-semibold text-on-surface text-sm">${_esc(name)}</p>
      <div class="flex items-center gap-2 mt-0.5">
        <span class="text-[9px] uppercase tracking-wider font-bold text-outline">
          ${_esc(j.engine || '—')}
        </span>
        <span class="text-[9px] uppercase tracking-wider font-bold text-${color}">${_esc(label)}</span>
      </div>
    </div>
  </div>
  ${j.status === 'running' ? `
  <div class="md:w-52 flex flex-col gap-1">
    <div class="flex justify-between text-[9px] font-bold uppercase text-outline">
      <span>${prog?.text?.substring(0,30) || ''}</span><span>${pct}%</span>
    </div>
    <div class="h-1.5 bg-surface-container-lowest rounded-full overflow-hidden">
      <div class="h-full bg-gradient-to-r from-primary to-tertiary rounded-full
                  transition-all" style="width:${pct}%"></div>
    </div>
  </div>` : ''}
</div>`;
      }).join('');
    } catch {}
  }

  unmount() {}
}

// ── helpers ───────────────────────────────────────────────────

function _fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'epub') return 'auto_stories';
  if (ext === 'pdf')  return 'picture_as_pdf';
  return 'article';
}

function _jobIcon(status) {
  return { running: 'graphic_eq', complete: 'check_circle', error: 'error', pending: 'schedule', cancelled: 'cancel' }[status] ?? 'help';
}

function _jobColor(status) {
  return { running: 'tertiary', complete: 'secondary', error: 'error', pending: 'outline', cancelled: 'outline' }[status] ?? 'outline';
}

function _esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
