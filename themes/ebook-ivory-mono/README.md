# Jaroo E-book Classic Paper · v0.2.5

**2026-11-24 — 좌측 사이드바 글꼴 크기 +2pt 실험판**

## 설치
- Stylus E-book CSS v0.2.5: https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css
- E-book JS v0.2.3 변경 없음.
- 다른 Dracula/Flat Neon/Clock/Status/Mapper 및 E-book 종이 질감은 유지.

## 유일한 디자인 변경
- 좌측 사이드바 프로젝트명·채팅명·일반 탐색 텍스트의 CSS 글자 크기를 2pt(약 2.67px) 증가.
- 프로젝트/채팅 제목 기준: 14px → 16.67px, 기존 굵기 및 자간은 유지.
- 작은 보조 상태 배지는 11px 기준에서 13.67px로 조정.
- 우측 메시지 본문, 보낸 메시지, 프롬프트 입력, 상단 채팅명, 프롬프트 외곽선과 색상은 수정하지 않음.
- 긴 프로젝트·채팅 제목은 이전보다 빨리 말줄임표 처리될 수 있음. 사이드바 너비는 유지.

## 적용
Stylus에서 E-book CSS만 업데이트한 뒤 Ctrl+Shift+R 새로고침.
추천 ChatGPT 모양: 라이트 / 배경 #F6F2E8 / 전경·액센트 #1F1E1A.
실제 Chrome에서 왼쪽 글꼴과 우측 본문을 시각적으로 비교해야 함. 코드 검증 ≠ 최종 렌더링 검수.

복구: v0.2.4 Git 이력으로 되돌리거나 E-book CSS를 비활성화. Life Clock 개인 설정 삭제 금지.
