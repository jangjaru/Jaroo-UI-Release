# Jaroo E-book · Cool E-Ink Graph Paper

**2026-11-24 · Stylus CSS v0.2.34 / Tampermonkey JS v0.2.24**

This update modifies the existing Classic Paper theme; it is **not** a separate mockup or a second overlay.

## v0.2.34 / v0.2.24 · 2026-11-24 — 상큼한 파스텔 그룹 색상 및 Dot 글꼴 통일

- 대표실 핑크 `#F3B9CB`, 전략기획본부 라벤더 `#CFC1EF` 유지.
- 영업팀 `#FFE08A` / BD팀 `#FFEBAD` / 제안팀 `#FFD68A`: 밝은 레몬 옐로 계열.
- 디자인팀 `#9FE8D3` / 기술운영팀 `#B5EFDE` / 인재개발팀 `#C9F4E7`: 같은 민트 계열의 밝기 차등.
- 경영관리실 `#B8D9FF` / 개인비서실 `#D0E6FF`: 맑은 스카이 블루. CEO 경영철학과 판단 `#DDE0E2`: 연회색.
- Dot: 실제 텍스트를 찾아 새 채팅의 글자색, 크기, 굵기, 글꼴을 일치시킴(기준 #292D30 / 16px / 650). 노란 형광펜은 새 채팅만 유지. Dot 아이콘·알림 숫자와 클릭 기능은 변경하지 않음.
- 기존 경계 그림자, Chat/Work, 글꼴·본문 격자·입력창·지시문·RUN/DONE·Life Clock과 다른 테마를 변경하지 않음.
- 공개/비공개 이전 소스 동일성·SHA-256, JS 구문, CSS 구조, Dot 텍스트 식별 단위 테스트 확인. 로그인 Chrome의 실제 DOM/렌더링 검수 대기.

## v0.2.33 / v0.2.23 · 2026-11-24 — 종이 경계와 조직별 형광펜

- 사이드바와 본문 경계: 첫 번째 시안의 은은한 심(seam) 효과. 얇은 우측 그림자와 안쪽 하이라이트만 추가하며 사이드바 폭·배치·88% 질감 완화 설정은 유지.
- 상단 Chat/Work: 기존 위치와 버튼 크기를 보존. 옅은 회색 바탕과 미세한 그림자, 선택된 탭은 기존 액센트 잉크/700 굵기, 비선택은 회색/400. 네이티브 선택 상태를 읽기만 하며 불명확하면 기존 표시를 유지.
- 프로젝트 이름에만 짧고 불규칙한 반투명 형광펜: 대표실 핑크, 전략기획본부 라벤더, 영업·BD·제안은 골드/살구 계열, 디자인 민트, 기술 블루, 인재 세이지 그린, 경영관리·개인비서는 피치 계열, CEO 경영철학은 회보라.
- 폴더 아이콘, 하위 채팅명, RUN/DONE, Life Clock, 본문 22px 격자, 지시문 영역, 새 채팅/Dot, 현재 제목과 프롬프트 서식 유지.
- 검증: 기존 공개/비공개 파일 일치, 기존 SHA-256 대조, JS 구문 컴파일, CSS 구조 검사, 선택 상태·조직 분류 단위 테스트 통과. 실제 로그인 Chrome의 DOM 및 시각/기능 검수는 대기.
- CSS v0.2.33 / JS v0.2.23, 기존 두 설치 항목을 업데이트. 다른 테마 및 보조 JS 변경 없음.

## v0.2.32 · Quiet sidebar + editorial instruction blocks (2026-11-24)
- Sidebar: option 3 selected. Original continuous sidebar, typography and role status preserved. The existing embedded paper SVG is now attenuated by an 88% cool-gray veil; no new panels, cards, decorative borders or shadows.
- Instruction/writing blocks (only when their dedicated DOM class/data markers match): transparent surfaces including immediate inner wrappers, 1px top/bottom rule in rgba(65,75,85,.25), no side borders, radius or shadow; padding 14px vertical / 10px horizontal, margin 16px vertical.
- Copy controls remain clickable and borderless with transparent background. No changes to font, body grid, user bubble, composer, RUN/DONE, Clock/Status/Mapper or other themes.
- CSS-only update: Tampermonkey JS remains v0.2.22.
- Validation limit: CSS structure, private/public identical blob and release SHA256 verified. The connected browser does not expose the signed-in DOM here; whether the native writing block uses targeted selectors and actual styling must be confirmed in Chrome. If no style change appears, inspect the block and refine the exact selector.

## What's changed
- Cool graphite e-paper palette: main `#EFF1F2`, sidebar `#E7EAEB`, panels `#F5F6F6`, body ink `#292D30`, accent `#303438`.
- Subtle 22px square notebook grid, preserving the existing embedded paper-grain image.
- '새 채팅' and 'Dot' labels now match project labels: 16px / weight 650.
- Current selected conversation heading: 16px → 24px and soft lime marker `#D8EA8B`, only on the active breadcrumb.
- **Sent** user prompts: 15px → 15.667px (+0.5pt), weight 650 → 520, charcoal ink. Editable composer remains 16px.
- E-book Clock skin follows the cooler neutrals while preserving segmented digits, Life Clock and existing animations.

## Install / update in place
- [Stylus CSS v0.2.34](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css)
- [Tampermonkey JS v0.2.24](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js)

Update the **existing** two extension entries rather than installing duplicates. In Stylus and Tampermonkey, run the built-in **Check for updates**, then reload ChatGPT with `Ctrl + Shift + R`.

Do not enable the older Dracula / Flat Neon visual themes simultaneously. Leave Clock v3.10.2, Status v6.8.2 and Mapper v1.3.6 enabled as before; the update does not edit those scripts.

## Validation and rollback
Use the ChatGPT page console:
```js
window.__jarooEbookIvoryMonoV1?.diagnostics?.()
```
Expected: JS `version: '0.2.24'`, `sentPromptTarget: '15.667px'`; a selected chat should produce `headerMarkers: 1` when its title is visible. CSS version is `0.2.34`. `quickNavMarkers` reports the actual size, weight and color of New Chat/Dot labels. Diagnostics include `projectMarkers`, `sidebarSeams` and `workSwitcher`; live DOM matching still requires visual confirmation.

To roll back, use the extensions' version history or the previous Git commit of the two E-book files. This release is code-published and statically checked, but **the user's signed-in Chrome rendering and updates have not been verified in this chat**.

Existing private scripts, personal profiles, credentials, RUN/DONE controls, click handlers and Chrome browser chrome remain untouched.
