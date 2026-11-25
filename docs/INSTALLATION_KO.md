# Jaroo's Company · Dracula Neon CSS v8.3.4 적용 안내

**변경 범위:** 좌측 프로젝트 이름과 채팅 제목만 글꼴 굵기 약 30% 증가. 우측 본문·Life Clock·RUN/DONE·색상·레이아웃은 변경하지 않았습니다.

## 업데이트
1. Stylus 설정을 내보내기로 백업합니다.
2. Stylus 관리 화면에서 `Jaroo ChatGPT Dracula Neon` → 업데이트 확인.
3. **CSS v8.3.4**가 설치되었는지 확인하고 ChatGPT에서 `Ctrl+R`.
4. 프로젝트명(대표실·전략기획본부·일반 부서)과 채팅명(일반/선택/완료)을 이전 화면과 비교합니다.

자동 업데이트가 감지되지 않으면 [최신 CSS 직접 설치](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/theme.user.css)를 사용합니다. 단, 기존 스타일을 삭제하거나 중복 설치하지 말고 먼저 백업한 후 기존 항목을 업데이트합니다. frozen 브랜치로 설치한 경우 main을 자동 추적하지 않습니다.

**변경 없음:** Clock 3.10.2 / Status 6.8.2 / Mapper 1.3.6 / Google Calendar는 별도 E-Book 배포 채널 참조. Tampermonkey 업데이트 불필요.

**검수 상태:** GitHub 소스 반영과 실제 로그인 Chrome 렌더링은 별개이며, 사용자 화면을 보고 최종 승인합니다.

## Google Calendar E-Book v0.5.11 (현재 설치 기준)

기존 Google Calendar Dracula CSS 및 Companion JS는 삭제합니다. 네이티브 Google Calendar 밝은 테마에서 아래 두 E-Book 파일만 설치합니다.

- [Stylus CSS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/calendar-ebook-v0.1/calendar-ebook/theme.user.css)
- [Tampermonkey JS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/calendar-ebook-v0.1/calendar-ebook/companion.user.js)

기존 ChatGPT 설치 지침과 혼동하지 마십시오. 캘린더는 위 전용 업데이트 채널을 사용합니다.
