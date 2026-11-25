// ==UserScript==
// @name         Jaroo · Google Calendar E-Book Companion
// @namespace    jaroo.calendar.ebook
// @version      0.3.0
// @description  Cool E-Ink Graph Paper · native Calendar event labels, More popup and local agenda.
// @match        https://calendar.google.com/calendar/*
// @run-at       document-idle
// @noframes
// @grant        none
// @updateURL    https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/calendar-ebook-v0.1/calendar-ebook/companion.user.js
// @downloadURL  https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/calendar-ebook-v0.1/calendar-ebook/companion.user.js
// ==/UserScript==

/*
 * Jaroo Calendar E-Book v0.3.0 · 2026-11-25
 * Requires the paired E-Book Stylus CSS and native Light appearance.
 * Forked from the working Calendar Companion v1.3.7; history below is retained.
 * v1.3.1: preserve visually present month-grid/list colors when Calendar temporarily
 * marks the background inaccessible (aria-hidden) while event details open.
 * v1.3.2: style native Month More-popup event chips even if Google renders that popup
 * in a portal/dialog outside the calendar main root. Keep event detail cards excluded.
 * v1.3.6: the same month view can load at /calendar/u/0/r/ (default) or /month/... (explicit).
 * Preserve popup recoloring and click-triggered rescans on both routes, only if a real month grid is verified.
 * v1.3.5: live DOM-confirmed More popup is role=dialog > role=gridcell > role=button.
 * Paint its short tagged rows directly. The former generic ancestor walk stops
 * at gridcell and never reaches the dialog (seen as 0 verified overlays).
 * Quick-detail dialogs without a multi-row gridcell are never targeted.
 * v1.3.4: do not exclude a REAL floating More-popup merely because Google
 * nests it under a calendar gridcell. Diagnose popovers by geometry and
 * multi-event header/close evidence before coloring, no data sent anywhere.
 * Support headings with split title children and retain CSS v1.2 unchanged.
 * Six category colors share Model.CATEGORIES with the event palette and panel.
 * Header placement uses verified native date text and available control-free space.
 * No native header layout edits, calendar event edits or stored color changes.
 * Native rendered DOM is the only schedule source; no API or network requests.
 * Title/date/classification behavior remains v1.2. Settings/pins are document-local.
 * Controlled tests do not establish compatibility with every live Calendar layout.
 */
(function () {
  'use strict';
  if (location.hostname !== 'calendar.google.com' || window.top !== window.self) return;

  // BEGIN_JAROO_MODEL
  // MODEL_BEGIN -- date-only values never acquire an invented time/duration.
  const Model = (() => {
    const PALETTE = Object.freeze({
      meeting: '#D8EA8B', manage: '#8FE3CD', plan: '#CFC1EF', action: '#F3B9CB',
      travel: '#FFD36A', personal: '#AFCFF7', important: '#F2D778', archived: '#A2A8AC', stopped: '#C83B42'
    });
    const CATEGORIES = Object.freeze(Object.fromEntries([
      ['meeting', '회의·협의'], ['manage', '제작·관리'], ['plan', '기획·검토'],
      ['action', '실행·연락'], ['travel', '출장·외근'], ['personal', '개인·휴식']
    ].map(([key, label]) => [key, Object.freeze({ label, color: PALETTE[key] })])));
    const CATEGORY_TAGS = Object.freeze({
      '회의': 'meeting', '협의': 'meeting', '제작': 'manage', '관리': 'manage', '작업': 'manage',
      '기획': 'plan', '검토': 'plan', '실행': 'action', '연락': 'action',
      '출장': 'travel', '외근': 'travel', '개인': 'personal', '휴가': 'personal'
    });
    const STATUS_TAGS = Object.freeze({ '완료': 'completed', '취소': 'cancelled', '취소·종결': 'cancelled', '중단': 'stopped' });
    const STATUS_LABELS = Object.freeze({ completed: '완료', cancelled: '취소', stopped: '중단' });
    // Activity words only: never classify by a customer, company, person or project.
    // Boundaries avoid substring matches such as "회의연구소" or "전략기획본부".
    const ACTIVITY_WORDS = Object.freeze({
      meeting: '(?:회의|미팅|협의|면담|인터뷰|상담|(?:제안|계약|사업|업무)?검토회의|전략회의|정례회의|정기회의|주간회의|경영회의|팀장미팅)',
      manage: '(?:작성|제작|편집|수정|정리|검수|취합|업데이트|보완|재본|출력|(?:보고서|제안서|회의자료|업무보고|원고|자료)(?:작성|제작|수정|정리|검수)|(?:일정|업무)\\s*관리|디자인\\s*작업|자료\\s*준비)',
      plan: '(?:기획|검토|분석|설계|전략|(?:제안|수주|사업|운영)전략|(?:계획|전략)\\s*수립|(?:제안|자료|문서|전략)검토|(?:사전|착수|최종)?점검)',
      action: '(?:전화|통화|연락|회신|발송|제출|전달|청구|구매|결제|접수|신청|의뢰)',
      travel: '(?:출장|해외출장|국내출장|외근|현장\\s*방문|고객사\\s*방문|공항\\s*이동|기차\\s*이동)',
      personal: '(?:휴가|연차|휴식|휴무|진료|검진|치료|(?:[가-힣]{1,12})?치과|병원|가족\\s*(?:식사|외식)|저녁\\s*식사|점심\\s*식사|생일|결혼\\s*기념일|기념일|경조사|결혼식|운동)'
    });
    const ACTIVITY_RULES = Object.freeze(Object.entries(ACTIVITY_WORDS).map(([category, words]) => Object.freeze({
      category,
      present: new RegExp(`(?:^|[^\\p{L}\\p{N}_])${words}(?=$|[^\\p{L}\\p{N}_])`, 'u'),
      terminal: new RegExp(`(?:^|[^\\p{L}\\p{N}_])${words}\\s*$`, 'u')
    })));
    function keywordCategory(text) {
      // Long/negative/unclear prose keeps its native color. No frequency scoring.
      if (!text || text.length > 360) return null;
      const plain = text.replace(/\[[^\]\r\n]*\]/gu, ' ');
      if (/취소|중단|보류|미정|불참|불가|반려|제외|아님|없음|하지\s*않|안\s*(?:함|하기|해|하는|한다)|개인\s*정보/u.test(plain)) return null;
      const clauses = plain.split(/\s+(?:및|후|뒤|하고|또는|다음)\s+|[·+&/;,，]/u);
      if (clauses.length > 8) return null;
      let selected = null;
      for (const clause of clauses) {
        // A meeting/trip named as a document subject is not the scheduled activity.
        const activity = clause.replace(/(?:회의|협의|미팅|통화|출장)\s*(?=자료|보고서|계획서|기록|결과|내용|메모|요청사항)/gu, '')
          .replace(/\[[^\]\r\n]*\]/gu, ' ').replace(/\s*(?:완료|예정|착수|진행)\s*$/u, '').trim();
        const matches = ACTIVITY_RULES.filter(rule => rule.present.test(activity));
        if (!matches.length) continue;
        // Travel/personal beat generic preparation/reservation, but not another
        // substantive activity such as a meeting or document production.
        if (matches.length > 1 && matches.some(rule => rule.category === 'travel' || rule.category === 'personal')) return null;
        const terminal = matches.filter(rule => rule.terminal.test(activity));
        const category = matches.length === 1 ? matches[0].category : terminal.length === 1 ? terminal[0].category : null;
        if (!category || (selected && selected !== category)) return null;
        selected = category;
      }
      return selected;
    }
    function semantic(text) {
      const empty = { category: null, label: '', color: null, source: 'native', status: null, statusLabel: '' };
      if (typeof text !== 'string' || !text.trim() || text.length > 2048) return empty;
      // A native time/all-day prefix may precede authored tags in visible text.
      // Strip it only from this classification view, with a valid clock and an
      // immediate bracket next. It supplies no date, time, duration or status.
      const metadata = text.trimStart().replace(/^(?:(?:[01]?\d|2[0-3]):[0-5]\d|(?:오전|오후)\s*(?:1[0-2]|0?[1-9])(?:시(?:\s*[0-5]?\d분)?|:[0-5]\d)|종일)\s*(?=\[)/u, '');
      // Only the initial uninterrupted bracket sequence is authored metadata.
      // [A-03][완료] is valid; prose or a later [완료] does not change status.
      const prefix = metadata.match(/^\s*(?:\[[^\]\r\n]{1,48}\]\s*)+/u)?.[0] || '';
      const blocks = [...prefix.matchAll(/\[([^\]\r\n]{1,48})\]/gu)].map(match => match[1].trim());
      const statuses = new Set(blocks.map(block => Object.hasOwn(STATUS_TAGS, block) ? STATUS_TAGS[block] : null).filter(Boolean));
      const status = statuses.size === 1 ? [...statuses][0] : null;
      const categories = new Set(blocks.map(block => Object.hasOwn(CATEGORY_TAGS, block) ? CATEGORY_TAGS[block] : null).filter(Boolean));
      const statusFields = { status, statusLabel: status ? STATUS_LABELS[status] : '' };
      if (categories.size > 1) return { ...empty, source: 'conflict', ...statusFields };
      const explicit = categories.size === 1 ? [...categories][0] : null;
      const category = explicit || keywordCategory(metadata.slice(prefix.length));
      if (!category) return { ...empty, ...statusFields };
      return { category, label: CATEGORIES[category].label, color: CATEGORIES[category].color, source: explicit ? 'tag' : 'keyword', ...statusFields };
    }
    function isoDate(year, month, day) {
      if (![year, month, day].every(Number.isInteger) || year < 1970 || year > 2199 || month < 1 || month > 12 || day < 1 || day > 31) return null;
      const date = new Date(Date.UTC(year, month - 1, day));
      return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
        ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null;
    }
    function decodeDateKey(raw) {
      // Public Google Calendar overlays document this packed key. It is NOT YYYYMMDD.
      if (!/^\d{1,6}$/.test(String(raw ?? ''))) return null;
      const n = Number(raw), year = 1970 + Math.floor(n / 512), month = Math.floor((n % 512) / 32), day = n % 32;
      if ((year - 1970) * 512 + month * 32 + day !== n) return null;
      return isoDate(year, month, day);
    }
    function explicitDates(label) {
      const found = new Set();
      for (const match of String(label || '').matchAll(/\b(20\d{2}|21\d{2})(?:년\s*|[-/.])(\d{1,2})(?:월\s*|[-/.])(\d{1,2})(?!\d)(?:일)?/g)) {
        const date = isoDate(+match[1], +match[2], +match[3]);
        if (date) found.add(date);
      }
      return [...found];
    }
    function oneDate(keys, label = '') {
      if (!keys.length) return null;
      const decoded = keys.map(decodeDateKey);
      if (decoded.some(date => !date) || new Set(decoded).size !== 1) return null;
      const datesInLabel = explicitDates(label);
      if (datesInLabel.length && (datesInLabel.length !== 1 || datesInLabel[0] !== decoded[0])) return null;
      return decoded[0];
    }
    function parseNativeDateSuffix(label) {
      // Read a Korean date suffix from a native accessibility label, never a date
      // embedded in a title. The adapter must establish that the label is native.
      // A range's endDate is its displayed last date, not an API exclusive end.
      if (typeof label !== 'string') return null;
      const match = label.trim().match(/(?:^|[,，])\s*(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일(?:\s*([~～〜–—-])\s*(?:(?:(\d{4})\s*년\s*)?(\d{1,2})\s*월\s*)?(\d{1,2})\s*일)?$/u);
      if (!match) return null;
      const year = Number(match[1]), month = Number(match[2]);
      const date = isoDate(year, month, Number(match[3]));
      if (!date) return null;
      if (!match[4]) return { date, endDate: null, isRange: false, evidence: 'native-label-date-suffix' };
      // Omitted fields inherit only the stated year/month. Never roll an earlier
      // day into the next month, or an earlier month into the next year.
      const endDate = isoDate(match[5] ? Number(match[5]) : year, match[6] ? Number(match[6]) : month, Number(match[7]));
      if (!endDate || endDate < date) return null;
      return { date, endDate, isRange: true, evidence: 'native-label-range-suffix' };
    }
    function today(timeZone, now = new Date()) {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
      const get = type => parts.find(part => part.type === type)?.value;
      return `${get('year')}-${get('month')}-${get('day')}`;
    }
    function addDays(date, n) {
      const [year, month, day] = date.split('-').map(Number);
      const next = new Date(Date.UTC(year, month - 1, day + n));
      return next.toISOString().slice(0, 10);
    }
    function dayDiff(a, b) { return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000); }
    function tags(text) {
      // Exact authored brackets only: ordinary prose containing "마감" is not a deadline.
      const blocks = [...String(text || '').matchAll(/\[([^\]\r\n]{1,32})\]/g)].map(match => match[1].replace(/\s+/g, ' ').trim());
      const deadline = blocks.some(block => /^(?:(?:내부|최종|제출|공식|회신|오늘) )?마감(?:\s+(?:[01]?\d|2[0-3]):[0-5]\d)?$/.test(block));
      const priority = blocks.includes('중요') || blocks.includes('최우선');
      return { deadline, priority };
    }
    function timeHint(text) {
      // Preserve the exact visible time text. Do not manufacture start/end timestamps.
      const value = String(text || '').replace(/\[[^\]\r\n]*\]/g, ' ');
      const korean = value.match(/(?:오전|오후)\s*(?:1[0-2]|0?[1-9])(?:\s*[:시]\s*[0-5]?\d(?:분)?|시)(?!\d)/);
      if (korean) return korean[0].trim();
      const clock = value.match(/(?:^|\s|,)((?:[01]?\d|2[0-3]):[0-5]\d)(?=\s|$|,|~|–|-)/);
      return clock ? clock[1] : null;
    }
    // data-eventid stays opaque. A display-time label is not an occurrence ID.
    function occurrenceKey(id, date) { return JSON.stringify([id, date || null]); }
    function deduplicate(items) {
      const result = new Map();
      for (const item of items) {
        const old = result.get(item.key);
        const confidence = Number.isFinite(item.titleConfidence) ? item.titleConfidence : 0;
        const oldConfidence = Number.isFinite(old?.titleConfidence) ? old.titleConfidence : 0;
        if (!old || confidence > oldConfidence || (confidence === oldConfidence && item.title.length > old.title.length)) result.set(item.key, item);
      }
      return [...result.values()].sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || a.title.localeCompare(b.title, 'ko'));
    }
    function within(records, first, last) {
      const validDate = value => {
        const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        return !!match && isoDate(Number(match[1]), Number(match[2]), Number(match[3])) === value;
      };
      return records.filter(record => {
        if (!record.isRange) return record.date && record.date >= first && record.date <= last;
        // Native label endpoints are displayed dates, not server end-exclusive
        // timestamps. Include a range only when its validated endpoints overlap.
        if (!validDate(record.date) || !validDate(record.endDate) || record.endDate < record.date) return false;
        return record.date <= last && record.endDate >= first;
      });
    }
    return { PALETTE, CATEGORIES, semantic, isoDate, decodeDateKey, explicitDates, oneDate, parseNativeDateSuffix, today, addDays, dayDiff, tags, timeHint, occurrenceKey, deduplicate, within };
  })();
  // MODEL_END
  // END_JAROO_MODEL

  // BEGIN_JAROO_ADAPTER
  const RUNTIME = '__jarooCalendarCompanionV1';
  window[RUNTIME]?.dispose?.();
  const VERSION = '0.3.0';
  const CONFIG = Object.freeze({ timeZone: 'Asia/Seoul', futureDays: 7, maxPins: 3, maxEvents: 1200, settleMs: 180, recoveryMs: 5000 });
  const EVENT = '[data-eventid]';
  const EXCLUDE = '[role="dialog"],[role="menu"],[role="listbox"],[hidden],[inert],[aria-hidden="true"]';
  const MARKERS = ['data-jaroo-cal-event','data-jaroo-cal-color','data-jaroo-cal-title','data-jaroo-cal-date-label','data-jaroo-cal-today','data-jaroo-cal-selected','data-jaroo-cal-grid','data-jaroo-cal-month-grid','data-jaroo-cal-month-title','data-jaroo-cal-today-label','data-jaroo-cal-month-weekend','data-jaroo-cal-date-tone','data-jaroo-cal-day-header','data-jaroo-cal-more-label','data-jaroo-cal-event-time','data-jaroo-cal-brand','data-jaroo-cal-section','data-jaroo-cal-mini','data-jaroo-cal-mini-title','data-jaroo-cal-mini-day','data-jaroo-cal-mini-number','data-jaroo-cal-calendar-label','data-jaroo-cal-create-label','data-jaroo-cal-control','data-jaroo-cal-sidebar-panel','data-jaroo-cal-surface','data-jaroo-cal-deadline','data-jaroo-cal-priority','data-jaroo-cal-semantic','data-jaroo-cal-category','data-jaroo-cal-status'];
  const eventStyles = new Map(), marked = new Set(), dateCache = new WeakMap(), textRenderCache = new WeakMap();
  let markerPlan = null;
  let moreProbe = { textCandidates:0, gridAnchoredCandidates:0, verifiedOverlays:0, rowCandidates:0 };
  let roots = [], grids = [], records = [], coverage = new Set(), stats = {}, selectedDay = null;
  let enabled = true, semanticEnabled = true, disposed = false, pending = 0, recoveryTimer = 0, scanNumber = 0, dirty = true;
  let route = location.pathname, scope = accountScope(), currentDay = Model.today(CONFIG.timeZone), lastError = '';
  let host = null, shadow = null, panelOpen = false, panelFilter = 'today', uiSignature = '';
  const pins = new Set(); // Current document only. No event titles or account data persist.
  const text = value => String(value || '').replace(/\s+/g, ' ').trim();
  function accountScope() { return location.pathname.match(/\/u\/(\d+)(?:\/|$)/)?.[1] || 'unknown'; }
  function mark(node, name, value = 'true') {
    if (node.getAttribute(name) !== value) node.setAttribute(name, value);
    marked.add(node);
    if (markerPlan) {
      if (!markerPlan.has(node)) markerPlan.set(node, new Set());
      markerPlan.get(node).add(name);
    }
  }
  function removeMarker(node, name) { if (node.hasAttribute(name)) node.removeAttribute(name); }
  function visible(node) {
    if (!(node instanceof Element) || !node.isConnected || !node.getClientRects().length) return false;
    const excluded = node.closest(EXCLUDE);
    if (excluded) {
      // Calendar can set aria-hidden on the *visibly remaining* month layer
      // when its native quick-details card opens. That is an accessibility
      // state, not a paint/visibility state. Previously, the scanner dropped
      // all such events and reconcileMarkers() removed their Dracula colors.
      // Permit ONLY verified native event controls or the visible main root;
      // continue excluding actual dialogs, menus, hidden/inert and offscreen UI.
      const liveCalendarLayer = Boolean(node.closest('[aria-hidden="true"]')) &&
        !node.closest('[role="dialog"],[role="menu"],[role="listbox"],[hidden],[inert]') &&
        (node.matches('main,[role="main"]') || Boolean(node.closest(EVENT)));
      if (!liveCalendarLayer) return false;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1 ||
          rect.right <= 0 || rect.bottom <= 0 ||
          rect.left >= window.innerWidth || rect.top >= window.innerHeight) return false;
    }
    if (typeof node.checkVisibility === 'function') return node.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    const style = getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse' && style.opacity !== '0';
  }
  function inRoots(node) { return roots.some(root => root === node || root.contains(node)); }
  function nativePaintSignature(node) {
    return [node.style.backgroundColor, node.style.borderColor, node.style.color, node.parentElement?.style.borderColor || ''].join('|');
  }
  function usableColor(value) {
    if (!value || value === 'transparent' || value === 'currentcolor' || /^(?:var|url)\(/i.test(value)) return null;
    if (!CSS.supports('color', value)) return null;
    if (/rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(value) || /\/\s*0(?:%|\.0+)?\s*\)$/.test(value)) return null;
    return value;
  }
  function originalColor(node) {
    // Native inline paint only; never read our computed tint back as source color.
    for (const value of [node.style.backgroundColor, node.style.borderColor, node.parentElement?.style.borderColor]) {
      const color = usableColor(value); if (color) return color;
    }
    return null;
  }
  function rememberStyle(node, color) {
    let saved = eventStyles.get(node);
    if (!saved) {
      saved = { value: node.style.getPropertyValue('--jaroo-cal-event-color'), priority: node.style.getPropertyPriority('--jaroo-cal-event-color'), native: '' };
      eventStyles.set(node, saved);
    }
    saved.native = nativePaintSignature(node);
    if (color && node.style.getPropertyValue('--jaroo-cal-event-color') !== color) node.style.setProperty('--jaroo-cal-event-color', color);
    if (!color) restoreStyle(node);
  }
  function restoreStyle(node) {
    const saved = eventStyles.get(node); if (!saved) return;
    if (saved.value) node.style.setProperty('--jaroo-cal-event-color', saved.value, saved.priority);
    else node.style.removeProperty('--jaroo-cal-event-color');
    eventStyles.delete(node);
  }
  function cleanupNode(node) {
    for (const attr of MARKERS) removeMarker(node, attr);
    restoreStyle(node); marked.delete(node);
  }
  function mainRoots() {
    const candidates = [...document.querySelectorAll('main,[role="main"]')].filter(visible);
    return candidates.filter(node => !candidates.some(other => other !== node && other.contains(node)));
  }
  function bindRoots() {
    const next = mainRoots();
    if (next.length === roots.length && next.every((root, index) => root === roots[index])) return false;
    observer.disconnect(); roots = next;
    observeRoots();
    dirty = true; return true;
  }
  function dateFromCellLabel(label) {
    const value = text(label).replace(/^(?:오늘|선택됨)[,，]?\s*/, '')
      .replace(/[,，]?\s*[월화수목금토일]요일$/, '').replace(/\s*\([월화수목금토일]\)$/, '')
      .replace(/[,，]?\s*오늘$/, '').trim();
    if (!/^(?:20|21)\d{2}년\s*\d{1,2}월\s*\d{1,2}일$/.test(value) && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    return Model.explicitDates(value)[0] || null;
  }
  function dateInfo(node) {
    const cell = node.closest('[role="gridcell"]');
    if (!cell || !inRoots(cell) || cell.closest('[role="dialog"]')) return null;
    const cached = dateCache.get(cell);
    if (cached?.scan === scanNumber) return cached.value;
    const keys = [];
    if (cell.hasAttribute('data-datekey')) keys.push(cell.getAttribute('data-datekey'));
    for (const dateNode of cell.querySelectorAll('[data-datekey]')) {
      if (!dateNode.closest(EVENT) && dateNode.closest('[role="gridcell"]') === cell) keys.push(dateNode.getAttribute('data-datekey'));
    }
    if (!keys.length) {
      const parent = cell.parentElement?.closest('[data-datekey]');
      if (parent && inRoots(parent) && !parent.closest(EVENT) && parent.closest('[role="grid"]') === cell.closest('[role="grid"]')) keys.push(parent.getAttribute('data-datekey'));
    }
    const labelDate = dateFromCellLabel(cell.getAttribute('aria-label'));
    const keyDates = keys.map(Model.decodeDateKey).filter(Boolean);
    const conflict = new Set(keyDates).size > 1 || Boolean(labelDate && keyDates.some(date => date !== labelDate));
    const date = keys.length ? Model.oneDate(keys, cell.getAttribute('aria-label')) : labelDate;
    const value = date && (!labelDate || labelDate === date) ? { date, cell,
      evidence: keys.length ? 'packed-datekey-in-date-cell' : 'explicit-date-cell-label' } : null;
    dateCache.set(cell, { scan: scanNumber, value, conflict });
    return value;
  }
  function textIsRendered(node) {
    if (!(node instanceof Element) || !node.isConnected) return false;
    const cached = textRenderCache.get(node);
    if (cached?.scan === scanNumber) return cached.value;
    // aria-hidden is intentionally NOT a visual hiding test: visible Calendar
    // title fragments may be hidden only from screen-reader announcements.
    const style = getComputedStyle(node), rects = node.getClientRects();
    const clip = String(style.clip || '').match(/^rect\(([^)]+)\)$/);
    const edges = clip ? clip[1].split(/[,\s]+/).filter(Boolean).map(parseFloat) : [];
    const fullyClipped = edges.length === 4 && edges.every(Number.isFinite) && (edges[2] <= edges[0] || edges[1] <= edges[3]);
    const tiny = rects.length > 0 && [...rects].every(rect => rect.width <= 2 && rect.height <= 2);
    let value = !node.hasAttribute('hidden') && !node.hasAttribute('inert') &&
      !['none'].includes(style.display) && !['hidden','collapse'].includes(style.visibility) && style.opacity !== '0' &&
      !fullyClipped && !/inset\(\s*50%/i.test(String(style.clipPath || '')) && !tiny &&
      (style.display === 'contents' || rects.length > 0) && !/material|symbol|icon/i.test(style.fontFamily || '');
    if (value && node.parentElement && inRoots(node.parentElement)) value = textIsRendered(node.parentElement);
    textRenderCache.set(node, { scan: scanNumber, value });
    return value;
  }
  function nativeDescription(value) {
    // These metadata fields are present in the user's Korean Calendar capture.
    // A title that merely mentions a date is not treated as a schedule date.
    return /(?:^|[,，])\s*(?:수락됨|위치 없음|거절됨|미응답|accepted|declined|no location)\s*(?:[,，]|$)/i.test(value);
  }
  function titleParts(button, owner) {
    const labels = [], chunks = [], leaves = new Set();
    for (const element of new Set([button, owner])) {
      const label = text(element.getAttribute('aria-label')); if (label) labels.push(label);
      const ids = text(element.getAttribute('aria-labelledby')).split(' ').filter(Boolean).slice(0, 12);
      const labelled = ids.map(id => text(document.getElementById(id)?.textContent)).filter(Boolean).join(' ');
      if (labelled) labels.push(labelled);
    }
    let visited = 0;
    function visit(parent) {
      for (const child of parent.childNodes) {
        if (++visited > 200) return;
        if (child.nodeType === 3) {
          const value = text(child.textContent); if (!value) continue;
          if (parent.closest('[role="menu"],[role="listbox"],svg,button[aria-haspopup]')) continue;
          if (textIsRendered(parent)) {
            if (!/^(?:check|event|task|more_vert|done|close|cancel|notifications|location_on)$/i.test(value)) {
              chunks.push(value); leaves.add(parent);
            }
          } else if (nativeDescription(value) && Model.parseNativeDateSuffix(value)) labels.push(value);
        } else if (child instanceof Element) {
          if (child.closest('[role="menu"],[role="listbox"],svg,button[aria-haspopup]')) continue;
          const combined = text(child.textContent);
          if (!textIsRendered(child) && nativeDescription(combined) && Model.parseNativeDateSuffix(combined)) labels.push(combined);
          else visit(child);
        }
      }
    }
    visit(button);
    // Keep title punctuation and authored repetitions. Never split on commas.
    const rendered = chunks.join(' ').trim();
    const uniqueLabels = [...new Set(labels)];
    const descriptions = uniqueLabels.filter(nativeDescription);
    const simpleLabel = uniqueLabels.find(value => !nativeDescription(value));
    const title = (rendered || simpleLabel || '일정 제목 확인 필요').slice(0, 700);
    const candidates = descriptions.map(value => Model.parseNativeDateSuffix(value)).filter(Boolean);
    const fingerprints = new Set(candidates.map(value => JSON.stringify([value.date,value.endDate,value.isRange])));
    return { title, leaves: [...leaves], titleSource: rendered ? 'rendered-text' : simpleLabel ? 'simple-accessible-label' : 'unknown',
      titleConfidence: rendered ? 2 : simpleLabel ? 1 : 0,
      nativeDate: fingerprints.size === 1 ? candidates[0] : null, nativeDateConflict: fingerprints.size > 1 };
  }
  function eligibleEventButton(node) {
    if (!node || node.hasAttribute('aria-haspopup') || node.hasAttribute('aria-checked') || node.hasAttribute('aria-pressed') ||
        node.hasAttribute('disabled') || node.getAttribute('aria-disabled') === 'true') return false;
    const label = text(node.getAttribute('aria-label'));
    // A task checkbox or completion action is not an event-details opener.
    return !/^(?:완료로 표시|완료 표시|완료 취소|할 일 완료|미완료로 표시|mark (?:as )?(?:complete|incomplete)|complete task|uncomplete task)(?:$|[.:：])/i.test(label);
  }
  function eventButtons() {
    const found = new Set(); let total = 0;
    for (const root of roots) {
      for (const owner of root.querySelectorAll(EVENT)) {
        const id = owner.getAttribute('data-eventid');
        if (!id) continue;
        const choices = owner.matches('button,[role="button"]') ? [owner] : [...owner.querySelectorAll('button,[role="button"]')]
          .filter(node => node.closest(EVENT) === owner && eligibleEventButton(node));
        const button = choices.length === 1 ? choices[0] : null;
        if (!eligibleEventButton(button) || !visible(button)) continue;
        total++;
        if (found.size < CONFIG.maxEvents) found.add(button);
      }
    }
    return { buttons: [...found], total };
  }
  function recordFor(button) {
    const owner = button.closest(EVENT), id = owner?.getAttribute('data-eventid');
    if (!id || !eligibleEventButton(button) || !inRoots(button) || !visible(button)) return null;
    const parts = titleParts(button, owner); if (!parts.title) return null;
    const info = dateInfo(button), nativeDate = parts.nativeDate;
    const cellEvidence = dateCache.get(button.closest('[role="gridcell"]'));
    let date = nativeDate?.date || info?.date || null;
    let endDate = nativeDate?.endDate || null, isRange = Boolean(nativeDate?.isRange);
    let dateEvidence = nativeDate?.evidence || info?.evidence || null;
    const conflict = parts.nativeDateConflict || (cellEvidence?.scan === scanNumber && cellEvidence.conflict) || (nativeDate && info &&
      (isRange ? info.date < date || info.date > endDate : info.date !== date));
    if (conflict) { date = null; endDate = null; isRange = false; dateEvidence = 'conflicting-native-date-evidence'; }
    return { id, key: Model.occurrenceKey(id, date), date, endDate, isRange, dateEvidence,
      title: parts.title, titleSource: parts.titleSource, titleConfidence: parts.titleConfidence,
      time: Model.timeHint(parts.title), ...Model.tags(parts.title), node: button, owner,
      titleNodes: parts.leaves, nativeColor: originalColor(button),
      semantic: Model.semantic(parts.titleConfidence > 0 ? parts.title : '') };
  }

  function eventPresentation(record) {
    // Presentation rules never overwrite native event colors, dates or task state.
    const active = enabled && semanticEnabled;
    const semantic = active && record.titleConfidence > 0 ? record.semantic : null;
    const status = semantic?.status || null;
    const statusColor = status === 'stopped' ? Model.PALETTE.stopped : status ? Model.PALETTE.archived : null;
    const color = statusColor || semantic?.color || record.nativeColor || null;
    const isSemantic = Boolean(semantic?.color || status);
    return { active, color, semantic: isSemantic, category: semantic?.category || null,
      label: semantic?.label || '', source: semantic?.source || 'native', status,
      statusLabel: semantic?.statusLabel || '',
      ink: status === 'stopped' ? '#A52D35' : status ? '#535B60' : isSemantic ? '#292D30' : null,
      priority: Boolean(active && record.priority && !status),
      deadline: Boolean(active && record.deadline && !status) };
  }


  // Presentation-only: require a separate native time leaf and a different
  // non-time title leaf. Never strip text or change the event record.
  function isStandaloneEventTime(value){
    const v=text(value);
    return /^(?:(?:[01]?\d|2[0-3]):[0-5]\d|(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:AM|PM)|(?:오전|오후)\s*(?:1[0-2]|0?[1-9])(?::[0-5]\d|시(?:\s*[0-5]?\d분)?)?|종일|All day)$/iu.test(v);
  }
  function eventTimeLeaves(record){
    if(record.titleConfidence<=0||record.titleNodes.length<2)return [];
    const node=record.node;
    const leaves=record.titleNodes.filter(leaf=>leaf!==node&&node.contains(leaf)&&!leaf.childElementCount&&text(leaf.textContent)&&
      !leaf.closest('[role="menu"],[role="listbox"],svg')&&!/material|symbol|icon/i.test(getComputedStyle(leaf).fontFamily||''));
    if(!leaves.some(leaf=>!isStandaloneEventTime(leaf.textContent)))return [];
    return leaves.filter(leaf=>isStandaloneEventTime(leaf.textContent));
  }

  function paintRecord(record, touched) {
    const node = record.node, presentation = eventPresentation(record);
    mark(node, 'data-jaroo-cal-event'); touched.add(node);
    for (const titleNode of record.titleNodes) { mark(titleNode, 'data-jaroo-cal-title'); touched.add(titleNode); }
    try{for(const leaf of eventTimeLeaves(record))mark(leaf,'data-jaroo-cal-event-time');}catch(_){/* Optional time paint cannot block normal event rendering. */}
    const paint = presentation.active && presentation.color && record.titleNodes.length;
    if (paint) { rememberStyle(node, presentation.color); mark(node, 'data-jaroo-cal-color'); }
    else { removeMarker(node, 'data-jaroo-cal-color'); restoreStyle(node); }
    for (const [attribute, value] of [
      ['data-jaroo-cal-semantic', paint && presentation.semantic ? 'true' : null],
      ['data-jaroo-cal-category', paint ? presentation.category : null],
      ['data-jaroo-cal-status', paint ? presentation.status : null]
    ]) { if (value) mark(node, attribute, value); else removeMarker(node, attribute); }
    for (const [attribute, on] of [['data-jaroo-cal-deadline',presentation.deadline],['data-jaroo-cal-priority',presentation.priority]]) {
      if (on) mark(node, attribute); else removeMarker(node, attribute);
    }
  }
  function readDates() {
    const result = [], seen = new Set();
    for (const grid of grids) {
      for (const cell of grid.querySelectorAll('[role="gridcell"]')) {
        if (seen.has(cell) || cell.closest('[role="dialog"],[role="menu"],[hidden],[inert]') || !textIsRendered(cell)) continue;
        seen.add(cell);
        const info = dateInfo(cell); if (!info) continue;
        const labels = [...cell.querySelectorAll('button,[role="button"],span,div')].filter(label =>
          !label.closest(EVENT) && !label.childElementCount && text(label.textContent) === String(Number(info.date.slice(-2))));
        result.push({ ...info, labels, selected: cell.getAttribute('aria-selected') === 'true' || info.date === selectedDay });
      }
      // Some Calendar views put date metadata on the date label, outside a gridcell.
      for (const node of grid.querySelectorAll('[data-datekey],[aria-current="date"]')) {
        if (seen.has(node) || node.closest(EVENT) || node.closest('[role="dialog"],[role="menu"],[hidden],[inert]') || !textIsRendered(node)) continue;
        seen.add(node);
        const key = node.getAttribute('data-datekey'), labelDate = dateFromCellLabel(node.getAttribute('aria-label'));
        const date = key !== null ? Model.decodeDateKey(key) : labelDate || (node.getAttribute('aria-current') === 'date' ? currentDay : null);
        if (!date || labelDate && labelDate !== date) continue;
        const labels = text(node.textContent) === String(Number(date.slice(-2))) ? [node] : [];
        result.push({ date, cell: node, labels, selected: node.getAttribute('aria-selected') === 'true' || date === selectedDay });
      }
    }
    return result;
  }
  function paintDates(dates, touched) {
    coverage = new Set(dates.map(info => info.date));
    for (const grid of grids) { mark(grid, 'data-jaroo-cal-grid'); touched.add(grid); }
    for (const info of dates) {
      touched.add(info.cell);
      if (info.date === currentDay) mark(info.cell, 'data-jaroo-cal-today');
      if (info.selected) mark(info.cell, 'data-jaroo-cal-selected');
      for(const label of info.labels){
        mark(label,'data-jaroo-cal-date-label');touched.add(label);
        if(info.date===currentDay)mark(label,'data-jaroo-cal-today-label');
      }
    }
  }
  function reconcileMarkers() {
    // Recycled Calendar nodes can change roles; keep only this scan's exact markers.
    for (const node of [...marked]) {
      const expected = markerPlan?.get(node);
      if (!node.isConnected || !expected) { cleanupNode(node); continue; }
      for (const attr of MARKERS) if (!expected.has(attr)) removeMarker(node, attr);
      if (!expected.has('data-jaroo-cal-color')) restoreStyle(node);
    }
  }
  // v1.3.2: Calendar's native month "More" popup is commonly rendered in an
  // overlay portal outside main (and sometimes inside a role=dialog). Main-root
  // only scanning therefore cannot reach its event chips. Use a deliberately
  // narrow presentation-only bridge. It does not add entries to the agenda or
  // alter the event/date model, and never colors ordinary details dialogs.
  function popupRendered(node) {
    if (!(node instanceof Element) || !node.isConnected ||
        node.closest('#jaroo-calendar-companion-v1,[hidden],[inert]')) return false;
    if (typeof node.checkVisibility === 'function' &&
        !node.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1 && rect.right > 0 && rect.bottom > 0 &&
      rect.left < window.innerWidth && rect.top < window.innerHeight;
  }
  function morePopupEligible(node) {
    if (!popupRendered(node) || node.matches('main,[role="main"],[role="grid"],[role="gridcell"]') ||
        node.querySelector('[role="grid"],[role="gridcell"],input:not([type="hidden"]),textarea,[contenteditable="true"]')) return false;
    const rect = node.getBoundingClientRect();
    if (rect.width < 100 || rect.width > Math.min(460, window.innerWidth * .9) ||
        rect.height < 45 || rect.height > Math.min(820, window.innerHeight)) return false;
    const chips = [...node.querySelectorAll(EVENT)].filter(el => popupRendered(el) &&
      !el.closest('[role="grid"],[role="gridcell"]'));
    const tagged = [...node.querySelectorAll('button,[role="button"]')].filter(el =>
      popupRendered(el) && !el.closest('[role="grid"],[role="gridcell"]') &&
      /^(?:(?:오전|오후)\s*\S+\s*)?\[[^\]\r\n]{1,48}\]/u.test(text(el.textContent)));
    // A quick-detail card can have one event, but a More popup contains a
    // cluster of independently clickable events. Never style a single detail.
    return chips.length >= 2 || tagged.length >= 2;
  }
  // Google Calendar retains the chosen Month view even when the URL is its
  // account root (/calendar/u/N/r/). Older code only checked '/month', so
  // More-popup discovery AND the click-triggered rescan were both disabled at
  // that valid root route (as seen on the user's home computer).
  // On the ambiguous root route, demand a real month-sized date grid to avoid
  // accidentally affecting Week/Day/Agenda views.
  function isMonthCalendarView() {
    if (/\/month(?:\/|$)/.test(location.pathname)) return true;
    if (!/^\/calendar\/u\/\d+\/r\/?$/.test(location.pathname)) return false;
    return roots.length > 0 && grids.length > 0 && coverage.size >= 28;
  }
  function morePopupRoots() {
    if (!isMonthCalendarView()) return [];
    const result = new Set();
    const addAncestor = node => {
      for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
        if (parent.matches('main,[role="main"],[role="grid"],[role="gridcell"]') ||
            parent.querySelector('[role="grid"]')) break;
        if (morePopupEligible(parent)) { result.add(parent); break; }
      }
    };
    for (const owner of document.querySelectorAll(EVENT)) {
      if (owner.closest('[role="grid"],[role="gridcell"]') || !popupRendered(owner)) continue;
      addAncestor(owner);
    }
    // Some Calendar popover variants expose event-title buttons but no
    // data-eventid. Only a multi-item native dialog/listbox can use this path.
    for (const dialog of document.querySelectorAll('[role="dialog"],[role="listbox"]')) {
      if (morePopupEligible(dialog)) result.add(dialog);
    }
    // Prefer the outermost verified popover when both wrapper and inner list
    // were discovered; prevents duplicate coloring and keeps click native.
    return [...result].filter(el => ![...result].some(other => other !== el && other.contains(el)));
  }
  function popupRecord(button) {
    if (!popupRendered(button) || !eligibleEventButton(button)) return null;
    const owner = button.closest(EVENT);
    const display = text(button.textContent) || text(button.getAttribute('aria-label'));
    if (!display || display.length > 700) return null;
    const parts = owner ? titleParts(button, owner) : null;
    const title = parts?.titleConfidence ? parts.title : display;
    const titleNodes = (parts?.leaves?.length ? parts.leaves :
      [...button.querySelectorAll('span,div')].filter(el =>
        !el.children.length && popupRendered(el) && text(el.textContent)));
    if (!titleNodes.length) titleNodes.push(button);
    const semantic = Model.semantic(title);
    // For untagged items, accept only verified native event owners. Never
    // recast arbitrary popup controls/buttons as calendar events.
    if (!owner && !semantic.color && !semantic.status) return null;
    return { node:button, owner:owner || button, title, titleNodes,
      titleConfidence:parts?.titleConfidence || 2, semantic,
      nativeColor:originalColor(button), deadline:false, priority:false };
  }
  function paintMorePopup(touched) {
    let count = 0;
    for (const popup of morePopupRoots()) {
      mark(popup,'data-jaroo-cal-surface','more');touched.add(popup);
      const seen = new Set();
      for (const owner of popup.querySelectorAll(EVENT)) {
        if (owner.closest('[role="grid"],[role="gridcell"]')) continue;
        const choices = owner.matches('button,[role="button"]') ? [owner] :
          [...owner.querySelectorAll('button,[role="button"]')].filter(node =>
            node.closest(EVENT) === owner && eligibleEventButton(node));
        const button = choices.length === 1 ? choices[0] :
          choices.length ? null : owner;
        if (!button || seen.has(button)) continue;
        const record = popupRecord(button);
        if (!record) continue;
        seen.add(button); paintRecord(record, touched); count++;
        if (count >= CONFIG.maxEvents) break;
      }
      // Fallback for a native More-list layout without event-id attributes.
      for (const button of popup.querySelectorAll('button,[role="button"]')) {
        if (seen.has(button) || button.closest(EVENT) || !popupRendered(button)) continue;
        const record = popupRecord(button);
        if (!record?.semantic?.color && !record?.semantic?.status) continue;
        seen.add(button); paintRecord(record, touched); count++;
        if (count >= CONFIG.maxEvents) break;
      }
      if (count >= CONFIG.maxEvents) break;
    }
    return count;
  }
  // v1.3.3: Google may render the small Month More list using plain DIV chips,
  // neither button nor data-eventid. The former detector did not consider such
  // chips. This adapter deliberately requires a multi-event OVERLAY outside
  // the date grid; a single details card / calendar list is never targeted.
  const MORE_TAG_START = /^\s*(?:[•●]\s*)?(?:(?:오전|오후)\s*\d{1,2}(?:시|:\d{2})\s*|\d{1,2}:\d{2}\s*)?(?:\[[^\]\r\n]{1,48}\]\s*)+/u;
  function moreSemanticText(value) {
    const cleaned = text(value).replace(/^\s*[•●]\s*/u, '');
    if (!cleaned || cleaned.length > 220 || !MORE_TAG_START.test(cleaned)) return null;
    const semantic = Model.semantic(cleaned);
    return semantic.color || semantic.status ? { title:cleaned, semantic } : null;
  }
  function moreChipForLeaf(leaf) {
    if (!leaf?.isConnected || !popupRendered(leaf)) return null;
    // A real floating More popover may live INSIDE a gridcell in Google Calendar.
    // Do not exclude that location until a specific overlay is verified.
    if (leaf.closest('#jaroo-calendar-companion-v1,[hidden],[inert]')) return null;
    let best = null, bestScore = -999;
    for (let node = leaf, depth=0; node && node !== document.body && depth < 8; node=node.parentElement,depth++) {
      if (node.matches('[role="gridcell"],[role="grid"],main,[role="main"]')) break;
      if (!popupRendered(node)) continue;
      const rect = node.getBoundingClientRect();
      if (rect.width < 43 || rect.width > 430 || rect.height < 13 || rect.height > 48) continue;
      const info = moreSemanticText(node.textContent);
      if (!info) continue;
      const style = getComputedStyle(node);
      const bg = style.backgroundColor || '';
      const coloredBg = bg && bg !== 'transparent' && !/^rgba?\(0,\s*0,\s*0,\s*0(?:\.0+)?\)$/.test(bg);
      const interactive = node.matches('button,[role="button"],[data-eventid],[role="listitem"],[tabindex]');
      const score = (coloredBg ? 6 : 0) + (interactive ? 8 : 0) + (rect.width > 100 ? 2 : 0) +
          (rect.height > 16 ? 1 : 0) + depth * .35;
      if (score > bestScore) {best={node,info}; bestScore=score;}
    }
    return best;
  }
  function overlayForMoreChip(node) {
    for (let ancestor=node.parentElement, depth=0; ancestor && ancestor!==document.body && depth<9;
          ancestor=ancestor.parentElement, depth++) {
      if (!popupRendered(ancestor)) continue;
      const rect=ancestor.getBoundingClientRect();
      if (rect.width < 105 || rect.width > 440 || rect.height < 53 || rect.height > 850) continue;
      // Never color the whole date grid. A nested popup is evaluated BEFORE
      // reaching this boundary, even if its parent gridcell contains it.
      if (ancestor.matches('[role="grid"],[role="gridcell"],main,[role="main"]')) break;
      if (ancestor.querySelector('[role="grid"],[role="gridcell"]')) continue;
      const txt=text(ancestor.textContent);
      if (!txt || txt.length > 1800) continue;
      const tags=[...txt.matchAll(/\[[^\]\r\n]{1,48}\]/gu)];
      if (tags.length < 2) continue;
      const role=ancestor.getAttribute('role');
      let floating = role==='dialog' || role==='listbox';
      for (let parent=ancestor; parent && parent!==document.body && !floating; parent=parent.parentElement) {
        const st=getComputedStyle(parent);
        if (st.position==='fixed' || (st.position==='absolute' && st.zIndex!=='auto')) floating=true;
      }
      // Google More cards have a day header and close button, and may be
      // absolutely positioned without a declared dialog role.
      const controls=[...ancestor.querySelectorAll('button,[role="button"]')].slice(0,30);
      const close=controls.some(el => /(?:^|\s)(?:×|✕|x|close|닫기)(?:\s|$)/iu.test(
          text(el.getAttribute('aria-label')) || text(el.getAttribute('title')) || text(el.textContent)));
      const day=/\b\d{1,2}\b/u.test(txt.slice(0,60));
      if (!floating && !(close && day)) continue;
      // The first compact ancestor containing at least two event tags is the
      // safest match; it excludes the whole month calendar and detail panels.
      return ancestor;
    }
    return null;
  }
  // v1.3.5 - TARGETED REPAIR, grounded in the representative's actual
  // Calendar DOM capture (2026-11-21). The More popup is not a detached list:
  // dialog (224x314) > presentation wrappers > gridcell (216x216) >
  // presentation > absolute-positioned row > role=button (205x22).
  // Previous fallback stopped at gridcell, so never verified the dialog.
  // Require TWO independent compact tagged event controls inside the same
  // visible dialog+gridcell. This avoids coloring a single event's detail card.
  function paintNativeGridDialogMore(touched) {
    let painted = 0, popups = 0, discoveredRows = 0;
    for (const dialog of document.querySelectorAll('[role="dialog"]')) {
      if (!popupRendered(dialog) || dialog.closest('#jaroo-calendar-companion-v1')) continue;
      const box = dialog.getBoundingClientRect();
      if (box.width < 130 || box.width > 470 || box.height < 75 || box.height > 850) continue;
      if (!dialog.querySelector('[role="gridcell"]')) continue;
      const rows = [];
      const used = new Set();
      for (const button of dialog.querySelectorAll('[role="gridcell"] [role="button"],[role="gridcell"] button')) {
        if (used.has(button) || !popupRendered(button) || !eligibleEventButton(button)) continue;
        const cell = button.closest('[role="gridcell"]');
        if (!cell || !dialog.contains(cell)) continue;
        const r = button.getBoundingClientRect();
        if (r.width < 32 || r.width > 460 || r.height < 11 || r.height > 55) continue;
        const info = moreSemanticText(button.textContent);
        if (!info) continue;
        used.add(button); rows.push({ button, info });
      }
      discoveredRows += rows.length;
      if (rows.length < 2) continue;
      mark(dialog,'data-jaroo-cal-surface','more');touched.add(dialog);
      popups++;
      for (const { button, info } of rows) {
        const titleNodes = [...button.querySelectorAll('span,div')].filter(node =>
          !node.childElementCount && popupRendered(node) && text(node.textContent));
        if (!titleNodes.length) titleNodes.push(button);
        const record = {
          node: button, owner: button, title: info.title, titleNodes,
          titleConfidence: 2, semantic: info.semantic,
          nativeColor: originalColor(button), deadline: false, priority: false
        };
        paintRecord(record, touched);
        if (++painted >= CONFIG.maxEvents) break;
      }
      if (painted >= CONFIG.maxEvents) break;
    }
    return { painted, popups, discoveredRows };
  }
  function paintMorePlainRows(touched) {
    if (!isMonthCalendarView()) return 0;
    // Prefer the verified live dialog/gridcell path. Keep the previous
    // portal/plain-row adapter only for Calendar variants without this layout.
    const nested = paintNativeGridDialogMore(touched);
    if (nested.popups) {
      moreProbe = { textCandidates:nested.discoveredRows,
        gridAnchoredCandidates:nested.discoveredRows,
        verifiedOverlays:nested.popups, rowCandidates:nested.painted };
      return nested.painted;
    }
    const leaves=new Set(), seen=new Map();
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    let scanned=0;
    for(let t=walker.nextNode();t && scanned++<16000;t=walker.nextNode()){
      const str=String(t.nodeValue||'').trim();
      if(str && str.length<=220 && MORE_TAG_START.test(str) && t.parentElement) leaves.add(t.parentElement);
    }
    // Google sometimes separates the authored tag and title into neighboring
    // spans. The individual text nodes then do not start with a complete tag.
    // Use only SHORT visible row candidates, not broad panel text blocks.
    // Do not depend on data-eventid, dialog roles or portal placement.
    let candidates=0;
    for(const el of document.querySelectorAll('button,[role="button"],[role="listitem"],span,div')){
      if(++candidates>14000) break;
      if(el.closest('#jaroo-calendar-companion-v1,[hidden],[inert]')) continue;
      if(el.childElementCount>5 || !el.isConnected) continue;
      const val=text(el.textContent);
      if(!val || val.length>220 || !MORE_TAG_START.test(val)) continue;
      const rect=el.getBoundingClientRect();
      if(rect.width<24 || rect.width>440 || rect.height<10 || rect.height>52) continue;
      leaves.add(el);
    }
    moreProbe={ textCandidates:leaves.size,gridAnchoredCandidates:0,verifiedOverlays:0,rowCandidates:0 };
    for(const leaf of leaves){
      if(!popupRendered(leaf)) continue;
      if(leaf.closest('[role="grid"],[role="gridcell"]')) moreProbe.gridAnchoredCandidates++;
      const chip=moreChipForLeaf(leaf);
      if(!chip) continue;
      const pop=overlayForMoreChip(chip.node);
      if(!pop) continue;
      let group=seen.get(pop);if(!group){group=new Map();seen.set(pop,group);}
      group.set(chip.node,chip.info);
    }
    moreProbe.verifiedOverlays=seen.size;
    let painted=0;
    for (const [popup,groups] of seen) {
      if (groups.size<2) continue;
      mark(popup,'data-jaroo-cal-surface','more');touched.add(popup);
      moreProbe.rowCandidates+=groups.size;
      for(const [node,info] of groups) {
        const titleNodes=[...node.querySelectorAll('span,div')].filter(x=>
          !x.childElementCount && popupRendered(x) && text(x.textContent));
        if(!titleNodes.length) titleNodes.push(node);
        const r={node,owner:node,title:info.title,titleNodes,
          titleConfidence:2,semantic:info.semantic,nativeColor:originalColor(node),
          deadline:false,priority:false};
        paintRecord(r,touched);painted++;
        if(painted>=CONFIG.maxEvents) return painted;
      }
    }
    return painted;
  }

  // v0.2: discover only the calendar's presentation chrome. The existing
  // calendar scan owns scheduling/cleanup. This never creates event records,
  // relocates DOM nodes, clicks native controls, or rewrites text.
  const CHROME_CONTROL='button,[role="button"],[role="tab"]';
  const CHROME_LABEL='span,div,h1,h2,h3,[role="heading"],button,[role="button"],a';
  const CHROME_EXCLUDED='[hidden],[inert],[role="dialog"],[role="menu"],[role="listbox"],[data-eventid]';
  function chromeControlKind(values,area,isSegment=false,hasPopup=false){
    const labels=values.map(text).filter(Boolean);
    if(area==='sidebar'){
      return labels.some(v=>/^(?:만들기|일정 만들기|새 일정 만들기|Create(?: event)?)$/iu.test(v))?'create':null;
    }
    if(labels.some(v=>/^(?:오늘|Today)(?:\s*\([^)]*\))?$/iu.test(v)))return 'today';
    if(labels.some(v=>/^(?:업그레이드|Upgrade)$/iu.test(v)))return 'upgrade';
    if(isSegment&&labels.some(v=>/^(?:Calendar|Google Calendar|Tasks|Google Tasks|캘린더|할 일|일정)$/iu.test(v)))return 'segment';
    if(hasPopup&&labels.some(v=>/^(?:월|월간|주|주간|일|일간|연도|일정|4일|Month|Week|Day|Year|Schedule|4 days)(?:\s*보기)?$/iu.test(v)))return 'view';
    return null;
  }
  function chromeBox(node,cache){
    if(cache.has(node))return cache.get(node);
    let result=null;
    if(node instanceof Element&&node.isConnected&&!node.closest(CHROME_EXCLUDED)){
      const r=node.getBoundingClientRect(),s=getComputedStyle(node);
      if(r.width>2&&r.height>2&&r.right>0&&r.bottom>0&&r.left<innerWidth&&r.top<innerHeight&&
         s.display!=='none'&&!['hidden','collapse'].includes(s.visibility)&&s.opacity!=='0'&&
         !/inset\(\s*50%/i.test(s.clipPath||'')&&!/^rect\(0(?:px)?[, ]+0(?:px)?[, ]+0(?:px)?[, ]+0(?:px)?\)$/i.test(s.clip||''))result=r;
    }
    cache.set(node,result);return result;
  }
  function exactChromeLabels(root,match,cache,limit=700){
    const found=[];
    let n=0;
    for(const node of root.querySelectorAll(CHROME_LABEL)){
      if(++n>limit)break;
      if(node.closest(CHROME_EXCLUDED))continue;
      const value=text(node.textContent);
      if(value.length>80||!match(value)||!chromeBox(node,cache))continue;
      found.push(node);
    }
    return found.filter(node=>!found.some(other=>node!==other&&node.contains(other)));
  }
  function railPanelPaintEligible(style,owned=false){
    if(owned)return true;
    const rgb=(style.backgroundColor||'').match(/[\d.]+/g)?.map(Number)||[];
    return rgb.length>=3&&Math.min(...rgb.slice(0,3))>=195&&
      Math.max(...rgb.slice(0,3))-Math.min(...rgb.slice(0,3))<=18&&
      (rgb.length===3||rgb[3]>=.75)&&(!style.backgroundImage||style.backgroundImage==='none');
  }
  function inspectCalendarChrome(){
    const cache=new WeakMap(),box=node=>chromeBox(node,cache),plan=[];
    const miniDayPriority=new Map();
    const add=(node,name,value='true')=>{
      if(!node)return;
      if(name==='data-jaroo-cal-mini-day'){
        if(miniDayPriority.get(node)==='today')return;
        miniDayPriority.set(node,value);
      }
      plan.push([node,name,value]);
    };
    const mainBoxes=roots.map(box).filter(Boolean);
    const mainLeft=mainBoxes.length?Math.min(...mainBoxes.map(r=>r.left)):innerWidth;
    const headers=[...document.querySelectorAll('[role="banner"],header')].filter(node=>{
      const r=box(node);return r&&r.top<100&&r.height>=26&&r.height<=160&&r.width>=Math.min(280,innerWidth*.6)&&!node.closest(EVENT);
    }).slice(0,12);
    let header=null,month=null;
    for(const node of headers){
      const labels=exactChromeLabels(node,hdrIsMonthLabel,cache,500);
      if(labels.length===1){header=node;month=labels[0];break;}
    }
    header=header||headers.find(n=>n.matches('[role="banner"]'))||headers[0]||null;
    const names=node=>[node.getAttribute('aria-label'),node.getAttribute('title'),node.textContent];
    const roleControl=(node,area)=>{
      const segment=node.hasAttribute('aria-pressed')||node.hasAttribute('aria-selected')||node.getAttribute('role')==='tab';
      const popup=node.hasAttribute('aria-haspopup')||node.hasAttribute('aria-expanded');
      const result=chromeControlKind(names(node),area,segment,popup);
      if(result)return result;
      // Material controls may include text glyphs (add / arrow_drop_down).
      // Only small control descendants with an exact label are considered.
      if(node.childElementCount>8)return null;
      const leaves=[...node.querySelectorAll('span,div')].slice(0,24)
        .filter(n=>!n.childElementCount&&n.getAttribute('aria-hidden')!=='true')
        .map(n=>n.textContent);
      return chromeControlKind(leaves,area,segment,popup);
    };
    if(header){
      add(header,'data-jaroo-cal-surface','header');add(month,'data-jaroo-cal-month-title');
      const brands=exactChromeLabels(header,v=>/^(?:Calendar|Google Calendar|캘린더)$/iu.test(v),cache,500)
        .filter(node=>!node.closest('[aria-pressed],[aria-selected],[role="tab"]'));
      if(brands.length===1)add(brands[0],'data-jaroo-cal-brand');
      for(const control of header.querySelectorAll(CHROME_CONTROL)){
        const kind=roleControl(control,'header');
        if(kind&&box(control))add(control,'data-jaroo-cal-control',kind);
      }
    }
    // Find the real left rail using its own calendar labels and bounded
    // geometry. In particular, never mark main or a right-side add-on rail.
    const sectionMatch=v=>/^(?:내 캘린더|다른 캘린더|예약 페이지|My calendars|Other calendars|Booking pages)$/iu.test(v);
    const railCandidates=new Set(document.querySelectorAll('aside,[role="complementary"],[role="navigation"]'));
    const railBox=node=>{
      if(!node||node===document.body||node===document.documentElement||roots.some(root=>root===node||root.contains(node)||node.contains(root))||header?.contains(node)||(header&&node.contains(header)))return null;
      const r=box(node);
      return r&&r.width>=115&&r.width<=430&&r.height>=160&&r.left>=-6&&r.left<=100&&r.right<=mainLeft+16?r:null;
    };
    for(const root of roots){
      for(let p=root,depth=0;p&&depth<5&&p!==document.body;p=p.parentElement,depth++){
        for(const sibling of p.parentElement?.children||[]){
          if(sibling!==p&&railBox(sibling))railCandidates.add(sibling);
        }
      }
    }
    // Fallback for Calendar builds without semantic aside/complementary.
    // Only the explicitly named create control is used as an anchor.
    let controlsSeen=0;
    for(const control of document.querySelectorAll(CHROME_CONTROL)){
      if(inRoots(control)||header?.contains(control)||control.closest(CHROME_EXCLUDED))continue;
      if(++controlsSeen>180)break;
      if(roleControl(control,'sidebar')!=='create'||!box(control))continue;
      for(let p=control.parentElement,depth=0;p&&depth<10&&p!==document.body;p=p.parentElement,depth++)
        if(railBox(p))railCandidates.add(p);
    }
    const rails=[];
    for(const node of railCandidates){
      const r=railBox(node);if(!r)continue;
      const label=text(node.textContent);
      const hasSection=/(?:내 캘린더|다른 캘린더|예약 페이지|My calendars|Other calendars|Booking pages)/iu.test(label);
      const hasMini=Boolean(node.querySelector('[role="grid"],table'));
      const hasCreate=[...node.querySelectorAll(CHROME_CONTROL)].slice(0,100).some(c=>roleControl(c,'sidebar')==='create');
      if((hasSection&&(hasMini||hasCreate))||(hasMini&&hasCreate))rails.push({node,r});
    }
    rails.sort((a,b)=>b.r.width*b.r.height-a.r.width*a.r.height);
    const rail=rails[0]?.node||null;
    if(rail){
      add(rail,'data-jaroo-cal-surface','sidebar');
      const railRect=box(rail),panels=new Set();
      const markRailAncestors=anchor=>{
        for(let p=anchor.parentElement,depth=0;p&&p!==rail&&depth<8;p=p.parentElement,depth++){
          if(p.matches(CHROME_CONTROL+',label,[role="checkbox"],[role="grid"],table')||p.closest('[role="grid"],table'))continue;
          const r=box(p);if(!r||r.width<railRect.width*.70||r.height<20)continue;
          const style=getComputedStyle(p);
          // Keep an already-owned paint marker on the same verified rail
          // wrapper. Its computed background is now transparent by design.
          // Re-testing that as native paint would alternate every scan.
          if(!railPanelPaintEligible(style,p.hasAttribute('data-jaroo-cal-sidebar-panel')))continue;
          if(!panels.has(p)){panels.add(p);add(p,'data-jaroo-cal-sidebar-panel');}
        }
      };
      for(const label of exactChromeLabels(rail,sectionMatch,cache)){
        add(label,'data-jaroo-cal-section');markRailAncestors(label);
      }
      for(const row of rail.querySelectorAll('[role="checkbox"],label')){
        if(!box(row)||row.closest('[role="grid"],table'))continue;
        if(row.matches('label')&&!row.querySelector('input[type="checkbox"]'))continue;
        const leaves=[...row.querySelectorAll('span,div')].slice(0,25).filter(node=>
          !node.childElementCount&&node.getAttribute('aria-hidden')!=='true'&&text(node.textContent).length>0&&
          text(node.textContent).length<=80&&box(node)&&!/material|symbol|icon/i.test(getComputedStyle(node).fontFamily||''));
        if(leaves.length===1)add(leaves[0],'data-jaroo-cal-calendar-label');
      }
      for(const control of rail.querySelectorAll(CHROME_CONTROL)){
        if(roleControl(control,'sidebar')==='create'&&box(control)){
          add(control,'data-jaroo-cal-control','create');markRailAncestors(control);
          const labels=exactChromeLabels(control,v=>/^(?:만들기|Create)$/iu.test(v),cache,40);
          if(labels.length===1)add(labels[0],'data-jaroo-cal-create-label');
        }
      }
      const miniGrids=[...rail.querySelectorAll('[role="grid"],table')].filter(node=>{
        const r=box(node);
        return r&&r.width>=75&&r.width<=370&&r.height>=75&&r.height<=350&&node.querySelectorAll('[role="gridcell"],td,button,[role="button"]').length>=20&&!node.querySelector(EVENT);
      });
      const mini=miniGrids.find(node=>!miniGrids.some(other=>other!==node&&other.contains(node)));
      if(mini){
        add(mini,'data-jaroo-cal-mini');markRailAncestors(mini);
        const number=v=>/^(?:[1-9]|[12]\d|3[01])$/u.test(v);
        for(const leaf of mini.querySelectorAll('span,div,button,[role="button"],[role="gridcell"],td')){
          if(leaf.childElementCount||!number(text(leaf.textContent))||!box(leaf)||
             /material|symbol|icon/i.test(getComputedStyle(leaf).fontFamily||''))continue;
          add(leaf,'data-jaroo-cal-mini-number');
        }
        const candidates=[...mini.querySelectorAll('[aria-current="date"],[aria-selected="true"]')];
        for(const node of candidates){
          if(!box(node))continue;
          const numeric=v=>/^(?:[1-9]|[12]\d|3[01])$/u.test(v);
          const today=node.getAttribute('aria-current')==='date';
          let target=null;
          if(node.matches(CHROME_CONTROL)&&numeric(text(node.textContent)))target=node;
          else {
            const buttons=[...node.querySelectorAll(CHROME_CONTROL)].filter(n=>numeric(text(n.textContent))&&box(n));
            if(buttons.length===1)target=buttons[0];
            else if(numeric(text(node.textContent)))target=node;
          }
          if(target)add(target,'data-jaroo-cal-mini-day',today||target.getAttribute('aria-current')==='date'?'today':'selected');
        }
        // Some builds expose the current mini day only as a date label. Do
        // not guess from the day number: require an explicit full date.
        for(const node of mini.querySelectorAll('[aria-label],[data-datekey]')){
          if(!box(node)||!node.matches(CHROME_CONTROL)||!/^\d{1,2}$/.test(text(node.textContent)))continue;
          const labelDate=dateFromCellLabel(node.getAttribute('aria-label'));
          const rawKey=node.getAttribute('data-datekey');const key=rawKey===null?null:Model.decodeDateKey(rawKey);
          if((labelDate||key)===currentDay&&(!labelDate||!key||labelDate===key))add(node,'data-jaroo-cal-mini-day','today');
        }
        const miniTitles=exactChromeLabels(rail,hdrIsMonthLabel,cache);
        if(miniTitles.length===1)add(miniTitles[0],'data-jaroo-cal-mini-title');
      }
    }
    // Native event detail/editor dialogs are not event-classification sources.
    // Only paint their own bounded, opaque surface, not transparent overlays,
    // color-picker contents, or full-viewport modal wrappers.
    for(const dialog of document.querySelectorAll('[role="dialog"]')){
      if(!popupRendered(dialog)||dialog.closest('#jaroo-calendar-companion-v1'))continue;
      const r=dialog.getBoundingClientRect(),s=getComputedStyle(dialog);
      if(r.width<180||r.width>Math.min(innerWidth*.94,880)||r.height<70||r.height>innerHeight*.95)continue;
      if(s.backgroundColor==='transparent'||/^rgba\([^)]*,\s*0(?:\.0+)?\s*\)$/i.test(s.backgroundColor))continue;
      if(dialog.querySelector('[role="gridcell"],[role="listbox"],[role="menu"]'))continue;
      add(dialog,'data-jaroo-cal-surface','detail');
    }
    return plan;
  }


  // Require an exact visible month heading and a month-sized set of dates
  // in the same grid. No date is guessed from a day number.
  function displayMonthKey(value){
    const v=text(value);
    if(!hdrIsMonthLabel(v))return null;
    let m=v.match(/^(\d{4})년\s*(\d{1,2})월$/u);
    if(m)return m[1]+'-'+m[2].padStart(2,'0');
    m=v.match(/^([A-Za-z]+)\s+(\d{4})$/u);
    if(!m)return null;
    const n=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[1].slice(0,3).toLowerCase());
    return n<0?null:m[2]+'-'+String(n+1).padStart(2,'0');
  }
  function monthDateKind(date,month){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!month)return null;
    const day=new Date(date+'T00:00:00Z');
    if(!Number.isFinite(day.getTime())||day.toISOString().slice(0,10)!==date)return null;
    return {outside:date.slice(0,7)!==month,weekend:day.getUTCDay()===0||day.getUTCDay()===6};
  }
  function weekdayKind(value){
    const v=text(value).toLowerCase();
    if(/^(?:토(?:요일)?|일(?:요일)?|sat(?:urday)?\.?|sun(?:day)?\.?)$/u.test(v))return 'weekend';
    if(/^(?:[월화수목금](?:요일)?|mon(?:day)?\.?|tue(?:sday)?\.?|wed(?:nesday)?\.?|thu(?:rsday)?\.?|fri(?:day)?\.?)$/u.test(v))return 'weekday';
    return null;
  }
  function isMoreLabel(value){
    return /^(?:\+?\d{1,3}\s*(?:개\s*)?(?:더\s*보기|more)|(?:더\s*보기|more)\s*\(\d{1,3}\))$/iu.test(text(value));
  }
  function paintMonthDetails(dates,chromePlan){
    if(!isMonthCalendarView())return;
    const headings=chromePlan.filter(([,key])=>key==='data-jaroo-cal-month-title').map(([node])=>displayMonthKey(node.textContent));
    if(headings.length!==1||!headings[0])return;
    const month=headings[0],groups=new Map();
    for(const info of dates){
      const grid=info.cell.closest('[role="grid"]');
      if(!grid||!grids.includes(grid))continue;
      if(!groups.has(grid))groups.set(grid,[]);
      groups.get(grid).push(info);
    }
    for(const [grid,items] of groups){
      const distinct=new Set(items.map(i=>i.date));
      if(distinct.size<28||[...distinct].filter(d=>d.slice(0,7)===month).length<20)continue;
      for(const info of items){
        const kind=monthDateKind(info.date,month);if(!kind)continue;
        if(kind.weekend&&info.cell.matches('[role="gridcell"]'))mark(info.cell,'data-jaroo-cal-month-weekend');
        if(kind.outside&&info.date!==currentDay&&!info.selected)for(const label of info.labels)
          if(textIsRendered(label))mark(label,'data-jaroo-cal-date-tone','outside');
      }
      for(const header of grid.querySelectorAll('[role="columnheader"]')){
        if(header.closest('[role="grid"]')!==grid||header.closest(EVENT)||!textIsRendered(header))continue;
        const kind=weekdayKind(header.textContent)||weekdayKind(header.getAttribute('aria-label'));
        if(kind)mark(header,'data-jaroo-cal-day-header',kind);
      }
      for(const control of grid.querySelectorAll('button,[role="button"]')){
        if(control.closest('[role="grid"]')!==grid||control.closest(EVENT)||!textIsRendered(control)||!isMoreLabel(control.textContent))continue;
        const leaves=[...control.querySelectorAll('span,div')].filter(n=>!n.childElementCount&&isMoreLabel(n.textContent)&&textIsRendered(n));
        mark(leaves.length===1?leaves[0]:control,'data-jaroo-cal-more-label');
      }
    }
  }

  function collect() {
    scanNumber++;
    // Finish all layout/style reads before applying any of our markers/styles.
    grids = [...new Set(roots.flatMap(root => [...root.querySelectorAll('[role="grid"]')]))]
      .filter(grid => visible(grid) && (grid.querySelector('[data-datekey],[aria-current="date"]') || grid.querySelector(EVENT)));
    const dates = readDates();
    let chromePlan=[];
    try{chromePlan=inspectCalendarChrome();}catch(_){/* Chrome decoration must never block schedule processing. */}
    const { buttons, total } = eventButtons();
    const collected = buttons.map(recordFor).filter(Boolean);
    const touched = new Set();
    let morePopupPainted = 0;
    markerPlan = new Map();
    try {
      for (const root of roots) { mark(root, 'data-jaroo-cal-surface', 'main'); touched.add(root); }
      for(const [node,attr,value] of chromePlan){mark(node,attr,value);touched.add(node);}
      paintDates(dates, touched);
      // Month cells are paper; do not lay a decorative grid over hour slots.
      if (isMonthCalendarView()) for (const grid of grids) {
        if (grid.querySelector('[role="gridcell"]')) { mark(grid, 'data-jaroo-cal-month-grid'); touched.add(grid); }
      }
      try{paintMonthDetails(dates,chromePlan);}catch(_){/* Keep the base date paint. */}
      for (const record of collected) paintRecord(record, touched);
      // Popover chips may be outside roots; paint them in the same marker pass.
      morePopupPainted = paintMorePopup(touched);
      // v1.3.3: native More list can be DIV-only, unlike the old button mock.
      morePopupPainted += paintMorePlainRows(touched);
      reconcileMarkers();
    } finally { markerPlan = null; }
    records = Model.deduplicate(collected);
    stats = { grids: grids.length, dateCells: coverage.size, eventElements: total, datedRecords: records.filter(record => record.date).length,
      undatedRecords: records.filter(record => !record.date).length, nativeLabelDatedRecords: records.filter(record => record.dateEvidence?.startsWith('native-label-')).length, rangeRecords: records.filter(record => record.isRange).length, unknownTitles: records.filter(record => !record.titleConfidence).length,
      coloredElements: collected.filter(record => { const p = eventPresentation(record); return p.active && p.color && record.titleNodes.length; }).length,
      semanticItems: records.filter(record => eventPresentation(record).semantic).length,
      inferredCategoryItems: records.filter(record => eventPresentation(record).source === 'keyword').length,
      explicitStatusItems: records.filter(record => eventPresentation(record).status).length,
      morePopupPainted, truncated: total > CONFIG.maxEvents, scannedAt: new Date().toISOString() };
  }
  // END_JAROO_ADAPTER

  // BEGIN_JAROO_UI
  // Shadow UI owns its own styles; it does not replace Calendar's native views.
  let uiReturnFocus = null;
  const uiDateFormatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: CONFIG.timeZone, month: 'long', day: 'numeric', weekday: 'short'
  });
  const uiCSS = `
    :host{all:initial;position:fixed;right:64px;bottom:22px;z-index:2147483000;
      color-scheme:light;color:#292D30;font:13px/1.55 "Jaroo Cal Plex Latin","Pretendard Variable","Pretendard","Noto Sans KR",sans-serif;
      pointer-events:none;text-align:left;direction:ltr}
    *{box-sizing:border-box}
    [hidden]{display:none!important}
    button,input,textarea{font:inherit}
    button{color:inherit;cursor:pointer}
    button:focus-visible,input:focus-visible,textarea:focus-visible,summary:focus-visible{
      outline:2px solid #517E89;outline-offset:2px}
    .wrap{display:flex;flex-direction:column;align-items:flex-end;gap:10px}
    .launch{pointer-events:auto;display:flex;align-items:center;gap:9px;min-height:38px;
      padding:8px 14px;background:#EFF1F2;border:1px solid #89979E;border-radius:999px;
      box-shadow:0 2px 6px #27303818;color:#303438;font-weight:600}
    .launch:hover{background:#E4E8EA}
    .launch-dot{width:6px;height:6px;background:#F3B9CB;border-radius:50%;flex:none}
    .panel{pointer-events:auto;width:390px;max-width:calc(100vw - 24px);
      max-height:calc(100vh - 100px);max-height:calc(100dvh - 100px);overflow:auto;
      background:#F5F6F6;border:1px solid #B9C1C5;border-radius:6px;
      box-shadow:0 5px 16px #27303822;overscroll-behavior:contain;scrollbar-width:thin}
    .head{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:16px 16px 12px;border-bottom:1px solid #C5CDD0;margin-bottom:10px}
    .brand{font-size:17px;font-weight:650;letter-spacing:-.3px;background:linear-gradient(transparent 54%,#F3B9CB 54% 93%,transparent 93%);width:max-content;max-width:100%}
    .date{font-size:13px;color:#535B60;margin-top:4px;font-variant-numeric:tabular-nums}
    .close{min-width:32px;min-height:32px;padding:0;border:1px solid #C5CDD0;
      border-radius:8px;background:transparent;font-size:21px;line-height:1}
    .close:hover{background:#DCE2E4}
    .filters{display:flex;gap:4px;background:#E7EAEB;border:1px solid #C5CDD0;border-radius:5px;padding:4px;margin:0 16px 12px}
    .filters button{flex:1;min-width:0;padding:7px 4px;border:0;border-radius:6px;
      background:transparent;color:#535B60;white-space:nowrap}
    .filters button[aria-pressed=true]{background:#D4DADC;color:#292D30;box-shadow:inset 0 0 0 1px #89979E;font-weight:600}
    .scope{font-size:13px;color:#5C676D;margin:0 16px 13px;overflow-wrap:anywhere}
    .status{font-size:13px;color:#535B60;padding:9px 11px;margin:0 16px 12px;
      background:#E4E8EA;border-radius:7px;overflow-wrap:anywhere}
    .status.warn{color:#303438}
    .section{padding:0 16px 12px}
    .section-heading{display:flex;gap:9px;justify-content:space-between;align-items:baseline;
      margin:0 0 9px;padding-bottom:6px;border-bottom:1px solid #C5CDD0;font-size:14px;font-weight:600}
    .meta,.small{font-size:13px;font-weight:400;color:#5C676D}
    .small{margin:5px 0 8px;overflow-wrap:anywhere}
    .day-heading{font-size:13px;font-weight:600;color:#535B60;margin:17px 0 8px;padding-bottom:4px;border-bottom:1px solid #D4DADC}
    .day-heading:first-child{margin-top:0}
    .event{--accent:#737D83;display:grid;grid-template-columns:minmax(0,1fr) 36px;
      gap:7px;align-items:start;padding:10px 0 10px 10px;border-left:2px solid var(--accent);
      margin:0 0 9px;background:#F5F6F6;border-radius:0 4px 4px 0}
    .event-open{display:block;width:100%;text-align:left;background:none;border:0;padding:0;
      min-width:0;white-space:normal;overflow-wrap:anywhere;line-height:1.65}
    .event[data-semantic=true]{background:color-mix(in srgb,var(--accent) 28%,#EFF1F2);border-left-color:color-mix(in srgb,var(--accent) 78%,#303438)}
    .event[data-status="completed"],.event[data-status="cancelled"]{background:color-mix(in srgb,var(--accent) 19%,#EFF1F2)}
    .event[data-status="stopped"]{background:color-mix(in srgb,var(--accent) 10%,#EFF1F2)}
    .event[data-semantic=true] .event-open{color:var(--ink,#292D30)}
    .event[data-status] .event-open{text-decoration:line-through;text-decoration-thickness:1px}
    .event-open:hover{text-decoration:underline}
    .event-tags{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 5px}
    .tag{font-size:13px;line-height:1.45;color:#98375C;padding:1px 5px;background:#F8E1E9;border-radius:4px}
    .tag.priority{color:#303438;background:#F9EDC5}
    .tag.category{color:var(--ink,#292D30);background:color-mix(in srgb,var(--accent) 60%,#F5F6F6);font-weight:500}
    .event[data-status] .tag.category{background:#F5F6F6}
    .tag.state{color:var(--ink,#535B60);background:#F5F6F6}
    .pin{width:30px;min-height:30px;background:transparent;border:1px solid #C5CDD0;
      border-radius:6px;padding:0;font-size:17px;line-height:1.2;color:#737D83}
    .pin[aria-pressed=true]{color:#303438;border-color:#A88636}
    .pin[aria-disabled=true]{opacity:.45}
    .empty{font-size:13px;color:#535B60;line-height:1.8;padding:6px 0 10px;overflow-wrap:anywhere}
    .separator{border:0;border-top:1px solid #C5CDD0;margin:3px 16px 14px}
    details{border-top:1px solid #C5CDD0;padding:12px 16px 15px}
    summary{font-size:13px;color:#535B60;cursor:pointer;width:fit-content}
    .settings-body{padding-top:12px;display:grid;gap:10px}
    .legend{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 10px;color:#41494D}
    .legend-item{display:flex;gap:7px;align-items:center;min-width:0}
    .swatch{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--swatch);box-shadow:inset 0 0 0 1px #30343822;flex:none}
    .check{display:flex;align-items:center;gap:9px;color:#41494D}
    .check input{accent-color:#303438;width:16px;height:16px;margin:0}
    .actions{display:flex;gap:6px;flex-wrap:wrap}
    .action{font-size:13px;min-height:33px;padding:5px 9px;background:#E4E8EA;
      border:1px solid #B9C1C5;border-radius:6px}
    .action:hover{background:#DCE2E4}
    textarea{width:100%;min-height:145px;resize:vertical;background:#E7EAEB;color:#292D30;
      border:1px solid #B9C1C5;border-radius:6px;padding:9px;font-family:ui-monospace,monospace;font-size:13px}
    .diagnostics{display:grid;gap:8px}
    .sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
      clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:600px){:host{right:12px;bottom:14px}.panel{max-height:calc(100dvh - 86px)}}
    @media(pointer:coarse){button.close,button.pin,.action,.filters button{min-height:44px}.pin{width:36px}}
    @media(prefers-reduced-motion:reduce){*{scroll-behavior:auto}}
    @media(forced-colors:active){.panel,.launch{border-color:ButtonText}.event{border-color:CanvasText}
      .event[data-semantic=true]{background:Canvas}.event[data-semantic=true] .event-open,.tag.category,.tag.state{color:CanvasText}
      .swatch{border:1px solid CanvasText}}
  `;
  function uiElement(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = String(value);
    return node;
  }
  function uiButton(className, label, action) {
    const button = uiElement('button', className, label); button.type = 'button';
    if (action) button.dataset.action = action;
    return button;
  }
  function uiDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '날짜 미확인';
    return uiDateFormatter.format(new Date(`${date}T12:00:00+09:00`));
  }
  function setupUI() {
    if (disposed) return;
    if (host?.isConnected && shadow) return;
    host = document.createElement('div'); host.id = 'jaroo-calendar-companion-v1';
    shadow = host.attachShadow({ mode: 'open' });
    const style = uiElement('style'); style.textContent = uiCSS;
    const wrap = uiElement('div', 'wrap');
    const panel = uiElement('section', 'panel'); panel.id = 'jaroo-cal-panel'; panel.hidden = !panelOpen;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-labelledby', 'jaroo-cal-panel-title');
    const head = uiElement('div', 'head'), title = uiElement('div');
    const brand = uiElement('div', 'brand', 'Jaroo’s Calendar'); brand.id = 'jaroo-cal-panel-title';
    const date = uiElement('div', 'date'); date.id = 'jaroo-cal-ui-date'; title.append(brand, date);
    const close = uiButton('close', '×', 'close'); close.setAttribute('aria-label', '일정 요약 닫기'); head.append(title, close);
    const filters = uiElement('div', 'filters'); filters.setAttribute('role', 'group'); filters.setAttribute('aria-label', '일정 표시 범위');
    for (const [value, label] of [['today','오늘'],['next','다음 7일'],['all','화면 전체']]) {
      const button = uiButton('', label); button.dataset.filter = value;
      button.setAttribute('aria-pressed', String(panelFilter === value)); button.setAttribute('aria-controls', 'jaroo-cal-list'); filters.append(button);
    }
    const scopeNote = uiElement('div', 'scope', '현재 화면에서 불러온 일정 기준 · 한국 시간');
    const status = uiElement('div', 'status'); status.id = 'jaroo-cal-ui-status'; status.setAttribute('role', 'status');
    const pinned = uiElement('section', 'section'); pinned.id = 'jaroo-cal-pinned';
    const separator = uiElement('hr', 'separator'); separator.id = 'jaroo-cal-pin-separator';
    const list = uiElement('section', 'section'); list.id = 'jaroo-cal-list'; list.setAttribute('aria-label', '확인된 일정 목록');
    const settings = uiElement('details'); settings.id = 'jaroo-cal-settings'; settings.append(uiElement('summary', '', '표시 설정 · 진단'));
    const settingsBody = uiElement('div', 'settings-body'), check = uiElement('label', 'check');
    const toggle = uiElement('input'); toggle.type = 'checkbox'; toggle.id = 'jaroo-cal-enabled'; toggle.checked = enabled;
    check.append(toggle, uiElement('span', '', 'E-Book 테마 표시'));
    const semanticCheck = uiElement('label','check'), semanticToggle = uiElement('input');
    semanticToggle.type = 'checkbox'; semanticToggle.id = 'jaroo-cal-semantic-enabled'; semanticToggle.checked = semanticEnabled;
    semanticCheck.append(semanticToggle, uiElement('span','','GPT 업무 색상 적용'));
    const legend = uiElement('div','legend'); legend.setAttribute('role','list'); legend.setAttribute('aria-label','업무별 색상');
    for (const category of Object.values(Model.CATEGORIES)) {
      const row = uiElement('div','legend-item'); row.setAttribute('role','listitem');
      const swatch = uiElement('span','swatch'); swatch.style.setProperty('--swatch',category.color); swatch.setAttribute('aria-hidden','true');
      row.append(swatch, uiElement('span','',category.label)); legend.append(row);
    }
    const actions = uiElement('div', 'actions'); actions.append(uiButton('action','화면 다시 읽기','refresh'), uiButton('action','고정 모두 해제','clear-pins'), uiButton('action','진단 보기','diagnostics'));
    const diagnostics = uiElement('div', 'diagnostics'); diagnostics.id = 'jaroo-cal-diagnostics'; diagnostics.hidden = true;
    const area = uiElement('textarea'); area.id = 'jaroo-cal-diagnostic-text'; area.readOnly = true; area.spellcheck = false;
    area.setAttribute('aria-label', '개인정보를 제외한 진단 정보');
    diagnostics.append(area, uiButton('action','진단 복사','copy-diagnostics'));
    settingsBody.append(check, semanticCheck, legend,
      uiElement('div','small','제목 단어로 색을 분류해. 제목 맨 앞의 [회의]·[제작]·[기획]·[실행]·[출장]·[개인] 표기가 우선이야. 애매한 일정은 기존 색 계열을 유지해.'),
      uiElement('div','small','[중요]·[최우선]은 금색 테두리, [마감]은 핑크색 밑줄. [완료]·[취소]·[중단]은 제목에 직접 적힌 표기만 반영해. 실제 할 일의 완료 상태를 바꾸지는 않아.'),
      actions, uiElement('div','small','표시 설정과 고정은 이 탭에서만 유지돼. 새로고침하면 초기화돼. 고정은 최대 3개야. 마감의 D-day는 하루짜리 일정의 표시 날짜 기준이며 기간 일정에는 붙이지 않아.'), diagnostics);
    settings.append(settingsBody); panel.append(head, filters, scopeNote, status, pinned, separator, list, settings);
    const launch = uiButton('launch', '', 'toggle'); launch.id = 'jaroo-cal-launch'; launch.setAttribute('aria-controls', panel.id);
    launch.setAttribute('aria-expanded', String(panelOpen)); launch.append(uiElement('span','launch-dot'),uiElement('span','','오늘·다음'));
    const live = uiElement('div','sr'); live.id = 'jaroo-cal-announcement'; live.setAttribute('aria-live','polite'); live.setAttribute('aria-atomic','true');
    wrap.append(panel, launch, live); shadow.append(style, wrap); (document.body || document.documentElement).append(host);
    shadow.addEventListener('click', uiClick);
    shadow.addEventListener('change', event => {
      if (disposed) return;
      if (event.target.id === 'jaroo-cal-semantic-enabled') {
        semanticEnabled = event.target.checked;
        syncHeaderLegend(enabled && semanticEnabled && !document.hidden);
        dirty = true; uiSignature = ''; scheduleScan(); renderUI();
        announce(semanticEnabled ? 'GPT 업무 색상을 켰어.' : '일정의 기본 색으로 돌아갔어.');
        return;
      }
      if (event.target.id !== 'jaroo-cal-enabled') return;
      enabled = event.target.checked;
      if (enabled) document.documentElement.setAttribute('data-jaroo-calendar-theme', 'ebook');
      else document.documentElement.removeAttribute('data-jaroo-calendar-theme');
      syncHeaderLegend(enabled && semanticEnabled && !document.hidden);
      dirty = true; uiSignature = ''; scheduleScan(); renderUI(); announce(enabled ? '테마 표시를 켰어.' : '테마 표시를 껐어.');
    });
    shadow.addEventListener('keydown', event => { if (event.key === 'Escape' && panelOpen) setPanelOpen(false); });
    uiSignature = '';
  }
  function announce(message) {
    if (disposed) return;
    setupUI(); shadow.getElementById('jaroo-cal-announcement').textContent = message;
  }
  function setPanelOpen(open) {
    if (disposed) return;
    setupUI();
    if (open && !panelOpen) uiReturnFocus = document.activeElement;
    panelOpen = Boolean(open); renderUI();
    if (panelOpen) shadow.querySelector(`button[data-filter="${panelFilter}"]`)?.focus({ preventScroll: true });
    else if (document.activeElement === host) {
      if (uiReturnFocus?.isConnected && uiReturnFocus !== host) uiReturnFocus.focus({ preventScroll: true });
      else shadow.getElementById('jaroo-cal-launch').focus({ preventScroll: true });
    }
  }
  function showDiagnostics() {
    if (disposed) return;
    setupUI();
    if (!panelOpen) setPanelOpen(true);
    shadow.getElementById('jaroo-cal-settings').open = true;
    shadow.getElementById('jaroo-cal-diagnostics').hidden = false;
    shadow.getElementById('jaroo-cal-diagnostic-text').value = JSON.stringify(makeDiagnostics(), null, 2);
    announce('진단 정보를 표시했어.');
  }
  async function uiClick(event) {
    if (disposed) return;
    const button = event.target.closest?.('button'); if (!button) return;
    if (button.dataset.filter) { panelFilter = button.dataset.filter; uiSignature = ''; renderUI(); return; }
    if (button.dataset.openKey) { openRecord(button.dataset.openKey); return; }
    if (button.dataset.pinKey) {
      const key = button.dataset.pinKey;
      if (pins.has(key)) { pins.delete(key); announce('고정을 해제했어.'); }
      else if (pins.size >= CONFIG.maxPins) { announce('고정은 최대 3개야. 먼저 기존 고정을 해제해줘.'); return; }
      else { pins.add(key); announce('이 탭에 일정을 고정했어. 새로고침하면 해제돼.'); }
      uiSignature = ''; renderUI(); return;
    }
    switch (button.dataset.action) {
      case 'toggle': setPanelOpen(!panelOpen); break;
      case 'close': setPanelOpen(false); break;
      case 'refresh': dirty = true; uiSignature = ''; scheduleScan(); renderUI(); announce('현재 화면을 다시 읽는 중이야.'); break;
      case 'clear-pins': pins.clear(); uiSignature = ''; renderUI(); announce('고정을 모두 해제했어.'); break;
      case 'diagnostics': showDiagnostics(); break;
      case 'copy-diagnostics': {
        const area = shadow.getElementById('jaroo-cal-diagnostic-text');
        try { await navigator.clipboard.writeText(area.value); announce('진단 정보를 복사했어.'); }
        catch { area.focus(); area.select(); announce('진단 내용을 선택했어. Ctrl+C로 복사해줘.'); }
        break;
      }
    }
  }
  function uiEvent(record) {
    const item = uiElement('div','event'), presentation = eventPresentation(record);
    if (presentation.color) item.style.setProperty('--accent', presentation.color);
    if (presentation.semantic) { item.dataset.semantic = 'true'; item.style.setProperty('--ink', presentation.ink); }
    if (presentation.status) item.dataset.status = presentation.status;
    const content = uiElement('div');
    if (presentation.deadline || presentation.priority || presentation.category || presentation.status) {
      const tags = uiElement('div','event-tags');
      if (presentation.category) {
        const category = uiElement('span','tag category',presentation.label);
        category.title = presentation.source === 'keyword' ? '제목 단어로 자동 분류' : '제목 앞 분류 표기 기준'; tags.append(category);
      }
      if (presentation.status) {
        const state = uiElement('span','tag state',presentation.statusLabel); state.title = '제목에 직접 적힌 상태 표기'; tags.append(state);
      }
      if (presentation.deadline) {
        let label = '마감';
        if (record.date && !record.isRange) { const days = Model.dayDiff(currentDay, record.date); label += days === 0 ? ' · D-day' : days > 0 ? ` · D-${days}` : ` · D+${-days}`; }
        tags.append(uiElement('span','tag',label));
      }
      if (presentation.priority) tags.append(uiElement('span','tag priority','중요'));
      content.append(tags);
    }
    if (record.isRange && record.date && record.endDate) content.append(uiElement('div','small',`${uiDate(record.date)} ~ ${uiDate(record.endDate)} · 기간 일정`));
    const open = uiButton('event-open', record.title); open.dataset.openKey = record.key;
    open.setAttribute('aria-label', `${record.title} · 기본 캘린더에서 열기`); content.append(open);
    const pin = uiButton('pin', pins.has(record.key) ? '★' : '☆'); pin.dataset.pinKey = record.key;
    pin.setAttribute('aria-pressed', String(pins.has(record.key)));
    pin.setAttribute('aria-disabled', String(!pins.has(record.key) && pins.size >= CONFIG.maxPins));
    pin.setAttribute('aria-label', `${record.title} · ${pins.has(record.key) ? '고정 해제' : '이 탭에 고정'}`);
    item.append(content, pin); return item;
  }
  function renderUI() {
    if (disposed) return;
    setupUI(); const panel = shadow.getElementById('jaroo-cal-panel'); panel.hidden = !panelOpen;
    shadow.getElementById('jaroo-cal-launch').setAttribute('aria-expanded', String(panelOpen));
    if (!panelOpen) return;
    const cssApplied = !enabled || Boolean(getComputedStyle(document.documentElement).getPropertyValue('--jaroo-cal-bg').trim());
    const cssVersion = getComputedStyle(document.documentElement).getPropertyValue('--jaroo-cal-style-version').trim();
    const signature = JSON.stringify([panelFilter,currentDay,dirty,enabled,semanticEnabled,cssApplied,cssVersion,lastError,stats.truncated,
      [...coverage].sort(),[...pins],records.map(r=>[r.key,r.date,r.endDate,r.isRange,r.title,r.nativeColor,r.deadline,r.priority,r.semantic])]);
    if (signature === uiSignature) return; uiSignature = signature;
    const active = shadow.activeElement;
    const focusKind = active?.dataset?.pinKey ? 'pinKey' : active?.dataset?.openKey ? 'openKey' : null;
    const focusKey = focusKind ? active.dataset[focusKind] : null;
    const focusSection = active?.closest?.('#jaroo-cal-pinned') ? 'jaroo-cal-pinned' : 'jaroo-cal-list';
    shadow.getElementById('jaroo-cal-ui-date').textContent = uiDate(currentDay);
    shadow.getElementById('jaroo-cal-enabled').checked = enabled;
    shadow.getElementById('jaroo-cal-semantic-enabled').checked = semanticEnabled;
    shadow.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === panelFilter)));
    const list = shadow.getElementById('jaroo-cal-list'); list.setAttribute('aria-busy', String(dirty)); list.replaceChildren();
    const first = Model.addDays(currentDay,1), last = Model.addDays(currentDay,CONFIG.futureDays);
    const items = (panelFilter === 'today' ? Model.within(records,currentDay,currentDay) :
      panelFilter === 'next' ? Model.within(records,first,last) : [...records])
      .sort((a,b)=>(a.date || '9999').localeCompare(b.date || '9999') || a.title.localeCompare(b.title,'ko'));
    const undated = records.filter(record=>!record.date).length;
    const todayKnown = coverage.has(currentDay) || Model.within(records,currentDay,currentDay).length > 0;
    const coveredDays = Array.from({length:CONFIG.futureDays},(_,i)=>Model.addDays(first,i)).filter(date=>coverage.has(date) || Model.within(records,date,date).length > 0).length;
    const status = shadow.getElementById('jaroo-cal-ui-status'), notes = [];
    status.className = 'status';
    if (!cssApplied) { notes.push('테마 CSS가 아직 적용되지 않았어. Stylus 적용 주소를 확인해줘.'); status.classList.add('warn'); }
    else if (enabled && cssVersion !== '0.3.0') { notes.push('E-Book v0.3.0 CSS가 필요해. 같은 채널의 Stylus 스타일을 확인해줘.'); status.classList.add('warn'); }
    if (dirty) notes.push('화면 확인 중… 이전에 읽은 항목이 잠시 표시될 수 있어.');
    else if (lastError) { notes.push('화면을 다시 읽지 못했어. 표시 설정에서 다시 읽기를 눌러줘.'); status.classList.add('warn'); }
    else if (panelFilter === 'today' && !todayKnown) notes.push('현재 화면에서 오늘 날짜를 확인하지 못했어. 기본 캘린더를 오늘로 이동한 뒤 다시 읽어줘.');
    else if (panelFilter === 'next' && coveredDays < CONFIG.futureDays) notes.push(`다음 7일 중 ${coveredDays}일의 날짜를 확인했어. 화면 밖 일정은 포함하지 않아.`);
    else if (!coverage.size && !records.some(record=>record.date)) notes.push('날짜 범위를 확인하지 못했어. 날짜 미확인 항목은 화면 전체에서 볼 수 있어.');
    if (undated && panelFilter !== 'all') notes.push(`날짜 미확인 ${undated}개는 이 필터에서 제외돼.`);
    if (stats.truncated) notes.push(`표시 요소가 많아 최대 ${CONFIG.maxEvents}개까지만 읽었어.`);
    status.textContent = notes.join(' '); status.hidden = !notes.length;
    const pinned = shadow.getElementById('jaroo-cal-pinned'), map = new Map(records.map(record=>[record.key,record]));
    const foundPins = [...pins].map(key=>map.get(key)).filter(Boolean), missing = pins.size-foundPins.length;
    pinned.replaceChildren(); pinned.hidden = !pins.size; shadow.getElementById('jaroo-cal-pin-separator').hidden = !pins.size;
    if (pins.size) {
      const heading = uiElement('div','section-heading','이 탭에 고정'); heading.append(uiElement('span','meta',`${foundPins.length}개 표시`)); pinned.append(heading);
      if (missing) pinned.append(uiElement('div','small',`고정한 ${missing}개는 현재 화면에서 읽히지 않아. 저장된 제목이나 상태를 대신 표시하지 않아.`));
      foundPins.forEach(record=>{pinned.append(uiElement('div','day-heading',uiDate(record.date)),uiEvent(record));});
    }
    const heading = uiElement('div','section-heading', panelFilter==='today' ? '오늘로 확인된 항목' : panelFilter==='next' ? '다음 7일로 확인된 항목' : '현재 읽은 항목');
    if (items.length) heading.append(uiElement('span','meta',`${items.length}개 표시`)); list.append(heading);
    if (!items.length) {
      const message = dirty ? '화면 확인 중…' : lastError ? '확인한 항목을 표시할 수 없어.' :
        panelFilter==='today' && !todayKnown ? '오늘 일정 유무를 아직 확인할 수 없어.' :
        panelFilter==='next' && coveredDays<CONFIG.futureDays ? '불러오지 않은 날짜의 일정 유무는 확인할 수 없어.' :
        '현재 읽은 항목 중 이 범위로 확인된 일정은 없어. 숨겨진 일정이나 화면 밖 일정은 확인하지 않았어.';
      list.append(uiElement('div','empty',message));
    }
    let previousDate;
    for (const record of items) {
      if (panelFilter!=='today' && record.date!==previousDate) { list.append(uiElement('div','day-heading',uiDate(record.date))); previousDate=record.date; }
      list.append(uiEvent(record));
    }
    if (focusKind) {
      const selector = focusKind === 'pinKey' ? 'button[data-pin-key]' : 'button[data-open-key]';
      const preferred = [...shadow.getElementById(focusSection).querySelectorAll(selector)].find(button=>button.dataset[focusKind]===focusKey);
      const replacement = preferred || [...shadow.querySelectorAll(selector)].find(button=>button.dataset[focusKind]===focusKey) || shadow.querySelector(`button[data-filter="${panelFilter}"]`);
      replacement?.focus({ preventScroll: true });
    }
  }
  // END_JAROO_UI

  // BEGIN_JAROO_HEADER_LEGEND
  // HEADER_LEGEND_BEGIN -- independent native-header presentation only.
  // No calendar reads, native DOM relocation, network calls, or frame polling.
  function hdrIsMonthLabel(hdrValue) {
    const hdrText = String(hdrValue || '').replace(/\s+/g, ' ').trim();
    return /^(?:19[7-9]\d|20\d{2}|21\d{2})년\s*(?:[1-9]|1[0-2])월$/.test(hdrText) ||
      /^(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(?:19[7-9]\d|20\d{2}|21\d{2})$/i.test(hdrText);
  }
  function hdrComputeGap(hdrHeaderBox, hdrTitleBox, hdrBlockers, hdrViewportWidth, hdrViewportHeight) {
    if (!hdrHeaderBox || !hdrTitleBox || hdrHeaderBox.height < 34 || hdrTitleBox.width <= 0 || hdrTitleBox.height <= 0) return null;
    if (hdrHeaderBox.top < -2 || hdrHeaderBox.top > 160 || hdrHeaderBox.height > 180 || hdrHeaderBox.bottom > hdrViewportHeight) return null;
    if (hdrTitleBox.left < hdrHeaderBox.left - 1 || hdrTitleBox.right > hdrHeaderBox.right + 1 || hdrTitleBox.top < hdrHeaderBox.top - 1 || hdrTitleBox.bottom > hdrHeaderBox.bottom + 1) return null;
    const hdrHeight = 32;
    const hdrTop = Math.max(hdrHeaderBox.top + 1, Math.min(hdrTitleBox.top + (hdrTitleBox.height - hdrHeight) / 2, hdrHeaderBox.bottom - hdrHeight - 1));
    const hdrLeft = Math.max(8, hdrHeaderBox.left + 8, hdrTitleBox.right + 16);
    let hdrRight = Math.min(hdrViewportWidth - 12, hdrHeaderBox.right - 12);
    for (const hdrBox of hdrBlockers) {
      if (hdrBox.bottom <= hdrTop || hdrBox.top >= hdrTop + hdrHeight || hdrBox.right <= hdrLeft) continue;
      if (hdrBox.left < hdrRight) hdrRight = Math.min(hdrRight, hdrBox.left - 16);
    }
    return hdrRight > hdrLeft ? { left: hdrLeft, right: hdrRight, top: hdrTop, width: hdrRight - hdrLeft, height: hdrHeight, headerBottom: hdrHeaderBox.bottom } : null;
  }
  function hdrSelectMode(hdrAvailable, hdrWidths) {
    for (const hdrMode of ['full', 'short', 'compact']) {
      const hdrWidth = hdrWidths[hdrMode];
      if (Number.isFinite(hdrWidth) && hdrWidth > 0 && hdrWidth <= hdrAvailable) return hdrMode;
    }
    return 'hidden';
  }

  const hdrLegendController = (() => {
    const hdrId = 'jaroo-calendar-header-legend-v1';
    const hdrControls = 'button,[role="button"],a[href],input,select,textarea,[role="combobox"],[role="searchbox"],[contenteditable="true"],[tabindex]';
    let hdrActive = false, hdrDisposed = false, hdrDirty = true, hdrPending = 0;
    let hdrHost = null, hdrShadow = null, hdrHeader = null, hdrAnchor = null, hdrGap = null;
    let hdrMutation = null, hdrResize = null, hdrObserved = [];
    let hdrMode = 'hidden', hdrReason = 'not-started', hdrPopupOpen = false;
    const hdrUnlisten = [];
    const hdrState = () => ({ mode: hdrMode, reason: hdrReason });

    function hdrRendered(hdrNode) {
      if (!(hdrNode instanceof Element) || !hdrNode.isConnected || hdrNode.closest('[hidden],[inert],[role="dialog"],[role="menu"],[role="listbox"]')) return false;
      const hdrRects = [...hdrNode.getClientRects()];
      if (!hdrRects.length || hdrRects.every(hdrRect => hdrRect.width <= 2 && hdrRect.height <= 2)) return false;
      const hdrStyle = getComputedStyle(hdrNode);
      const hdrClip = String(hdrStyle.clip || '').match(/^rect\(([^)]+)\)$/);
      const hdrEdges = hdrClip ? hdrClip[1].split(/[,\s]+/).filter(Boolean).map(parseFloat) : [];
      if (hdrEdges.length === 4 && hdrEdges.every(Number.isFinite) && (hdrEdges[2] <= hdrEdges[0] || hdrEdges[1] <= hdrEdges[3])) return false;
      if (/inset\(\s*50%/i.test(String(hdrStyle.clipPath || ''))) return false;
      if (typeof hdrNode.checkVisibility === 'function') return hdrNode.checkVisibility({ opacityProperty: true, visibilityProperty: true });
      return hdrStyle.display !== 'none' && hdrStyle.visibility !== 'hidden' && hdrStyle.visibility !== 'collapse' && hdrStyle.opacity !== '0';
    }
    function hdrNativeLayer() {
      let hdrMax = 0, hdrDepth = 0;
      for (let hdrNodeValue = hdrHeader; hdrNodeValue && hdrDepth++ < 16; hdrNodeValue = hdrNodeValue.parentElement) {
        const hdrValue = Number.parseInt(getComputedStyle(hdrNodeValue).zIndex, 10);
        if (Number.isFinite(hdrValue)) hdrMax = Math.max(hdrMax, hdrValue);
      }
      return Math.min(10000, Math.max(30, hdrMax + 1));
    }
    function hdrListen(hdrTarget, hdrName, hdrHandler, hdrOptions) {
      hdrTarget.addEventListener(hdrName, hdrHandler, hdrOptions);
      hdrUnlisten.push(() => hdrTarget.removeEventListener(hdrName, hdrHandler, hdrOptions));
    }
    function hdrClosePopup(hdrReturnFocus = false) {
      hdrPopupOpen = false;
      const hdrButton = hdrShadow?.getElementById('hdr-trigger'), hdrPopup = hdrShadow?.getElementById('hdr-popup');
      if (hdrButton) hdrButton.setAttribute('aria-expanded', 'false');
      if (hdrPopup) hdrPopup.hidden = true;
      if (hdrReturnFocus && hdrButton && hdrHost && !hdrHost.hidden) hdrButton.focus({ preventScroll: true });
    }
    function hdrHide(hdrWhy) {
      hdrClosePopup();
      if (hdrHost) hdrHost.hidden = true;
      hdrMode = 'hidden'; hdrReason = hdrWhy;
    }
    function hdrStopObservers() {
      hdrMutation?.disconnect(); hdrResize?.disconnect(); hdrObserved = [];
    }
    function hdrQueue(hdrImmediateHide = false) {
      if (hdrDisposed || !hdrActive) return;
      hdrDirty = true;
      // Ordinary hover classes need no visible flash; moving/lost anchors do.
      if (document.hidden || hdrImmediateHide === true || !hdrHeader?.isConnected || !hdrAnchor?.isConnected)
        hdrHide(document.hidden ? 'document-hidden' : 'layout-pending');
      if (document.hidden || hdrPending) return;
      hdrPending = setTimeout(() => { hdrPending = 0; hdrUpdateSafe(); }, 60);
    }
    function hdrInstallListeners() {
      if (hdrUnlisten.length) return;
      hdrListen(window, 'resize', () => hdrQueue(true), { passive: true });
      hdrListen(window, 'scroll', () => hdrQueue(true), { passive: true });
      hdrListen(document, 'visibilitychange', () => {
        if (document.hidden) { clearTimeout(hdrPending); hdrPending = 0; hdrStopObservers(); hdrDirty = true; hdrHide('document-hidden'); }
        else hdrQueue();
      });
      hdrListen(document, 'keydown', hdrEvent => {
        if (hdrEvent.key === 'Escape' && hdrPopupOpen) { hdrEvent.preventDefault(); hdrClosePopup(true); }
      }, true);
      hdrListen(document, 'pointerdown', hdrEvent => {
        if (hdrPopupOpen && !(hdrEvent.composedPath?.() || []).includes(hdrHost)) hdrClosePopup(true);
      }, true);
      if (document.fonts?.addEventListener) hdrListen(document.fonts, 'loadingdone', hdrQueue);
    }
    function hdrNode(hdrTag, hdrClass, hdrText) {
      const hdrNodeValue = document.createElement(hdrTag);
      if (hdrClass) hdrNodeValue.className = hdrClass;
      if (hdrText !== undefined) hdrNodeValue.textContent = hdrText;
      return hdrNodeValue;
    }
    function hdrList(hdrShort = false) {
      const hdrListValue = hdrNode('ul', hdrShort ? 'row short' : 'row');
      hdrListValue.setAttribute('aria-label', '업무 색상 범례');
      for (const [hdrKey, hdrCategory] of Object.entries(Model.CATEGORIES)) {
        const hdrItem = hdrNode('li', 'item');
        hdrItem.style.setProperty('--tone', hdrCategory.color);
        hdrItem.setAttribute('aria-label', hdrCategory.label);
        hdrItem.title = hdrCategory.label;
        const hdrSwatch = hdrNode('span', 'swatch'); hdrSwatch.setAttribute('aria-hidden', 'true');
        hdrItem.append(hdrSwatch, hdrNode('span', '', hdrShort ? hdrCategory.label.split('·')[0] : hdrCategory.label));
        hdrItem.dataset.category = hdrKey; hdrListValue.append(hdrItem);
      }
      return hdrListValue;
    }
    function hdrEnsureHost() {
      if (hdrHost?.isConnected) return;
      hdrHost = hdrNode('div'); hdrHost.id = hdrId; hdrHost.hidden = true;
      hdrShadow = hdrHost.attachShadow({ mode: 'open' });
      const hdrStyle = hdrNode('style');
      hdrStyle.textContent = `
        :host{all:initial;position:fixed;z-index:30;width:max-content;height:32px;
          font:500 13px/1.5 "Jaroo Cal Plex Latin","Pretendard Variable","Pretendard","Noto Sans KR",sans-serif;text-align:left;direction:ltr;
          color:#292D30;pointer-events:none;color-scheme:light}
        :host([hidden]),[hidden]{display:none!important}*{box-sizing:border-box}
        .row{display:flex;align-items:center;gap:12px;list-style:none;padding:0;margin:0;
          height:32px;white-space:nowrap;width:max-content}.row.short{gap:10px}
        .item{display:inline-flex;align-items:center;gap:6px;color:#292D30}
        .swatch{width:8px;height:8px;border-radius:50%;background:var(--tone);box-shadow:inset 0 0 0 1px #30343822;flex:none}
        button{font:inherit;color:inherit;cursor:pointer;pointer-events:auto}
        .trigger{height:32px;white-space:nowrap;padding:4px 10px;background:#EFF1F2;
          border:1px solid #89979E;border-radius:5px}
        button:focus-visible{outline:2px solid #517E89;outline-offset:2px}
        .popup{position:fixed;pointer-events:auto;background:#F5F6F6;border:1px solid #B9C1C5;
          border-radius:5px;padding:12px;box-shadow:0 5px 16px #27303822;overflow:auto}
        .popup .row{display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;height:auto}
        .popup-head{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:0 0 10px;padding-bottom:8px;border-bottom:1px solid #C5CDD0}
        .popup-title{color:#535B60;font-size:12px;margin:0}
        .close{padding:3px 7px;background:transparent;border:1px solid #B9C1C5;border-radius:5px;font-size:12px}
        @media(forced-colors:active){.item{color:CanvasText}.swatch{background:CanvasText}
          .trigger,.popup{background:Canvas;color:CanvasText;border-color:ButtonText}}
      `;
      const hdrFull = hdrList(); hdrFull.id = 'hdr-full';
      const hdrShort = hdrList(true); hdrShort.id = 'hdr-short'; hdrShort.hidden = true;
      const hdrTrigger = hdrNode('button', 'trigger', '색상 범례'); hdrTrigger.id = 'hdr-trigger'; hdrTrigger.type = 'button';
      hdrTrigger.hidden = true; hdrTrigger.setAttribute('aria-expanded', 'false'); hdrTrigger.setAttribute('aria-controls', 'hdr-popup');
      hdrTrigger.setAttribute('aria-label', '업무 색상 범례 펼치기');
      const hdrPopup = hdrNode('section', 'popup'); hdrPopup.id = 'hdr-popup'; hdrPopup.hidden = true;
      hdrPopup.setAttribute('role', 'region'); hdrPopup.setAttribute('aria-label', '업무 색상 범례');
      const hdrPopupHead = hdrNode('div', 'popup-head'), hdrClose = hdrNode('button', 'close', '닫기'); hdrClose.type = 'button';
      hdrClose.setAttribute('aria-label', '업무 색상 범례 닫기'); hdrClose.addEventListener('click', () => hdrClosePopup(true));
      hdrPopupHead.append(hdrNode('div', 'popup-title', '제목 기준 업무 색상'), hdrClose);
      hdrPopup.append(hdrPopupHead, hdrList());
      hdrShadow.append(hdrStyle, hdrFull, hdrShort, hdrTrigger, hdrPopup);
      (document.body || document.documentElement).append(hdrHost);
      hdrTrigger.addEventListener('click', () => {
        if (hdrPopupOpen) { hdrClosePopup(); return; }
        if (!hdrGap || hdrMode !== 'compact') return;
        const hdrWidth = Math.min(310, window.innerWidth - 24), hdrTop = hdrGap.headerBottom + 8;
        if (hdrWidth < 200 || window.innerHeight - hdrTop < 96) return;
        hdrPopup.style.width = `${hdrWidth}px`;
        hdrPopup.style.left = `${Math.max(12, Math.min(hdrGap.left, window.innerWidth - hdrWidth - 12))}px`;
        hdrPopup.style.top = `${hdrTop}px`;
        hdrPopup.style.maxHeight = `${Math.max(80, window.innerHeight - hdrTop - 12)}px`;
        hdrPopup.hidden = false; hdrPopupOpen = true; hdrTrigger.setAttribute('aria-expanded', 'true');
      });
    }
    function hdrFindAnchor() {
      const hdrHeaders = [...document.querySelectorAll('[role="banner"],header')].slice(0, 12);
      for (const hdrCandidateHeader of hdrHeaders) {
        if (!hdrRendered(hdrCandidateHeader) || hdrCandidateHeader.closest('[aria-hidden="true"]')) continue;
        const hdrCheck = hdrNodeValue => !hdrNodeValue.closest('[role="grid"],[data-eventid]') &&
          hdrIsMonthLabel(hdrNodeValue.textContent) && hdrRendered(hdrNodeValue);
        let hdrCandidates = [...hdrCandidateHeader.querySelectorAll('h1,h2,[role="heading"]')].filter(hdrCheck);
        hdrCandidates = hdrCandidates.filter(hdrNodeValue => !hdrCandidates.some(hdrOther => hdrOther !== hdrNodeValue && hdrNodeValue.contains(hdrOther)));
        if (!hdrCandidates.length) hdrCandidates = [...hdrCandidateHeader.querySelectorAll('span,div')].slice(0, 240)
          .filter(hdrNodeValue => !hdrNodeValue.childElementCount && hdrCheck(hdrNodeValue));
        if (hdrCandidates.length === 1) return { header: hdrCandidateHeader, anchor: hdrCandidates[0] };
        if (hdrCandidates.length > 1) return { header: hdrCandidateHeader, anchor: null, reason: 'ambiguous-month-heading' };
      }
      return { header: hdrHeaders.find(hdrRendered) || null, anchor: null, reason: hdrHeaders.length ? 'no-month-heading' : 'no-semantic-header' };
    }
    function hdrBindObservers(hdrTargets) {
      const hdrUnique = [...new Set(hdrTargets.filter(Boolean))];
      if (hdrObserved.length === hdrUnique.length && hdrObserved.every((hdrNodeValue, hdrIndex) => hdrNodeValue === hdrUnique[hdrIndex])) return;
      hdrStopObservers(); hdrObserved = hdrUnique;
      if (hdrHeader && typeof MutationObserver === 'function') {
        hdrMutation ||= new MutationObserver(hdrChanges => {
          if (hdrChanges.some(hdrChange => !hdrHost?.contains(hdrChange.target))) hdrQueue();
        });
        hdrMutation.observe(hdrHeader, { subtree: true, childList: true, characterData: true, attributes: true,
          attributeFilter: ['class', 'style', 'hidden', 'inert', 'aria-hidden', 'aria-label', 'aria-expanded', 'aria-haspopup'] });
      }
      if (typeof ResizeObserver === 'function') {
        hdrResize ||= new ResizeObserver(() => hdrQueue(true));
        for (const hdrNodeValue of hdrUnique) hdrResize.observe(hdrNodeValue);
      }
    }
    function hdrSetMode(hdrValue) {
      hdrShadow.getElementById('hdr-full').hidden = hdrValue !== 'full';
      hdrShadow.getElementById('hdr-short').hidden = hdrValue !== 'short';
      hdrShadow.getElementById('hdr-trigger').hidden = hdrValue !== 'compact';
    }
    function hdrUpdate() {
      if (hdrDisposed || !hdrActive || document.hidden) { hdrHide(hdrDisposed ? 'disposed' : !hdrActive ? 'disabled' : 'document-hidden'); return; }
      hdrDirty = false;
      const hdrFound = hdrFindAnchor(); hdrHeader = hdrFound.header; hdrAnchor = hdrFound.anchor;
      if (!hdrHeader || !hdrAnchor) { hdrBindObservers([hdrHeader]); hdrHide(hdrFound.reason || 'no-month-heading'); return; }
      const hdrOpenControl = [...hdrHeader.querySelectorAll('[aria-expanded="true"]')].some(hdrNodeValue =>
        hdrRendered(hdrNodeValue) && (hdrNodeValue.hasAttribute('aria-haspopup') || hdrNodeValue.matches('[role="combobox"],[role="searchbox"]')));
      if (hdrOpenControl) { hdrBindObservers([hdrHeader, hdrAnchor]); hdrHide('native-header-popup-open'); return; }
      const hdrHeaderBox = hdrHeader.getBoundingClientRect();
      let hdrTitleBox = null;
      try { const hdrRange = document.createRange(); hdrRange.selectNodeContents(hdrAnchor); hdrTitleBox = hdrRange.getBoundingClientRect(); }
      catch (_) { /* Narrow, exact-label element bounds are the only fallback. */ }
      if (!hdrTitleBox?.width || !hdrTitleBox?.height) {
        const hdrFallback = hdrAnchor.getBoundingClientRect();
        if (hdrFallback.width > 400) { hdrBindObservers([hdrHeader, hdrAnchor]); hdrHide('unverified-title-bounds'); return; }
        hdrTitleBox = hdrFallback;
      }
      const hdrBox = { left: hdrTitleBox.left, top: hdrTitleBox.top, right: hdrTitleBox.right, bottom: hdrTitleBox.bottom, width: hdrTitleBox.width, height: hdrTitleBox.height };
      const hdrNativeControls = [...hdrHeader.querySelectorAll(hdrControls)].filter(hdrRendered);
      const hdrBlockerNodes = new Set(hdrNativeControls);
      for (const hdrNodeValue of [...hdrHeader.querySelectorAll('span,div,img,svg,[role="img"]')].slice(0, 240)) {
        if (!hdrNodeValue.childElementCount && (hdrNodeValue.textContent?.trim() || hdrNodeValue.matches('img,svg,[role="img"]')) && hdrRendered(hdrNodeValue)) hdrBlockerNodes.add(hdrNodeValue);
      }
      const hdrBlockers = [];
      for (const hdrNodeValue of hdrBlockerNodes) {
        if (hdrNodeValue === hdrAnchor || hdrAnchor.contains(hdrNodeValue)) continue;
        const hdrRect = hdrNodeValue.getBoundingClientRect();
        if (hdrNodeValue.contains(hdrAnchor)) { hdrBox.right = Math.max(hdrBox.right, hdrRect.right); continue; }
        hdrBlockers.push(hdrRect);
      }
      const hdrPreviousGap = hdrGap;
      hdrGap = hdrComputeGap(hdrHeaderBox, hdrBox, hdrBlockers, window.innerWidth, window.innerHeight);
      hdrBindObservers([hdrHeader, hdrAnchor, ...hdrNativeControls]);
      if (!hdrGap) { hdrHide('no-safe-gap'); return; }
      hdrEnsureHost();
      if (hdrPopupOpen && (!hdrPreviousGap || hdrPreviousGap.left !== hdrGap.left || hdrPreviousGap.headerBottom !== hdrGap.headerBottom)) hdrClosePopup();
      hdrHost.style.visibility = 'hidden'; hdrHost.hidden = false;
      hdrHost.style.zIndex = String(hdrNativeLayer());
      hdrHost.style.left = `${hdrGap.left}px`; hdrHost.style.top = `${hdrGap.top}px`;
      const hdrWidths = {};
      for (const hdrValue of ['full', 'short', 'compact']) { hdrSetMode(hdrValue); hdrWidths[hdrValue] = hdrHost.getBoundingClientRect().width; }
      hdrMode = hdrSelectMode(hdrGap.width, hdrWidths);
      if (hdrMode === 'hidden') { hdrHide('insufficient-horizontal-space'); return; }
      if (hdrMode !== 'compact') hdrClosePopup();
      hdrSetMode(hdrMode); hdrHost.style.visibility = 'visible'; hdrReason = 'ready';
    }
    function hdrUpdateSafe() {
      try { hdrUpdate(); }
      catch (_) { hdrDirty = true; hdrStopObservers(); hdrHide('layout-error'); }
    }
    function hdrSync(hdrEnabled) {
      try {
        if (hdrDisposed) return hdrState();
        const hdrChanged = hdrActive !== Boolean(hdrEnabled); hdrActive = Boolean(hdrEnabled);
        if (!hdrActive) { clearTimeout(hdrPending); hdrPending = 0; hdrStopObservers(); hdrDirty = true; hdrHide('disabled'); return hdrState(); }
        hdrInstallListeners();
        if (document.hidden) { hdrHide('document-hidden'); return hdrState(); }
        // The main scanner/recovery may call this repeatedly: unchanged header
        // identity performs no geometry reads. Header observers own layout work.
        if (!hdrChanged && !hdrDirty && (!hdrHost || hdrHost.isConnected) && hdrHeader?.isConnected && hdrAnchor?.isConnected && hdrHeader.contains(hdrAnchor)) return hdrState();
        clearTimeout(hdrPending); hdrPending = 0; hdrUpdateSafe(); return hdrState();
      } catch (_) { hdrHide('layout-error'); return hdrState(); }
    }
    function hdrDispose() {
      if (hdrDisposed) return;
      hdrDisposed = true; hdrActive = false; clearTimeout(hdrPending); hdrPending = 0;
      hdrStopObservers();
      for (const hdrRemove of hdrUnlisten.splice(0)) { try { hdrRemove(); } catch (_) {} }
      hdrHost?.remove(); hdrHost = null; hdrShadow = null; hdrHeader = null; hdrAnchor = null;
      hdrMode = 'hidden'; hdrReason = 'disposed';
    }
    return { sync: hdrSync, dispose: hdrDispose, state: hdrState };
  })();
  function syncHeaderLegend(hdrEnabled = enabled && semanticEnabled) { return hdrLegendController.sync(hdrEnabled); }
  function disposeHeaderLegend() { hdrLegendController.dispose(); }
  function getHeaderLegendState() { return hdrLegendController.state(); }
  // HEADER_LEGEND_END
  // END_JAROO_HEADER_LEGEND

  // BEGIN_JAROO_LIFECYCLE
  // LIFECYCLE_BEGIN -- native events remain the only source of calendar data.
  const originalThemeAttribute = document.documentElement.getAttribute('data-jaroo-calendar-theme');
  const listeners = [];
  let firstDirtyAt = 0;
  function listen(target, name, handler, options) {
    target.addEventListener(name, handler, options);
    listeners.push(() => target.removeEventListener(name, handler, options));
  }
  function observeRoots() {
    if (disposed || document.hidden) return;
    for (const root of roots) if (root.isConnected) observer.observe(root, {
      subtree: true, childList: true, characterData: true, attributes: true, attributeOldValue: true,
      attributeFilter: ['data-datekey','data-eventid','aria-label','aria-labelledby','aria-selected','aria-current','aria-hidden','hidden','inert','style','class']
    });
  }
  function withoutOwnStyle(value) {
    return String(value || '').replace(/(?:^|;)\s*--jaroo-cal-event-color\s*:[^;]*(?=;|$)/gi, '').replace(/;+/g, ';').trim().replace(/^;|;$/g, '').trim();
  }
  function mutationRelevant(change) {
    const node = change.target instanceof Element ? change.target : change.target.parentElement;
    if (!node || node === host || node.closest('#jaroo-calendar-companion-v1')) return false;
    if (change.type === 'characterData') return Boolean(node.closest('[data-eventid],[data-datekey],[role="gridcell"],[role="columnheader"]'));
    if (change.type === 'attributes') {
      if (change.attributeName === 'style' && withoutOwnStyle(change.oldValue) === withoutOwnStyle(node.getAttribute('style'))) return false;
      if (change.attributeName === 'class' || change.attributeName === 'style') {
        return Boolean(node.closest('[data-eventid],[data-datekey],[role="gridcell"]') || node.querySelector('[data-eventid],[data-datekey],[role="grid"]'));
      }
      return true;
    }
    if (change.type === 'childList') {
      if (node.closest('[data-eventid],[data-datekey],[role="gridcell"]')) return true;
      return [...change.addedNodes, ...change.removedNodes].some(child => child instanceof Element &&
        (child.matches('[data-eventid],[data-datekey],[role="grid"],[role="gridcell"]') || child.querySelector('[data-eventid],[data-datekey],[role="grid"]')));
    }
    return false;
  }
  const observer = new MutationObserver(changes => {
    if (disposed) return;
    const relevant = changes.filter(mutationRelevant);
    if (!relevant.length) return;
    const dateChanged = relevant.some(change => change.type === 'childList' ||
      ['data-datekey','aria-selected','aria-current'].includes(change.attributeName));
    scheduleScan({ invalidateDates: dateChanged });
  });
  function invalidateDatePaint() {
    for (const node of marked) {
      removeMarker(node, 'data-jaroo-cal-today');
      removeMarker(node, 'data-jaroo-cal-selected');
      removeMarker(node, 'data-jaroo-cal-today-label');
      removeMarker(node, 'data-jaroo-cal-mini-day');
      removeMarker(node, 'data-jaroo-cal-date-tone');
      removeMarker(node, 'data-jaroo-cal-month-weekend');
      removeMarker(node, 'data-jaroo-cal-day-header');
      removeMarker(node, 'data-jaroo-cal-more-label');
    }
  }
  function syncContext() {
    const nextScope = accountScope(), nextRoute = location.pathname + location.search;
    const nextDay = Model.today(CONFIG.timeZone);
    const changed = nextRoute !== route || nextScope !== scope || nextDay !== currentDay;
    if (nextScope !== scope) { pins.clear(); records = []; coverage.clear(); stats = {}; }
    if (changed) {
      selectedDay = null; invalidateDatePaint();
      route = nextRoute; scope = nextScope; currentDay = nextDay;
    }
    return changed;
  }
  function scheduleScan(options = {}) {
    if (disposed) return;
    dirty = true;
    if (options?.invalidateDates) invalidateDatePaint();
    if (document.hidden) return;
    const now = performance.now();
    if (!firstDirtyAt) firstDirtyAt = now;
    if (pending) clearTimeout(pending);
    const delay = options?.immediate ? 0 : Math.min(CONFIG.settleMs, Math.max(0, 800 - (now - firstDirtyAt)));
    pending = setTimeout(runScan, delay);
    if (panelOpen) renderUI();
  }
  function runScan() {
    clearTimeout(pending);
    pending = 0; firstDirtyAt = 0;
    if (disposed || document.hidden) return;
    // Disconnect only for this synchronous read/write pass. Our color variable writes
    // cannot start a MutationObserver feedback loop. No network or async work inside.
    observer.disconnect();
    try {
      syncContext();
      roots = mainRoots();
      collect();
      lastError = ''; dirty = false;
    } catch (_) {
      records = []; coverage.clear(); stats = {};
      lastError = '달력 화면 구조를 읽지 못했어. 기본 일정은 그대로 사용할 수 있어.';
      dirty = false;
      for (const node of [...marked]) cleanupNode(node);
    } finally {
      observeRoots();
      if (!disposed) { syncHeaderLegend(enabled && semanticEnabled && !document.hidden); renderUI(); }
    }
  }
  function recoveryTick() {
    recoveryTimer = 0;
    if (disposed) return;
    if (!document.hidden) {
      const contextChanged = syncContext();
      const rootsChanged = bindRoots();
      syncHeaderLegend(enabled && semanticEnabled);
      if (contextChanged || rootsChanged || dirty) scheduleScan({ invalidateDates: contextChanged || rootsChanged });
    }
    // This only checks document/root/date identity; it does not re-scan all events.
    recoveryTimer = setTimeout(recoveryTick, CONFIG.recoveryMs);
  }
  function openRecord(key) {
    if (disposed) return;
    if (syncContext()) {
      runScan();
      announce('달력 범위가 바뀌었어. 새 목록에서 일정을 다시 눌러줘.');
      return;
    }
    if (dirty) runScan();
    const record = records.find(item => item.key === key);
    scanNumber++; // do not trust a date cell cached before native navigation
    const fresh = record && recordFor(record.node);
    if (!fresh || fresh.key !== key || fresh.title !== record.title) {
      announce('화면의 일정이 바뀌었어. 목록을 다시 읽은 뒤 눌러줘.');
      scheduleScan({ immediate: true, invalidateDates: true }); return;
    }
    setPanelOpen(false);
    // Click the verified live native element. Never derive a URL from an opaque ID.
    fresh.node.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    fresh.node.click();
  }
  function makeDiagnostics() {
    return {
      product: 'Jaroo Calendar Companion', version: VERSION, timezone: CONFIG.timeZone,
      themeEnabled: enabled, semanticColorsEnabled: semanticEnabled,
      headerLegend: getHeaderLegendState(),
      cssLoaded: Boolean(getComputedStyle(document.documentElement).getPropertyValue('--jaroo-cal-bg').trim()),
      cssVersion: getComputedStyle(document.documentElement).getPropertyValue('--jaroo-cal-style-version').trim() || null,
      documentVisible: !document.hidden, pendingScreenRead: dirty, mainRoots: roots.length,
      calendarGrids: stats.grids || 0, identifiableDateCells: stats.dateCells || 0,
      ebookChrome:{headers:document.querySelectorAll('[data-jaroo-cal-surface="header"]').length,
        sidebars:document.querySelectorAll('[data-jaroo-cal-surface="sidebar"]').length,
        monthTitles:document.querySelectorAll('[data-jaroo-cal-month-title]').length,
        miniCalendars:document.querySelectorAll('[data-jaroo-cal-mini]').length,
        miniToday:document.querySelectorAll('[data-jaroo-cal-mini-day="today"]').length,
        controls:document.querySelectorAll('[data-jaroo-cal-control]').length,
        moreSurfaces:document.querySelectorAll('[data-jaroo-cal-surface="more"]').length,
        monthWeekendCells:document.querySelectorAll('[data-jaroo-cal-month-weekend]').length,
        outsideDateLabels:document.querySelectorAll('[data-jaroo-cal-date-tone="outside"]').length,
        eventTimeLabels:document.querySelectorAll('[data-jaroo-cal-event-time]').length,
        moreLabels:document.querySelectorAll('[data-jaroo-cal-more-label]').length},
      renderedEventElements: stats.eventElements || 0, datedItems: stats.datedRecords || 0,
      undatedItems: stats.undatedRecords || 0, nativeDescriptionDateItems: stats.nativeLabelDatedRecords || 0, dateRangeItems: stats.rangeRecords || 0, unknownTitleItems: stats.unknownTitles || 0, recoloredElements: stats.coloredElements || 0,
      semanticColorItems: stats.semanticItems || 0, titleKeywordCategoryItems: stats.inferredCategoryItems || 0, authoredStatusItems: stats.explicitStatusItems || 0,
      cappedAt1200: Boolean(stats.truncated), morePopupColoredElements: stats.morePopupPainted || 0,
      monthViewRecognized: isMonthCalendarView(),
      monthViewRecognition: /\/month(?:\/|$)/.test(location.pathname) ? 'explicit-month' : isMonthCalendarView() ? 'default-root-month-grid' : 'not-month',
      morePopupCandidates:moreProbe.textCandidates, morePopupGridAnchoredCandidates:moreProbe.gridAnchoredCandidates,
      morePopupVerifiedOverlays:moreProbe.verifiedOverlays, morePopupRowCandidates:moreProbe.rowCandidates,
      pinsInDocumentMemory: pins.size,
      lastReadAt: stats.scannedAt || null, screenReadError: Boolean(lastError),
      source: 'native rendered DOM only; no account-wide fetch',
      privacy: 'No event titles, event IDs, calendar names, email addresses or URLs included.'
    };
  }
  function dispose() {
    if (disposed) return;
    disposed = true; observer.disconnect(); disposeHeaderLegend();
    clearTimeout(pending); clearTimeout(recoveryTimer); clearTimeout(moreAfterClick);
    for (const remove of listeners.splice(0)) remove();
    for (const node of [...marked]) cleanupNode(node);
    for (const node of [...eventStyles.keys()]) restoreStyle(node);
    if (originalThemeAttribute === null) document.documentElement.removeAttribute('data-jaroo-calendar-theme');
    else document.documentElement.setAttribute('data-jaroo-calendar-theme', originalThemeAttribute);
    host?.remove(); pins.clear(); records = []; roots = []; grids = []; coverage.clear();
    if (window[RUNTIME] === runtime) delete window[RUNTIME];
  }
  const runtime = Object.freeze({ version: VERSION, dispose, diagnostics: makeDiagnostics, refresh: () => scheduleScan({ immediate: true }) });
  window[RUNTIME] = runtime;
  document.documentElement.setAttribute('data-jaroo-calendar-theme', 'ebook');
  setupUI();
  listen(document, 'visibilitychange', () => {
    if (document.hidden) {
      observer.disconnect(); clearTimeout(pending); pending = 0; firstDirtyAt = 0; dirty = true;
    } else scheduleScan({ immediate: true, invalidateDates: true });
    syncHeaderLegend(enabled && semanticEnabled && !document.hidden);
  });
  listen(window, 'focus', () => scheduleScan({ invalidateDates: true }));
  listen(window, 'pageshow', () => scheduleScan({ immediate: true, invalidateDates: true }));
  listen(window, 'popstate', () => scheduleScan({ invalidateDates: true }));
  listen(window, 'resize', () => scheduleScan({ invalidateDates: true }));
  // Native popup portals may be outside observed main. A user click (including
  // More/open/close) is the bounded rescan signal; no document-wide polling.
  let moreAfterClick = 0;
  listen(document, 'click', () => {
    if (isMonthCalendarView()) {
      scheduleScan();
      clearTimeout(moreAfterClick);
      moreAfterClick=setTimeout(()=>{moreAfterClick=0;scheduleScan()}, 550);
    }
  }, true);
  listen(document, 'keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ' || event.key === 'Escape') && isMonthCalendarView()) scheduleScan();
  }, true);
  listen(document, 'click', event => {
    const node = event.target instanceof Element ? event.target : null;
    if (!node || !inRoots(node) || node.closest(EVENT) || node.closest('[role="dialog"],[role="menu"]')) return;
    scanNumber++;
    const info = dateInfo(node);
    if (info) { selectedDay = info.date; scheduleScan(); }
  }, true);
  runScan();
  recoveryTimer = setTimeout(recoveryTick, CONFIG.recoveryMs);
  // LIFECYCLE_END
  // END_JAROO_LIFECYCLE
})();
