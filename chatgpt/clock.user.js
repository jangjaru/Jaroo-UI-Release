// ==UserScript==
// @name         Jaroo's Company · Sidebar Live Clock
// @namespace    jaroo.local.chatgpt
// @version      3.7.2
// @description  Restores handwritten logo, single-line metric headings and right aligned Korean hour units; preserves 7-segment clock and native sidebar mounting
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/clock.user.js
// @downloadURL  https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/clock.user.js
// ==/UserScript==

(() => {
  'use strict';

  // Preserves proven sidebar placement / React re-render recovery from v2.4.
  // v3.6.3: the entire dashboard (brand, life, date/time, status dock) is a normal native-sidebar flow item, never fixed over menus.
  // V7.2 restores the original Kaushan Script company logotype; other UI uses Pretendard.
  // Sidebar placement and source-menu bridging are inherited unchanged.
  // Counter and status business logic remains owned by Status.
  const RUNTIME_KEY = '__jarooCompanyClockRuntime';
  window[RUNTIME_KEY]?.dispose?.();

  // Chrome may not register a typed custom property declared inside a ShadowRoot.
  // Without document-wide registration, the conic-gradient angle jumps between
  // 0deg and 360deg instead of moving smoothly. Register once before rendering.
  if (typeof CSS !== 'undefined' && typeof CSS.registerProperty === 'function') {
    try {
      CSS.registerProperty({
        name: '--jaroo-brand-light-angle',
        syntax: '<angle>',
        inherits: false,
        initialValue: '0deg'
      });
    } catch (_) {
      // Already registered by an earlier page version; safe to keep using it.
    }
  }

  const HOST_ID = 'jaroo-clock-overlay-v25'; // Keep existing host ID; avoid duplicate clocks
  const STYLE_ID = 'jaroo-clock-menu-layout-v25';
  const SPACER_ATTR = 'data-jaroo-clock-menu';
  const SOURCE_ATTR = 'data-jaroo-brand-source';
  const MIN_BRAND_FONT = 16;
  const BRAND_FONT = 23;
  const MAX_BRAND_WIDTH = 620; // wide sidebars expand rather than stopping at 280px
  const EDGE_GUTTER = 12;
  // Original cursive brand font from v3.6.9, loaded only for logo when allowed.
  // Browser fallback is Segoe Script/cursive, and no font file is included.
  const BRAND_FONT_LINK_ID = 'jaroo-brand-kaushan-gfont-v3514';
  let fontLink = document.getElementById(BRAND_FONT_LINK_ID);
  if (!fontLink) {
    fontLink = document.createElement('link');
    fontLink.id = BRAND_FONT_LINK_ID;
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Kaushan+Script&display=swap';
    fontLink.referrerPolicy = 'no-referrer';
    document.head.appendChild(fontLink);
  }
  let lastFolderAlignX = null;
  const LOGO =
    'button[aria-label*="현재 모드: ChatGPT" i], ' +
    'button[aria-label*="현재 모드: Codex" i]';
  const SIDEBAR =
    '#stage-sidebar, #stage-slideover-sidebar, #slate-sidebar, ' +
    '[data-testid="sidebar"], aside';

  // Privacy-preserving compatibility with the existing local-only Tampermonkey
  // profile. Never publish personal dates, locations, or the profile itself.
  const PROFILE = window.__jarooPrivateProfileV1 || null;
  const parseLocalDate = value =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(value + 'T00:00:00+09:00') : new Date(NaN);
  const WEATHER = Object.freeze({
    latitude: Number(PROFILE?.weatherLatitude),
    longitude: Number(PROFILE?.weatherLongitude),
    city: typeof PROFILE?.weatherLabel === 'string' ? PROFILE.weatherLabel : '',
    intervalMs: 30*60*1000
  });
  const WEATHER_PROFILE_VALID = !!PROFILE &&
    Number.isFinite(WEATHER.latitude) &&
    Number.isFinite(WEATHER.longitude) &&
    WEATHER.latitude >= -90 && WEATHER.latitude <= 90 &&
    WEATHER.longitude >= -180 && WEATHER.longitude <= 180;
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hourCycle: 'h23'
  });

  const LIFE = {
    birth: parseLocalDate(PROFILE?.birthDate),
    retirement: parseLocalDate(PROFILE?.retirementDate),
    age80: parseLocalDate(PROFILE?.lifePlanEndDate),
    workdayStartHour: 9,
    workdayEndHour: 18,
    workHoursPerDay: 8
  };
  const LIFE_PROFILE_VALID = [LIFE.birth, LIFE.retirement, LIFE.age80]
    .every(d => Number.isFinite(d.getTime())) &&
    LIFE.birth < LIFE.retirement && LIFE.retirement < LIFE.age80;

  // Remove clocks and spacing left by older versions.
  for (const id of [
    'jaroo-sidebar-live-clock', 'jaroo-clock-overlay-v2',
    'jaroo-clock-overlay-v21', 'jaroo-clock-overlay-v22',
    'jaroo-clock-menu-layout-v22',
    'jaroo-clock-overlay-v23', 'jaroo-clock-menu-layout-v23',
    'jaroo-clock-overlay-v24', 'jaroo-clock-menu-layout-v24',
    HOST_ID, STYLE_ID,
    'jaroo-clock-space-v2'
  ]) document.getElementById(id)?.remove();

  document.querySelectorAll('.jaroo-clock-space-v2').forEach(el => {
    el.classList.remove('jaroo-clock-space-v2');
    el.style.removeProperty('--jaroo-clock-gap');
  });

  // A separate host survives React re-rendering of the sidebar.
  // Track only measured sidebar roots; never annotate the whole document.
  const densitySidebars = new Set();
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText =
    'position:relative!important;' +
    'z-index:3!important;' +
    'pointer-events:auto!important;' +
    'display:none;' +
    'box-sizing:border-box!important;' +
    'min-width:0!important;' +
    'flex:0 0 auto!important;' +
    'max-width:none!important;' +
    'margin:0!important;' +
    'padding:0!important;' +
    'border:0!important;' +
    'transform:none!important';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host {
        --accent: #42DDEB;
        --jaroo-ui-scale: 1;
        --jaroo-dashboard-gap: calc(11px * var(--jaroo-ui-scale));
      }
      /* All component scales are derived from actual in-flow sidebar width,
         never from a fixed viewport size or title string length. */
      :host([data-mode="codex"]) { --accent: #C9A3FF; }

      /* v3.5.17: keep the existing selected-chat-like neon. The glass logo
         uses exactly two typographic lines with 30% of the former 1cm padding. */
      @property --jaroo-brand-light-angle {
        syntax:"<angle>";inherits:false;initial-value:0deg;
      }
      .fallback-brand {
        box-sizing:border-box;position:relative;isolation:isolate;
        display:flex;align-items:center;gap:6px;
        width:100%;min-width:0;max-width:100%;height:auto;min-height:0;
        margin:0;padding:.3cm;
        border:2.5px solid rgba(114,217,255,.92);border-radius:12px;
        background:#171C2B;
        box-shadow:0 0 7px rgba(87,233,255,.48),0 0 11px rgba(189,147,249,.38),
                   0 0 14px rgba(255,184,108,.18),0 2px 9px rgba(0,0,0,.26);
        color:#F5F5FB;
        font:400 var(--jaroo-brand-font,28px)/1 "Kaushan Script","Segoe Script",cursive;
        letter-spacing:0;text-align:left;white-space:nowrap;overflow:hidden;
        appearance:none;pointer-events:auto;cursor:pointer;user-select:none;
        transition:border-color 250ms ease,box-shadow 250ms ease;
        /* A quick inward-and-outward neon breath; dimensions never change. */
        animation:jaroo-brand-glass-breathe 1.15s ease-in-out infinite;
      }
      /* Same high-chroma palette as the selected-chat Light Runner (#BD93F9,
         #FF79C6, #FFB86C). The ring mask confines *both* lights to the edge. */
      .fallback-brand::before,.fallback-brand::after{
        content:"";position:absolute;inset:0;pointer-events:none;
        box-sizing:border-box;border-radius:inherit;padding:2.5px;
        -webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);
        -webkit-mask-composite:xor;mask-composite:exclude;
      }
      .fallback-brand::before{
        z-index:0;
        background:linear-gradient(102deg,#45E9FF 0%,#6E8CFF 34%,#985BFF 58%,#FF9A2F 100%);
        filter:drop-shadow(0 0 3px rgba(79,229,255,.80))
               drop-shadow(0 0 6px rgba(117,111,255,.55));
        opacity:.86;
        animation:jaroo-brand-rim-breathe 1.15s ease-in-out infinite;
      }
      /* Animate gradient angle, never the rectangular element itself. This
         prevents the giant beam crossing the logo's glass center. */
      .fallback-brand::after{
        z-index:1;
        background:conic-gradient(from var(--jaroo-brand-light-angle) at 50% 50%,
           transparent 0deg,transparent 279deg,
           rgba(64,214,255,.14) 288deg,#49E7FF 298deg,
           #6D85FF 309deg,#FFFDFC 318deg,#FFFFFF 325deg,
           #C06FFF 332deg,#FF9A2F 343deg,
           rgba(255,154,47,.16) 352deg,transparent 359deg,transparent 360deg);
        filter:drop-shadow(0 0 6px rgba(94,221,255,.92));
        animation:jaroo-brand-light-runner 1.65s linear infinite;
      }
      .fallback-brand:hover{
        border-color:#8BE9FD;
        box-shadow:0 0 12px rgba(87,233,255,.72),0 0 18px rgba(189,147,249,.56),
                   0 0 18px rgba(255,184,108,.30),0 2px 9px rgba(0,0,0,.26);
      }
      .fallback-brand:focus-visible{outline:2px solid #8BE9FD;outline-offset:3px}
      .fallback-brand > *{position:relative;z-index:2}
      .brand-word{
        display:flex;flex-direction:column;justify-content:center;align-items:center;
        flex:1 1 auto;min-width:0;max-width:100%;
        white-space:nowrap;overflow-wrap:normal;word-break:keep-all;
        gap:3px;padding:0;
      }
      .brand-title{
        display:block;flex:0 0 auto;max-width:100%;
        white-space:nowrap;overflow-wrap:normal;word-break:keep-all;text-align:center;
        color:#6DEBFF;
        background:linear-gradient(97deg,#57E9FF 0%,#8BE9FD 31%,#BD93F9 64%,#FFB86C 100%);
        -webkit-background-clip:text;background-clip:text;
        -webkit-text-fill-color:transparent;
        font:580 var(--jaroo-brand-font,28px)/1.08 "Kaushan Script","Segoe Script",cursive;
        font-synthesis:weight;
        -webkit-text-stroke:.18px rgba(245,210,255,.34);
        paint-order:stroke fill;
        letter-spacing:-.12px;
        filter:drop-shadow(0 0 2px rgba(69,238,255,.55))
               drop-shadow(0 0 4px rgba(142,97,255,.46));
      }
      .brand-subtitle{
        display:block;max-width:100%;overflow:visible;
        white-space:nowrap;overflow-wrap:normal;word-break:keep-all;text-align:center;
        background:linear-gradient(90deg,#8BE9FD 0%,#BD93F9 55%,#FFB86C 100%);
        -webkit-background-clip:text;background-clip:text;
        -webkit-text-fill-color:transparent;
        font:850 var(--jaroo-brand-subtitle-font,11.2px)/1.12 "Pretendard","Inter",sans-serif;
        letter-spacing:.07em;text-transform:uppercase;
        filter:drop-shadow(0 0 2px rgba(109,235,255,.52));
        opacity:1;
      }
      .brand-arrow{
        display:grid;place-items:center;flex:0 0 13px;width:13px;height:24px;
        margin-left:auto;color:#ECF5FF;
      }
      .brand-arrow svg{display:block;width:13px;height:13px;filter:none}
      .fallback-brand[aria-expanded="true"] .brand-arrow svg{transform:rotate(180deg)}
      .fallback-brand[aria-disabled="true"]{cursor:default}
      .fallback-brand[aria-disabled="true"] .brand-arrow{display:none}
      :host([data-density="compact"]) .fallback-brand{gap:4px;padding:.3cm}
      :host([data-density="compact"]) .brand-arrow{width:12px;flex-basis:12px}
      :host([data-density="stacked-label"]) .fallback-brand{gap:3px;padding:.3cm}
      :host([data-density="stacked-label"]) .brand-arrow{width:11px;flex-basis:11px}
      @keyframes jaroo-brand-light-runner{
        from{--jaroo-brand-light-angle:0deg}
        to{--jaroo-brand-light-angle:360deg}
      }
      /* Slightly faster/sportier pulse: independent of the moving perimeter light. */
      @keyframes jaroo-brand-glass-breathe{
        0%,100%{box-shadow:0 0 5px rgba(87,233,255,.46),0 0 9px rgba(189,147,249,.30),0 0 13px rgba(255,184,108,.15),0 2px 9px rgba(0,0,0,.26)}
        52%{box-shadow:0 0 11px rgba(87,233,255,.78),0 0 17px rgba(189,147,249,.61),0 0 20px rgba(255,184,108,.32),0 2px 9px rgba(0,0,0,.26)}
      }
      @keyframes jaroo-brand-rim-breathe{
        0%,100%{opacity:.68;filter:brightness(.94) drop-shadow(0 0 3px rgba(87,233,255,.52))}
        52%{opacity:1;filter:brightness(1.24) drop-shadow(0 0 6px rgba(189,147,249,.80))}
      }
      .clock{margin-top:var(--jaroo-dashboard-gap)}
      @media (prefers-reduced-motion: reduce){
        .fallback-brand,.fallback-brand::before,.fallback-brand::after{
          animation:none!important;transition:none!important;
        }
      }
      .clock {
        box-sizing: border-box;
        width: 100%;
        padding: 4px 0 5px;
        background: transparent;
        border: none;
        outline: none;
        box-shadow: none;
        font-family: "Pretendard Variable", "Pretendard", "Malgun Gothic", sans-serif;
        user-select: none;
      }
      .clock-content {
        transform-origin: left top;
        display:flex;flex-direction:column;align-items:stretch;
        max-width:100%;border:0;text-decoration:none;
      }
      .clock-line{
        display:flex;align-items:center;gap:16px;min-height:58px;width:100%;
        zoom:var(--jaroo-ui-scale);
      }
      .date-chip{
        flex:0 0 67px;width:67px;height:58px;border-radius:12px;
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;
        border:1.4px solid rgba(140,154,182,.34);
        background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.03));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.05),0 0 0 1px rgba(255,255,255,.03);
      }
      .date-main{color:#EAF1FF;font-size:12px;font-weight:680;line-height:1;white-space:nowrap;letter-spacing:-.02em}
      .weather-line{display:flex;align-items:center;justify-content:center;gap:2px;max-width:100%;white-space:nowrap;color:#BACBE3}
      .weather-symbol{font-size:12px;line-height:1;flex:0 0 auto}
      .weather-label{font:600 9px/1.1 "Pretendard",sans-serif;letter-spacing:-.03em}
      .weather-line[data-weather="error"] .weather-symbol{color:#9FA8BF}
      /* CSS seven-segment display: real lit segments, not a text-font approximation.
         Keep exactly six .digit cells and their 21×38 geometry for Status dock anchoring. */
      .digital-time{
        display:flex;align-items:center;flex-wrap:nowrap;
        height:40px;max-width:100%;margin-top:0;flex:1 1 auto;
        color:#91F3FF;letter-spacing:0;font-variant-numeric:tabular-nums;
        animation:jaroo-clock-soft-bloom 4.2s ease-in-out infinite;
      }
      .pair{display:inline-flex;align-items:center;gap:0;flex:0 0 auto}
      .digit{
        display:inline-block;position:relative;box-sizing:border-box;
        flex:0 0 21px;width:21px;height:38px;
        color:#93F3FF;
      }
      .digit .seg{
        position:absolute;display:block;box-sizing:border-box;pointer-events:none;
        background:#74DDEB;opacity:.065;
        filter:none;
      }
      .digit .seg.on{
        background:linear-gradient(180deg,#D5FFFF 0%,#96F5FF 52%,#67E6F3 100%);
        opacity:1;
        box-shadow:0 0 4px rgba(161,252,255,.84),0 0 10px rgba(91,233,253,.75),0 0 17px rgba(63,210,252,.34);
        filter:drop-shadow(0 0 2.5px rgba(135,248,255,.57));
      }
      .seg-a,.seg-g,.seg-d{left:4px;width:13.6px;height:3.7px;clip-path:polygon(13% 0,87% 0,100% 50%,87% 100%,13% 100%,0 50%)}
      .seg-a{top:1px}.seg-g{top:18px}.seg-d{top:35px}
      .seg-f,.seg-e,.seg-b,.seg-c{width:3.7px;height:15px;clip-path:polygon(50% 0,100% 11%,100% 89%,50% 100%,0 89%,0 11%)}
      .seg-f{left:1px;top:3px}.seg-e{left:1px;top:20px}
      .seg-b{right:1px;top:3px}.seg-c{right:1px;top:20px}
      .separator{
        display:inline-flex;align-items:center;justify-content:center;
        flex:0 0 8px;width:8px;height:38px;margin-inline:4px;
        color:#B3FAFF;font:600 30px/1 "Consolas",monospace;
        text-shadow:0 0 6px rgba(115,245,255,.84),0 0 13px rgba(87,223,255,.40);
      }
      @keyframes jaroo-clock-soft-bloom{
        0%,100%{filter:drop-shadow(0 0 1px rgba(76,225,251,.18))}
        50%{filter:drop-shadow(0 0 3px rgba(92,232,255,.40))}
      }
      @media (prefers-reduced-motion: reduce){
        .digit .seg.on,.separator{box-shadow:none;filter:none;text-shadow:none}
        .digital-time{animation:none;filter:none}
      }
      .life-clock{
        margin-top:calc(13px * var(--jaroo-ui-scale));
        padding:calc(10px * var(--jaroo-ui-scale)) calc(10px * var(--jaroo-ui-scale)) calc(11px * var(--jaroo-ui-scale));
        border-radius:16px;border:1.8px solid rgba(194,132,255,.72);
        background:linear-gradient(180deg,rgba(21,24,39,.84),rgba(26,31,51,.86));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.08),0 0 8px rgba(191,117,255,.18),0 0 16px rgba(255,121,198,.14);
        color:#ECF3FF;pointer-events:auto;
      }
      .life-head{display:flex;align-items:center;justify-content:space-between;gap:calc(8px * var(--jaroo-ui-scale));margin-bottom:calc(9px * var(--jaroo-ui-scale))}
      .life-title{display:inline-flex;align-items:center;gap:7px;font:800 max(10px,calc(11.5px * var(--jaroo-ui-scale)))/1 "Pretendard","Inter",sans-serif;letter-spacing:.04em;color:#F3D4FF;text-transform:uppercase}
      .life-title .ico{font-size:calc(13px * var(--jaroo-ui-scale));filter:drop-shadow(0 0 4px rgba(214,132,255,.55))}
      .life-sub{font:650 max(9px,calc(10px * var(--jaroo-ui-scale)))/1 "Pretendard","Inter",sans-serif;color:#D9B7FF;opacity:.88}
      /* Three full-width, compact metrics. The 80-year total moves to LIFE PROGRESS. */
      .life-grid{display:flex;flex-direction:column;gap:calc(6px * var(--jaroo-ui-scale))}
      .life-card{
        min-width:0;padding:calc(8px * var(--jaroo-ui-scale)) calc(10px * var(--jaroo-ui-scale));
        border-radius:11px;border:1px solid rgba(255,255,255,.09);
        background:linear-gradient(180deg,rgba(255,255,255,.035),rgba(255,255,255,.015));
        box-shadow:inset 0 1px 0 rgba(255,255,255,.045);
      }
      .life-card.retire{background:linear-gradient(100deg,rgba(255,184,108,.115),rgba(255,184,108,.02))}
      .life-card.work{background:linear-gradient(100deg,rgba(72,201,255,.11),rgba(72,201,255,.02))}
      .life-card.after{background:linear-gradient(100deg,rgba(128,255,175,.11),rgba(128,255,175,.02))}
      .life-card-main{display:flex;align-items:center;gap:calc(8px * var(--jaroo-ui-scale));justify-content:space-between;min-width:0}
      .life-label{
        display:flex;align-items:center;flex:1 1 auto;min-width:0;
        font:660 max(9px,calc(10px * var(--jaroo-ui-scale)))/1.2 "Pretendard","Inter",sans-serif;
        white-space:nowrap;text-align:left;color:#E8EAFF;opacity:.96;
      }
      .life-card.retire .life-label{color:#FFC36B}
      .life-card.work .life-label{color:#73EBFF}
      .life-card.after .life-label{color:#96FFB1}
      .life-value{
        display:block;flex:0 1 auto;max-width:65%;min-width:0;
        font:500 calc(13.8px * var(--jaroo-ui-scale))/1.2 "Pretendard","Inter",sans-serif;
        font-variant-numeric:tabular-nums;letter-spacing:-.02em;
        color:#FBFCFF;white-space:nowrap;text-align:right;overflow:visible;
      }
      .life-meta{margin-top:calc(3px * var(--jaroo-ui-scale));
        font:480 max(8.5px,calc(9px * var(--jaroo-ui-scale)))/1.25 "Pretendard","Inter",sans-serif;
        color:#AEB9D1;opacity:.91;text-align:left;white-space:nowrap;
      }
      .life-progress{margin-top:calc(9px * var(--jaroo-ui-scale));padding-top:calc(8px * var(--jaroo-ui-scale));border-top:1px solid rgba(255,255,255,.07)}
      .life-progress-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:calc(6px * var(--jaroo-ui-scale))}
      .life-progress-title{font:800 max(9px,calc(11.2px * var(--jaroo-ui-scale)))/1 "Pretendard","Inter",sans-serif;letter-spacing:.03em;color:#F1D1FF;text-transform:uppercase}
      .life-progress-scale{font:650 max(8.5px,calc(10px * var(--jaroo-ui-scale)))/1 "Pretendard","Inter",sans-serif;color:#D1C7F9}
      .life-bar{position:relative;height:calc(9px * var(--jaroo-ui-scale));border-radius:999px;overflow:hidden;background:rgba(255,255,255,.09);box-shadow:inset 0 1px 2px rgba(0,0,0,.35),0 0 0 1px rgba(255,255,255,.04)}
      .life-bar-fill{height:100%;width:0%;border-radius:inherit;background:linear-gradient(90deg,#B478FF 0%,#FF62C1 54%,#FFC56B 100%);box-shadow:0 0 10px rgba(255,121,198,.35),0 0 18px rgba(180,120,255,.24);transition:width .6s ease}
      .life-bar-glow{position:absolute;inset:0;border-radius:inherit;pointer-events:none;box-shadow:inset 0 0 8px rgba(255,255,255,.08),0 0 10px rgba(255,121,198,.08);animation:jaroo-life-bar-breathe 1.8s ease-in-out infinite}
      .life-progress-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:calc(6px * var(--jaroo-ui-scale));margin-top:calc(7px * var(--jaroo-ui-scale));color:#DCE2F2}
      .life-progress-stat{display:flex;flex-direction:column;align-items:flex-start;min-width:0;gap:calc(3px * var(--jaroo-ui-scale))}
      .life-progress-stat.remaining{align-items:flex-end}
      .life-progress-stat span{font:580 max(8.8px,calc(9.6px * var(--jaroo-ui-scale)))/1.1 "Pretendard","Inter",sans-serif;white-space:nowrap}
      .life-progress-stat strong{font:590 max(10px,calc(12px * var(--jaroo-ui-scale)))/1.1 "Pretendard","Inter",sans-serif;color:#FFF0FE;letter-spacing:-.015em;white-space:nowrap;font-variant-numeric:tabular-nums}
      :host([data-jaroo-width="narrow"]) .life-head .life-sub{display:none}
      :host([data-jaroo-width="narrow"]) .life-card-main{display:grid;grid-template-columns:minmax(0,1fr);row-gap:3px}
      :host([data-jaroo-width="narrow"]) .life-value{max-width:100%;text-align:right}
      :host([data-jaroo-width="narrow"]) .life-meta{font-size:8.5px}
      :host([data-jaroo-width="narrow"]) .life-label{font-size:9px}
      :host([data-jaroo-width="narrow"]) .life-progress-stat span{font-size:8px}
      :host([data-jaroo-width="narrow"]) .life-progress-stat strong{font-size:9.6px}
      /* v3.6.6 · Progressive disclosure, NOT uniform minification.
         The sidebar's physical width drives compact and essential modes.
         Core metrics/controls have font-size floors; optional context is
         visually hidden only in the smallest width. */
      .life-title-short,.life-progress-percent{display:none}
      :host([data-jaroo-width="narrow"]) .life-title-full{display:none}
      :host([data-jaroo-width="narrow"]) .life-title-short{display:inline}
      :host([data-jaroo-width="narrow"]) .life-title{white-space:nowrap;letter-spacing:0}
      :host([data-jaroo-width="narrow"]) .life-progress-title{white-space:nowrap;font-size:10px;letter-spacing:-.015em}
      :host([data-jaroo-width="narrow"]) .life-progress-scale{display:none}
      :host([data-jaroo-width="narrow"]) .life-progress-percent{display:block;white-space:nowrap;font:650 10px/1 "Pretendard",sans-serif;color:#E8C8FF}
      /* At genuinely minimum width, drop the secondary date/weather tile.
         Center the legible HH:MM clock; never let glyphs cross the sidebar. */
      :host([data-jaroo-width="narrow"]) .date-chip{display:none}
      :host([data-jaroo-width="narrow"]) .clock-line{justify-content:center;gap:0}
      :host([data-jaroo-width="narrow"]) .digital-time{flex:0 0 auto;max-width:100%}
      :host([data-jaroo-width="compact"]) .life-sub,
      :host([data-jaroo-width="narrow"]) .life-sub{display:none}
      :host([data-jaroo-width="compact"]) .life-title,
      :host([data-jaroo-width="narrow"]) .life-title{font-size:11.3px;letter-spacing:.015em}
      :host([data-jaroo-width="compact"]) .life-clock,
      :host([data-jaroo-width="narrow"]) .life-clock{padding:9px 9px 10px;border-radius:13px}
      :host([data-jaroo-width="compact"]) .life-head,
      :host([data-jaroo-width="narrow"]) .life-head{margin-bottom:7px}
      :host([data-jaroo-width="compact"]) .life-grid,
      :host([data-jaroo-width="narrow"]) .life-grid{gap:6px}
      :host([data-jaroo-width="compact"]) .life-card,
      :host([data-jaroo-width="narrow"]) .life-card{padding:8px 9px}
      :host([data-jaroo-width="compact"]) .life-label,
      :host([data-jaroo-width="narrow"]) .life-label{font-size:10.5px}
      :host([data-jaroo-width="compact"]) .life-value,
      :host([data-jaroo-width="narrow"]) .life-value{font-weight:560;white-space:nowrap;overflow:visible}
      :host([data-jaroo-width="compact"]) .life-meta,
      :host([data-jaroo-width="narrow"]) .life-meta{display:none}
      :host([data-jaroo-width="compact"]) .life-progress,
      :host([data-jaroo-width="narrow"]) .life-progress{margin-top:8px;padding-top:7px}
      :host([data-jaroo-width="compact"]) .life-progress-head,
      :host([data-jaroo-width="narrow"]) .life-progress-head{margin-bottom:5px}
      :host([data-jaroo-width="compact"]) .life-progress-title,
      :host([data-jaroo-width="narrow"]) .life-progress-title{font-size:10.6px}
      :host([data-jaroo-width="compact"]) .life-progress-scale,
      :host([data-jaroo-width="narrow"]) .life-progress-scale{font-size:10px}
      :host([data-jaroo-width="compact"]) .life-progress-meta,
      :host([data-jaroo-width="narrow"]) .life-progress-meta{display:none}
      :host([data-jaroo-width="compact"]) .life-bar,
      :host([data-jaroo-width="narrow"]) .life-bar{height:8px}
      /* Four-digit HH:MM in narrow modes preserves seven-segment fidelity.
         Seconds remain in DOM for the clock's original sync behavior. */
      :host([data-jaroo-width="compact"]) .digital-time>.pair:last-child,
      :host([data-jaroo-width="narrow"]) .digital-time>.pair:last-child,
      :host([data-jaroo-width="compact"]) .digital-time>.separator:nth-last-child(2),
      :host([data-jaroo-width="narrow"]) .digital-time>.separator:nth-last-child(2){display:none}
      :host([data-jaroo-width="compact"]) .clock-line,
      :host([data-jaroo-width="narrow"]) .clock-line{zoom:1;gap:11px;min-height:49px}
      :host([data-jaroo-width="compact"]) .date-chip{width:58px;flex-basis:58px;height:49px;gap:4px}
      :host([data-jaroo-width="narrow"]) .date-chip{width:49px;flex-basis:49px;height:48px;gap:4px}
      :host([data-jaroo-width="compact"]) .date-main{font-size:11px}
      :host([data-jaroo-width="narrow"]) .date-main{font-size:10px}
      :host([data-jaroo-width="compact"]) .weather-label{font-size:9px}
      :host([data-jaroo-width="narrow"]) .weather-label{display:none}
      :host([data-jaroo-width="narrow"]) .weather-symbol{font-size:15px}
      :host([data-jaroo-width="compact"]) .life-card-main{display:flex;align-items:center;gap:4px}
      :host([data-jaroo-width="compact"]) .life-value{max-width:70%;font-size:13.8px}
      :host([data-jaroo-width="narrow"]) .life-card-main{display:grid;grid-template-columns:minmax(0,1fr);gap:3px}
      :host([data-jaroo-width="narrow"]) .life-value{max-width:100%;font-size:14.5px;text-align:right}
      /* v3.6.7: minimum-width readability, without touching compact/regular modes.
         No microscopic two-line logo with a compressed tagline. */
      :host([data-jaroo-width="narrow"]) .brand-subtitle{display:none}
      :host([data-jaroo-width="narrow"]) .brand-word{gap:0}
      :host([data-jaroo-width="narrow"]) .brand-title{
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:0;line-height:1;max-width:100%;background:none;
        -webkit-text-fill-color:initial;filter:none;
      }
      :host([data-jaroo-width="narrow"]) .brand-jaroo,
      :host([data-jaroo-width="narrow"]) .brand-company{
        display:block;max-width:100%;white-space:nowrap;
        background:linear-gradient(97deg,#57E9FF 0%,#8BE9FD 32%,#BD93F9 65%,#FFB86C 100%);
        -webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;
        filter:drop-shadow(0 0 3px rgba(69,238,255,.5)) drop-shadow(0 0 4px rgba(142,97,255,.43));
      }
      :host([data-jaroo-width="narrow"]) .brand-jaroo{font-size:.93em;line-height:1.12}
      :host([data-jaroo-width="narrow"]) .brand-company{font-size:1.22em;line-height:1.07}
      :host([data-jaroo-width="narrow"]) .life-label{
        font-size:12.1px;font-weight:700;line-height:1.23;letter-spacing:-.015em;
      }
      /* Retain HH:MM size and add just one weather symbol at minimum width. */
      :host([data-jaroo-width="narrow"]) .date-chip{
        display:flex;width:29px;flex:0 0 29px;height:39px;gap:0;
        padding:0;justify-content:center;align-items:center;
        border-radius:9px;
      }
      :host([data-jaroo-width="narrow"]) .date-main{display:none}
      :host([data-jaroo-width="narrow"]) .weather-line{display:flex;justify-content:center;align-items:center;gap:0}
      :host([data-jaroo-width="narrow"]) .weather-label{display:none!important}
      :host([data-jaroo-width="narrow"]) .weather-symbol{font-size:17px;line-height:1}
      :host([data-jaroo-width="narrow"]) .clock-line{justify-content:center;gap:7px}
      @media (prefers-reduced-motion: reduce){.life-bar-glow{animation:none}}
      @keyframes jaroo-life-bar-breathe{0%,100%{opacity:.58}50%{opacity:1}}
      /* ============================================================
         JAROO · SIMPLE FLAT VIVID v7.0 / CLOCK SHADOW TREE
         Only visual presentation. All existing live calculations and
         seven-segment digit updates are owned by the original JS.
         ============================================================ */
      :host{
        --v-pink:#FF3FA4;--v-purple:#9B70FF;--v-cyan:#24C2E8;
        --v-orange:#FFAB32;--v-green:#47EC84;--v-lavender:#D69BF4;
        --v-base:#151925;--v-line:#394152;--v-text:#F4F7FC;
        --v-muted:#A7B2C6;--jaroo-dashboard-gap:10px;
        font-family:"Pretendard", "Malgun Gothic",sans-serif;
      }
      :host([data-mode="codex"]){--v-pink:#D69BF4}
      /* Brand = quiet dark card + a vivid pink edge, never a neon marquee. */
      .fallback-brand,
      :host([data-density="compact"]) .fallback-brand,
      :host([data-density="stacked-label"]) .fallback-brand{
        min-height:62px;
        padding:10px 12px;
        border:2px solid var(--v-pink);
        border-radius:10px;
        background:var(--v-base);
        background-image:none;
        box-shadow:none;
        filter:none;
        animation:none;
        transition:border-color .12s linear;
        font-family:"Pretendard",sans-serif;
      }
      .fallback-brand::before,.fallback-brand::after{
        display:none!important;content:none!important;
        background:none!important;box-shadow:none!important;
        animation:none!important;filter:none!important;
      }
      .fallback-brand:hover{border-color:var(--v-pink);box-shadow:none}
      .fallback-brand:focus-visible{outline:2px solid var(--v-cyan);outline-offset:2px}
      .brand-word{align-items:flex-start;gap:5px}
      .brand-title{
        display:flex;align-items:center;justify-content:flex-start;
        max-width:100%;gap:5px;
        background:none!important;background-image:none!important;
        color:var(--v-text);-webkit-text-fill-color:var(--v-text);
        font:800 var(--jaroo-brand-font,22px)/1.05 "Pretendard",sans-serif;
        letter-spacing:-.035em;
        filter:none!important;text-shadow:none!important;
        -webkit-text-stroke:0!important;
      }
      .brand-title .brand-jaroo{
        color:var(--v-text)!important;-webkit-text-fill-color:var(--v-text)!important;
        background:none!important;filter:none!important;text-shadow:none!important;
      }
      .brand-title .brand-company{
        color:var(--v-pink)!important;-webkit-text-fill-color:var(--v-pink)!important;
        background:none!important;filter:none!important;text-shadow:none!important;
      }
      .brand-subtitle{
        display:block;max-width:100%;
        background:none!important;background-image:none!important;
        color:var(--v-lavender);-webkit-text-fill-color:var(--v-lavender);
        font:750 var(--jaroo-brand-subtitle-font,10px)/1.15 "Pretendard",sans-serif;
        text-align:left;letter-spacing:.11em;
        filter:none!important;text-shadow:none!important;
      }
      .brand-arrow{color:var(--v-pink)}
      .brand-arrow svg{filter:none}

      /* Main life panel: consistent neutral fill, single violet outline. */
      .life-clock,
      :host([data-jaroo-width="compact"]) .life-clock,
      :host([data-jaroo-width="narrow"]) .life-clock{
        padding:11px;border:1.5px solid var(--v-purple);
        border-radius:11px;
        background:var(--v-base);background-image:none;
        box-shadow:none;filter:none;
        color:var(--v-text);
      }
      .life-title{font-weight:850;letter-spacing:0;color:var(--v-lavender)}
      .life-title .ico{color:var(--v-purple);filter:none;font-size:13px}
      .life-sub{color:var(--v-muted);opacity:1}
      .life-card,
      :host([data-jaroo-width="compact"]) .life-card,
      :host([data-jaroo-width="narrow"]) .life-card{
        padding:9px 10px;
        border:1.5px solid var(--v-line);border-radius:8px;
        background:var(--v-base)!important;background-image:none!important;
        box-shadow:none!important;filter:none!important;
      }
      .life-card.retire{border-color:var(--v-orange)}
      .life-card.work{border-color:var(--v-cyan)}
      .life-card.after{border-color:var(--v-green)}
      .life-card.retire .life-label{color:var(--v-orange)}
      .life-card.work .life-label{color:var(--v-cyan)}
      .life-card.after .life-label{color:var(--v-green)}
      .life-label{font-weight:750;font-size:clamp(11px,calc(11.5px * var(--jaroo-ui-scale)),13px);opacity:1}
      .life-value{font-weight:800;color:var(--v-text);letter-spacing:-.025em}
      .life-meta{color:var(--v-muted);opacity:1}
      .life-progress{border-top:1px solid var(--v-line)}
      .life-progress-title{color:var(--v-lavender);letter-spacing:0}
      .life-progress-scale,.life-progress-percent{color:var(--v-muted)}
      .life-bar{
        height:8px;border:1px solid var(--v-line);border-radius:6px;
        background:#293041;background-image:none;
        box-shadow:none;overflow:hidden;
      }
      .life-bar-fill{
        border-radius:5px;background:var(--v-pink);background-image:none;
        box-shadow:none;filter:none;
        transition:width .3s linear;
      }
      .life-bar-glow{display:none!important;animation:none!important}
      .life-progress-meta{color:var(--v-muted)}
      .life-progress-stat strong{color:var(--v-text);font-weight:750}

      /* Cyan outlined date/clock module, flat 7-segment glyphs. */
      .clock{margin-top:8px;padding:0}
      .clock-line,
      :host([data-jaroo-width="compact"]) .clock-line,
      :host([data-jaroo-width="narrow"]) .clock-line{
        box-sizing:border-box;
        gap:8px;padding:5px 7px;min-height:54px;
        border:1.5px solid var(--v-cyan);border-radius:10px;
        background:var(--v-base);box-shadow:none;
      }
      .date-chip{
        width:63px;flex-basis:63px;height:42px;
        border:0;border-right:1px solid var(--v-line);
        border-radius:0;background:transparent;background-image:none;
        box-shadow:none;gap:5px;
      }
      .date-main{color:var(--v-text)}
      .weather-line{color:var(--v-muted)}
      .digital-time{color:var(--v-cyan);animation:none;filter:none}
      .digit{color:var(--v-cyan)}
      .digit .seg{background:var(--v-cyan);opacity:.085;filter:none}
      .digit .seg.on{
        background:var(--v-cyan);background-image:none;
        opacity:1;box-shadow:none;filter:none;
      }
      .separator{color:var(--v-cyan);text-shadow:none}

      /* Width is computed from the actual rendered sidebar, NOT viewport. */
      :host([data-jaroo-width="wide"]) .life-clock{
        display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);
        column-gap:15px;align-items:start;
      }
      :host([data-jaroo-width="wide"]) .life-head{grid-column:1 / -1}
      :host([data-jaroo-width="wide"]) .life-grid{grid-column:1}
      :host([data-jaroo-width="wide"]) .life-progress{
        align-self:center;grid-column:2;margin:0;padding:5px 0 5px 13px;
        border-top:0;border-left:1px solid var(--v-line);
      }
      :host([data-jaroo-width="wide"]) .life-progress-meta{grid-template-columns:1fr;row-gap:13px}
      :host([data-jaroo-width="wide"]) .life-progress-stat.remaining{align-items:flex-start}
      :host([data-jaroo-width="wide"]) .life-card-main{
        flex-wrap:wrap;gap:4px;
      }
      :host([data-jaroo-width="wide"]) .life-value{max-width:100%;text-align:left}
      :host([data-jaroo-width="wide"]) .life-meta{display:block}

      /* COMPACT: retain three totals, remove their explanations first. */
      :host([data-jaroo-width="compact"]) .life-head{margin-bottom:8px}
      :host([data-jaroo-width="compact"]) .life-meta{display:none}
      :host([data-jaroo-width="compact"]) .life-progress-meta{display:none}
      :host([data-jaroo-width="compact"]) .life-progress-scale{display:none}
      :host([data-jaroo-width="compact"]) .life-progress-percent{
        display:block;font-size:11px;font-weight:750;color:var(--v-lavender);
      }

      /* NARROW: two actionable totals + progress %; secondary future
         estimate disappears. No numerals are miniaturized into illegibility. */
      :host([data-jaroo-width="narrow"]) .fallback-brand{min-height:65px;padding:8px 10px}
      :host([data-jaroo-width="narrow"]) .brand-word{align-items:center;gap:0}
      :host([data-jaroo-width="narrow"]) .brand-title{
        display:flex;flex-direction:column;justify-content:center;align-items:center;
        background:none!important;-webkit-text-fill-color:var(--v-text)!important;
        font-size:max(15px,var(--jaroo-brand-font,16px));gap:0;line-height:1.1;
      }
      :host([data-jaroo-width="narrow"]) .brand-jaroo,
      :host([data-jaroo-width="narrow"]) .brand-company{
        background:none!important;background-image:none!important;
        -webkit-background-clip:border-box!important;background-clip:border-box!important;
        filter:none!important;white-space:nowrap;
      }
      :host([data-jaroo-width="narrow"]) .brand-subtitle{display:none}
      :host([data-jaroo-width="narrow"]) .life-card.after{display:none}
      :host([data-jaroo-width="narrow"]) .life-meta{display:none}
      :host([data-jaroo-width="narrow"]) .life-progress-meta{display:none}
      :host([data-jaroo-width="narrow"]) .life-progress-percent{
        display:block;color:var(--v-lavender);font-size:11px;font-weight:800;
      }
      :host([data-jaroo-width="narrow"]) .life-label{
        color:inherit;font-weight:750;font-size:12px;line-height:1.2;
      }
      :host([data-jaroo-width="narrow"]) .life-card.retire .life-label{color:var(--v-orange)}
      :host([data-jaroo-width="narrow"]) .life-card.work .life-label{color:var(--v-cyan)}
      :host([data-jaroo-width="narrow"]) .life-value{
        max-width:100%;text-align:right;font-weight:800;font-size:14.5px;
      }
      :host([data-jaroo-width="narrow"]) .clock-line{gap:6px;padding:4px 5px;min-height:46px}
      :host([data-jaroo-width="narrow"]) .date-chip{
        display:flex;width:25px;flex-basis:25px;height:34px;
        border-right:1px solid var(--v-line);border-radius:0;
      }
      :host([data-jaroo-width="narrow"]) .date-main,
      :host([data-jaroo-width="narrow"]) .weather-label{display:none!important}
      :host([data-jaroo-width="narrow"]) .clock-line{justify-content:center}
      /* Native 7-segment HH:MM geometry remains owned by existing script. */
      /* EXTRA-SMALL safety below 185px. Text remains readable; only
         the least important weather glyph and chevron are removed. */
      :host([data-jaroo-micro="true"]) .brand-arrow{display:none!important}
      :host([data-jaroo-micro="true"]) .date-chip{display:none!important}
      :host([data-jaroo-micro="true"]) .clock-line{gap:0;justify-content:center}
      :host([data-jaroo-micro="true"]) .life-progress-head{
        flex-wrap:wrap;row-gap:3px;
      }
      :host([data-jaroo-micro="true"]) .life-progress-title{font-size:10px}
      :host([data-jaroo-micro="true"]) .life-progress-percent{font-size:10px}
      @media(prefers-reduced-motion:reduce){
        .fallback-brand,.life-bar-fill,.digital-time{animation:none!important;transition:none!important}
      }
      /* ===============================================================
         v7.2 · REFINEMENT · cursive logo + constant single-line metrics
         Keeps the seven-segment clock CSS exactly as v7.1.
         =============================================================== */
      .fallback-brand,
      :host([data-density="compact"]) .fallback-brand,
      :host([data-density="stacked-label"]) .fallback-brand{
        min-height:60px;overflow:hidden;
        padding:9px 10px;
      }
      .brand-word{align-items:center;gap:3px;min-width:0}
      .brand-title,
      :host([data-jaroo-width="narrow"]) .brand-title{
        display:flex;flex-direction:row;align-items:baseline;
        justify-content:center;gap:.19em;
        font:580 var(--jaroo-brand-font,22px)/1.1 "Kaushan Script","Segoe Script",cursive!important;
        letter-spacing:-.025em;
        -webkit-text-fill-color:initial!important;
        text-align:center;white-space:nowrap;
      }
      .brand-title .brand-jaroo,
      :host([data-jaroo-width="narrow"]) .brand-jaroo{
        color:var(--v-cyan)!important;
        -webkit-text-fill-color:var(--v-cyan)!important;
        font:inherit!important;line-height:1.1!important;
        filter:none!important;
      }
      .brand-title .brand-company,
      :host([data-jaroo-width="narrow"]) .brand-company{
        color:var(--v-pink)!important;
        -webkit-text-fill-color:var(--v-pink)!important;
        font:inherit!important;line-height:1.1!important;
        filter:none!important;
      }
      .brand-subtitle{align-self:center;text-align:center}
      :host([data-jaroo-width="narrow"]) .brand-subtitle{display:none}
      :host([data-jaroo-width="narrow"]) .brand-title{font-size:var(--jaroo-brand-font,18px)!important}
      /* At true minimum width, keep each cursive word legible instead of
         squeezing the full logo onto a too-short single line. */
      :host([data-jaroo-micro="true"]) .brand-title{
        flex-direction:column!important;align-items:center;justify-content:center;
        gap:0!important;line-height:1!important;
      }
      :host([data-jaroo-micro="true"]) .fallback-brand{min-height:67px}
      /* All three metric cards keep the same two-line composition at ANY width.
         Row one = vivid label + gray descriptor; row two = value right aligned. */
      .life-clock,
      :host([data-jaroo-width="wide"]) .life-clock{
        display:block!important;
        padding:10px!important;
      }
      .life-grid,
      :host([data-jaroo-width="wide"]) .life-grid{
        display:flex!important;flex-direction:column!important;
        gap:6px!important;
      }
      .life-head,
      :host([data-jaroo-width="wide"]) .life-head{display:flex!important;margin-bottom:8px!important}
      .life-card,
      :host([data-jaroo-width="compact"]) .life-card,
      :host([data-jaroo-width="narrow"]) .life-card{
        display:block!important;min-width:0;
        padding:7px 9px!important;
        border-radius:9px;
      }
      .life-card-main,
      :host([data-jaroo-width="wide"]) .life-card-main,
      :host([data-jaroo-width="compact"]) .life-card-main,
      :host([data-jaroo-width="narrow"]) .life-card-main{
        display:grid!important;grid-template-columns:minmax(0,1fr)!important;
        grid-template-rows:auto auto;row-gap:4px!important;
        align-items:stretch!important;min-width:0;gap:4px!important;
      }
      .life-caption{display:flex;align-items:baseline;gap:7px;min-width:0;max-width:100%;overflow:hidden;white-space:nowrap}
      .life-label,
      :host([data-jaroo-width="narrow"]) .life-label{
        display:inline-block;flex:0 0 auto;min-width:0;
        line-height:1.2!important;white-space:nowrap;
        font-size:11px!important;font-weight:750;
      }
      .life-meta,
      :host([data-jaroo-width="compact"]) .life-meta,
      :host([data-jaroo-width="narrow"]) .life-meta,
      :host([data-jaroo-width="wide"]) .life-meta{
        display:inline-block!important;flex:0 1 auto;
        min-width:0;max-width:100%;overflow:hidden;
        margin:0!important;text-overflow:ellipsis;white-space:nowrap;
        color:var(--v-muted)!important;opacity:1;
        font-size:9px!important;line-height:1.2!important;
      }
      .life-value,
      :host([data-jaroo-width="wide"]) .life-value,
      :host([data-jaroo-width="compact"]) .life-value,
      :host([data-jaroo-width="narrow"]) .life-value{
        display:block!important;justify-self:end!important;
        width:100%!important;max-width:100%!important;
        margin:0;text-align:right!important;
        color:var(--v-text)!important;white-space:nowrap;
        font-variant-numeric:tabular-nums;letter-spacing:-.025em;
        font-weight:780!important;
      }
      :host([data-jaroo-width="narrow"]) .life-card.after{display:block!important}
      .life-progress,
      :host([data-jaroo-width="wide"]) .life-progress{
        display:block!important;margin-top:9px!important;padding:8px 0 0!important;
        border-left:0!important;border-top:1px solid var(--v-line)!important;
      }
      :host([data-jaroo-width="wide"]) .life-progress-meta{
        display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;
        gap:6px!important;
      }
      :host([data-jaroo-width="wide"]) .life-progress-stat.remaining{align-items:flex-end!important}
      :host([data-jaroo-width="narrow"]) .life-clock{
        padding:7px!important;
      }
      :host([data-jaroo-width="narrow"]) .life-card{
        padding:6px!important;
      }
      :host([data-jaroo-width="narrow"]) .life-caption{gap:4px}
      :host([data-jaroo-width="narrow"]) .life-label{font-size:9.4px!important}
      :host([data-jaroo-width="narrow"]) .life-meta{font-size:7.8px!important}
      :host([data-jaroo-width="compact"]) .life-label{font-size:10.4px!important}
      :host([data-jaroo-width="compact"]) .life-meta{font-size:8.5px!important}
      :host([data-jaroo-micro="true"]) .life-clock{padding:6px!important}
      :host([data-jaroo-micro="true"]) .life-card{padding:5px!important}
      :host([data-jaroo-micro="true"]) .life-caption{gap:3px}
      :host([data-jaroo-micro="true"]) .life-label{font-size:8.6px!important}
      :host([data-jaroo-micro="true"]) .life-meta{font-size:7px!important}
      :host([data-jaroo-micro="true"]) .life-value{letter-spacing:-.04em}
    </style>
    <button class="fallback-brand" type="button" aria-label="Jaroo's Company, A World of My Own">
      <span class="brand-word"><span class="brand-title"><span class="brand-jaroo">Jaroo's</span> <span class="brand-company">Company</span></span><span class="brand-subtitle">A WORLD OF MY OWN</span></span>
      <span class="brand-arrow" aria-hidden="true"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2 5 5 5 5-5"/></svg></span>
    </button>
    <section class="life-clock" aria-label="Jaroo Life Clock">
      <div class="life-head">
        <div class="life-title"><span class="ico" aria-hidden="true">◔</span><span class="life-title-full">Jaroo Life Clock</span><span class="life-title-short" aria-hidden="true">Life Clock</span></div>
        <div class="life-sub">남은 인생 시간</div>
      </div>
      <div class="life-grid">
        <article class="life-card retire">
          <div class="life-card-main"><div class="life-caption"><div class="life-label">▣ 은퇴까지</div><div class="life-meta" data-life="retireMeta" title="65세 기준">65세 기준</div></div><div class="life-value" data-life="retireValue">0 시간</div></div>
        </article>
        <article class="life-card work">
          <div class="life-card-main"><div class="life-caption"><div class="life-label">⌛ 남은 근무시간</div><div class="life-meta" data-life="workMeta" title="평일 8시간 기준">평일 8시간 기준</div></div><div class="life-value" data-life="workValue">0 시간</div></div>
        </article>
        <article class="life-card after">
          <div class="life-card-main"><div class="life-caption"><div class="life-label">✦ 은퇴 이후</div><div class="life-meta" data-life="afterMeta" title="65~80세 계획기간">65~80세 계획기간</div></div><div class="life-value" data-life="afterValue">0 시간</div></div>
        </article>
      </div>
      <div class="life-progress">
        <div class="life-progress-head">
          <div class="life-progress-title">Life Progress</div>
          <div class="life-progress-scale">80세 기준</div><div class="life-progress-percent" data-life="progressPercent">0%</div>
        </div>
        <div class="life-bar" aria-hidden="true">
          <div class="life-bar-fill" data-life="progressBar"></div>
          <div class="life-bar-glow"></div>
        </div>
        <div class="life-progress-meta">
          <div class="life-progress-stat"><span data-life="usedMeta">지나온 시간 · 0%</span><strong data-life="usedHours">0 h</strong></div>
          <div class="life-progress-stat remaining"><span data-life="remainingMeta">남은 시간 · 0%</span><strong data-life="remainingHours">0 h</strong></div>
        </div>
      </div>
    </section>
    <div class="clock" role="timer" aria-live="off" aria-label="한국 표준시">
      <div class="clock-content">
        <div class="clock-line">
          <div class="date-chip" title="날짜 및 설정 지역 현재 기상 상태 · Open-Meteo">
            <span class="date-main"></span>
            <span class="weather-line" data-weather="loading"><span class="weather-symbol" aria-hidden="true">◌</span><span class="weather-label">날씨 조회</span></span>
          </div>
          <div class="digital-time" aria-hidden="true"></div>
        </div>
      </div>
    </div>
  `;

  const brandEl = shadow.querySelector('.fallback-brand');
  const dateMainEl = shadow.querySelector('.date-main');
  const weatherLine = shadow.querySelector('.weather-line');
  const weatherSymbol = shadow.querySelector('.weather-symbol');
  const weatherLabel = shadow.querySelector('.weather-label');
  const clockEl = shadow.querySelector('.clock');
  const timeEl = shadow.querySelector('.digital-time');

  const lifeEls = {
    retireValue: shadow.querySelector('[data-life="retireValue"]'),
    retireMeta: shadow.querySelector('[data-life="retireMeta"]'),
    workValue: shadow.querySelector('[data-life="workValue"]'),
    workMeta: shadow.querySelector('[data-life="workMeta"]'),
    afterValue: shadow.querySelector('[data-life="afterValue"]'),
    afterMeta: shadow.querySelector('[data-life="afterMeta"]'),
    progressBar: shadow.querySelector('[data-life="progressBar"]'),
    progressPercent: shadow.querySelector('[data-life="progressPercent"]'),
    usedMeta: shadow.querySelector('[data-life="usedMeta"]'),
    remainingMeta: shadow.querySelector('[data-life="remainingMeta"]'),
    usedHours: shadow.querySelector('[data-life="usedHours"]'),
    remainingHours: shadow.querySelector('[data-life="remainingHours"]')
  };

  const lifeCard = shadow.querySelector('.life-clock');
  if (!LIFE_PROFILE_VALID) {
    lifeCard.style.display = 'none';
    console.warn('[Jaroo Life Clock] Local profile missing or invalid; life times hidden.');
  }
  let lifeMountState = 'overlay-reserved-space';

  // Digit cells preserve the status dock's .digital-time .digit geometry contract.
  const digits = [];
  for (let groupIndex = 0; groupIndex < 3; groupIndex++) {
    const pair = document.createElement('span');
    pair.className = 'pair';
    for (let index = 0; index < 2; index++) {
      const cell = document.createElement('span');
      cell.className = 'digit';
      cell.dataset.value = '0';
      for (const id of 'abcdefg') {
        const seg = document.createElement('i');
        seg.className = 'seg seg-' + id;
        seg.setAttribute('aria-hidden','true');
        cell.appendChild(seg);
      }
      pair.appendChild(cell);
      digits.push(cell);
    }
    timeEl.appendChild(pair);
    if (groupIndex < 2) {
      const colon = document.createElement('span');
      colon.className = 'separator';
      colon.textContent = ':';
      timeEl.appendChild(colon);
    }
  }

  // Seven-segment on/off maps; only update the six cells when values change.
  const SEGMENTS = ['abcdef', 'bc', 'abdeg', 'abcdg', 'bcfg',
                    'acdfg', 'acdefg', 'abc', 'abcdefg', 'abcdfg'];
  function setDigit(cell, value) {
    if (cell.dataset.value === value && cell.dataset.drawn === '1') return;
    const active = SEGMENTS[Number(value)] || '';
    for (const seg of cell.children) seg.classList.toggle('on', active.includes(seg.classList[1].slice(-1)));
    cell.dataset.value = value;
    cell.dataset.drawn = '1';
  }


  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatNumber(value) {
    return new Intl.NumberFormat('ko-KR').format(Math.max(0, Math.round(value)));
  }

  const KST_HOUR_OFFSET_MS = 9 * 3600000;
  const HOUR_MS = 3600000;
  const DAY_MS = 86400000;
  const TIME_FORMAT = new Intl.NumberFormat('ko-KR');
  const afterRetirementHours = (LIFE.age80.getTime() - LIFE.retirement.getTime()) / HOUR_MS;

  function kstDayStartUtcMs(instantMs) {
    const shifted = new Date(instantMs + KST_HOUR_OFFSET_MS);
    return Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate()) - KST_HOUR_OFFSET_MS;
  }
  function hoursUntil(nowMs, targetMs) {
    return Math.max(0, Math.ceil((targetMs - nowMs) / HOUR_MS));
  }
  function overlapMs(a, b, c, d) {
    return Math.max(0, Math.min(b,d) - Math.max(a,c));
  }
  function calculateWorkHours(nowMs, retirementMs) {
    if (nowMs >= retirementMs) return 0;
    const firstDay = kstDayStartUtcMs(nowMs);
    const endDay = kstDayStartUtcMs(retirementMs);
    let totalMs = 0;
    for(let dayMs=firstDay; dayMs<=endDay; dayMs+=DAY_MS){
      const weekday = new Date(dayMs + KST_HOUR_OFFSET_MS).getUTCDay();
      if(weekday===0 || weekday===6) continue;
      // Local KST work schedule: 09:00–12:00 and 13:00–18:00,
      // i.e. 8 working hours/day. Public holidays and leave are not deducted.
      for(const [startHour,endHour] of [[9,12],[13,18]]){
        const blockStart=dayMs+startHour*HOUR_MS;
        const blockEnd=dayMs+endHour*HOUR_MS;
        totalMs+=overlapMs(nowMs,retirementMs,blockStart,blockEnd);
      }
    }
    return Math.ceil(totalMs/HOUR_MS);
  }
  const lifeHour = ms => `${TIME_FORMAT.format(Math.max(0,ms))} 시간`;
  let lastLifeMinuteKey = '';
  function updateLifeClock(now) {
    if (!LIFE_PROFILE_VALID) return;
    const ms=now.getTime();
    const minuteKey=Math.floor(ms/60000);
    if(minuteKey===lastLifeMinuteKey) return;
    lastLifeMinuteKey=minuteKey;

    const retirementMs=LIFE.retirement.getTime(),age80Ms=LIFE.age80.getTime();
    const retireHours=hoursUntil(ms,retirementMs);
    const age80Hours=hoursUntil(ms,age80Ms);
    const workHours=calculateWorkHours(ms,retirementMs);
    const plannedAfterHours=ms<retirementMs ? afterRetirementHours : hoursUntil(ms,age80Ms);
    const lifeMs=age80Ms-LIFE.birth.getTime();
    const used=Math.min(1,Math.max(0,(ms-LIFE.birth.getTime())/lifeMs))*100;
    const values=[
      ['retireValue',lifeHour(retireHours)],
      ['retireMeta','65세 기준'],
      ['workValue',lifeHour(workHours)],
      ['workMeta','평일 8시간 기준'],
      ['afterValue',lifeHour(plannedAfterHours)],
      ['afterMeta',ms<retirementMs?'65~80세 계획기간':'80세까지 잔여기간'],
      ['progressPercent',`${used.toFixed(1)}%`],
      ['usedMeta',`지나온 시간 · ${used.toFixed(1)}%`],
      ['remainingMeta',`남은 시간 · ${(100-used).toFixed(1)}%`],
      ['usedHours',lifeHour(Math.floor(Math.max(0,Math.min(ms,age80Ms)-LIFE.birth.getTime())/HOUR_MS))],
      ['remainingHours',lifeHour(age80Hours)]
    ];
    for(const [key,val] of values){if(lifeEls[key]?.textContent!==val)lifeEls[key].textContent=val; if(key.endsWith('Meta') && ['retireMeta','workMeta','afterMeta'].includes(key) && lifeEls[key]?.title!==val)lifeEls[key].title=val;}
    const width=`${used.toFixed(1)}%`;
    if(lifeEls.progressBar.style.width!==width)lifeEls.progressBar.style.width=width;
    if(host.isConnected)fitLifeValues();
  }

  let weatherStatus = 'loading', weatherLastAttempt = 0, weatherInFlight = false;
  const weatherName = (code, isDay) => {
    const n = Number(code);
    if (n===0) return [isDay ? '☀' : '☾','맑음'];
    if (n===1 || n===2) return ['⛅','구름조금'];
    if (n===3) return ['☁','흐림'];
    if (n===45 || n===48) return ['≋','안개'];
    if ([51,53,55,56,57].includes(n)) return ['☂','이슬비'];
    if ([61,63,65,66,67].includes(n)) return ['☂','비'];
    if ([71,73,75,77,85,86].includes(n)) return ['❄','눈'];
    if ([80,81,82].includes(n)) return ['☂','소나기'];
    if ([95,96,99].includes(n)) return ['ϟ','뇌우'];
    return ['◌','확인 불가'];
  };
  function setWeather(icon,label,status='ready') {
    weatherStatus=status;
    if (weatherSymbol.textContent!==icon) weatherSymbol.textContent=icon;
    if (weatherLabel.textContent!==label) weatherLabel.textContent=label;
    if (weatherLine.dataset.weather!==status) weatherLine.dataset.weather=status;
  }
  async function updateWeather() {
    if (!WEATHER_PROFILE_VALID) {
      if (!disposed) setWeather('◌', '지역 설정 필요', 'error');
      return;
    }
    if (disposed || document.hidden || weatherInFlight) return;
    const now = Date.now();
    if (now-weatherLastAttempt < WEATHER.intervalMs) return;
    weatherLastAttempt=now;
    weatherInFlight=true;
    const ctrl = new AbortController();
    const timeout=setTimeout(()=>ctrl.abort(),9000);
    try {
      const qs = new URLSearchParams({
        latitude:String(WEATHER.latitude), longitude:String(WEATHER.longitude),
        current:'weather_code,is_day', timezone:'Asia/Seoul'
      });
      const resp=await fetch(`https://api.open-meteo.com/v1/forecast?${qs}`,{
        mode:'cors',cache:'no-store',signal:ctrl.signal,credentials:'omit',referrerPolicy:'no-referrer'
      });
      if(!resp.ok)throw Error(`HTTP ${resp.status}`);
      const json=await resp.json();
      if (typeof json?.current?.weather_code!=='number') throw Error('invalid-weather-data');
      const [icon,label]=weatherName(json.current.weather_code,Boolean(json.current.is_day));
      if(!disposed) setWeather(icon,label,'ready');
    } catch(err){
      if(!disposed)setWeather('◌','날씨 불가','error');
    }finally{
      clearTimeout(timeout);weatherInFlight=false;
    }
  }

  function fitLifeValues() {
    const mode=host.dataset.jarooWidth || 'regular';
    const scale=Number(host.style.getPropertyValue('--jaroo-ui-scale')) || 1;
    for(const el of [lifeEls.retireValue,lifeEls.workValue,lifeEls.afterValue]){
      if(!el?.isConnected) continue;
      // Minimum readable font for collapsed layouts. Optional descriptions
      // are hidden first; the essential numeric values remain visible.
      let font = mode==='narrow' ? 14.5 : mode==='compact' ? 13.8 : Math.max(13.5,13.8*scale);
      const min = mode==='narrow' ? 13.5 : mode==='compact' ? 12.8 : 13.5;
      el.style.fontSize=`${font.toFixed(2)}px`;
      while (font>min && el.scrollWidth>el.clientWidth+1) {
        font=Math.max(min,font-.25);
        el.style.fontSize=`${font.toFixed(2)}px`;
      }
    }
  }

  function applyResponsiveScale(width, heightAvailable) {
    // v3.6.6 intentionally does not shrink the whole dashboard to 0.53x.
    // The compact mode hides secondary information instead of shrinking type.
    const mode = width < 228 ? 'narrow' : width < 285 ? 'compact' :
      width < 430 ? 'regular' : 'wide';
    // Keep physical text sizes stable. Wider sidebars reveal content instead
    // of scaling every item into oversized dashboard typography.
    const scale = (mode === 'regular' || mode === 'wide')
      ? Math.min(1.08, Math.max(1, width / 285)) : 1;
    const value=scale.toFixed(4);
    host.dataset.jarooWidth=mode;
    host.dataset.jarooMicro = width < 185 ? 'true' : 'false';
    if(host.style.getPropertyValue('--jaroo-ui-scale')!==value){
      host.style.setProperty('--jaroo-ui-scale',value);
    }
    fitLifeValues();
    return scale;
  }

  // Existing v2.2 menu spacing rule.
  const stylesheet = document.createElement('style');
  stylesheet.id = STYLE_ID;
  stylesheet.textContent = `
    [${SPACER_ATTR}="1"] {
      margin-top: calc(
        var(--jaroo-clock-native-margin, 0px) +
        var(--jaroo-clock-offset, 0px)
      ) !important;
      min-height: 0 !important;
    }
    [${SOURCE_ATTR}="v3"] {
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(stylesheet);

  let currentBranch = null;
  let queued = false;
  let placementReport = { phase: 'pending', reason: 'not-placed', lastError: '' };
  const originalMargins = new WeakMap();

  // Only native sidebar labels are searched. Never a message or our Shadow DOM.
  function shown(el) {
    if (!el?.isConnected || !el.getClientRects().length) return false;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return st.display !== 'none' && st.visibility !== 'hidden' &&
      r.width > 0 && r.height > 0 && r.right > 0 && r.left < innerWidth &&
      r.top < innerHeight && r.bottom > 0;
  }

  // The native wordmark may be SVG; its only text can be a clipped 1px
  // accessibility label. Resolve that label to its real clickable header box.
  // Never use the label's 1px geometry to position the overlay.
  function accessibleHeaderControl(label, sidebar, sidebarRect) {
    if (label.closest('[data-sidebar-archive-chatgpt-id], [data-app-action-sidebar-project-row], [data-jaroo-native-row]')) return null;
    const control = label.closest('a, button, [role="button"]');
    if (!control || control === sidebar || !sidebar.contains(control) ||
        control.matches('a[href*="/c/"]') || !shown(control)) return null;
    const r = control.getBoundingClientRect();
    // A text-shaped header control; exclude square app-rail buttons.
    if (r.width < Math.max(35, r.height * 1.6) || r.width >= 300 ||
        r.height < 12 || r.height > 66 || r.left < sidebarRect.left - 1 ||
        r.right > sidebarRect.right + 1 || r.top < sidebarRect.top - 4 ||
        r.top >= sidebarRect.top + 150) return null;
    return control;
  }

  function visibleLogo() {
    for (const node of document.querySelectorAll(LOGO)) {
      const sidebar = node.closest(SIDEBAR);
      if (!sidebar || !shown(node) || !shown(sidebar)) continue;
      const r = node.getBoundingClientRect(), sr = sidebar.getBoundingClientRect();
      if (sr.width < 170 || r.top > sr.top + 170 || r.left > 550) continue;
      return { node, legacy: true, sidebar, source: 'mode-button' };
    }
    const roots = [...document.querySelectorAll(SIDEBAR)].filter(el => {
      const r = el.getBoundingClientRect();
      return shown(el) && r.width >= 170 && r.height > 180 && r.left < 480 && r.top < 180;
    });
    for (const sidebar of roots) {
      const sr = sidebar.getBoundingClientRect();
      const labels = [...sidebar.querySelectorAll('span, div, p, h1, h2, button, a, [role="button"]')]
        .filter(el => /^(ChatGPT|Codex|Jaroo['’]s Company)$/i.test((el.textContent || '').trim()));
      const candidates = labels.filter(el => {
          if (!shown(el) || el.closest('a[href*="/c/"], [data-app-action-sidebar-project-row]')) return false;
          const r = el.getBoundingClientRect();
          return r.width >= 35 && r.width < 300 && r.height >= 12 && r.height <= 66 &&
            r.left >= sr.left - 1 && r.top < sr.top + 150;
        }).sort((a,b) => {
          const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
          return ar.width * ar.height - br.width * br.height;
        });
      if (candidates.length) return { node: candidates[0], legacy: false, sidebar, source: 'visible-text' };
      for (const label of labels) {
        const control = accessibleHeaderControl(label, sidebar, sr);
        if (control) return { node: control, legacy: false, sidebar, source: 'accessible-header-control' };
      }
    }
    return null;
  }

  let nativeControl = null;
  let hiddenSource = null;
  let sourceState = null;

  function restoreSource() {
    if (hiddenSource) {
      hiddenSource.removeAttribute(SOURCE_ATTR);
      for (const name of ['tabindex', 'aria-hidden']) {
        if (sourceState[name] === null) hiddenSource.removeAttribute(name);
        else hiddenSource.setAttribute(name, sourceState[name]);
      }
    }
    hiddenSource = null;
    sourceState = null;
    nativeControl = null;
  }

  function bindSource(logo, sidebar) {
    const control = logo.closest('button, a, [role="button"]');
    const actionable = control && sidebar.contains(control) && !control.matches('a[href*="/c/"]')
      ? control : null;
    const target = actionable || logo;
    if (hiddenSource !== target) {
      restoreSource();
      hiddenSource = target;
      sourceState = {
        tabindex: target.getAttribute('tabindex'),
        'aria-hidden': target.getAttribute('aria-hidden')
      };
    }
    nativeControl = actionable;
    if (target.getAttribute(SOURCE_ATTR) !== 'v3') target.setAttribute(SOURCE_ATTR, 'v3');
    if (actionable && target.getAttribute('tabindex') !== '-1') target.setAttribute('tabindex', '-1');
    if (target.getAttribute('aria-hidden') !== 'true') target.setAttribute('aria-hidden', 'true');
    brandEl.setAttribute('aria-disabled', actionable ? 'false' : 'true');
    brandEl.tabIndex = actionable ? 0 : -1;
    const popup = actionable?.getAttribute('aria-haspopup');
    if (popup) brandEl.setAttribute('aria-haspopup', popup);
    else brandEl.removeAttribute('aria-haspopup');
    const expanded = actionable?.getAttribute('aria-expanded');
    if (expanded !== null && expanded !== undefined) brandEl.setAttribute('aria-expanded', expanded);
    else brandEl.removeAttribute('aria-expanded');
    brandEl.title = actionable ? "Jaroo's Company · 기존 상단 메뉴 열기" : "Jaroo's Company";
  }

  brandEl.addEventListener('click', () => {
    if (!nativeControl?.isConnected) return;
    const control = nativeControl;
    const wasClosed = control.getAttribute('aria-expanded') === 'false';
    control.click();
    // Some menu controls listen for ArrowDown rather than synthetic click.
    // Use that native keyboard path only when a declared popup stayed closed.
    if (wasClosed && control.hasAttribute('aria-haspopup')) {
      requestAnimationFrame(() => {
        if (control.isConnected && control.getAttribute('aria-expanded') === 'false') {
          control.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true
          }));
        }
        schedulePlacement();
      });
    }
    schedulePlacement();
  });

  function clearSpacing() {
    if (currentBranch) {
      currentBranch.removeAttribute(SPACER_ATTR);
      currentBranch.style.removeProperty('--jaroo-clock-native-margin');
      currentBranch.style.removeProperty('--jaroo-clock-offset');
    }
    currentBranch = null;
  }

  function recordPlacement(phase, reason, details = {}) {
    placementReport = { phase, reason, lastError: '', ...details };
    if (host.getAttribute('data-jaroo-clock-state') !== phase)
      host.setAttribute('data-jaroo-clock-state', phase);
    if (host.getAttribute('data-jaroo-clock-reason') !== reason)
      host.setAttribute('data-jaroo-clock-reason', reason);
  }

  function hideWidget(reason = 'header-unavailable', details = {}) {
    host.style.setProperty('display', 'none', 'important');
    if(host.parentElement !== document.body) document.body.appendChild(host);
    restoreSource();
    clearSpacing();
    recordPlacement('hidden', reason, details);
  }

  function findMenuAnchor(sidebar, bottomOfLogo) {
    const nodes = sidebar.querySelectorAll('a, button, [role="button"]');
    const matches = [];
    for (const el of nodes) {
      const label = (el.getAttribute('aria-label') ||
        el.getAttribute('title') || '').trim();
      const value = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const names = [label, value, ...[...el.querySelectorAll('span')].map(n => n.textContent || '')]
        .map(t => t.replace(/\s+/g, ' ').trim());
      const isNew = names.some(t => /^(새\s*채팅|New\s*chat)(?:$|\s*(?:\(|Ctrl|Alt|Shift|⌘))/i.test(t));
      const isMenu = names.some(t => /^(예약|일정|Tasks?|라이브러리|Library|플러그인|Plugins?|탐색|Explore|내\s*dot|My\s*dot)$/i.test(t));
      const r = el.getBoundingClientRect();
      if (r.width < 30 || r.height < 14 ||
          r.top < bottomOfLogo - 5 || r.top > bottomOfLogo + Math.max(1800,innerHeight * 2)) continue;
      if (isNew) {
        matches.push({ node: el, index: 0, top: r.top });
      } else if (isMenu) {
        matches.push({ node: el, index: 1, top: r.top });
      }
    }
    matches.sort((a, b) => a.index - b.index || a.top - b.top);
    return matches[0] || null;
  }

  function menuBranchFor(logo, anchor, sidebar) {
    let common = logo.parentElement;
    while (common && !common.contains(anchor)) common = common.parentElement;
    if (!common || !sidebar.contains(common)) return null;
    let menu = anchor;
    while (menu.parentElement && menu.parentElement !== common) {
      menu = menu.parentElement;
    }
    let header = logo;
    while (header.parentElement && header.parentElement !== common) {
      header = header.parentElement;
    }
    return menu === header || menu === common ? null : menu;
  }

  function mountDashboardInSidebar(logo, sidebar, x, availableWidth) {
    // React native menu remains structurally unchanged: insert a single normal
    // flow sibling ahead of its scroll area, so there is no overlay or guessing
    // an arbitrary amount of menu top margin.
    const anchor = findMenuAnchor(sidebar, logo.getBoundingClientRect().bottom);
    const branch = anchor && menuBranchFor(logo, anchor.node, sidebar);
    if (!anchor || !branch || branch.contains(logo) || host.contains(branch)) return false;
    let parent = branch.parentElement;
    let before = branch;
    if (!parent) return false;
    const pstyle = getComputedStyle(parent);
    const horizontal = (pstyle.display.includes('flex') &&
      !pstyle.flexDirection.startsWith('column')) ||
      (pstyle.display.includes('grid') && pstyle.gridAutoFlow.startsWith('column'));
    if (horizontal) {
      // Nested scroll/menu branch should be vertical; never add a new column
      // to a toolbar row. If that structure isn't safe, do not cover the UI.
      if (branch.matches('button,a,[role="button"]')) return false;
      parent = branch;
      before = anchor.node.closest('button,a,[role="button"]') || anchor.node;
      while (before.parentElement && before.parentElement !== parent) before = before.parentElement;
      if (before.parentElement !== parent) return false;
    }
    // Disconnect old listeners from outdated native branches before moving.
    if (host.parentElement !== parent || host.nextSibling !== before) {
      parent.insertBefore(host, before);
    }
    const pr = parent.getBoundingClientRect();
    const cs = getComputedStyle(parent);
    const scale = parent.offsetWidth ? pr.width / parent.offsetWidth : 1;
    const contentLeft = pr.left + (parseFloat(cs.paddingLeft)||0)*scale;
    const contentRight = pr.right - (parseFloat(cs.paddingRight)||0)*scale;
    const left = Math.max(0, Math.floor((x-contentLeft)/Math.max(.1,scale)));
    const maxWidth = Math.min(MAX_BRAND_WIDTH, availableWidth/Math.max(.1,scale),
      (contentRight-x-5)/Math.max(.1,scale));
    if (!Number.isFinite(maxWidth) || maxWidth < 125) return false;
    const style = (name,value,priority='important') => {
      if (host.style.getPropertyValue(name)!==value || host.style.getPropertyPriority(name)!==priority)
        host.style.setProperty(name,value,priority);
    };
    style('position','relative');
    style('display','block');
    style('left','auto');style('top','auto');style('right','auto');
    style('width',`${Math.floor(maxWidth)}px`);
    style('margin-left',`${left}px`);
    style('margin-top','5px');style('margin-bottom','11px');
    style('padding','0');style('border','0');
    style('max-width',`calc(100% - ${left+3}px)`);
    style('clip-path','none');style('overflow','visible');
    host.dataset.layout = 'in-native-flow';
    // A CSS max-width/zoom constraint may make the *rendered* sidebar much
    // narrower than maxWidth. Classify by usable rendered width, not request.
    const renderedWidth = Math.floor(host.getBoundingClientRect().width);
    const usableWidth = renderedWidth > 0 ? Math.min(Math.floor(maxWidth), renderedWidth) : Math.floor(maxWidth);
    applyResponsiveScale(usableWidth, sidebar.getBoundingClientRect().height);
    // This gives Stylus the same measured density as Clock's Shadow DOM.
    // Attr changes are idempotent and don't mutate native sidebar children.
    const density = host.dataset.jarooWidth;
    if (sidebar.getAttribute('data-jaroo-sidebar-width') !== density)
      sidebar.setAttribute('data-jaroo-sidebar-width', density);
    densitySidebars.add(sidebar);
    // In narrow mode CSS max-width can reduce the used box below maxWidth.
    // Fit to the actual rendered width, not the optimistic requested width.
    fitBrand(usableWidth);
    // Date chip and 7-segment glyphs scale together through .clock-line zoom.
    // No transform/height hacks; native document flow determines menu position.
    const content=shadow.querySelector('.clock-content');
    content.style.transform='';content.style.height='';
    // Some sidebars keep a previous JS-added menu margin from an old release.
    clearSpacing();
    return true;
  }

  function reserveMenuSpace(logo, sidebar, clockBottom) {
    const item = findMenuAnchor(sidebar, logo.getBoundingClientRect().bottom);
    if (!item) return;  // Never erase valid spacing during temporary rerenders.
    const branch = menuBranchFor(logo, item.node, sidebar);
    if (!branch || branch.contains(logo)) return;

    if (currentBranch !== branch) {
      if (currentBranch?.isConnected) {
        currentBranch.removeAttribute(SPACER_ATTR);
        currentBranch.style.removeProperty('--jaroo-clock-native-margin');
        currentBranch.style.removeProperty('--jaroo-clock-offset');
      }
      currentBranch = branch;
    }

    if (!originalMargins.has(branch)) {
      const alreadyMarked = branch.getAttribute(SPACER_ATTR) === '1';
      const margin = alreadyMarked
        ? (parseFloat(branch.style.getPropertyValue('--jaroo-clock-native-margin')) || 0)
        : (parseFloat(getComputedStyle(branch).marginTop) || 0);
      originalMargins.set(branch, margin);
    }

    const scale = branch.offsetWidth ? branch.getBoundingClientRect().width / branch.offsetWidth : 1;
    const base = originalMargins.get(branch);
    const actualMargin = parseFloat(getComputedStyle(branch).marginTop) || 0;
    const existingOffset = branch.getAttribute(SPACER_ATTR) === '1'
      ? Math.max(0, actualMargin - base) : 0;
    const desiredTop = clockBottom + (item.index === 0 ? 10 : 50);
    const unshiftedTop = item.node.getBoundingClientRect().top - existingOffset * scale;
    const requested = Math.max(0, Math.min(240, Math.ceil((desiredTop - unshiftedTop) / scale)));
    const previousOffset = parseFloat(branch.style.getPropertyValue('--jaroo-clock-offset')) || 0;

    if (branch.getAttribute(SPACER_ATTR) !== '1') {
      branch.setAttribute(SPACER_ATTR, '1');
    }
    if (branch.style.getPropertyValue('--jaroo-clock-native-margin') !== `${base}px`) {
      branch.style.setProperty('--jaroo-clock-native-margin', `${base}px`);
    }
    if (Math.abs(previousOffset - requested) > 1 ||
        !branch.style.getPropertyValue('--jaroo-clock-offset')) {
      branch.style.setProperty('--jaroo-clock-offset', `${requested}px`);
    }
  }

  // v3.2: Geometry is updated on sidebar changes, never on every second tick.
  // A sidebar may be wider than its visible slot, or contain an app-icon rail.
  // We do not resize/reparent the application's native containers.
  function clientBounds(el) {
    const r = el.getBoundingClientRect();
    const sx = el.offsetWidth ? r.width / el.offsetWidth : 1;
    const sy = el.offsetHeight ? r.height / el.offsetHeight : 1;
    const left = r.left + el.clientLeft * sx;
    const top = r.top + el.clientTop * sy;
    return {
      left, top,
      right: left + (el.clientWidth || r.width / sx) * sx,
      bottom: top + (el.clientHeight || r.height / sy) * sy
    };
  }

  function paneBounds(sidebar, logo) {
    const vp = window.visualViewport;
    const bounds = clientBounds(sidebar);
    bounds.left = Math.max(bounds.left, vp?.offsetLeft || 0);
    bounds.right = Math.min(bounds.right,
      (vp?.offsetLeft || 0) + (vp?.width || document.documentElement.clientWidth));
    bounds.top = Math.max(bounds.top, vp?.offsetTop || 0);
    bounds.bottom = Math.min(bounds.bottom,
      (vp?.offsetTop || 0) + (vp?.height || innerHeight));
    for (let el = sidebar.parentElement; el && el !== document.documentElement; el = el.parentElement) {
      const st = getComputedStyle(el);
      // A contents wrapper has no box and cannot supply clipping bounds.
      if (st.display === 'contents') continue;
      const r = clientBounds(el);
      if (/hidden|clip|auto|scroll/.test(st.overflowX)) {
        bounds.left = Math.max(bounds.left, r.left);
        bounds.right = Math.min(bounds.right, r.right);
      }
      if (/hidden|clip|auto|scroll/.test(st.overflowY)) {
        bounds.top = Math.max(bounds.top, r.top);
        bounds.bottom = Math.min(bounds.bottom, r.bottom);
      }
    }
    // The nearest sufficiently wide, short header excludes the left app rail.
    let header = null;
    for (let el = logo.parentElement; el && el !== sidebar; el = el.parentElement) {
      const r = el.getBoundingClientRect();
      if (r.height > 116) break;
      if (r.width >= 150 && r.height >= 16 && r.height <= 116 &&
          !el.matches('button,a,[role="button"]')) header = el;
    }
    if (header) {
      const r = clientBounds(header);
      bounds.left = Math.max(bounds.left, r.left);
      bounds.right = Math.min(bounds.right, r.right);
    }
    return { ...bounds, header };
  }

  function watchBounds(sidebar, header) {
    if (!resizeObserver) return;
    if (observedSidebar === sidebar && observedHeader === header) return;
    resizeObserver.disconnect();
    observedSidebar = sidebar;
    observedHeader = header;
    resizeObserver.observe(sidebar);
    resizeObserver.observe(clockEl);
    if (header && header !== sidebar) resizeObserver.observe(header);
    // Also catch a flex/grid slot shrinking while the sidebar keeps its width.
    if (sidebar.parentElement) resizeObserver.observe(sidebar.parentElement);
  }

  function setDensity(density, font) {
    if (host.dataset.density !== density) host.dataset.density = density;
    host.style.setProperty('--jaroo-brand-font', `${font}px`);
  }

  function brandNeeds() {
    const bs = getComputedStyle(brandEl);
    // IMPORTANT: .brand-word has flex:1, so its rectangle is the *container*
    // width, NOT the text width. Measuring it forced MIN_BRAND_FONT even when
    // ~90px of free space remained. Size to the longest natural text run.
    const titleNode = shadow.querySelector('.brand-title');
    const subtitleNode = shadow.querySelector('.brand-subtitle');
    // Measure the actual unwrapped text run, not the flex item's available
    // box; this also works when the title is wider than its max-width.
    const textWidth = (node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      const width = range.getBoundingClientRect().width;
      range.detach?.();
      return width;
    };
    // A flex-column wordmark has two independent text runs in narrow mode.
    // Measuring only the wrapper underestimates the clipped Company word.
    // Use the natural text ranges of both children so fitBrand never cuts letters.
    const titleWidth = host.dataset.jarooWidth === 'narrow'
      ? Math.max(textWidth(titleNode.querySelector('.brand-jaroo')),
                 textWidth(titleNode.querySelector('.brand-company')))
      : textWidth(titleNode);
    const subtitleWidth = textWidth(subtitleNode);
    const arrow = shadow.querySelector('.brand-arrow').getBoundingClientRect().width;
    // A sidebar max-width constraint is not a CSS transform: pads are still
    // physical CSS pixels. In narrow mode do not discount them by width/style.width.
    const scale = host.dataset.jarooWidth === 'narrow' ? 1
      : host.getBoundingClientRect().width / (parseFloat(host.style.width) || 1);
    return Math.max(titleWidth, subtitleWidth) + arrow + scale * (
      (parseFloat(bs.columnGap) || 0) +
      (parseFloat(bs.paddingLeft) || 0) + (parseFloat(bs.paddingRight) || 0) +
      (parseFloat(bs.borderLeftWidth) || 0) + (parseFloat(bs.borderRightWidth) || 0));
  }

  // Preserve real dimensions in viewport pixels, including a page with CSS zoom.
  function setOverlayRect(x, y, width) {
    const setIfChanged=(prop,value)=>{
      if(host.style.getPropertyValue(prop)!==value) host.style.setProperty(prop,value,'important');
    };
    setIfChanged('left',`${x}px`);
    setIfChanged('top',`${y}px`);
    setIfChanged('width',`${width}px`);
    setIfChanged('display','block');
    const actual = host.getBoundingClientRect();
    const scale = actual.width / width;
    if (Math.abs(scale - 1) > .005 && scale > 0) {
      host.style.setProperty('width', `${width / scale}px`, 'important');
      host.style.setProperty('left', `${x + (x - actual.left) / scale}px`, 'important');
      host.style.setProperty('top', `${y + (y - actual.top) / scale}px`, 'important');
    }
  }

  function fitBrand(width) {
    const scale=parseFloat(host.style.getPropertyValue('--jaroo-ui-scale')) || 1;
    const largest=Math.min(45,Math.max(MIN_BRAND_FONT,BRAND_FONT*scale));
    const subtitleBase=Math.min(17,11.2*scale);
    for(const density of ['regular','compact','stacked-label']){
      for(let size=largest;size>=MIN_BRAND_FONT;size-=.5){
        setDensity(density,size);
        for(const factor of [1,.96,.92,.86,.8]){
          host.style.setProperty('--jaroo-brand-subtitle-font',`${Math.max(7,subtitleBase*factor).toFixed(2)}px`);
          if(brandNeeds()<=width-2)return;
        }
      }
    }
    setDensity('stacked-label',MIN_BRAND_FONT);
    host.style.setProperty('--jaroo-brand-subtitle-font','7px');
  }

  function folderLeftEdge(sidebar,bounds) {
    // Folder icon (not the orange name badge or indented chat text) defines x.
    const iconNodes = sidebar.querySelectorAll(
      '[data-sidebar-project-kind="local"] [data-app-action-sidebar-project-row] svg'
    );
    for(const icon of iconNodes){
      const r=icon.getBoundingClientRect();
      if(r.width<8 || r.width>32 || r.height<8 || r.height>32)continue;
      if(r.left<bounds.left-8 || r.left>bounds.right-80)continue;
      if(r.top>=bounds.top && r.bottom<=bounds.bottom){lastFolderAlignX=r.left;return r.left;}
    }
    return lastFolderAlignX ?? (bounds.left+EDGE_GUTTER);
  }

  function place() {
    const found = visibleLogo();
    if(!found){hideWidget('header-anchor-not-found');return;}
    const logo=found.node;
    const sidebar=found.sidebar || logo.closest(SIDEBAR);
    if(!sidebar){hideWidget('sidebar-not-found');return;}
    const r=logo.getBoundingClientRect();
    const bounds=paneBounds(sidebar,logo);
    const x=Math.ceil(Math.max(bounds.left+2,folderLeftEdge(sidebar,bounds)));
    const right=Math.floor(bounds.right-EDGE_GUTTER);
    const available=right-x;
    const measurements={source:found.source,availableWidth:available,
      bounds:{left:bounds.left,right:bounds.right,top:bounds.top,bottom:bounds.bottom}};
    if(available<128 || bounds.bottom-bounds.top<180){hideWidget('insufficient-visible-space',measurements);return;}
    bindSource(logo,sidebar);
    host.dataset.mode=/codex/i.test(logo.getAttribute('aria-label')||logo.textContent||'')?'codex':'chatgpt';
    const mounted=mountDashboardInSidebar(logo,sidebar,x,available);
    if(!mounted){hideWidget('flow-anchor-unavailable',measurements);return;}
    lifeMountState='in-native-flow';
    watchBounds(sidebar,bounds.header);
    bindSidebarObserver(sidebar);
    const menuItem=findMenuAnchor(sidebar,r.bottom);
    const menuTop=menuItem?.node.getBoundingClientRect().top ?? 0;
    const widgetBottom=host.getBoundingClientRect().bottom;
    if(menuTop && widgetBottom>menuTop+1){
      hideWidget('overlap-guard', {...measurements,menuTop,widgetBottom});return;
    }
    recordPlacement('visible','in-native-flow',{...measurements,menuTop,widgetBottom,lifeMountState});
  }

  function refresh() {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date())
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, part.value])
    );
    const dateMain = host.dataset.jarooWidth==='narrow'
      ? `${parts.month}.${parts.day}`
      : `${parts.month}.${parts.day} (${parts.weekday})`;
    if(dateMainEl.textContent !== dateMain) dateMainEl.textContent = dateMain;
    updateWeather();
    // Visible glyphs are lightweight monospace text; screen readers receive the full label.
    clockEl.setAttribute('aria-label',
      `한국 표준시 ${parts.hour}시 ${parts.minute}분 ${parts.second}초`);
    const numbers = parts.hour + parts.minute + parts.second;
    for (let i = 0; i < digits.length; i++) setDigit(digits[i], numbers[i]);
    const hour = Number(parts.hour);
    updateLifeClock(new Date());
    // Simple fixed day/night rule in Korea, not astronomical sunrise/sunset.
    host.dataset.phase = hour >= 6 && hour < 18 ? 'day' : 'night';

    const reattached = !host.isConnected || !stylesheet.isConnected;
    if (!host.isConnected) document.body.appendChild(host);
    if (!stylesheet.isConnected) document.head.appendChild(stylesheet);
    // Moving numbers do not change the header geometry. Placement is event-driven.
    if (reattached) schedulePlacement();
  }

  let frameHandle = 0;
  let tickHandle = 0;
  let observer = null;
  let observedMutationSidebar = null;
  let recoveryHandle = 0;
  let started = false;
  let disposed = false;
  let resizeObserver = null;
  let observedSidebar = null;
  let observedHeader = null;

  function schedulePlacement() {
    if (queued || disposed) return;
    queued = true;
    frameHandle = requestAnimationFrame(() => {
      queued = false;
      if (!disposed) {
        try { place(); }
        catch (error) {
          hideWidget('placement-error', { lastError: String(error).slice(0, 400) });
        }
      }
    });
  }

  function onVisibility() { if (!document.hidden && !disposed) { refresh(); schedulePlacement(); } }
  function onFocus() { if (!disposed) { refresh(); schedulePlacement(); } }

  function bindSidebarObserver(sidebar) {
    if(!observer || sidebar===observedMutationSidebar) return;
    observer.disconnect();observedMutationSidebar=sidebar;
    observer.observe(sidebar,{childList:true,subtree:true});
  }
  function start() {
    if (started || disposed) return;
    started = true;
    observer = new MutationObserver(mutations=>{
      // The clock's position should not be recalculated for a scrolling chat
      // list, title marquee, status badge, or newly generated message.
      for(const m of mutations){
        const t=m.target instanceof Element ? m.target : m.target.parentElement;
        if(t?.closest?.('[data-sidebar-archive-chatgpt-id], [data-sidebar-project-kind="local"]'))continue;
        if(t?.closest?.('[data-thread-title="true"]'))continue;
        schedulePlacement();break;
      }
    });
    if (typeof ResizeObserver !== 'undefined') resizeObserver = new ResizeObserver(schedulePlacement);
    refresh();
    schedulePlacement();
    document.fonts?.ready.then(() => { if (!disposed) schedulePlacement(); });
    // Remote Kaushan CSS can load after document.fonts.ready; remeasure once
    // the original brand font becomes available, without disturbing clock digits.
    fontLink?.addEventListener('load', () => {
      if (disposed) return;
      document.fonts?.load?.('400 24px "Kaushan Script"').then(schedulePlacement).catch(() => schedulePlacement());
    }, { once: true });
    tickHandle = setInterval(() => { if (!disposed && !document.hidden) refresh(); }, 1000);
    // Rare React-side sidebar replacements are recovered without observing
    // every message mutation on the entire page.
    recoveryHandle = setInterval(() => {
      if(!disposed && !document.hidden && (!hiddenSource?.isConnected || !observedMutationSidebar?.isConnected))
        schedulePlacement();
    }, 7000);
    window.addEventListener('resize', schedulePlacement, { passive: true });
    window.addEventListener('focus', onFocus);
    window.visualViewport?.addEventListener('resize', schedulePlacement, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    resizeObserver?.disconnect();
    clearInterval(tickHandle);
    clearInterval(recoveryHandle);
    cancelAnimationFrame(frameHandle);
    window.removeEventListener('resize', schedulePlacement);
    window.removeEventListener('focus', onFocus);
    window.visualViewport?.removeEventListener('resize', schedulePlacement);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('DOMContentLoaded', start);
    restoreSource();
    clearSpacing();
    for (const sidebar of densitySidebars)
      sidebar.removeAttribute('data-jaroo-sidebar-width');
    densitySidebars.clear();
    host.remove();
    stylesheet.remove();
    if (window[RUNTIME_KEY]?.dispose === dispose) delete window[RUNTIME_KEY];
  }
  window[RUNTIME_KEY] = {
    version: '3.7.2', dispose,
    diagnostics: () => ({
      version: '3.7.2', ...placementReport,
      hostConnected: host.isConnected,
      display: getComputedStyle(host).display,
      clockPresent: Boolean(shadow.querySelector('.clock')),
      legacyHexJPresent: Boolean(shadow.querySelector('.brand-mark')),
      segmentClock: shadow.querySelectorAll('.digital-time .digit').length === 6,
      fontLoaded: Boolean(document.fonts?.check?.('12px Pretendard')),
      counterPresent: Boolean(shadow.querySelector('.jaroo-center')),
      weatherStatus: weatherStatus,
      weatherLocation: WEATHER_PROFILE_VALID ? 'configured' : 'unconfigured',
      lifeClockPresent: Boolean(shadow.querySelector('.life-clock')),
      lifeMountState,
      lifePanelInFlow: host.parentElement !== document.body && host.isConnected,
      lifeCardFontWeight: getComputedStyle(lifeEls.retireValue).fontWeight,
      responsiveScale:host.style.getPropertyValue('--jaroo-ui-scale'),
      readableMode:host.dataset.jarooWidth,
      timeUnit:'시간',
      lifeMetricCount:shadow.querySelectorAll('.life-card').length,
      weatherLocation:WEATHER.city,
      weatherStatus,
      viewport: [innerWidth, innerHeight]
    })
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
