# Jaroo E-book Classic Paper · CSS v0.2.13 / JS v0.2.7

**2026-11-24 · 입력창 겹선 제거 및 작성한 메시지 글꼴 강조**

## 수정 내용

1. **작성창 단일 테두리:** 이전에는 안쪽 연회색 라인과 바깥쪽 차콜 라인이 겹쳐 보였다. 실제 입력 요소부터 부모를 탐색해 **안쪽 둥근 프레임**을 찾고 그 프레임에만 `2.5px solid #1F1E1A` 액센트 라인을 적용한다. 바깥쪽 중복 테두리와 그림자는 없앤다. 안쪽 라운드는 기존 둥근 곡선을 우선 활용하고 22px보다 작지 않도록 한다.
2. **이미 보낸 내 메시지 글씨:** 우측 일반 본문과 같은 `var(--eb-prose-size)` (**14px 데스크톱 기준**), 굵기 **600**, 전경·액센트 `#1F1E1A`. 투명 배경, 기존 2.5px 라인과 28px 메시지 라운드는 유지한다.
3. 좌측 프로젝트명·채팅명 확정 크기, 표 글자 +1.5pt, 종이 질감, 기존 기능·스크립트는 그대로 보존.

## 설치/업데이트

- [Stylus CSS 0.2.13](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css)
- [Tampermonkey E-book JS 0.2.7](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js)

**이번에는 CSS와 JS 모두 업데이트해야 한다.** 기존 E-book 두 항목을 업데이트한 다음 `Ctrl+Shift+R`로 새로고침한다. 다른 시각 테마(Dracula·Flat Neon)는 OFF, E-book CSS/JS와 Life Clock·Status·Mapper는 ON.

## 확인할 부분

- 프롬프트 작성창 안쪽/바깥쪽에 **두 줄**이 아닌 **차콜 외곽선 한 줄**만 표시되는지
- 둥근 모서리가 기존 안쪽 연회색 박스처럼 자연스러운지
- 전송한 메시지의 글씨가 일반 본문 크기와 같고 적절히 진해졌는지
- 작성, 첨부, 삭제, 모델 선택 버튼 동작이 유지되는지

코드의 JS 문법/CSS 구조와 GitHub 공개·비공개 원본 동일성 검사는 가능하나, **로그인된 Chrome의 실제 DOM과 렌더링은 사용자의 적용 후 확인 필요**하다. 연회색 선이 계속 겹치면 F12로 그 내부 요소를 확인해야 한다.

## 원복

이전 E-book CSS 0.2.12와 JS 0.2.6을 GitHub 커밋 이력에서 다시 적용하거나 신규 두 테마 항목을 비활성화하면 된다. 원본 Clock/Status/Mapper와 개인 프로필은 변경하거나 삭제하지 않는다.
