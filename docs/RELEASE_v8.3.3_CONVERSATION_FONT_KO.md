# Dracula Neon · 본문 글꼴 수정 (v8.3.3)

**2026-11-23 · 디자인 피드백 반영**

## 문제
v8.3.2를 적용한 뒤에도 실제 ChatGPT 화면에서 좌측 프로젝트/채팅명과 달리 우측 일반 본문·강조문이 무겁게 보였습니다. 원인으로 기존 본문 CSS 선택자의 제한적인 적용 범위, DIL 중첩 텍스트의 자체 font-weight 설정, Pretendard 정적 글꼴 대체 가능성을 식별했습니다. 실제 Chrome computed style 검증 전이므로 해당 원인은 가설 단계입니다.

## 변경
- ChatGPT 답변·질문 영역의 p/li, 중첩 span/div, DIL TextBase, 강한 강조, 제목, 표에 적용되는 **본문 전용 CSS** 신설
- 보통 글자 320, 강조 430의 역할 분리
- Pretendard Variable `@font-face` 설정 (로컬 우선, CDN 대안)
- `--jaroo-conversation-css-version: "8.3.3"` 진단용 토큰 추가
- 기존 사이드바/프로젝트/Clock/Status, UI 레이아웃·색상·크기·네온 효과 유지

## 코드와 검수 상태
비공개 소스와 공개 배포본을 동기화하여 제공. 실제 로그인 브라우저에서의 font-face 사용 여부·최종 폰트 렌더링 확인은 사용자 스크린샷 또는 Computed Style 진단이 필요합니다.
