# Jaroo's Company UI · Dracula Neon 복구/설치

**2026-11-23 | 최신 배포본은 Dracula Neon 복구판입니다.**

## 기존 설치에서 가장 빠른 방법

1. Tampermonkey와 Stylus에서 각각 기존 항목을 내보내 백업합니다. **개인 Life Clock 프로필은 절대 삭제하지 마세요.**
2. 기존 Neo 테마가 남아 있으면 중복 설치된 스타일·사용자 스크립트를 비활성화합니다. 동일한 기능의 스크립트는 하나만 켭니다.
3. Tampermonkey에서 **Check for userscript updates** 실행: Clock **3.10.0**, Status **6.8.0**, Mapper **1.3.6** 확인.
4. Stylus에서 **Jaroo ChatGPT Dracula Neon 8.3.0** 업데이트 실행. 기존 이름/네임스페이스는 그대로입니다.
5. ChatGPT 앱의 모양을 **다크 / Dracula**로 복구합니다. 필요 시 기존 기준 배경 `#282A36`, 전경 `#F8F8F2`, 액센트 `#FF79C6`으로 설정합니다.
6. 새로고침 후 Life Clock, RUN/DONE, ALL/ONLY, 역할 기호, 프로젝트 색상, 채팅 제목, 본문과 입력창을 확인합니다.

## frozen 설치본이라면

`frozen` 폴더의 파일은 과거 복구 전용 브랜치를 추적하므로 최신 `main`을 자동으로 받지 않습니다. 아래 **main 링크**로 재설치하여 최신 배포본을 추적하세요. 교체 전에 기존 설치는 백업한 뒤 비활성화하고 중복 설치하지 마세요.

| 종류 | 최신 설치 링크 | 버전 |
|---|---|---|
| Tampermonkey Clock | [clock.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/clock.user.js) | 3.10.0 |
| Tampermonkey Status | [status.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/status.user.js) | 6.8.0 |
| Tampermonkey Mapper | [mapper.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/mapper.user.js) | 1.3.6 |
| Stylus ChatGPT CSS | [theme.user.css](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/theme.user.css) | 8.3.0 |
| Calendar Companion (변경 없음) | [companion.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/calendar/companion.user.js) | 1.3.7 |
| Calendar CSS (변경 없음) | [theme.user.css](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/calendar/theme.user.css) | 1.2.2 |

**검증 상태:** 과거 공개 소스의 복원·버전 정보·정적 문법 및 해시는 확인할 수 있으나, 실제 로그인 Chrome에서의 자동 업데이트 및 정상 표시 여부는 컴퓨터에서 최종 확인이 필요합니다. Life Clock 개인 날짜/날씨 프로필은 공개 배포에 포함되지 않습니다.
