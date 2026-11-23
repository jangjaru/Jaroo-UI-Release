# Jaroo's Company · E-book Ivory Mono v0.1.0

**독립 설치 테마 · 2026-11-23 · 실제 로그인 Chrome 최종 검수 전**

이 폴더는 기존 Dracula Neon / Flat Neon Pixel과 **별도의 E-book 테마 배포 영역**입니다. 기존 GitHub CSS·JS 파일은 변경하지 않았습니다.

## 설치

| 앱 | E-book 전용 설치 파일 |
|---|---|
| Stylus | [E-book Ivory Mono CSS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css) |
| Tampermonkey | [Role Indicators & Clock Skin JS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js) |

1. 기존 Tampermonkey / Stylus 설정을 각각 **내보내기로 백업**합니다. 개인 Life Clock 프로필은 따로 보관하고 삭제하지 않습니다.
2. Stylus에서 기존 `Jaroo ChatGPT Dracula Neon`과 `Jaroo Flat Neon Pixel · PREVIEW Skin`을 **비활성화**합니다(삭제하지 않음).
3. 위 **E-book CSS**를 Stylus에 설치·활성화합니다. 다른 ChatGPT 색상 테마는 동시에 켜지 마세요.
4. Tampermonkey에서 `Flat Neon Pixel · PREVIEW Shadow Skin`을 비활성화하고 **E-book Role Indicators JS**를 설치·활성화합니다.
5. 핵심 Tampermonkey 스크립트인 **Life Clock 3.10.2 / Status 6.8.2 / Mapper 1.3.6**과 개인 로컬 프로필은 그대로 **켜두세요**.
6. ChatGPT 모양 설정을 **라이트**, 배경 `#FAF9F3`, 전경 `#1D1D1B`, 액센트 `#59B8BC`으로 맞추고 새로고침합니다. 이 색상 설정은 브라우저별로 확인이 필요합니다.
7. 실제 화면에서 프로젝트·채팅 원형 인디케이터, 입력, Life Clock, RUN/DONE, 메뉴와 좁은 창 폭을 검수합니다.

**폰트:** 영문과 숫자는 IBM Plex Mono, 한국어는 Pretendard를 우선 사용합니다. 폰트 파일은 배포하지 않습니다. 설치 환경에 없으면 대체 글꼴로 보일 수 있습니다.

### 다른 테마로 돌아가기

Stylus의 E-book CSS와 Tampermonkey의 E-book JS만 끄고, 기존 Dracula CSS(또는 Dracula + Flat Neon)을 다시 켠 다음 다크 모드와 원래 색상을 복원하고 새로고침하면 됩니다. 핵심 기능 JS는 건드리지 마세요.

### 범위와 한계

- 사용자의 기존 채팅 제목·프로젝트명·React 데이터는 변경하지 않고 화면의 역할 기호만 원형 도트로 표현합니다.
- E-book 스타일은 단일 ChatGPT 웹앱 화면에 적용합니다. 첨부 시안의 독립 다중 패널 기능을 새로 만들지는 않습니다.
- 로컬 합성 DOM 테스트, CSS 파싱 및 JS 문법 시험은 이전 제작에서 통과했지만 **GitHub 설치 및 실제 로그인 Chrome의 최종 검수는 아직 진행하지 않았습니다**.
- 이 폴더의 CSS/JS에는 독립적인 `@name`, `@namespace`, `@updateURL`가 있으므로 기존 테마를 덮어쓰지 않습니다.
