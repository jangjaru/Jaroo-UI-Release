// ==UserScript==
// @name         Jaroo · Status & Command Center
// @namespace    jaroo-company.local
// @version      6.9.8
// @description  E-book RUN/DONE and ALL/ONLY; first-paint quiet controls, verified native-state detection and cross-tab synchronization.
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/status.user.js
// @downloadURL  https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/status.user.js
// ==/UserScript==

(() => {
  'use strict';
  const RUNTIME = '__jarooCommandCenterRuntimeV4';
  window[RUNTIME]?.dispose?.();
  window.__jarooNativeCapture?.stop?.();
  const VERSION = '6.9.8';
  const HOVER_MS = 400;
  const ROOTS = '#stage-sidebar,#stage-slideover-sidebar,#slate-sidebar,[data-testid="sidebar"]';
  const ARCHIVE = '[data-sidebar-archive-chatgpt-id]';
  const OWN_ROW = '[data-jaroo-native-row="true"]';
  const OWN_BADGE = '.jaroo-native-badge';
  let disposed = false, scheduled = 0, discoveryTimer = 0, rowDirty = true;
  let watchedSidebars = [], rowNodes = [], lastRoute = '', lastSignature = '', lastError = '';
  let nativeTitle = document.title, lastAppliedTitle = '', generatedFavicon = null;
  let dock = null, dockStyle = null, panel = null, panelOpen = false;
  let hoverTimer = 0, hoveredAnchor = null, tooltip = null, tooltipStyle = null;
  let lastDockHost = null, panelSignature = '';
  let observedClock = null;
  // v6.5: View preference belongs to this browser tab. The chat/status store
  // remains untouched; only presentation of the native navigation changes.
  const FOCUS_PREF = 'jaroo:sidebar:run-done-only:v71';
  let focusWanted = false;
  try { focusWanted = sessionStorage.getItem(FOCUS_PREF) === 'status'; } catch (_) {}
  let focusList = null, focusEntries = null, focusBranch = null, focusSignature = '';
  const FOCUS_MENU_ATTR = 'data-jaroo-focus-native-menu';
  const FOCUS_CSS_ID = 'jaroo-focus-native-menu-v71';
  document.getElementById(FOCUS_CSS_ID)?.remove();
  const focusStyle = document.createElement('style');
  focusStyle.id = FOCUS_CSS_ID;
  focusStyle.textContent = `
    [data-jaroo-focus-fallback="true"] :is([data-sidebar-archive-chatgpt-id],[data-jaroo-chat-row="true"]){
      max-height:0!important;min-height:0!important;height:0!important;
      margin-block:0!important;padding-block:0!important;
      border-block-width:0!important;overflow:hidden!important;
      opacity:0!important;pointer-events:none!important;
    }
    /* Clip without display:none, hidden, inert, or moving React nodes.
       The native ChatGPT status observer must still see its rendered rows. */
    [${FOCUS_MENU_ATTR}="clipped"]{
      height:0!important;min-height:0!important;max-height:0!important;
      margin-block:0!important;padding-block:0!important;
      border-block-width:0!important;overflow:hidden!important;visibility:hidden!important;
      opacity:0!important;pointer-events:none!important;
    }
  `;
  (document.head || document.documentElement).append(focusStyle);
  const iconCache = new Map();
  document.getElementById('jaroo-selected-frame-fit-v6312')?.remove();

  const idFromPath = () => location.pathname.match(/\/c\/([0-9a-f-]{8,})\b/i)?.[1]?.toLowerCase() || '';
  const validId = id => /^[0-9a-f-]{8,}$/i.test(id || '');
  const linkId = el => el?.getAttribute('href')?.match(/\/c\/([0-9a-f-]{8,})\b/i)?.[1]?.toLowerCase() || '';
  const getRowId = row => (row?.getAttribute('data-sidebar-archive-chatgpt-id') ||
    (row?.matches('a[href*="/c/"]') ? linkId(row) : linkId(row?.querySelector('a[href*="/c/"]'))) || '').toLowerCase();
  const safePath = (raw, id) => {
    try { const u = new URL(raw, location.origin); return u.origin === location.origin &&
      u.pathname.toLowerCase().includes(`/c/${id}`) ? u.pathname + u.search : ''; }
    catch { return ''; }
  };
  const labelFor = row => (row?.getAttribute('aria-label') ||
    row?.querySelector('[data-thread-title="true"]')?.textContent ||
    row?.querySelector('a[href*="/c/"]')?.getAttribute('aria-label') ||
    (row?.matches('a[href*="/c/"]') ? row.textContent : '') || '')
    .replace(/\s+/g, ' ').trim().slice(0, 180);
  const setAttr = (el, name, value) => { if (el.getAttribute(name) !== value) el.setAttribute(name, value); };

  // The platform-owned indicator remains untouched. It is one input to the
  // separately synchronized display state, not a stored completion history.
  function nativeStatus(row) {
    const value = row?.getAttribute('data-sidebar-indicator');
    return value === 'working' ? 'working' : value === 'unread' ? 'done' : null;
  }

  function compactChatRow(anchor) {
    const explicit = anchor.closest(ARCHIVE);
    if (explicit) return explicit;
    if (anchor.hasAttribute('data-sidebar-indicator')) return anchor;
    const id = linkId(anchor);
    let choice = anchor;
    for (let node = anchor.parentElement, depth = 0; node && depth < 3; node = node.parentElement, depth++) {
      if (watchedSidebars.includes(node) || node.matches('nav,aside,main,section')) break;
      if (node.querySelector('[data-app-action-sidebar-project-row]')) break;
      const links = [...node.querySelectorAll('a[href*="/c/"]')];
      if (!links.length || links.some(a => linkId(a) !== id)) break;
      if (node.hasAttribute('data-sidebar-indicator')) return node;
      if (node.matches('[role="group"],li,[data-testid^="history-item"]')) choice = node;
    }
    return choice;
  }

  function rows() {
    if (!rowDirty && rowNodes.every(row => row.isConnected)) return rowNodes;
    rowDirty = false;
    const result = [], seen = new Set();
    const add = row => { if (!seen.has(row) && validId(getRowId(row))) { seen.add(row); result.push(row); } };
    for (const root of watchedSidebars) {
      if (!root.isConnected) continue;
      root.querySelectorAll(ARCHIVE).forEach(add);
      for (const anchor of root.querySelectorAll('a[href*="/c/"]')) {
        if (!validId(linkId(anchor)) || anchor.closest('[data-native-menu-root],[popover]')) continue;
        if (!anchor.closest(ARCHIVE)) add(compactChatRow(anchor));
      }
    }
    for (const old of rowNodes) if (!seen.has(old)) cleanRow(old);
    rowNodes = result;
    return result;
  }

  function validRecords() {
    return statusBus.records().filter(record => record.status === 'working' || record.status === 'done')
      .sort((a, b) => a.status === b.status ? b.run.clock - a.run.clock : a.status === 'working' ? -1 : 1);
  }

  function cleanRow(row) {
    if (!row?.querySelectorAll) return;
    row.querySelectorAll('.jaroo-native-badge,.jaroo-recent-status-badge').forEach(el => {
      if (el.closest('[data-jaroo-native-row="true"]') === row) el.remove();
    });
    for (const el of row.querySelectorAll('[data-jaroo-native-hidden],[data-jaroo-native-leading],[data-jaroo-status-slot],[data-jaroo-badge-host]')) {
      if (el.closest('[data-jaroo-native-row="true"]') !== row) continue;
      for (const attr of ['data-jaroo-native-hidden','data-jaroo-native-leading','data-jaroo-status-slot','data-jaroo-status','data-jaroo-status-label','data-jaroo-badge-host']) el.removeAttribute(attr);
    }
    for (const attr of ['data-jaroo-native-row','data-jaroo-chat-row','data-jaroo-selected','data-jaroo-live-status','data-jaroo-badge-layout','data-jaroo-badge-host','data-jaroo-sync-status','data-jaroo-last-badge-state','data-jaroo-effective-status']) row.removeAttribute(attr);
    row.style.removeProperty('--jaroo-selected-frame-left');
    row.style.removeProperty('--jaroo-selected-frame-right');
  }

  // The native chat list owns visual RUN/unread indicators. Our aggregate
  // state observer only marks the selected row and keeps its row identity.
  function renderRows() {
    const current = idFromPath();
    for (const row of rows()) {
      const id = getRowId(row);
      if (!row.hasAttribute('data-sidebar-archive-chatgpt-id')) setAttr(row, 'data-jaroo-chat-row', 'true');
      setAttr(row, 'data-jaroo-native-row', 'true');
      const link = row.matches('a[href*="/c/"]') ? row : row.querySelector('a[href*="/c/"]');
      if (id === current || row.getAttribute('aria-current') === 'page' || link?.getAttribute('aria-current') === 'page') setAttr(row, 'data-jaroo-selected', 'true');
      else row.removeAttribute('data-jaroo-selected');
    }
  }

  function hideTip() {
    clearTimeout(hoverTimer); hoverTimer = 0; hoveredAnchor = null;
    if (tooltip) tooltip.style.display = 'none';
  }
  function chatAnchor(target) {
    const anchor = target?.closest?.('a[href*="/c/"]');
    return anchor && watchedSidebars.some(root => root.contains(anchor)) ? anchor : null;
  }
  function showTip(anchor) {
    if (!anchor?.isConnected || hoveredAnchor !== anchor) return;
    const row = anchor.closest(OWN_ROW) || anchor;
    const title = labelFor(row), area = anchor.querySelector('[data-thread-title="true"]');
    const truncated = area?.getAttribute('data-marquee-overflowing') === 'true' || (area && area.scrollWidth > area.clientWidth + 5);
    if (!title || !truncated) return;
    setupPanel(); tooltip.textContent = title; tooltip.style.display = 'block';
    const r = anchor.getBoundingClientRect(), w = tooltip.getBoundingClientRect().width, h = tooltip.getBoundingClientRect().height;
    tooltip.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left)) + 'px';
    tooltip.style.top = (r.bottom + h + 8 < innerHeight ? r.bottom + 6 : Math.max(8, r.top - h - 6)) + 'px';
  }
  function hoverIn(event) {
    const anchor = chatAnchor(event.target instanceof Element ? event.target : null);
    if (!anchor || hoveredAnchor === anchor) return;
    hideTip(); hoveredAnchor = anchor;
    hoverTimer = setTimeout(() => { hoverTimer = 0; showTip(anchor); }, HOVER_MS);
  }
  function hoverOut(event) {
    if (!hoveredAnchor) return;
    if (event.relatedTarget instanceof Node && hoveredAnchor.contains(event.relatedTarget)) return;
    hideTip();
  }


  // Shared observations only. No server requests, fabricated completion or native-attribute writes.
  function createStatusBus(options = {}) {
    const VERSION = 2, CHANNEL = 'jaroo-status-observations-v68';
    const PREFIX = 'jaroo:status:v68:writer:', LEASE = 12000, HEARTBEAT = 4000, TERMINAL = 86400000;
    const MAX_RECORDS = 200, MAX_WRITERS = 128, MAX_BYTES = 262144;
    const now = typeof options.now === 'function' ? options.now : Date.now;
    const visible = typeof options.visible === 'function' ? options.visible : () => !document.hidden;
    const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    const eventTarget = options.eventTarget || window;
    let storage = options.storage, Broadcast = options.Broadcast;
    try { if (storage === undefined) storage = localStorage; } catch (_) { storage = null; }
    try { if (Broadcast === undefined) Broadcast = window.BroadcastChannel; } catch (_) { Broadcast = null; }
    const origin = typeof location !== 'undefined' ? location.origin : 'https://chatgpt.com';
    const writer = 'w-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() :
      Math.floor(now()).toString(36) + '-' + Math.random().toString(36).slice(2, 15));
    const own = new Map(), peers = new Map(), watching = new Set(), stopTokens = new Map();
    let channel = null, disposed = false, stateSeq = 0, publishSeq = 0, lastPublish = 0;
    let lastVisible = false, lastSignature = '', maximumClock = 0, storageErrors = 0, channelErrors = 0;
    const workingSources = new Set(['native-working', 'composer-stop', 'work-panel']);
    const doneSources = new Set(['native-unread', 'composer-idle']);
    const sourceSet = new Set([...workingSources, ...doneSources]);
    const time = () => Math.max(0, Math.floor(Number(now()) || 0));
    const isVisible = () => { try { return Boolean(visible()); } catch (_) { return false; } };
    const validWriter = value => typeof value === 'string' && /^[A-Za-z0-9_-]{4,96}$/.test(value);
    const validId = value => typeof value === 'string' && /^[0-9a-f-]{8,80}$/i.test(value);
    const sameRun = (a, b) => !!a && !!b && a.clock === b.clock && a.origin === b.origin && a.owner === b.owner;
    const compareRun = (a, b) => a.clock - b.clock || a.origin.localeCompare(b.origin);
    const token = run => ({ clock: run.clock, origin: run.origin, owner: run.owner });
    function validRun(run, at) {
      return run && Number.isSafeInteger(run.clock) && run.clock >= 0 && run.clock <= at + 300000 &&
        validWriter(run.origin) && (run.owner === null || validWriter(run.owner));
    }
    function safeHref(value, id) {
      if (typeof value !== 'string' || value.length > 2048 || !value) return '';
      try {
        const url = new URL(value, origin), match = url.pathname.match(/\/c\/([0-9a-f-]{8,80})(?:\/|$)/i);
        return url.origin === origin && !url.username && !url.password && match?.[1].toLowerCase() === id.toLowerCase()
          ? url.pathname + url.search : '';
      } catch (_) { return ''; }
    }
    function metadata(meta, id, prior) {
      const suppliedTitle = typeof meta?.title === 'string' ? meta.title.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 180) : '';
      const title = suppliedTitle || prior?.title || '';
      return { title, href: safeHref(meta?.href, id) || prior?.href || '' };
    }
    function clone(record) { return record ? { ...record, run: token(record.run) } : null; }
    function allFor(id) {
      const list = [];
      if (own.has(id)) list.push({ ...own.get(id), visible: lastVisible, publishedAt: lastPublish });
      for (const snapshot of peers.values()) {
        const record = snapshot.records.get(id);
        if (record) list.push({ ...record, visible: snapshot.visible, publishedAt: snapshot.at });
      }
      return list;
    }
    function choose(list, at, includeExpired = false) {
      if (!list.length) return null;
      const newest = list.reduce((best, item) => compareRun(item.run, best.run) > 0 ? item : best);
      const generation = list.filter(item => sameRun(item.run, newest.run));
      // An accepted terminal is latched for this run. Heartbeats do not reopen it.
      const terminal = generation.filter(item => item.status !== 'working');
      const rank = item => item.status === 'ack' ? 4 : item.writer === item.run.owner ? 3 : item.authority === 'current' ? 2 : 1;
      let selected;
      if (terminal.length) selected = terminal.sort((a, b) => rank(b) - rank(a) ||
        (a.writer === b.writer ? b.stateSeq - a.stateSeq : b.at - a.at || b.writer.localeCompare(a.writer)))[0];
      else selected = generation.filter(item => includeExpired || item.leaseUntil > at)
        .sort((a, b) => Number(b.writer === b.run.owner) - Number(a.writer === a.run.owner) ||
          Number(b.authority === 'current') - Number(a.authority === 'current') || b.at - a.at || b.writer.localeCompare(a.writer))[0];
      if (!selected) return null;
      const live = selected.status === 'working' ? selected.leaseUntil > at : selected.expiresAt > at;
      return includeExpired || live ? selected : null;
    }
    const latest = id => choose(allFor(id), time(), true);
    function get(id) { return validId(id) ? clone(choose(allFor(id.toLowerCase()), time())) : null; }
    function records() {
      const ids = new Set(own.keys());
      for (const snapshot of peers.values()) for (const id of snapshot.records.keys()) ids.add(id);
      return [...ids].map(get).filter(Boolean).sort((a, b) => a.id.localeCompare(b.id));
    }
    function changed() {
      if (disposed) return;
      const signature = JSON.stringify(records().map(item => [item.id, item.status, item.run, item.title, item.href, item.source]));
      if (signature === lastSignature) return;
      lastSignature = signature;
      try { onChange(); } catch (_) { /* Presentation failures do not change observed state. */ }
    }
    function freshCurrentRun(id, run, exceptWriter = null) {
      const at = time();
      return allFor(id).some(item => sameRun(item.run, run) && item.writer !== exceptWriter &&
          item.status === 'working' && item.authority === 'current' && item.observing && item.visible &&
          item.leaseUntil > at && item.publishedAt >= at - LEASE);
    }
    function newRun(owner) {
      maximumClock = Math.max(maximumClock + 1, time());
      return { clock: maximumClock, origin: writer, owner: owner ? writer : null };
    }
    function pruneOwn() {
      const at = time();
      for (const [id, item] of own) {
        // Keep short-lived expired entries as a generation barrier while peers settle.
        const expiry = item.status === 'working' ? item.leaseUntil : item.expiresAt;
        if (expiry + LEASE < at) { own.delete(id); watching.delete(id); stopTokens.delete(id); }
      }
      if (own.size > MAX_RECORDS) {
        const discard = [...own.values()].sort((a, b) => a.at - b.at).slice(0, own.size - MAX_RECORDS);
        for (const item of discard) { own.delete(item.id); watching.delete(item.id); stopTokens.delete(item.id); }
      }
    }
    function publish() {
      if (disposed) return;
      pruneOwn(); lastVisible = isVisible(); lastPublish = time();
      const snapshot = { version: VERSION, writer, seq: ++publishSeq, at: lastPublish, visible: lastVisible,
        records: [...own.values()].map(item => ({ ...item, run: token(item.run) })) };
      try { storage?.setItem(PREFIX + writer, JSON.stringify(snapshot)); } catch (_) { storageErrors++; }
      try { channel?.postMessage(snapshot); } catch (_) { channelErrors++; }
      changed();
    }
    function put(id, run, status, meta, source, authority) {
      const at = time(), prior = latest(id);
      const item = { id, writer, stateSeq: ++stateSeq, run: token(run), status, source, authority,
        ...metadata(meta, id, prior), at, leaseUntil: status === 'working' ? at + LEASE : 0,
        expiresAt: status === 'working' ? at + LEASE : at + TERMINAL, observing: status === 'working' };
      own.set(id, item);
      if (status === 'working') watching.add(id); else { watching.delete(id); stopTokens.delete(id); }
      maximumClock = Math.max(maximumClock, run.clock); publish(); return item;
    }
    function observeRun(id, meta = {}, hint = {}) {
      if (disposed || !validId(id) || !workingSources.has(hint.source)) return null;
      id = id.toLowerCase();
      const owner = Boolean(hint.owner), source = hint.source;
      if (!owner && source !== 'native-working') return null;
      const existing = latest(id), at = time();
      let run = existing?.run;
      if (existing?.status === 'done' || existing?.status === 'ack') {
        // A reconnected/initial STOP is not a new execution after a known terminal.
        if (!(hint.edge || hint.submitted) || hint.bootstrap) {
          releaseObservation(id); return null;
        }
        run = newRun(owner);
      } else if (!existing) run = newRun(owner);
      // Work-panel activity can be an intermediate stage of the observed STOP cycle.
      else if (owner && (hint.submitted || source === 'composer-stop' && hint.edge)) run = newRun(true);
      else if (owner && run.owner === null) run = newRun(true);
      const prior = own.get(id), authority = owner ? 'current' : 'native';
      if (!prior || !sameRun(prior.run, run) || prior.status !== 'working') put(id, run, 'working', meta, source, authority);
      else {
        watching.add(id); prior.observing = true;
        const nextMeta = metadata(meta, id, prior);
        const stronger = owner && prior.authority !== 'current';
        const updated = stronger || nextMeta.title !== prior.title || nextMeta.href !== prior.href;
        if (stronger) { prior.authority = 'current'; prior.source = source; }
        Object.assign(prior, nextMeta);
        if (updated || prior.leaseUntil <= at) { prior.leaseUntil = at + LEASE; prior.expiresAt = at + LEASE; publish(); }
      }
      if (owner && source === 'composer-stop') stopTokens.set(id, token(run));
      return token(run);
    }
    function observeDone(id, suppliedToken, meta = {}, hint = {}) {
      if (disposed || !validId(id) || !doneSources.has(hint.source)) return false;
      id = id.toLowerCase();
      const existing = latest(id), source = hint.source, owner = Boolean(hint.owner);
      if (existing?.status === 'done' || existing?.status === 'ack') {
        if (suppliedToken && !sameRun(suppliedToken, existing.run)) return false;
        return source === 'native-unread' || Boolean(suppliedToken);
      }
      if (!existing) {
        if (source !== 'native-unread' || suppliedToken || !(hint.bootstrap || hint.edge)) return false;
        put(id, newRun(false), 'done', meta, source, 'native'); return true;
      }
      if (!suppliedToken || !sameRun(suppliedToken, existing.run)) return false;
      if (source === 'composer-idle') {
        if (!owner || !sameRun(stopTokens.get(id), suppliedToken)) return false;
        // The run's own observer may finish despite a stale STOP in a duplicate tab.
        if (suppliedToken.owner !== writer && freshCurrentRun(id, suppliedToken, writer)) return false;
      } else {
        if (!hint.edge || hint.bootstrap) return false;
        if (freshCurrentRun(id, suppliedToken)) return false;
      }
      put(id, suppliedToken, 'done', meta, source, owner ? 'current' : 'native'); return true;
    }
    function releaseObservation(id) {
      if (!validId(id) || disposed) return;
      id = id.toLowerCase();
      watching.delete(id);
      const item = own.get(id);
      if (item?.status !== 'working') return;
      // Immediately revoke this tab's RUN lease when its positive UI evidence
      // disappears. The old code only toggled `observing` and kept a live
      // 90-second lease, leaving a false RUN visible across Chrome tabs.
      // Keep a short expired record for generation ordering / a subsequent
      // verified native-unread or composer-idle completion transition.
      const at = time();
      item.observing = false;
      item.leaseUntil = at;
      item.expiresAt = at;
      item.at = at;
      item.stateSeq = ++stateSeq;
      publish();
    }
    function acknowledge(id, expectedRun = null) {
      const current = get(id);
      if (disposed || current?.status !== 'done' || expectedRun && !sameRun(expectedRun, current.run)) return false;
      put(current.id, current.run, 'ack', current, current.source, 'native'); return true;
    }
    function validRecord(raw, ownerWriter, at) {
      if (!raw || !validId(raw.id) || raw.writer !== ownerWriter || !validRun(raw.run, at) ||
          !Number.isSafeInteger(raw.stateSeq) || raw.stateSeq < 1 || raw.stateSeq > 1000000000 ||
          !['working', 'done', 'ack'].includes(raw.status) || !['current', 'native'].includes(raw.authority) ||
          !sourceSet.has(raw.source) || typeof raw.observing !== 'boolean' ||
          !Number.isFinite(raw.at) || raw.at < 0 || raw.at > at + 300000 ||
          !Number.isFinite(raw.leaseUntil) || !Number.isFinite(raw.expiresAt) ||
          typeof raw.title !== 'string' || raw.title.length > 180 || typeof raw.href !== 'string' || raw.href.length > 2048) return null;
      if (raw.status === 'working' && (!workingSources.has(raw.source) || raw.leaseUntil < raw.at || raw.leaseUntil > at + LEASE + 5000)) return null;
      if (raw.status !== 'working' && (!doneSources.has(raw.source) || raw.expiresAt < raw.at || raw.expiresAt > raw.at + TERMINAL + 1000 || raw.observing)) return null;
      const id = raw.id.toLowerCase(), href = safeHref(raw.href, id);
      if (raw.href && !href) return null;
      return { id, writer: ownerWriter, stateSeq: raw.stateSeq, run: token(raw.run), status: raw.status,
        source: raw.source, authority: raw.authority, title: raw.title, href, at: raw.at,
        leaseUntil: raw.leaseUntil, expiresAt: raw.expiresAt, observing: raw.observing };
    }
    function receive(raw) {
      if (disposed) return;
      let value = raw;
      if (typeof value === 'string') {
        if (value.length > MAX_BYTES) return;
        try { value = JSON.parse(value); } catch (_) { return; }
      }
      const at = time();
      if (!value || value.version !== VERSION || !validWriter(value.writer) || value.writer === writer ||
          !Number.isSafeInteger(value.seq) || value.seq < 1 || value.seq > 1000000000 ||
          !Number.isFinite(value.at) || value.at < at - TERMINAL - LEASE || value.at > at + 300000 ||
          typeof value.visible !== 'boolean' || !Array.isArray(value.records) || value.records.length > MAX_RECORDS) return;
      const previous = peers.get(value.writer);
      if (previous && value.seq <= previous.seq) return;
      const items = new Map();
      for (const candidate of value.records) {
        const item = validRecord(candidate, value.writer, at);
        if (!item || items.has(item.id)) return;
        const old = previous?.records.get(item.id);
        if (old && (item.stateSeq < old.stateSeq || compareRun(item.run, old.run) < 0 ||
            item.stateSeq === old.stateSeq && (!sameRun(item.run, old.run) || item.status !== old.status || item.at !== old.at))) items.set(item.id, old);
        else items.set(item.id, item);
        maximumClock = Math.max(maximumClock, item.run.clock);
      }
      // A snapshot omission is not a state-clearing instruction.
      if (previous) for (const [id, item] of previous.records) {
        if (!items.has(id) && (item.status === 'working' ? item.leaseUntil : item.expiresAt) > at) items.set(id, item);
      }
      for (const [peerId, snapshot] of peers) if (snapshot.at < at - TERMINAL - LEASE) peers.delete(peerId);
      if (!items.size) { peers.delete(value.writer); changed(); return false; }
      if (!peers.has(value.writer) && peers.size >= MAX_WRITERS) {
        const oldest = [...peers.values()].sort((a, b) => a.at - b.at)[0];
        if (!oldest || oldest.at >= value.at) return;
        peers.delete(oldest.writer);
      }
      peers.set(value.writer, { writer: value.writer, seq: value.seq, at: value.at, visible: value.visible, records: items });
      for (const id of watching) {
        const current = latest(id), local = own.get(id);
        if (current && local && (compareRun(current.run, local.run) > 0 || current.status !== 'working')) {
          watching.delete(id); stopTokens.delete(id); local.observing = false;
        }
      }
      changed();
      return true;
    }
    function refreshFromStorage() {
      if (disposed || !storage) return;
      try {
        const count = Math.min(Number(storage.length) || 0, 10000);
        const keys = Array.from({ length: count }, (_, index) => storage.key(index));
        const candidates = [];
        for (const key of keys) {
          if (!key?.startsWith(PREFIX) || key === PREFIX + writer) continue;
          const raw = storage.getItem(key);
          if (typeof raw !== 'string' || raw.length > MAX_BYTES) continue;
          let value;
          try { value = JSON.parse(raw); } catch (_) { continue; }
          if (!value || value.version !== VERSION || !validWriter(value.writer) || key !== PREFIX + value.writer ||
              !Number.isFinite(value.at) || !Number.isSafeInteger(value.seq) || value.seq < 1 ||
              !Array.isArray(value.records) || value.records.length > MAX_RECORDS) continue;
          if (value.at < time() - TERMINAL - LEASE) { storage.removeItem?.(key); continue; }
          candidates.push(value);
        }
        // Old/rejected keys do not consume the live-writer budget. Prefer the most recent writers.
        candidates.sort((a, b) => b.at - a.at);
        let accepted = 0;
        for (const value of candidates) if (receive(value) && ++accepted >= MAX_WRITERS) break;
      } catch (_) { storageErrors++; }
      changed();
    }
    function onStorage(event) {
      if (typeof event.key !== 'string' || !event.key.startsWith(PREFIX)) return;
      // Deletion is cleanup, never an ACK or a terminal event.
      if (event.newValue) receive(event.newValue);
    }
    function tick() {
      if (disposed) return;
      const at = time(), visibilityChanged = isVisible() !== lastVisible;
      for (const [id, item] of own) {
        const effective = latest(id);
        if (effective && (compareRun(effective.run, item.run) > 0 || effective.status !== 'working')) watching.delete(id);
      }
      if ((own.size && at - lastPublish >= HEARTBEAT) || visibilityChanged) {
        for (const id of watching) {
          const item = own.get(id);
          // Read the live record here: never replay a RUN object captured by an old timer.
          if (item?.status === 'working') { item.leaseUntil = at + LEASE; item.expiresAt = item.leaseUntil; item.observing = true; }
        }
        publish();
      }
      for (const [id, snapshot] of peers) if (snapshot.at < at - TERMINAL - LEASE) peers.delete(id);
      changed();
    }
    function diagnostics() {
      return { version: '6.5', transport: channel ? 'broadcast+storage' : storage ? 'storage' : 'document-only',
        writers: peers.size + 1, observed: watching.size, records: records().length,
        storageErrors, channelErrors, disposed };
    }
    function dispose() {
      if (disposed) return;
      for (const item of own.values()) if (item.status === 'working') item.observing = false;
      watching.clear(); stopTokens.clear(); publish(); disposed = true;
      try { eventTarget?.removeEventListener('storage', onStorage); } catch (_) {}
      try { channel?.close(); } catch (_) {}
      peers.clear(); own.clear(); channel = null;
    }
    lastVisible = isVisible();
    try { if (typeof Broadcast === 'function') { channel = new Broadcast(CHANNEL); channel.onmessage = event => receive(event.data); } }
    catch (_) { channelErrors++; channel = null; }
    try { eventTarget?.addEventListener('storage', onStorage); } catch (_) {}
    refreshFromStorage();
    return { observeRun, observeDone, get, records, releaseObservation, acknowledge, diagnostics, refreshFromStorage, tick, dispose };
  }

  // A current-composer UI transition probe, not a server/task-completion API.
  // STOP -> an identified replacement primary idle action is required. Neither
  // missing rows, elapsed time nor a disappearing composer can produce DONE.
  function createComposerProbe({ currentId, currentNative, onRun, onComplete, scheduleRefresh, now = Date.now }) {
    const EDITS = '#prompt-textarea,[data-testid="composer-input"]';
    const EXCLUDE = '[hidden],[inert],[aria-hidden="true"],[role="dialog"],[role="menu"],[role="listbox"],aside,nav,[data-message-author-role],[data-testid^="conversation-turn"],article,.markdown,.prose,[role="log"]';
    const WORK_EXCLUDE = '[data-message-author-role],[data-testid^="conversation-turn"],article,.markdown,.prose,[role="log"],#jaroo-v4-quick-panel,#jaroo-v4-title-tip,aside,nav,#stage-sidebar,#stage-slideover-sidebar,#slate-sidebar,[data-testid="sidebar"]';
    const WORK_ROOTS = '[data-testid*="subagent" i],[data-testid*="work-status" i],[data-testid*="task-panel" i],[aria-label*="subagent" i],[aria-label*="서브에이전트"],[data-radix-popper-content-wrapper],[role="dialog"],[role="menu"],[popover]';
    const STOP_IDS = new Set(['stop-button', 'stop-streaming-button']);
    const SEND_IDS = new Set(['send-button', 'composer-submit-button']);
    const STOP_LABEL = /^(?:stop(?: generating| generation| streaming| response| work| task)?|cancel generation|응답 중지|생성 중지|생성 중단|생성 취소|작업 중지|작업 중단|작업 취소|중지)$/i;
    const SEND_LABEL = /^(?:send(?: prompt| message)?|submit prompt|start work|보내기|전송|메시지 보내기|프롬프트 보내기|작업 시작)$/i;
    const VOICE_LABEL = /^(?:start voice mode|open voice mode|use voice mode|start voice chat|음성 모드 시작|음성 모드 열기|음성 모드 사용|음성 대화 시작)$/i;
    const VOICE_OTHER = /(?:microphone|dictat|record|read aloud|reading|playback|audio|video|마이크|받아쓰기|녹음|읽기|읽어|재생)/i;
    const ACTIVE = /^(?:working|running|in[-_ ]progress|processing|작업\s*중|실행\s*중|진행\s*중|처리\s*중)$/i;
    const TERMINAL = /^(?:done|complete|completed|finished|cancelled|canceled|stopped|failed|error|완료|작업\s*완료|종료|취소|중단|실패)$/i;
    const PENDING = /^(?:pending|queued|waiting|paused|대기\s*중|일시\s*중지|보류)$/i;
    const SETTLE_MS = 900, HINT_MS = 8000;
    let disposed = false, chat = '', composer = null, editor = null;
    let previousStop = null, sawStop = false, runToken = null, stopSlot = null;
    let hint = null, manuallyStopped = false, candidate = null, settleTimer = 0;
    let lastReason = 'not-started', lastResetReason = 'not-started', lastSignals = {}, workRoots = [], previousWorkActive = null, workLost = false;
    const idleDuringStop = new Map(), unresolvedWork = new Set(), workOwners = new WeakMap();

    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim();
    const validId = value => /^[0-9a-f-]{8,}$/i.test(value || '');
    const nativeWorking = () => {
      const value = currentNative();
      return (typeof value === 'string' ? value : value?.status || value?.value) === 'working';
    };
    function visible(node) {
      if (!(node instanceof Element) || !node.isConnected || node.closest('[hidden],[inert]')) return false;
      const rect = node.getBoundingClientRect();
      if (rect.width < 3 || rect.height < 3) return false;
      if (typeof node.checkVisibility === 'function') {
        try { return node.checkVisibility({ opacityProperty: true, visibilityProperty: true }); } catch (_) {}
      }
      for (let parent = node, depth = 0; parent && depth++ < 8; parent = parent.parentElement) {
        const css = getComputedStyle(parent);
        if (css.display === 'none' || css.visibility === 'hidden' || css.visibility === 'collapse' || Number(css.opacity) === 0) return false;
      }
      return true;
    }
    function buttonKind(button) {
      if (!(button instanceof Element) || !button.matches('button') || !visible(button)) return null;
      const label = normalize(button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent);
      if (label.length > 80 || VOICE_OTHER.test(label)) return null;
      const testId = button.getAttribute('data-testid') || '';
      if (STOP_IDS.has(testId) || STOP_LABEL.test(label)) return 'stop';
      if (SEND_IDS.has(testId) || SEND_LABEL.test(label)) return 'send';
      // A voice test id alone is not enough: a microphone/dictation action can
      // remain present during generation. Require the explicit voice-mode name.
      if (VOICE_LABEL.test(label) && !button.disabled && button.getAttribute('aria-disabled') !== 'true') return 'voice';
      return null;
    }
    function buttonKey(button, kind) {
      return [kind, button.getAttribute('data-testid') || '', normalize(button.getAttribute('aria-label') || button.getAttribute('title') || button.textContent), Boolean(button.disabled), button.getAttribute('aria-disabled') || ''].join('|');
    }
    function buttons(root) {
      return [...root.querySelectorAll('button')].slice(0, 48)
        .filter(button => !button.closest('[aria-hidden="true"],[role="dialog"],[role="menu"],[role="listbox"],[popover]'))
        .map(button => ({ button, kind: buttonKind(button) })).filter(item => item.kind);
    }
    function findComposer() {
      const edits = [...document.querySelectorAll(EDITS)].slice(0, 8)
        .filter(node => !node.closest(EXCLUDE) && visible(node) &&
          (node.matches('textarea') || node.isContentEditable || node.getAttribute('contenteditable') === 'true'));
      if (edits.length !== 1) return null;
      const edit = edits[0];
      let root = edit.closest('form,[data-testid="composer"]');
      if (!root) {
        for (let parent = edit.parentElement, depth = 0; parent && depth++ < 5; parent = parent.parentElement) {
          if (parent.matches('body,html,main,article,aside,nav,section')) break;
          if (parent.querySelectorAll('button').length <= 24 && buttons(parent).length) { root = parent; break; }
        }
      }
      if (!root || root.closest(EXCLUDE) || !visible(root)) return null;
      return { root, edit };
    }
    function slotFor(button, root) {
      const a = button.getBoundingClientRect(), b = root.getBoundingClientRect();
      if (a.width < 8 || a.height < 8 || a.width > 120 || a.height > 100) return null;
      return { button, right: b.right - a.right, bottom: b.bottom - a.bottom, width: a.width, height: a.height };
    }
    function samePrimarySlot(button) {
      if (!stopSlot || !composer) return false;
      const slot = slotFor(button, composer);
      if (!slot) return false;
      return button === stopSlot.button ||
        (Math.abs(slot.right - stopSlot.right) <= 20 && Math.abs(slot.bottom - stopSlot.bottom) <= 20);
    }
    function cancelCandidate(reason) {
      clearTimeout(settleTimer); settleTimer = 0; candidate = null;
      if (reason) lastReason = reason;
    }
    function resetContinuity(reason, clearWork = true) {
      lastResetReason = reason;
      cancelCandidate(reason); previousStop = null; sawStop = false; runToken = null;
      stopSlot = null; hint = null; manuallyStopped = false; idleDuringStop.clear();
      if (clearWork) { unresolvedWork.clear(); workRoots = []; previousWorkActive = null; workLost = false; }
    }
    function ownerId(node) {
      const owner = node.closest('[data-conversation-id],[data-thread-id],[data-chat-id]');
      return normalize(owner?.getAttribute('data-conversation-id') || owner?.getAttribute('data-thread-id') || owner?.getAttribute('data-chat-id')).toLowerCase();
    }
    function workState(node) {
      const value = normalize(node.getAttribute('data-status') || node.getAttribute('data-state') ||
        (node.childElementCount === 0 ? node.textContent : ''));
      return ACTIVE.test(value) ? 'active' : TERMINAL.test(value) ? 'terminal' : PENDING.test(value) ? 'pending' : 'unknown';
    }
    function readWork() {
      let active = 0, terminal = 0, pending = 0;
      const roots = [];
      for (const root of [...document.querySelectorAll(WORK_ROOTS)].slice(0, 32)) {
        if (root.closest(WORK_EXCLUDE) || root.querySelector('[data-message-author-role],[data-testid^="conversation-turn"],#prompt-textarea') || !visible(root)) continue;
        const identity = normalize((root.getAttribute('data-testid') || '') + ' ' + (root.getAttribute('aria-label') || ''));
        const text = normalize(root.textContent);
        if (text.length > 4000 || !/subagent|서브에이전트/i.test(identity + ' ' + text)) continue;
        const explicit = ownerId(root), remembered = workOwners.get(root);
        if ((explicit && explicit !== chat) || (!explicit && remembered && remembered !== chat)) continue;
        workOwners.set(root, chat); roots.push(root);
        const nodes = [root, ...root.querySelectorAll('[data-status],[data-state],[role="status"],span,p,div')];
        if (nodes.length > 160) continue;
        for (const node of nodes) {
          if (node.closest(WORK_EXCLUDE) || !visible(node)) continue;
          const explicitNode = ownerId(node);
          if (explicitNode && explicitNode !== chat) continue;
          const state = workState(node);
          if (state === 'active' || state === 'pending') {
            if (unresolvedWork.size < 128 || unresolvedWork.has(node)) unresolvedWork.add(node);
            else workLost = true;
            if (state === 'active') active++; else pending++;
          }
          else if (state === 'terminal') terminal++;
        }
      }
      workRoots = roots.filter(root => !roots.some(other => other !== root && other.contains(root)));
      for (const node of unresolvedWork) {
        // Losing a previously active task/panel is unknown. Only that same
        // observed native status becoming terminal resolves this guard.
        if (!node.isConnected) { unresolvedWork.delete(node); workLost = true; continue; }
        if (node.isConnected && visible(node) && roots.some(root => root.contains(node)) && workState(node) === 'terminal') unresolvedWork.delete(node);
      }
      return { active, unresolved: unresolvedWork.size + Number(workLost), observed: roots.length,
        complete: Boolean(roots.length && terminal && !active && !pending && !unresolvedWork.size && !workLost) };
    }
    function reportWork(work) {
      if (work.active) {
        const token = onRun(chat, { edge: previousWorkActive === false, submitted: false, source: 'work-panel' });
        // A Work-only observation never creates the required earlier STOP.
        if (sawStop && token !== undefined && token !== null) runToken = token;
      }
      rememberWork(work);
    }
    function rememberWork(work) {
      // Hiding/reopening a panel is not a new generation. Only explicit
      // observed completion can establish an idle -> active Work edge.
      if (work.active) previousWorkActive = true;
      else if (work.complete) previousWorkActive = false;
    }
    function cleanSignals(actions, work, idleKind = '') {
      // No prompt text, task title, assistant content, or message HTML is kept.
      return { composer: Boolean(composer), stop: actions.some(item => item.kind === 'stop'), idleKind,
        workObserved: work.observed, workActive: work.active, workUnresolved: work.unresolved,
        work: { active: Boolean(work.active), observed: Boolean(work.observed), complete: Boolean(work.complete) },
        primaryButtons: actions.map(({ button, kind }) => ({ kind,
          testId: normalize(button.getAttribute('data-testid')).slice(0, 60),
          label: normalize(button.getAttribute('aria-label') || button.getAttribute('title')).slice(0, 80),
          disabled: Boolean(button.disabled) || button.getAttribute('aria-disabled') === 'true' })) };
    }
    function diagnostics() {
      return { ...lastSignals, id: chat, reason: lastReason, candidateReason: lastReason,
        stop: Boolean(lastSignals.stop), idleKind: lastSignals.idleKind || null,
        work: lastSignals.work || { active: false, observed: false, complete: false },
        continuity: Boolean(sawStop && runToken !== null && composer?.isConnected && editor?.isConnected),
        observedStop: sawStop, candidate: Boolean(candidate),
        candidateAgeMs: candidate ? Math.max(0, now() - candidate.at) : 0,
        manualStop: manuallyStopped, workLost, documentHidden: Boolean(document.hidden), continuityResetReason: lastResetReason };
    }
    function scan(reason = 'scan') {
      if (disposed) return diagnostics();
      try {
        // Background tabs can still supply real DOM transitions. Visibility
        // alone is not a continuity break; pagehide/route/remount still are.
        // Throttled timers merely delay the fresh positive-evidence recheck.
        const id = normalize(currentId()).toLowerCase(), found = findComposer();
        if (!validId(id) || !found) {
          resetContinuity(!validId(id) ? 'no-current-conversation' : 'composer-unavailable', id !== chat);
          chat = validId(id) ? id : ''; composer = null; editor = null;
          if (chat) {
            const work = readWork(); reportWork(work); lastSignals = cleanSignals([], work);
          } else lastSignals = { composer: false };
          return diagnostics();
        }
        if (id !== chat || found.root !== composer || found.edit !== editor) {
          resetContinuity(id !== chat ? 'route-changed' : 'composer-replaced', id !== chat);
          chat = id; composer = found.root; editor = found.edit;
        }
        const actions = buttons(composer), stops = actions.filter(item => item.kind === 'stop');
        if (stops.length) {
          const edge = previousStop === false;
          const submitted = Boolean(hint && hint.chat === chat && hint.root === composer && hint.edit === editor &&
            (!hint.hadStop || edge) && now() - hint.at >= 0 && now() - hint.at <= HINT_MS);
          if (edge) manuallyStopped = false;
          if (submitted) { unresolvedWork.clear(); workLost = false; manuallyStopped = false; }
          if (submitted || hint && now() - hint.at > HINT_MS) hint = null;
          cancelCandidate();
          const token = onRun(chat, { edge, submitted, source: 'composer-stop' });
          if (token !== undefined && token !== null) runToken = token;
          sawStop = true; previousStop = true;
          stopSlot = stops.length === 1 ? slotFor(stops[0].button, composer) : null;
          for (const item of actions) if (item.kind !== 'stop') idleDuringStop.set(item.button, buttonKey(item.button, item.kind));
          const work = readWork(); lastSignals = cleanSignals(actions, work);
          rememberWork(work);
          lastReason = stops.length === 1 ? 'stop-observed' : 'multiple-stop-controls';
          return diagnostics();
        }
        previousStop = false;
        const work = readWork(); reportWork(work); lastSignals = cleanSignals(actions, work);
        if (!sawStop || runToken === null) { cancelCandidate('no-continuous-stop-observation'); return diagnostics(); }
        if (manuallyStopped) { cancelCandidate('manual-stop-not-success'); return diagnostics(); }
        if (nativeWorking()) { cancelCandidate('native-working'); return diagnostics(); }
        if (work.active || work.unresolved) { cancelCandidate(work.active ? 'work-active' : 'work-observation-unknown'); return diagnostics(); }
        const idle = actions.filter(item => item.kind !== 'stop' && samePrimarySlot(item.button) &&
          idleDuringStop.get(item.button) !== buttonKey(item.button, item.kind));
        if (idle.length !== 1) { cancelCandidate(idle.length ? 'ambiguous-idle-control' : 'primary-idle-unverified'); return diagnostics(); }
        const action = idle[0], key = buttonKey(action.button, action.kind);
        lastSignals = cleanSignals(actions, work, action.kind);
        if (!candidate || candidate.token !== runToken || candidate.button !== action.button || candidate.key !== key || now() < candidate.at) {
          cancelCandidate(); candidate = { token: runToken, button: action.button, key, at: now() };
        }
        const remaining = SETTLE_MS - (now() - candidate.at);
        if (remaining > 0) {
          lastReason = 'idle-candidate';
          if (!settleTimer) settleTimer = setTimeout(() => { settleTimer = 0; if (!disposed) scheduleRefresh('composer-idle-recheck'); }, remaining);
          return diagnostics();
        }
        // This invocation re-read route, the same editor/root, native RUN, Work
        // guards and the same primary idle control; the timer itself never ends a run.
        const token = runToken;
        cancelCandidate(); sawStop = false; runToken = null; stopSlot = null;
        idleDuringStop.clear(); unresolvedWork.clear(); workLost = false; lastReason = 'ui-idle-confirmed';
        onComplete(chat, token, { source: 'composer-idle', idleKind: action.kind });
        return diagnostics();
      } catch (_) { resetContinuity('probe-error', false); return diagnostics(); }
    }
    function noteSubmit(event) {
      if (disposed || document.hidden || !event || !composer?.isConnected || !editor?.isConnected) return;
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      if (!target || !composer.contains(target) || normalize(currentId()).toLowerCase() !== chat) return;
      const button = target.closest('button');
      if (event.type === 'click' && button && buttonKind(button) === 'stop') {
        manuallyStopped = true; hint = null; cancelCandidate('manual-stop-not-success'); return;
      }
      let accepted = false;
      if (event.type === 'click' && button && buttonKind(button) === 'send')
        accepted = !button.disabled && button.getAttribute('aria-disabled') !== 'true';
      if (event.type === 'submit' && event.target === composer) {
        const sender = event.submitter;
        accepted = sender ? buttonKind(sender) === 'send' && !sender.disabled :
          buttons(composer).some(item => item.kind === 'send' && !item.button.disabled && item.button.getAttribute('aria-disabled') !== 'true');
      }
      if (event.type === 'keydown' && event.key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing && event.keyCode !== 229 && editor.contains(target))
        accepted = Boolean(normalize('value' in editor ? editor.value : editor.textContent).replace(/[\u200b\u200c\u200d\ufeff]/g, ''));
      if (accepted) {
        hint = { chat, root: composer, edit: editor, at: now(), hadStop: buttons(composer).some(item => item.kind === 'stop') };
        cancelCandidate('submit-awaiting-positive-stop');
        // A submit hint alone neither starts nor finishes a run.
        scheduleRefresh('composer-submit-hint');
      }
    }
    function suspend(reason = 'suspended') {
      resetContinuity(reason, false); composer = null; editor = null;
      lastSignals = { composer: false }; return diagnostics();
    }
    function dispose() {
      if (disposed) return;
      disposed = true; resetContinuity('disposed'); composer = null; editor = null; chat = '';
      lastSignals = { composer: false };
    }
    function targets() { return [...new Set([composer, ...workRoots].filter(node => node?.isConnected))]; }
    return { scan, noteSubmit, suspend, dispose, diagnostics, targets };
  }

  // DONE acknowledgment v6.3.1: an intentional click anywhere in the active
  // conversation reading surface OR its composer also counts as reading.
  // Earlier versions only matched exact message nodes or editable fields, so
  // clicks on empty reply space / scrolling containers were accidentally ignored.
  // Keep utility buttons, popovers, nav, unrelated chats, and page entry inert.
  function createReadAcknowledgement(options = {}) {
    const bus = options.bus;
    const sidebarRoots = options.sidebarRoots || (() => []);
    const panelRoot = options.panelRoot || (() => null);
    const rowId = options.getRowId || (row => row?.getAttribute('data-sidebar-archive-chatgpt-id') || '');
    const onAcknowledge = options.onAcknowledge || (() => {});
    const origin = options.origin || location.origin;
    const ROW = '[data-jaroo-native-row="true"],[data-sidebar-archive-chatgpt-id]';
    const LINK = 'a[href*="/c/"]';
    const CONTENT = 'main,[role="main"],#thread,#chat-messages,[data-testid="conversation-panel"],[data-testid="conversation-scroll-view"],[data-testid^="conversation-turn"],[data-testid^="message-turn"],[data-message-author-role],[data-turn-id]';
    const COMPOSER = '#prompt-textarea,[data-testid="composer"],[data-testid="composer-input"],[data-testid="prompt-textarea"],[data-testid*="composer-input"],[contenteditable="true"][role="textbox"],textarea,form:has(#prompt-textarea),form:has([contenteditable="true"][role="textbox"])';
    const ACTION = 'a[href],button,input:not([type="text"]):not([type="search"]),select,summary,[role="button"],[role="link"],[role="menu"],[role="menuitem"],[role="dialog"],[popover],[data-native-menu-root],[aria-haspopup="menu"]';
    const SIDEBAR_ACTION = 'button,input,textarea,select,summary,[contenteditable],[role="menu"],[role="menuitem"],[data-native-menu-root],[popover]';
    const OVERLAYS = '[role="dialog"],[role="menu"],[role="listbox"],[data-native-menu-root],[popover],#jaroo-v4-title-tip,[data-radix-popper-content-wrapper]';
    const recent = [];
    let accepted = 0, ignored = 0;
    function note(outcome, id = '', source = '') {
      recent.push({ outcome, id, source });
      if (recent.length > 8) recent.shift();
      if (outcome === 'acknowledged') accepted++;
      else ignored++;
    }
    function currentId() {
      return location.pathname.match(/\/c\/([0-9a-f-]{8,80})(?:\/|$)/i)?.[1]?.toLowerCase() || '';
    }
    function conversationId(anchor) {
      if (!anchor || anchor.hasAttribute('download')) return '';
      const target = anchor.getAttribute('target');
      if (target && target.toLowerCase() !== '_self') return '';
      try {
        const url = new URL(anchor.getAttribute('href'), origin);
        if (url.origin !== origin || url.username || url.password) return '';
        return url.pathname.match(/\/c\/([0-9a-f-]{8,80})(?:\/|$)/i)?.[1]?.toLowerCase() || '';
      } catch (_) { return ''; }
    }
    function handleClick(event) {
      if (!bus || !event || event.type !== 'click' || event.defaultPrevented ||
          (event.button !== undefined && event.button !== 0) ||
          event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return false;
      // Text nodes and SVG child elements still resolve to the nearest Element.
      const target = event.target instanceof Element ? event.target : event.target?.parentElement;
      if (!target?.closest) return false;
      const panel = panelRoot();
      const inPanel = Boolean(panel?.isConnected && panel.contains(target));
      const inSidebar = sidebarRoots().some(root => root?.isConnected && root.contains(target));
      let id = '', source = '';
      if (inPanel || inSidebar) {
        const row = inSidebar ? target.closest(ROW) : null;
        const anchor = target.closest(LINK) || (row?.matches(LINK) ? row : row?.querySelector(LINK));
        const expected = row ? String(rowId(row) || '').toLowerCase() : '';
        const linked = conversationId(anchor);
        // Some ChatGPT sidebar builds make the whole row clickable without
        // rendering a conventional /c/ anchor. Its stable native row ID is
        // sufficient for an explicit row click, never for a utility button.
        id = linked || (/^[0-9a-f-]{8,80}$/i.test(expected) ? expected : '');
        if (!id || linked && expected && linked !== expected) return false;
        // A sidebar row or the quick DONE list is an explicit read action;
        // icon menus, delete buttons and edit controls are not.
        const control = target.closest(SIDEBAR_ACTION);
        if (control && control !== row && control !== anchor) return false;
        source = inPanel ? 'quick-panel' : 'sidebar';
      } else {
        id = currentId();
        if (!id || target.closest(ROW) || target.closest(OVERLAYS) ||
            target.closest('header,nav,aside,[role="navigation"]')) return false;
        const composer = target.closest(COMPOSER);
        const body = target.closest(CONTENT);
        if (!composer && !body) return false;
        // Safeguard message actions (copy, feedback, share, links, send, menus).
        // A text input/textarea inside the actual composer is *not* excluded.
        const action = target.closest(ACTION);
        if (action && !(composer && action.matches('textarea,input[type="text"],input[type="search"]'))) return false;
        source = composer ? 'composer' : 'conversation-body';
      }
      const current = bus.get(id);
      if (current?.status !== 'done') {
        note('no-unread-done', id, source);
        return false;
      }
      // ACK only the same run; a subsequent/new RUN or new DONE must survive.
      if (!bus.acknowledge(id, current.run)) {
        note('generation-changed', id, source);
        return false;
      }
      note('acknowledged', id, source);
      try { onAcknowledge({ id, run: current.run, source }); }
      catch (_) { /* Diagnostics never block the ACK. */ }
      return true;
    }
    return { handleClick, diagnostics: () => ({ accepted, ignored, last: recent.slice(-5) }) };
  }

  const svgData = (color, state) => {
    const glyph = state === 'working'
      ? '<path d="M16 5A11 11 0 1 0 27 16" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/><path d="m23 5 5 1-1 5" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>'
      : state === 'done' ? '<path d="m8 17 6 6 11-13" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>'
      : '<path d="M8 16h16" stroke="#fff" stroke-width="3" stroke-linecap="round"/>';
    return 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect x="0" y="0" width="32" height="32" rx="9" fill="#282a36"/><circle cx="16" cy="16" r="13.5" fill="${color}"/>${glyph}</svg>`);
  };
  function renderTab(records) {
    const id = idFromPath(), cur = records.find(record => record.id === id);
    let prefix = '', type = '';
    const run = records.filter(r=>r.status==='working').length;
    const done = records.filter(r=>r.status==='done').length;
    if (cur?.status==='working') {prefix='[RUN] ';type='working';}
    else if (cur?.status==='done') {prefix='[DONE] ';type='done';}
    else if (run && done) {prefix=`[RUN ${run} · DONE ${done}] `;type='working';}
    else if (run) {prefix=`[RUN ${run}] `;type='working';}
    else if (done) {prefix=`[DONE ${done}] `;type='done';}
    // If ChatGPT changed the underlying title since our last render, preserve it.
    if (document.title !== lastAppliedTitle) nativeTitle=document.title || nativeTitle;
    const desired = prefix + nativeTitle.replace(/^\[(?:RUN|DONE)(?:\s+\d+[^\]]*)?\]\s*/,'');
    if (document.title !== desired) document.title=desired;
    lastAppliedTitle=desired;
    if (!type) { generatedFavicon?.remove();generatedFavicon=null;return; }
    if (!generatedFavicon?.isConnected) {
      generatedFavicon=document.createElement('link');
      generatedFavicon.id='jaroo-v4-tab-icon';
      generatedFavicon.rel='icon';
      document.head.append(generatedFavicon);
    }
    if (!iconCache.has(type)) iconCache.set(type, svgData(type==='working'?'#FFAB32':'#47EC84',type));
    const href=iconCache.get(type);
    if (generatedFavicon.getAttribute('href') !== href) generatedFavicon.setAttribute('href',href);
  }
  // v6.3.9: Preserve the approved alignment and neon behavior; only increase count legibility and spacing between label and number.
  // State discovery, DONE acknowledgements, and cross-tab synchronization are unchanged.
  // The counters remain in Clock's shadow tree; displayed numbers NEVER animate.
  const dockCSS = `
    .jaroo-center,.jaroo-focus-list{--widget-main:var(--eb-chat-corrected-size,15.333px);--widget-meta:13px;box-sizing:border-box;color:#292D30;font:400 var(--widget-main)/1.3 var(--eb-font,"IBM Plex Mono","Pretendard Variable","Pretendard",sans-serif);min-width:0}
    .jaroo-center *, .jaroo-focus-list *{box-sizing:border-box}
    .jaroo-center{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:0;padding:10.5px 0 4px;border-top:1px solid var(--eb-accent-ink,#303438);align-items:stretch}
    .jaroo-center button{display:flex;align-items:center;justify-content:center;width:100%;min-width:0;height:100%;min-height:46px;padding:0;margin:0;background:none;border:0;border-radius:3px;cursor:pointer;color:inherit;font-family:inherit}
    .jaroo-center button:focus-visible,.jaroo-focus-row:focus-visible{outline:1px solid #879398;outline-offset:1px}
    .jaroo-center .jaroo-top-badge{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:last baseline;align-content:center;gap:3px;width:100%;min-width:0;height:100%;min-height:46px;padding:4px 6px 4px 9px;background:#DFE3E5;border:0;border-radius:3px;text-align:left}
    .jaroo-top-copy{display:flex;flex-direction:column;gap:2px;min-width:0}
    .jaroo-top-word{display:block;color:#41494D;font-size:clamp(11px,6cqi,14px);font-weight:650;line-height:1.12;letter-spacing:-.055em;overflow-wrap:anywhere}
    @keyframes jaroo-running-pulse{0%,24%,100%{opacity:1}46%,58%{opacity:.08}}
    .jaroo-center .run[data-active="true"] .jaroo-top-word,.jaroo-focus-tag[data-jstatus="working"]{animation:jaroo-running-pulse 1.2s ease-in-out infinite}
    @media(prefers-reduced-motion:reduce){.jaroo-center .run[data-active="true"] .jaroo-top-word,.jaroo-focus-tag[data-jstatus="working"]{animation:none;-webkit-text-stroke:.2px currentColor}}
    .jaroo-center .done[data-active="true"] .jaroo-top-badge{box-shadow:inset 0 0 0 1px var(--eb-accent-ink,#303438)}
    .jaroo-center .done[data-active="true"] .jaroo-top-word{color:var(--eb-accent-ink,#303438);-webkit-text-stroke:.18px currentColor}
    .jaroo-center .count{position:relative;flex:none;font-family:var(--eb-mono,"IBM Plex Mono",monospace);font-size:22px;font-weight:600;letter-spacing:-.04em;margin-left:auto;color:#292D30;font-variant-numeric:tabular-nums;line-height:1;white-space:nowrap}
    .jaroo-center .count[data-capped="true"]{margin-inline-end:5px}
    .jaroo-center .count[data-capped="true"]::after{content:"+";position:absolute;right:-8px;top:-10px;font-size:17px;font-weight:600;line-height:1;letter-spacing:0;color:inherit;pointer-events:none}
    .jaroo-center button[data-active="false"] .count{color:#9099A2;font-weight:500}
    .jaroo-center .jaroo-mini-label{display:block;font-size:clamp(11px,5.7cqi,13px);font-weight:400;line-height:1.12;color:#9099A2;text-align:left;letter-spacing:-.035em;overflow-wrap:anywhere}
    .jaroo-center .jaroo-mode-switch{grid-column:1/-1;min-height:24px;height:auto;justify-content:flex-start;padding:3px 0}
    .jaroo-mode-frame{display:flex;flex-direction:row;align-items:center;justify-content:flex-start;gap:6px;width:100%;min-width:0;color:#737D83;text-align:left}
    .jaroo-mode-track{position:relative;flex:0 0 28px;width:28px;height:14px;border:0;border-radius:8px;background:#C9D0D3}
    .jaroo-mode-thumb{position:absolute;width:10px;height:10px;left:2px;top:2px;border-radius:50%;background:#F5F6F6}
    .jaroo-mode-switch[aria-pressed="true"] .jaroo-mode-track{background:#879398}
    .jaroo-mode-switch[aria-pressed="true"] .jaroo-mode-thumb{left:16px}
    .jaroo-mode-switch:disabled{opacity:.45;cursor:not-allowed}
    .jaroo-mode-caption{min-width:0;font-size:clamp(10px,5.5cqi,13px);font-weight:500;line-height:1.2;white-space:normal;overflow-wrap:anywhere}
    @container jaroo-dashboard (max-width:219px){.jaroo-center .jaroo-top-badge{padding-inline:8px 6px}}
    @container jaroo-dashboard (max-width:184px){.jaroo-center{grid-template-columns:minmax(0,1fr)}.jaroo-center button,.jaroo-center .jaroo-top-badge{min-height:32px}}
    .jaroo-focus-list{display:flex;flex-direction:column;gap:4px;border-top:1px solid #C5CDD0;margin:0;padding:6px 0 8px;background:transparent}
    .jaroo-focus-list[hidden]{display:none!important}
    .jaroo-focus-header{display:flex;align-items:center;justify-content:space-between;gap:4px}
    .jaroo-focus-header strong,.jaroo-focus-header em,.jaroo-focus-empty{color:#535B60;font-size:12px;line-height:1.3;font-style:normal}
    .jaroo-focus-header strong{min-width:0;overflow-wrap:anywhere}.jaroo-focus-total{white-space:nowrap;flex:none}
    .jaroo-focus-total .jaroo-focus-count{color:var(--eb-accent-ink,#303438);font-variant-numeric:tabular-nums}
    .jaroo-focus-total .jaroo-focus-unit{margin-inline-start:.18em}
    .jaroo-focus-entries{display:flex;flex-direction:column;gap:4px;max-height:min(340px,42vh);overflow:auto}
    .jaroo-focus-row{display:flex;align-items:center;gap:5px;min-width:0;padding:5px 2px;color:#292D30;text-decoration:none;border-radius:3px;cursor:pointer}
    .jaroo-focus-row:hover,.jaroo-focus-row:focus-visible{background:#DFE3E5}
    .jaroo-focus-row[aria-disabled="true"]{opacity:.55;cursor:default}
    .jaroo-focus-name{flex:1 1 auto;min-width:0;font-size:var(--widget-main);line-height:1.35;overflow-wrap:anywhere}
    /* Only the explicitly filtered list needs a plain state label. */
    .jaroo-focus-tag{order:2;flex:0 0 auto;margin-left:auto;font:600 var(--widget-meta)/1.3 var(--eb-font,"IBM Plex Mono",monospace);color:#41494D}
    @container jaroo-dashboard (max-width: 184px){
      .jaroo-focus-row{flex-wrap:wrap}
      .jaroo-focus-name{flex-basis:100%}
    }
  `;
  function alignDockToClock() {
    if(!dock?.isConnected || !lastDockHost?.isConnected) return;
    // Explicitly align with Life Clock's two equal columns and the host's
    // full available width, not the narrower 7-segment time glyph run.
    if(dock.style.marginLeft!=='0px')dock.style.marginLeft='0px';
    if(dock.style.width!=='100%')dock.style.width='100%';
    if(dock.style.maxWidth!=='100%')dock.style.maxWidth='100%';
    const width=lastDockHost.getBoundingClientRect().width;
    setAttr(dock,'data-compact',width<194?'true':'false');
  }
  function setupDock() {
    const host = document.getElementById('jaroo-clock-overlay-v25');
    const shadow = host?.shadowRoot;
    if (host?.getAttribute('data-ebook-clock-ready')!=='true'||!shadow?.querySelector('.clock')) return false;
    if (host===lastDockHost && dock?.isConnected && dockStyle?.isConnected) return true;
    releaseFocusBranch();
    focusList?.remove();focusList=null;focusEntries=null;focusSignature='';
    dock?.remove();dockStyle?.remove();
    lastDockHost=host;
    dockStyle=document.createElement('style');dockStyle.id='jaroo-command-v4-style';dockStyle.textContent=dockCSS;
    dock=document.createElement('div');dock.className='jaroo-center';dock.setAttribute('data-ebook-status-ready','true');dock.setAttribute('aria-label','작업 현황');
    dock.innerHTML='<button type="button" class="run" data-jstatus="working" data-active="false" data-digits="1" aria-label="진행 중인 작업 목록">'+
      '<span class="jaroo-top-badge" aria-hidden="true"><span class="jaroo-top-copy"><span class="jaroo-top-word">Running</span><span class="jaroo-mini-label">Prompts</span></span><span class="count">0</span></span></button>'+
      '<button type="button" class="done" data-jstatus="done" data-active="false" data-digits="1" aria-label="확인하지 않은 완료 목록">'+
      '<span class="jaroo-top-badge" aria-hidden="true"><span class="jaroo-top-copy"><span class="jaroo-top-word">Completed</span><span class="jaroo-mini-label">Prompts</span></span><span class="count">0</span></span></button>'+
      '<button type="button" class="jaroo-mode-switch" data-jaroo-filter-toggle="true" aria-pressed="false" aria-label="확인할 작업만 표시" title="확인할 작업만 표시">'+
      '<span class="jaroo-mode-frame" aria-hidden="true"><span class="jaroo-mode-track"><span class="jaroo-mode-thumb"></span></span><span class="jaroo-mode-caption">Only tasks to review</span></span></button>';
    shadow.append(dockStyle);shadow.querySelector('.clock').after(dock);
    // Place the live list inside the same responsive Shadow DOM as the clock.
    focusList=document.createElement('section');
    focusList.className='jaroo-focus-list';focusList.id='jaroo-focus-list';focusList.setAttribute('data-ebook-status-ready','true');
    focusList.hidden=true;focusList.setAttribute('role','region');
    focusList.setAttribute('aria-label','진행 중이거나 확인할 완료 작업 목록');
    focusList.innerHTML='<div class="jaroo-focus-header"><strong>Running · Completed</strong><em class="jaroo-focus-total"><strong class="jaroo-focus-count">0</strong><span class="jaroo-focus-unit">건</span></em></div>'+ 
      '<div class="jaroo-focus-entries" role="list"></div>';
    dock.after(focusList);
    focusEntries=focusList.querySelector('.jaroo-focus-entries');
    focusSignature='';
    dock.addEventListener('click', e => {
      const modeButton=e.target.closest('button[data-jaroo-filter-toggle]');
      if (modeButton && !modeButton.disabled) {
        focusWanted = !focusWanted;
        try { sessionStorage.setItem(FOCUS_PREF, focusWanted ? 'status' : 'all'); } catch (_) {}
        closePanel();
        syncFocusView(validRecords());
        scheduleRefresh('filter-toggle');
        return;
      }
      const button=e.target.closest('button[data-jstatus]');
      if (!button) return;
      if (panelOpen && panel?.dataset.filter===button.dataset.jstatus) {closePanel();return;}
      openPanel(button.dataset.jstatus);
    });
    // The existing clock script owns positioning. Request its resize listener
    // to reserve room for the extra dock line; no container CSS overrides.
    window.dispatchEvent(new Event('resize'));
    return true;
  }
  function setupPanel() {
    if (panel?.isConnected) return;
    panel=document.createElement('div');panel.id='jaroo-v4-quick-panel';panel.setAttribute('role','dialog');
    panel.setAttribute('aria-label','작업 상태 바로가기');panel.tabIndex=-1;
    const css=document.createElement('style');css.id='jaroo-v4-panel-style';
    css.textContent=`
      #jaroo-v4-quick-panel{position:fixed;z-index:2147483400;min-width:240px;max-width:min(350px,calc(100vw - 20px));max-height:min(360px,65vh);overflow:auto;padding:10px;border:1px solid #C5CDD0;border-radius:5px;background:#F5F6F6;color:#292D30;font:14px/1.4 "Pretendard Variable","Pretendard",sans-serif;display:none;box-sizing:border-box}
      #jaroo-v4-quick-panel .head{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:7px;font-weight:550}
      #jaroo-v4-quick-panel .dismiss{border:1px solid #C5CDD0;background:#E7EAEB;color:#535B60;border-radius:3px;cursor:pointer;padding:3px 7px;font:inherit}
      #jaroo-v4-quick-panel a{display:flex;align-items:center;gap:4px;padding:8px 5px;color:#535B60;text-decoration:none;border-radius:3px;cursor:pointer}
      #jaroo-v4-quick-panel a:hover,#jaroo-v4-quick-panel a:focus-visible{background:#E7EAEB;outline:1px solid #879398}
      #jaroo-v4-quick-panel .tag{display:inline-flex;order:2;align-items:center;justify-content:center;flex:0 0 auto;font:600 13px/1.3 "IBM Plex Mono",monospace;margin-left:auto}
      #jaroo-v4-quick-panel .name{flex:1 1 auto;min-width:0;overflow-wrap:anywhere}
      #jaroo-v4-quick-panel .empty{padding:8px;color:#737D83}
      #jaroo-v4-title-tip{position:fixed;z-index:2147483401;max-width:min(380px,calc(100vw - 22px));padding:9px 12px;border:1px solid #C5CDD0;border-radius:5px;background:#F5F6F6;color:#292D30;font:14px/1.4 "Pretendard Variable","Pretendard",sans-serif;pointer-events:none;display:none;overflow-wrap:anywhere;box-sizing:border-box}
    `;
    document.head.append(css);
    tooltipStyle=css;
    document.body.append(panel);
    tooltip=document.createElement('div');tooltip.id='jaroo-v4-title-tip';tooltip.setAttribute('role','tooltip');
    document.body.append(tooltip);
  }
  function closePanel() {panelOpen=false;panelSignature='';if(panel)panel.style.display='none';}
  function openPanel(filter) {
    setupPanel();
    if (!dock?.isConnected) return;
    panelOpen=true;panel.dataset.filter=filter;
    const records=validRecords().filter(r=>r.status===filter);
    const signature=filter+'|'+records.map(r=>r.id+':'+r.status+':'+r.title+':'+r.href).join('|');
    if (panelSignature===signature && panel.style.display==='block') return;
    panelSignature=signature;
    panel.replaceChildren();
    const head=document.createElement('div');head.className='head';
    const title=document.createElement('span');title.textContent=(filter==='working'?'Running Prompts':'Completed Prompts')+` · ${records.length}건`;
    const close=document.createElement('button');close.className='dismiss';close.type='button';close.textContent='닫기';close.onclick=closePanel;
    head.append(title,close);panel.append(head);
    if (!records.length) {const empty=document.createElement('div');empty.className='empty';empty.textContent='표시할 상태가 없어.';panel.append(empty);}
    else records.forEach(r => {
      const link=document.createElement('a');link.href=r.href || '#';
      const token=document.createElement('span');token.className='tag';token.dataset.jstatus=filter;token.textContent=filter==='working'?'Running':'Completed';
      const name=document.createElement('span');name.className='name';name.textContent=r.title || `채팅 ${r.id.slice(0,8)}`;
      link.append(token,name);
      if (!r.href) {link.style.opacity='.55';link.title='현재 사이드바에서 위치를 찾을 수 없음';link.setAttribute('aria-disabled','true');}
      link.onclick=e => {if (!r.href) {e.preventDefault();return;}closePanel();};
      panel.append(link);
    });
    const scope=document.createElement('div');scope.className='empty';
    scope.textContent='같은 브라우저 프로필의 상태 · 채팅 본문·입력창 확인 시 완료 표시 해제';panel.append(scope);
    if (filter === 'done' && records.length) {
      const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'dismiss';
      clear.textContent = '이 목록의 완료 표시 지우기';
      clear.addEventListener('click', () => { for (const record of records) statusBus.acknowledge(record.id, record.run); scheduleRefresh(); });
      panel.append(clear);
    }
    const rect=dock.getBoundingClientRect();
    panel.style.display='block';
    const w=panel.getBoundingClientRect().width;
    panel.style.left=Math.max(8,Math.min(innerWidth-w-8,rect.left))+'px';
    panel.style.top=Math.max(8,Math.min(innerHeight-panel.getBoundingClientRect().height-10,rect.bottom+7))+'px';
    panel.focus({preventScroll:true});
  }
  // The Clock script deliberately mounts immediately before the *native*
  // navigation branch. We only clip that verified sibling, never move/delete
  // React-owned nodes or synthesize a persistent status-history database.
  function findNativeMenuBranch() {
    // React can insert New Chat, Dot, pinned lists and portal wrappers between
    // the Clock host and the actual scrollable project/chat navigation. Do not
    // assume the native menu is the immediate nextElementSibling.
    const host=document.getElementById('jaroo-clock-overlay-v25');
    if (!host?.isConnected || !host.parentElement) return null;
    const root=watchedSidebars.find(sidebar => sidebar.contains(host));
    if (!root) return null;
    const evidenceSelector=`${ARCHIVE},[data-sidebar-project-kind="local"]`;
    for (let node=host.nextElementSibling;node;node=node.nextElementSibling) {
      if (node===focusList || node.closest('#jaroo-v4-quick-panel')) continue;
      // A single small button is not the navigation branch. Choose only a
      // multi-entry container so we cannot accidentally clip New Chat.
      if (node.matches('button,a,[role="button"]')) continue;
      const evidence=node.querySelectorAll(evidenceSelector);
      const chatIds=new Set([...node.querySelectorAll('a[href*="/c/"]')]
        .map(linkId).filter(validId));
      if (evidence.length>=2 || chatIds.size>=2) return node;
    }
    return null;
  }
  function releaseFocusBranch() {
    if (focusBranch) focusBranch.removeAttribute(FOCUS_MENU_ATTR);
    focusBranch=null;
    // Do not retain fallback row clipping after switching back to ALL.
    for(const sidebar of watchedSidebars)
      sidebar.removeAttribute('data-jaroo-focus-fallback');
  }
  function renderFocusEntries(records) {
    if (!focusEntries?.isConnected) return;
    const signature=JSON.stringify(records.map(r=>[r.id,r.status,r.title,r.href,r.run.clock]));
    if (signature === focusSignature) return;
    focusSignature=signature;
    const previousScroll=focusEntries.scrollTop;
    focusEntries.replaceChildren();
    if (!records.length) {
      const empty=document.createElement('div');empty.className='jaroo-focus-empty';
      empty.textContent='No running or completed tasks.';
      focusEntries.append(empty);
    }
    for (const record of records) {
      const href=safePath(record.href || `/c/${record.id}`,record.id);
      const row=document.createElement('a');row.className='jaroo-focus-row';
      row.setAttribute('role','listitem');row.href=href || '#';
      const tag=document.createElement('span');tag.className='jaroo-focus-tag';
      tag.dataset.jstatus=record.status;
      tag.textContent=record.status==='working'?'Running':'Completed';
      const title=document.createElement('span');title.className='jaroo-focus-name';
      title.textContent=record.title || `채팅 ${record.id.slice(0,8)}`;
      row.title=title.textContent;
      row.append(tag,title);
      if (!href) {
        row.setAttribute('aria-disabled','true');
        row.title='이 채팅의 유효한 주소를 확인하지 못했어.';
        row.addEventListener('click',event=>event.preventDefault());
      } else if (record.status === 'done') {
        // Opening an unread completion from the focus list is an explicit ACK,
        // equivalent to selecting the same link in the original quick panel.
        row.addEventListener('click',event=>{
          if (event.button === 0 && !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey) {
            statusBus.acknowledge(record.id,record.run);
            scheduleRefresh('focus-done-read');
          }
        });
      }
      focusEntries.append(row);
    }
    focusEntries.scrollTop=previousScroll;
    const badge=focusList?.querySelector('.jaroo-focus-count');
    if (badge) badge.textContent=String(records.length);
  }
  function syncFocusView(records) {
    const modeButton=dock?.querySelector('[data-jaroo-filter-toggle]');
    const branch=findNativeMenuBranch();
    // A missing React navigation wrapper must not disable the visible switch.
    const ready=Boolean(modeButton && focusList?.isConnected);
    if (modeButton) {
      modeButton.disabled=!ready;
      modeButton.setAttribute('aria-pressed',String(ready && focusWanted));
      const label=ready && focusWanted ? '확인할 작업만 표시 중 · 누르면 전체 보기' :
        ready ? '전체 표시 중 · 누르면 확인할 작업만 표시' : '기본 목록 구조가 확인되지 않아 필터 사용 불가';
      modeButton.setAttribute('aria-label',label);modeButton.title=label;
    }
    if (!ready || !focusWanted) {
      focusList && (focusList.hidden=true);
      releaseFocusBranch();
      return;
    }
    // Native navigation stays connected and discoverable; it is only clipped.
    if (focusBranch!==branch) releaseFocusBranch();
    renderFocusEntries(records);
    focusList.hidden=false;
    if (branch) {
      focusBranch=branch;
      setAttr(branch,FOCUS_MENU_ATTR,'clipped');
    } else {
      // Fallback when the native navigation structure differs between routes:
      // hide only visual native chat rows, leaving new-chat, Dot and folders
      // operable. No native nodes are removed or marked hidden/inert.
      for(const sidebar of watchedSidebars)
        if(sidebar.contains(lastDockHost))
          setAttr(sidebar,'data-jaroo-focus-fallback','true');
    }
  }
  function formatDockCount(value) {
    return {digit:String(Math.min(value,9)),capped:value>=9};
  }
  function renderDock(records) {
    if (!setupDock()) return;
    for(const status of ['working','done']) {
      const counter=dock.querySelector(`[data-jstatus="${status}"] .count`);
      const value=records.filter(r=>r.status===status).length;
      const display=formatDockCount(value);
      if (counter) {
        if(counter.textContent!==display.digit)counter.textContent=display.digit;
        const capped=String(display.capped);
        if(counter.dataset.capped!==capped)counter.dataset.capped=capped;
      }
      const button=counter?.closest('button');
      if (button) {
        const active=String(value>0), digits=String(String(value).length);
        if (button.dataset.active!==active) button.dataset.active=active;
        if (button.dataset.digits!==digits) button.dataset.digits=digits;
        const label=(status==='working'?'진행 중인 작업':'확인하지 않은 완료')+` ${value}개 목록`;
        if (button.getAttribute('aria-label')!==label) button.setAttribute('aria-label',label);
        if(button.title!==label)button.title=label;
      }
    }
    alignDockToClock();
    if (panelOpen) openPanel(panel.dataset.filter || 'working');
  }


  // Native history is read in mutation order. A quick working -> unread ->
  // absent sequence must not disappear merely because rendering is coalesced.
  let nativeSeen = new WeakMap(), pendingNative = [], probeTargets = [];
  let probeSnapshot = { stop: false, work: { active: false } };
  let signalRoute = idFromPath(), refreshReason = 'startup';
  const localObservations = new Set();
  const trace = [];
  const traceEvent = (event, id, detail = '') => {
    trace.push({ time: new Date().toISOString(), event, id, detail });
    if (trace.length > 24) trace.shift();
  };
  const statusBus = createStatusBus({ onChange: () => scheduleRefresh('shared-state') });
  const readAcknowledgement = createReadAcknowledgement({
    bus: statusBus, sidebarRoots: () => watchedSidebars, panelRoot: () => panel, getRowId,
    onAcknowledge: ({ id, source }) => {
      traceEvent('done-read', id, source);
      scheduleRefresh('done-read');
    }
  });

  function rowReadable(row) {
    return row?.isConnected && !row.closest('[hidden],[inert],[aria-hidden="true"]') && row.getClientRects().length > 0;
  }
  function rowMeta(id, row = rows().find(item => getRowId(item) === id)) {
    const link = row?.matches('a[href*="/c/"]') ? row : row?.querySelector('a[href*="/c/"]');
    return { title: labelFor(row), href: safePath(link?.getAttribute('href') || (id === idFromPath() ? location.pathname : `/c/${id}`), id) };
  }
  function currentNative() {
    const id = idFromPath(), currentRows = rows().filter(row => getRowId(row) === id && rowReadable(row));
    if (currentRows.some(row => nativeStatus(row) === 'working')) return 'working';
    return currentRows.some(row => nativeStatus(row) === 'done') ? 'unread' : null;
  }
  const composerProbe = createComposerProbe({
    currentId: idFromPath, currentNative, scheduleRefresh,
    onRun: (id, signal) => {
      localObservations.add(id);
      const token = statusBus.observeRun(id, rowMeta(id), { owner: true, ...signal, bootstrap: !signal.edge && !signal.submitted });
      if (signal.edge || signal.submitted) traceEvent('current-run-edge', id, signal.source);
      return token;
    },
    onComplete: (id, token, signal) => {
      // The probe rechecks its exact control before calling this. Retire only
      // this tab's positive RUN claim; absence never creates a DONE record.
      if (id !== idFromPath() || currentNative() === 'working') return false;
      statusBus.releaseObservation(id); localObservations.delete(id);
      const accepted = statusBus.observeDone(id, token, rowMeta(id), { owner: true, edge: true, ...signal });
      traceEvent(accepted ? 'current-done' : 'current-done-rejected', id, signal.idleKind || signal.source);
      return accepted;
    }
  });

  function applyNativeValue(row, value, { oldValue = undefined, mutation = false } = {}) {
    if (!rowReadable(row)) return;
    const id = getRowId(row);
    if (!validId(id)) return;
    const previous = nativeSeen.get(row);
    const continuous = Boolean(previous && previous.id === id && (!mutation || previous.value === oldValue));
    const changed = Boolean(continuous && previous.value !== value);
    const edge = mutation && changed;
    const item = { id, value, token: continuous ? previous.token : null,
      unreadEdge: value === 'unread' && (edge || continuous && previous.value === 'unread' && previous.unreadEdge),
      doneAccepted: value === 'unread' && continuous && previous.value === 'unread' && previous.doneAccepted };
    nativeSeen.set(row, item);
    if (value === 'working') {
      localObservations.add(id);
      // The current STOP/Work probe already owns this execution edge. A second
      // passive copy must join it, not generate another run from the same phase.
      const currentPositive = id === idFromPath() && (probeSnapshot.stop || probeSnapshot.work?.active);
      const token = statusBus.observeRun(id, rowMeta(id, row), {
        owner: false, source: 'native-working', edge: edge && !currentPositive, bootstrap: !edge
      });
      if (token) item.token = token;
      if (edge) traceEvent('native-working-edge', id);
    } else if (value === 'unread') {
      if (continuous && !changed && (item.doneAccepted || !item.unreadEdge)) return;
      const runToken = continuous ? previous.token : null;
      const accepted = statusBus.observeDone(id, runToken, rowMeta(id, row), {
        owner: false, source: 'native-unread', edge: Boolean(item.unreadEdge), bootstrap: !item.unreadEdge
      });
      item.doneAccepted = accepted;
      if (changed || !continuous || accepted) traceEvent(accepted ? 'native-unread' : 'native-unread-rejected', id, mutation ? 'mutation' : 'snapshot');
    }
    // Absence is only a loss of a local observation. It never writes DONE/ACK.
  }

  function captureNativeChanges(events) {
    const idsChanged = new Set(events.filter(event => event.type === 'attributes' &&
      ['data-sidebar-archive-chatgpt-id', 'href'].includes(event.attributeName)).map(event =>
        event.target.closest?.(ARCHIVE) || event.target));
    for (const event of events) if (event.type === 'childList') {
      for (const node of [...event.removedNodes, ...event.addedNodes]) {
        if (!(node instanceof Element)) continue;
        for (const row of rowNodes) if (node === row || node.contains(row)) idsChanged.add(row);
      }
    }
    if (idsChanged.size) {
      for (const row of idsChanged) nativeSeen.delete(row);
      pendingNative = pendingNative.filter(entry => !idsChanged.has(entry.row));
    }
    const changes = events.filter(event => event.type === 'attributes' && event.attributeName === 'data-sidebar-indicator');
    for (let index = 0; index < changes.length; index++) {
      const event = changes[index], row = event.target;
      if (idsChanged.has(row)) continue;
      if (!validId(getRowId(row))) continue;
      const next = changes.slice(index + 1).find(item => item.target === row);
      pendingNative.push({ row, id: getRowId(row), oldValue: event.oldValue,
        value: next ? next.oldValue : row.getAttribute('data-sidebar-indicator') });
    }
    // Pathological batches fall back to snapshots instead of guessing history.
    if (pendingNative.length > 400) { pendingNative = []; nativeSeen = new WeakMap(); }
  }
  function syncSignals() {
    const route = idFromPath();
    if (route !== signalRoute) {
      composerProbe.suspend('route-changed'); signalRoute = route;
    }
    probeSnapshot = composerProbe.scan(refreshReason);
    const active = new Set(rows().filter(row => rowReadable(row) && nativeStatus(row) === 'working').map(getRowId));
    if (probeSnapshot.id && (probeSnapshot.stop || probeSnapshot.work?.active)) active.add(probeSnapshot.id);
    for (const id of localObservations) if (!active.has(id)) {
      statusBus.releaseObservation(id); localObservations.delete(id);
    }
    const pending = pendingNative; pendingNative = [];
    for (const entry of pending) {
      if (getRowId(entry.row) !== entry.id || !rows().includes(entry.row)) continue;
      applyNativeValue(entry.row, entry.value, { oldValue: entry.oldValue, mutation: true });
    }
    // Reconcile mounts and refresh leases. Snapshot differences are deliberately
    // not execution edges: stale DOM in a resumed tab cannot restart DONE.
    for (const row of rows()) applyNativeValue(row, row.getAttribute('data-sidebar-indicator'));
    bindProbeObservers();
    statusBus.tick();
  }

  function syncMotionVisibility() {
    const hidden = String(Boolean(document.hidden));
    setAttr(document.documentElement, 'data-jaroo-status-hidden', hidden);
    if (dock) setAttr(dock, 'data-paused', hidden);
  }
  function refresh() {
    if (disposed) return;
    try {
      syncSignals();
      renderRows();
      const list = validRecords(), route = idFromPath();
      const signature = JSON.stringify(list.map(record => [record.id, record.status, record.title, record.href, record.run]));
      if (signature !== lastSignature || route !== lastRoute || document.title !== lastAppliedTitle) renderTab(list);
      if (signature !== lastSignature || !dock?.isConnected || !dockStyle?.isConnected) renderDock(list);
      else alignDockToClock();
      syncFocusView(list);
      syncMotionVisibility();
      if (panelOpen) openPanel(panel.dataset.filter || 'working');
      observeClock();
      lastSignature = signature; lastRoute = route; lastError = '';
    } catch (error) { lastError = String(error); }
  }
  function scheduleRefresh(reason = 'dom-change') {
    if (disposed) return;
    refreshReason = typeof reason === 'string' ? reason : 'dom-change';
    if (!scheduled) scheduled = setTimeout(() => { scheduled = 0; refresh(); }, 32);
  }
  function mutationHandler(events) {
    captureNativeChanges(events);
    let changed = pendingNative.length > 0;
    for (const event of events) {
      if (event.type === 'characterData') {
        if (event.target.parentElement?.closest('[data-jaroo-selected="true"] a[href*="/c/"]')) {
          // The selected title was renamed; refresh only its visual fit.
          changed = true;
        }
        continue;
      }
      if (event.type === 'attributes') {
        if (event.attributeName === 'data-jaroo-native-row' && event.target.hasAttribute('data-jaroo-native-row')) continue;
        changed = true;
        if (['href','data-sidebar-archive-chatgpt-id','data-jaroo-native-row'].includes(event.attributeName)) rowDirty = true;
        continue;
      }
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      if (target?.closest('[data-native-menu-root],[popover],#jaroo-v4-quick-panel,#jaroo-v4-title-tip')) continue;
      const changedNodes=[...event.addedNodes,...event.removedNodes];
      if(changedNodes.length&&changedNodes.every(node=>node.nodeType===1&&node.matches(OWN_BADGE)))continue;
      changed = true; rowDirty = true;
    }
    if (changed) scheduleRefresh('native-mutation');
  }
  const observer = new MutationObserver(mutationHandler);
  const probeObserver = new MutationObserver(records=>{
    const relevant=records.some(m=>{
      const el=m.target.nodeType===1?m.target:m.target.parentElement;
      const editor=el?.closest?.('#prompt-textarea,.ProseMirror[contenteditable="true"],[data-testid="composer-input"][contenteditable="true"],textarea');
      if(!editor)return true;
      // A root attribute can change availability; ordinary text/paragraph mutations cannot.
      return m.type==='attributes'&&el===editor&&['aria-disabled','disabled','hidden','aria-busy','data-state'].includes(m.attributeName);
    });
    if(relevant)scheduleRefresh('composer-mutation');
  });
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => onResize()) : null;

  function discoverRoots() {
    let all = [...document.querySelectorAll(ROOTS)];
    if (!all.length) all = [...document.querySelectorAll('aside,nav')]
      .filter(el => el.querySelector(`${ARCHIVE},a[data-testid^="history-item"]`));
    if (!all.length) all = [...document.querySelectorAll(ARCHIVE)]
      .map(row => row.parentElement).filter(el => el && el !== document.body && el !== document.documentElement);
    const unique = [...new Set(all)];
    return unique.filter(el => !unique.some(other => other !== el && other.contains(el)));
  }
  function bindSidebarObservers() {
    const roots = discoverRoots();
    if (roots.length === watchedSidebars.length && roots.every((root, index) => root === watchedSidebars[index] && root.isConnected)) return false;
    const queued = observer.takeRecords();
    if (queued.length) captureNativeChanges(queued);
    observer.disconnect(); resizeObserver?.disconnect(); observedClock = null;
    watchedSidebars = roots;
    for (const root of roots) {
      observer.observe(root, { childList: true, subtree: true, attributes: true, attributeOldValue: true, characterData: true,
        attributeFilter: ['data-sidebar-indicator','aria-current','aria-label','href','data-sidebar-archive-chatgpt-id','data-jaroo-native-row'] });
      resizeObserver?.observe(root);
    }
    rowDirty = true;
    return true;
  }
  function bindProbeObservers() {
    const targets = composerProbe.targets();
    if (targets.length === probeTargets.length && targets.every((target, index) => target === probeTargets[index])) return;
    probeObserver.disconnect(); probeTargets = targets;
    for (const root of targets) probeObserver.observe(root, {
      childList: true, subtree: true, attributes: true, characterData: true,
      attributeFilter: ['aria-label','title','data-testid','data-state','data-status','aria-busy','aria-disabled','disabled','hidden']
    });
  }
  function observeClock() {
    if (lastDockHost?.isConnected && lastDockHost !== observedClock) {
      if (observedClock) resizeObserver?.unobserve(observedClock);
      observedClock = lastDockHost; resizeObserver?.observe(observedClock);
    }
  }
  function recoverStructure() {
    if (disposed) return;
    try {
      statusBus.tick();
      if (!document.hidden) {
        bindSidebarObservers(); scheduleRefresh('structure-recovery');
      } else scheduleRefresh('background-reconcile');
    } catch (error) { lastError = String(error); }
    discoveryTimer = setTimeout(recoverStructure, document.hidden ? 15000 : 4000);
  }
  function onFocus() {
    syncMotionVisibility();
    if (document.hidden) {
      hideTip();
      // A hidden document is not a fresh visible owner. Native unread mutations
      // and same-editor STOP -> idle transitions remain valid DOM observations.
      statusBus.tick(); scheduleRefresh('document-hidden'); return;
    }
    statusBus.refreshFromStorage(); bindSidebarObservers();
    rowDirty = true; scheduleRefresh('document-resumed');
  }
  function onPageHide() {
    composerProbe.suspend('document-suspended');
    probeSnapshot = { stop: false, work: { active: false } };
    for (const id of localObservations) statusBus.releaseObservation(id);
    localObservations.clear();
  }
  function onRoute() { rowDirty = true; hideTip(); composerProbe.suspend('route-changed'); scheduleRefresh('route-changed'); }
  function onResize() { scheduleRefresh('resize'); }
  function onEscape(event) { if (event.key === 'Escape') { closePanel(); hideTip(); } }
  function submitHandler(event) { composerProbe.noteSubmit(event); }
  function clickHandler(event) {
    readAcknowledgement.handleClick(event);
    composerProbe.noteSubmit(event);
    if (panelOpen && panel && !event.composedPath().includes(panel) && !event.composedPath().includes(dock)) closePanel();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer.disconnect(); probeObserver.disconnect(); resizeObserver?.disconnect();
    composerProbe.dispose(); statusBus.dispose();
    clearTimeout(scheduled); clearTimeout(hoverTimer); clearTimeout(discoveryTimer);
    removeEventListener('focus', onFocus); removeEventListener('pageshow', onFocus);
    removeEventListener('pagehide', onPageHide); document.removeEventListener('freeze', onPageHide);
    removeEventListener('resize', onResize); removeEventListener('popstate', onRoute);
    window.navigation?.removeEventListener('currententrychange', onRoute);
    document.removeEventListener('visibilitychange', onFocus);
    document.removeEventListener('click', clickHandler, true);
    document.removeEventListener('submit', submitHandler, true); document.removeEventListener('keydown', submitHandler, true);
    document.removeEventListener('keydown', onEscape);
    document.removeEventListener('mouseover', hoverIn, true); document.removeEventListener('mouseout', hoverOut, true);
    document.removeEventListener('focusin', hoverIn, true); document.removeEventListener('focusout', hoverOut, true);
    if (lastAppliedTitle && document.title === lastAppliedTitle) document.title = nativeTitle;
    releaseFocusBranch();focusList?.remove();focusStyle.remove();
    generatedFavicon?.remove(); dock?.remove(); dockStyle?.remove(); panel?.remove(); tooltip?.remove(); tooltipStyle?.remove();
    document.documentElement.removeAttribute('data-jaroo-status-hidden');
    for (const row of new Set([...rowNodes, ...document.querySelectorAll(OWN_ROW)])) cleanRow(row);
    if (window[RUNTIME]?.dispose === dispose) delete window[RUNTIME];
    window.dispatchEvent(new Event('resize'));
  }

  for (const id of ['jaroo-v4-tab-icon','jaroo-v4-quick-panel','jaroo-v4-panel-style','jaroo-v4-title-tip']) document.getElementById(id)?.remove();
  document.getElementById('jaroo-clock-overlay-v25')?.shadowRoot
    ?.querySelectorAll('.jaroo-center,#jaroo-command-v4-style').forEach(el => el.remove());
  bindSidebarObservers();
  for (const row of rows()) cleanRow(row);
  addEventListener('focus', onFocus); addEventListener('pageshow', onFocus);
  addEventListener('pagehide', onPageHide); document.addEventListener('freeze', onPageHide);
  addEventListener('resize', onResize, { passive: true }); addEventListener('popstate', onRoute);
  window.navigation?.addEventListener('currententrychange', onRoute);
  document.addEventListener('visibilitychange', onFocus);
  document.addEventListener('click', clickHandler, true); document.addEventListener('keydown', onEscape);
  document.addEventListener('submit', submitHandler, true); document.addEventListener('keydown', submitHandler, true);
  document.addEventListener('mouseover', hoverIn, true); document.addEventListener('mouseout', hoverOut, true);
  document.addEventListener('focusin', hoverIn, true); document.addEventListener('focusout', hoverOut, true);
  window[RUNTIME] = { version: VERSION, dispose, diagnostics: () => ({
    version: VERSION, mode: 'observed-ui-with-tab-sync', current: idFromPath(),
    cssVersion: getComputedStyle(document.documentElement).getPropertyValue('--jaroo-status-css-version').trim().replace(/["']/g, ''),
    rows: rows().length, working: validRecords().filter(item => item.status === 'working').length,
    done: validRecords().filter(item => item.status === 'done').length,
    focusWanted, focusActive: Boolean(focusBranch?.isConnected && focusList && !focusList.hidden),
    focusMenuFound: Boolean(findNativeMenuBranch()),
    sourceValues: [...new Set(rows().map(row => row.getAttribute('data-sidebar-indicator')))],
    sidebarRoots: watchedSidebars.length, probe: composerProbe.diagnostics(), read: readAcknowledgement.diagnostics(), sync: statusBus.diagnostics(),
    recentSignals: trace.slice(-12), lastError
  }) };
  refresh();
  discoveryTimer = setTimeout(recoverStructure, 4000);

})();
