# E-book Classic Paper v0.2.4

기준일 2026-11-24. 사용자 선택 1번 클래식 페이퍼 질감 적용.

## 설치
Stylus CSS 0.2.4: https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css
E-book JS는 0.2.3 유지. Dracula/Flat Neon/Clock/Status/Mapper는 변경 없음.

## 변경
- 240px 반복 SVG 데이터 URI에 섬유/미세 입자 질감 내장, 외부 리소스 불필요.
- 메인 모눈 격자 28px 유지, 선 강도 0.052에서 0.022로 약화.
- IBM Plex Mono Latin 전용 별칭을 정의하고 U+0020 공백 제외.
- 영문/숫자는 IBM Plex Mono, 한글/공백은 Pretendard Variable 폴백.
- 본문/좌측 제목 기본 font-size 14px은 변경 없음. 실제 광학 크기 검증은 별도.

## 적용
Stylus에서 E-book CSS만 0.2.4로 업데이트 후 Ctrl+Shift+R.
앱 모양 라이트 / 배경 #F6F2E8 / 전경·액센트 #1F1E1A.
Chrome 글꼴 진단: window.__jarooEbookIvoryMonoV1?.diagnostics?.().fontAudit
프로젝트·채팅명·본문 크기는 실제 계산 스타일과 체감 크기를 각각 검증해야 함.
원상 복구 시 E-book 스타일을 이전 버전으로 복원하거나 비활성화. 개인 프로필 유지.
