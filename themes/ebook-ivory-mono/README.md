# Jaroo's Company · E-book Ivory Mono v0.1.1

**독립 설치형 테마 · 2026-11-23 · 코드 배포/검증 완료, 로그인 Chrome 실제 시각 검수 대기**

기존 Dracula Neon / Flat Neon Pixel과 **완전히 별개**로 관리하는 E-book 테마야. 기존 CSS/JS와 Life Clock·RUN/DONE·Mapper, 개인 프로필은 수정하지 않았어.

## 설치 또는 업데이트

| 앱 | 최신 E-book 설치 링크 | 버전 |
|---|---|---|
| Stylus | [E-book Ivory Mono CSS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css) | **0.1.1** |
| Tampermonkey | [Role Indicators & Clock Skin JS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js) | **0.1.1** |

### 테마를 처음 설치한다면
1. 기존 Tampermonkey·Stylus 전체 설정을 먼저 내보내기 백업하고, Life Clock 개인 프로필은 삭제하지 않아.
2. Stylus에서 Dracula Neon CSS와 Flat Neon Pixel PREVIEW CSS를 **비활성화**하고 E-book CSS 0.1.1을 설치·활성화해.
3. Tampermonkey에서 Flat Neon Pixel 시각 JS를 **비활성화**하고 E-book JS 0.1.1을 설치·활성화해.
4. **기존 Clock 3.10.2, Status 6.8.2, Mapper 1.3.6 JS는 계속 켜 둬.** 핵심 기능 스크립트야.
5. ChatGPT 모양에서 라이트 모드, 배경 `#FAF9F3`, 전경 `#1D1D1B`, 액센트 `#59B8BC`를 적용한 뒤 새로고침.

### E-book v0.1.0을 이미 사용한다면
- Stylus에서 E-book 테마 CSS 업데이트 확인 → **0.1.1**.
- Tampermonkey에서 E-book Role Indicators JS 업데이트 확인 → **0.1.1**.
- 새로고침하고 버전과 글꼴을 확인해. 업데이트가 안 되면 위 링크를 열어 설치 항목을 갱신하되 기존 테마를 중복 활성화하지 마.

## 이번 0.1.1 변경점

- **영문·숫자:** 로컬 `IBM Plex Mono` 우선.
- **한글:** 로컬 `Monoplex KR`을 다음 폴백으로 사용. 두 글꼴이 설치되지 않은 환경은 다른 폰트로 대체됨.
- **본문/좌측 채팅명:** 공통 기준 `13.5px` (화면 폭이 작아지면 동시에 동일한 값으로 변경).
- **전체 UI:** 카드, 프로젝트명, 입력창, 메뉴, 표, 코드와 Clock 내부 텍스트에 두 글꼴의 우선순위 적용.
- 헤더·강조 제목과 코드 사이즈는 기존 위계를 유지하며, 디지털 시계의 세그먼트는 그대로 보존.
- 색상·아이보리 배경·네비게이션·역할 원형 인디케이터·RUN/DONE 동작은 변경하지 않았어.

## 원상 복구

E-book CSS와 E-book JS만 비활성화하고, 사용하던 Dracula CSS(또는 Dracula + Flat Neon)를 다시 켜. ChatGPT 모양 설정도 원래의 다크·색상으로 돌린 후 새로고침. 핵심 Clock/Status/Mapper JS는 건드리지 않아.

**주의:** 독립 HTML 시제품의 다중 대화 패널은 참고용이며, 이 설치본은 ChatGPT가 기본 제공하는 단일 대화 화면을 유지해. 실제 로그인 Chrome에서 두 폰트가 사용되는지와 좁은 폭 줄바꿈은 아직 사용자가 확인해야 해.
