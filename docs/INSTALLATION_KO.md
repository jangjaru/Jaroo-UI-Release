# Jaroo's Company UI · Dracula Neon 8.3.1 업데이트

## 현재 배포 버전

- ChatGPT CSS (Stylus): **8.3.1**
- Life Clock JS (Tampermonkey): **3.10.1**
- Status & Command Center JS (Tampermonkey): **6.8.1**
- Organization Mapper JS: **1.3.6** (변경 없음)
- Google Calendar Companion 1.3.7 / CSS 1.2.2 (변경 없음)

## 적용 방법

1. 현재 Tampermonkey·Stylus 설치 내용을 **내보내기로 백업**합니다. 특히 Life Clock 개인용 프로필은 별도 보존합니다.
2. 기존 Tampermonkey에서 '사용자 스크립트 업데이트 확인'을 실행합니다. Clock 3.10.1 및 Status 6.8.1을 확인합니다.
3. Stylus에서 '모든 스타일 업데이트 확인'을 실행해 ChatGPT Dracula Neon **8.3.1**을 확인합니다.
4. ChatGPT 새로고침 후 본문·사이드바·프로젝트 이름·Life Clock·RUN/DONE 버튼의 글꼴 굵기가 이전보다 부드러워졌는지 확인합니다.
5. 모든 색상·레이아웃과 기능은 기존과 동일해야 합니다. 본문/시계/버튼 잘림이 있으면 화면 캡처로 확인합니다.

**업데이트가 감지되지 않으면**, 아래 main 배포 주소를 열어 기존 항목과 중복되지 않도록 업데이트/재설치합니다. 이전의 frozen 버전은 main 업데이트를 자동 추적하지 않습니다.

| 종류 | 링크 | 버전 |
|---|---|---|
| Clock | [clock.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/clock.user.js) | 3.10.1 |
| Status | [status.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/status.user.js) | 6.8.1 |
| Mapper (변경 없음) | [mapper.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/mapper.user.js) | 1.3.6 |
| ChatGPT CSS | [theme.user.css](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/theme.user.css) | 8.3.1 |

**유지:** ChatGPT 다크 모드, Dracula 색상, 프로젝트 구분, RUN/DONE/ALL, Life Clock 계산, 로컬 프로필 및 브라우저 데이터.

**검수 상태:** 소스 버전·JS 구문·Github 원본/배포 파일 일치·SHA256 검증과 로그인 Chrome 실제 화면 검수는 별개입니다. 최종 시각 검수는 실제 PC의 스크린샷으로 진행합니다.
