const teleprompterState = {
  mode: null,
  popupWindow: null,
  isPlaying: false,
  speed: 120,
  fontSize: 30,
  theme: 'dark',
  lastFrameTs: 0,
  rafId: null,
  inlineNotice: ''
};
const TELEPROMPTER_DEFAULT_SPEED = 120;
const TELEPROMPTER_POPUP_WIDTH = 960;
const TELEPROMPTER_POPUP_HEIGHT = 720;
const TELEPROMPTER_MAX_FRAME_DELTA_MS = 64;
const TELEPROMPTER_STYLE_TEXT = [
  '.tp-shell {',
  '  --tp-bg: #0f172a;',
  '  --tp-panel: #111827;',
  '  --tp-text: #f8fafc;',
  '  --tp-muted: #cbd5e1;',
  '  --tp-accent: #60a5fa;',
  '  color: var(--tp-text);',
  '  background: var(--tp-panel);',
  '  border: 1px solid rgba(148,163,184,0.22);',
  '  border-radius: 14px;',
  '  box-shadow: 0 10px 28px rgba(15,23,42,0.16);',
  '  padding: 14px;',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 12px;',
  '  min-height: 260px;',
  '  min-width: 0;',
  '  overflow: hidden;',
  '  box-sizing: border-box;',
  '}',
  '.tp-inline-shell {',
  '  width: 100%;',
  '  height: 100%;',
  '  max-width: 100%;',
  '  max-height: 100%;',
  '  margin: 0;',
  '}',
  '.tp-popup-shell {',
  '  min-height: calc(100vh - 28px);',
  '  margin: 14px;',
  '  box-sizing: border-box;',
  '}',
  '.tp-theme-light {',
  '  --tp-bg: #ffffff;',
  '  --tp-panel: #f8fafc;',
  '  --tp-text: #111827;',
  '  --tp-muted: #475569;',
  '  --tp-accent: #2563eb;',
  '}',
  '.tp-theme-sepia {',
  '  --tp-bg: #f6efe2;',
  '  --tp-panel: #efe3c6;',
  '  --tp-text: #4b3521;',
  '  --tp-muted: #7c5f3b;',
  '  --tp-accent: #b45309;',
  '}',
  '.tp-theme-highcontrast {',
  '  --tp-bg: #000000;',
  '  --tp-panel: #000000;',
  '  --tp-text: #ffff00;',
  '  --tp-muted: #ffffff;',
  '  --tp-accent: #00ffff;',
  '}',
  '.tp-header {',
  '  display: flex;',
  '  justify-content: space-between;',
  '  align-items: flex-start;',
  '  gap: 10px;',
  '}',
  '.tp-title-block { min-width: 0; }',
  '.tp-title {',
  '  margin: 0;',
  '  font-size: 18px;',
  '  color: var(--tp-text);',
  '}',
  '.tp-subtitle {',
  '  margin-top: 3px;',
  '  color: var(--tp-muted);',
  '  font-size: 12px;',
  '}',
  '.tp-controls {',
  '  display: flex;',
  '  flex-wrap: wrap;',
  '  gap: 10px;',
  '  align-items: flex-end;',
  '}',
  '.tp-control {',
  '  display: flex;',
  '  flex-direction: column;',
  '  gap: 4px;',
  '  min-width: 120px;',
  '  color: var(--tp-muted);',
  '  font-size: 12px;',
  '}',
  '.tp-control select,',
  '.tp-control input[type="range"] {',
  '  width: 100%;',
  '}',
  '.tp-inline-values {',
  '  display: inline-flex;',
  '  align-items: center;',
  '  gap: 6px;',
  '}',
  '.tp-btn-row {',
  '  display: flex;',
  '  flex-wrap: wrap;',
  '  gap: 8px;',
  '  margin-left: auto;',
  '}',
  '.tp-btn {',
  '  border: 1px solid rgba(148,163,184,0.35);',
  '  background: rgba(255,255,255,0.08);',
  '  color: var(--tp-text);',
  '  border-radius: 8px;',
  '  padding: 7px 11px;',
  '  font-size: 12px;',
  '  cursor: pointer;',
  '}',
  '.tp-btn:hover { border-color: var(--tp-accent); }',
  '.tp-btn-primary {',
  '  background: var(--tp-accent);',
  '  color: #fff;',
  '  border-color: var(--tp-accent);',
  '}',
  '.tp-btn-danger {',
  '  background: #dc2626;',
  '  border-color: #dc2626;',
  '  color: #fff;',
  '}',
  '.tp-privacy-banner {',
  '  display: none;',
  '  background: rgba(37,99,235,0.18);',
  '  color: var(--tp-text);',
  '  border: 1px solid rgba(96,165,250,0.42);',
  '  border-radius: 10px;',
  '  padding: 10px 12px;',
  '  font-size: 12px;',
  '  line-height: 1.5;',
  '}',
  '.tp-privacy-banner.teams-active { display: block; }',
  '.tp-inline-notice {',
  '  display: none;',
  '  color: var(--tp-muted);',
  '  font-size: 12px;',
  '}',
  '.tp-inline-notice.tp-visible { display: block; }',
  '.tp-viewport {',
  '  flex: 1;',
  '  min-height: 220px;',
  '  overflow-y: auto;',
  '  background: var(--tp-bg);',
  '  color: var(--tp-text);',
  '  border-radius: 12px;',
  '  border: 1px solid rgba(148,163,184,0.18);',
  '  padding: 20px 24px;',
  '}',
  '.tp-content {',
  '  font-size: var(--tp-font-size, 30px);',
  '  line-height: 1.7;',
  '}',
  '.tp-content img {',
  '  max-width: 100%;',
  '  height: auto;',
  '}',
  '.tp-content h1,',
  '.tp-content h2,',
  '.tp-content h3,',
  '.tp-content h4,',
  '.tp-content h5,',
  '.tp-content h6 {',
  '  color: var(--tp-text);',
  '}',
  '.tp-content p,',
  '.tp-content li,',
  '.tp-content blockquote { color: inherit; }',
  '.tp-chapter-meta {',
  '  margin-bottom: 18px;',
  '  padding-bottom: 14px;',
  '  border-bottom: 1px solid rgba(148,163,184,0.22);',
  '}',
  '.tp-chapter-eyebrow {',
  '  font-size: 12px;',
  '  letter-spacing: 0.08em;',
  '  text-transform: uppercase;',
  '  color: var(--tp-accent);',
  '  margin-bottom: 6px;',
  '}',
  '.tp-chapter-heading {',
  '  margin: 0;',
  '  font-size: 1.1em;',
  '  line-height: 1.25;',
  '}',
  '.tp-chapter-date {',
  '  margin-top: 5px;',
  '  font-size: 0.62em;',
  '  color: var(--tp-muted);',
  '}',
  '.tp-empty {',
  '  margin: 0;',
  '  color: var(--tp-muted);',
  '}',
].join('\n');

function installTeleprompterStyles(doc) {
  if (!doc || !doc.head || doc.getElementById('teleprompterStyles')) return;
  const style = doc.createElement('style');
  style.id = 'teleprompterStyles';
  style.textContent = TELEPROMPTER_STYLE_TEXT;
  doc.head.appendChild(style);
}

function getTeleprompterSortedEvents() {
  ensureTimeline();
  return (model.timeline || []).slice().sort(compareTlDates);
}

function getLiveChapterSnapshot(ev) {
  if (!ev) return null;
  if (ev.id !== activeChapterId) return ev;
  const editor = document.getElementById('lsEditor');
  const dateInput = document.getElementById('lsNewDate');
  const titleInput = document.getElementById('lsNewTitle');
  return {
    id: ev.id,
    date: dateInput ? dateInput.value.trim() : (ev.date || ''),
    title: titleInput ? titleInput.value.trim() : (ev.title || ''),
    vignette: editor ? editor.innerHTML : (ev.vignette || ''),
    isDraft: !!ev.isDraft,
    excludeFromExport: !!ev.excludeFromExport
  };
}

function getTeleprompterSelectedChapterId() {
  const events = getTeleprompterSortedEvents();
  if (!events.length) return null;
  if (activeChapterId && events.some(ev => ev.id === activeChapterId)) return activeChapterId;
  return events[0].id;
}

function getTeleprompterChapterLabel(ev, idx) {
  const live = getLiveChapterSnapshot(ev) || ev || {};
  const bits = [live.date, getTeleprompterDisplayTitle(live, idx), live.isDraft ? 'Draft' : ''].filter(Boolean);
  return bits.join(' - ');
}

function getTeleprompterDisplayTitle(ev, idx) {
  return (ev && ev.title) ? ev.title : ('Chapter ' + ((idx || 0) + 1));
}

function getTeleprompterChapterHtml(ev) {
  if (!ev) return '<p class="tp-empty">No chapters yet. Add a Life Story chapter to start teleprompting.</p>';
  const live = getLiveChapterSnapshot(ev) || ev;
  const title = getTeleprompterDisplayTitle(live);
  const date = live.date || '';
  let bodyHtml = '';
  if (live.vignette) {
    bodyHtml = vignetteIsHtml(live.vignette)
      ? sanitizeVignetteHtml(live.vignette)
      : '<p style="white-space:pre-wrap">' + escapeHtml(live.vignette) + '</p>';
  }
  if (!bodyHtml) bodyHtml = '<p class="tp-empty">No vignette text yet for this chapter.</p>';
  return ''
    + '<div class="tp-chapter-meta">'
    +   '<div class="tp-chapter-eyebrow">' + escapeHtml(activeChapterId === live.id ? 'Active chapter' : 'Selected chapter') + (live.isDraft ? ' - Draft' : '') + '</div>'
    +   '<h1 class="tp-chapter-heading">' + escapeHtml(title) + '</h1>'
    +   (date ? '<div class="tp-chapter-date">' + escapeHtml(date) + '</div>' : '')
    + '</div>'
    + bodyHtml;
}

function getTeleprompterToggleButton() {
  return document.getElementById('lsTeleprompterToggle');
}

function updateTeleprompterToggleUI() {
  const btn = getTeleprompterToggleButton();
  if (!btn) return;
  const isOpen = !!teleprompterState.mode;
  btn.textContent = isOpen ? 'Close Teleprompter' : 'Open Teleprompter';
  btn.classList.toggle('ls-btn-primary', isOpen);
  btn.setAttribute('aria-pressed', isOpen ? 'true' : 'false');
}

function ensureTeleprompterPopupWindow() {
  let win = teleprompterState.popupWindow;
  if (win && !win.closed) return win;
  win = window.open('', 'lifeStoryTeleprompter', 'popup=yes,width=' + TELEPROMPTER_POPUP_WIDTH + ',height=' + TELEPROMPTER_POPUP_HEIGHT + ',resizable=yes,scrollbars=yes');
  if (!win) return null;
  teleprompterState.popupWindow = win;
  if (!win.document || !win.document.getElementById('tpWindowHost')) {
    win.document.open();
    win.document.write('<!doctype html><html><head><meta charset="utf-8"><title>Life Story Teleprompter</title></head><body style="margin:0;background:#020617"><div id="tpWindowHost"></div></body></html>');
    win.document.close();
  }
  installTeleprompterStyles(win.document);
  if (!win.__teleprompterCloseBound) {
    win.addEventListener('beforeunload', function() {
      if (teleprompterState.popupWindow !== win) return;
      teleprompterState.popupWindow = null;
      teleprompterState.mode = null;
      teleprompterState.isPlaying = false;
      teleprompterState.lastFrameTs = 0;
      syncTeleprompter();
    });
    win.__teleprompterCloseBound = true;
  }
  return win;
}

function getTeleprompterMarkup(isPopup) {
  return ''
    + '<section class="tp-shell' + (isPopup ? ' tp-popup-shell' : ' tp-inline-shell') + '">'
    +   '<div class="tp-header">'
    +     '<div class="tp-title-block">'
    +       '<h2 class="tp-title">Life Story Teleprompter</h2>'
    +       '<div class="tp-subtitle" data-tp-ref="status"></div>'
    +     '</div>'
    +     '<button type="button" class="tp-btn" data-tp-action="close">Close</button>'
    +   '</div>'
    +   '<div class="tp-controls">'
    +     '<label class="tp-control"><span>Chapter</span><select data-tp-ref="chapter"></select></label>'
    +     '<label class="tp-control"><span>Scroll speed</span><div class="tp-inline-values"><input type="range" min="10" max="180" step="5" data-tp-ref="speed"><span data-tp-ref="speedValue"></span></div></label>'
    +     '<label class="tp-control"><span>Text size</span><div class="tp-inline-values"><input type="range" min="18" max="48" step="2" data-tp-ref="size"><span data-tp-ref="sizeValue"></span></div></label>'
    +     '<label class="tp-control"><span>Readability</span><select data-tp-ref="theme"><option value="dark">Dark</option><option value="light">Light</option><option value="sepia">Sepia</option><option value="highcontrast">High contrast</option></select></label>'
    +     '<div class="tp-btn-row">'
    +       '<button type="button" class="tp-btn tp-btn-primary" data-tp-action="playpause"></button>'
    +       '<button type="button" class="tp-btn" data-tp-action="reset">Reset</button>'
    +       '<button type="button" class="tp-btn tp-btn-primary" data-tp-action="joinTeams">Join Teams</button>'
    +       '<button type="button" class="tp-btn tp-btn-danger" data-tp-action="leaveTeams">Leave Teams</button>'
    +     '</div>'
    +   '</div>'
    +   '<div class="tp-privacy-banner" data-tp-ref="privacyBanner">&#128274; Teams session active - the diagram view remains locked for privacy until you leave the session.</div>'
    +   '<div class="tp-inline-notice" data-tp-ref="notice"></div>'
    +   '<div class="tp-viewport" data-tp-ref="viewport"><div class="tp-content" data-tp-ref="content"></div></div>'
    + '</section>';
}

function ensureTeleprompterHost(doc, host, isPopup) {
  if (!doc || !host) return null;
  installTeleprompterStyles(doc);
  if (!host.__teleprompterRefs) {
    host.innerHTML = getTeleprompterMarkup(isPopup);
    host.__teleprompterRefs = {
      shell: host.querySelector('.tp-shell'),
      status: host.querySelector('[data-tp-ref="status"]'),
      chapter: host.querySelector('[data-tp-ref="chapter"]'),
      speed: host.querySelector('[data-tp-ref="speed"]'),
      speedValue: host.querySelector('[data-tp-ref="speedValue"]'),
      size: host.querySelector('[data-tp-ref="size"]'),
      sizeValue: host.querySelector('[data-tp-ref="sizeValue"]'),
      theme: host.querySelector('[data-tp-ref="theme"]'),
      content: host.querySelector('[data-tp-ref="content"]'),
      viewport: host.querySelector('[data-tp-ref="viewport"]'),
      privacyBanner: host.querySelector('[data-tp-ref="privacyBanner"]'),
      notice: host.querySelector('[data-tp-ref="notice"]'),
      playPause: host.querySelector('[data-tp-action="playpause"]'),
      joinTeams: host.querySelector('[data-tp-action="joinTeams"]'),
      leaveTeams: host.querySelector('[data-tp-action="leaveTeams"]')
    };
    const refs = host.__teleprompterRefs;
    const closeBtn = host.querySelector('[data-tp-action="close"]');
    const resetBtn = host.querySelector('[data-tp-action="reset"]');
    if (closeBtn) closeBtn.addEventListener('click', closeTeleprompter);
    if (refs.chapter) refs.chapter.addEventListener('change', function() {
      if (!this.value) return;
      loadLsChapter(this.value);
    });
    if (refs.speed) refs.speed.addEventListener('input', function() {
      teleprompterState.speed = Number(this.value) || teleprompterState.speed;
      syncTeleprompter();
    });
    if (refs.size) refs.size.addEventListener('input', function() {
      teleprompterState.fontSize = Number(this.value) || teleprompterState.fontSize;
      syncTeleprompter();
    });
    if (refs.theme) refs.theme.addEventListener('change', function() {
      teleprompterState.theme = this.value || 'dark';
      syncTeleprompter();
    });
    if (refs.playPause) refs.playPause.addEventListener('click', toggleTeleprompterPlayback);
    if (resetBtn) resetBtn.addEventListener('click', resetTeleprompterScroll);
    if (refs.joinTeams) refs.joinTeams.addEventListener('click', function() {
      window.focus();
      openTeamsJoinModal();
    });
    if (refs.leaveTeams) refs.leaveTeams.addEventListener('click', leaveTeamsSession);
  }
  return host.__teleprompterRefs;
}

function getTeleprompterInlineHost() {
  return document.getElementById('lsTeleprompterRoot');
}

function getTeleprompterViewport() {
  if (teleprompterState.mode === 'popup' && teleprompterState.popupWindow && !teleprompterState.popupWindow.closed) {
    return teleprompterState.popupWindow.document.querySelector('[data-tp-ref="viewport"]');
  }
  if (teleprompterState.mode === 'inline') {
    const host = getTeleprompterInlineHost();
    return host ? host.querySelector('[data-tp-ref="viewport"]') : null;
  }
  return null;
}

function teleprompterFrame(ts) {
  if (!teleprompterState.isPlaying) {
    teleprompterState.rafId = null;
    return;
  }
  const viewport = getTeleprompterViewport();
  if (!viewport) {
    teleprompterState.isPlaying = false;
    teleprompterState.lastFrameTs = 0;
    teleprompterState.rafId = null;
    syncTeleprompter();
    return;
  }
  if (!teleprompterState.lastFrameTs) teleprompterState.lastFrameTs = ts;
  const delta = Math.min(TELEPROMPTER_MAX_FRAME_DELTA_MS, ts - teleprompterState.lastFrameTs);
  teleprompterState.lastFrameTs = ts;
  const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight);
  if (viewport.scrollTop >= maxScroll) {
    teleprompterState.isPlaying = false;
    teleprompterState.lastFrameTs = 0;
    teleprompterState.rafId = null;
    syncTeleprompter();
    return;
  }
  viewport.scrollTop = Math.min(maxScroll, viewport.scrollTop + ((teleprompterState.speed || TELEPROMPTER_DEFAULT_SPEED) * delta / 1000));
  teleprompterState.rafId = requestTeleprompterFrame();
}

function requestTeleprompterFrame() {
  return window.requestAnimationFrame(teleprompterFrame);
}

function cancelTeleprompterFrame() {
  if (!teleprompterState.rafId) return;
  window.cancelAnimationFrame(teleprompterState.rafId);
  teleprompterState.rafId = null;
}

function setTeleprompterPlaying(shouldPlay) {
  teleprompterState.isPlaying = !!shouldPlay;
  teleprompterState.lastFrameTs = 0;
  if (!teleprompterState.isPlaying) cancelTeleprompterFrame();
  if (teleprompterState.isPlaying && !teleprompterState.rafId) {
    teleprompterState.rafId = requestTeleprompterFrame();
  }
  syncTeleprompter();
}

function toggleTeleprompterPlayback() {
  setTeleprompterPlaying(!teleprompterState.isPlaying);
}

function resetTeleprompterScroll() {
  const viewport = getTeleprompterViewport();
  if (viewport) viewport.scrollTop = 0;
  setTeleprompterPlaying(false);
}

function updateTeleprompterHost(doc, host, isPopup) {
  const refs = ensureTeleprompterHost(doc, host, isPopup);
  if (!refs) return;
  const events = getTeleprompterSortedEvents();
  const selectedId = getTeleprompterSelectedChapterId();
  const selectedEvent = events.find(ev => ev.id === selectedId) || null;
  const priorChapterId = refs.viewport.dataset.chapterId || '';

  refs.chapter.innerHTML = '';
  if (!events.length) {
    const opt = doc.createElement('option');
    opt.value = '';
    opt.textContent = 'No chapters available';
    refs.chapter.appendChild(opt);
    refs.chapter.disabled = true;
  } else {
    events.forEach((ev, idx) => {
      const opt = doc.createElement('option');
      opt.value = ev.id;
      opt.textContent = getTeleprompterChapterLabel(ev, idx);
      refs.chapter.appendChild(opt);
    });
    refs.chapter.disabled = false;
    refs.chapter.value = selectedId || '';
  }

  refs.shell.className = 'tp-shell' + (isPopup ? ' tp-popup-shell' : ' tp-inline-shell') + ' tp-theme-' + (teleprompterState.theme || 'dark');
  refs.shell.style.setProperty('--tp-font-size', teleprompterState.fontSize + 'px');
  refs.speed.value = String(teleprompterState.speed);
  refs.speedValue.textContent = teleprompterState.speed + 'px/s';
  refs.size.value = String(teleprompterState.fontSize);
  refs.sizeValue.textContent = teleprompterState.fontSize + 'px';
  refs.theme.value = teleprompterState.theme;
  refs.status.textContent = selectedEvent
    ? (selectedId === activeChapterId ? 'Showing the active chapter vignette' : 'Showing the selected chapter vignette')
    : 'Choose a chapter to begin teleprompting';
  refs.content.innerHTML = getTeleprompterChapterHtml(selectedEvent);
  refs.playPause.textContent = teleprompterState.isPlaying ? 'Pause' : 'Play';
  refs.playPause.setAttribute('aria-pressed', teleprompterState.isPlaying ? 'true' : 'false');
  refs.privacyBanner.classList.toggle('teams-active', teamsSessionActive);
  refs.joinTeams.style.display = teamsSessionActive ? 'none' : 'inline-flex';
  refs.leaveTeams.style.display = teamsSessionActive ? 'inline-flex' : 'none';
  refs.notice.classList.toggle('tp-visible', !!teleprompterState.inlineNotice && !isPopup);
  refs.notice.textContent = !isPopup ? (teleprompterState.inlineNotice || '') : '';

  refs.viewport.dataset.chapterId = selectedId || '';
  if ((selectedId || '') !== priorChapterId) {
    refs.viewport.scrollTop = 0;
    teleprompterState.lastFrameTs = 0;
  }
}

function syncTeleprompter() {
  updateTeleprompterToggleUI();
  const inlinePanel = document.getElementById('lsTeleprompterPanel');
  if (inlinePanel) inlinePanel.hidden = teleprompterState.mode !== 'inline';
  if (teleprompterState.mode === 'inline') {
    updateTeleprompterHost(document, getTeleprompterInlineHost(), false);
  }
  if (teleprompterState.mode === 'popup') {
    if (!teleprompterState.popupWindow || teleprompterState.popupWindow.closed) {
      teleprompterState.mode = null;
      teleprompterState.popupWindow = null;
      teleprompterState.isPlaying = false;
      teleprompterState.lastFrameTs = 0;
      updateTeleprompterToggleUI();
      return;
    }
    updateTeleprompterHost(teleprompterState.popupWindow.document, teleprompterState.popupWindow.document.getElementById('tpWindowHost'), true);
  }
}

function openTeleprompter() {
  teleprompterState.inlineNotice = '';
  teleprompterState.mode = 'inline';
  updateTeleprompterHost(document, getTeleprompterInlineHost(), false);
  syncTeleprompter();
}

function closeTeleprompter() {
  setTeleprompterPlaying(false);
  teleprompterState.inlineNotice = '';
  if (teleprompterState.popupWindow && !teleprompterState.popupWindow.closed) {
    teleprompterState.popupWindow.close();
  }
  teleprompterState.popupWindow = null;
  teleprompterState.mode = null;
  syncTeleprompter();
}

function toggleTeleprompter() {
  if (teleprompterState.mode) closeTeleprompter();
  else openTeleprompter();
}
