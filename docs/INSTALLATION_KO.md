# Chrome 업데이트 및 설치 · Jaroo's Company UI

**2026-11-23 KST · ChatGPT Neo-Brutalist v1.0**

## 기존 설치에서 업데이트

1. Chrome 테스트 프로필이나 PC 한 대에서 먼저 진행합니다. 이전 정상본이 있다면 ZIP을 로컬에 보관합니다.
2. Tampermonkey 메뉴에서 **Check for userscript updates**를 실행합니다. 대시보드의 설치 항목에서 **Sidebar Live Clock 3.8.2**과 **Status & Command Center 6.7.1**을 확인합니다.
3. Stylus 관리 화면에서 **Jaroo ChatGPT Dracula Neon** 항목의 업데이트를 확인하고 **8.0.2**을 적용합니다. 기존 설치에 연결되도록 이 항목 이름을 계속 사용합니다.
4. ChatGPT를 새로고침합니다. 설치 항목별로 활성 버전이 하나인지, 별도 로컬 프로필이 활성 상태인지 확인합니다. Mapper와 Calendar는 이번 업데이트에서 내려받을 새 버전이 없습니다.

## 업데이트 후 확인

- Chrome에 로그인한 상태에서 사이드바를 180~220px, 260~290px, 395~420px로 바꿔 긴 프로젝트·대화 제목의 줄바꿈과 더보기 버튼을 확인합니다. 시계는 24시간제로 표시되며 넓은 사이드바에서는 초까지 보입니다.
- 새 응답을 실행해 채팅 제목의 본래 역할 색이 유지되고, RUN에서는 옅은 청록색, 미확인 완료에서는 옅은 노란색 배경이 나타나는지 확인합니다. 제목의 역할 기호, 선택 테두리, 제목 링크, RUN/DONE 목록과 ALL/ONLY 전환도 확인합니다.
- 본문·사이드바·입력창의 기본 글자와 제목·강조의 굵기 차이를 확인합니다. 글꼴은 Pretendard Variable이며 기본 400, 제목과 의미상 강조 600입니다. 표·코드 가로 스크롤, 메뉴, Work 패널과 키보드 포커스도 확인합니다. 로컬 프로필이 없는 테스트 프로필에서는 Life Clock 지표가 숨겨지는지 확인합니다.

오프라인 Chromium에서 화면과 기능을 검증했습니다. 실제 로그인 화면, 확장 프로그램 업데이트, 개인 프로필 출력은 Chrome에서 최종 확인해야 합니다.

## 처음 설치하거나 기존 항목이 업데이트되지 않을 때

1. Chrome에서 Tampermonkey와 Stylus를 활성화합니다. 예전 수동 설치본이 있다면 백업하고 비활성화합니다.
2. 기존의 개인 전용 Tampermonkey 프로필을 그대로 사용합니다. 처음 설정하는 경우 본인에게 제공된 로컬 프로필을 Tampermonkey 대시보드에서 저장합니다. 개인 날짜나 날씨 위치가 들어 있는 파일은 로컬에 보관합니다.
3. 아래 웹 주소에서 필요한 `*.user.js`를 열고 Tampermonkey 설치 화면을 확인합니다. `*.user.css`는 웹 주소로 열어 Stylus에서 설치하고 업데이트 확인을 활성화합니다.
4. 해당 사이트를 새로고침합니다. 같은 기능을 하는 이전 설치본과 새 항목이 동시에 활성화되어 있지 않은지 확인합니다.

| 항목 | 설치 URL | 버전 |
|---|---|---|
| Clock (Tampermonkey) | [clock.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/clock.user.js) | 3.8.2 |
| Status (Tampermonkey) | [status.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/status.user.js) | 6.7.1 |
| Mapper (Tampermonkey) | [mapper.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/mapper.user.js) | 1.3.2 |
| ChatGPT CSS (Stylus) | [theme.user.css](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/theme.user.css) | 8.0.2 |
| Calendar Companion (Tampermonkey) | [companion.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/calendar/companion.user.js) | 1.3.7 |
| Calendar CSS (Stylus) | [theme.user.css](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/calendar/theme.user.css) | 1.2.2 |

## 되돌리기

테스트 프로필에서 새 버전을 비활성화하고 저장해 둔 이전 정상본을 복구할 수 있습니다. 공개 이전 버전은 [8.0.1 시점의 커밋](https://github.com/jangjaru/Jaroo-UI-Release/tree/329dd9693fb0283fef21198883b8925344b63a6f)에 보관되어 있습니다. 이전 코드로 공개 업데이트를 제공하려면 설치 버전보다 높은 번호로 다시 배포해야 합니다.
