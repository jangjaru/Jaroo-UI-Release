// ==UserScript==
// @name         Jaroo E-book · Role Indicators & Clock Skin
// @namespace    jaroo.theme.ebook.ivory-mono
// @version      0.3.0-beta.5
// @description  E-book standalone beta: native labels, project counts, dynamic geometry; CSS owns static presentation.
// @match        https://chatgpt.com/*
// @run-at       document-start
// @grant        none
// @updateURL    https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/ebook-v0.3.0/themes/ebook-ivory-mono/indicators.user.js
// @downloadURL  https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/ebook-v0.3.0/themes/ebook-ivory-mono/indicators.user.js
// ==/UserScript==

(() => {
  'use strict';

  const RUNTIME = '__jarooEbookIvoryMonoV1';
  try { window[RUNTIME]?.dispose?.(); } catch (_) {}
  const CLOCK_HOST = 'jaroo-clock-overlay-v25';
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

  let disposed = false;
  let frame = 0;
  let recoverTimer = 0;
  let cssOwnerReady=false,cssReadyTimer=0,cssReadyAttempts=0;
  let observedRoots = [];
  const PASS={NAV:1,COMPOSER:2,SENT:4,HEADER:8,EDITOR:16,DIVIDER:32};
  const ALL=63;
  let dirty=0,lastRoute=location.pathname,lastRecovery=0;
  const timings={nav:0,composer:0,sent:0,header:0,editor:0,divider:0,runs:0};
  const perfPasses={},perfEvents={scheduled:0,coalesced:0,hiddenDeferred:0};
  const OWN_NODE='[data-ebook-top-hatch-layer="true"],[data-ebook-project-count-layer="true"],[data-ebook-project-count],[data-ebook-upload-divider="true"],[data-ebook-glyph="true"]';
  const USER_NODE='[data-message-author-role="user"],[data-user-message-bubble="true"],[data-user-message]';
  const EDITOR_NODE='#prompt-textarea,[data-testid="prompt-textarea"],[data-composer-input] .ProseMirror[contenteditable="true"]';
  const HEADER_NODE='#page-header,[data-testid="conversation-header"],[role="banner"]';
  const PROJECT_ROW='[data-app-action-sidebar-project-row]';
  let navPassRows=null;
  const projectRows=()=>navPassRows||[...document.querySelectorAll(PROJECT_ROW)];
  const isOwnNode=node=>{
    const el=node?.nodeType===1?node:node?.parentElement;
    return !!el?.closest?.(OWN_NODE);
  };
  function ownMutation(m) {
    if(isOwnNode(m.target))return true;
    const changed=[...m.addedNodes,...m.removedNodes];
    return changed.length>0&&changed.every(n=>isOwnNode(n));
  }
  const observer=new MutationObserver(records=>{
    if(records.some(m=>!ownMutation(m)))schedule(PASS.NAV|PASS.HEADER);
  });
  let pageObserver=null;
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
    for (const root of navigationQueryRoots()) {
      if (!root.isConnected) continue;
      const known=[...root.querySelectorAll('[data-ebook-quick-label="dot"]')];
      const matches=known.length?known:[...root.querySelectorAll('a,button,[role="button"],span,div')].filter(el=>
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
  const quickControl='button,a,[role="button"],[role="link"],[data-testid*="dot" i]';
  const quickTextCandidates='span,div,p,label,a,button,[role="link"],[role="button"],[data-d-component="text"]';
  const quickDotExclude='[data-message-author-role],[role="dialog"],[role="menu"],'+
    '[data-sidebar-project-kind="local"],[data-app-action-sidebar-project-row],'+
    '[data-thread-title="true"],a[href*="/c/"],[aria-hidden="true"],.sr-only,[hidden],'+
    'svg,[data-ebook-dot-counter="true"],[data-testid="composer"]';
  function navigationQueryRoots() {
    const all=[...new Set([...sidebarRoots(),...document.querySelectorAll(
      'aside,[role="complementary"],[data-ebook-sidebar-seam="true"],[data-ebook-count-rail="true"],[data-ebook-sidebar-top="overlay"]'
    )])].filter(el=>{
      const r=visibleBox(el);
      return r&&r.left>=-4&&r.left<=180&&r.width>=100&&r.width<=720&&r.height>60;
    });
    return all.filter(el=>!all.some(p=>p!==el&&p.contains(el)));
  }
  function isExactDotText(el) {
    if(!el?.isConnected)return false;
    const direct=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue||'').join('');
    return normalizeLabel(direct)==='Dot'&&normalizeLabel(el.textContent)==='Dot'&&!el.closest(quickDotExclude);
  }
  function collectDotLabels(newChatLabels) {
    const result=new Set(),candidates=new Set();
    const roots=navigationQueryRoots();
    for(const root of roots)for(const el of root.querySelectorAll(quickTextCandidates))candidates.add(el);
    const newBoxes=newChatLabels.map(n=>n.getBoundingClientRect());
    function accept(nodes) {
      for(const el of nodes) {
        if(!isExactDotText(el))continue;
        const r=visibleBox(el);
        if(!r||r.left<0||r.left>410||r.top<0)continue;
        if(getComputedStyle(el).visibility==='hidden')continue;
        const native=el.closest(quickControl);
        const root=el.closest(SIDE_ROOTS+',aside,[role="complementary"],[data-ebook-sidebar-seam="true"],[data-ebook-count-rail="true"]');
        const rootRect=root&&visibleBox(root);
        const inRail=!!(rootRect&&rootRect.left>=-3&&rootRect.left<=180&&rootRect.width>=100&&rootRect.width<=720);
        const nearNewChat=newBoxes.some(q=>Math.abs(r.left-q.left)<100&&r.top>=q.top-8&&r.top-q.top<200);
        if(!inRail&&!(native&&nearNewChat))continue;
        if(!nearNewChat&&r.top>(rootRect?.top||0)+480)continue;
        if(native&&native.getBoundingClientRect().left>400)continue;
        if(el.children.length>0&&[...el.children].some(n=>
          !n.matches('svg,[aria-hidden="true"],.sr-only')||normalizeLabel(n.textContent)!==''))continue;
        result.add(el);
      }
    }
    accept(candidates);
    if(!result.size) {
      const fallback=new Set();
      for(const control of document.querySelectorAll(quickControl)) {
        if(control.closest('[data-message-author-role]'))continue;
        if(!/^Dot(?:\s*\d{1,3})?$/u.test(normalizeLabel(control.textContent)))continue;
        fallback.add(control);
        for(const el of control.querySelectorAll(quickTextCandidates))fallback.add(el);
      }
      accept(fallback);
    }
    return result;
  }
  function restoreQuickDotTypography() {
    for(const [el,previous] of quickDotOriginal)restoreStyle(el,previous);
    quickDotOriginal.clear();
  }
  function syncQuickDotTypography(found) {
    const tokens=getComputedStyle(document.documentElement);
    const required={'font-family':tokens.getPropertyValue('--eb-font').trim(),
      'font-size':tokens.getPropertyValue('--eb-project-optical-size').trim()||'16px',
      'font-weight':tokens.getPropertyValue('--eb-project-emphasis-weight').trim()||'650',
      'line-height':'1.42','letter-spacing':'normal',
      'color':tokens.getPropertyValue('--eb-ink').trim()||'#292D30',
      '-webkit-text-fill-color':tokens.getPropertyValue('--eb-ink').trim()||'#292D30'};
    for(const [el,saved] of quickDotOriginal)if(!found.has(el)||!el.isConnected){
      restoreStyle(el,saved);quickDotOriginal.delete(el);
    }
    for(const el of found.keys()){
      if(!el.hasAttribute('style')&&!quickDotOriginal.has(el))continue;
      const saved=quickDotOriginal.get(el)||{};
      if(applyStaticExceptions(el,required,saved))quickDotOriginal.set(el,saved);
      else quickDotOriginal.delete(el);
    }
  }
  function markQuickActionLabels() {
    const found=new Map();
    const selector='button span,a span,[role="button"] span,[role="link"] span,'+
      'button [data-d-component="text"],a [data-d-component="text"]';
    function scan(leaves) {
      for(const el of leaves) {
        if(el.children.length>0)continue;
        const raw=normalizeLabel(el.textContent);
        if(raw!=='새 채팅'&&raw!=='New chat')continue;
        if(el.closest('main,[role="main"],[role="dialog"],[role="menu"],'+
                      '[data-sidebar-cycle-item],[data-sidebar-project-kind="local"],'+
                      '[data-thread-title="true"],[aria-hidden="true"],.sr-only'))continue;
        const nav=el.closest('button,a,[role="button"],[role="link"]');
        if(!nav)continue;
        const rect=el.getBoundingClientRect(),nrect=nav.getBoundingClientRect();
        if(rect.width<=0||rect.height<=0||rect.left<0||rect.left>410||
           rect.top<32||rect.top>360||nrect.left>400)continue;
        found.set(el,'new-chat');
      }
    }
    for(const root of navigationQueryRoots())scan(root.querySelectorAll(selector));
    if(!found.size)scan(document.querySelectorAll(selector));
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
  const presentationMarks=new Map();
  function syncPresentationMarks(attr,wanted) {
    // The attribute belongs exclusively to this userscript. Discover any
    // orphaned previous marker once, then reuse the last set.
    const previous=presentationMarks.get(attr)||new Set(document.querySelectorAll('['+attr+']'));
    for(const el of previous)if(!wanted.has(el)&&el.isConnected)el.removeAttribute(attr);
    for(const [el,value] of wanted)if(el.getAttribute(attr)!==value)el.setAttribute(attr,value);
    presentationMarks.set(attr,new Set(wanted.keys()));
  }
  function markProjectTitles() {
    const wanted=new Map();
    for(const row of projectRows()) {
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
    for(const row of projectRows()) {
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

  /* v0.2.32: locate the actual sidebar containing the two already-marked
     quick actions and the project list. Paint an independent, hit-test-free
     strip rather than relying on an ancestor background showing through. */
  const topBands=new Map();
  const topBandContent='[data-app-action-sidebar-project-row],[data-sidebar-cycle-item],'+
    '[data-sidebar-archive-chatgpt-id],a[href*="/c/"],[data-app-action-sidebar-section-heading]';
  function topBandHeight(rr,nr,dr,end) {
    if(!rr||!nr||!dr||rr.width<130||rr.width>720||rr.height<125||
       nr.top<rr.top-3||dr.top<nr.top-2||dr.bottom>rr.top+310||
       !Number.isFinite(end)||end<dr.bottom-2||end>dr.bottom+64)return null;
    const h=end-rr.top;
    return h>=55&&h<=340&&h<rr.height-40?Math.round(h*10)/10:null;
  }
  function topBandRail(n,dot) {
    // Reuse the same rail finder as the working project count overlay.
    // New native layouts need not expose the legacy sidebar ID.
    for(let p=dot.parentElement,depth=0;p&&depth<22&&p!==document.body;p=p.parentElement,depth++) {
      if(!p.contains(n)||!validCountRail(p))continue;
      const row=p.querySelector(PROJECT_ROW);
      if(!row)continue;
      const rail=projectRail(row,{dot});
      if(validCountRail(rail)&&rail.contains(n)&&rail.contains(dot)&&rail.contains(row))return rail;
      return p;
    }
    return [...sidebarRoots()].find(p=>validCountRail(p)&&p.contains(n)&&p.contains(dot))||null;
  }
  function findTopBand(root,newChat,dot) {
    const rr=visibleBox(root),nr=visibleBox(newChat),dr=visibleBox(dot);
    if(!rr||!nr||!dr)return null;
    if(Math.abs(nr.left-dr.left)>100)return null;
    const first=root.querySelector('[data-app-action-sidebar-section-heading="Projects"]')||
      root.querySelector(PROJECT_ROW)||root.querySelector(topBandContent);
    const scrollEdges=[],wrapperEdges=[];
    if(first)for(let p=first.parentElement;p&&p!==root;p=p.parentElement) {
      const r=visibleBox(p);
      if(!r||r.width<rr.width*.60||r.height<48||p.contains(newChat)||p.contains(dot))continue;
      if(!/^(auto|scroll|overlay)$/u.test(getComputedStyle(p).overflowY))continue;
      if(topBandHeight(rr,nr,dr,r.top)!==null)scrollEdges.push(r.top);
    }
    let rowBottom=dr.bottom;
    // Dot's actual control/row is often a separate sibling from New Chat.
    // Its lower edge gives a reliable bounded fallback if the scrollport
    // has a changing class or is the same native flex wrapper.
    for(let p=dot.parentElement,depth=0;p&&p!==root&&depth<10;p=p.parentElement,depth++) {
      if(p.querySelector(topBandContent)||p.querySelector('#'+CLOCK_HOST))break;
      const r=visibleBox(p);if(!r)continue;
      if(r.width>=rr.width*.50&&r.top>=dr.top-30&&r.bottom<=dr.bottom+30&&
         r.height<=64&&!p.contains(newChat))rowBottom=Math.max(rowBottom,r.bottom);
      if(p.contains(newChat)&&r.width>=rr.width*.70&&r.top<=nr.top+2&&
         topBandHeight(rr,nr,dr,r.bottom)!==null)wrapperEdges.push(r.bottom);
    }
    let edge;
    if(scrollEdges.length)edge=Math.min(...scrollEdges);
    else if(wrapperEdges.length)edge=Math.max(...wrapperEdges);
    else edge=Math.min(rowBottom+6,dr.bottom+35);
    const height=topBandHeight(rr,nr,dr,edge);
    if(height===null)return null;
    const clock=root.querySelector('#'+CLOCK_HOST);
    if(clock&&visibleBox(clock)&&clock.getBoundingClientRect().top<rr.top+height)return null;
    return {rr,height};
  }
  function topBandCoordinates(rr,height,lr,lw,lh) {
    if(!rr||!lr||lr.width<=0||lr.height<=0||lw<=0||lh<=0||!Number.isFinite(height))return null;
    const sx=lw/lr.width,sy=lh/lr.height;
    return {left:(rr.left-lr.left)*sx,top:(rr.top-lr.top)*sy,width:rr.width*sx,height:height*sy};
  }
  function createTopBand(root,n,dot,height) {
    const layer=document.createElement('div'),strip=document.createElement('div');
    layer.setAttribute('data-ebook-top-hatch-layer','true');
    layer.setAttribute('aria-hidden','true');
    strip.setAttribute('data-ebook-top-hatch-strip','true');
    layer.appendChild(strip);
    root.appendChild(layer);
    return {root,n,dot,height,layer,strip,prior:root.getAttribute('data-ebook-sidebar-top'),
      previous:snapshotStyle(root,['--eb-sidebar-top-height'])};
  }
  function removeTopBand(root,record) {
    record.layer.remove();
    restoreStyle(root,record.previous);
    if(root.isConnected) {
      if(record.prior===null)root.removeAttribute('data-ebook-sidebar-top');
      else root.setAttribute('data-ebook-sidebar-top',record.prior);
    }
    topBands.delete(root);
  }
  function positionFixedSidebarTop() {
    for(const [root,record] of topBands) {
      const {n,dot,height,layer,strip}=record;
      if(!root.isConnected||!n.isConnected||!dot.isConnected) {
        makeImportant(strip,'visibility','hidden');continue;
      }
      const rr=visibleBox(root),nr=visibleBox(n),dr=visibleBox(dot);
      const valid=rr&&nr&&dr&&topBandHeight(rr,nr,dr,rr.top+height)!==null;
      const p=valid&&topBandCoordinates(rr,height,layer.getBoundingClientRect(),layer.offsetWidth,layer.offsetHeight);
      if(!p){makeImportant(strip,'visibility','hidden');continue;}
      for(const [k,v] of Object.entries(p))makeImportant(strip,k,Math.round(v*10)/10+'px');
      makeImportant(strip,'visibility','visible');
    }
  }
  function markFixedSidebarTop() {
    const news=[...document.querySelectorAll('[data-ebook-quick-label="new-chat"]')];
    const dots=[...document.querySelectorAll('[data-ebook-quick-label="dot"]')];
    const wanted=new Map();
    for(const dot of dots) {
      const dr=visibleBox(dot);if(!dr)continue;
      for(const n of news) {
        const nr=visibleBox(n);
        if(!nr||Math.abs(nr.left-dr.left)>100||dr.top<nr.top-2||dr.top-nr.top>240)continue;
        const root=topBandRail(n,dot);
        if(!root||wanted.has(root))continue;
        const band=findTopBand(root,n,dot);
        if(band){wanted.set(root,{n,dot,height:band.height});break;}
      }
    }
    for(const [root,record] of topBands)if(!wanted.has(root)||!root.isConnected)removeTopBand(root,record);
    for(const [root,value] of wanted) {
      let record=topBands.get(root);
      if(!record){record=createTopBand(root,value.n,value.dot,value.height);topBands.set(root,record);}
      Object.assign(record,value);
      if(record.layer.parentElement!==root)root.appendChild(record.layer);
      if(root.getAttribute('data-ebook-sidebar-top')!=='overlay')root.setAttribute('data-ebook-sidebar-top','overlay');
      makeImportant(root,'--eb-sidebar-top-height',value.height+'px');
    }
    positionFixedSidebarTop();
  }
  function restoreFixedSidebarTop() {
    for(const [root,record] of topBands)removeTopBand(root,record);
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
  let cachedModePair=null;
  function pairedModeControls() {
    if(cachedModePair) {
      const {host,a,b}=cachedModePair;
      const hr=visibleBox(host),ar=visibleBox(a),br=visibleBox(b);
      if(hr&&ar&&br&&host.contains(a)&&host.contains(b)&&hr.width<=560&&hr.height<=92&&
         ar.top>=-3&&ar.top<=180&&br.top>=-3&&br.top<=180&&
         normalizeLabel(a.textContent).toLowerCase()==='chat'&&normalizeLabel(b.textContent).toLowerCase()==='work'&&
         !a.closest(modeExclude)&&!b.closest(modeExclude))return cachedModePair;
      cachedModePair=null;
    }
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
    return cachedModePair=best;
  }
  let modeObserved=null;
  const modeObserver=new MutationObserver(()=>schedule(PASS.HEADER));
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
    if(event.target?.closest?.('[data-ebook-work-switcher="true"]'))schedule(PASS.HEADER);
  }
  function restoreNotebookMarks() {
    modeObserver.disconnect();
    modeObserved=null;
    document.removeEventListener('click',onModeInteraction,true);
    for(const attr of ['data-ebook-project-marker','data-ebook-sidebar-seam','data-ebook-work-switcher','data-ebook-switch-tab'])
      syncPresentationMarks(attr,new Map());
  }


  /* Project counters: local native DOM only, no API calls, pagination clicks,
     storage, conversation content reads, or data changes. Exact totals from
     explicit native metadata, otherwise a complete loaded group, or N+/?. */
  const countHosts=new Map();
  const dotInsets=new WeakMap();
  const totalAttrs=['data-conversation-count','data-thread-count','data-chat-count',
    'data-total-conversations','data-total-threads','data-total-chats'];
  const countLinkSelector='a[href*="/c/"],[data-sidebar-archive-chatgpt-id]';
  function nativeProjectScope(row) {
    const local=row.closest('[data-sidebar-project-kind="local"]');
    if(!local)return null;
    const exclusive=el=>{
      const headers=[...el.querySelectorAll(PROJECT_ROW)];
      if(el.matches(PROJECT_ROW))headers.unshift(el);
      return headers.length===1&&headers[0]===row;
    };
    if(!exclusive(local))return null;
    if(local.querySelector(countLinkSelector))return local;
    // Support the native layout where the title is a short button and the
    // conversation list is its sibling inside a repeated project group.
    for(let p=local.parentElement,depth=0;p&&depth<4;p=p.parentElement,depth++) {
      if(p.matches(SIDE_ROOTS+',aside,nav,main,[role="navigation"],[role="complementary"],body,html')||
         !exclusive(p)||p.querySelectorAll('[data-sidebar-project-kind="local"]').length!==1)break;
      const list=[...p.querySelectorAll('[role="list"],[role="group"],[data-sidebar-cycle-list],[data-testid*="project-conversation" i]')]
        .find(n=>!n.contains(row)&&n.querySelector(countLinkSelector));
      if(list)return p;
      const peers=[...(p.parentElement?.children||[])].some(n=>n!==p&&n.querySelector(PROJECT_ROW));
      const sibling=[...p.children].find(n=>!n.contains(row)&&!n.querySelector(PROJECT_ROW)&&n.querySelector(countLinkSelector));
      if(peers&&sibling)return p;
    }
    return local;
  }
  function explicitProjectTotal(row,group,loaded) {
    for(const el of [row,group])for(const attr of totalAttrs) {
      const v=el.getAttribute(attr);
      if(v!==null&&/^\d{1,7}$/u.test(v)&&Number(v)>=loaded)return Number(v);
    }
    return null;
  }
  function conversationKey(el) {
    const href=el.getAttribute('href')||'';
    const match=href.match(/\/c\/([^/?#]+)/u);
    return match?.[1]||el.getAttribute('data-sidebar-archive-chatgpt-id')||null;
  }
  // v0.2.26: cap the displayed glyph at 9, not the underlying count.
  // Overflow requires positive evidence of at least ten conversations;
  // an unresolved nine-item lower bound alone must not change the fill.
  function formatProjectCount(count,kind) {
    const known=Number.isSafeInteger(count)&&count>=0;
    return {label:known?String(Math.min(9,count)):'?',
      kind:known?kind:'unknown',count:known?count:null,overflow:known&&count>9};
  }
  function countProjectState(loaded,total,expanded,more,busy,empty,scopeKnown) {
    if(total!==null)return formatProjectCount(total,'exact');
    if(!scopeKnown)return formatProjectCount(null,'unknown');
    if(busy||expanded===false||more||(!loaded&&!empty&&expanded!==true))
      return loaded?formatProjectCount(loaded,'partial'):formatProjectCount(null,'unknown');
    if(loaded||empty||expanded===true)return formatProjectCount(loaded,'exact');
    return formatProjectCount(null,'unknown');
  }
  function readProjectCount(row) {
    const group=nativeProjectScope(row);
    if(!group)return formatProjectCount(null,'unknown');
    const ids=new Set();
    for(const el of group.querySelectorAll(countLinkSelector)) {
      if(el.closest('[data-ebook-project-count]'))continue;
      const nearest=el.closest('[data-sidebar-project-kind="local"]');
      if(nearest&&nearest!==row.closest('[data-sidebar-project-kind="local"]'))continue;
      const key=conversationKey(el);
      if(key)ids.add(key);
    }
    const expandedValue=row.getAttribute('aria-expanded')||
      row.querySelector('[aria-expanded]')?.getAttribute('aria-expanded')||
      group.getAttribute('aria-expanded');
    const expanded=expandedValue==='true'?true:expandedValue==='false'?false:null;
    const controls=[...group.querySelectorAll('button,a,[role="button"]')];
    const more=controls.some(el=>{
      const label=normalizeLabel(el.textContent);
      const aria=normalizeLabel(el.getAttribute('aria-label'));
      return /^(?:더\s*보기|더\s*많이\s*보기|모두\s*보기|Show more|Load more|View all|See all)(?:\s*\(\d+\))?$/iu.test(label)||
        /^(?:더\s*보기|더\s*많이\s*보기|모두\s*보기|Show more|Load more|View all|See all)(?:\s*\(\d+\))?$/iu.test(aria);
    })||group.getAttribute('data-has-more')==='true'||!!group.querySelector('[data-has-more="true"]');
    const busy=group.getAttribute('aria-busy')==='true'||!!group.querySelector('[aria-busy="true"],[role="progressbar"]');
    const empty=!!group.querySelector('[data-testid="project-empty-state"],[data-testid="empty-conversations"]');
    return countProjectState(ids.size,explicitProjectTotal(row,group,ids.size),expanded,more,busy,empty,true);
  }
  // v0.2.30: keep badges in a separate, noninteractive layer. The native
  // project button may be narrower than the Dot axis or clip its children.
  const countLayers=new Map(),countLooks=new WeakMap();
  let countPositionFrame=0;
  function validCountRail(el) {
    const r=visibleBox(el);
    return !!r&&r.width>=110&&r.width<=720&&r.height>=90&&r.left>=-4&&r.left<=180&&
      !el.matches('html,body,main,[role="main"],[role="dialog"],[role="menu"]');
  }
  function findDotCountReference() {
    const dots=[...document.querySelectorAll('[data-ebook-quick-label="dot"]')];
    for(const dot of dots) {
      const dr=visibleBox(dot);if(!dr)continue;
      for(let p=dot.parentElement,depth=0;p&&depth<8;p=p.parentElement,depth++) {
        if(p.querySelector(PROJECT_ROW)||p.matches('body,html,main,[role="main"]'))break;
        const pr=visibleBox(p);if(!pr||pr.height>120)break;
        const candidates=[...p.querySelectorAll('[data-ebook-dot-counter="true"],span,div,small')].filter(el=>{
          if(el.children.length||!/^\d{1,5}$/u.test(normalizeLabel(el.textContent)))return false;
          const r=visibleBox(el);
          return !!r&&r.left>dr.left+20&&Math.abs((r.top+r.bottom-dr.top-dr.bottom)/2)<=18&&r.width<=45;
        });
        if(!candidates.length)continue;
        candidates.sort((a,b)=>b.getBoundingClientRect().right-a.getBoundingClientRect().right);
        const number=candidates[0];let circle=number;
        for(let a=number;a&&a!==p;a=a.parentElement) {
          const r=a.getBoundingClientRect(),s=getComputedStyle(a);
          if(r.width>=12&&r.width<=36&&r.height>=12&&r.height<=36&&Math.abs(r.width-r.height)<=9&&
             (parseFloat(s.borderRadius)>=5||s.borderRadius.includes('%'))) {circle=a;break;}
        }
        return {circle,number,dot};
      }
    }
    return null;
  }
  function projectRail(row,ref=null) {
    const known=row.closest('[data-ebook-sidebar-seam="true"]')||row.closest(SIDE_ROOTS+',aside,[role="complementary"]');
    if(validCountRail(known)&&(!ref||known.contains(ref.dot)))return known;
    let fallback=null;
    for(let p=row.parentElement;p&&p!==document.body;p=p.parentElement) {
      if(!validCountRail(p))continue;
      if(ref&&p.contains(ref.dot))return p;
      if(p.querySelectorAll(PROJECT_ROW).length>1)fallback=p;
    }
    return validCountRail(known)?known:fallback;
  }
  function counterAppearance(ref) {
    const fallback={'--eb-count-diameter':'19px','--eb-count-bg':'#C9CDCF',
      '--eb-count-ink':'#292D30',
      '--eb-count-font':'var(--eb-mono)','--eb-count-font-size':'11px','--eb-count-weight':'500'};
    if(!ref)return fallback;
    const box=getComputedStyle(ref.circle),num=getComputedStyle(ref.number),r=ref.circle.getBoundingClientRect();
    if(r.width<12||r.width>36||r.height<12||r.height>36)return fallback;
    return {'--eb-count-diameter':Math.round(r.height*10)/10+'px',
      '--eb-count-bg':box.backgroundColor,
      '--eb-count-ink':num.color,'--eb-count-font':num.fontFamily,
      '--eb-count-font-size':num.fontSize,'--eb-count-weight':num.fontWeight};
  }
  function countLayer(rail) {
    let layer=countLayers.get(rail);
    if(!layer) {
      layer=document.createElement('div');layer.setAttribute('data-ebook-project-count-layer','true');
      layer.setAttribute('aria-hidden','true');countLayers.set(rail,layer);
    }
    if(layer.parentElement!==rail)rail.appendChild(layer);
    if(!rail.hasAttribute('data-ebook-count-rail'))rail.setAttribute('data-ebook-count-rail','true');
    return layer;
  }
  function restoreProjectCount(row,record) {
    record.badge.remove();countHosts.delete(row);
  }
  function pruneCountLayers() {
    const used=new Set([...countHosts.values()].map(x=>x.rail));
    for(const [rail,layer] of countLayers)if(!rail.isConnected||!used.has(rail)) {
      layer.remove();countLayers.delete(rail);
      if(rail.isConnected)rail.removeAttribute('data-ebook-count-rail');
    }
  }
  // Read the shared clipping geometry once per position pass, then write
  // every badge together. No read-after-write layout loop on scrolling.
  let cachedCountReference=null;
  function currentCountReference() {
    if(cachedCountReference?.circle?.isConnected&&cachedCountReference?.dot?.isConnected&&cachedCountReference?.number?.isConnected)return cachedCountReference;
    return cachedCountReference=findDotCountReference();
  }
  function countViewport(row,rail,rr,baseTop,clips) {
    let top=baseTop,bottom=rr.bottom;
    for(let p=row.parentElement;p&&p!==rail;p=p.parentElement) {
      if(!clips.has(p)) {
        const overflow=getComputedStyle(p).overflowY;
        clips.set(p,/^(auto|scroll|overlay|hidden|clip)$/u.test(overflow)?{overflow,r:p.getBoundingClientRect()}:null);
      }
      const clip=clips.get(p);
      if(!clip)continue;
      const {overflow,r}=clip;
      if(/^(hidden|clip)$/u.test(overflow)&&(r.height<60||r.width<rr.width*.6))continue;
      top=Math.max(top,r.top);bottom=Math.min(bottom,r.bottom);
    }
    return {top,bottom};
  }
  function countCoordinates(center,y,diameter,rr,viewport,lr,layerWidth,layerHeight) {
    const rad=diameter/2;
    if(!Number.isFinite(center)||!Number.isFinite(y)||center-rad<rr.left||center+rad>rr.right||
       y-rad<viewport.top||y+rad>viewport.bottom||lr.width<=0||lr.height<=0)return null;
    return {x:(center-lr.left)*layerWidth/lr.width,y:(y-lr.top)*layerHeight/lr.height};
  }
  function setCountHidden(badge,hidden) {
    const value=hidden?'true':'false';
    if(badge.getAttribute('data-ebook-count-hidden')!==value)badge.setAttribute('data-ebook-count-hidden',value);
  }
  function positionProjectCounts(ref=currentCountReference(),refreshAppearance=false) {
    const boxes=new Map(),clips=new Map(),plans=[];
    const dotRect=ref?.circle?.getBoundingClientRect(),labelRect=ref?.dot?.getBoundingClientRect();
    for(const [row,item] of countHosts) {
      const {badge,rail,layer,title}=item;
      if(!row.isConnected||!rail.isConnected||!title.isConnected){plans.push({badge,hidden:true});continue;}
      let g=boxes.get(rail);
      if(!g) {
        const rr=rail.getBoundingClientRect(),lr=layer.getBoundingClientRect();
        let appearance=countLooks.get(rail)||counterAppearance(null),center=rr.right-(dotInsets.get(rail)??22),baseTop=rr.top;
        if(dotRect&&dotRect.left>=rr.left&&dotRect.right<=rr.right) {
          center=dotRect.left+dotRect.width/2;dotInsets.set(rail,rr.right-center);
          if(refreshAppearance||!countLooks.has(rail)) {
            appearance=counterAppearance(ref);countLooks.set(rail,appearance);
          }
        }
        const band=parseFloat(rail.style.getPropertyValue('--eb-sidebar-top-height'));
        if(Number.isFinite(band))baseTop=Math.max(baseTop,rr.top+band);
        if(labelRect&&ref&&rail.contains(ref.dot))baseTop=Math.max(baseTop,labelRect.bottom+3);
        g={rr,lr,center,baseTop,appearance,layer,diameter:parseFloat(appearance['--eb-count-diameter']),lw:layer.offsetWidth,lh:layer.offsetHeight};boxes.set(rail,g);
      }
      const r=visibleBox(row),tr=visibleBox(title);
      if(!tr){plans.push({badge,hidden:true});continue;}
      const y=r&&r.height>=12&&r.height<=70?(r.top+r.bottom)/2:(tr.top+tr.bottom)/2;
      const viewport=countViewport(row,rail,g.rr,g.baseTop,clips);
      const p=countCoordinates(g.center,y,g.diameter,g.rr,viewport,g.lr,g.lw,g.lh);
      if(!p){plans.push({badge,hidden:true});continue;}
      plans.push({badge,p,hidden:row.matches(':hover,:focus-within')});
    }
    // Shared Dot appearance is inherited from one layer, not written to each badge.
    for(const {layer,appearance} of boxes.values())for(const [k,v] of Object.entries(appearance))makeImportant(layer,k,v);
    for(const {badge,p,hidden} of plans) {
      if(p) {
        makeImportant(badge,'--eb-count-x',Math.round(p.x*10)/10+'px');
        makeImportant(badge,'--eb-count-y',Math.round(p.y*10)/10+'px');
      }
      setCountHidden(badge,hidden);
    }
  }
  function queueProjectCountPosition(event) {
    if(disposed||document.hidden||(!countHosts.size&&!topBands.size))return;
    const target=event?.target;
    if(event&&event.type==='scroll'&&target!==document&&target!==document.documentElement&&
       ![...countLayers.keys(),...topBands.keys()].some(r=>r.contains(target)))return;
    if(event&&event.type!=='scroll'&&event.type!=='resize') {
      const from=target?.closest?.(PROJECT_ROW)||null,to=event.relatedTarget?.closest?.(PROJECT_ROW)||null;
      // Moving between nested spans/icons inside the same project row
      // does not change its badge hover/focus state.
      if(from===to)return;
    }
    if(!countPositionFrame)countPositionFrame=requestAnimationFrame(()=>{countPositionFrame=0;refreshPositionNow();});
  }
  function markProjectCounts() {
    const ref=findDotCountReference(),live=new Set();
    for(const row of projectRows()) {
      const title=row.querySelector('[data-marquee-content="true"]');
      const rail=projectRail(row,ref);
      if(!title||!visibleBox(title)||!rail)continue;
      const state=readProjectCount(row),layer=countLayer(rail);
      live.add(row);
      let item=countHosts.get(row);
      if(item&&item.rail!==rail){restoreProjectCount(row,item);item=null;}
      if(!item) {
        const badge=document.createElement('span');badge.setAttribute('data-ebook-project-count','');
        badge.setAttribute('aria-hidden','true');badge.setAttribute('data-ebook-count-hidden','true');
        item={badge,rail,layer,title};countHosts.set(row,item);
      }
      item.title=title;item.layer=layer;
      const {badge}=item;
      if(badge.parentElement!==layer)layer.appendChild(badge);
      if(badge.textContent!==state.label)badge.textContent=state.label;
      for(const [k,v] of Object.entries({'data-ebook-count-state':state.kind,
        'data-ebook-count-overflow':state.overflow?'true':'false',
        'data-ebook-count-confirmed':state.count===null?'':String(state.count)}))
        if(badge.getAttribute(k)!==v)badge.setAttribute(k,v);
    }
    for(const [row,record] of countHosts)if(!live.has(row)||!row.isConnected)restoreProjectCount(row,record);
    pruneCountLayers();cachedCountReference=ref;positionProjectCounts(ref,true);syncPositionResizeTargets(ref);
  }
  function restoreProjectCounts() {
    if(countPositionFrame)cancelAnimationFrame(countPositionFrame);countPositionFrame=0;
    for(const type of ['scroll','pointerover','pointerout','focusin','focusout'])
      document.removeEventListener(type,queueProjectCountPosition,true);
    for(const [row,record] of countHosts)restoreProjectCount(row,record);
    pruneCountLayers();cachedCountReference=null;
  }


  /* Fixed visual sidebar ordering. React DOM order, native data, names,
     hrefs, counters and event handlers are not changed. Only vertical
     flex/grid siblings with independently verified row boundaries are
     eligible; unfamiliar layouts deliberately retain their native order. */
  const SIDEBAR_SORT_PROJECTS=Object.freeze([
    '대표실','전략기획본부','개인비서실','영업팀','BD팀','제안팀','디자인팀',
    '경영관리실','기술운영팀','인재개발팀','CEO 경영철학과 판단'
  ]);
  const sidebarProjectRank=new Map(SIDEBAR_SORT_PROJECTS.map((name,i)=>[name,i]));
  const sidebarRoleRank=Object.freeze({master:0,plan:1,manage:2,produce:3,action:4});
  const sidebarStatusRank=Object.freeze({'보류':1,'완료':2,'중단':3});
  const sidebarTitleCollator=new Intl.Collator('ko-KR',{numeric:true,sensitivity:'base'});
  const sidebarSortSaved=new Map();
  const sidebarSortDiagnostics={projectLists:0,projectRows:0,chatLists:0,chatRows:0,changedLists:0,skippedLayouts:0,error:null};
  const SORT_CHAT_LINK='a[href*="/c/"]';
  const SORT_RAIL=SIDE_ROOTS+',aside,[role="complementary"],[data-ebook-count-rail="true"],[data-ebook-sidebar-seam="true"]';
  const SORT_EXCLUDED='[aria-hidden="true"],[hidden],.sr-only,svg,button,[role="button"],[role="toolbar"],.jaroo-native-badge,[data-jaroo-status-slot]';

  function sidebarCompareTitle(a,b) {
    return sidebarTitleCollator.compare(a,b)||(a<b?-1:a>b?1:0);
  }
  function sidebarProjectKey(label) {
    const name=normalizeLabel(label);
    return {rank:sidebarProjectRank.get(name)??SIDEBAR_SORT_PROJECTS.length,name};
  }
  function sidebarChatKey(label,id) {
    const raw=normalizeLabel(label);
    const tag=/^\[(완료|중단|보류)\]/u.exec(raw)?.[1];
    const role=roleIn(raw)?.role;
    const name=normalizeLabel(raw.replace(ROLE_MARKER,'').replace(/^\[(완료|중단|보류)\]\s*/u,''));
    return {state:sidebarStatusRank[tag]??0,role:sidebarRoleRank[role]??5,name,id:id||''};
  }
  const sidebarCompareProject=(a,b)=>a.rank-b.rank||sidebarCompareTitle(a.name,b.name);
  const sidebarCompareChat=(a,b)=>a.state-b.state||a.role-b.role||
    sidebarCompareTitle(a.name,b.name)||sidebarCompareTitle(a.id,b.id);

  function sidebarProjectLabel(row) {
    const title=row.querySelector('[data-marquee-content="true"]')||
      row.querySelector('[data-marquee-text="true"]');
    return normalizeLabel(title?.textContent||row.getAttribute('aria-label')||'');
  }
  function sidebarChatLabel(anchor) {
    const title=anchor.querySelector('[data-thread-title="true"]')||
      anchor.querySelector('[data-thread-title]')||
      [...anchor.querySelectorAll('[data-ebook-role],[data-marquee-content="true"],[data-marquee-text],span[dir="auto"],span.truncate,div.truncate')]
        .find(n=>!n.closest(SORT_EXCLUDED));
    return normalizeLabel(title?.textContent||anchor.getAttribute('aria-label')||anchor.textContent);
  }

  // Gather common parents by walking upward from an entire native group,
  // never by moving a header away from its associated expanded chat list.
  function sidebarSortCandidates(entries,boundary,maxDepth=12) {
    const parents=new Map();
    for(const entry of entries) {
      for(let child=entry.node,depth=0;child&&child!==boundary&&depth<maxDepth;depth++,child=child.parentElement) {
        const parent=child.parentElement;
        if(!parent||parent.matches('html,body,main,[role="main"],header,[role="banner"]'))break;
        if(boundary&&!boundary.contains(parent))break;
        let byChild=parents.get(parent);
        if(!byChild)parents.set(parent,byChild=new Map());
        let members=byChild.get(child);
        if(!members)byChild.set(child,members=[]);
        members.push(entry);
        if(parent===boundary)break;
      }
    }
    return parents;
  }
  function sidebarHas(el,selector) {
    return el.matches(selector)||!!el.querySelector(selector);
  }
  function sidebarSingleTrack(parent,style) {
    if((style.display==='flex'||style.display==='inline-flex')&&
       style.flexDirection==='column'&&style.flexWrap==='nowrap')return true;
    if(style.display!=='grid'&&style.display!=='inline-grid')return false;
    const tracks=style.gridTemplateColumns.trim();
    return style.gridAutoFlow==='row'&&(tracks==='none'||/^\d+(?:\.\d+)?px$/u.test(tracks));
  }
  function sidebarInlineOrder(el) {
    return {value:el.style.getPropertyValue('order'),priority:el.style.getPropertyPriority('order')};
  }
  function sidebarSortBaseOrder(el,style) {
    const old=sidebarSortSaved.get(el),current=sidebarInlineOrder(el);
    if(old&&current.value===old.applied&&current.priority==='important')return old.base;
    // Do not restore stale values over a new native inline declaration.
    if(old)sidebarSortSaved.delete(el);
    return Number.parseInt(style.order,10)||0;
  }
  function sidebarRestoreOrder(el,old) {
    const current=sidebarInlineOrder(el);
    if(current.value!==old.applied||current.priority!=='important')return;
    if(old.value)el.style.setProperty('order',old.value,old.priority);
    else el.style.removeProperty('order');
  }
  function sidebarApplyOrder(wanted) {
    for(const [el,old] of sidebarSortSaved)if(!wanted.has(el)||!el.isConnected) {
      sidebarRestoreOrder(el,old);sidebarSortSaved.delete(el);
    }
    for(const [el,desired] of wanted) {
      if(!el.isConnected)continue;
      const current=sidebarInlineOrder(el);
      let saved=sidebarSortSaved.get(el);
      if(saved&&(current.value!==saved.applied||current.priority!=='important')) {
        sidebarSortSaved.delete(el);saved=null;
      }
      if(!saved) {
        if(current.value===String(desired.order)&&current.priority==='important')continue;
        saved={...current,base:desired.base,applied:null};
        sidebarSortSaved.set(el,saved);
      }
      const next=String(desired.order);
      if(current.value!==next||current.priority!=='important')el.style.setProperty('order',next,'important');
      saved.applied=next;
    }
  }

  // Preserve all non-target sibling positions (section titles, More buttons,
  // menus, etc.). Only swap target rows into their original visual slots.
  // Do not force display:flex on an unknown or virtualized list.
  function sidebarPlanSiblingOrder(parent,byChild,compare,kind,wanted) {
    const diag=sidebarSortDiagnostics;
    if(byChild.size<2||[...byChild.values()].some(members=>members.length!==1))return;
    const entries=[...byChild.values()].flat();
    const children=[...parent.children];
    if(kind==='project') {
      if(parent.querySelectorAll(PROJECT_ROW).length!==entries.length)return;
      // A separate conversation list sibling indicates an unverified
      // header/list relationship: moving just the headers would be unsafe.
      if(children.some(el=>!byChild.has(el)&&sidebarHas(el,countLinkSelector)))return;
      if(entries.some(e=>!e.node.contains(e.row)))return;
    } else {
      if(children.some(el=>byChild.has(el)&&sidebarHas(el,PROJECT_ROW)))return;
      // Do not sort only part of a sibling list if another conversation
      // wrapper could not be identified.
      if(children.some(el=>!byChild.has(el)&&sidebarHas(el,SORT_CHAT_LINK)))return;
    }
    const style=getComputedStyle(parent);
    if(!sidebarSingleTrack(parent,style)||
       [...parent.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())) {
      diag.skippedLayouts++;return;
    }
    for(const pseudo of ['::before','::after']) {
      const p=getComputedStyle(parent,pseudo);
      if(p.content&&p.content!=='none'&&p.content!=='normal'&&p.display!=='none'&&
         p.position!=='absolute'&&p.position!=='fixed') {
        diag.skippedLayouts++;return;
      }
    }
    const flow=[];
    for(let i=0;i<children.length;i++) {
      const el=children[i],s=getComputedStyle(el),target=byChild.get(el)?.[0];
      if(s.display==='none'||s.position==='absolute'||s.position==='fixed') {
        if(target){diag.skippedLayouts++;return;}
        continue;
      }
      if(s.display==='contents'||(target&&s.transform!=='none')||
        ((style.display==='grid'||style.display==='inline-grid')&&
          [s.gridRowStart,s.gridRowEnd,s.gridColumnStart,s.gridColumnEnd].some(v=>v&&v!=='auto'))) {
        diag.skippedLayouts++;return;
      }
      flow.push({el,index:i,base:sidebarSortBaseOrder(el,s),target});
    }
    const native=flow.sort((a,b)=>a.base-b.base||a.index-b.index);
    const targets=native.filter(x=>x.target);
    if(targets.length!==entries.length||targets.length<2)return;
    // Do not overlap another already-planned sibling set.
    if(native.some(x=>wanted.has(x.el)))return;
    diag[kind==='project'?'projectLists':'chatLists']++;
    diag[kind==='project'?'projectRows':'chatRows']+=targets.length;
    const ranked=[...targets].sort((a,b)=>compare(a.target.key,b.target.key)||a.index-b.index);
    if(ranked.every((x,i)=>x===targets[i]))return;
    let next=0;
    const arranged=native.map(x=>x.target?ranked[next++]:x);
    for(let i=0;i<arranged.length;i++) {
      const item=arranged[i];
      wanted.set(item.el,{order:i,base:item.base});
    }
    diag.changedLists++;
  }

  function sortSidebarOrder() {
    const diag=sidebarSortDiagnostics;
    Object.assign(diag,{projectLists:0,projectRows:0,chatLists:0,chatRows:0,changedLists:0,skippedLayouts:0,error:null});
    const wanted=new Map();
    try {
      const projectRows=[...document.querySelectorAll(PROJECT_ROW)]
        .filter(row=>row.closest(SORT_RAIL)||observedRoots.some(root=>root.contains(row)));
      const groups=[];
      for(const row of projectRows) {
        const group=nativeProjectScope(row);
        if(!group||!group.contains(row))continue;
        const name=sidebarProjectLabel(row);
        if(!name)continue;
        groups.push({row,node:group,key:sidebarProjectKey(name)});
      }
      // Scope project lists to a common verified sidebar/section. Starting
      // from the full native project scope prevents header-only movement.
      const byRail=new Map();
      for(const entry of groups) {
        const rail=entry.node.closest(SORT_RAIL)||
          observedRoots.find(root=>root.contains(entry.node));
        if(!rail)continue;
        if(!byRail.has(rail))byRail.set(rail,[]);
        byRail.get(rail).push(entry);
      }
      for(const [rail,entries] of byRail) {
        for(const [parent,byChild] of sidebarSortCandidates(entries,rail)) {
          sidebarPlanSiblingOrder(parent,byChild,sidebarCompareProject,'project',wanted);
        }
      }
      // Project child chats only; pinned and global Recent sections never
      // enter the project-scoped traversal. Do not fetch unloaded rows.
      for(const {node:group,row} of groups) {
        const entries=[],seen=new Set();
        let valid=true;
        for(const anchor of group.querySelectorAll(SORT_CHAT_LINK)) {
          if(row.contains(anchor)||anchor.closest('[aria-hidden="true"],[hidden],.sr-only,[data-pinned="true"],[data-sidebar-pinned="true"],[data-is-pinned="true"]'))continue;
          const id=conversationKey(anchor),name=sidebarChatLabel(anchor);
          if(!id||!name||seen.has(id)){valid=false;break;}
          seen.add(id);entries.push({node:anchor,key:sidebarChatKey(name,id)});
        }
        if(!valid||entries.length<2)continue;
        // All identified native chat rows remain inside this project.
        for(const [parent,byChild] of sidebarSortCandidates(entries,group)) {
          sidebarPlanSiblingOrder(parent,byChild,sidebarCompareChat,'chat',wanted);
        }
      }
      sidebarApplyOrder(wanted);
    } catch(error) {
      diag.error=String(error?.message||error);
      // A failed structure check must never block the existing NAV pass.
      sidebarApplyOrder(new Map());
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

  const NATIVE_NAV_SECTIONS='[data-app-action-sidebar-section-heading]';
  function sidebarObserverRoots() {
    const all=[...new Set([...sidebarRoots(),...document.querySelectorAll(
      '[data-ebook-count-rail="true"],[data-ebook-sidebar-top="overlay"],'+NATIVE_NAV_SECTIONS
    )])];
    return all.filter(node=>node.isConnected&&!all.some(parent=>parent!==node&&parent.contains(node)));
  }
  function attachObservers() {
    const roots = sidebarObserverRoots();
    if (roots.length === observedRoots.length && roots.every((x,i) => x === observedRoots[i] && x.isConnected)) return;
    observer.disconnect();
    observedRoots = roots;
    for (const root of roots) observer.observe(root,{subtree:true,childList:true,characterData:true,
      attributes:true,attributeFilter:['aria-expanded','aria-busy','data-has-more','data-conversation-count','data-chat-count','data-thread-count','data-total-conversations','data-total-threads','data-total-chats']});
    // Actual geometry targets are reconciled after the project overlays are mounted.
  }


  /* Find effort/model display inside the composer without modifying its state. */

  let composerObserved=null,composerEditor=null;
  // Keep the decoration attached to the *actual* sidebar geometry, not
  // just the legacy sidebar IDs. ResizeObserver runs after layout and before
  // paint. Read/write the existing overlays only; never rescan chat lists
  // during a divider drag. Reconcile structure after the resize settles.
  const navResizeTargets=new Set();
  let resizeReconcileTimer=0;
  function refreshPositionNow() {
    if(disposed||document.hidden||(!countHosts.size&&!topBands.size))return;
    if(countPositionFrame){cancelAnimationFrame(countPositionFrame);countPositionFrame=0;}
    timed('position',()=>{
      positionProjectCounts();
      positionFixedSidebarTop();
    });
  }
  function scheduleResizeReconcile() {
    if(disposed)return;
    clearTimeout(resizeReconcileTimer);
    resizeReconcileTimer=setTimeout(()=>{
      resizeReconcileTimer=0;
      schedule(PASS.NAV|PASS.COMPOSER|PASS.HEADER|PASS.DIVIDER);
    },160);
  }
  function onSidebarGeometryResize() {
    if(disposed||document.hidden)return;
    refreshPositionNow();
    scheduleResizeReconcile();
  }
  const navResizeObserver=typeof ResizeObserver==='function'?
    new ResizeObserver(onSidebarGeometryResize):null;
  function syncPositionResizeTargets(ref=cachedCountReference) {
    if(!navResizeObserver)return;
    const next=new Set([...observedRoots,...countLayers.keys(),...countLayers.values(),...topBands.keys()]);
    // Watch the native Dot row/flex ancestors as well: the badge can move
    // inside a wrapper whose outer sidebar dimensions remain unchanged.
    for(let el=ref?.circle,depth=0;el&&depth<8&&el!==document.body&&el!==document.documentElement;el=el.parentElement,depth++) {
      next.add(el);
      if(countLayers.has(el)||topBands.has(el)||observedRoots.includes(el))break;
    }
    for(const el of navResizeTargets)if(!next.has(el)||!el.isConnected){
      navResizeObserver.unobserve(el);navResizeTargets.delete(el);
    }
    for(const el of next)if(el?.isConnected&&!navResizeTargets.has(el)){
      navResizeObserver.observe(el,{box:'border-box'});navResizeTargets.add(el);
    }
  }
  const composerResizeObserver=typeof ResizeObserver==='function'?
    new ResizeObserver(()=>schedule(PASS.DIVIDER|(!composerFrameOriginal.size?PASS.COMPOSER:0))):null;
  const composerObserver=new MutationObserver(records=>{
    let mask=0;
    for(const m of records) {
      if(ownMutation(m))continue;
      const target=m.target.nodeType===1?m.target:m.target.parentElement;
      if(composerEditor?.contains(target)) {
        // Typing ordinary text needs no full-page restyle. New editor
        // elements can require typography fallback, but never sent scans.
        if(m.type==='childList'&&[...m.addedNodes].some(n=>n.nodeType===1))mask|=PASS.EDITOR;
      } else mask|=PASS.COMPOSER|PASS.EDITOR|PASS.DIVIDER;
    }
    if(mask)schedule(mask);
  });
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
    if(root===composerObserved&&root?.isConnected&&item?.editor===composerEditor)return;
    composerObserver.disconnect();
    composerResizeObserver?.disconnect();
    composerObserved=root||null;
    composerEditor=item?.editor||null;
    if(root) {
      composerObserver.observe(root,{subtree:true,childList:true,attributes:true,
        attributeFilter:['aria-busy','data-state','data-testid','src','hidden','aria-hidden']});
      composerResizeObserver?.observe(root);
      if(composerEditor)composerResizeObserver?.observe(composerEditor);
      if(item?.shell&&item.shell!==root)composerResizeObserver?.observe(item.shell);
    }
  }
  function markEffortPicker() {
    // The model picker may be outside the form subtree. Search visible button
    // labels in the lower viewport, then use an exact effort suffix, never
    // modifying onclick/React model state.
    const context=activeComposer();
    const main=context?.form||context?.shell;
    const containers=[main,context?.shell].filter(Boolean);
    const suffix=/(?:^|[\s·|])(?:Extra\s+High|High|Medium|Low|Instant|Auto)$/iu;
    const buttonSelector='button,[role="button"],[aria-haspopup]';
    const buttons=new Set(containers.flatMap(root=>[...root.querySelectorAll(buttonSelector)]));
    const chosen=new Set();
    const eligible=(node)=>{
      const b=node.getBoundingClientRect();
      if(!(b.width>0&&b.height>0)||node.closest('[role="dialog"],[role="menu"],[role="listbox"]'))return false;
      if(containers.some(root=>root?.contains(node)))return true;
      return b.bottom>=window.innerHeight-300 && b.left>=window.innerWidth*.37;
    };
    function inspectButtons(nodes) { for(const btn of nodes){
      if(btn.closest('[data-message-author-role]'))continue;
      const text=[btn.textContent,btn.getAttribute('title'),btn.getAttribute('aria-label')]
        .map(s=>(s||'').replace(/\s+/g,' ').trim()).find(s=>s&&s.length<=80&&suffix.test(s));
      if(!text||!eligible(btn))continue;
      chosen.add(btn);
      for(const node of btn.querySelectorAll('span,small')){
        if(suffix.test((node.textContent||'').replace(/\s+/g,' ').trim()) && node.childElementCount===0)
          chosen.add(node);
      }
    }}
    inspectButtons(buttons);
    if(!chosen.size)inspectButtons(document.querySelectorAll(buttonSelector));
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
      document.querySelector('a[aria-current="page"][href*="/c/"]');
    const normalize=s=>(s||'').replace(/^\[(?:RUN|DONE)[^\]]*\]\s*/iu,'')
      .replace(/^[☆★▷▶○●>›]\s*/u,'').replace(/\s+/g,'').trim();
    const names=[normalize(selected?.getAttribute('aria-label')),normalize(selected?.textContent),
      normalize(document.title.replace(/\s*[-|]\s*ChatGPT\s*$/iu,''))]
      .filter(s=>s.length>=7&&s.length<=80);
    const headers=[...document.querySelectorAll('#page-header,[data-testid="conversation-header"],header,[role="banner"]')]
      .filter(h=>!h.closest(SIDE_ROOTS+', [data-message-author-role]')&&h.getBoundingClientRect().top<180);
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
    if(!candidates.length&&names.length){
      const main=document.querySelector('main,[role="main"]');
      if(main)for(const el of main.querySelectorAll('span,h1,h2,button,[role="button"]')){
        if(el.closest(SIDE_ROOTS+', [data-message-author-role]'))continue;
        const title=normalize(el.textContent);
        if(title.length<7||title.length>95||!names.some(n=>title===n||n.endsWith(title)&&title.length>=10))continue;
        const rect=el.getBoundingClientRect();
        if(rect.width<=0||rect.top<0||rect.top>=140)continue;
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
  let uploadIntentUntil=0,uploadIntentTimer=0;
  const attachmentCandidates='[data-testid*="attachment-preview" i],[data-testid*="file-preview" i],'+
    '[data-testid*="upload-preview" i],[data-testid*="attachment" i],[data-testid*="uploading" i],'+
    '[data-testid*="file-thumbnail" i],[data-testid*="file-card" i],[data-attachment-id],'+
    '[data-file-id],[data-upload-id],[aria-label*="업로드 중"],[aria-label*="uploading" i],'+
    '[role="progressbar"],img';
  function onUploadIntent(event) {
    const c=activeComposer();
    if(!c?.editor)return;
    let hasFiles=false;
    if(event.type==='change') {
      const t=event.target;
      hasFiles=t?.matches?.('input[type="file"]')&&t.files?.length>0&&
        (!t.closest('[role="dialog"],[data-message-author-role]')||c.form?.contains(t));
    } else {
      const transfer=event.clipboardData||event.dataTransfer;
      hasFiles=!!(transfer?.files?.length||[...(transfer?.items||[])].some(i=>i.kind==='file'))&&
        (!!c.form?.contains(event.target)||!!c.shell?.contains(event.target)||!!c.editor.contains(event.target));
    }
    if(!hasFiles)return;
    // Observe intent only, never read files, change upload events or initiate
    // uploads. Show early only after native space actually exists.
    uploadIntentUntil=performance.now()+12000;
    clearTimeout(uploadIntentTimer);
    uploadIntentTimer=setTimeout(()=>schedule(PASS.DIVIDER),12050);
    schedule(PASS.COMPOSER|PASS.DIVIDER);
  }
  function onComposerImageLoad(event) {
    if(event.target?.tagName==='IMG'&&composerObserved?.contains(event.target))
      schedule(PASS.DIVIDER);
  }
  /* v0.2.28 — measure the entire attachment's painted footprint, including
     the filename/footer, rather than a decoded image or spinner alone.
     Position a single line in the real clear gap before the first text line.
     Never clamp a line into a file card or rely on z-index to hide a collision. */
  const uploadResizeTargets=new Set();
  const uploadResizeObserver=typeof ResizeObserver==='function'?
    new ResizeObserver(()=>schedule(PASS.DIVIDER)):null;
  function syncUploadResizeTargets(next) {
    if(!uploadResizeObserver)return;
    for(const el of uploadResizeTargets)if(!next.has(el)||!el.isConnected) {
      uploadResizeObserver.unobserve(el);uploadResizeTargets.delete(el);
    }
    for(const el of next)if(el.isConnected&&!uploadResizeTargets.has(el)) {
      uploadResizeObserver.observe(el);uploadResizeTargets.add(el);
    }
  }
  function clearUploadDivider(resetWatch=true) {
    for(const line of document.querySelectorAll('[data-ebook-upload-divider="true"]'))line.remove();
    for(const host of document.querySelectorAll('[data-ebook-composer-root="true"]'))
      host.removeAttribute('data-ebook-composer-root');
    if(resetWatch)syncUploadResizeTargets(new Set());
  }
  const px=v=>Number.parseFloat(v)||0;
  function visibleUploadRect(el) {
    if(!el?.isConnected||el.closest('[hidden],[role="menu"],[role="dialog"],[data-message-author-role]'))return null;
    const r=el.getBoundingClientRect(),s=getComputedStyle(el);
    return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'?r:null;
  }
  function editorFirstLineTop(editor,er) {
    const s=getComputedStyle(editor);
    const contentTop=er.top+px(s.borderTopWidth)+px(s.paddingTop);
    // A contenteditable may include its internal padding/blank paragraph
    // within the editor box; use the actual first visible text run when possible.
    const walk=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);
    let node,checked=0;
    while((node=walk.nextNode())&&checked++<32) {
      if(!node.nodeValue?.trim())continue;
      const range=document.createRange();range.selectNodeContents(node);
      for(const r of range.getClientRects())if(r.width>0&&r.height>0&&r.bottom>contentTop&&r.top<er.bottom) {
        return Math.max(contentTop,Math.min(r.top,contentTop+Math.max(px(s.lineHeight),24)));
      }
    }
    const p=editor.querySelector('p,li,[data-d-text-flow]');
    const pr=p&&visibleUploadRect(p),ps=p&&getComputedStyle(p);
    const leading=Math.max(0,(px(ps?.lineHeight||s.lineHeight)-px(ps?.fontSize||s.fontSize))/2);
    return Math.max(contentTop,Math.min(er.bottom-1,Math.max(contentTop,pr?.top||contentTop)+Math.min(leading,8)));
  }
  function inUploadZone(r,sr,textTop) {
    return !!r&&r.width>=3&&r.height>=3&&r.top>=sr.top-5&&
      r.top<textTop-1&&r.right>sr.left+2&&r.left<sr.right-2&&
      r.bottom<=sr.bottom+3;
  }
  function hasVisibleBackground(s) {
    return s.backgroundImage!=='none'||!['transparent','rgba(0, 0, 0, 0)'].includes(s.backgroundColor);
  }
  function attachmentBranches(root,editor,sr,textTop) {
    const branches=new Set(),seeds=new Set();
    for(const el of root.querySelectorAll(attachmentCandidates)) {
      if(editor.contains(el)||el.contains(editor)||el.closest('[data-ebook-upload-divider="true"]'))continue;
      const r=visibleUploadRect(el);
      if(!inUploadZone(r,sr,textTop))continue;
      if(el.tagName==='IMG'&&r.width<22&&r.height<22)continue;
      seeds.add(el);
      let branch=el;
      // Stop at the attachment-side branch of the common editor/card parent.
      // This includes file names, footers and adjacent cards in the same row.
      for(let p=el.parentElement;p&&p!==root&&!p.contains(editor);p=p.parentElement) {
        const pr=visibleUploadRect(p);
        if(!inUploadZone(pr,sr,textTop))break;
        branch=p;
      }
      branches.add(branch);
    }
    return {seeds,branches:new Set([...branches].filter(el=>![...branches].some(p=>p!==el&&p.contains(el))))};
  }
  function measureAttachmentPaint(branches,seeds,sr,textTop) {
    let bottom=-Infinity;
    const watch=new Set([...seeds,...branches]);
    for(const branch of branches) {
      // Scope the scan to the upload row only. A transparent full-width
      // wrapper's padding is not painted card content; its children are.
      for(const el of [branch,...branch.querySelectorAll('div,span,p,small,button,a,img,[role="button"],[role="progressbar"],[data-attachment-id],[data-file-id],[data-testid]')]) {
        if(el.closest('[data-ebook-upload-divider="true"]'))continue;
        const r=visibleUploadRect(el);
        if(!inUploadZone(r,sr,textTop))continue;
        const s=getComputedStyle(el);
        const directText=[...el.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.nodeValue?.trim());
        const narrow=r.width<sr.width*.90;
        const control=el.matches('button,a,img,[role="button"],[role="progressbar"]');
        const painted=hasVisibleBackground(s)||px(s.borderTopWidth)>0||px(s.borderBottomWidth)>0||
          (s.boxShadow&&s.boxShadow!=='none');
        // Full-width attachment-list wrappers can include the reserved gap.
        // Explicit card surfaces, preview seeds, filename labels and buttons
        // count as occupied. Wide transparent layout wrappers do not.
        const fullRowSeed=seeds.has(el)&&!narrow&&!control&&el.children.length>0;
        if(control||directText||(narrow&&(painted||seeds.has(el)))||
           (seeds.has(el)&&!fullRowSeed)) {
          bottom=Math.max(bottom,r.bottom);
          if(watch.size<80)watch.add(el);
        }
      }
    }
    return {bottom:Number.isFinite(bottom)?bottom:null,watch};
  }
  function pendingUploadBranches(root,editor,sr,textTop) {
    const branches=new Set();
    // During the short file-selection intent window, also recognize
    // native placeholder rows that have not yet received their upload ID.
    for(let part=editor;part&&part!==root;part=part.parentElement) {
      for(let n=part.previousElementSibling;n;n=n.previousElementSibling) {
        if(n.matches('script,style,input,[data-ebook-upload-divider="true"]'))continue;
        const r=visibleUploadRect(n);
        if(inUploadZone(r,sr,textTop)&&r.height>=8)branches.add(n);
      }
    }
    return branches;
  }
  function clearGapLineY(cardBottom,textTop) {
    // Leave a real gap at both edges, even while the file footer grows.
    // If the native layout briefly has no room, wait for its next resize.
    if(!Number.isFinite(cardBottom)||!Number.isFinite(textTop)||textTop-cardBottom<7)return null;
    return cardBottom+(textTop-cardBottom)/2;
  }
  function lineOffset(y,sr,borderTop,scrollTop) {
    return Math.round((y-sr.top-borderTop+scrollTop)*10)/10;
  }
  function markUploadDivider() {
    const c=activeComposer();
    if(!c?.shell||!c.editor){clearUploadDivider();return;}
    const selected=[...composerFrameOriginal.keys()].find(el=>el.isConnected&&el.contains(c.editor));
    const roots=[...new Set([selected,c.shell,c.form].filter(el=>el?.isConnected&&el.contains(c.editor)))];
    const intent=performance.now()<uploadIntentUntil;
    if(!intent&&!roots.some(root=>root.querySelector(attachmentCandidates))){clearUploadDivider();return;}
    const er=c.editor.getBoundingClientRect();
    if(!er.width||!er.height){clearUploadDivider();return;}
    const textTop=editorFirstLineTop(c.editor,er);
    let chosen=null,pending=null;
    for(const shell of roots) {
      const sr=visibleUploadRect(shell);
      if(!sr||sr.width<40||textTop-sr.top<12)continue;
      const {seeds,branches}=attachmentBranches(shell,c.editor,sr,textTop);
      if(seeds.size) {
        const measured=measureAttachmentPaint(branches,seeds,sr,textTop);
        chosen={shell,sr,...measured};
        // Prefer the smallest real painted composer frame containing the
        // attachment strip; the form is a fallback for external previews.
        break;
      }
      if(intent&&!pending&&textTop-sr.top>=30) {
        const branches=pendingUploadBranches(shell,c.editor,sr,textTop);
        const measured=measureAttachmentPaint(branches,new Set(),sr,textTop);
        if(measured.bottom!==null)pending={shell,sr,...measured};
      }
    }
    if(chosen)uploadIntentUntil=0;
    const found=chosen||pending;
    if(!found){clearUploadDivider();return;}
    const {shell,sr,bottom,watch}=found;
    syncUploadResizeTargets(watch);
    const y=clearGapLineY(bottom,textTop);
    if(y===null||y<sr.top+8||y>=sr.bottom-2) {
      clearUploadDivider(false);return;
    }
    const prior=document.querySelector('[data-ebook-upload-divider="true"]');
    const priorHost=document.querySelector('[data-ebook-composer-root="true"]');
    if(prior&&prior.parentElement!==shell)prior.remove();
    if(priorHost&&priorHost!==shell)priorHost.removeAttribute('data-ebook-composer-root');
    let line=[...shell.children].find(el=>el.matches('[data-ebook-upload-divider="true"]'));
    if(!line) {
      line=document.createElement('div');
      line.setAttribute('data-ebook-upload-divider','true');
      line.setAttribute('aria-hidden','true');
      shell.appendChild(line);
    }
    if(!shell.hasAttribute('data-ebook-composer-root'))shell.setAttribute('data-ebook-composer-root','true');
    // CSS absolute top is measured from the padding edge, not the outer
    // border box. Correct for the existing 2.5px outline and scroll offset.
    const top=lineOffset(y,sr,px(getComputedStyle(shell).borderTopWidth),shell.scrollTop||0)+'px';
    if(line.style.top!==top)line.style.top=top;
  }

  /* Applies a reversible inline size only to genuine title text. A user's
     DevTools screenshots showed 14px at the leaf while outer selectors had
     requested 19.33px. This presentation-only fallback survives React redraws
     without altering any title content, href, click handler or app data. */
  const opticalFontOriginal=new Map();
  const projectWeightOriginal=new Map();
  // CSS owns initial nav typography. The helper's reversible inline
  // override is needed only for a genuine conflicting inline !important,
  // or for compatibility while an older Stylus version is installed.
  function needsNavInline(el,prop,target,cssReady,previous) {
    return !cssReady||previous.has(el)||(el.style.getPropertyPriority(prop)==='important'&&
      el.style.getPropertyValue(prop)!==target);
  }
  function enforceOpticalSidebarText() {
    const tokens=getComputedStyle(document.documentElement);
    const cssReady=tokens.getPropertyValue('--eb-css-owner').trim()==='1';
    if(!cssReady)return;
    const projectSize=tokens.getPropertyValue('--eb-project-optical-size').trim()||'16px';
    const chatSize=tokens.getPropertyValue('--eb-chat-corrected-size').trim()||'15.333px';
    const targets=new Map(),projectLeaves=new Set();
    const navScope=SIDE_ROOTS+','+NATIVE_NAV_SECTIONS+', [data-ebook-count-rail="true"],[data-sidebar-cycle-item],[data-sidebar-archive-chatgpt-id],aside,[role="complementary"]';
    const excluded='[data-ebook-glyph="true"],[data-ebook-project-count],[aria-hidden="true"],.sr-only,svg,.jaroo-native-badge,[data-jaroo-status-slot],[role="toolbar"]';
    function add(el,project) {
      if(!el?.isConnected||el.closest(excluded))return;
      const size=project?projectSize:chatSize;
      if(needsNavInline(el,'font-size',size,cssReady,opticalFontOriginal))targets.set(el,size);
      if(project&&needsNavInline(el,'font-weight','650',cssReady,projectWeightOriginal))projectLeaves.add(el);
    }
    if(cssReady) {
      // Only inspect nodes that actually have inline styles, not every
      // text node in every project on every sidebar mutation.
      const candidates='[data-thread-title="true"][style],[data-thread-title="true"] [style],'+
        '[data-app-action-sidebar-project-row] [data-marquee-content="true"][style],'+
        '[data-app-action-sidebar-project-row] [data-marquee-content="true"] [style],'+
        '[data-app-action-sidebar-project-row] [data-marquee-text="true"][style],'+
        '[data-app-action-sidebar-project-row] [data-marquee-text="true"] [style],'+
        'a[href*="/c/"][style],a[href*="/c/"] [style]';
      for(const el of document.querySelectorAll(candidates)) {
        if(!el.matches('a,span,div,p,[data-d-component="text"]'))continue;
        if(el.style.getPropertyPriority('font-size')!=='important'&&el.style.getPropertyPriority('font-weight')!=='important'&&
           !opticalFontOriginal.has(el)&&!projectWeightOriginal.has(el))continue;
        const project=el.closest('[data-marquee-content="true"],[data-marquee-text="true"]')?.closest(PROJECT_ROW);
        if(project){add(el,true);continue;}
        if(el.closest(navScope)&&el.closest('a[href*="/c/"],[data-thread-title="true"]')&&!el.closest('button'))add(el,false);
      }
    }
    for(const [el,original] of opticalFontOriginal)if(!el.isConnected||!targets.has(el)){
      if(el.isConnected){if(original.value)el.style.setProperty('font-size',original.value,original.priority);else el.style.removeProperty('font-size');}
      opticalFontOriginal.delete(el);
    }
    for(const [el,original] of projectWeightOriginal)if(!el.isConnected||!projectLeaves.has(el)){
      if(el.isConnected){if(original.value)el.style.setProperty('font-weight',original.value,original.priority);else el.style.removeProperty('font-weight');}
      projectWeightOriginal.delete(el);
    }
    for(const [el,targetSize] of targets) {
      if(!opticalFontOriginal.has(el))opticalFontOriginal.set(el,{
        value:el.style.getPropertyValue('font-size'),priority:el.style.getPropertyPriority('font-size')});
      makeImportant(el,'font-size',targetSize);
    }
    for(const el of projectLeaves) {
      if(!projectWeightOriginal.has(el))projectWeightOriginal.set(el,{
        value:el.style.getPropertyValue('font-weight'),priority:el.style.getPropertyPriority('font-weight')});
      makeImportant(el,'font-weight','650');
    }
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
  const importantValues=new WeakMap();
  function makeImportant(el,property,value){
    const actual=el.style.getPropertyValue(property),priority=el.style.getPropertyPriority(property);
    if(actual===value&&priority==='important')return;
    const previous=importantValues.get(el)?.get(property);
    if(priority==='important'&&previous?.requested===value&&previous.actual===actual)return;
    el.style.setProperty(property,value,'important');
    let values=importantValues.get(el);
    if(!values){values=new Map();importantValues.set(el,values);}
    values.set(property,{requested:value,actual:el.style.getPropertyValue(property)});
  }
  // Static styles are never written by default. An explicit native inline
  // important declaration is the sole reason for a reversible exception.
  function inlineException(el,property,value,saved) {
    const priority=el.style.getPropertyPriority(property);
    const actual=el.style.getPropertyValue(property);
    if(priority!=='important'){
      delete saved[property];
      return false;
    }
    if(actual===value&&!Object.prototype.hasOwnProperty.call(saved,property))return false;
    const owned=importantValues.get(el)?.get(property);
    if(!Object.prototype.hasOwnProperty.call(saved,property)||owned&&owned.actual!==actual)
      saved[property]={value:actual,priority};
    makeImportant(el,property,value);
    return true;
  }
  function applyStaticExceptions(el,required,saved) {
    for(const [p,v] of Object.entries(required))inlineException(el,p,v,saved);
    return Object.keys(saved).length>0;
  }
  function isStaticOwner() {
    return !!document.documentElement&&getComputedStyle(document.documentElement).getPropertyValue('--eb-css-owner').trim()==='1';
  }
  let framedEditor=null;
  const borderSides=['top','right','bottom','left'];
  function borderRequirements(stroke,muted,radius) {
    const out={'box-shadow':'none','-webkit-box-shadow':'none','outline-style':'none','outline-width':'0px'};
    for(const side of borderSides) {
      out['border-'+side+'-width']=muted?'0px':'2.5px';
      out['border-'+side+'-style']=muted?'none':'solid';
      if(!muted)out['border-'+side+'-color']=stroke;
    }
    if(!muted)for(const corner of ['top-left','top-right','bottom-right','bottom-left'])out['border-'+corner+'-radius']=radius;
    return out;
  }
  function selectComposerFrame(context) {
    const {editor,form}=context;
    const eb=editor.getBoundingClientRect();
    if(eb.width<40||eb.height<=0)return null;
    const previous=[...composerFrameOriginal.keys()].find(el=>el.isConnected&&el.contains(editor));
    function measure(el) {
      const r=el.getBoundingClientRect();
      if(r.width<Math.max(165,eb.width*.87)||r.height<eb.height+6||r.height>650||
         r.top>eb.top+8||r.bottom<eb.bottom-5||r.left>eb.left+8||r.right<eb.right-5)return null;
      const s=getComputedStyle(el);
      if(s.display==='contents'||s.visibility!=='visible')return null;
      const radius=parseFloat(s.borderTopLeftRadius)||0;
      const edge=(parseFloat(s.borderTopWidth)>=.5&&s.borderTopStyle!=='none')||s.boxShadow!=='none';
      const paper=s.backgroundColor!=='transparent'&&s.backgroundColor!=='rgba(0, 0, 0, 0)';
      const known=el.matches('#composer-background,[data-testid="composer"]');
      const controls=!!el.querySelector('button,[role="button"]');
      return {el,radius,edge,paper,known,controls};
    }
    // Cache the verified surface while the editor remains in it. Only
    // inspect the ancestor chain again if the surface disappears or changes.
    if(previous&&editor===framedEditor){const held=measure(previous);if(held)return held;}
    const ancestors=[];
    for(let el=editor.parentElement,depth=0;el&&el!==document.body&&depth<12;el=el.parentElement,depth++){
      if(el.matches('main,[role="main"],[role="dialog"],#thread'))break;
      const candidate=measure(el);if(candidate)ancestors.push(candidate);
      if(el===form)break;
    }
    // Reject zero-box wrappers and choose the real rounded control surface.
    return ancestors.find(x=>x.radius>=8&&x.controls&&(x.edge||x.paper))||
      ancestors.find(x=>x.known)||ancestors.find(x=>x.radius>=8&&(x.edge||x.paper))||
      ancestors.find(x=>x.el===form)||null;
  }
  function syncComposerFrame() {
    const context=activeComposer(),editor=context?.editor;
    if(!editor?.isConnected){restoreComposerFrames();return;}
    const frame=selectComposerFrame(context),chosen=frame?.el;
    if(!chosen){restoreComposerFrames();return;}
    const muted=new Set();
    // Only ancestor wrappers in the same composer can be muted. Never
    // touch the editor, attachment controls or the rest of the page.
    if(context.form&&chosen!==context.form&&context.form.contains(chosen)){
      for(let el=chosen.parentElement;el&&el!==document.body;el=el.parentElement){
        muted.add(el);if(el===context.form)break;
      }
    } else if(!context.form){
      for(let el=chosen.parentElement,depth=0;el&&el!==document.body&&depth<8;el=el.parentElement,depth++){
        if(el.matches('main,[role="main"],[role="dialog"],#thread'))break;
        if(el.matches('#composer-background,[data-testid="composer"]'))muted.add(el);
      }
    }
    for(const [el,saved] of composerFrameOriginal)if(el!==chosen){
      restoreStyle(el,saved);
      if(el.isConnected){el.removeAttribute('data-ebook-composer-frame');el.style.removeProperty('--eb-composer-native-radius');}
      composerFrameOriginal.delete(el);
    }
    for(const [el,saved] of composerMutedOriginal)if(!muted.has(el)){
      restoreStyle(el,saved);if(el.isConnected)el.removeAttribute('data-ebook-composer-muted');
      composerMutedOriginal.delete(el);
    }
    if(composerMutedOriginal.has(chosen)){
      restoreStyle(chosen,composerMutedOriginal.get(chosen));composerMutedOriginal.delete(chosen);
      chosen.removeAttribute('data-ebook-composer-muted');
    }
    const tokens=getComputedStyle(document.documentElement);
    const stroke=tokens.getPropertyValue('--eb-accent-ink').trim()||'#303438';
    if(!composerFrameOriginal.has(chosen)){
      composerFrameOriginal.set(chosen,{});
      const radius=Math.max(22,Math.min(36,frame.radius||24));
      makeImportant(chosen,'--eb-composer-native-radius',radius+'px');
    }
    framedEditor=editor;
    if(chosen.getAttribute('data-ebook-composer-frame')!=='true')chosen.setAttribute('data-ebook-composer-frame','true');
    const radius=getComputedStyle(chosen).getPropertyValue('--eb-composer-native-radius').trim()||'24px';
    const saved=composerFrameOriginal.get(chosen);
    applyStaticExceptions(chosen,borderRequirements(stroke,false,radius),saved);
    for(const el of muted){
      if(!composerMutedOriginal.has(el))composerMutedOriginal.set(el,{});
      if(el.getAttribute('data-ebook-composer-muted')!=='true')el.setAttribute('data-ebook-composer-muted','true');
      applyStaticExceptions(el,borderRequirements(stroke,true,radius),composerMutedOriginal.get(el));
    }
    // CSS owns normal rendering. A one-time computed-style check guards
    // against a native rule winning even without inline !important.
    const actual=getComputedStyle(chosen);
    const rgb=/^#[0-9a-f]{6}$/i.test(stroke)?'rgb('+[1,3,5].map(i=>parseInt(stroke.slice(i,i+2),16)).join(', ')+')':stroke;
    if(actual.borderTopStyle!=='solid'||parseFloat(actual.borderTopWidth)<1.5||actual.borderTopColor!==rgb){
      for(const p of ['border-top-width','border-right-width','border-bottom-width','border-left-width','border-top-style','border-right-style','border-bottom-style','border-left-style','border-top-color','border-right-color','border-bottom-color','border-left-color']){
        if(!Object.prototype.hasOwnProperty.call(saved,p))saved[p]={value:chosen.style.getPropertyValue(p),priority:chosen.style.getPropertyPriority(p)};
      }
      for(const [p,v] of Object.entries(borderRequirements(stroke,false,radius)))if(p.startsWith('border-')){
        if(!Object.prototype.hasOwnProperty.call(saved,p))saved[p]={value:chosen.style.getPropertyValue(p),priority:chosen.style.getPropertyPriority(p)};
        makeImportant(chosen,p,v);
      }
    }
  }
  function restoreComposerFrames(){
    for(const [el,saved] of composerFrameOriginal){
      restoreStyle(el,saved);
      if(el.isConnected){
        el.removeAttribute('data-ebook-composer-frame');
        el.style.removeProperty('--eb-composer-native-radius');
      }
    }
    composerFrameOriginal.clear();framedEditor=null;
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
  const promptSurface='[data-message-author-role="user"],[data-user-message],[data-user-message-bubble="true"],.bg-user-message';
  const promptExclusion='button,[role="button"],[role="toolbar"],svg,pre,code,kbd,samp,table,[role="table"],[data-d-component="math"],[aria-hidden="true"],.sr-only,[data-testid*="attachment" i],[data-testid*="file" i],[data-testid*="upload" i]';
  function markPromptTypography(scope='all') {
    const tokens=getComputedStyle(document.documentElement);
    const font=tokens.getPropertyValue('--eb-font').trim();
    const reading=tokens.getPropertyValue('--eb-prompt-optical-size').trim()||'16px';
    const sentReading=tokens.getPropertyValue('--eb-user-sent-optical-size').trim()||'16.067px';
    const ink=tokens.getPropertyValue('--eb-prompt-sent-ink').trim()||'#292D30';
    const sentWeight=tokens.getPropertyValue('--eb-prompt-sent-weight').trim()||'572';
    const styles={editor:{'font-family':font,'font-size':reading,'line-height':'1.56'},
      sent:{'font-family':font,'font-size':sentReading,'font-weight':sentWeight,'font-synthesis-weight':'none',
        'letter-spacing':'-0.01em','color':ink,'-webkit-text-fill-color':ink,'line-height':'1.55'}};
    const chosen=new Map(),direct=new Set();
    const hasDirectText=el=>[...el.childNodes].some(n=>n.nodeType===3&&(n.nodeValue||'').trim());
    function add(el,kind,needsMarker=false){
      if(!el?.isConnected||el.closest(promptExclusion))return;
      if(!el.matches('p,li,span,div,[data-d-component="text"],[data-d-text-flow],.whitespace-pre-wrap,[contenteditable="true"]'))return;
      if(needsMarker)direct.add(el);
      if(needsMarker||el.hasAttribute('style')||promptTypeOriginal.has(el))chosen.set(el,kind);
    }
    if(scope!=='sent'){
      const editor=activeComposer()?.editor;
      if(editor?.isConnected){
        add(editor,'editor');
        for(const el of editor.querySelectorAll('[style]'))add(el,'editor');
      }
    }
    if(scope!=='editor'){
      for(const root of document.querySelectorAll(promptSurface))
        if(root.matches('[data-message-author-role="user"]')&&hasDirectText(root))add(root,'sent',true);
      for(const el of document.querySelectorAll(':is('+promptSurface+')[style],:is('+promptSurface+') [style]'))add(el,'sent');
    }
    for(const [el,record] of promptTypeOriginal){
      if(scope!=='all'&&record.kind!==scope)continue;
      if(chosen.has(el))continue;
      restoreStyle(el,record.previous);
      if(el.isConnected)el.removeAttribute('data-ebook-prompt-text');
      promptTypeOriginal.delete(el);
    }
    for(const [el,kind] of chosen){
      const prev=promptTypeOriginal.get(el),saved=prev?.previous||{};
      const changed=applyStaticExceptions(el,styles[kind],saved);
      if(direct.has(el)||changed){
        if(el.getAttribute('data-ebook-prompt-text')!==kind)el.setAttribute('data-ebook-prompt-text',kind);
        promptTypeOriginal.set(el,{kind,previous:saved});
      } else if(prev){
        el.removeAttribute('data-ebook-prompt-text');promptTypeOriginal.delete(el);
      }
    }
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

  function timed(key,fn) {
    const started=performance.now();
    fn();
    const ms=performance.now()-started;
    timings[key]=Math.round(ms*100)/100;
    const p=perfPasses[key]||(perfPasses[key]={runs:0,totalMs:0,peakMs:0});
    p.runs++;p.totalMs+=ms;p.peakMs=Math.max(p.peakMs,ms);
  }

  /* Conversation Outline — isolated, local-only, opt-in navigation.
     Read only currently mounted message DOM while the panel is open.
     No new API, storage, external request, title mutation or history fetch. */
  // Prefer native role/turn markers; fall back to the same user bubble
  // markers as the working prompt typography code. Do not require <main>.
  const OUTLINE_USER='[data-message-author-role="user"],[data-turn="user"],[data-author-role="user"],[data-message-role="user"],[data-user-message],[data-user-message-bubble="true"],.bg-user-message,[data-testid="user-message"]';
  const OUTLINE_ASSISTANT='[data-message-author-role="assistant"],[data-turn="assistant"],[data-author-role="assistant"],[data-message-role="assistant"],[data-assistant-message],[data-assistant-message-bubble="true"],[data-testid="assistant-message"]';
  const OUTLINE_MSG=OUTLINE_USER+','+OUTLINE_ASSISTANT;
  const OUTLINE_SENT='[data-ebook-prompt-text="sent"]';
  const OUTLINE_TURN='[data-testid^="conversation-turn-"],[data-turn-id],[data-message-id]';
  const OUTLINE_REGION='#thread,[data-testid="conversation-panel"],[data-testid="conversation-thread"],[data-testid="conversation"],main,[role="main"]';
  const OUTLINE_CONTENT='.markdown,.prose,[data-d-component="markdown"],[data-assistant-message-content]';
  const OUTLINE_HEAD='h1,h2,h3,h4,h5,h6,[role="heading"],[data-d-component="title"]';
  const OUTLINE_AREA_SKIP=SIDE_ROOTS+', [data-ebook-sidebar-seam="true"],[data-ebook-outline-host],[role="dialog"],[role="menu"],[role="toolbar"],[hidden],[aria-hidden="true"],.sr-only,#prompt-textarea,[data-testid="composer"],[contenteditable="true"]';
  const OUTLINE_TEXT_SKIP='button,[role="button"],nav,aside,[role="toolbar"],[role="menu"],[role="dialog"],[hidden],[aria-hidden="true"],.sr-only,svg,script,style,pre';
  let conversationOutline=null;
  function outlineRoute(pathname) {
    return /^\/(?:g\/[^/]+\/)?c\/([^/]+)\/?$/u.exec(pathname)?.[1]||null;
  }
  function outlineShort(value,limit=92) {
    const clean=String(value||'').replace(/\s+/gu,' ').trim();
    const points=Array.from(clean);
    return points.length>limit?points.slice(0,limit-1).join('')+'…':clean;
  }
  // Exclude controls *inside* the message, not an unrelated outer app wrapper.
  function outlineLocalSkip(el,boundary,selector=OUTLINE_TEXT_SKIP) {
    for(let p=el;p&&p!==boundary;p=p.parentElement)if(p.matches(selector))return true;
    return false;
  }
  function outlineText(el,limit=92) {
    if(!el)return '';
    const walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    let text='',part,checked=0;
    while((part=walker.nextNode())&&checked++<240&&text.length<limit*3) {
      if(!outlineLocalSkip(part.parentElement,el))text+=String(part.nodeValue||'')+' ';
    }
    return outlineShort(text,limit);
  }
  function outlineRole(el) {
    return el?.matches(OUTLINE_USER)?'user':el?.matches(OUTLINE_ASSISTANT)?'assistant':null;
  }
  function outlineAllowed(el) {return !!el&&!el.closest(OUTLINE_AREA_SKIP);}
  function outlineMain() {
    // The new app shell may mount the conversation outside semantic main.
    // Only select a native region if it contains all recognized mounted messages.
    const body=document.body;
    if(!body)return null;
    const visible=[...body.querySelectorAll(OUTLINE_MSG+','+OUTLINE_SENT)].filter(outlineAllowed);
    const regions=[...body.querySelectorAll(OUTLINE_REGION)].filter(outlineAllowed);
    const complete=visible.length?regions.filter(r=>visible.every(el=>r.contains(el))):[];
    if(complete.length)return complete.find(r=>!complete.some(p=>p!==r&&r.contains(p)))||complete[0];
    return body;
  }
  function outlineCandidates(root) {
    if(!root)return [];
    const found=new Map();
    const put=(el,role)=>{if(outlineAllowed(el)&&!found.has(el))found.set(el,role);};
    // An outer role-marked turn owns its nested role markers and bubbles.
    for(const el of root.querySelectorAll(OUTLINE_MSG)) {
      if(!outlineAllowed(el))continue;
      const parent=el.parentElement?.closest(OUTLINE_MSG);
      if(parent&&root.contains(parent)&&outlineAllowed(parent))continue;
      put(el,outlineRole(el));
    }
    // Our existing sent-text markers can supply a question even if the
    // native role attribute is absent. Group leaves only by verified turns.
    for(const el of root.querySelectorAll(OUTLINE_SENT)) {
      if(!outlineAllowed(el)||el.closest(OUTLINE_MSG))continue;
      const turn=el.closest(OUTLINE_TURN);
      const marked=el.parentElement?.closest(OUTLINE_SENT);
      if(marked&&root.contains(marked))continue;
      put(turn&&root.contains(turn)?turn:el,'user');
    }
    const userAnchors=[...found].filter(([,role])=>role==='user').map(([el])=>el);
    // Markdown fallback is allowed only in an actual conversation turn or
    // a native conversation region with mounted user messages. No page-wide
    // guessing from arbitrary paragraph text.
    for(const el of root.querySelectorAll(OUTLINE_CONTENT)) {
      if(!outlineAllowed(el)||el.closest(OUTLINE_MSG)||el.closest(OUTLINE_SENT))continue;
      const turn=el.closest(OUTLINE_TURN);
      const region=el.closest(OUTLINE_REGION);
      if(!turn&&!(region&&userAnchors.some(u=>region.contains(u))))continue;
      if(turn&&userAnchors.some(u=>turn.contains(u)))continue;
      if(userAnchors.some(u=>u.contains(el)))continue;
      const outer=el.parentElement?.closest(OUTLINE_CONTENT);
      if(outer&&root.contains(outer)&&outlineAllowed(outer)&&
         ((turn&&turn.contains(outer))||(!turn&&region?.contains(outer))))continue;
      const target=turn&&root.contains(turn)?turn:el;
      // Do not create a second answer inside an already detected answer.
      if([...found.keys()].some(n=>n.contains(target)||target.contains(n)))continue;
      put(target,'assistant');
    }
    return [...found].filter(([,role])=>role).sort(([a],[b])=>a===b?0:(a.compareDocumentPosition(b)&4)?-1:1);
  }
  function outlineEntries(root) {
    const entries=[];if(!root)return entries;
    const seen=new Set();let group=0;
    for(const [msg,role] of outlineCandidates(root)) {
      const id=msg.getAttribute('data-message-id')||msg.closest(OUTLINE_TURN)?.getAttribute('data-message-id');
      const key=id?role+':'+id:null;
      if(key&&seen.has(key))continue;if(key)seen.add(key);
      if(role==='user') {
        group++;
        const body=msg.querySelector('[data-user-message-bubble="true"],[data-user-message],.bg-user-message,.whitespace-pre-wrap')||msg;
        entries.push({type:'question',group,label:outlineText(body)||'첨부 또는 텍스트 없는 질문',target:msg});
      } else {
        const content=msg.querySelector(OUTLINE_CONTENT)||msg;
        entries.push({type:'answer',group,label:outlineText(content,72)||'답변',target:msg});
        for(const h of msg.querySelectorAll(OUTLINE_HEAD)) {
          if(outlineLocalSkip(h,msg)||!outlineAllowed(h)||h.parentElement?.closest(OUTLINE_HEAD))continue;
          const label=outlineText(h);
          if(label)entries.push({type:'heading',group,label,target:h});
        }
      }
    }
    return entries;
  }
  function outlineMatches(entries,query) {
    const q=String(query||'').trim().toLocaleLowerCase('ko-KR');
    if(!q)return entries;
    const questionGroups=new Set(entries.filter(e=>e.type==='question'&&e.label.toLocaleLowerCase('ko-KR').includes(q)).map(e=>e.group));
    const hits=new Set(entries.filter(e=>e.label.toLocaleLowerCase('ko-KR').includes(q)).map(e=>e.group));
    return entries.filter(e=>questionGroups.has(e.group)||e.label.toLocaleLowerCase('ko-KR').includes(q)||(e.type==='question'&&hits.has(e.group)));
  }
  function createConversationOutline(route) {
    const host=document.createElement('div');
    host.setAttribute('data-ebook-outline-host','true');
    const shadow=host.attachShadow({mode:'open'});
    const style=document.createElement('style');
    style.textContent=
      ':host{all:initial;position:fixed!important;right:16px!important;top:94px!important;z-index:40!important;display:block!important;font-family:var(--eb-font,"IBM Plex Mono","Pretendard Variable","Pretendard",sans-serif);color:var(--eb-ink,#292D30);font-size:13px;line-height:1.5;}' +
      '*{box-sizing:border-box}button,input{font:inherit;color:inherit}button{cursor:pointer}' +
      '.toggle{display:flex;align-items:center;gap:7px;margin-left:auto;background:var(--eb-panel,#F5F6F6);border:1px solid var(--eb-line,#C5CDD0);padding:6px 10px;border-radius:6px;color:var(--eb-secondary,#535B60);font-weight:500;box-shadow:none;white-space:nowrap}' +
      '.toggle:hover,.toggle[aria-expanded="true"]{background:#D8EA8B;color:#292D30;border-color:#AAB875}' +
      '.panel{width:min(340px,calc(100vw - 32px));max-height:min(72vh,calc(100vh - 145px));margin-top:8px;background:var(--eb-panel,#F5F6F6);border:1px solid var(--eb-line,#C5CDD0);border-radius:10px;display:flex;flex-direction:column;box-shadow:0 8px 24px rgba(39,47,54,.12);overflow:hidden}' +
      '[hidden]{display:none!important}.head{padding:14px 14px 11px;border-bottom:1px solid var(--eb-line,#C5CDD0)}' +
      '.title{display:block;font-size:16px;font-weight:650;letter-spacing:-.025em}.meta{display:block;color:var(--eb-secondary,#535B60);font-size:11px;margin-top:4px}' +
      '.search{width:100%;margin-top:10px;border:1px solid var(--eb-line,#C5CDD0);background:var(--eb-paper,#EFF1F2);border-radius:6px;padding:8px 10px;outline:none}' +
      '.search:focus,button:focus-visible{outline:2px solid var(--eb-quiet-focus,#7B898F);outline-offset:1px}' +
      '.list{overflow:auto;overscroll-behavior:contain;min-height:0;padding:7px 8px;scrollbar-width:thin}' +
      '.entry{width:100%;display:flex;align-items:baseline;gap:8px;text-align:left;border:0;background:transparent;border-radius:4px;padding:6px 7px;line-height:1.45;overflow-wrap:anywhere}' +
      '.entry:hover,.entry:focus-visible{background:var(--eb-soft,#E4E8EA)}.entry[aria-current="location"]{background:#D8EA8B}' +
      '.question{font-weight:600;margin-top:5px;border-top:1px solid var(--eb-line,#C5CDD0);border-radius:0 0 4px 4px;padding-top:9px}.question:first-child{border-top:0;margin-top:0}' +
      '.answer{color:var(--eb-secondary,#535B60);padding-left:17px}.heading{padding-left:26px;color:var(--eb-secondary,#535B60);font-size:12px}' +
      '.index{color:var(--eb-muted,#737D83);flex:none;font-size:10px;font-family:var(--eb-mono,"IBM Plex Mono",monospace);font-weight:500}.label{min-width:0}.empty{padding:14px 8px;color:var(--eb-muted,#737D83)}' +
      " .foot{border-top:1px solid var(--eb-line,#C5CDD0);padding:9px 14px;font-size:10px;color:var(--eb-secondary,#535B60);display:flex;align-items:center;gap:6px;justify-content:space-between}.rescan{border:0;background:transparent;padding:3px 4px;white-space:nowrap;text-decoration:underline;text-underline-offset:2px}.rescan:hover{color:#292D30;background:#D8EA8B}" +
      '@media(max-width:600px){:host{right:8px!important;top:90px!important}.panel{width:min(320px,calc(100vw - 16px));max-height:65vh}}';
    function node(tag,cls,value) {
      const n=document.createElement(tag);
      if(cls)n.className=cls;if(value!=null)n.textContent=value;
      return n;
    }
    const toggle=node('button','toggle','☷  목차');
    toggle.type='button';toggle.setAttribute('aria-expanded','false');
    toggle.setAttribute('aria-controls','jaroo-outline-panel');toggle.setAttribute('aria-label','대화 목차 열기');
    const panel=node('section','panel');panel.id='jaroo-outline-panel';panel.hidden=true;
    panel.setAttribute('aria-label','대화 목차');
    const head=node('div','head'),title=node('strong','title','대화 목차');
    const meta=node('span','meta',''),search=node('input','search');
    search.type='search';search.placeholder='질문·제목 검색';search.setAttribute('aria-label','목차 검색');search.autocomplete='off';
    const list=node('div','list');list.setAttribute('role','group');list.setAttribute('aria-label','대화 항목');
    const foot=node('div','foot');
    const footText=node('span',null,'현재 불러온 대화만 표시 · 원문으로 이동');
    const rescan=node('button','rescan','다시 읽기');rescan.type='button';
    rescan.setAttribute('aria-label','현재 대화 목차 다시 읽기');
    foot.append(footText,rescan);
    rescan.addEventListener('click',()=>{refresh();rescan.focus({preventScroll:true});});
    head.append(title,meta,search);panel.append(head,list,foot);shadow.append(style,toggle,panel);
    document.body.appendChild(host);
    let open=false,root=null,entries=[],timer=0,active=null,rendered=[];
    const observer=new MutationObserver(records=>{
      if(root!==document.body){queue();return;}
      const relevant=OUTLINE_MSG+','+OUTLINE_SENT+','+OUTLINE_CONTENT+','+OUTLINE_TURN+','+OUTLINE_REGION;
      if(records.some(m=>{
        const el=m.target.nodeType===1?m.target:m.target.parentElement;
        if(el?.closest(OUTLINE_AREA_SKIP))return false;
        if(el?.closest(OUTLINE_MSG+','+OUTLINE_SENT+','+OUTLINE_CONTENT+','+OUTLINE_TURN))return true;
        return [...m.addedNodes,...m.removedNodes].some(n=>n.nodeType===1&&(n.matches(relevant)||n.querySelector(relevant)));
      }))queue();
    });
    function queue() {
      if(!open||timer)return;
      // Throttle during streaming; one scoped refresh per 700ms maximum.
      timer=setTimeout(()=>{timer=0;if(open)refresh();},700);
    }
    function bindRoot() {
      const next=outlineMain();if(root===next)return;
      observer.disconnect();root=next;
      if(open&&root)observer.observe(root,{subtree:true,childList:true,characterData:true});
    }
    function jump(entry,button) {
      if(outlineRoute(location.pathname)!==route||!entry.target.isConnected){refresh();return;}
      const reduce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      entry.target.scrollIntoView({behavior:reduce?'instant':'smooth',block:'center',inline:'nearest'});
      active=entry.target;
      for(const b of list.querySelectorAll('[aria-current]'))b.removeAttribute('aria-current');
      button.setAttribute('aria-current','location');
    }
    function render(force=false) {
      const filtered=outlineMatches(entries,search.value);
      const same=filtered.length===rendered.length&&filtered.every((e,i)=>e.target===rendered[i].target&&e.type===rendered[i].type&&e.label===rendered[i].label&&e.group===rendered[i].group);
      const count=entries.filter(e=>e.type==='question').length;
      meta.textContent='질문 '+count+'개 · '+filtered.length+'개 항목';
      if(same&&!force)return;
      const y=list.scrollTop,oldFocus=shadow.activeElement;
      const focusTarget=oldFocus?.__jarooOutlineTarget;
      const fragment=document.createDocumentFragment();
      if(!filtered.length)fragment.append(node('div','empty',search.value.trim()?'검색 결과가 없습니다.':'대화 구조를 인식하지 못했습니다. 다시 읽기를 눌러 주세요.'));
      for(const entry of filtered) {
        const b=node('button','entry '+entry.type);b.type='button';
        const tag=entry.type==='question'?'Q'+String(entry.group).padStart(2,'0'):entry.type==='answer'?'A':'·';
        b.append(node('span','index',tag),node('span','label',entry.label));
        b.__jarooOutlineTarget=entry.target;
        if(active===entry.target)b.setAttribute('aria-current','location');
        b.addEventListener('click',()=>jump(entry,b));
        fragment.append(b);
      }
      list.replaceChildren(fragment);list.scrollTop=y;rendered=filtered;
      if(focusTarget){const next=[...list.querySelectorAll('button')].find(b=>b.__jarooOutlineTarget===focusTarget);next?.focus({preventScroll:true});}
    }
    function refresh() {
      if(!open||outlineRoute(location.pathname)!==route)return;
      bindRoot();entries=outlineEntries(root);render();
    }
    function setOpen(value,focus=true) {
      open=value;panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));
      toggle.setAttribute('aria-label',open?'대화 목차 닫기':'대화 목차 열기');
      if(open){bindRoot();entries=outlineEntries(root);render(true);if(focus)search.focus({preventScroll:true});}
      else{observer.disconnect();clearTimeout(timer);timer=0;root=null;entries=[];rendered=[];active=null;search.value='';list.replaceChildren();if(focus)toggle.focus({preventScroll:true});}
    }
    toggle.addEventListener('click',()=>setOpen(!open));
    search.addEventListener('input',()=>render(true));
    shadow.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&open){event.stopPropagation();event.preventDefault();setOpen(false);}
      else if(event.target===search)event.stopPropagation();
    });
    return {route,host,sync(){if(open&&(!root||!root.isConnected||!entries.length))queue();},dispose(){setOpen(false,false);host.remove();}};
  }
  function syncConversationOutline() {
    const route=outlineRoute(location.pathname);
    if(conversationOutline&&(conversationOutline.route!==route||!conversationOutline.host.isConnected)){
      conversationOutline.dispose();conversationOutline=null;
    }
    if(!route)return;
    if(!conversationOutline)conversationOutline=createConversationOutline(route);
    else conversationOutline.sync();
  }
  function disposeConversationOutline() {
    conversationOutline?.dispose();conversationOutline=null;
  }

  function update(mask) {
    if(disposed||!document.body||!document.documentElement)return;
    if(!cssOwnerReady){
      cssOwnerReady=isStaticOwner();
      if(!cssOwnerReady){
        dirty|=mask;
        if(cssReadyAttempts<20&&!cssReadyTimer){
          cssReadyAttempts++;
          cssReadyTimer=setTimeout(()=>{cssReadyTimer=0;schedule(ALL);},80);
        }
        return;
      }
      clearTimeout(cssReadyTimer);cssReadyTimer=0;
    }
    timings.runs++;
    syncConversationOutline();
    if(mask&PASS.NAV)timed('nav',()=>{
      navPassRows=[...document.querySelectorAll(PROJECT_ROW)];
      try {
      attachObservers();
      synchronizeSidebar();
      enforceOpticalSidebarText();
      markQuickActionLabels();
      markDotCounter();
      markSidebarSeam();
      sortSidebarOrder();
      markFixedSidebarTop();
      markProjectTitles();
      markProjectCounts();
      attachObservers();
      } finally {navPassRows=null;}
    });
    if(mask&PASS.COMPOSER)timed('composer',()=>{
      watchComposer();
      syncComposerFrame();
      markEffortPicker();
    });
    if(mask&PASS.EDITOR)timed('editor',()=>markPromptTypography('editor'));
    if(mask&PASS.SENT)timed('sent',()=>markPromptTypography('sent'));
    if(mask&PASS.DIVIDER)timed('divider',markUploadDivider);
    if(mask&PASS.HEADER)timed('header',()=>{
      markWorkSwitcher();
      markCurrentChatTitle();
    });
  }
  function schedule(mask=ALL) {
    if(disposed)return;
    dirty|=typeof mask==='number'?mask:ALL;
    perfEvents.scheduled++;
    if(document.hidden){perfEvents.hiddenDeferred++;return;}
    if(frame){perfEvents.coalesced++;return;}
    frame=window.requestAnimationFrame(()=>{
      frame=0;
      if(document.hidden)return;
      const work=dirty;dirty=0;
      if(document.body&&document.documentElement)update(work);
      else dirty|=work;
    });
  }
  function matchesOrContains(el,selector) {
    return el?.nodeType===1&&(el.matches(selector)||!!el.querySelector(selector));
  }
  function onPageMutation(records) {
    if(!document.body)return;
    if(document.hidden){dirty|=ALL;return;}
    if(location.pathname!==lastRoute){lastRoute=location.pathname;schedule(ALL);return;}
    let mask=0;
    const structure=SIDE_ROOTS+','+NATIVE_NAV_SECTIONS+','+PROJECT_ROW+','+EDITOR_NODE+',#composer-background,[data-testid="composer"],'+USER_NODE+','+HEADER_NODE;
    for(const m of records) {
      const target=m.target.nodeType===1?m.target:m.target.parentElement;
      // Streaming assistant output and ordinary editor/sidebar mutations
      // have their own scoped observers or require no helper processing.
      if(target?.closest?.('[data-message-author-role="assistant"]'))continue;
      if(composerObserved?.contains(target))continue;
      if(observedRoots.some(root=>root.contains(target)))continue;
      if(ownMutation(m))continue;
      if(target?.closest?.(NATIVE_NAV_SECTIONS)){mask|=PASS.NAV|PASS.HEADER;continue;}
      if(target?.closest?.(USER_NODE)){mask|=PASS.SENT;continue;}
      if(target?.closest?.(HEADER_NODE)){mask|=PASS.HEADER;continue;}
      for(const n of [...m.addedNodes,...m.removedNodes]) {
        if(n.nodeType!==1||isOwnNode(n)||!matchesOrContains(n,structure))continue;
        if(matchesOrContains(n,SIDE_ROOTS+','+NATIVE_NAV_SECTIONS+','+PROJECT_ROW))mask|=PASS.NAV|PASS.HEADER;
        if(matchesOrContains(n,EDITOR_NODE+',#composer-background,[data-testid="composer"]'))
          mask|=PASS.COMPOSER|PASS.EDITOR|PASS.DIVIDER;
        if(matchesOrContains(n,USER_NODE))mask|=PASS.SENT;
        if(matchesOrContains(n,HEADER_NODE))mask|=PASS.HEADER;
      }
    }
    if(mask)schedule(mask);
  }
  function onRouteOrResize(event) {
    if(event?.type==='resize') {
      queueProjectCountPosition(event);
      scheduleResizeReconcile();
    } else {
      clearTimeout(resizeReconcileTimer);resizeReconcileTimer=0;
      schedule(ALL);
    }
  }
  function recoverLightly() {
    if(document.hidden||disposed||!document.body)return;
    if(!cssOwnerReady){if(isStaticOwner())schedule(ALL);return;}
    if(location.pathname!==lastRoute){lastRoute=location.pathname;schedule(ALL);return;}
    let mask=0;
    const roots=sidebarObserverRoots();
    if(roots.length!==observedRoots.length||roots.some((r,i)=>r!==observedRoots[i]))mask|=PASS.NAV|PASS.HEADER;
    const c=activeComposer();
    if((c?.editor||null)!==composerEditor||(c?.form||c?.shell||null)!==composerObserved)
      mask|=PASS.COMPOSER|PASS.EDITOR|PASS.DIVIDER;
    const now=performance.now();
    // Low-frequency safety net for native changes not emitted as DOM
    // child mutations; no full scan every four seconds.
    if(now-lastRecovery>60000){
      lastRecovery=now;
      // Rare structural recovery only; never restyle historical messages
      // or walk all static typography as a periodic task.
      if(!observedRoots.length||[...countHosts.keys()].some(n=>!n.isConnected)||
         (document.querySelector(PROJECT_ROW)&&!countHosts.size))mask|=PASS.NAV;
      if(c?.editor&&!composerFrameOriginal.size)mask|=PASS.COMPOSER|PASS.DIVIDER;
    }
    if(mask)schedule(mask);
  }

  function restore() {
    sidebarApplyOrder(new Map());
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
    disposeConversationOutline();
    observer.disconnect();
    composerObserver.disconnect();
    pageObserver?.disconnect();
    navResizeObserver?.disconnect();navResizeTargets.clear();
    clearTimeout(resizeReconcileTimer);resizeReconcileTimer=0;
    composerResizeObserver?.disconnect();
    uploadResizeObserver?.disconnect();
    uploadResizeTargets.clear();
    clearTimeout(uploadIntentTimer);
    clearInterval(recoverTimer);
    clearTimeout(cssReadyTimer);cssReadyTimer=0;
    if (frame) cancelAnimationFrame(frame);
    restore();
    restoreOpticalSidebarText();
    restoreComposerFrames();
    restorePromptTypography();
    restoreQuickDotTypography();
    restoreProjectCounts();
    restoreFixedSidebarTop();
    restoreNotebookMarks();presentationMarks.clear();
    document.querySelectorAll('[data-ebook-quick-label]').forEach(n=>n.removeAttribute('data-ebook-quick-label'));
    document.querySelectorAll('[data-ebook-effort-picker="true"]').forEach(n=>n.removeAttribute('data-ebook-effort-picker'));
    document.querySelectorAll('[data-ebook-active-title="true"]').forEach(n=>n.removeAttribute('data-ebook-active-title'));
    document.querySelectorAll('[data-ebook-upload-divider="true"]').forEach(n=>n.remove());
    document.querySelectorAll('[data-ebook-composer-root="true"]').forEach(n=>n.removeAttribute('data-ebook-composer-root'));
    document.removeEventListener('visibilitychange', onVisibility);
    for(const type of ['change','drop','paste'])document.removeEventListener(type,onUploadIntent,true);
    document.removeEventListener('load',onComposerImageLoad,true);
    document.removeEventListener('DOMContentLoaded',onRouteOrResize);
    window.removeEventListener('popstate',onRouteOrResize);
    window.removeEventListener('resize',onRouteOrResize);
    window.visualViewport?.removeEventListener('resize',onRouteOrResize);
    window.removeEventListener('focus', schedule);
    if (window[RUNTIME]?.dispose === dispose) delete window[RUNTIME];
  }

  function onVisibility() { if (!document.hidden) schedule(); }

  // document-start: CSS handles first paint, this observer catches native
  // elements as they appear. The helper does not block app hydration.
  pageObserver=new MutationObserver(onPageMutation);
  pageObserver.observe(document,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',onRouteOrResize,{once:true});
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('click',onModeInteraction,true);
  for(const type of ['scroll','pointerover','pointerout','focusin','focusout'])
    document.addEventListener(type,queueProjectCountPosition,true);
  for(const type of ['change','drop','paste'])document.addEventListener(type,onUploadIntent,true);
  document.addEventListener('load',onComposerImageLoad,true);
  window.addEventListener('focus',schedule);
  window.addEventListener('popstate',onRouteOrResize);
  window.addEventListener('resize',onRouteOrResize);
  window.visualViewport?.addEventListener('resize',onRouteOrResize,{passive:true});
  recoverTimer=setInterval(recoverLightly,5000);
  schedule(ALL);

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
    version:'0.3.0-beta.5',dispose,refresh:schedule,
    diagnostics:() => ({...errors,sorting:{...sidebarSortDiagnostics,styledRows:sidebarSortSaved.size},roots:observedRoots.length,dotMarkers:document.querySelectorAll('[data-ebook-dot-counter="true"]').length,quickNavMarkers:[...document.querySelectorAll('[data-ebook-quick-label]')].map(n=>({kind:n.getAttribute('data-ebook-quick-label'),font:getComputedStyle(n).fontSize,weight:getComputedStyle(n).fontWeight,color:getComputedStyle(n).color,background:getComputedStyle(n).backgroundImage})),effortMarkers:document.querySelectorAll('[data-ebook-effort-picker="true"]').length,headerMarkers:document.querySelectorAll('[data-ebook-active-title="true"]').length,uploadDivider:!!document.querySelector('[data-ebook-upload-divider="true"]'),cssOwnerReady,firstPaintNav:getComputedStyle(document.documentElement).getPropertyValue('--eb-first-paint-nav').trim()==='1',opticalLeaves:opticalFontOriginal.size,opticalProjectTarget:getComputedStyle(document.documentElement).getPropertyValue('--eb-project-optical-size').trim(),opticalChatTarget:'15.333px',projectWeightLeaves:projectWeightOriginal.size,composerFrames:composerFrameOriginal.size,mutedComposerFrames:composerMutedOriginal.size,promptTextLeaves:promptTypeOriginal.size,quickInlineExceptions:quickDotOriginal.size,promptOpticalTarget:getComputedStyle(document.documentElement).getPropertyValue('--eb-prompt-optical-size').trim(),sentPromptTarget:getComputedStyle(document.documentElement).getPropertyValue('--eb-user-sent-optical-size').trim(),projectMarkers:[...document.querySelectorAll('[data-ebook-project-marker]')].map(n=>n.getAttribute('data-ebook-project-marker')),sidebarSeams:document.querySelectorAll('[data-ebook-sidebar-seam="true"]').length,workSwitcher: [...document.querySelectorAll('[data-ebook-switch-tab]')].map(n=>n.getAttribute('data-ebook-switch-tab')),projectCounts:[...document.querySelectorAll('[data-ebook-project-count]')].map(n=>({value:n.textContent,state:n.getAttribute('data-ebook-count-state'),overflow:n.getAttribute('data-ebook-count-overflow')==='true',confirmed:n.getAttribute('data-ebook-count-confirmed')===''?null:Number(n.getAttribute('data-ebook-count-confirmed'))})),lastPassMs:{...timings},performance:{events:{...perfEvents},passes:Object.fromEntries(Object.entries(perfPasses).map(([k,v])=>[k,{runs:v.runs,averageMs:Math.round(v.totalMs/v.runs*100)/100,peakMs:Math.round(v.peakMs*100)/100}]))},fixedSidebarTop:[...topBands.values()].map(n=>({height:n.height,visible:getComputedStyle(n.strip).visibility==='visible',pattern:getComputedStyle(n.strip).backgroundImage})),projectCountBorders:[...document.querySelectorAll('[data-ebook-project-count]')].map(n=>({border:getComputedStyle(n).borderTopWidth,style:getComputedStyle(n).borderTopStyle,outline:getComputedStyle(n).outlineStyle})),projectCountLayers:countLayers.size,positionResizeTargets:navResizeTargets.size,visibleProjectCounts:[...document.querySelectorAll('[data-ebook-project-count]')].filter(n=>getComputedStyle(n).visibility!=='hidden').length,projectCountAxis:findDotCountReference()?.circle.getBoundingClientRect().left??null,fontAudit:fontAudit()})
  };
})();
