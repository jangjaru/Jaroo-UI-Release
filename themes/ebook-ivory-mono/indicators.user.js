// ==UserScript==
// @name         Jaroo E-book · Role Indicators & Clock Skin
// @namespace    jaroo.theme.ebook.ivory-mono
// @version      0.2.0
// @description  E-book visual dot indicators for role prefixes plus a light Clock skin; keeps original chat titles, React data and RUN/DONE logic intact.
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js
// @downloadURL  https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js
// ==/UserScript==

(() => {
  'use strict';

  const RUNTIME = '__jarooEbookIvoryMonoV1';
  try { window[RUNTIME]?.dispose?.(); } catch (_) {}
  const CLOCK_HOST = 'jaroo-clock-overlay-v25';
  const CLOCK_CSS_ID = 'jaroo-ebook-clock-css-v01';
  const SIDE_ROOTS = '#stage-sidebar,#stage-slideover-sidebar,#slate-sidebar,[data-testid="sidebar"]';
  const TITLE_SELECTORS = '[data-thread-title="true"],[data-marquee-text],span.truncate,div.truncate,span[dir="auto"]';
  const ROLE_NAMES = Object.freeze({
    '☆': 'master', '★': 'master',
    '▷': 'plan', '▶': 'plan',
    '○': 'manage',
    '●': 'produce',
    '>': 'action', '›': 'action'
  });
  const ROLE_MARKER = /^\s*((?:\[(?:완료|중단|보류)\]\s*)?)([☆★▷▶○●>›])(?=\s|$)/u;
  const CLEANUP_GLYPH = '[data-ebook-glyph="true"]';

  // Only E-book-specific presentation rules are injected into the open Clock ShadowRoot.
  // Existing visual pulses, LEDs, progress calculations and RUN/DONE controls remain owned by Clock/Status.
  const clockCSS = String.raw`
    :host {
      --ebook-paper:#FAF9F3;
      --ebook-panel:#FCFBF6;
      --ebook-soft:#F0EFE8;
      --ebook-ink:#1D1D1B;
      --ebook-muted:#575751;
      --ebook-line:#AAA9A0;
      --ebook-font:"Pretendard Variable","Pretendard",sans-serif;
       --ebook-mono:"IBM Plex Mono","Monoplex KR",monospace;
    }
    /* v0.1.1: locally installed Latin and Korean mono font, including status dock.
       Segmented digital digits and all calculations remain unmodified. */
    :host .fallback-brand,
    :host .fallback-brand :is(.brand-word,.brand-title,.brand-jaroo,.brand-company,.brand-subtitle),
    :host .life-clock, :host .life-clock :is(div,span,strong),
    :host .clock :is(.date-main,.weather-label),
    :host .jaroo-center, :host .jaroo-center :is(div,span,button,strong,em),
    :host .jaroo-focus-list, :host .jaroo-focus-list :is(a,button,div,span,strong,em) {
      font-family:var(--ebook-font)!important;
      font-style:normal!important;
    }
    /* Preserve all existing RUN/DONE visual pulses and click behavior. */
    .life-clock {
      background:var(--ebook-panel)!important;
      border:1px solid var(--ebook-line)!important;
      border-radius:13px!important;
      box-shadow:none!important;
      color:var(--ebook-ink)!important;
    }
    .life-head { border-bottom:1px solid #D2D0C8!important; }
    .life-title,.life-title-full,.life-title-short,
    .life-progress-title,.life-progress-percent {
      color:var(--ebook-ink)!important;
      text-shadow:none!important;
      font-family:var(--ebook-font)!important;
      font-style:normal!important;
    }
    .life-sub,.life-progress-scale,.life-meta,
    .life-progress-stat span { color:var(--ebook-muted)!important; }
    .life-card,.life-card.retire,.life-card.work,.life-card.after {
      background:var(--ebook-panel)!important;
      border:0!important;
      border-bottom:1px solid #D2D0C8!important;
      border-radius:0!important;
      box-shadow:none!important;
    }
    .life-card.retire .life-label,.life-card.work .life-label,.life-card.after .life-label,
    .life-value,.life-progress-stat strong {
      color:var(--ebook-ink)!important;
      text-shadow:none!important;
      font-family:var(--ebook-font)!important;
      font-style:normal!important;
    }
    .life-title .ico { color:var(--ebook-ink)!important; /* Preserve original glow filter. */ }
    .life-bar {
      border:1px solid var(--ebook-line)!important;
      background:#E3E2DB!important;
      border-radius:999px!important;
      /* Preserve the original animated progress fill and glow. */
    }
    /* Keep the original digital segment shapes, blink and color treatment. */
    .clock { border:1px solid var(--ebook-line)!important; border-radius:13px!important; /* Preserve original LED glow. */ }
    .clock-content { border-radius:12px!important; }
    .date-main,.weather-label { font-family:var(--ebook-mono)!important; font-style:normal!important; }
    .life-value,.life-progress-percent,.life-progress-stat strong { font-family:var(--ebook-mono)!important; }
  `;

  let disposed = false;
  let frame = 0;
  let recoverTimer = 0;
  let shadowStyle = null;
  let observedRoots = [];
  const observer = new MutationObserver(() => schedule());
  let bootstrapObserver = null;
  const touched = new Set();
  const errors = { missingTitle: 0, missingPrefix: 0, wrapped: 0 };

  function sidebarRoots() {
    const all = [...document.querySelectorAll(SIDE_ROOTS)];
    return all.filter(node => !all.some(parent => parent !== node && parent.contains(node)));
  }

  function roleIn(text) {
    if (!text || typeof text !== 'string') return null;
    const match = ROLE_MARKER.exec(text);
    if (!match) return null;
    const role = ROLE_NAMES[match[2]];
    if (!role) return null;
    const index = match[0].length - match[2].length;
    const lifecycle = /^\s*\[(완료|중단|보류)\]/u.exec(text)?.[1];
    return { role, index, symbol: match[2], lifecycle };
  }

  function firstValidText(element) {
    if (!element) return null;
    const walk = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;
    let checked = 0;
    while ((node = walk.nextNode()) && checked < 40) {
      checked++;
      if (!node.nodeValue || !node.nodeValue.trim()) continue;
      if (node.parentElement?.closest?.(`${CLEANUP_GLYPH},script,style,svg,[aria-hidden="true"]`)) continue;
      if (roleIn(node.nodeValue)) return { node, match: roleIn(node.nodeValue) };
    }
    return null;
  }

  function titleNode(anchor) {
    // Prefer the native text container; never process buttons/icons inside the row.
    const options = [...anchor.querySelectorAll(TITLE_SELECTORS)]
      .filter(el => !el.closest('button,[role="button"],svg'));
    for (const el of options) if (el.matches('[data-ebook-role]') || firstValidText(el)) return el;
    return firstValidText(anchor) ? anchor : null;
  }

  function decorate(anchor) {
    if (!anchor?.isConnected || !anchor.matches('a[href*="/c/"]')) return;
    const title = titleNode(anchor);
    if (!title) { errors.missingTitle++; return; }
    if (title.hasAttribute('data-ebook-role') && title.querySelector(CLEANUP_GLYPH)) return;
    const match = firstValidText(title);
    if (!match) { errors.missingPrefix++; return; }
    const {node, match: info} = match;
    if (!node.parentNode || !node.nodeValue) return;
    // Use Text.splitText: aggregate textContent and native href/data remain identical.
    // We isolate the source symbol visually without rewriting or persisting the chat title.
    const splitIndex = info.index;
    const markerPart = node.splitText(splitIndex);
    // Also isolate any whitespace immediately following the prefix so layout has no gap.
    const trailing = (/^\s*/u.exec(markerPart.nodeValue.slice(info.symbol.length)) || [''])[0];
    markerPart.splitText(info.symbol.length + trailing.length);
    const hidden = document.createElement('span');
    hidden.setAttribute('data-ebook-glyph', 'true');
    hidden.textContent = markerPart.nodeValue;
    markerPart.replaceWith(hidden);
    title.setAttribute('data-ebook-role', info.role);
    if (info.lifecycle) title.setAttribute('data-ebook-life-cycle', info.lifecycle === '완료' ? 'done' : info.lifecycle === '중단' ? 'stopped' : 'paused');
    touched.add(title);
    errors.wrapped++;
    // Aggregate DOM text remains identical; React source data and attributes are untouched.
  }


  /* Dot unread counter: visual marker only, leaves native content intact.
     Mark the numeric leaf under the exact sidebar 'Dot' link/button. */
  function markDotCounter() {
    for (const root of observedRoots) {
      if (!root.isConnected) continue;
      for (const item of root.querySelectorAll('a,button,[role="button"]')) {
        const label=(item.textContent||'').replace(/\s+/g,' ').trim();
        if (!/^Dot(?:\s*\d{1,3})?$/iu.test(label)) continue;
        const nearby=item.parentElement?.textContent?.replace(/\s+/g,' ').trim()||'';
        const scope=/^Dot\s*\d{1,3}$/iu.test(nearby)?item.parentElement:item;
        const candidates=[...scope.querySelectorAll('span,div')].filter(el =>
          el.children.length===0 && /^\d{1,3}$/u.test((el.textContent||'').trim()));
        const badge=candidates.at(-1);
        if (badge && !badge.hasAttribute('data-ebook-dot-counter'))
          badge.setAttribute('data-ebook-dot-counter','true');
      }
    }
  }

  function synchronizeSidebar() {
    if (disposed) return;
    for (const root of observedRoots) {
      if (!root.isConnected) continue;
      const anchors = root.querySelectorAll('a[href*="/c/"]');
      for (const anchor of anchors) decorate(anchor);
    }
  }

  function syncClock() {
    const shadow = document.getElementById(CLOCK_HOST)?.shadowRoot;
    if (!shadow) return;
    const current = shadow.querySelector(`#${CLOCK_CSS_ID}`);
    if (!current) {
      const style = document.createElement('style');
      style.id = CLOCK_CSS_ID;
      style.textContent = clockCSS;
      shadow.appendChild(style);
      shadowStyle = style;
    } else {
      shadowStyle = current;
      // Status can append a new style on reattachment. This stylesheet only
      // covers Life Clock, never Status' own buttons, so ordering is safe.
    }
  }

  function attachObservers() {
    const roots = sidebarRoots();
    if (roots.length && bootstrapObserver) { bootstrapObserver.disconnect(); bootstrapObserver = null; }
    if (roots.length === observedRoots.length && roots.every((x,i) => x === observedRoots[i] && x.isConnected)) return;
    observer.disconnect();
    observedRoots = roots;
    for (const root of roots) observer.observe(root,{subtree:true,childList:true,characterData:true});
  }

  function update() {
    if (disposed) return;
    attachObservers();
    synchronizeSidebar();
    markDotCounter();
    syncClock();
  }

  function schedule() {
    if (disposed || frame) return;
    frame = window.requestAnimationFrame(() => { frame = 0; update(); });
  }

  function restore() {
    // Best-effort cleanup of visual wrappers. Title content remains untouched.
    const list = [...document.querySelectorAll(CLEANUP_GLYPH)];
    for (const hidden of list) hidden.replaceWith(document.createTextNode(hidden.textContent || ''));
    for (const el of touched) if (el.isConnected) {
      el.removeAttribute('data-ebook-role');
      el.removeAttribute('data-ebook-life-cycle');
    }
    touched.clear();
    for (const badge of document.querySelectorAll('[data-ebook-dot-counter="true"]'))
      badge.removeAttribute('data-ebook-dot-counter');
  }

  function dispose() {
    disposed = true;
    observer.disconnect();
    bootstrapObserver?.disconnect();
    clearInterval(recoverTimer);
    if (frame) cancelAnimationFrame(frame);
    restore();
    shadowStyle?.remove();
    document.getElementById(CLOCK_HOST)?.shadowRoot?.querySelector(`#${CLOCK_CSS_ID}`)?.remove();
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', schedule);
    if (window[RUNTIME]?.dispose === dispose) delete window[RUNTIME];
  }

  function onVisibility() { if (!document.hidden) schedule(); }

  if (document.body) {
    bootstrapObserver = new MutationObserver(() => { if (sidebarRoots().length) { bootstrapObserver?.disconnect(); bootstrapObserver = null; schedule(); } });
    bootstrapObserver.observe(document.body,{childList:true,subtree:true});
  }
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', schedule);
  recoverTimer = setInterval(() => { if (!document.hidden) schedule(); }, 4000);
  schedule();
  window[RUNTIME] = {
    version:'0.2.0',dispose,refresh:schedule,
    diagnostics:() => ({...errors,roots:observedRoots.length,clockSkinned:!!document.getElementById(CLOCK_HOST)?.shadowRoot?.querySelector(`#${CLOCK_CSS_ID}`)})
  };
})();
