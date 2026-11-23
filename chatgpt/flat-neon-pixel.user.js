// ==UserScript==
// @name         Jaroo Flat Neon Pixel · PREVIEW Shadow Skin
// @namespace    jaroo.preview.flat-neon-pixel
// @version      0.1.0
// @description  Visual-only overrides for existing Jaroo Life Clock + Status Shadow DOM; no business/state logic changed.
// @match        https://chatgpt.com/*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/flat-neon-pixel.user.js
// @downloadURL  https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/flat-neon-pixel.user.js
// ==/UserScript==

(() => {
  'use strict';
  const RUNTIME = '__jarooFlatNeonPixelPreviewSkin';
  try { window[RUNTIME]?.dispose?.(); } catch (_) {}

  const CLOCK_ID = 'jaroo-flat-neon-clock-skin-v01';
  const PANEL_ID = 'jaroo-flat-neon-panel-skin-v01';
  const HOST_ID = 'jaroo-clock-overlay-v25';

  const clockStyles = String.raw`
    :host {
      --fn-bg:#272822;--fn-rail:#1B1D19;--fn-surface:#30312B;
      --fn-ink:#F8F8F2;--fn-muted:#B2B4A6;
      --fn-pink:#FF2D87;--fn-green:#B9FF00;--fn-purple:#C879FF;
      --fn-cyan:#00E5FF;--fn-blue:#458AFF;--fn-yellow:#FFE500;--fn-orange:#FF9900;
      --jaroo-brand-light-angle:0deg!important;
    }
    /* Pure flat pixel-ish surfaces and lines: NO gradients, glass, glow or shadow. */
    :is(.fallback-brand,.life-clock,.life-card,.life-progress,.life-bar,
      .life-bar-fill,.life-bar-glow,.clock,.clock-content,.date-chip,
      .digital-time,.brand-title,.brand-jaroo,.brand-company,.brand-subtitle,
      .brand-word,.brand-arrow,.weather-line,.life-value,.life-title,.life-label) {
      box-shadow:none!important;text-shadow:none!important;filter:none!important;
      backdrop-filter:none!important;-webkit-backdrop-filter:none!important;
      background-image:none!important;animation:none!important;
      -webkit-mask:none!important;mask:none!important;
    }
    .fallback-brand,.fallback-brand::before,.fallback-brand::after {
      animation:none!important;box-shadow:none!important;filter:none!important;
      background-image:none!important;-webkit-mask:none!important;mask:none!important;
    }
    .fallback-brand::before,.fallback-brand::after {content:none!important;display:none!important;}
    .fallback-brand {
      background:var(--fn-rail)!important;border:2px solid var(--fn-pink)!important;
      border-radius:2px!important;color:var(--fn-ink)!important;
    }
    .brand-title,.brand-jaroo,.brand-company,.brand-title * {
      color:var(--fn-pink)!important;-webkit-text-fill-color:var(--fn-pink)!important;
      font-family:"Pretendard Variable","Pretendard",sans-serif!important;
      font-weight:750!important;letter-spacing:-.02em!important;
      background:none!important;-webkit-background-clip:border-box!important;
    }
    .brand-subtitle {color:var(--fn-muted)!important;-webkit-text-fill-color:var(--fn-muted)!important;font-weight:500!important;}
    .brand-arrow {color:var(--fn-yellow)!important;}
    .life-clock {
      background:var(--fn-bg)!important;border:2px solid var(--fn-purple)!important;
      border-radius:2px!important;color:var(--fn-ink)!important;
    }
    .life-title,.life-title .ico {color:var(--fn-green)!important;filter:none!important;}
    .life-sub,.life-progress-scale,.life-meta,.life-progress-stat span {color:var(--fn-muted)!important;}
    .life-card,.life-card.retire,.life-card.work,.life-card.after {
      background:var(--fn-surface)!important;border-radius:2px!important;border:2px solid var(--fn-border,#55584D)!important;
      box-shadow:none!important;
    }
    .life-card.retire {border-left:4px solid var(--fn-yellow)!important;}
    .life-card.work {border-left:4px solid var(--fn-cyan)!important;}
    .life-card.after {border-left:4px solid var(--fn-green)!important;}
    .life-card.retire .life-label {color:var(--fn-yellow)!important;}
    .life-card.work .life-label {color:var(--fn-cyan)!important;}
    .life-card.after .life-label {color:var(--fn-green)!important;}
    .life-value,.life-value *,.life-progress-stat strong {color:var(--fn-ink)!important;font-weight:690!important;}
    .life-progress-title {color:var(--fn-green)!important;font-weight:720!important;}
    .life-progress-percent {color:var(--fn-green)!important;font-weight:710!important;}
    .life-bar {background:#45473A!important;border:1px solid #55584D!important;border-radius:0!important;}
    .life-bar-fill {background:var(--fn-green)!important;border-radius:0!important;}
    .life-bar-glow {display:none!important;}
    .clock,.clock-content {
      background:var(--fn-rail)!important;border:2px solid var(--fn-cyan)!important;
      border-radius:2px!important;box-shadow:none!important;
    }
    .clock-content {border:0!important;}
    .date-chip {background:none!important;border:0!important;box-shadow:none!important;}
    .date-main,.weather-label {color:var(--fn-muted)!important;}
    .weather-symbol {color:var(--fn-yellow)!important;}
    .digital-time,.separator {color:var(--fn-cyan)!important;animation:none!important;text-shadow:none!important;}
    .digit .seg.on {background:var(--fn-cyan)!important;box-shadow:none!important;filter:none!important;}
    .digit .seg.off {box-shadow:none!important;filter:none!important;}
    /* Status script inserts a dock STYLE into the same ShadowRoot. */
    .jaroo-center {--jaroo-run-color:var(--fn-orange)!important;--jaroo-done-color:var(--fn-green)!important;}
    .jaroo-center :is(button,.jaroo-top-badge,.jaroo-mode-frame,.jaroo-mode-switch,
      .jaroo-mode-track,.jaroo-mode-thumb,.jaroo-top-mark,.jaroo-top-word,.count) {
      box-shadow:none!important;text-shadow:none!important;filter:none!important;
      background-image:none!important;animation:none!important;transition:none!important;
    }
    .jaroo-center button {
      background:var(--fn-rail)!important;border:2px solid var(--fn-orange)!important;
      border-radius:2px!important;color:var(--fn-orange)!important;
    }
    .jaroo-center .done {color:var(--fn-green)!important;border-color:var(--fn-green)!important;}
    .jaroo-center .jaroo-mode-switch {color:var(--fn-purple)!important;border-color:var(--fn-purple)!important;}
    .jaroo-center .jaroo-top-badge,.jaroo-center .jaroo-mode-frame {
      background:transparent!important;border:0!important;border-radius:0!important;
    }
    .jaroo-center :is(.run,.done) :is(.jaroo-top-word,.jaroo-top-mark,.count) {color:inherit!important;font-weight:720!important;}
    .jaroo-center .jaroo-mini-label {color:var(--fn-muted)!important;font-weight:500!important;}
    .jaroo-center .jaroo-top-badge::before,.jaroo-center .jaroo-top-badge::after {
      content:none!important;display:none!important;animation:none!important;
    }
    .jaroo-center .jaroo-mode-track {background:#45473A!important;border:1px solid var(--fn-purple)!important;}
    .jaroo-center .jaroo-mode-thumb {background:var(--fn-purple)!important;}
    .jaroo-focus-list,.jaroo-focus-header,.jaroo-focus-row,.jaroo-focus-tag {
      background:var(--fn-rail)!important;border-radius:2px!important;box-shadow:none!important;
      text-shadow:none!important;filter:none!important;animation:none!important;
    }
    .jaroo-focus-list {border:2px solid var(--fn-purple)!important;}
    .jaroo-focus-row {border:1px solid #55584D!important;}
    .jaroo-focus-tag[data-jstatus="working"] {color:var(--fn-orange)!important;border:2px solid var(--fn-orange)!important;}
    .jaroo-focus-tag[data-jstatus="done"] {color:var(--fn-green)!important;border:2px solid var(--fn-green)!important;}
  `;

  const panelStyles = String.raw`
    #jaroo-v4-quick-panel,#jaroo-v4-title-tip {
      color:#F8F8F2!important;background:#22231F!important;
      border:2px solid #C879FF!important;border-radius:2px!important;
      box-shadow:none!important;text-shadow:none!important;filter:none!important;
      backdrop-filter:none!important;
    }
    #jaroo-v4-quick-panel :is(.head,.dismiss,.tag,a),#jaroo-v4-title-tip * {
      border-radius:2px!important;box-shadow:none!important;text-shadow:none!important;
      filter:none!important;background-image:none!important;animation:none!important;
    }
    #jaroo-v4-quick-panel .tag[data-jstatus="working"] {color:#FF9900!important;border:2px solid #FF9900!important;background:#1B1D19!important;}
    #jaroo-v4-quick-panel .tag[data-jstatus="done"] {color:#B9FF00!important;border:2px solid #B9FF00!important;background:#1B1D19!important;}
    #jaroo-v4-quick-panel .tag::before {animation:none!important;filter:none!important;text-shadow:none!important;}
    #jaroo-v4-quick-panel .dismiss {color:#272822!important;background:#FFE500!important;border:2px solid #FFE500!important;}
    #jaroo-v4-quick-panel a:hover,#jaroo-v4-quick-panel a:focus-visible {background:#30312B!important;outline:2px solid #00E5FF!important;}
  `;

  let disposed = false;
  let currentShadow = null;
  let currentStyle = null;
  let timer = 0;
  let panelStyle = null;

  function installPanelStyle() {
    if (panelStyle?.isConnected) return;
    panelStyle = document.getElementById(PANEL_ID);
    if (!panelStyle) {
      panelStyle = document.createElement('style');
      panelStyle.id = PANEL_ID;
      panelStyle.textContent = panelStyles;
      (document.head || document.documentElement).appendChild(panelStyle);
    }
  }
  function sync() {
    if (disposed) return;
    installPanelStyle();
    const host = document.getElementById(HOST_ID);
    const shadow = host?.shadowRoot;
    if (!shadow) return;
    let css = shadow.getElementById?.(CLOCK_ID) || shadow.querySelector(`#${CLOCK_ID}`);
    if (!css) {
      css = document.createElement('style');
      css.id = CLOCK_ID;
      css.textContent = clockStyles;
      shadow.appendChild(css);
    }
    // Clock and Status may re-insert their own styles after our first load.
    const dockCSS = shadow.querySelector('#jaroo-command-v4-style');
    if (dockCSS && (css.compareDocumentPosition(dockCSS) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      shadow.appendChild(css);
    }
    currentShadow = shadow;
    currentStyle = css;
  }
  function dispose() {
    disposed = true;
    window.clearInterval(timer);
    currentStyle?.remove();
    document.getElementById(PANEL_ID)?.remove();
    if (window[RUNTIME]?.dispose === dispose) delete window[RUNTIME];
  }
  installPanelStyle();
  sync();
  // Low-frequency recovery for sidebar remounts, without invasive DOM observers.
  timer = window.setInterval(sync, 1600);
  window[RUNTIME] = { version:'0.1.0', dispose, sync };
})();