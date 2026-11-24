// ==UserScript==
// @name         Jaroo E-book · Role Indicators & Clock Skin
// @namespace    jaroo.theme.ebook.ivory-mono
// @version      0.2.24
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
      --ebook-paper:#EFF1F2;
      --ebook-panel:#F5F6F6;
      --ebook-soft:#E7EAEB;
      --ebook-ink:#292D30;
      --ebook-muted:#535B60;
      --ebook-line:#BFC8CC;
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
    .life-head { border-bottom:1px solid #C5CDD0!important; }
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
      border-bottom:1px solid #C5CDD0!important;
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
      background:#E7EAEB!important;
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


  /* v0.2.24 — keep the known New Chat detector; find the real Dot text
     even when the native app uses a div/label or an alternate navigation
     wrapper. Only the literal label is styled, never its count or icon.
     Direct reversible inline typography avoids stale native leaf rules. */
  const quickDotOriginal=new Map();
  const quickDotProps=['font-family','font-size','font-weight','line-height',
    'letter-spacing','color','-webkit-text-fill-color'];
  const quickControl='button,a,[role="button"],[role="link"],[data-testid*="dot" i]';
  const quickTextCandidates='span,div,p,label,a,button,[role="link"],[role="button"],[data-d-component="text"]';
  const quickDotExclude='[data-message-author-role],[role="dialog"],[role="menu"],'+
    '[data-sidebar-project-kind="local"],[data-app-action-sidebar-project-row],'+
    '[data-thread-title="true"],a[href*="/c/"],[aria-hidden="true"],.sr-only,[hidden],'+
    'svg,[data-ebook-dot-counter="true"],[data-testid="composer"]';
  function isExactDotText(el) {
    if(!el?.isConnected||el.closest(quickDotExclude))return false;
    if(normalizeLabel(el.textContent)!=='Dot')return false;
    // An outer control can contain a nested label with identical aggregate
    // text: accept only the element that actually owns the direct text.
    const direct=[...el.childNodes].filter(n=>n.nodeType===3)
      .map(n=>n.nodeValue||'').join('');
    return normalizeLabel(direct)==='Dot';
  }
  function collectDotLabels(newChatLabels) {
    const result=new Set(),candidates=new Set();
    const roots=new Set([...sidebarRoots(),...document.querySelectorAll('aside,[data-ebook-sidebar-seam="true"]')]);
    for(const el of document.querySelectorAll(
      '[data-app-action-sidebar-project-row],'+
      '[data-ebook-quick-label="new-chat"]')) {
      const root=el.closest(SIDE_ROOTS+',aside,[role="complementary"]');
      if(root)roots.add(root);
    }
    for(const root of roots) {
      const r=visibleBox(root);
      if(!r||r.left< -3||r.left>180||r.width<100||r.width>720)continue;
      for(const el of root.querySelectorAll(quickTextCandidates))candidates.add(el);
    }
    // Safe geometry + exact text fallback for newer app-shells without the
    // legacy sidebar IDs. Search only controls and their text descendants.
    for(const control of document.querySelectorAll(quickControl)) {
      const label=normalizeLabel(control.textContent);
      if(!/^Dot(?:\s*\d{1,3})?$/u.test(label))continue;
      candidates.add(control);
      for(const el of control.querySelectorAll(quickTextCandidates))candidates.add(el);
    }
    for(const el of candidates) {
      if(!isExactDotText(el))continue;
      const r=visibleBox(el);
      if(!r||r.left<0||r.left>410||r.top<0)continue;
      if(getComputedStyle(el).visibility==='hidden')continue;
      const native=el.closest(quickControl);
      const root=el.closest(SIDE_ROOTS+',aside,[role="complementary"],[data-ebook-sidebar-seam="true"]');
      const rootRect=root&&visibleBox(root);
      const inRail=!!(rootRect&&rootRect.left>=-3&&rootRect.left<=180&&
        rootRect.width>=100&&rootRect.width<=720);
      const nearNewChat=newChatLabels.some(n=>{
        const q=n.getBoundingClientRect();
        return Math.abs(r.left-q.left)<100&&r.top>=q.top-8&&r.top-q.top<200;
      });
      // When the app-shell differs, a nearby existing New Chat label plus
      // native interactive parent is needed. Otherwise fail open.
      if(!inRail&&!(native&&nearNewChat))continue;
      if(!nearNewChat&&r.top>(rootRect?.top||0)+480)continue;
      if(native&&native.getBoundingClientRect().left>400)continue;
      // If a native label includes an icon or badge element, avoid applying
      // inline typography to the entire interactive container.
      if(el.children.length>0&&[...el.children].some(n=>
        !n.matches('svg,[aria-hidden="true"],.sr-only')||
        normalizeLabel(n.textContent)!==''))continue;
      result.add(el);
    }
    return result;
  }
  function restoreQuickDotTypography() {
    for(const [el,previous] of quickDotOriginal)restoreStyle(el,previous);
    quickDotOriginal.clear();
  }
  function syncQuickDotTypography(found) {
    const dotEls=new Set([...found].filter(([,kind])=>kind==='dot').map(([el])=>el));
    for(const [el,previous] of quickDotOriginal) {
      if(dotEls.has(el))continue;
      restoreStyle(el,previous);
      quickDotOriginal.delete(el);
    }
    const ref=[...found].find(([,kind])=>kind==='new-chat')?.[0];
    const reference=ref?getComputedStyle(ref):null;
    const tokens=getComputedStyle(document.documentElement);
    const color=reference?.color||tokens.getPropertyValue('--eb-ink').trim()||'#292D30';
    const values={
      'font-family':reference?.fontFamily||tokens.getPropertyValue('--eb-font').trim()||'"Jaroo Plex Latin","Pretendard Variable","Pretendard",sans-serif',
      'font-size':reference?.fontSize||tokens.getPropertyValue('--eb-project-optical-size').trim()||'16px',
      'font-weight':reference?.fontWeight||'650',
      'line-height':reference?.lineHeight||'1.42',
      'letter-spacing':reference?.letterSpacing||'normal',
      'color':color,
      '-webkit-text-fill-color':reference?.getPropertyValue('-webkit-text-fill-color')||color
    };
    for(const el of dotEls) {
      if(!quickDotOriginal.has(el))quickDotOriginal.set(el,snapshotStyle(el,quickDotProps));
      for(const [p,v] of Object.entries(values))makeImportant(el,p,v);
    }
  }
  function markQuickActionLabels() {
    const found=new Map();
    // Preserve the original working New Chat path and its marker geometry.
    const leaves=document.querySelectorAll(
      'button span,a span,[role="button"] span,[role="link"] span,'+
      'button [data-d-component="text"],a [data-d-component="text"]'
    );
    for(const el of leaves) {
      if(el.closest('main,[role="main"],[role="dialog"],[role="menu"],'+
                    '[data-sidebar-cycle-item],[data-sidebar-project-kind="local"],'+
                    '[data-thread-title="true"],[aria-hidden="true"],.sr-only'))continue;
      if(el.children.length>0)continue;
      const raw=normalizeLabel(el.textContent);
      if(raw!=='새 채팅'&&raw!=='New chat')continue;
      const nav=el.closest('button,a,[role="button"],[role="link"]');
      if(!nav)continue;
      const rect=el.getBoundingClientRect(),nrect=nav.getBoundingClientRect();
      if(rect.width<=0||rect.height<=0||rect.left<0||rect.left>410||
         rect.top<32||rect.top>360||nrect.left>400)continue;
      found.set(el,'new-chat');
    }
    const newChatLabels=[...found.keys()];
    for(const el of collectDotLabels(newChatLabels))found.set(el,'dot');
    syncPresentationMarks('data-ebook-quick-label',found);
    syncQuickDotTypography(found);
  }


  /* v0.2.23 — presentation only, restricted to known project labels,
     one visible outer sidebar, and a paired native Chat/Work switch. */
  const projectMarkerGroups=new Map([
    ['대표실','exec'],['전략기획본부','strategy'],
    ['영업팀','sales'],['BD팀','bd'],['제안팀','proposal'],
    ['디자인팀','design'],['기술운영팀','tech'],['인재개발팀','people'],
    ['경영관리실','management'],['개인비서실','assistant'],
    ['CEO 경영철학과 판단','philosophy']
  ]);
  const normalizeLabel=s=>(s||'').replace(/\s+/gu,' ').trim();
  const visibleBox=el=>{
    if(!el?.isConnected||el.closest('[aria-hidden="true"],.sr-only,[hidden]'))return null;
    const r=el.getBoundingClientRect();
    return r.width>0&&r.height>0?r:null;
  };
  function syncPresentationMarks(attr,wanted) {
    for(const el of document.querySelectorAll('['+attr+']'))
      if(!wanted.has(el))el.removeAttribute(attr);
    for(const [el,value] of wanted)
      if(el.getAttribute(attr)!==value)el.setAttribute(attr,value);
  }
  function markProjectTitles() {
    const wanted=new Map();
    for(const row of document.querySelectorAll('[data-app-action-sidebar-project-row]')) {
      const root=row.querySelector('[data-marquee-content="true"]');
      if(!root)continue;
      // The actual nested visible text leaf, not the wide row or folder icon.
      // Exact names only: do not classify similarly named child conversations.
      const leaves=[...root.querySelectorAll('span,div,[data-d-component="text"]')].filter(el=>
        el.children.length===0&&visibleBox(el)&&
        !el.closest('svg,button,[role="button"],[data-thread-title="true"],a[href*="/c/"]')
      );
      let matched=false;
      for(const leaf of leaves) {
        const group=projectMarkerGroups.get(normalizeLabel(leaf.textContent));
        if(group){wanted.set(leaf,group);matched=true;}
      }
      // Some native project titles are split into several text runs.
      // The marquee container may itself be the smallest safe text box.
      if(!matched&&visibleBox(root)) {
        const group=projectMarkerGroups.get(normalizeLabel(root.textContent));
        if(group)wanted.set(root,group);
      }
    }
    syncPresentationMarks('data-ebook-project-marker',wanted);
  }
  function markSidebarSeam() {
    const roots=[...sidebarRoots()];
    // A native sidebar root can be an aside on a newer app-shell layout.
    for(const row of document.querySelectorAll('[data-app-action-sidebar-project-row]')) {
      const aside=row.closest('aside');
      if(aside&&!roots.includes(aside))roots.push(aside);
    }
    const valid=roots.filter(el=>{
      const r=visibleBox(el);
      return r&&r.left>=-2&&r.left<180&&r.width>=130&&r.width<=720&&
        r.height>140&&r.top<180;
    });
    const outer=valid.filter(el=>!valid.some(p=>p!==el&&p.contains(el)));
    syncPresentationMarks('data-ebook-sidebar-seam',new Map(outer.map(el=>[el,'true'])));
  }
  const modeControlSelector='button,a[href],[role="button"],[role="tab"],[role="radio"]';
  const modeExclude='[data-message-author-role],[role="dialog"],[role="menu"],'+
    '[data-thread-title="true"],[data-app-action-sidebar-project-row],[data-testid="composer"],'+
    '[data-ebook-quick-label],.sr-only,[aria-hidden="true"]';
  function nativeModeState(el) {
    // Use native semantic state only. Unknown/contradictory state fails open.
    let yes=false,no=false;
    for(const key of ['aria-selected','aria-pressed','aria-checked','data-selected','data-active','data-checked']) {
      const value=el.getAttribute(key);
      if(value==='true')yes=true;
      else if(value==='false')no=true;
    }
    const current=el.getAttribute('aria-current');
    if(current&&current!=='false')yes=true;
    else if(current==='false')no=true;
    const state=el.getAttribute('data-state');
    if(['active','on','checked','selected'].includes(state))yes=true;
    if(['inactive','off','unchecked','unselected'].includes(state))no=true;
    if(['active','selected','is-active','is-selected'].some(c=>el.classList.contains(c)))yes=true;
    return yes===no?null:yes;
  }
  function pairedModeControls() {
    const chat=[],work=[];
    for(const el of document.querySelectorAll(modeControlSelector)) {
      if(el.closest(modeExclude))continue;
      const raw=normalizeLabel(el.textContent).toLowerCase();
      if(raw!=='chat'&&raw!=='work')continue;
      const r=visibleBox(el);
      if(!r||r.top< -3||r.top>180||r.height>80||r.width>280)continue;
      (raw==='chat'?chat:work).push(el);
    }
    let best=null;
    for(const a of chat)for(const b of work) {
      if(a.contains(b)||b.contains(a))continue;
      const ar=a.getBoundingClientRect(),br=b.getBoundingClientRect();
      if(Math.abs((ar.top+ar.bottom)-(br.top+br.bottom))>24||
         Math.max(ar.left,br.left)-Math.min(ar.right,br.right)>32)continue;
      let host=a.parentElement;
      for(let depth=0;host&&depth<6;depth++,host=host.parentElement) {
        if(!host.contains(b))continue;
        if(host.matches('body,html,header,main,aside,nav,[role="banner"]'))break;
        const r=visibleBox(host);
        if(!r||r.width>560||r.height>92)break;
        // The paired labels must be the complete mode selector, not a page header.
        const label=normalizeLabel(host.textContent).toLowerCase().replace(/\s+/g,'');
        if(label!=='chatwork'&&label!=='workchat')break;
        const score=r.width*r.height;
        if(!best||score<best.score)best={host,a,b,score};
        break;
      }
    }
    return best;
  }
  let modeObserved=null;
  const modeObserver=new MutationObserver(()=>schedule());
  function markWorkSwitcher() {
    const pair=pairedModeControls();
    const hosts=new Map(),tabs=new Map();
    if(pair) {
      const {host,a,b}=pair;
      hosts.set(host,'true');
      const sa=nativeModeState(a),sb=nativeModeState(b);
      let active=null;
      if(sa===true&&sb!==true)active=a;
      else if(sb===true&&sa!==true)active=b;
      else if(sa===false&&sb===null)active=b;
      else if(sb===false&&sa===null)active=a;
      // Optional native app-shell page marker, never fabricate selection.
      if(!active&&sa===null&&sb===null) {
        const shell=host.closest('[data-app-shell-active-page]')||
          (document.documentElement.hasAttribute('data-app-shell-active-page')?document.documentElement:null);
        const mode=shell?.getAttribute('data-app-shell-active-page')?.toLowerCase();
        if(mode==='chat')active=a;
        if(mode==='work')active=b;
      }
      tabs.set(a,active?(active===a?'active':'idle'):'unknown');
      tabs.set(b,active?(active===b?'active':'idle'):'unknown');
    }
    syncPresentationMarks('data-ebook-work-switcher',hosts);
    syncPresentationMarks('data-ebook-switch-tab',tabs);
    const next=pair?.host||null;
    if(next!==modeObserved) {
      modeObserver.disconnect();
      modeObserved=next;
      if(next)modeObserver.observe(next,{subtree:true,childList:true,characterData:true,attributes:true,
        attributeFilter:['aria-selected','aria-pressed','aria-checked','aria-current','data-selected','data-active','data-state','data-checked','class']});
    }
  }
  function onModeInteraction(event) {
    if(event.target?.closest?.('[data-ebook-work-switcher="true"]'))schedule();
  }
  function restoreNotebookMarks() {
    modeObserver.disconnect();
    modeObserved=null;
    document.removeEventListener('click',onModeInteraction,true);
    for(const attr of ['data-ebook-project-marker','data-ebook-sidebar-seam','data-ebook-work-switcher','data-ebook-switch-tab'])
      syncPresentationMarks(attr,new Map());
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
  const projectWeightOriginal=new Map();
  function enforceOpticalSidebarText() {
    // The old visual script could hold 16px as an inline !important rule.
    // Set ONLY chat title text to the user's requested 16px - 1pt.
    const projectSize=getComputedStyle(document.documentElement)
      .getPropertyValue('--eb-project-optical-size').trim() || '16px';
    const chatSize='15.333px';
    const targets=new Map();
    const projectLeaves=new Set();
    // The user-provided Chrome Elements tree confirms [data-thread-title]
    // with several nested spans, often under .content-marquee.
    for(const title of document.querySelectorAll('[data-thread-title="true"]')) {
      if(!title.closest('[data-sidebar-cycle-item],#stage-sidebar,#stage-slideover-sidebar,#slate-sidebar,[data-testid="sidebar"]'))
        continue;
      targets.set(title,chatSize);
      for(const el of title.querySelectorAll('span,div,[data-d-component="text"]')) {
        if(el.closest('[data-ebook-glyph="true"],[aria-hidden="true"],.sr-only'))continue;
        targets.set(el,chatSize);
      }
    }
    // Apply the same optical size to the displayed project name, not the
    // folder glyph or other unrelated sidebar controls.
    for(const title of document.querySelectorAll(
        '[data-sidebar-project-kind="local"] [data-app-action-sidebar-project-row] [data-marquee-content="true"]')) {
      targets.set(title,projectSize);
      projectLeaves.add(title);
      for(const el of title.querySelectorAll('span,div,[data-d-component="text"]')) {
        if(el.closest('[aria-hidden="true"],.sr-only'))continue;
        targets.set(el,projectSize);
        projectLeaves.add(el);
      }
    }
    for(const [el,targetSize] of targets) {
      if(!opticalFontOriginal.has(el))
        opticalFontOriginal.set(el,{
          value:el.style.getPropertyValue('font-size'),
          priority:el.style.getPropertyPriority('font-size')
        });
      if(el.style.getPropertyValue('font-size')!==targetSize ||
         el.style.getPropertyPriority('font-size')!=='important')
        el.style.setProperty('font-size',targetSize,'important');
    }
    // On real project text leaves, old child styles may win over parent CSS.
    // Apply a moderately strong 650 weight without changing any chat row.
    for(const el of projectLeaves) {
      if(!projectWeightOriginal.has(el))
        projectWeightOriginal.set(el,{
          value:el.style.getPropertyValue('font-weight'),
          priority:el.style.getPropertyPriority('font-weight')
        });
      if(el.style.getPropertyValue('font-weight')!=='650' ||
         el.style.getPropertyPriority('font-weight')!=='important')
        el.style.setProperty('font-weight','650','important');
    }
    for(const el of projectWeightOriginal.keys())if(!el.isConnected)
      projectWeightOriginal.delete(el);
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
    for(const [el,original] of projectWeightOriginal){
      if(!el.isConnected)continue;
      if(original.value)
        el.style.setProperty('font-weight',original.value,original.priority);
      else el.style.removeProperty('font-weight');
    }
    projectWeightOriginal.clear();
  }


  /* Decorate the actual outer input-card surface, never the text editor.
     The form can wrap a distinct #composer-background node. Measure the
     candidate geometry and only decorate an element enclosing the editor. */

  /* Single-frame composer restoration.
     Prefer the first truly bordered, rounded ancestor of the editor, i.e.
     the inner light-gray line indicated in the user's screenshot. Replace its
     stroke with charcoal, and mute the outer ancestor rings completely.
     Original inline values are restored on disable/theme swap. */
  const composerFrameOriginal=new Map();
  const composerMutedOriginal=new Map();
  const frameProperties=['border','border-radius','box-shadow','-webkit-box-shadow','outline'];
  const muteProperties=['border','outline','box-shadow','-webkit-box-shadow'];
  function snapshotStyle(el,properties){
    const prev={};
    for(const p of properties)prev[p]={
      value:el.style.getPropertyValue(p),
      priority:el.style.getPropertyPriority(p)
    };
    return prev;
  }
  function restoreStyle(el,previous){
    if(!el.isConnected)return;
    for(const [p,saved] of Object.entries(previous)){
      if(saved.value)el.style.setProperty(p,saved.value,saved.priority);
      else el.style.removeProperty(p);
    }
  }
  function makeImportant(el,property,value){
    if(el.style.getPropertyValue(property)!==value ||
       el.style.getPropertyPriority(property)!=='important')
      el.style.setProperty(property,value,'important');
  }
  function syncComposerFrame() {
    const context=activeComposer();
    const editor=context?.editor;
    if(!editor || !editor.isConnected) {
      restoreComposerFrames();
      return;
    }
    const eb=editor.getBoundingClientRect();
    if(eb.width<40)return;
    const ancestors=[];
    let cur=editor.parentElement;
    for(let i=0;cur&&cur!==document.body&&i<16;i++,cur=cur.parentElement){
      ancestors.push(cur);
      if(cur.matches('form'))break;
    }
    const withinComposer=el=>{
      const r=el.getBoundingClientRect();
      return r.width>=Math.max(165,eb.width*.87) &&
        r.height>=eb.height+8 && r.height<=650 &&
        r.top<=eb.top+8 && r.bottom>=eb.bottom-5;
    };
    // Hold a previously chosen frame stable over refreshes; its border is
    // already black and should not cause another native ancestor to be chosen.
    let chosen=[...composerFrameOriginal.keys()].find(el=>
      el.isConnected && el.contains(editor) && withinComposer(el));
    if(!chosen) {
      const nativeRounded=ancestors.filter(el=>{
        if(!withinComposer(el))return false;
        const s=getComputedStyle(el);
        const border=parseFloat(s.borderTopWidth)||0;
        const radius=parseFloat(s.borderTopLeftRadius)||0;
        const shadowEdge=s.boxShadow && s.boxShadow!=='none';
        return radius>=8 && ((border>=.5 && s.borderTopStyle!=='none') || shadowEdge);
      });
      chosen=nativeRounded[0] ||
        ancestors.find(el=>el.id==='composer-background' && withinComposer(el)) ||
        ancestors.find(el=>el.matches('[data-testid="composer"]') && withinComposer(el)) ||
        ancestors.find(el=>el.matches('form') && withinComposer(el));
    }
    if(!chosen) return;
    const outerAncestors=[];
    let parent=chosen.parentElement;
    for(let i=0;parent&&parent!==document.body&&i<12;i++,parent=parent.parentElement){
      if(!parent.contains(editor))break;
      outerAncestors.push(parent);
      if(parent.matches('form'))break;
    }
    const muted=new Set(outerAncestors);
    // In case a formerly selected frame becomes an ancestor after a React
    // redraw, restore its saved properties before marking it as muted.
    for(const [el,saved] of composerFrameOriginal){
      if(el===chosen)continue;
      restoreStyle(el,saved);
      el.removeAttribute('data-ebook-composer-frame');
      el.style.removeProperty('--eb-composer-native-radius');
      composerFrameOriginal.delete(el);
    }
    for(const [el,saved] of composerMutedOriginal){
      if(muted.has(el))continue;
      restoreStyle(el,saved);
      el.removeAttribute('data-ebook-composer-muted');
      composerMutedOriginal.delete(el);
    }
    // If an older muted ancestor becomes the chosen inner frame, restore
    // its original style before applying its new accent keyline.
    if(composerMutedOriginal.has(chosen)){
      restoreStyle(chosen,composerMutedOriginal.get(chosen));
      composerMutedOriginal.delete(chosen);
      chosen.removeAttribute('data-ebook-composer-muted');
    }
    if(!composerFrameOriginal.has(chosen)){
      const original=getComputedStyle(chosen);
      const radius=Math.max(22,Math.min(36,
        parseFloat(original.borderTopLeftRadius)||24));
      composerFrameOriginal.set(chosen,snapshotStyle(chosen,frameProperties));
      makeImportant(chosen,'--eb-composer-native-radius',radius+'px');
    }
    chosen.setAttribute('data-ebook-composer-frame','true');
    makeImportant(chosen,'border','2.5px solid #1F1E1A');
    makeImportant(chosen,'border-radius',
      chosen.style.getPropertyValue('--eb-composer-native-radius')||'24px');
    makeImportant(chosen,'box-shadow','none');
    makeImportant(chosen,'-webkit-box-shadow','none');
    makeImportant(chosen,'outline','none');
    for(const el of muted){
      if(!composerMutedOriginal.has(el))
        composerMutedOriginal.set(el,snapshotStyle(el,muteProperties));
      el.setAttribute('data-ebook-composer-muted','true');
      makeImportant(el,'border','0');
      makeImportant(el,'outline','none');
      makeImportant(el,'box-shadow','none');
      makeImportant(el,'-webkit-box-shadow','none');
    }
    for(const el of composerFrameOriginal.keys())if(!el.isConnected)
      composerFrameOriginal.delete(el);
    for(const el of composerMutedOriginal.keys())if(!el.isConnected)
      composerMutedOriginal.delete(el);
  }
  function restoreComposerFrames(){
    for(const [el,saved] of composerFrameOriginal){
      restoreStyle(el,saved);
      if(el.isConnected){
        el.removeAttribute('data-ebook-composer-frame');
        el.style.removeProperty('--eb-composer-native-radius');
      }
    }
    composerFrameOriginal.clear();
    for(const [el,saved] of composerMutedOriginal){
      restoreStyle(el,saved);
      if(el.isConnected)el.removeAttribute('data-ebook-composer-muted');
    }
    composerMutedOriginal.clear();
  }


  /* v0.2.16 — user prompt typography on the exact text-bearing elements.
     Earlier CSS reached the user bubble/editor shell but not its nested DIL
     leaves; this is why font-size looked unchanged. Original inline values
     are restored on disable or script update. */
  const promptTypeOriginal=new Map();
  const promptTypeProps=['font-size','font-weight','font-synthesis-weight','letter-spacing','color','-webkit-text-fill-color','line-height'];
  function markPromptTypography() {
    const chosen=new Map();
    const reading=getComputedStyle(document.documentElement)
      .getPropertyValue('--eb-prompt-optical-size').trim() || '16px';
    // Fixed sent-message values prevent a stale Stylus CSS token (14px / 700)
    // from silently overriding this newer userscript's 15px / 650 target.
    // Keep composer, assistant and sidebar typography unchanged.
    const sentReading=getComputedStyle(document.documentElement).getPropertyValue('--eb-user-sent-optical-size').trim()||'15.667px';
    const ink=getComputedStyle(document.documentElement).getPropertyValue('--eb-prompt-sent-ink').trim()||'#292D30';
    const sentWeight=getComputedStyle(document.documentElement).getPropertyValue('--eb-prompt-sent-weight').trim()||'520';
    const hasDirectText=el=>[...el.childNodes].some(node=>
      node.nodeType===Node.TEXT_NODE && (node.nodeValue||'').trim().length>0);
    const add=(el,kind)=>{
      if(el.closest('button,[role="button"],[role="toolbar"],svg,pre,code,kbd,samp,table,[role="table"],[data-d-component="math"]'))return;
      if(el.closest('[aria-hidden="true"],.sr-only'))return;
      chosen.set(el,kind);
    };
    const editor=activeComposer()?.editor;
    if(editor?.isConnected){
      add(editor,'editor');
      for(const el of editor.querySelectorAll('p,li,span,div,[data-d-component="text"],[data-d-text-flow]')){
        if(hasDirectText(el))add(el,'editor');
      }
    }
    for(const message of document.querySelectorAll(
      '[data-message-author-role="user"],[data-user-message],[data-user-message-bubble="true"],.bg-user-message'
    )){
      const bubble=message.matches('[data-user-message],[data-user-message-bubble="true"],.bg-user-message')
        ? message
        : message.querySelector('[data-user-message],[data-user-message-bubble="true"],.bg-user-message');
      const target=bubble||message;
      if(bubble)add(bubble,'sent');
      else if(hasDirectText(message))add(message,'sent');
      const nodes=target.querySelectorAll('p,li,span,div,[data-d-component="text"],[data-d-text-flow],.whitespace-pre-wrap');
      for(const el of nodes){
        if(hasDirectText(el))add(el,'sent');
      }
    }
    for(const [el,record] of promptTypeOriginal){
      if(chosen.has(el))continue;
      if(el.isConnected){
        for(const [property,saved] of Object.entries(record.previous)){
          if(saved.value)el.style.setProperty(property,saved.value,saved.priority);
          else el.style.removeProperty(property);
        }
        el.removeAttribute('data-ebook-prompt-text');
      }
      promptTypeOriginal.delete(el);
    }
    for(const [el,kind] of chosen){
      if(!promptTypeOriginal.has(el)){
        const previous={};
        for(const property of promptTypeProps)previous[property]={
          value:el.style.getPropertyValue(property),
          priority:el.style.getPropertyPriority(property)
        };
        promptTypeOriginal.set(el,{kind,previous});
      }
      if(el.getAttribute('data-ebook-prompt-text')!==kind)
        el.setAttribute('data-ebook-prompt-text',kind);
      const required={
        'font-size':kind==='sent'?sentReading:reading,
        'line-height':kind==='sent'?'1.55':'1.56'
      };
      if(kind==='sent'){
        required['font-weight']=sentWeight;
        required['font-synthesis-weight']='none';
        required['letter-spacing']='-0.01em';
        required.color=ink;
        required['-webkit-text-fill-color']=ink;
      }
      for(const [p,v] of Object.entries(required)){
        if(el.style.getPropertyValue(p)!==v ||
           el.style.getPropertyPriority(p)!=='important')
          el.style.setProperty(p,v,'important');
      }
    }
    for(const el of promptTypeOriginal.keys())if(!el.isConnected)
      promptTypeOriginal.delete(el);
  }
  function restorePromptTypography(){
    for(const [el,record] of promptTypeOriginal){
      if(!el.isConnected)continue;
      for(const [p,saved] of Object.entries(record.previous)){
        if(saved.value)el.style.setProperty(p,saved.value,saved.priority);
        else el.style.removeProperty(p);
      }
      el.removeAttribute('data-ebook-prompt-text');
    }
    promptTypeOriginal.clear();
  }

  function update() {
    if (disposed) return;
    attachObservers();
    synchronizeSidebar();
    enforceOpticalSidebarText();
    markDotCounter();
    markQuickActionLabels();
    markSidebarSeam();
    markProjectTitles();
    markWorkSwitcher();
    watchComposer();
    syncComposerFrame();
    markPromptTypography();
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
    restoreComposerFrames();
    restorePromptTypography();
    restoreQuickDotTypography();
    restoreNotebookMarks();
    document.querySelectorAll('[data-ebook-quick-label]').forEach(n=>n.removeAttribute('data-ebook-quick-label'));
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
  document.addEventListener('click',onModeInteraction,true);
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
    version:'0.2.24',dispose,refresh:schedule,
    diagnostics:() => ({...errors,roots:observedRoots.length,clockSkinned:!!document.getElementById(CLOCK_HOST)?.shadowRoot?.querySelector(`#${CLOCK_CSS_ID}`),dotMarkers:document.querySelectorAll('[data-ebook-dot-counter="true"]').length,quickNavMarkers:[...document.querySelectorAll('[data-ebook-quick-label]')].map(n=>({kind:n.getAttribute('data-ebook-quick-label'),font:getComputedStyle(n).fontSize,weight:getComputedStyle(n).fontWeight,color:getComputedStyle(n).color,background:getComputedStyle(n).backgroundImage})),effortMarkers:document.querySelectorAll('[data-ebook-effort-picker="true"]').length,headerMarkers:document.querySelectorAll('[data-ebook-active-title="true"]').length,uploadDivider:!!document.querySelector('[data-ebook-upload-divider="true"]'),opticalLeaves:opticalFontOriginal.size,opticalProjectTarget:getComputedStyle(document.documentElement).getPropertyValue('--eb-nav-optical-size').trim(),opticalChatTarget:'15.333px',projectWeightLeaves:projectWeightOriginal.size,composerFrames:composerFrameOriginal.size,mutedComposerFrames:composerMutedOriginal.size,promptTextLeaves:promptTypeOriginal.size,promptOpticalTarget:getComputedStyle(document.documentElement).getPropertyValue('--eb-prompt-optical-size').trim(),sentPromptTarget:getComputedStyle(document.documentElement).getPropertyValue('--eb-user-sent-optical-size').trim(),projectMarkers:[...document.querySelectorAll('[data-ebook-project-marker]')].map(n=>n.getAttribute('data-ebook-project-marker')),sidebarSeams:document.querySelectorAll('[data-ebook-sidebar-seam="true"]').length,workSwitcher: [...document.querySelectorAll('[data-ebook-switch-tab]')].map(n=>n.getAttribute('data-ebook-switch-tab')),fontAudit:fontAudit()})
  };
})();
