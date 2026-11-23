// ==UserScript==
// @name         Jaroo · Organization Mapper
// @namespace    https://chatgpt.com/
// @version      1.3.5
// @description  Jaroo organization colors and sidebar title typography.
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
  const SIDEBAR = '#stage-sidebar,#stage-slideover-sidebar,#slate-sidebar,[data-testid="sidebar"]';
  const PROJECT = '[data-sidebar-project-kind="local"] [data-app-action-sidebar-project-row]';
  const CHAT_LINK = 'a[href*="/c/"],a[href*="/local/"]';
  const TITLE = '[data-thread-title],[data-jaroo-title-text]';
  const EXCLUDED_TEXT = 'svg,img,canvas,math,mjx-container,script,style,.katex,[role="menu"],[role="menuitem"],[popover],[data-native-menu-root],[data-icon-font],.iconfont,[class^="material-symbols-"],.material-icons,[hidden],[aria-hidden="true"],.sr-only,.visually-hidden';
  const OMIT = EXCLUDED_TEXT + ',button:not([data-thread-title-trigger]),[role="button"]:not([data-thread-title-trigger],[data-sidebar-archive-chatgpt-id]),[aria-haspopup]';
  const FONTS = [
    ['font-family', 'var(--jb-font, "Pretendard Variable", "Pretendard", system-ui, sans-serif)'],
    ['font-weight', 'var(--jb-weight-regular, 400)']
  ];
  const styled = new Map(), markedProjects = new Set(), mappedRows = new Map();
  let disposed = false, frame = 0, sidebars = [];

  const normalize = text => (text || '').replace(/\s+/g, ' ').trim();
  const permitted = (element, scope, omit = OMIT) => {
    const skipped = element?.closest(omit);
    return !skipped || skipped === scope || !scope.contains(skipped);
  };
  const setAttr = (element, name, value) => {
    if (!value) element.removeAttribute(name);
    else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  };

  function titleText(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const parents = new Set();
    let text = '';
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!permitted(parent, root)) continue;
      text += node.data;
      if (node.data.trim()) parents.add(parent);
    }
    return { text: normalize(text), parents };
  }

  function collectFonts(parents, root, wanted) {
    for (const parent of parents) {
      for (let element = parent; element && root.contains(element); element = element.parentElement) {
        wanted.add(element);
        if (element === root) break;
      }
    }
  }

  function projectTitle(row) {
    for (const [selector, explicit] of [
      ['[data-marquee-content]', true], ['[data-marquee-text],[data-thread-title]', true], ['.truncate,[dir="auto"]', false]
    ]) {
      const candidates = [...row.querySelectorAll(selector)]
        .filter(element => permitted(element, row, explicit ? EXCLUDED_TEXT : OMIT))
        .map(element => ({element, ...titleText(element)}))
        .filter(({text}) => text);
      if (candidates.length === 1) return candidates[0];
      if (candidates.length > 1) break;
    }
    const inferred = titleText(row);
    const [first, ...others] = inferred.parents;
    let element = first;
    while (element && others.some(parent => !element.contains(parent))) element = element.parentElement;
    return element && element !== row ? {element, ...inferred} : null;
  }

  function fullProjectName(element, row, visible) {
    const ellipsis = /(?:\.{3}|…)$/;
    if (!ellipsis.test(visible)) return '';
    const prefix = visible.replace(ellipsis, '').trimEnd();
    if (!prefix) return '';
    for (let owner = element; row.contains(owner); owner = owner.parentElement) {
      const matches = new Set(['title', 'aria-label'].map(attr => normalize(owner.getAttribute(attr)))
        .filter(name => name.startsWith(prefix) && name.length > prefix.length && !ellipsis.test(name)));
      if (matches.size === 1) return [...matches][0];
      if (matches.size > 1 || owner === row) break;
    }
    return '';
  }

  function showProject(row, wanted, seenProjects, seenRows) {
    const title = projectTitle(row);
    if (!title) return;
    const {element, text, parents} = title;
    const full = fullProjectName(element, row, text);
    seenProjects.add(element);
    seenRows.add(row);
    markedProjects.add(element);
    setAttr(element, 'data-jaroo-project-title', 'true');
    setAttr(element, 'data-jaroo-project-full-name', full);
    const org = LABELS.get(full || text);
    setAttr(row, 'data-jaroo-org', org);
    if (org) mappedRows.set(row, org);
    else mappedRows.delete(row);
    collectFonts(parents, element, wanted);
  }

  const exactFont = (element, property, value) =>
    element.style.getPropertyValue(property) === value &&
    element.style.getPropertyPriority(property) === 'important';

  function setFonts(element) {
    if (!element.style) return;
    let saved = styled.get(element);
    if (!saved) {
      saved = { hadStyle: element.hasAttribute('style'), original: new Map() };
      styled.set(element, saved);
    }
    for (const [property, value] of FONTS) {
      if (exactFont(element, property, value)) continue;
      saved.original.set(property, [element.style.getPropertyValue(property), element.style.getPropertyPriority(property)]);
      element.style.setProperty(property, value, 'important');
    }
  }

  function restoreFonts(element, saved) {
    for (const [property, value] of FONTS) {
      const previous = saved.original.get(property);
      if (previous && exactFont(element, property, value)) element.style.setProperty(property, ...previous);
    }
    if (!saved.hadStyle && element.style.length === 0) element.removeAttribute('style');
    styled.delete(element);
  }

  function clearProjectMarker(label) {
    label.removeAttribute('data-jaroo-project-title');
    label.removeAttribute('data-jaroo-project-full-name');
    markedProjects.delete(label);
  }

  function clearMappedRow(row, org) {
    if (row.getAttribute('data-jaroo-org') === org) row.removeAttribute('data-jaroo-org');
    mappedRows.delete(row);
  }

  function sync() {
    frame = 0;
    if (disposed) return;
    const wanted = new Set(), seenProjects = new Set(), seenRows = new Set();
    for (const row of document.querySelectorAll(PROJECT)) showProject(row, wanted, seenProjects, seenRows);
    sidebars = [...document.querySelectorAll(SIDEBAR)];
    for (const root of sidebars) {
      for (const link of root.querySelectorAll(CHAT_LINK)) {
        if (link.origin === location.origin &&
            (link.pathname.includes('/c/') || link.pathname.startsWith('/local/')) &&
            permitted(link, root)) collectFonts(titleText(link).parents, link, wanted);
      }
      for (const label of root.querySelectorAll(TITLE)) {
        if (!label.closest('a') && permitted(label, root)) collectFonts(titleText(label).parents, label, wanted);
      }
    }
    for (const [element, saved] of styled) if (!wanted.has(element)) restoreFonts(element, saved);
    for (const label of markedProjects) if (!seenProjects.has(label)) clearProjectMarker(label);
    for (const [row, org] of mappedRows) if (!seenRows.has(row)) clearMappedRow(row, org);
    for (const element of wanted) setFonts(element);
  }

  const schedule = () => { if (!disposed && !frame) frame = requestAnimationFrame(sync); };
  const scope = SIDEBAR + ',' + PROJECT;
  const observer = new MutationObserver(changes => {
    if (changes.some(change => {
      const target = change.target.nodeType === Node.ELEMENT_NODE ? change.target : change.target.parentElement;
      if (change.attributeName === 'style') {
        // Ignore our own writes and unrelated inline style changes.
        return styled.has(target) && FONTS.some(([property, value]) => !exactFont(target, property, value));
      }
      if (target?.closest(scope) || sidebars.some(root => root === target)) return true;
      return change.type === 'childList' && [...change.addedNodes, ...change.removedNodes].some(node =>
        node.nodeType === Node.ELEMENT_NODE && (node.matches(scope) || node.querySelector(scope)));
    })) schedule();
  });
  observer.observe(document.documentElement, {
    subtree: true, childList: true, characterData: true, attributes: true,
    attributeFilter: ['href', 'title', 'aria-label', 'aria-hidden', 'aria-haspopup', 'hidden', 'role', 'class', 'style',
      'id', 'data-testid', 'popover', 'data-native-menu-root', 'data-icon-font',
      'data-sidebar-project-kind', 'data-app-action-sidebar-project-row',
      'data-thread-title', 'data-jaroo-title-text', 'data-marquee-content', 'data-marquee-text']
  });
  document.addEventListener('visibilitychange', schedule);
  window.addEventListener('focus', schedule);
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange', schedule);
    window.removeEventListener('focus', schedule);
    for (const [element, saved] of styled) restoreFonts(element, saved);
    for (const label of markedProjects) clearProjectMarker(label);
    for (const [row, org] of mappedRows) clearMappedRow(row, org);
    if (window[RUNTIME]?.dispose === dispose) delete window[RUNTIME];
  };
  window[RUNTIME] = {version: '1.3.5', dispose};
  sync();
})();
