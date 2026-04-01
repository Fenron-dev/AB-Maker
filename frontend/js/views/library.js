/**
 * Library view – grid of completed audiobooks with playback and management.
 */

import { API }  from '../api.js';
import { I18n } from '../i18n.js';

export class LibraryView {
  constructor(app) {
    this.app = app;
    this._books = [];
    this._search = '';
    this._audio  = null; // active <audio> element
    this._nowPlaying = null;
  }

  async render(container) {
    try {
      this._books = await API.getLibrary();
    } catch { this._books = []; }

    container.innerHTML = `
<div class="px-6 py-8 max-w-6xl mx-auto space-y-8 pb-28 md:pb-10">

  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
    <div>
      <p class="text-[10px] uppercase tracking-[0.12em] text-primary font-semibold"
         data-i18n="library_subtitle">Audio Archives</p>
      <h2 class="font-headline text-3xl font-extrabold text-on-surface tracking-tight"
          data-i18n="library_title">Library</h2>
    </div>
    <div class="flex items-center gap-3">
      <div class="relative">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2
                     text-on-surface-variant text-sm pointer-events-none">search</span>
        <input id="search-input" type="text"
               class="bg-surface-container-lowest rounded-xl py-2.5 pl-10 pr-4 text-sm w-full md:w-64
                      text-on-surface focus:ring-1 focus:ring-primary/30 border-none
                      placeholder:text-on-surface-variant/50 transition-all"
               data-i18n-attr="placeholder" data-i18n="search_placeholder"
               placeholder="Search audiobooks…"/>
      </div>
    </div>
  </div>

  <!-- Book grid -->
  <div id="book-grid" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
    <div class="col-span-3 text-center py-16 space-y-3">
      <span class="material-symbols-outlined text-5xl text-outline">library_music</span>
      <p class="text-on-surface-variant" data-i18n="library_empty">
        No audiobooks yet. Convert your first book on the Dashboard.
      </p>
    </div>
  </div>

</div>

<!-- Sticky audio player (bottom) -->
<div id="audio-player"
     class="hidden fixed bottom-0 md:left-64 left-0 right-0 z-50
            bg-surface-container-high/90 backdrop-blur-xl
            border-t border-outline-variant/10
            px-6 py-3">
  <div class="max-w-6xl mx-auto flex items-center gap-5">
    <div class="hidden sm:flex w-11 h-11 rounded-lg bg-surface-container-lowest
                items-center justify-center text-primary shrink-0">
      <span class="material-symbols-outlined">audio_file</span>
    </div>
    <div class="flex-1 min-w-0">
      <p id="player-title" class="text-sm font-bold text-on-surface truncate">—</p>
      <p id="player-info"  class="text-[9px] uppercase tracking-wider text-on-surface-variant font-semibold">—</p>
      <div class="mt-1.5 flex items-center gap-3">
        <span id="player-time" class="text-[9px] text-on-surface-variant font-mono w-10 shrink-0">0:00</span>
        <div id="player-bar" class="flex-1 h-1 bg-surface-container-highest rounded-full overflow-hidden cursor-pointer">
          <div id="player-progress" class="h-full bg-gradient-to-r from-primary to-primary-container w-0 rounded-full transition-none"></div>
        </div>
        <span id="player-duration" class="text-[9px] text-on-surface-variant font-mono w-10 text-right shrink-0">0:00</span>
      </div>
    </div>
    <div class="flex items-center gap-1 shrink-0">
      <button id="player-prev" class="p-2 text-on-surface-variant hover:text-on-surface">
        <span class="material-symbols-outlined">skip_previous</span>
      </button>
      <button id="player-play"
              class="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container
                     text-on-primary flex items-center justify-center active:scale-95 transition-all">
        <span class="material-symbols-outlined icon-fill">play_arrow</span>
      </button>
      <button id="player-next" class="p-2 text-on-surface-variant hover:text-on-surface">
        <span class="material-symbols-outlined">skip_next</span>
      </button>
      <button id="player-close" class="p-2 text-on-surface-variant hover:text-error ml-1">
        <span class="material-symbols-outlined">close</span>
      </button>
    </div>
  </div>
  <audio id="audio-el" class="hidden"></audio>
</div>`;

    I18n.applyAll();
    this._attachEvents(container);
    this._renderGrid(container);
  }

  _renderGrid(container) {
    const grid = container.querySelector('#book-grid');
    if (!grid) return;

    const q = this._search.toLowerCase();
    const filtered = this._books.filter(b => {
      const name = (b.output_path || '').split(/[\\/]/).pop();
      return !q || name.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="col-span-3 text-center py-16 space-y-3">
          <span class="material-symbols-outlined text-5xl text-outline">library_music</span>
          <p class="text-on-surface-variant"
             data-i18n="${this._search ? 'no_results' : 'library_empty'}">
            ${this._search ? 'No results found.' : 'No audiobooks yet.'}
          </p>
        </div>`;
      return;
    }

    grid.innerHTML = filtered.map(b => this._bookCard(b)).join('');

    // Bind card actions
    grid.querySelectorAll('[data-play]').forEach(btn => {
      btn.addEventListener('click', () => {
        const b = filtered.find(x => x.id === btn.dataset.play);
        if (b) this._playBook(container, b);
      });
    });
    grid.querySelectorAll('[data-reveal]').forEach(btn => {
      btn.addEventListener('click', () => API.revealInExplorer(btn.dataset.reveal).catch(() => {}));
    });
    grid.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm(I18n.t('confirm_delete') || 'Delete this audiobook entry?')) return;
        await API.deleteFromLib(btn.dataset.delete).catch(() => {});
        this._books = this._books.filter(b => b.id !== btn.dataset.delete);
        this._renderGrid(container);
      });
    });
  }

  _bookCard(b) {
    const name     = (b.output_path || '').split(/[\\/]/).pop() || 'Unknown';
    const size     = b.file_size    ? _fmtSize(b.file_size)         : '—';
    const duration = b.duration_seconds ? _fmtDuration(b.duration_seconds) : '—';
    const date     = b.completed_at ? new Date(b.completed_at).toLocaleDateString() : '—';
    const engine   = b.engine || '—';

    return `
<div class="group bg-surface-container p-5 rounded-2xl hover:bg-surface-container-high
            transition-all duration-200 flex flex-col justify-between h-52 relative overflow-hidden">

  <!-- Top row -->
  <div class="flex justify-between items-start">
    <div class="p-2.5 bg-primary-container/20 rounded-xl">
      <span class="material-symbols-outlined text-primary">audio_file</span>
    </div>
    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button data-reveal="${_esc(b.id)}"
              class="p-2 rounded-lg hover:bg-surface-container-highest text-on-surface-variant
                     hover:text-primary transition-colors" title="${I18n.t('reveal_file') || 'Show in folder'}">
        <span class="material-symbols-outlined text-lg">folder_open</span>
      </button>
      <button data-delete="${_esc(b.id)}"
              class="p-2 rounded-lg hover:bg-error/10 text-on-surface-variant
                     hover:text-error transition-colors" title="${I18n.t('delete') || 'Delete'}">
        <span class="material-symbols-outlined text-lg">delete</span>
      </button>
    </div>
  </div>

  <!-- Info -->
  <div class="mt-2 flex-1 min-h-0">
    <h3 class="font-headline font-bold text-on-surface text-sm truncate">${_esc(name)}</h3>
    <div class="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
      <span class="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant">${_esc(size)}</span>
      <span class="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant">${_esc(duration)}</span>
      <span class="text-[9px] uppercase tracking-wider font-semibold text-on-surface-variant">${_esc(date)}</span>
    </div>
  </div>

  <!-- Bottom row -->
  <div class="flex justify-between items-center pt-3 mt-2 border-t border-outline-variant/10">
    <div class="flex items-center gap-2">
      <div class="w-4 h-4 rounded-full bg-primary-container/30 flex items-center justify-center">
        <span class="material-symbols-outlined text-[10px] text-primary">psychology</span>
      </div>
      <span class="text-[10px] text-on-surface-variant font-medium">${_esc(engine)}</span>
    </div>
    <button data-play="${_esc(b.id)}"
            class="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-container
                   text-on-primary flex items-center justify-center active:scale-95 transition-all
                   shadow-md shadow-primary-container/20">
      <span class="material-symbols-outlined icon-fill text-lg">play_arrow</span>
    </button>
  </div>
</div>`;
  }

  _playBook(container, book) {
    this._nowPlaying = book;
    const player = container.querySelector('#audio-player') || document.getElementById('audio-player');
    const audioEl = document.getElementById('audio-el');
    if (!player || !audioEl) return;

    player.classList.remove('hidden');
    const name = (book.output_path || '').split(/[\\/]/).pop();
    document.getElementById('player-title').textContent = name;
    document.getElementById('player-info').textContent  = `${book.engine || '—'}`;

    // Serve the local file via API (proxy via backend would be needed for local paths).
    // For .m4b/.m4a we can try to serve via a static route or use the native open path.
    // For now, trigger native open (system default player).
    API.openPathNative(book.output_path).catch(() => {});

    // Hide player after a moment since we opened externally
    setTimeout(() => player.classList.add('hidden'), 2000);
  }

  _attachEvents(container) {
    // Search
    container.querySelector('#search-input')?.addEventListener('input', e => {
      this._search = e.target.value;
      this._renderGrid(container);
    });

    // Player controls
    document.getElementById('player-close')?.addEventListener('click', () => {
      document.getElementById('audio-player')?.classList.add('hidden');
      document.getElementById('audio-el').pause();
    });
  }

  unmount() {
    if (this._audio) { this._audio.pause(); this._audio = null; }
  }
}

function _fmtSize(bytes) {
  if (bytes > 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes > 1e6) return (bytes / 1e6).toFixed(0) + ' MB';
  return (bytes / 1e3).toFixed(0) + ' KB';
}

function _fmtDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
