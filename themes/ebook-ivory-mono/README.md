# E-book Classic Paper v0.2.10 — 사이드바 글자 크기 미세 조정

2026-11-24. 기존 v0.2.9에서 실제 크기 적용이 확인된 방식을 유지하고 **좌측 프로젝트명과 채팅명만 1pt씩 축소**했어.

| 요소 | 이전 | 변경 |
|---|---:|---:|
| 좌측 프로젝트명 | 16px | 14.667px |
| 좌측 채팅명 | 16px | 14.667px |
| 우측 본문 | 기존 14px | 그대로 |
| 기타 좌측 메뉴·입력창 | 기존 | 그대로 |

JS는 v0.2.4 그대로 유지하며, CSS 변수 `--eb-nav-optical-size`만 **16px → 14.667px**로 수정했어. JS가 그 변수를 읽어 실제 글자에 적용하기 때문에 **이번에는 CSS만 업데이트하면 돼.**

[Stylus CSS v0.2.10 설치/업데이트](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css)

변경 없음: 텍스트 굵기·자간·서체, 클래식 페이퍼 질감, 액센트 색, Dot, Life Clock, RUN/DONE, Mapper, Dracula/Flat Neon.

Stylus 업데이트 후 `Ctrl+Shift+R` 새로고침하고, 좌측 두 종류가 우측 본문과 시각적으로 자연스럽게 균형을 이루는지 확인해. 로그인 Chrome의 실제 렌더링은 사용자 확인 전이야.
