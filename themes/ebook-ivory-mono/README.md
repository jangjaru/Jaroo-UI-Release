# Jaroo's Company · E-book Editorial Notebook v0.2.2

**2026-11-24 · 독립 E-book 테마 / 실제 로그인 Chrome 검수 전**

기존 Dracula Neon / Flat Neon Pixel CSS·JS 및 Life Clock·Status·Mapper 핵심 코드와 별도로 업데이트하는 E-book 테마입니다.

## 업데이트 링크
- **Stylus CSS 0.2.2:** https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css
- **Tampermonkey JS 0.2.2:** https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js

기존 E-book v0.2.1에서 Stylus·Tampermonkey의 업데이트 확인을 누르고 `Ctrl+Shift+R` 새로고침합니다. 감지되지 않으면 링크를 열어 기존 항목을 갱신하되 중복 설치하지 마세요.

**유지:** Dracula/Flat Neon CSS 비활성화, E-book CSS만 활성화. E-book JS와 Clock 3.10.2 / Status 6.8.2 / Mapper 1.3.6은 유지. 로컬 프로필은 삭제하지 않습니다.

## 반영 범위
- 일반 대화 본문 11.2px, 사용자 메시지 10.8px
- 사용자 메시지: 투명 배경 및 **2.5px 차콜 테두리**
- 상단 현재 채팅 제목 인식 시 16px / Bold 720
- Dot 알림 숫자: 투명 배경과 1.8px 차콜 원형 테두리
- 작성창 외곽 실제 `#composer-background` 포함 1px 차콜, 그림자 제거
- 업로드 사진/파일 미리보기 존재 시 JS가 위치를 계산해 아래에 얇은 연회색 구분선 표시
- Extra High/High/Medium 등 버튼 인식 시 색상 #1F1E1A 및 750 Bold, 화살표 강조

### ChatGPT 모양
라이트 / 배경 `#F6F2E8` / 전경·액센트 `#1F1E1A`

### 확인 / 원복
기능·데이터는 건드리지 않고 디자인만 변경했습니다. 실제 사용자 로그인 Chrome에서 첨부 구분선 위치와 모델 선택 버튼이 정상 적용되는지 화면 검수가 필요합니다.

필요시 Chrome 개발자도구 콘솔에서 `window.__jarooEbookIvoryMonoV1?.diagnostics?.()`를 확인합니다. 결과 중 `dotMarkers`, `effortMarkers`, `headerMarkers`, `uploadDivider`가 DOM 탐지 여부를 보여줍니다.

원상 복구 시 E-book CSS·JS만 끄고 Dracula/Flat Neon 등 이전 디자인 설정으로 복귀합니다. Clock/Status/Mapper와 개인 프로필은 유지합니다.
