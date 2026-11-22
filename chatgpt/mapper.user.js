// ==UserScript==
// @name         Jaroo · Organization Mapper
// @namespace    https://chatgpt.com/
// @version      1.3.1
// @description  Jaroo organization color mappings; updates via pinned release URLs.
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/mapper.user.js
// @downloadURL  https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/mapper.user.js
// ==/UserScript==
(() => {
  'use strict';
  const RUNTIME = '__jarooOrgMapperRuntime';
  window[RUNTIME]?.dispose?.();
  const LABELS = new Map([
    ['대표실', 'ceo'],
    ['전략기획본부', 'strategy'],
    ['개인비서실', 'assistant'],
    ['영업팀', 'sales'],
    ['BD팀', 'bd'],
    ['제안팀', 'proposal'],
    ['디자인팀', 'design'],
    ['기술운영팀', 'technical'],
    ['인재개발팀', 'people'],
    ['경영관리실', 'management'],
    ['CEO 경영철학과 판단', 'philosophy']
  ]);
  const PROJECT = '[data-sidebar-project-kind="local"] [data-app-action-sidebar-project-row]';
  let disposed = false, frame = 0;
  const sync = () => {
    frame = 0;
    if (disposed) return;
    for (const row of document.querySelectorAll(PROJECT)) {
      const title = row.querySelector('[data-marquee-content="true"]');
      if (!title) continue;
      const name = (title.textContent || '').replace(/\s+/g, ' ').trim();
      const value = LABELS.get(name);
      if (value && row.getAttribute('data-jaroo-org') !== value) row.setAttribute('data-jaroo-org', value);
      else if (!value && row.hasAttribute('data-jaroo-org')) row.removeAttribute('data-jaroo-org');
    }
  };
  const schedule = () => {if (!disposed && !frame) frame = requestAnimationFrame(sync);};
  const SIDEBAR = '#stage-sidebar,#stage-slideover-sidebar,[data-testid="sidebar"],aside';
  let watching = [], recovery = 0;
  const observer = new MutationObserver(changes => {
    for (const m of changes) {
      const target = m.target.nodeType === Node.ELEMENT_NODE ? m.target : m.target.parentElement;
      if (target?.closest?.('[data-sidebar-project-kind="local"]')) {schedule();return;}
      if(m.type==='childList') for(const n of m.addedNodes){
        if(n.nodeType===Node.ELEMENT_NODE &&
          (n.matches?.('[data-sidebar-project-kind="local"]') || n.querySelector?.('[data-sidebar-project-kind="local"]'))){schedule();return;}
      }
    }
  });
  function attach() {
    const all=[...document.querySelectorAll(SIDEBAR)];
    const roots=all.filter(x=>!all.some(p=>p!==x&&p.contains(x)));
    if(roots.length===watching.length && roots.every((x,i)=>x===watching[i] && x.isConnected))return;
    observer.disconnect();watching=roots;
    for(const root of roots) observer.observe(root,{subtree:true,childList:true,characterData:true});
    schedule();
  }
  const onVisible = () => {if(!document.hidden){attach();schedule();}};
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', attach);
  recovery=setInterval(()=>{if(!document.hidden)attach();},8000);
  attach();
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    clearInterval(recovery);
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('focus', attach);
    if (window[RUNTIME]?.dispose === dispose) delete window[RUNTIME];
  };
  window[RUNTIME] = {version: '1.3.1', dispose};
  sync();
})();
