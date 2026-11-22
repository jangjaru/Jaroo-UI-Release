# 설치 가이드 · Jaroo's Company UI Auto-Update (KO)

**배포일: 2026-11-22.** 코드는 공개되어 있지만 개인정보가 포함된 프로필은 **공개하지 않음**.

## 업데이트 구조
- ChatGPT: Tampermonkey 스크립트 3개(Clock/Status/Mapper), Stylus 1개.
- Google Calendar: Tampermonkey 스크립트 1개, Stylus 1개.
- 개인 생년월일·목표일·날씨 위치는 별도 *로컬 전용* Tampermonkey 스크립트 1개.
- 사용 중인 기존 버전은 **자동으로 교체되지 않음**. 첫 설치만 수동 전환해야 함.

## 사전 준비
1. 현재 정상본을 ZIP으로 백업(로컬 안전한 위치), Tampermonkey·Stylus의 기존 항목을 **삭제하지 않음**.
2. 브라우저의 테스트 프로필 또는 한 대의 PC에서 먼저 실행.
3. Tampermonkey와 Stylus가 Chrome에서 활성화되어 있고 필요 권한이 허용되는지 확인.

## 설치 순서
1. 본인에게 전달된 `Jaroo_Local_Profile_v1_PRIVATE_DO_NOT_PUBLISH.user.js`를 **Tampermonkey 대시보드 → 새 스크립트(+)** 창에 붙여넣고 저장. 공개 저장소에 프로필 등록 금지.
2. 기존 ChatGPT Tampermonkey 3개와 Google Calendar Companion 1개를 **일단 비활성화**(삭제하지 않음).
3. 아래 `*.user.js` 4개를 **웹 URL에서** 열어 Tampermonkey가 설치 대상으로 인식하면 설치.
4. 기존 ChatGPT/Calendar Stylus 스타일 2개를 **비활성화**한 후 아래 `*.user.css` 2개를 **웹 URL에서** 열어 Stylus가 설치 대상으로 인식하면 설치. **Check for updates** 체크 상태를 유지.
5. Chrome에서 ChatGPT와 Google Calendar를 새로고침하여 시간·Life Clock·RUN/DONE·팀 컬러·캘린더 이벤트 색상·월간 더보기 팝업 확인.
6. Tampermonkey의 스크립트 자동 업데이트 확인 설정 및 Stylus의 업데이트 주기 설정을 확인. **새 버전이 원격에 올라오지 않으면 업데이트되지 않음**.

## 설치 주소
| 항목 | 설치 URL | 버전 |
|---|---|---|
| Clock (Tampermonkey) | [clock.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/clock.user.js) | 3.7.0 |
| Status (Tampermonkey) | [status.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/status.user.js) | 6.3.17 |
| Mapper (Tampermonkey) | [mapper.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/mapper.user.js) | 1.3.1 |
| ChatGPT CSS (Stylus) | [theme.user.css](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/theme.user.css) | 6.8.6 |
| Calendar Companion (Tampermonkey) | [companion.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/calendar/companion.user.js) | 1.3.7 |
| Calendar CSS (Stylus) | [theme.user.css](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/calendar/theme.user.css) | 1.2.1 |

## 주의 사항
- 로컬 파일(`file://`)에서 UserCSS를 설치하면, Stylus는 로컬 파일 업데이트 경로를 우선할 수 있음. 따라서 CSS는 **반드시 웹 URL로 설치**.
- 기존 스크립트와 배포판 스크립트가 동시에 켜져 있으면 **중복 실행**될 수 있음.
- 개인 프로필 없이 Clock을 실행하면 Life Clock이 숨겨지고 날씨에 '지역 설정 필요' 표시 가능.
- 공개 `raw.githubusercontent.com` 주소는 누구나 소스를 읽을 수 있음.
- 새 버전은 GitHub 원격에 올린 뒤에만 감지됨. 확장프로그램 자체의 주기/권한에 따라 적용 시점은 달라짐.
- 실제 각 PC 설치 확인·자동업데이트 트리거·롤백은 아직 검증 전 상태임.

## 되돌리기
새 배포판 스크립트·스타일을 비활성화하고, 남겨둔 기존 정상본을 다시 켜면 됨. 복구용 ZIP은 본인에게 제공된 파일을 사용.
