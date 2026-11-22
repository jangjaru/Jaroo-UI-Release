# ChatGPT UI · Neo-Brutalist v1.0

**2026-11-23 KST · Chrome 로그인 화면 및 확장 프로그램 업데이트 최종 확인 대기**

- ChatGPT 본문, 사이드바, 입력창, 메뉴와 Work 패널에 종이색 배경, 검은 테두리, 단단한 그림자와 명확한 키보드 포커스를 적용했습니다.
- Clock 위젯의 로고와 Life Clock을 같은 디자인으로 구성했습니다. 시계, 날짜·날씨, 로컬 프로필에 따른 인생 지표 계산과 표시를 유지합니다.
- RUN은 청록색, DONE은 노란색 제목 박스로 표시합니다. 채팅 제목과 역할 기호, 선택 프레임, 원래 링크와 ALL/ONLY 동작을 유지합니다. 운영체제의 모션 감소 설정을 켜면 제목 배경 애니메이션이 꺼집니다.

| 변경 파일 | 버전 |
|---|---|
| `chatgpt/theme.user.css` | 8.0.1 |
| `chatgpt/clock.user.js` | 3.8.1 |
| `chatgpt/status.user.js` | 6.7.0 |

Mapper 1.3.2, Calendar Companion 1.3.7, Calendar UserCSS 1.2.2는 이전 공개 파일과 동일합니다. 공개 파일 해시는 [SHA256.json](../SHA256.json)에서 확인할 수 있습니다.

## 검증 상태

- 오프라인 Chromium에서 사이드바 180·220·260·290·395·420px 화면을 확인했습니다. 제목과 역할 기호, RUN에서 DONE으로의 전환, ALL/ONLY, 선택 테두리, 키보드 포커스, 표·코드의 가로 스크롤, Work 메뉴를 검증했습니다.
- 로컬 프로필 없음·정상 형식·오류 형식을 포함한 DOM 회귀 테스트 12개를 통과했습니다. 공개 패키지가 개인 프로필 패턴 검사를 통과했고 배포 파일 6개의 SHA-256 계산을 확인했습니다.
- 실제 로그인한 ChatGPT의 화면과 Tampermonkey·Stylus 업데이트는 Chrome에서 최종 확인합니다. [Chrome 업데이트 및 확인 절차](INSTALLATION_KO.md)

## 이전 버전

공개 기준본은 [Vivid Neon Readability v7.3.0](RELEASE_v7.3.0_KO.md)입니다. 이전 파일과 해시는 [해당 시점의 커밋](https://github.com/jangjaru/Jaroo-UI-Release/tree/af603c9f929d6e51d71a232b57701116674318c6)에서 확인할 수 있습니다.
