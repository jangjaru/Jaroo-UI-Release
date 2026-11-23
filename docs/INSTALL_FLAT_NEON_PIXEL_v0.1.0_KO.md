# Flat Neon Pixel v0.1.0 · 설치 및 복구

**2026-11-23 · 공개 배포된 별도 시험용 디자인 레이어**

기존 Dracula CSS 8.3.4, Clock JS 3.10.2, Status JS 6.8.2, Mapper JS 1.3.6을 **그대로 켜둔 상태로** 아래 두 개를 추가 설치해.

1. Tampermonkey 및 Stylus 설치 항목을 먼저 내보내 백업. 개인 Life Clock 프로필은 삭제하지 마.
2. Stylus: [Flat Neon Pixel CSS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/flat-neon-pixel.user.css) 설치.
3. Tampermonkey: [Flat Neon Pixel JS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/flat-neon-pixel.user.js) 설치.
4. ChatGPT 다크 모드·새로고침. 사용자 지정 색 권고: 배경 `#272822`, 전경 `#F8F8F2`, 액센트 `#FF2D87`.
5. Life Clock, RUN/DONE/ALL, 프로젝트·채팅 목록, 본문, 입력, 표/코드, 메뉴에서 실제 표시와 클릭 동작을 확인.

현재 Dracula의 자동 업데이트로는 이 신규 레이어 두 개가 **자동 설치되지 않아**. 처음 한 번씩 설치하면 이후 버전은 각 파일의 `@updateURL`을 통해 확인할 수 있어.

**원래 Dracula로 되돌리기:** Stylus에서 `Jaroo Flat Neon Pixel · PREVIEW Skin`을 끄고, Tampermonkey에서 `Jaroo Flat Neon Pixel · PREVIEW Shadow Skin`을 끈 다음 새로고침. 기존 Dracula 스크립트는 유지되어 있어.

**검수 상태:** 소스 JS 구문, CSS 파싱, 가상 DOM의 색/그림자 제거·비활성화 스모크 테스트는 통과. 실제 로그인 Chrome 모든 화면과 업데이트 플로우는 아직 검증되지 않았어.
