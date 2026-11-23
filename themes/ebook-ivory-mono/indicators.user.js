// ==UserScript==
// @name         Jaroo E-book · Role Indicators & Clock Skin
// @namespace    jaroo.theme.ebook.ivory-mono
// @version      0.2.4
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
      --ebook-font:"IBM Plex Mono","Pretendard Variable","Pretendard",sans-serif;
       --ebook-mono:"IBM Plex Mono","Pretendard Variable","Pretendard",monospace;
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
    // Search the Dot navigation row only. The number can be a sibling of its
    // anchor; previous versions incorrectly searched the anchor alone.
    const marked=new Set();
    for (const root of observedRoots) {
      if (!root.isConnected) continue;
      const matches=[...root.querySelectorAll('a,button,[role="button"],span,div')].filter(el=>
        el.children.length===0 && (el.textContent||'').trim()==='Dot');
      for (const label of matches) {
        let parent=label;
        for(let level=0;level<5 && parent && parent!==root;level++,parent=parent.parentElement) {
          const aggregate=(parent.textContent||'').replace(/\s+/g,'').trim();
          if(!/^Dot\d{1,3}$/iu.test(aggregate))continue;
          const numeric=[...parent.querySelectorAll('span,div,small')].filter(el=>
            el.children.length===0 && /^\d{1,3}$/u.test((el.textContent||'').trim()));
          const lr=label.getBoundingClientRect();
          const badge=numeric.find(el=>{
            const br=el.getBoundingClientRect();
            return (br.width===0 || Math.abs(br.top-lr.top)<36) &&
              (!br.width || br.left>lr.left);
          })||numeric.at(-1);
          if(badge){marked.add(badge);break;}
        }
      }
    }
    for(const el of document.querySelectorAll('[data-ebook-dot-counter="true"]')) {
      if(!marked.has(el))el.removeAttribute('data-ebook-dot-counter');
    }
    for(const el of marked) {
      if(!el.hasAttribute('data-ebook-dot-counter'))
        el.setAttribute('data-ebook-dot-counter','true');
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


  /* Find effort/model display inside the composer without modifying its state. */

  let composerObserved=null;
  const composerObserver=new MutationObserver(()=>schedule());
  function activeComposer() {
    const editor=document.querySelector('#prompt-textarea,[data-testid="prompt-textarea"],[contenteditable="true"][role="textbox"]');
    if(!editor) return null;
    const shell=editor.closest('#composer-background')||
      document.querySelector('#composer-background')||
      editor.closest('[data-testid="composer"]')||
      editor.closest('form');
    const form=editor.closest('form');
    // A file preview can be outside #composer-background but inside the form.
    return {editor,shell:shell||form,form};
  }
  function watchComposer() {
    const item=activeComposer();
    const root=item?.form||item?.shell;
    if(root===composerObserved && root?.isConnected)return;
    composerObserver.disconnect();
    composerObserved=root||null;
    if(root)composerObserver.observe(root,{subtree:true,childList:true,characterData:true});
  }
  function markEffortPicker() {
    // The model picker may be outside the form subtree. Search visible button
    // labels in the lower viewport, then use an exact effort suffix, never
    // modifying onclick/React model state.
    const context=activeComposer();
    const main=context?.form||context?.shell;
    const containers=[main,context?.shell].filter(Boolean);
    const suffix=/(?:^|[\s·|])(?:Extra\s+High|High|Medium|Low|Instant|Auto)$/iu;
    const buttons=[...document.querySelectorAll('button,[role="button"],[aria-haspopup]')];
    const chosen=new Set();
    const eligible=(node)=>{
      const b=node.getBoundingClientRect();
      if(!(b.width>0&&b.height>0)||node.closest('[role="dialog"],[role="menu"],[role="listbox"]'))return false;
      if(containers.some(root=>root?.contains(node)))return true;
      return b.bottom>=window.innerHeight-300 && b.left>=window.innerWidth*.37;
    };
    for(const btn of buttons){
      if(!eligible(btn))continue;
      const text=[btn.textContent,btn.getAttribute('title'),btn.getAttribute('aria-label')]
        .map(s=>(s||'').replace(/\s+/g,' ').trim()).find(s=>s&&suffix.test(s));
      if(!text||text.length>80)continue;
      chosen.add(btn);
      for(const node of btn.querySelectorAll('span,small')){
        if(suffix.test((node.textContent||'').replace(/\s+/g,' ').trim()) && node.childElementCount===0)
          chosen.add(node);
      }
    }
    // The selected effort may be a text span adjacent to a chevron, not a
    // button. If so, mark a short wrapper that contains both label and icon.
    if(!chosen.size&&main){
      for(const span of main.querySelectorAll('span,small,div')){
        if(span.children.length>1)continue;
        const label=(span.textContent||'').replace(/\s+/g,' ').trim();
        if(!suffix.test(label)||label.length>48||!eligible(span))continue;
        const wrapper=span.parentElement;
        if(wrapper && (wrapper.textContent||'').trim().length<=80 &&
           wrapper.querySelector('svg')) chosen.add(wrapper);
        else chosen.add(span);
      }
    }
    for(const el of document.querySelectorAll('[data-ebook-effort-picker="true"]')){
      if(!chosen.has(el))el.removeAttribute('data-ebook-effort-picker');
    }
    for(const el of chosen)if(!el.hasAttribute('data-ebook-effort-picker'))
      el.setAttribute('data-ebook-effort-picker','true');
  }
  function markCurrentChatTitle() {
    // Infer the active chat from the selected sidebar link and address.
    // Only mark one visible text leaf in the top header/breadcrumb.
    const id=(location.pathname.match(/\/c\/([^/?#]+)/)||[])[1]||'';
    const selected=[...document.querySelectorAll('a[href*="/c/"]')].find(a=>
      id && (a.getAttribute('href')||'').includes('/c/'+id))||
      document.querySelector('[data-jaroo-selected="true"] a[href*="/c/"],a[aria-current="page"][href*="/c/"]');
    const normalize=s=>(s||'').replace(/^\[(?:RUN|DONE)[^\]]*\]\s*/iu,'')
      .replace(/^[☆★▷▶○●>›]\s*/u,'').replace(/\s+/g,'').trim();
    const names=[normalize(selected?.getAttribute('aria-label')),normalize(selected?.textContent),
      normalize(document.title.replace(/\s*[-|]\s*ChatGPT\s*$/iu,''))]
      .filter(s=>s.length>=7&&s.length<=80);
    const headers=[...document.querySelectorAll('#page-header,[data-testid="conversation-header"],header,[role="banner"]')]
      .filter(h=>!h.closest(SIDE_ROOTS)&&h.getBoundingClientRect().top<180);
    const candidates=[];
    for(const header of headers){
      for(const el of header.querySelectorAll('span,h1,h2,button,[role="button"],div')){
        if(el.closest(SIDE_ROOTS))continue;
        const title=normalize(el.textContent);
        if(title.length<7||title.length>95)continue;
        if(!names.some(n=>title===n||n.endsWith(title)&&title.length>=10))continue;
        const rect=el.getBoundingClientRect();
        if(rect.width<=0||rect.top<0||rect.top>=180)continue;
        candidates.push({el,length:title.length,depth:el.querySelectorAll('*').length});
      }
    }
    // Newer ChatGPT may render the breadcrumb in a non-header container.
    // As a fallback, inspect only visible nodes at the very top of main.
    if(!candidates.length){
      const main=document.querySelector('main,[role="main"]');
      if(main)for(const el of main.querySelectorAll('span,h1,h2,button,[role="button"]')){
        if(el.closest(SIDE_ROOTS))continue;
        const rect=el.getBoundingClientRect();
        if(rect.width<=0||rect.top<0||rect.top>=140)continue;
        const title=normalize(el.textContent);
        if(title.length<7||title.length>95)continue;
        if(names.some(n=>title===n||n.endsWith(title)&&title.length>=10))
          candidates.push({el,length:title.length,depth:el.querySelectorAll('*').length});
      }
    }
    candidates.sort((x,y)=>x.length-y.length||x.depth-y.depth);
    const winner=candidates[0]?.el;
    for(const node of document.querySelectorAll('[data-ebook-active-title="true"]')){
      if(node!==winner)node.removeAttribute('data-ebook-active-title');
    }
    if(winner&&!winner.hasAttribute('data-ebook-active-title'))
      winner.setAttribute('data-ebook-active-title','true');
  }
  function markUploadDivider() {
    // No editor/content insertion. A 1px absolute divider is appended to the
    // visual composer root, and only for a visible uploaded preview.
    const c=activeComposer();
    const prior=document.querySelector('[data-ebook-upload-divider="true"]');
    const priorHost=document.querySelector('[data-ebook-composer-root="true"]');
    if(!c?.shell||!c.editor){prior?.remove();priorHost?.removeAttribute('data-ebook-composer-root');return;}
    const shell=(c.shell.contains(c.editor)&&
      c.shell.querySelector('img,[data-testid*="attachment" i],[data-testid*="file-preview" i]'))
      ?c.shell:(c.form||c.shell);
    const er=c.editor.getBoundingClientRect(),sr=shell.getBoundingClientRect();
    if(!sr.width||!er.width){return;}
    const candidates=[];
    for(const img of shell.querySelectorAll('img')){
      const ir=img.getBoundingClientRect();
      if(ir.width>=35&&ir.height>=35 && ir.top>=sr.top-5 &&
         ir.bottom<er.top+4 && !img.closest('[role="menu"],[role="dialog"]'))
        candidates.push(ir.bottom);
    }
    for(const el of shell.querySelectorAll('[data-testid*="attachment-preview" i],[data-testid*="file-preview" i],[data-testid*="upload-preview" i]')){
      const r=el.getBoundingClientRect();
      if(r.height>=32 && r.top>=sr.top-5 && r.bottom<er.top+4)candidates.push(r.bottom);
    }
    const bottom=Math.max(0,...candidates);
    if(!bottom||er.top-bottom<7){
      prior?.remove();priorHost?.removeAttribute('data-ebook-composer-root');
      return;
    }
    if(prior&&!shell.contains(prior))prior.remove();
    if(priorHost&&priorHost!==shell)priorHost.removeAttribute('data-ebook-composer-root');
    let line=shell.querySelector('[data-ebook-upload-divider="true"]');
    if(!line){
      line=document.createElement('div');
      line.setAttribute('data-ebook-upload-divider','true');
      line.setAttribute('aria-hidden','true');
      shell.appendChild(line);
    }
    if(!shell.hasAttribute('data-ebook-composer-root'))
      shell.setAttribute('data-ebook-composer-root','true');
    const gap=er.top-bottom;
    const offset=Math.max(9,Math.min(er.top-sr.top-7,bottom-sr.top+gap*.48));
    const top=Math.round(offset*10)/10+'px';
    if(line.style.top!==top)line.style.top=top;
  }


  /* Applies a reversible inline size only to genuine title text. A user's
     DevTools screenshots showed 14px at the leaf while outer selectors had
     requested 19.33px. This presentation-only fallback survives React redraws
     without altering any title content, href, click handler or app data. */
  const opticalFontOriginal=new Map();
  function enforceOpticalSidebarText() {
    const s=getComputedStyle(document.documentElement)
      .getPropertyValue('--eb-nav-optical-size').trim() || '16px';
    const targets=new Set();
    // The user-provided Chrome Elements tree confirms [data-thread-title]
    // with several nested spans, often under .content-marquee.
    for(const title of document.querySelectorAll('[data-thread-title="true"]')) {
      if(!title.closest('[data-sidebar-cycle-item],#stage-sidebar,#stage-slideover-sidebar,#slate-sidebar,[data-testid="sidebar"]'))
        continue;
      targets.add(title);
      for(const el of title.querySelectorAll('span,div,[data-d-component="text"]')) {
        if(el.closest('[data-ebook-glyph="true"],[aria-hidden="true"],.sr-only'))continue;
        targets.add(el);
      }
    }
    // Apply the same optical size to the displayed project name, not the
    // folder glyph or other unrelated sidebar controls.
    for(const title of document.querySelectorAll(
        '[data-sidebar-project-kind="local"] [data-app-action-sidebar-project-row] [data-marquee-content="true"]')) {
      targets.add(title);
      for(const el of title.querySelectorAll('span,div,[data-d-component="text"]')) {
        if(el.closest('[aria-hidden="true"],.sr-only'))continue;
        targets.add(el);
      }
    }
    for(const el of targets) {
      if(!opticalFontOriginal.has(el))
        opticalFontOriginal.set(el,{
          value:el.style.getPropertyValue('font-size'),
          priority:el.style.getPropertyPriority('font-size')
        });
      if(el.style.getPropertyValue('font-size')!==s ||
         el.style.getPropertyPriority('font-size')!=='important')
        el.style.setProperty('font-size',s,'important');
    }
    for(const el of opticalFontOriginal.keys())if(!el.isConnected)
      opticalFontOriginal.delete(el);
  }
  function restoreOpticalSidebarText() {
    for(const [el,original] of opticalFontOriginal) {
      if(!el.isConnected)continue;
      if(original.value)
        el.style.setProperty('font-size',original.value,original.priority);
      else el.style.removeProperty('font-size');
    }
    opticalFontOriginal.clear();
  }

  function update() {
    if (disposed) return;
    attachObservers();
    synchronizeSidebar();
    enforceOpticalSidebarText();
    markDotCounter();
    watchComposer();
    markEffortPicker();
    markCurrentChatTitle();
    markUploadDivider();
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
    composerObserver.disconnect();
    bootstrapObserver?.disconnect();
    clearInterval(recoverTimer);
    if (frame) cancelAnimationFrame(frame);
    restore();
    restoreOpticalSidebarText();
    document.querySelectorAll('[data-ebook-effort-picker="true"]').forEach(n=>n.removeAttribute('data-ebook-effort-picker'));
    document.querySelectorAll('[data-ebook-active-title="true"]').forEach(n=>n.removeAttribute('data-ebook-active-title'));
    document.querySelectorAll('[data-ebook-upload-divider="true"]').forEach(n=>n.remove());
    document.querySelectorAll('[data-ebook-composer-root="true"]').forEach(n=>n.removeAttribute('data-ebook-composer-root'));
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

  /* On-demand read-only font audit. Gives the actual computed CSS pixel size
     and family without collecting or returning private chat text. */
  function fontAudit() {
    const sidebar=document.querySelector(
      '#stage-sidebar,#stage-slideover-sidebar,#slate-sidebar,[data-testid="sidebar"]'
    )||document.querySelector('aside');
    const sample=selector=>document.querySelector(selector);
    const pick=(el)=>{
      if(!el)return {found:false};
      const s=getComputedStyle(el);
      return {found:true,fontFamily:s.fontFamily,fontSize:s.fontSize,
        fontWeight:s.fontWeight,letterSpacing:s.letterSpacing};
    };
    const reply=sample('[data-message-author-role="assistant"] p[data-d-text-flow]')||
      sample('[data-message-author-role="assistant"] .markdown p')||
      sample('[data-message-author-role="assistant"] p');
    const user=sample('[data-message-author-role="user"] [data-user-message-bubble="true"] p')||
      sample('[data-message-author-role="user"] [data-d-text-flow]');
    const project=sidebar?.querySelector(
      '[data-sidebar-project-kind="local"] [data-app-action-sidebar-project-row] [data-marquee-content="true"]'
    );
    const chat=sidebar?.querySelector(
      'a[href*="/c/"] [data-ebook-role], a[href*="/c/"] [data-thread-title="true"], a[href*="/c/"]'
    );
    const prompt=sample('#prompt-textarea,[data-testid="prompt-textarea"],[contenteditable="true"][role="textbox"]');
    const composer=sample('#composer-background,[data-testid="composer"]');
    const composerStyle=composer?getComputedStyle(composer):null;
    return {project:pick(project),chat:pick(chat),reply:pick(reply),user:pick(user),
      prompt:pick(prompt),composer:composerStyle?
      {border:composerStyle.borderTopWidth+' '+composerStyle.borderTopStyle+' '+composerStyle.borderTopColor,
       boxShadow:composerStyle.boxShadow}: {found:false}};
  }

  window[RUNTIME] = {
    version:'0.2.4',dispose,refresh:schedule,
    diagnostics:() => ({...errors,roots:observedRoots.length,clockSkinned:!!document.getElementById(CLOCK_HOST)?.shadowRoot?.querySelector(`#${CLOCK_CSS_ID}`),dotMarkers:document.querySelectorAll('[data-ebook-dot-counter="true"]').length,effortMarkers:document.querySelectorAll('[data-ebook-effort-picker="true"]').length,headerMarkers:document.querySelectorAll('[data-ebook-active-title="true"]').length,uploadDivider:!!document.querySelector('[data-ebook-upload-divider="true"]'),opticalLeaves:opticalFontOriginal.size,opticalTarget:getComputedStyle(document.documentElement).getPropertyValue('--eb-nav-optical-size').trim(),fontAudit:fontAudit()})
  };
})();
