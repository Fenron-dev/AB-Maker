/**
 * Conversion Progress view – circular progress, waveform, log console.
 */

import { API }  from '../api.js';
import { I18n } from '../i18n.js';

export class ProgressView {
  constructor(app, params = {}) {
    this.app   = app;
    this.jobId = params.jobId || app.state.currentJobId || null;
    this._ws   = null;
    this._startTime = null;
  }

  async render(container) {
    container.innerHTML = `
<div class="px-6 py-8 max-w-4xl mx-auto space-y-6 pb-28 md:pb-8">

  <!-- Header -->
  <div class="space-y-1">
    <p class="text-[10px] uppercase tracking-[0.12em] text-primary font-semibold"
       data-i18n="progress_subtitle">Synthesis Pipeline</p>
    <h2 class="font-headline text-3xl font-extrabold text-on-surface tracking-tight"
        data-i18n="progress_title">Conversion Progress</h2>
  </div>

  <!-- No active job -->
  <div id="no-job-msg" class="hidden text-center py-16 space-y-4">
    <span class="material-symbols-outlined text-6xl text-outline">hourglass_empty</span>
    <p class="text-on-surface-variant" data-i18n="no_active_job">No active conversion.</p>
    <button data-view-link="dashboard"
            class="px-6 py-2.5 bg-surface-container-highest text-primary rounded-xl font-medium text-sm
                   hover:bg-surface-bright transition-all">
      <span data-i18n="go_dashboard">Go to Dashboard</span>
    </button>
  </div>

  <!-- Active job -->
  <div id="job-panel" class="hidden space-y-6">

    <!-- Hero circular progress -->
    <section class="relative p-8 rounded-3xl bg-surface-container overflow-hidden">
      <div class="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-primary/10 blur-[80px] rounded-full"></div>

      <div class="relative z-10 flex flex-col items-center gap-6">
        <!-- SVG ring -->
        <div class="relative w-52 h-52">
          <svg class="w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="88" fill="none"
                    stroke="#32343e" stroke-width="10"/>
            <circle id="progress-ring" cx="100" cy="100" r="88" fill="none"
                    stroke="url(#ring-grad)" stroke-width="10"
                    stroke-linecap="round"
                    stroke-dasharray="553"
                    stroke-dashoffset="553"/>
            <defs>
              <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0"   stop-color="#c8bfff"/>
                <stop offset="1"   stop-color="#5a3ed8"/>
              </linearGradient>
            </defs>
          </svg>
          <div class="absolute inset-0 flex flex-col items-center justify-center">
            <span id="pct-label" class="font-headline font-extrabold text-4xl tracking-tighter text-on-surface">0%</span>
            <span class="text-[9px] uppercase tracking-wider text-on-surface-variant mt-1"
                  data-i18n="complete">Complete</span>
          </div>
        </div>

        <!-- Book title -->
        <div class="text-center">
          <h3 id="job-title" class="font-headline text-xl font-bold text-on-surface">—</h3>
          <p id="job-subtitle" class="text-sm text-on-surface-variant mt-1">—</p>
        </div>

        <!-- Controls -->
        <div class="flex gap-3">
          <button id="cancel-btn"
                  class="px-7 py-2.5 rounded-full bg-error-container text-on-error-container
                         font-semibold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all text-sm">
            <span class="material-symbols-outlined">close</span>
            <span data-i18n="cancel">Cancel</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Stats + waveform bento -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Time -->
      <div class="p-5 rounded-2xl bg-surface-container-low flex flex-col justify-between">
        <div>
          <span class="text-[9px] uppercase tracking-wider text-primary font-semibold"
                data-i18n="elapsed">Elapsed</span>
          <p id="elapsed-label" class="font-headline text-2xl font-bold mt-1 text-on-surface">00:00</p>
        </div>
        <div class="space-y-1.5 mt-4">
          <div class="flex justify-between text-xs">
            <span class="text-on-surface-variant" data-i18n="chunks_done">Chunks</span>
            <span id="chunk-label" class="text-on-surface font-medium">0 / 0</span>
          </div>
          <div class="h-1 w-full bg-surface-container-highest rounded-full overflow-hidden">
            <div id="chunk-bar" class="h-full bg-primary rounded-full transition-all w-0"></div>
          </div>
        </div>
      </div>

      <!-- Waveform -->
      <div class="md:col-span-2 p-5 rounded-2xl bg-surface-container-lowest relative overflow-hidden
                  flex flex-col justify-between h-40">
        <div class="flex justify-between items-start z-10 relative">
          <div>
            <span class="text-[9px] uppercase tracking-wider text-tertiary font-semibold"
                  data-i18n="live_synthesis">Live Synthesis</span>
            <p id="current-text" class="text-xs text-on-surface-variant mt-1 italic truncate max-w-xs">—</p>
          </div>
          <span class="material-symbols-outlined text-tertiary">graphic_eq</span>
        </div>
        <div class="flex items-end justify-center gap-[3px] h-16 px-2">
          ${Array.from({length:20}, (_,i) => {
            const h = [40,60,30,80,50,70,35,90,20,55,45,80,30,65,50,85,25,70,40,75][i];
            const d = (i * 0.1).toFixed(1);
            return `<div class="waveform-bar w-1 bg-tertiary rounded-full" style="height:${h}%;animation-delay:${d}s"></div>`;
          }).join('')}
        </div>
        <div class="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-tertiary/10 to-transparent"></div>
      </div>
    </div>

    <!-- Log console -->
    <section class="bg-surface-container-low rounded-2xl p-5">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-headline font-bold flex items-center gap-2 text-base">
          <span class="material-symbols-outlined text-primary text-sm">terminal</span>
          <span data-i18n="log_console">Pipeline Log</span>
        </h4>
        <span class="text-[9px] font-bold px-2 py-0.5 bg-surface-container-highest rounded text-on-surface-variant uppercase tracking-wider"
              id="log-status" data-i18n="logging_active">ACTIVE</span>
      </div>
      <div id="log-console"
           class="bg-surface-container-lowest rounded-xl p-4 font-mono text-xs
                  leading-relaxed h-44 overflow-y-auto space-y-1.5">
        <p class="text-on-surface-variant">
          <span class="text-primary/50 text-[9px] mr-2">[--:--:--]</span>
          <span data-i18n="waiting_for_job">Waiting for job to start…</span>
        </p>
      </div>
    </section>

    <!-- Completed panel -->
    <div id="done-panel" class="hidden p-6 bg-surface-container rounded-2xl border border-secondary-container/30
                                 flex flex-col md:flex-row items-center gap-4 justify-between">
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-secondary-container/20 flex items-center justify-center text-secondary">
          <span class="material-symbols-outlined icon-fill">check_circle</span>
        </div>
        <div>
          <p class="font-bold text-on-surface" data-i18n="conversion_complete">Conversion complete!</p>
          <p id="done-path" class="text-xs text-on-surface-variant mt-0.5 truncate max-w-xs">—</p>
        </div>
      </div>
      <div class="flex gap-3">
        <button id="reveal-btn"
                class="px-4 py-2 bg-surface-container-highest text-on-surface rounded-xl text-sm
                       font-medium hover:bg-surface-bright transition-all flex items-center gap-2">
          <span class="material-symbols-outlined text-sm">folder_open</span>
          <span data-i18n="reveal_file">Show in Folder</span>
        </button>
        <button data-view-link="library"
                class="px-4 py-2 bg-gradient-to-br from-primary to-primary-container
                       text-on-primary rounded-xl text-sm font-bold transition-all
                       flex items-center gap-2 active:scale-95">
          <span class="material-symbols-outlined text-sm">library_music</span>
          <span data-i18n="go_library">Library</span>
        </button>
      </div>
    </div>

  </div><!-- /job-panel -->
</div>`;

    I18n.applyAll();
    this._attachEvents(container);
    await this._init(container);
  }

  async _init(container) {
    if (!this.jobId) {
      // Check for any running job
      try {
        const jobs = await API.listJobs();
        const running = jobs.find(j => ['running', 'pending'].includes(j.status));
        if (running) this.jobId = running.id;
      } catch {}
    }

    const noMsg   = container.querySelector('#no-job-msg');
    const jobPanel= container.querySelector('#job-panel');

    if (!this.jobId) {
      noMsg?.classList.remove('hidden');
      return;
    }

    jobPanel?.classList.remove('hidden');
    this._startTime = Date.now();
    this._startElapsedTimer(container);
    this._connectWebSocket(container);
  }

  _connectWebSocket(container) {
    this._ws = API.openProgressSocket(
      this.jobId,
      msg => this._handleMessage(container, msg),
      ()  => this._onClose(container),
    );
  }

  _handleMessage(container, msg) {
    switch (msg.type) {
      case 'state':
        this._applyJobState(container, msg.job);
        break;
      case 'progress':
        this._updateProgress(container, msg.current, msg.total, msg.text);
        if (msg.log_entry) this._appendLog(container, msg.log_entry);
        break;
      case 'status':
        break;
      case 'complete':
        this._onComplete(container, msg);
        break;
      case 'error':
        this._onError(container, msg.message);
        break;
      case 'cancelled':
        this._onCancelled(container);
        break;
    }
  }

  _applyJobState(container, job) {
    const title = container.querySelector('#job-title');
    const sub   = container.querySelector('#job-subtitle');
    const name  = (job.input_files?.[0] || '').split(/[\\/]/).pop() || '—';
    if (title) title.textContent = name;
    if (sub)   sub.textContent   = `${I18n.t('engine') || 'Engine'}: ${job.engine || '—'} → ${(job.output_format || 'm4b').toUpperCase()}`;

    if (job.status === 'complete' && job.output_path) {
      this._onComplete(container, { output_path: job.output_path });
    } else if (job.status === 'error') {
      this._onError(container, job.error);
    } else if (job.status === 'running' || job.status === 'pending') {
      const p = job.progress || {};
      this._updateProgress(container, p.current || 0, p.total || 0, p.text || '');
      job.log?.forEach(e => this._appendLog(container, e));
    }
  }

  _updateProgress(container, current, total, text) {
    const pct = total > 0 ? Math.round((current / total) * 100) : 0;
    const CIRC = 553;
    const ring = container.querySelector('#progress-ring');
    if (ring) ring.setAttribute('stroke-dashoffset', String(CIRC - (CIRC * pct / 100)));
    const pctLabel = container.querySelector('#pct-label');
    if (pctLabel) pctLabel.textContent = `${pct}%`;

    const chunkLabel = container.querySelector('#chunk-label');
    if (chunkLabel) chunkLabel.textContent = `${current} / ${total}`;
    const bar = container.querySelector('#chunk-bar');
    if (bar) bar.style.width = `${pct}%`;

    const curText = container.querySelector('#current-text');
    if (curText && text) curText.textContent = text;
  }

  _appendLog(container, entry) {
    const console_ = container.querySelector('#log-console');
    if (!console_) return;
    const p = document.createElement('p');
    p.className = 'text-on-surface-variant flex gap-2';
    p.innerHTML = `<span class="text-primary/50 text-[9px] shrink-0">[${_esc(entry.time)}]</span>`
                + `<span>${_esc(entry.text)}</span>`;
    console_.appendChild(p);
    console_.scrollTop = console_.scrollHeight;
  }

  _onComplete(container, msg) {
    this._updateProgress(container, 1, 1, I18n.t('done') || 'Done!');
    const done = container.querySelector('#done-panel');
    done?.classList.remove('hidden');
    const donePath = container.querySelector('#done-path');
    if (donePath) donePath.textContent = msg.output_path || '—';
    const logStatus = container.querySelector('#log-status');
    if (logStatus) logStatus.textContent = I18n.t('done') || 'DONE';
    this._stopElapsedTimer();
    this.app.state.currentJobId = null;
    document.getElementById('active-job-indicator')?.classList.add('hidden');
    document.getElementById('active-job-indicator')?.classList.remove('flex');
  }

  _onError(container, message) {
    const log = container.querySelector('#log-console');
    if (log) {
      const p = document.createElement('p');
      p.className = 'text-error';
      p.textContent = `[ERROR] ${message}`;
      log.appendChild(p);
      log.scrollTop = log.scrollHeight;
    }
    const logStatus = container.querySelector('#log-status');
    if (logStatus) { logStatus.textContent = 'ERROR'; logStatus.classList.add('text-error'); }
    this._stopElapsedTimer();
    this.app.showToast(`Error: ${message}`, 'error');
  }

  _onCancelled(container) {
    const logStatus = container.querySelector('#log-status');
    if (logStatus) logStatus.textContent = 'CANCELLED';
    this._stopElapsedTimer();
    this.app.showToast(I18n.t('job_cancelled') || 'Job cancelled.', 'info');
  }

  _onClose() {
    this._stopElapsedTimer();
  }

  _startElapsedTimer(container) {
    this._timerInterval = setInterval(() => {
      const el = container.querySelector('#elapsed-label');
      if (!el) return;
      const secs = Math.floor((Date.now() - this._startTime) / 1000);
      const m = String(Math.floor(secs / 60)).padStart(2, '0');
      const s = String(secs % 60).padStart(2, '0');
      el.textContent = `${m}:${s}`;
    }, 1000);
  }

  _stopElapsedTimer() {
    if (this._timerInterval) { clearInterval(this._timerInterval); this._timerInterval = null; }
  }

  _attachEvents(container) {
    container.querySelector('#cancel-btn')?.addEventListener('click', async () => {
      if (!this.jobId) return;
      if (!confirm(I18n.t('confirm_cancel') || 'Cancel this conversion?')) return;
      try { await API.cancelJob(this.jobId); } catch {}
    });

    container.querySelector('[data-view-link="dashboard"]')
      ?.addEventListener('click', () => this.app.navigate('dashboard'));
    container.querySelector('[data-view-link="library"]')
      ?.addEventListener('click', () => this.app.navigate('library'));

    container.querySelector('#reveal-btn')?.addEventListener('click', async () => {
      if (this.jobId) {
        try { await API.revealInExplorer(this.jobId); } catch {}
      }
    });
  }

  unmount() {
    this._ws?.close();
    this._stopElapsedTimer();
  }
}

function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
