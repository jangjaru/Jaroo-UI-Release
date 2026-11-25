// ==UserScript==
// @name         Jaroo's Company · Sidebar Live Clock
// @namespace    jaroo.local.chatgpt
// @version      3.11.55
// @description  E-book first-paint dashboard, local Life Clock profile and LCD clock; no legacy theme or remote font.
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        unsafeWindow
// @connect      api.open-meteo.com
// @connect      geocoding-api.open-meteo.com
// @updateURL    https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/clock.user.js
// @downloadURL  https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/clock.user.js
// ==/UserScript==

(() => {
  'use strict';

  // Dedicated E-book renderer. One style is installed before first visible mount.
  const RUNTIME_KEY = '__jarooCompanyClockRuntime';
  const PAGE=typeof unsafeWindow==='undefined'?window:unsafeWindow;
  PAGE[RUNTIME_KEY]?.dispose?.();

  const HOST_ID = 'jaroo-clock-overlay-v25'; // Keep existing host ID; avoid duplicate clocks
  const STYLE_ID = 'jaroo-clock-menu-layout-v25';
  const SOURCE_ATTR = 'data-jaroo-brand-source';
  const MAX_BRAND_WIDTH = 620; // wide sidebars expand rather than stopping at 280px
  const EDGE_GUTTER = 12;
  let lastFolderAlignX = null;
  const LOGO =
    'button[aria-label*="현재 모드: ChatGPT" i], ' +
    'button[aria-label*="현재 모드: Codex" i]';
  const SIDEBAR =
    '#stage-sidebar, #stage-slideover-sidebar, #slate-sidebar, ' +
    '[data-testid="sidebar"], aside';

  // Privacy-preserving compatibility with the existing local-only Tampermonkey
  // profile. Never publish personal dates, locations, or the profile itself.
  const parseLocalDate = value =>
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(value + 'T00:00:00+09:00') : new Date(NaN);
  // Weather selections remain in this browser. No geolocation permission or
  // personal default location is used. Keep compatibility with local profiles.
  const WEATHER_LOCAL_PREF='jaroo:ebook:weather-region:v1';
  const WEATHER_INTERVAL_MS=30*60*1000;
  function parseWeatherRegion(raw) {
    const coordinate=value=>(typeof value==='number'||(typeof value==='string'&&value.trim()!==''))?Number(value):NaN;
    const latitude=coordinate(raw?.latitude),longitude=coordinate(raw?.longitude);
    if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return null;
    const city=typeof raw?.city==='string'?raw.city.trim().slice(0,160):'';
    return {latitude,longitude,city};
  }
  function readWeatherRegion() {
    try{return parseWeatherRegion(JSON.parse(localStorage.getItem(WEATHER_LOCAL_PREF)));}catch(_){return null;}
  }
  function legacyWeatherRegion() {
    const raw=PAGE.__jarooPrivateProfileV1;
    return parseWeatherRegion({latitude:raw?.weatherLatitude,longitude:raw?.weatherLongitude,city:raw?.weatherLabel});
  }
  function weatherRegionKey(region) {
    return region?JSON.stringify([region.latitude,region.longitude,region.city]):'';
  }
  let localWeatherRegion=readWeatherRegion();
  let WEATHER=localWeatherRegion||legacyWeatherRegion();
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    weekday: 'short', hour: '2-digit', minute: '2-digit',
    second: '2-digit', hourCycle: 'h23'
  });

  // Life settings may load after document-idle. Re-read the legacy provider
  // on the existing tick; do not hide the widget or invent missing dates.
  const LIFE_LOCAL_PREF='jaroo:ebook:life-birth:v1';
  function validLifeDate(value) {
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
    const date=parseLocalDate(value);
    if(!Number.isFinite(date.getTime()))return null;
    const local=new Date(date.getTime()+9*3600000).toISOString().slice(0,10);
    return local===value?date:null;
  }
  function parseLifeProfile(raw) {
    const birth=validLifeDate(raw?.birthDate),retirement=validLifeDate(raw?.retirementDate),age80=validLifeDate(raw?.lifePlanEndDate);
    if(!birth||!retirement||!age80||birth.getTime()>Date.now()||!(birth<retirement&&retirement<age80))return null;
    return {birth,retirement,age80,key:[raw.birthDate,raw.retirementDate,raw.lifePlanEndDate].join('|')};
  }
  function birthdayPlusYears(value,years) {
    if(!validLifeDate(value))return '';
    const [y,m,d]=value.split('-').map(Number),year=y+years;
    if(year>9999)return '';
    const max=new Date(Date.UTC(year,m,0)).getUTCDate();
    return [String(year).padStart(4,'0'),String(m).padStart(2,'0'),String(Math.min(d,max)).padStart(2,'0')].join('-');
  }
  function localBirthProfile(value) {
    return parseLifeProfile({birthDate:value,retirementDate:birthdayPlusYears(value,65),lifePlanEndDate:birthdayPlusYears(value,80)});
  }
  // Explicit local settings override the legacy profile only after a save.
  // Keep old birth-only data and previously calculated baselines until then.
  const LIFE_SETTINGS_PREF='jaroo:ebook:life-settings:v2';
  const lifeDateString=date=>new Date(date.getTime()+9*3600000).toISOString().slice(0,10);
  function validCareerDate(value,profile) {
    const date=validLifeDate(value);
    return date&&profile&&date>=profile.birth&&date<profile.retirement?date:null;
  }
  function withCareerDate(profile,value,provisional=false) {
    if(!profile)return null;
    const careerStart=validCareerDate(value,profile);
    return {...profile,careerStart,careerProvisional:!!careerStart&&provisional,
      key:profile.key+'|'+(careerStart?value:'')+'|'+String(provisional)};
  }
  function parseLocalLifeSettings(raw) {
    const profile=localBirthProfile(raw?.birthDate);
    if(!validCareerDate(raw?.careerStartDate,profile))return null;
    return withCareerDate(profile,raw.careerStartDate);
  }
  function readLifeSettings() {
    try{return parseLocalLifeSettings(JSON.parse(localStorage.getItem(LIFE_SETTINGS_PREF)));}catch(_){return null;}
  }
  function readLegacyBirth() {
    try{return localBirthProfile(localStorage.getItem(LIFE_LOCAL_PREF));}catch(_){return null;}
  }
  let explicitLife=readLifeSettings(),localLife=readLegacyBirth(),legacyLife=null,legacyKey=null,LIFE=null,lifeKey=null,lifeSource='missing';
  let cachedLocalLifeSource=null,cachedLocalLife=null;
  function resolveLifeProfile() {
    if(explicitLife)return {profile:explicitLife,source:'local-settings'};
    const raw=PAGE.__jarooPrivateProfileV1;
    const key=JSON.stringify([raw?.birthDate,raw?.retirementDate,raw?.lifePlanEndDate,raw?.careerStartDate].map(v=>typeof v==='string'?v:null));
    if(key!==legacyKey){
      legacyKey=key;
      const profile=parseLifeProfile(raw);
      legacyLife=withCareerDate(profile,validCareerDate(raw?.careerStartDate,profile)?raw.careerStartDate:'2007-08-01',!validCareerDate(raw?.careerStartDate,profile));
    }
    if(legacyLife)return {profile:legacyLife,source:'legacy'};
    if(localLife!==cachedLocalLifeSource){
      cachedLocalLifeSource=localLife;
      cachedLocalLife=localLife?withCareerDate(localLife,'2007-08-01',true):null;
    }
    return localLife?{profile:cachedLocalLife,source:'local'}:{profile:null,source:'missing'};
  }

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
  // Build the complete shadow tree while detached; only the final E-book renderer is mounted.
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host{
        --ink:#292D30;--muted:#535B60;--quiet:#737D83;--line:#C5CDD0;
        --font:var(--eb-font,"IBM Plex Mono","Pretendard Variable","Pretendard",sans-serif);
        --mono:var(--eb-mono,"IBM Plex Mono","Pretendard Variable","Pretendard",monospace);
        --widget-main:var(--eb-chat-corrected-size,15.333px);
        --widget-meta:13px;
        --jaroo-ui-scale:1;color:var(--ink);font:400 var(--widget-main)/1.3 var(--font);
        container:jaroo-dashboard / inline-size;
      }
      *,*::before,*::after{box-sizing:border-box}
      button{font-family:var(--font);color:inherit}
      .fallback-brand{display:flex;align-items:center;width:100%;padding:0 29px 9px 0;margin:0;border:0;border-bottom:1px solid var(--eb-accent-ink,#303438);background:none;cursor:pointer;text-align:left;color:var(--ink)}
      .fallback-brand[aria-disabled="true"]{cursor:default}
      .fallback-brand:focus-visible,.ebook-time-toggle:focus-visible{outline:1px solid #879398;outline-offset:1px}
      .brand-word{display:flex;flex:1 1 auto;flex-direction:column;align-items:flex-start;min-width:0;max-width:100%;gap:6px}
      .brand-title{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 .38em;font:700 24px/1.02 var(--font);font-synthesis:weight;letter-spacing:-.045em;text-align:left;min-width:0;max-width:100%}
      .brand-title span{max-width:100%;overflow-wrap:anywhere}
      /* Approved A: pink felt-tip highlight, behind the lower half of Jaroo's only.
         Paint-only layer; no line-height, wrapping, hit-area or layout changes. */
      .brand-jaroo{position:relative;isolation:isolate}
      .brand-jaroo::before{content:"";position:absolute;pointer-events:none;z-index:-1;inset-inline:-.075em;inset-block:48% 3%;background:var(--eb-project-mark-exec,#F3B9CB);opacity:.90;clip-path:polygon(1% 12%,8% 4%,24% 8%,40% 3%,58% 6%,79% 0%,96% 8%,98% 18%,97% 28%,100% 38%,98% 51%,100% 63%,96% 77%,98% 87%,85% 94%,69% 91%,53% 98%,34% 95%,17% 100%,3% 92%,1% 74%,3% 58%,0% 39%,2% 25%)}
      .brand-subtitle{font:450 12px/1.3 var(--font);letter-spacing:.075em;color:var(--muted);max-width:100%;overflow-wrap:normal}
      .brand-arrow{display:none}
      .ebook-time-toggle{position:absolute;inset-block-start:0;inset-inline-end:0;width:25px;height:25px;display:grid;place-items:center;z-index:2;border:0;border-radius:3px;background:transparent;color:var(--muted);cursor:pointer;padding:0}
      .ebook-time-toggle:hover{background:#DFE3E5}
      .ebook-time-toggle svg{width:13px;height:13px;display:block}
      :host([data-ebook-time-collapsed="true"]) .ebook-time-toggle svg{transform:rotate(-90deg)}
      :host([data-ebook-time-collapsed="true"]) :is(.life-clock,.clock){display:none}
      .life-clock{--life-section-gap:21px;--life-metric-row-gap:3px;margin:0;padding:calc(var(--life-section-gap) / 2) 0 9px;background:transparent}
      .life-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 2.5px;flex-wrap:nowrap}
      .life-title{font:650 calc(var(--widget-main) + 1px)/1.3 var(--font);letter-spacing:.025em;text-transform:uppercase;color:var(--ink);max-width:100%;overflow-wrap:normal;white-space:nowrap}
      /* Small-text legibility: one white text layer on a full-height, irregular accent marker. */
      .life-marker{display:inline-block;position:relative;isolation:isolate;color:#fff;-webkit-text-fill-color:currentColor}
      .life-marker::before{content:"";position:absolute;z-index:-1;pointer-events:none;inset-block:0;inset-inline:-7px;background:var(--eb-accent-ink,#303438);clip-path:polygon(0% 7%,8% 3%,26% 5%,43% 1%,65% 4%,84% 0%,98% 4%,100% 31%,98% 44%,100% 63%,97% 94%,79% 98%,57% 96%,35% 100%,15% 96%,1% 100%,2% 72%,0% 51%,2% 34%)}
      .life-title .ico,.life-title-short,.life-progress-percent{display:none}
      .life-sub,.life-meta,.life-progress-scale{font:450 var(--widget-meta)/1.35 var(--font);color:var(--muted);max-width:100%;overflow-wrap:normal}
      .life-sub{flex:0 0 auto;margin-inline-start:auto;text-align:right;white-space:nowrap}
      .life-setup-toggle{flex:0 0 auto;align-self:center;margin-inline-start:auto;min-height:18px;padding:1px 5px;border:1px solid var(--line);border-radius:3px;background:transparent;color:var(--muted);font:450 var(--widget-meta)/1.02 var(--font);letter-spacing:-.035em;white-space:nowrap;cursor:pointer}
      .life-setup-toggle:hover,.life-setup-toggle[aria-expanded="true"]{background:#F5F6F6;border-color:#879398;color:var(--ink)}
      .life-setup-toggle:focus-visible{outline:1px solid #879398;outline-offset:1px}
      .life-setup[hidden],.life-setup form[hidden]{display:none}
      .life-setup{margin:5px 0;padding:6px 0;border-bottom:1px solid #D4DADC;font:400 var(--widget-meta)/1.4 var(--font);color:var(--muted)}
      .life-setup-line{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px}
      .life-setup button{padding:3px 6px;border:1px solid var(--line);border-radius:3px;background:transparent;color:var(--ink);font:500 var(--widget-meta)/1.3 var(--font);cursor:pointer}
      .life-setup form{display:grid;gap:5px;margin-top:6px}
      .life-setup-actions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:4px}
      .life-setup input{width:100%;min-width:0;max-width:100%;padding:4px;border:1px solid var(--line);border-radius:3px;background:#F5F6F6;color:var(--ink);font:400 12px/1.3 var(--font)}
      .life-setup .life-setup-message{font-size:var(--widget-meta);color:var(--muted)}
      .life-setup .life-setup-error{color:#A33F46;min-height:0}
      .life-grid{display:flex;flex-direction:column}
      .life-card{margin:0;padding:8px 0;border-bottom:1px solid #D4DADC;min-width:0}
      .life-grid>.life-card:first-child{padding-top:4px}
      .life-card.after{border:0}
      .life-card-main{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px 10px;min-width:0}
      .life-caption{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0}
      .life-label{font:500 var(--widget-main)/1.35 var(--font);letter-spacing:-.025em;max-width:100%;overflow-wrap:normal;word-break:keep-all}
      .life-meta{letter-spacing:-.035em}
      .life-value{min-width:0;max-width:100%;font:600 19px/1.25 var(--mono);font-variant-numeric:tabular-nums;letter-spacing:-.045em;text-align:right;white-space:normal;word-break:keep-all;overflow-wrap:normal;justify-self:end}
      /* Life metrics: consistent typography and shared baselines. */
      .life-card .life-card-main{grid-template-columns:minmax(0,1fr) auto;align-items:last baseline;gap:0 4px}
      .life-card .life-caption{display:flex;gap:1px}
      .life-card .life-label{font-weight:550;color:#23272B;line-height:1.02}
      .life-card .life-meta{white-space:nowrap;line-height:1.02}
      .life-card .life-value{white-space:nowrap;line-height:.95}
      .life-progress{margin:calc(var(--life-section-gap,21px) - 7px) 0 0;padding:calc(var(--life-section-gap,21px) / 2) 0 0;border-top:1px solid var(--line)}
      .life-progress-head{display:flex;flex-direction:row;align-items:baseline;justify-content:space-between;flex-wrap:nowrap;gap:10px;margin-bottom:11px}
      .life-progress-title{font:650 calc(var(--widget-main) + 1px)/1.3 var(--font);color:var(--ink);letter-spacing:.025em;text-transform:uppercase;white-space:nowrap;flex:0 0 auto}
      .life-progress-scale{white-space:nowrap;flex:0 0 auto;margin-inline-start:auto;text-align:right;letter-spacing:-.035em;line-height:1.02}
      @container jaroo-dashboard (min-width:185px) and (max-width:209px){.life-progress-title{font-size:var(--widget-main)}.life-progress-head{gap:8px}}
      :is(.life-bar,.career-bar){height:var(--life-progress-bar-height,5px);min-height:var(--life-progress-bar-height,5px);max-height:var(--life-progress-bar-height,5px);border-radius:999px;background:#D0D5D7;overflow:hidden;position:relative;top:var(--life-progress-bar-offset,0px);box-sizing:border-box}
      :is(.life-bar-fill,.career-bar-fill){display:block;height:100%;border-radius:999px;background:#879398}
      .life-bar-fill{width:0}
      .life-bar-glow{display:none}
      .life-progress-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:5px;margin-top:7px}
      .life-progress-stat{display:flex;flex-direction:column;gap:var(--life-metric-row-gap,3px);min-width:0;align-items:flex-end;text-align:right}
      .life-progress-stat.remaining{align-items:flex-start;text-align:left}
      .life-progress-stat > span{font:450 var(--widget-meta)/1.02 var(--font);color:var(--muted);letter-spacing:-.035em;white-space:nowrap}
      .life-progress-stat strong{display:block;font:650 var(--widget-main)/1.02 var(--mono);font-variant-numeric:tabular-nums;color:var(--ink);max-width:100%;white-space:nowrap;letter-spacing:-.035em}
      .life-progress-unit{font-size:85%;margin-inline-start:.16em}
      .life-progress-stat strong[data-unavailable] .life-progress-unit{display:none}
      @container jaroo-dashboard (max-width:219px){.life-progress-unit{font-size:70%}}
      @container jaroo-dashboard (max-width:179px){.life-progress-meta{grid-template-columns:minmax(0,1fr);row-gap:8px}}
      /* Keep large hour digits; use a single compact, baseline-aligned colon suffix. */
      .life-value{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:flex-end;gap:2px 0}
      .life-value{--life-tail-weight:360}
      .life-duration-hours{white-space:nowrap;font:inherit;color:inherit;letter-spacing:inherit}
      .life-duration-tail{white-space:pre;font:var(--life-tail-weight,360) 70%/1.2 var(--mono);color:var(--muted);letter-spacing:-.035em;word-spacing:-.5ch;font-variant-numeric:tabular-nums}
      .clock{margin:0;padding:0;border-top:1px solid var(--line);user-select:none}
      .clock-content{display:flex;flex-direction:column;min-width:0}
      .clock-line{--clock-digit-height:clamp(30px,15cqi,38px);--clock-digit-width:clamp(12px,8cqi,21px);--clock-separator-width:clamp(5px,2.8cqi,10px);--clock-segment-thickness:calc(var(--clock-digit-height)*.1266);display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px;padding:7px 0 10.5px;min-width:0}
      .date-chip{display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;min-width:0;height:var(--clock-digit-height);padding:0;gap:2px}
      .date-main{font:550 var(--widget-main)/1.08 var(--font);white-space:nowrap;word-break:keep-all}
      .weather-line{display:flex;align-items:center;gap:3px;max-width:100%;min-width:0;color:var(--muted);font:450 var(--widget-meta)/1.08 var(--font);padding:0;margin:0;border:0;background:transparent;text-align:left;cursor:pointer}
      .weather-symbol{flex:0 0 auto}.weather-label{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .digital-time{display:flex;align-items:center;justify-content:flex-end;min-width:0;height:var(--clock-digit-height);color:#41494D;white-space:nowrap}
      .pair{display:inline-flex;align-items:center;gap:0;flex:0 0 auto}
      .digit{display:inline-block;position:relative;flex:0 0 var(--clock-digit-width);width:var(--clock-digit-width);height:var(--clock-digit-height)}
      .digit .seg{position:absolute;display:block;pointer-events:none;fill:#D5DADC;shape-rendering:geometricPrecision}
      .digit .seg.on{fill:#41494D}
      .seg-a,.seg-g,.seg-d{left:calc(var(--clock-segment-thickness)*.65 + .5px);right:calc(var(--clock-segment-thickness)*.65 + .5px);width:calc(100% - (var(--clock-segment-thickness)*1.3 + 1px));height:var(--clock-segment-thickness)}
      .seg-a{top:0}.seg-g{top:calc(50% - var(--clock-segment-thickness)/2)}.seg-d{bottom:0}
      .seg-f,.seg-e,.seg-b,.seg-c{width:var(--clock-segment-thickness);height:calc(50% - var(--clock-segment-thickness)*.7)}
      .seg-f,.seg-b{top:calc(var(--clock-segment-thickness)*.35)}.seg-e,.seg-c{bottom:calc(var(--clock-segment-thickness)*.35)}.seg-f,.seg-e{left:.7px}.seg-b,.seg-c{right:.7px}
      .separator{display:inline-block;position:relative;flex:0 0 var(--clock-separator-width);width:var(--clock-separator-width);height:var(--clock-digit-height);font-size:0;line-height:0;color:#41494D}
      .separator::before,.separator::after{content:"";position:absolute;left:50%;width:calc(var(--clock-segment-thickness)*.78);height:calc(var(--clock-segment-thickness)*.78);border-radius:50%;background:currentColor;transform:translateX(-50%)}
      .separator::before{top:29%}.separator::after{bottom:29%}
      @container jaroo-dashboard (max-width:229px){.date-main{font-size:13px}.weather-line{font-size:12px;gap:2px}}
      @container jaroo-dashboard (max-width:169px){.clock-line{grid-template-columns:minmax(0,1fr);gap:6px}.date-chip{height:auto;gap:3px}.digital-time{justify-self:end}}
      /* Weather setup is opened explicitly, without automatic location access. */
      .weather-line:focus-visible,.weather-setup button:focus-visible{outline:1px solid #879398;outline-offset:2px}
      .weather-setup{display:grid;gap:6px;padding:7px 0 9px;border-top:1px solid var(--line);font:400 var(--widget-meta)/1.3 var(--font);min-width:0}
      .weather-setup[hidden],.weather-setup [hidden]{display:none}
      .weather-setup input,.weather-setup select{width:100%;min-width:0;max-width:100%;font:inherit;color:var(--ink);border:1px solid var(--line);background:#F5F6F6;border-radius:3px;padding:5px}
      .weather-search-row{display:flex;align-items:center;gap:4px}
      .weather-search-row input{flex:1 1 auto}
      .weather-setup button{flex:0 0 auto;font:500 var(--widget-meta)/1.2 var(--font);color:var(--ink);border:1px solid var(--line);background:#F5F6F6;border-radius:3px;padding:5px 6px;cursor:pointer}
      .weather-setup button:disabled{opacity:.5;cursor:default}
      .weather-actions{display:flex;justify-content:flex-end;gap:5px}
      .weather-help,.weather-message{font:400 11px/1.35 var(--font);color:var(--muted);overflow-wrap:anywhere}
      @container jaroo-dashboard (max-width: 269px){
        .life-sub{display:none}
      }
      @container jaroo-dashboard (max-width: 184px){
        .life-meta,.life-sub,.life-progress-scale,.brand-subtitle{display:none}
        .life-title-full{display:none}
        .life-title-short{display:inline}
        .life-card{padding:5px 0}
        .life-grid>.life-card:first-child{padding-top:2.5px}
        .life-head,.life-progress-head{gap:0}
      }
      @container jaroo-dashboard (max-width:159px){.life-head{gap:9px}.life-title{font-size:13px}.life-setup-toggle{padding-inline:3px}}
      /* Use the approved compact two-baseline Life Clock layout at every normal width. */
      .life-card .life-card-main{grid-template-columns:minmax(0,1fr) auto;align-items:baseline;gap:var(--life-metric-row-gap,3px) 4px}
      .life-card .life-caption{display:contents}
      .life-card .life-label{grid-column:1;grid-row:1;align-self:baseline}
      .life-card .life-meta{grid-column:1;grid-row:2;align-self:baseline;padding-inline-end:4px}
      .life-card .life-value{grid-column:2;grid-row:1;align-self:baseline}
      .life-card .life-value:has(>.life-duration-hours){display:contents}
      .life-card .life-duration-hours{grid-column:2;grid-row:1;justify-self:end;align-self:baseline}
      .life-card .life-duration-tail{grid-column:2;grid-row:2;justify-self:end;align-self:baseline;line-height:1.02}
      .life-card .life-duration-tail::before{content:none}
      /* Unit only: 60% of the hour digits; .8333ch at that size is about half the old full-size space. */
      .life-card .life-duration-hours::after{content:"시간";font:inherit;font-size:60%;letter-spacing:inherit;margin-inline-start:.8333ch}
      @container jaroo-dashboard (max-width:179px){
        .life-card .life-label{grid-column:1/-1}
        .life-card .life-value,.life-card .life-duration-hours{grid-column:2;grid-row:2}
        .life-card .life-duration-tail{grid-row:3}
      }
      /* All three metrics share the rounded progress track. */
      .life-card:not(.retire){border-bottom:0;padding-bottom:0}
      .life-grid+.life-progress{border-top:1px solid var(--line)}
      @container jaroo-dashboard (min-width:180px) and (max-width:249px){
        .life-card.work .life-label{overflow-wrap:anywhere;word-break:normal}
      }
      /* Remaining-time progress uses the same colors, thickness and caps for all three metrics. */
      .life-card.retire:has(.career-bar:not([hidden])){border-bottom:0;padding-bottom:0}
      .career-bar{margin-top:8px}
      .career-bar[hidden]{display:none}
      .career-bar-fill{width:var(--career-remaining,0%)}
      .career-remaining-percent{font:450 100%/1.2 var(--font);letter-spacing:-.04em;word-spacing:normal;color:var(--muted);white-space:nowrap;margin-inline-start:3px}
      .life-card .career-remaining-percent{line-height:1.02;margin-inline-start:2px}
      .career-remaining-percent[hidden]{display:none}
      @container jaroo-dashboard (max-width:220px){.career-remaining-percent{margin-inline-start:2px}}
      /* An old Status installation cannot briefly paint a neon dock here. */
      :host .jaroo-center:not([data-ebook-status-ready="true"]),
      :host .jaroo-focus-list:not([data-ebook-status-ready="true"]){display:none!important}
    </style>
    <button class="fallback-brand" type="button" aria-label="Jaroo's Company, A World of My Own">
      <span class="brand-word"><span class="brand-title"><span class="brand-jaroo">Jaroo's</span> <span class="brand-company">Company</span></span><span class="brand-subtitle">A WORLD OF MY OWN</span></span>
      <span class="brand-arrow" aria-hidden="true"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2 5 5 5 5-5"/></svg></span>
    </button>
    <button class="ebook-time-toggle" type="button" aria-expanded="true" aria-label="시간 정보 접기" title="시간 정보 접기"><svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 6 4.5 4.5L12.5 6"/></svg></button>
    <section class="life-clock" aria-label="Life Clock">
      <div class="life-head">
        <div class="life-title"><span class="ico" aria-hidden="true">◔</span><span class="life-title-full"><span class="life-marker">Life Clock</span></span><span class="life-title-short" aria-hidden="true"><span class="life-marker">Life Clock</span></span></div>
        <button class="life-setup-toggle" type="button" aria-controls="ebook-life-setup" aria-expanded="false" aria-label="LIFE CLOCK 설정">설정</button>
      </div>
      <div class="life-setup" id="ebook-life-setup" hidden>
        <form class="life-setup-form">
          <label for="ebook-life-birth">생년월일</label>
          <input id="ebook-life-birth" type="date" required autocomplete="off"/>
          <label for="ebook-life-career">사회생활 시작일</label>
          <input id="ebook-life-career" type="date" required autocomplete="off"/>
          <div class="life-setup-message">은퇴 65세 · 계획 80세 · 평일 8시간 기준. 날짜는 이 브라우저에만 저장됩니다.</div>
          <div class="life-setup-actions"><button class="life-setup-cancel" type="button">닫기</button><button type="submit">저장 및 계산</button></div>
          <div class="life-setup-error" role="status"></div>
        </form>
      </div>
      <div class="life-grid">
        <article class="life-card retire">
          <div class="life-card-main"><div class="life-caption"><div class="life-label">은퇴까지</div><div class="life-meta" data-life="retireMeta" title="65세 기준">65세 기준</div></div><div class="life-value" data-life="retireValue">0 : 00 : 00</div></div>
          <div class="career-bar" data-life="careerBar" role="progressbar" aria-label="사회생활 남은 기간" aria-valuemin="0" aria-valuemax="100" hidden><div class="career-bar-fill" data-life="careerBarFill"></div></div>
        </article>
        <article class="life-card work">
          <div class="life-card-main"><div class="life-caption"><div class="life-label">남은 근무시간</div><div class="life-meta" data-life="workMeta" title="평일 8시간 기준">평일 8시간 기준</div></div><div class="life-value" data-life="workValue">0 : 00 : 00</div></div>
          <div class="career-bar" data-life="workBar" role="progressbar" aria-label="전체 예정 근무시간 대비 남은 근무시간" aria-valuemin="0" aria-valuemax="100" hidden><div class="career-bar-fill" data-life="workBarFill"></div></div>
        </article>
        <article class="life-card after">
          <div class="life-card-main"><div class="life-caption"><div class="life-label">은퇴 이후</div><div class="life-meta" data-life="afterMeta" title="65~80세까지">65~80세까지</div></div><div class="life-value" data-life="afterValue">0 : 00 : 00</div></div>
          <div class="career-bar" data-life="afterBar" role="progressbar" aria-label="은퇴 후 계획기간 중 남은 시간" aria-valuemin="0" aria-valuemax="100" hidden><div class="career-bar-fill" data-life="afterBarFill"></div></div>
        </article>
      </div>
      <div class="life-progress">
        <div class="life-progress-head">
          <div class="life-progress-title"><span class="life-marker">Life Progress</span></div>
          <div class="life-progress-scale">80세 기준</div><div class="life-progress-percent" data-life="progressPercent">0%</div>
        </div>
        <div class="life-bar" aria-hidden="true">
          <div class="life-bar-fill" data-life="progressBar"></div>
          <div class="life-bar-glow"></div>
        </div>
        <div class="life-progress-meta">
          <div class="life-progress-stat remaining"><span>남은시간</span><strong data-unavailable><span data-life="remainingHours">—</span><span class="life-progress-unit">시간</span></strong><span data-life="remainingMeta">—</span></div>
          <div class="life-progress-stat"><span>지나온시간</span><strong data-unavailable><span data-life="usedHours">—</span><span class="life-progress-unit">시간</span></strong><span data-life="usedMeta">—</span></div>
        </div>
      </div>
    </section>
    <div class="clock" role="timer" aria-live="off" aria-label="한국 표준시">
      <div class="clock-content">
        <div class="clock-line">
          <div class="date-chip">
            <span class="date-main"></span>
            <button type="button" class="weather-line" aria-controls="ebook-weather-setup" aria-expanded="false" data-weather="loading"><span class="weather-symbol" aria-hidden="true">◌</span><span class="weather-label">날씨 조회</span></button>
          </div>
          <div class="digital-time" aria-hidden="true"></div>
        </div>
        <form class="weather-setup" id="ebook-weather-setup" hidden>
          <label for="ebook-weather-query">날씨 지역 설정</label>
          <div class="weather-search-row"><input id="ebook-weather-query" type="search" placeholder="도시명 (예: 서울)" maxlength="80" autocomplete="off" required/><button type="submit">검색</button></div>
          <select class="weather-results" aria-label="검색된 지역" hidden></select>
          <div class="weather-help">주요 국내 도시는 인터넷 검색 없이 선택할 수 있습니다. 그 외 지역 검색과 날씨 조회는 Open-Meteo를 사용하며 선택 지역은 이 브라우저에 저장됩니다.</div>
          <div class="weather-message" role="status"></div>
          <div class="weather-actions"><button type="button" class="weather-cancel">닫기</button><button type="button" class="weather-apply" disabled>저장</button></div>
        </form>
      </div>
    </div>
  `;

  const brandEl = shadow.querySelector('.fallback-brand');
  const foldButton=shadow.querySelector('.ebook-time-toggle');
  const CLOCK_FOLD_PREF='jaroo:ebook:time-collapsed:v1';
  let clockFolded=false;
  try{clockFolded=sessionStorage.getItem(CLOCK_FOLD_PREF)==='true';}catch(_){}
  function applyClockFold(){
    host.setAttribute('data-ebook-time-collapsed',String(clockFolded));
    foldButton.setAttribute('aria-expanded',String(!clockFolded));
    foldButton.title=clockFolded?'시간 정보 펼치기':'시간 정보 접기';
    foldButton.setAttribute('aria-label',foldButton.title);
  }
  foldButton.addEventListener('click',()=>{
    clockFolded=!clockFolded;try{sessionStorage.setItem(CLOCK_FOLD_PREF,String(clockFolded));}catch(_){}
    applyClockFold();schedulePlacement();
  });
  applyClockFold();
  const dateMainEl = shadow.querySelector('.date-main');
  const weatherLine = shadow.querySelector('.weather-line');
  const weatherSymbol = shadow.querySelector('.weather-symbol');
  const weatherLabel = shadow.querySelector('.weather-label');
  const clockEl = shadow.querySelector('.clock');
  const timeEl = shadow.querySelector('.digital-time');
  const weatherSetup=shadow.querySelector('.weather-setup');
  const weatherQuery=shadow.querySelector('#ebook-weather-query');
  const weatherResults=shadow.querySelector('.weather-results');
  const weatherMessage=shadow.querySelector('.weather-message');
  const weatherApply=shadow.querySelector('.weather-apply');
  const weatherCancel=shadow.querySelector('.weather-cancel');

  const lifeEls = {
    retireValue: shadow.querySelector('[data-life="retireValue"]'),
    retireMeta: shadow.querySelector('[data-life="retireMeta"]'),
    careerBar: shadow.querySelector('[data-life="careerBar"]'),
    careerBarFill: shadow.querySelector('[data-life="careerBarFill"]'),
    workValue: shadow.querySelector('[data-life="workValue"]'),
    workBar: shadow.querySelector('[data-life="workBar"]'),
    workBarFill: shadow.querySelector('[data-life="workBarFill"]'),
    workMeta: shadow.querySelector('[data-life="workMeta"]'),
    afterValue: shadow.querySelector('[data-life="afterValue"]'),
    afterBar: shadow.querySelector('[data-life="afterBar"]'),
    afterBarFill: shadow.querySelector('[data-life="afterBarFill"]'),
    afterMeta: shadow.querySelector('[data-life="afterMeta"]'),
    progressBar: shadow.querySelector('[data-life="progressBar"]'),
    progressPercent: shadow.querySelector('[data-life="progressPercent"]'),
    usedMeta: shadow.querySelector('[data-life="usedMeta"]'),
    remainingMeta: shadow.querySelector('[data-life="remainingMeta"]'),
    usedHours: shadow.querySelector('[data-life="usedHours"]'),
    remainingHours: shadow.querySelector('[data-life="remainingHours"]')
  };

  const lifeCard = shadow.querySelector('.life-clock');
  const lifeSetup=shadow.querySelector('.life-setup'),lifeSetupToggle=shadow.querySelector('.life-setup-toggle'),lifeSetupForm=shadow.querySelector('.life-setup-form'),lifeBirthInput=shadow.querySelector('#ebook-life-birth'),lifeCareerInput=shadow.querySelector('#ebook-life-career'),lifeSetupError=shadow.querySelector('.life-setup-error');
  function showLifeSetup(open,focus=true) {
    lifeSetup.hidden=!open;
    lifeSetupToggle.setAttribute('aria-expanded',String(open));
    lifeSetupError.textContent='';
    if(open){
      const {profile}=resolveLifeProfile();
      lifeBirthInput.value=profile?lifeDateString(profile.birth):'';
      lifeCareerInput.value=profile?.careerStart?lifeDateString(profile.careerStart):'';
      lifeBirthInput.max=lifeDateString(new Date());
      if(focus)lifeBirthInput.focus();
    }else if(focus)lifeSetupToggle.focus();
    schedulePlacement();
  }
  lifeSetupToggle.addEventListener('click',()=>showLifeSetup(lifeSetup.hidden));
  shadow.querySelector('.life-setup-cancel').addEventListener('click',()=>showLifeSetup(false));
  lifeSetupForm.addEventListener('keydown',event=>{
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();showLifeSetup(false);}
  });
  lifeSetupForm.addEventListener('submit',event=>{
    event.preventDefault();
    const raw={birthDate:lifeBirthInput.value,careerStartDate:lifeCareerInput.value};
    if(!localBirthProfile(raw.birthDate)){lifeSetupError.textContent='유효한 생년월일을 입력해 주세요.';return;}
    const next=parseLocalLifeSettings(raw);
    if(!next){lifeSetupError.textContent='사회생활 시작일은 생년월일 이후, 은퇴일 이전이어야 합니다.';return;}
    try{localStorage.setItem(LIFE_SETTINGS_PREF,JSON.stringify(raw));}catch(_){
      lifeSetupError.textContent='브라우저 저장소를 사용할 수 없습니다.';return;
    }
    explicitLife=next;showLifeSetup(false);
    updateLifeClock(new Date());schedulePlacement();
  });
  function syncLifeProfile() {
    const {profile,source}=resolveLifeProfile(),key=profile?.key||'';
    if(key===lifeKey&&source===lifeSource)return;
    LIFE=profile;lifeKey=key;lifeSource=source;lastLifeSecondKey='';
    // The settings button stays accessible whether or not a profile exists.
    // Do not close or overwrite an open draft on a background profile update.
    if(!LIFE){
      for(const k of ['retireValue','workValue','afterValue','usedHours','remainingHours'])lifeEls[k].textContent='—';
      lifeEls.usedMeta.textContent='—';
      lifeEls.remainingMeta.textContent='—';
      for(const el of [lifeEls.usedHours,lifeEls.remainingHours]){el.parentElement.setAttribute('data-unavailable','');el.parentElement.removeAttribute('title');}
      lifeEls.progressPercent.textContent='—';
      lifeEls.progressBar.style.width='0%';
      updateCareerBar(null);
      updateCareerBar(null,lifeEls.workBar,lifeEls.workBarFill);
      updateCareerBar(null,lifeEls.afterBar,lifeEls.afterBarFill);
    }
    if(started)schedulePlacement();
  }
  function onLifeSettingsStorage(event) {
    if(event.key!==LIFE_LOCAL_PREF&&event.key!==LIFE_SETTINGS_PREF&&event.key!==null)return;
    explicitLife=readLifeSettings();localLife=readLegacyBirth();
    if(!disposed)updateLifeClock(new Date());
  }
  let lifeMountState = 'overlay-reserved-space';

  // Rounded SVG bevels preserve the existing segment boxes, colors, and
  // status dock's .digital-time .digit geometry. No per-tick geometry work.
  const LCD_SVG_NS='http://www.w3.org/2000/svg';
  const LCD_HORIZONTAL='M18 0 H82 Q87 0 90 8 L97 37 Q100 50 97 63 L90 92 Q87 100 82 100 H18 Q13 100 10 92 L3 63 Q0 50 3 37 L10 8 Q13 0 18 0 Z';
  const LCD_VERTICAL='M38 2 Q50 0 62 2 L93 9 Q100 11 100 15 V85 Q100 89 93 91 L62 98 Q50 100 38 98 L7 91 Q0 89 0 85 V15 Q0 11 7 9 Z';
  const digits = [];
  for (let groupIndex = 0; groupIndex < 3; groupIndex++) {
    const pair = document.createElement('span');
    pair.className = 'pair';
    for (let index = 0; index < 2; index++) {
      const cell = document.createElement('span');
      cell.className = 'digit';
      cell.dataset.value = '0';
      for (const id of 'abcdefg') {
        const seg=document.createElementNS(LCD_SVG_NS,'svg');
        seg.setAttribute('class','seg seg-'+id);
        seg.setAttribute('viewBox','0 0 100 100');
        seg.setAttribute('preserveAspectRatio','none');
        seg.setAttribute('aria-hidden','true');
        seg.setAttribute('focusable','false');
        const path=document.createElementNS(LCD_SVG_NS,'path');
        path.setAttribute('d','agd'.includes(id)?LCD_HORIZONTAL:LCD_VERTICAL);
        seg.appendChild(path);
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


  const KST_HOUR_OFFSET_MS = 9 * 3600000;
  const HOUR_MS = 3600000;
  const DAY_MS = 86400000;
  const TIME_FORMAT = new Intl.NumberFormat('ko-KR');

  function kstDayStartUtcMs(instantMs) {
    const shifted = new Date(instantMs + KST_HOUR_OFFSET_MS);
    return Date.UTC(shifted.getUTCFullYear(),shifted.getUTCMonth(),shifted.getUTCDate()) - KST_HOUR_OFFSET_MS;
  }
  function overlapMs(a, b, c, d) {
    return Math.max(0, Math.min(b,d) - Math.max(a,c));
  }
  function calculateWorkDurationMs(nowMs, retirementMs) {
    if(nowMs>=retirementMs)return 0;
    const first=kstDayStartUtcMs(nowMs),last=kstDayStartUtcMs(retirementMs);
    const weekday=day=>new Date(day+KST_HOUR_OFFSET_MS).getUTCDay();
    const isWork=day=>{const w=weekday(day);return w!==0&&w!==6;};
    const partial=day=>isWork(day)?overlapMs(nowMs,retirementMs,day+9*HOUR_MS,day+12*HOUR_MS)+overlapMs(nowMs,retirementMs,day+13*HOUR_MS,day+18*HOUR_MS):0;
    let total=partial(first);
    if(last!==first){
      total+=partial(last);
      const full=Math.max(0,Math.round((last-first)/DAY_MS)-1);
      let weekdays=Math.floor(full/7)*5;
      for(let i=0;i<full%7;i++)if(isWork(first+(i+1)*DAY_MS))weekdays++;
      total+=weekdays*8*HOUR_MS;
    }
    return total;
  }
  // Cache the invariant future-day work suffix for the current KST day.
  let workDayCache=null;
  function remainingWorkDurationMs(nowMs,retirementMs) {
    if(nowMs>=retirementMs)return 0;
    if(!Number.isFinite(nowMs)||!Number.isFinite(retirementMs))
      return calculateWorkDurationMs(nowMs,retirementMs);
    let c=workDayCache;
    if(!c||c.retirementMs!==retirementMs||nowMs<c.day||nowMs>=c.nextDay){
      const day=kstDayStartUtcMs(nowMs),nextDay=day+DAY_MS;
      const weekday=new Date(day+KST_HOUR_OFFSET_MS).getUTCDay();
      c=workDayCache={day,nextDay,retirementMs,weekday,
        end:Math.min(nextDay,retirementMs),tail:calculateWorkDurationMs(nextDay,retirementMs)};
    }
    if(c.weekday===0||c.weekday===6)return c.tail;
    return c.tail+overlapMs(nowMs,c.end,c.day+9*HOUR_MS,c.day+12*HOUR_MS)
      +overlapMs(nowMs,c.end,c.day+13*HOUR_MS,c.day+18*HOUR_MS);
  }
  // Bounded cache of hour labels: unchanged for most countdown ticks.
  const durationHourLabels=new Map();
  function durationParts(ms,elapsed=false) {
    const seconds=(elapsed?Math.floor:Math.ceil)(Math.max(0,ms)/1000);
    const hours=Math.floor(seconds/3600);
    let label=durationHourLabels.get(hours);
    if(label===undefined){
      label=TIME_FORMAT.format(hours);
      if(durationHourLabels.size>=32)durationHourLabels.clear();
      durationHourLabels.set(hours,label);
    }
    return [label,String(Math.floor(seconds/60)%60).padStart(2,'0')+' : '+String(seconds%60).padStart(2,'0')];
  }
  function careerRemainingPercent(nowMs,retirementMs,startMs) {
    if(![nowMs,retirementMs,startMs].every(Number.isFinite)||retirementMs<=startMs)return null;
    return Math.max(0,Math.min(100,(retirementMs-nowMs)/(retirementMs-startMs)*100));
  }
  function remainingDurationPercent(remainingMs,totalMs) {
    if(!Number.isFinite(remainingMs)||!Number.isFinite(totalMs)||totalMs<=0)return null;
    return Math.max(0,Math.min(100,remainingMs/totalMs*100));
  }
  function updateCareerBar(percent,bar=lifeEls.careerBar,fill=lifeEls.careerBarFill,
      description='사회생활 시작일 ~ 은퇴일 · 전체 사회생활 기간 중') {
    const valid=percent!==null&&Number.isFinite(percent);
    if(bar.hidden===valid)bar.hidden=!valid;
    if(!valid){bar.removeAttribute('aria-valuenow');bar.removeAttribute('aria-valuetext');bar.removeAttribute('title');return;}
    const width=percent.toFixed(8)+'%',label=percent.toFixed(1);
    if(fill.style.getPropertyValue('--career-remaining')!==width)fill.style.setProperty('--career-remaining',width);
    if(bar.getAttribute('aria-valuenow')!==label){
      bar.setAttribute('aria-valuenow',label);
      bar.setAttribute('aria-valuetext',label+'% 남음');
    }
    const title=description+' '+label+'% 남음';
    if(bar.title!==title)bar.title=title;
  }
  const durationNodes=new WeakMap();
  function setLifeDuration(el,ms,{elapsed=false,careerRemaining=undefined}={}) {
    let nodes=durationNodes.get(el);
    if(!nodes||nodes.hours.parentNode!==el){
      const hours=document.createElement('span'),tail=document.createElement('span');
      hours.className='life-duration-hours';tail.className='life-duration-tail';
      const tailText=document.createTextNode('');
      tail.append(tailText);
      const percent=careerRemaining!==undefined?document.createElement('span'):null;
      if(percent){percent.className='career-remaining-percent';tail.append(percent);}
      el.replaceChildren(hours,tail);nodes={hours,tail,tailText,percent};durationNodes.set(el,nodes);
    }
    const [hours,tail]=durationParts(ms,elapsed);
    if(nodes.hours.textContent!==hours)nodes.hours.textContent=hours;
    if(nodes.tailText.data!==tail)nodes.tailText.data=tail;
    if(nodes.percent){
      const valid=careerRemaining!==null&&Number.isFinite(careerRemaining);
      if(nodes.percent.hidden===valid)nodes.percent.hidden=!valid;
      const rounded=valid?careerRemaining.toFixed(1):'';
      const label=valid?'('+(el===lifeEls.afterValue&&rounded==='100.0'?'100':rounded)+'%)':'';
      if(nodes.percent.textContent!==label)nodes.percent.textContent=label;
    }
  }
  // LIFE PROGRESS has a three-line summary; retain exact minute/second values in its tooltip.
  function setProgressDuration(el,ms,elapsed=false) {
    const [hours,tail]=durationParts(ms,elapsed);
    if(el.textContent!==hours)el.textContent=hours;
    const holder=el.parentElement;
    const detail=hours+'시간 '+tail.replace(' : ','분 ')+'초';
    if(holder.title!==detail)holder.title=detail;
    if(holder.hasAttribute('data-unavailable'))holder.removeAttribute('data-unavailable');
  }
  // Profile-invariant dates, work calendar totals and descriptions.
  const lifeBaselineCache=new WeakMap();
  function lifeBaseline(profile) {
    const cached=lifeBaselineCache.get(profile);
    if(cached)return cached;
    const birthMs=profile.birth.getTime(),retirementMs=profile.retirement.getTime(),age80Ms=profile.age80.getTime();
    const startMs=profile.careerStart?.getTime()??NaN;
    const careerDescription=profile.careerStart?lifeDateString(profile.careerStart).replaceAll('-','.')+' 시작'+(profile.careerProvisional?'(월 기준 가정)':'')+' ~ 은퇴일':'사회생활 시작일 ~ 은퇴일';
    const result={birthMs,retirementMs,age80Ms,startMs,careerDescription,
      lifeMs:age80Ms-birthMs,totalWorkMs:Number.isFinite(startMs)?calculateWorkDurationMs(startMs,retirementMs):NaN,
      totalAfterMs:age80Ms-retirementMs};
    lifeBaselineCache.set(profile,result);
    return result;
  }
  let lastLifeSecondKey = '';
  function updateLifeClock(now) {
    syncLifeProfile();
    if(!LIFE)return;
    const ms=now.getTime(),secondKey=Math.floor(ms/1000);
    if(secondKey===lastLifeSecondKey)return;
    lastLifeSecondKey=secondKey;

    const {birthMs,retirementMs,age80Ms,startMs,careerDescription,lifeMs,totalWorkMs,totalAfterMs}=lifeBaseline(LIFE);
    const beforeRetirement=ms<retirementMs;
    const used=Math.min(1,Math.max(0,(ms-birthMs)/lifeMs))*100;
    const careerRemaining=careerRemainingPercent(ms,retirementMs,startMs);
    setLifeDuration(lifeEls.retireValue,retirementMs-ms,{careerRemaining});
    updateCareerBar(careerRemaining,lifeEls.careerBar,lifeEls.careerBarFill,careerDescription+' · 전체 사회생활 기간 중');
    const remainingWorkMs=remainingWorkDurationMs(Number.isFinite(startMs)?Math.max(ms,startMs):ms,retirementMs);
    const workRemaining=remainingDurationPercent(remainingWorkMs,totalWorkMs);
    setLifeDuration(lifeEls.workValue,remainingWorkMs,{careerRemaining:workRemaining});
    updateCareerBar(workRemaining,lifeEls.workBar,lifeEls.workBarFill,careerDescription+' · 평일 8시간 기준 전체 예정 근무시간 중');
    const remainingAfterMs=Math.max(0,age80Ms-Math.max(ms,retirementMs));
    const afterRemaining=remainingDurationPercent(remainingAfterMs,totalAfterMs);
    setLifeDuration(lifeEls.afterValue,remainingAfterMs,{careerRemaining:afterRemaining});
    updateCareerBar(afterRemaining,lifeEls.afterBar,lifeEls.afterBarFill,'은퇴일 ~ 80세 기준일 · 은퇴 이후 계획시간 중');
    setProgressDuration(lifeEls.usedHours,Math.min(ms,age80Ms)-birthMs,true);
    setProgressDuration(lifeEls.remainingHours,age80Ms-ms);
    const values=[
      ['retireMeta','65세 기준'],
      ['workMeta','평일 8시간 기준'],
      ['afterMeta',beforeRetirement?'65~80세까지':'80세까지'],
      ['progressPercent',`${used.toFixed(1)}%`],
      ['usedMeta',`(${used.toFixed(1)}%)`],
      ['remainingMeta',`(${(100-used).toFixed(1)}%)`]
    ];
    for(const [key,val] of values){if(lifeEls[key]?.textContent!==val)lifeEls[key].textContent=val; if(key.endsWith('Meta') && ['retireMeta','workMeta','afterMeta'].includes(key) && lifeEls[key]?.title!==val)lifeEls[key].title=val;}
    const width=`${(100-used).toFixed(8)}%`;
    if(lifeEls.progressBar.style.width!==width)lifeEls.progressBar.style.width=width;
  }

  let weatherStatus='loading',weatherLastAttempt=0,weatherRequest=null,weatherSearchRequest=null;
  let weatherCandidates=[];
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
    if(weatherSymbol.textContent!==icon)weatherSymbol.textContent=icon;
    if(weatherLabel.textContent!==label)weatherLabel.textContent=label;
    if(weatherLine.dataset.weather!==status)weatherLine.dataset.weather=status;
    const title=(WEATHER?.city?WEATHER.city+' · ':'')+label+' · 클릭하여 지역 설정';
    if(weatherLine.title!==title)weatherLine.title=title;
    if(weatherLine.getAttribute('aria-label')!==title)weatherLine.setAttribute('aria-label',title);
  }
  function syncWeatherRegion() {
    const next=localWeatherRegion||legacyWeatherRegion();
    if(next===WEATHER||weatherRegionKey(next)===weatherRegionKey(WEATHER))return;
    weatherRequest?.abort();weatherRequest=null;weatherLastAttempt=0;
    WEATHER=next;
    if(next)setWeather('◌','날씨 조회','loading');
    else setWeather('◌','지역 설정','unconfigured');
  }
  function onWeatherSettingsStorage(event) {
    if(event.key!==WEATHER_LOCAL_PREF&&event.key!==null)return;
    localWeatherRegion=readWeatherRegion();
    if(!disposed)updateWeather();
  }
  function clearWeatherSearch() {
    weatherSearchRequest?.abort();weatherSearchRequest=null;
    weatherCandidates=[];weatherResults.replaceChildren();weatherResults.hidden=true;weatherApply.disabled=true;
  }
  function showWeatherSetup(open) {
    if(!open)clearWeatherSearch();
    weatherSetup.hidden=!open;
    weatherLine.setAttribute('aria-expanded',String(open));
    weatherMessage.textContent='';
    if(open){weatherQuery.value=WEATHER?.city?.split(' · ')[0]||'';weatherQuery.focus();}
    schedulePlacement();
  }
  function parseWeatherCandidates(rows) {
    if(!Array.isArray(rows))return [];
    const result=[],seen=new Set();
    for(const item of rows){
      const parts=[item?.name,item?.admin1,item?.country].filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim());
      if(!parts.length)continue;
      const region=parseWeatherRegion({latitude:item.latitude,longitude:item.longitude,city:[...new Set(parts)].join(' · ')});
      const key=weatherRegionKey(region);
      if(!region||seen.has(key))continue;
      seen.add(key);result.push(region);
      if(result.length===10)break;
    }
    return result;
  }
  // Public city-center presets (approximate coordinates). Local search never
  // requires network access; no city is automatically selected.
  const WEATHER_CITIES=[
    ['서울','Seoul',37.5665,126.9780],['부산','Busan',35.1796,129.0756],
    ['대구','Daegu',35.8714,128.6014],['인천','Incheon',37.4563,126.7052],
    ['광주','Gwangju',35.1595,126.8526],['대전','Daejeon',36.3504,127.3845],
    ['울산','Ulsan',35.5384,129.3114],['세종','Sejong',36.4800,127.2890],
    ['수원','Suwon',37.2636,127.0286],['춘천','Chuncheon',37.8813,127.7298],
    ['청주','Cheongju',36.6424,127.4890],['전주','Jeonju',35.8242,127.1480],
    ['목포','Mokpo',34.8118,126.3922],['여수','Yeosu',34.7604,127.6622],
    ['순천','Suncheon',34.9506,127.4872],['나주','Naju',35.0150,126.7108],
    ['창원','Changwon',35.2270,128.6811],['제주','Jeju',33.4996,126.5312]
  ];
  function presetWeatherCandidates(name) {
    const q=String(name||'').trim().toLowerCase().replace(/\s+/g,'');
    return WEATHER_CITIES.filter(([ko,en])=>q===ko||q===ko+'시'||q===en.toLowerCase())
      .map(([ko,en,latitude,longitude])=>({latitude,longitude,city:ko+' · 대한민국'}));
  }
  function weatherErrorMessage(error) {
    const code=String(error?.message||'');
    if(code==='timeout'||code==='aborted')return '응답 시간 초과';
    if(/^HTTP \d{3}$/.test(code))return code;
    if(code==='invalid-json')return '응답 형식 오류';
    if(code==='network'||code==='network-denied')return '연결 또는 권한 오류';
    return '연결 실패';
  }
  function getWeatherJson(url,signal) {
    // Only internal URLSearchParams-generated queries for the two weather endpoints.
    const allowed=/^https:\/\/(?:geocoding-api\.open-meteo\.com\/v1\/search|api\.open-meteo\.com\/v1\/forecast)\?[A-Za-z0-9%+&=._~-]+$/.test(url);
    if(!allowed)return Promise.reject(Error('network-denied'));
    if(signal.aborted)return Promise.reject(Error('aborted'));
    if(typeof GM_xmlhttpRequest!=='function'){
      return fetch(url,{mode:'cors',cache:'no-store',signal,credentials:'omit',referrerPolicy:'no-referrer'})
        .then(resp=>{if(!resp.ok)throw Error('HTTP '+resp.status);return resp.json();});
    }
    return new Promise((resolve,reject)=>{
      let request,settled=false;
      function finish(fn,value){
        if(settled)return;
        settled=true;signal.removeEventListener('abort',cancel);fn(value);
      }
      function cancel(){
        finish(reject,Error('aborted'));
        try{request?.abort();}catch(_){}
      }
      signal.addEventListener('abort',cancel,{once:true});
      try{
        request=GM_xmlhttpRequest({
          method:'GET',url,anonymous:true,timeout:9000,
          onload:r=>{
            if(r.status<200||r.status>=300){finish(reject,Error('HTTP '+r.status));return;}
            try{finish(resolve,JSON.parse(r.responseText));}
            catch(_){finish(reject,Error('invalid-json'));}
          },
          onerror:()=>finish(reject,Error('network')),
          ontimeout:()=>finish(reject,Error('timeout')),
          onabort:()=>finish(reject,Error('aborted'))
        });
        if(signal.aborted)cancel();
      }catch(_){finish(reject,Error('network-denied'));}
    });
  }
  function showWeatherCandidates(candidates,message) {
    weatherCandidates=candidates;
    weatherResults.replaceChildren();
    candidates.forEach((region,index)=>{
      const option=document.createElement('option');option.value=String(index);option.textContent=region.city;weatherResults.append(option);
    });
    weatherResults.hidden=!candidates.length;weatherApply.disabled=!candidates.length;
    weatherMessage.textContent=message;
    schedulePlacement();
  }
  weatherLine.addEventListener('click',()=>showWeatherSetup(weatherSetup.hidden));
  weatherCancel.addEventListener('click',()=>{showWeatherSetup(false);weatherLine.focus();});
  weatherQuery.addEventListener('input',()=>{clearWeatherSearch();weatherMessage.textContent='';});
  weatherSetup.addEventListener('submit',async event=>{
    event.preventDefault();
    const name=weatherQuery.value.trim();clearWeatherSearch();
    if(name.length<2){weatherMessage.textContent='지역명을 두 글자 이상 입력해 주세요.';return;}
    const local=presetWeatherCandidates(name);
    if(local.length){showWeatherCandidates(local,'지역을 선택한 후 저장하세요. (도시 중심 기준)');return;}
    weatherMessage.textContent='지역 검색 중…';
    const ctrl=new AbortController();weatherSearchRequest=ctrl;
    const timeout=setTimeout(()=>ctrl.abort(),9000);
    try{
      const params=new URLSearchParams({name,count:'10',language:'ko',format:'json'});
      const json=await getWeatherJson(`https://geocoding-api.open-meteo.com/v1/search?${params}`,ctrl.signal);
      if(disposed||weatherSearchRequest!==ctrl)return;
      const candidates=parseWeatherCandidates(json?.results);
      if(!candidates.length){weatherMessage.textContent='검색 결과가 없습니다. 영문 지역명으로도 검색해 보세요.';return;}
      showWeatherCandidates(candidates,'지역을 선택한 후 저장하세요.');
    }catch(error){
      if(!disposed&&weatherSearchRequest===ctrl)weatherMessage.textContent='지역 검색 실패: '+weatherErrorMessage(error)+'. 서울 등 주요 도시는 오프라인 검색 가능합니다.';
    }finally{
      clearTimeout(timeout);
      if(weatherSearchRequest===ctrl){weatherSearchRequest=null;schedulePlacement();}
    }
  });
  weatherApply.addEventListener('click',()=>{
    const region=weatherCandidates[Number(weatherResults.value)];
    if(!region)return;
    try{localStorage.setItem(WEATHER_LOCAL_PREF,JSON.stringify(region));}catch(_){weatherMessage.textContent='브라우저 저장소에 저장할 수 없습니다.';return;}
    localWeatherRegion=region;showWeatherSetup(false);weatherLine.focus();updateWeather();
  });
  async function updateWeather() {
    if(disposed||document.hidden)return;
    syncWeatherRegion();
    const region=WEATHER;
    if(!region){setWeather('◌','지역 설정','unconfigured');return;}
    if(weatherRequest)return;
    const now=Date.now();
    if(now-weatherLastAttempt<WEATHER_INTERVAL_MS)return;
    weatherLastAttempt=now;
    const ctrl=new AbortController();weatherRequest=ctrl;
    const timeout=setTimeout(()=>ctrl.abort(),9000);
    try{
      const qs=new URLSearchParams({latitude:String(region.latitude),longitude:String(region.longitude),current:'weather_code,is_day',timezone:'Asia/Seoul'});
      const json=await getWeatherJson(`https://api.open-meteo.com/v1/forecast?${qs}`,ctrl.signal);
      if(typeof json?.current?.weather_code!=='number')throw Error('invalid-weather-data');
      const [icon,label]=weatherName(json.current.weather_code,Boolean(json.current.is_day));
      if(!disposed&&weatherRequest===ctrl)setWeather(icon,label,'ready');
    }catch(error){
      if(!disposed&&weatherRequest===ctrl){
        setWeather('◌','날씨 불가','error');
        weatherLine.title=(region.city?region.city+' · ':'')+'날씨 조회 실패: '+weatherErrorMessage(error)+' · 클릭하여 지역 설정';
      }
    }finally{
      clearTimeout(timeout);if(weatherRequest===ctrl)weatherRequest=null;
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
    if(host.dataset.jarooWidth!==mode)host.dataset.jarooWidth=mode;
    const micro=width<185?'true':'false';
    if(host.dataset.jarooMicro!==micro)host.dataset.jarooMicro=micro;
    if(host.style.getPropertyValue('--jaroo-ui-scale')!==value){
      host.style.setProperty('--jaroo-ui-scale',value);
    }
    return scale;
  }

  // Native source-logo replacement only; no artificial menu spacing.
  const stylesheet = document.createElement('style');
  stylesheet.id = STYLE_ID;
  stylesheet.textContent = `
    [${SOURCE_ATTR}="v3"] {
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(stylesheet);

  let queued = false;
  let placementReport = { phase: 'pending', reason: 'not-placed', lastError: '' };

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
        if (!disposed && control.isConnected && control.getAttribute('aria-expanded') === 'false') {
          control.dispatchEvent(new KeyboardEvent('keydown', {
            key: 'ArrowDown', code: 'ArrowDown', bubbles: true, cancelable: true
          }));
        }
        schedulePlacement();
      });
    }
    schedulePlacement();
  });

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
    style('margin-top','0px');style('margin-bottom','11px');
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
    for(const old of densitySidebars)if(!old.isConnected){
      old.removeAttribute('data-jaroo-sidebar-width');densitySidebars.delete(old);
    }
    densitySidebars.add(sidebar);
    // In narrow mode CSS max-width can reduce the used box below maxWidth.
    // Fit to the actual rendered width, not the optimistic requested width.
    // Date chip and 7-segment glyphs scale together through .clock-line zoom.
    // No transform/height hacks; native document flow determines menu position.
    const content=shadow.querySelector('.clock-content');
    content.style.transform='';content.style.height='';
    return true;
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
    resizeObserver.observe(host);
    resizeObserver.observe(clockEl);
    if (header && header !== sidebar) resizeObserver.observe(header);
    // Also catch a flex/grid slot shrinking while the sidebar keeps its width.
    if (sidebar.parentElement) resizeObserver.observe(sidebar.parentElement);
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

  // All four progress bars share an integer physical-pixel thickness.
  // Measure only on placement/resize, not during the one-second countdown.
  const progressTracks = [...shadow.querySelectorAll('.career-bar,.life-bar')];
  function progressPixelHeight(dpr) {
    return Math.max(1,Math.floor(5*dpr+1e-6))/dpr;
  }
  function progressPixelOffset(top,dpr) {
    return Math.round(top*dpr)/dpr-top;
  }
  function snapProgressTracks() {
    const dpr=Number(window.devicePixelRatio);
    if(!Number.isFinite(dpr)||dpr<=0)return;
    const height=progressPixelHeight(dpr).toFixed(6)+'px';
    if(host.style.getPropertyValue('--life-progress-bar-height')!==height)
      host.style.setProperty('--life-progress-bar-height',height);
    // Reset offsets in a batch, read the original positions, then write once.
    const visible=progressTracks.filter(track=>!track.hidden);
    for(const track of visible)track.style.removeProperty('--life-progress-bar-offset');
    const offsets=visible.map(track=>{
      const r=track.getBoundingClientRect();
      return r.height>0?progressPixelOffset(r.top,dpr):0;
    });
    visible.forEach((track,i)=>{
      if(Math.abs(offsets[i])>0.000001)
        track.style.setProperty('--life-progress-bar-offset',offsets[i].toFixed(6)+'px');
    });
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
    snapProgressTracks();
    const widgetBottom=host.getBoundingClientRect().bottom;
    if(menuTop && widgetBottom>menuTop+1){
      hideWidget('overlap-guard', {...measurements,menuTop,widgetBottom});return;
    }
    recordPlacement('visible','in-native-flow',{...measurements,menuTop,widgetBottom,lifeMountState});
  }

  function refresh() {
    const now=new Date();
    const parts = Object.fromEntries(
      formatter.formatToParts(now)
        .filter(part => part.type !== 'literal')
        .map(part => [part.type, part.value])
    );
    const dateMain = `${parts.month}.${parts.day}(${parts.weekday})`;
    if(dateMainEl.textContent !== dateMain) dateMainEl.textContent = dateMain;
    updateWeather();
    // Visible glyphs are lightweight monospace text; screen readers receive the full label.
    const clockLabel=`한국 표준시 ${parts.hour}시 ${parts.minute}분 ${parts.second}초`;
    if(clockEl.getAttribute('aria-label')!==clockLabel)clockEl.setAttribute('aria-label',clockLabel);
    const numbers = parts.hour + parts.minute + parts.second;
    for (let i = 0; i < digits.length; i++) setDigit(digits[i], numbers[i]);
    const hour = Number(parts.hour);
    updateLifeClock(now);
    // Simple fixed day/night rule in Korea, not astronomical sunrise/sunset.
    const phase=hour>=6&&hour<18?'day':'night';
    if(host.dataset.phase!==phase)host.dataset.phase=phase;

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
    if (queued || disposed || document.hidden) return;
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

  function syncClockTimers() {
    if(disposed||document.hidden){
      clearInterval(tickHandle);tickHandle=0;
      clearInterval(recoveryHandle);recoveryHandle=0;
      if(frameHandle)cancelAnimationFrame(frameHandle);
      frameHandle=0;queued=false;
      return;
    }
    if(!tickHandle)tickHandle=setInterval(()=>{if(!disposed&&!document.hidden)refresh();},1000);
    if(!recoveryHandle)recoveryHandle=setInterval(()=>{
      if(!disposed&&!document.hidden&&(!hiddenSource?.isConnected||!observedMutationSidebar?.isConnected))schedulePlacement();
    },7000);
  }
  function onVisibility() {
    if(disposed)return;
    syncClockTimers();
    if(!document.hidden){refresh();schedulePlacement();}
  }
  function onFocus() { if (!disposed&&!document.hidden) { refresh(); schedulePlacement(); } }

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
    host.setAttribute('data-ebook-clock-ready','true');
    schedulePlacement();
    document.fonts?.ready.then(() => { if (!disposed) schedulePlacement(); });
    // Same foreground cadence; pause UI timers while hidden.
    syncClockTimers();
    window.addEventListener('resize', schedulePlacement, { passive: true });
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage',onLifeSettingsStorage);
    window.addEventListener('storage',onWeatherSettingsStorage);
    window.visualViewport?.addEventListener('resize', schedulePlacement, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    resizeObserver?.disconnect();
    syncClockTimers();
    window.removeEventListener('resize', schedulePlacement);
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('storage',onLifeSettingsStorage);
    window.removeEventListener('storage',onWeatherSettingsStorage);
    weatherRequest?.abort();weatherRequest=null;
    weatherSearchRequest?.abort();weatherSearchRequest=null;
    window.visualViewport?.removeEventListener('resize', schedulePlacement);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('DOMContentLoaded', start);
    restoreSource();
    for (const sidebar of densitySidebars)
      sidebar.removeAttribute('data-jaroo-sidebar-width');
    densitySidebars.clear();
    host.remove();
    stylesheet.remove();
    if (PAGE[RUNTIME_KEY]?.dispose === dispose) delete PAGE[RUNTIME_KEY];
  }
  PAGE[RUNTIME_KEY] = {
    version: '3.11.55', dispose,
    diagnostics: () => ({
      version: '3.11.55', ...placementReport,
      hostConnected: host.isConnected,
      display: getComputedStyle(host).display,
      clockPresent: Boolean(shadow.querySelector('.clock')),
      legacyHexJPresent: Boolean(shadow.querySelector('.brand-mark')),
      segmentClock: shadow.querySelectorAll('.digital-time .digit').length === 6,
      fontLoaded: Boolean(document.fonts?.check?.('12px Pretendard')),
      counterPresent: Boolean(shadow.querySelector('.jaroo-center')),
      weatherConfigured:!!WEATHER,
      lifeClockPresent: Boolean(lifeCard),
      lifeProfileState:lifeSource,lifeProfileValid:!!LIFE,lifeClockFolded:clockFolded,
      lifeClockVisible:!!lifeCard.getClientRects().length&&getComputedStyle(lifeCard).display!=='none',
      lifeMountState,
      lifePanelInFlow: host.parentElement !== document.body && host.isConnected,
      lifeCardFontWeight: getComputedStyle(lifeEls.retireValue).fontWeight,
      responsiveScale:host.style.getPropertyValue('--jaroo-ui-scale'),
      readableMode:host.dataset.jarooWidth,
      timeUnit:'시간',
      lifeMetricCount:shadow.querySelectorAll('.life-card').length,
      weatherLocation:WEATHER?.city||'',
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
