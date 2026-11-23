# Jaroo E-book Classic Paper — CSS v0.2.11

**2026-11-24 · 본문 표와 사용자 메시지 외곽 모서리만 수정**

| 항목 | 이전 | 신규 |
|---|---|---|
| Assistant 본문 표의 글씨 | 14px 기준 | **16px** (+1.5pt = +2px) |
| 전송한 사용자 메시지 테두리 곡률 | 14px | **28px** |
| 사용자 메시지 테두리 색·굵기 | 2.5px 차콜 | 유지 |
| 프로젝트명·채팅명·오른쪽 일반 본문·작성창 | 현재 확정 값 | 유지 |
| 종이 질감·글꼴·자간 | 현재 | 유지 |

표 내부에 독립된 글꼴 크기를 갖는 DIL/HTML 텍스트가 있으므로, 이번에는 표 셀과 셀 안의 `span/p/div`까지 직접 지정했어. 별도 표 밖 일반 문장은 건드리지 않았어.

전송한 메시지는 위의 **검은 JS 업데이트 바처럼 부드러운 원형 모서리**가 보이도록 `border-radius:28px`로 설정했어. 짧은 한 줄 메시지는 캡슐에 가깝게 보이고 긴 메시지도 부드러운 라운드 사각형이야.

## 바로 적용

**Stylus CSS 0.2.11:** [최신 E-book 테마 CSS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css)

- E-book Tampermonkey JS는 **0.2.5 그대로** 유지.
- Dracula·Flat Neon·Life Clock·Status·Mapper 변경 없음.
- Stylus에서 E-book CSS만 업데이트한 뒤 `Ctrl+Shift+R`.

검증 상태: 소스 구조 및 공개/비공개 코드 비교 완료. 실제 로그인 Chrome 최종 렌더링 검수는 사용자가 확인해야 해.
