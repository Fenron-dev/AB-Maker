/**
 * API client: thin wrappers around fetch() and WebSocket.
 */

const BASE = window.location.origin;

async function _req(method, path, body) {
  const opts = {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${method} ${path} → ${res.status}: ${txt}`);
  }
  return res.json();
}

const API = {
  // Config
  getConfig:    ()     => _req('GET',  '/api/config'),
  updateConfig: (data) => _req('PUT',  '/api/config', data),
  resetConfig:  ()     => _req('POST', '/api/config/reset'),

  // Engines
  getEngines: () => _req('GET', '/api/engines'),

  // File upload (browser/drag-and-drop fallback)
  uploadFiles(fileList) {
    const fd = new FormData();
    for (const f of fileList) fd.append('files', f);
    return fetch(BASE + '/api/upload', { method: 'POST', body: fd }).then(r => r.json());
  },

  // Jobs
  createJob:  (data)   => _req('POST',   '/api/jobs', data),
  listJobs:   ()       => _req('GET',    '/api/jobs'),
  getJob:     (id)     => _req('GET',    `/api/jobs/${id}`),
  cancelJob:  (id)     => _req('DELETE', `/api/jobs/${id}`),

  // Library
  getLibrary:      ()   => _req('GET',    '/api/library'),
  deleteFromLib:   (id) => _req('DELETE', `/api/library/${id}`),
  revealInExplorer:(id) => _req('POST',   `/api/library/${id}/reveal`),

  // Locales
  getLocale: (lang) => _req('GET', `/api/locales/${lang}`),

  // WebSocket helper
  openProgressSocket(jobId, onMessage, onClose) {
    const wsBase = BASE.replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBase}/ws/progress/${jobId}`);
    ws.onmessage = e => { try { onMessage(JSON.parse(e.data)); } catch {} };
    ws.onclose   = () => onClose && onClose();
    ws.onerror   = () => onClose && onClose();
    return ws;
  },

  // Native file dialog (pywebview only)
  async selectFilesNative() {
    if (window.pywebview?.api?.open_file_dialog) {
      return await window.pywebview.api.open_file_dialog();
    }
    return null; // Not in native mode
  },

  async selectFolderNative() {
    if (window.pywebview?.api?.open_folder_dialog) {
      return await window.pywebview.api.open_folder_dialog();
    }
    return null;
  },

  async openPathNative(path) {
    if (window.pywebview?.api?.open_path) {
      return await window.pywebview.api.open_path(path);
    }
  },
};

export { API };
