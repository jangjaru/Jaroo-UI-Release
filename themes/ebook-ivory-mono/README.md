# Jaroo E-book Classic Paper CSS v0.2.14 / JS v0.2.8

**2026-11-24 · 보낸 프롬프트 + 작성 중 프롬프트 글자 확대 / 전송 문구 강조**

사용자가 실사용 화면에서 작성 중인 입력창과 이미 보낸 프롬프트 내부의 글자가 일반 본문보다 눈에 띄게 작아 보인다고 반복 보고함. 이전 버전의 CSS `14px`은 부모 요소에 걸렸지만 내부 ChatGPT 리치 텍스트 span/p/div가 별도 크기를 유지했을 가능성이 있음.

## 이번 수정
- **실제 편집 중인 프롬프트 글자:** E-book CSS 및 JS에서 실제 contenteditable 텍스트와 내부 글자에 **16px** 광학 보정값을 우선 적용.
- **이미 전송한 프롬프트 글자:** 동일한 **16px**, 색상 액센트 **`#1F1E1A`**, 굵기 **600**으로 시각적 강조.
- 일반 본문 CSS는 이전 **14px 유지**. 화면상 균형을 맞추는 실험적 광학 보정이므로 같은 Computed font-size라는 뜻은 아님.
- E-book JS가 실제 텍스트를 가진 span/p/div의 인라인 스타일을 별도로 보정하고 종료 시 원복. 아이콘, 코드, 모델 선택 버튼, 업로드 파일 내용은 조정 대상에서 제외.
- **유지:** 왼쪽 프로젝트명·채팅명 확정 크기, 표 글자 +1.5pt, 작성창의 단일 검은 테두리, 보낸 메시지의 곡선 라운드, 종이 질감 및 기존 기능.

## 설치
- [Stylus CSS v0.2.14](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css)
- [Tampermonkey E-book Helper JS v0.2.8](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js)

**CSS와 JS 둘 다 업데이트**하고 `Ctrl + Shift + R`로 새로고침할 것. 기존 E-book 항목을 덮어쓰며 중복 활성화를 피함. Dracula / Flat Neon 테마 CSS는 OFF, 기존 Clock/Status/Mapper 핵심 JS는 ON 유지.

## 진단
Chrome 개발자도구 Console에서 아래 명령으로 `promptTextLeaves`와 `promptOpticalTarget`을 확인할 수 있음.

```javascript
window.__jarooEbookIvoryMonoV1?.diagnostics?.()
```

`promptTextLeaves`가 0이면 실제 입력·메시지 내부 DOM을 찾지 못한 상태일 수 있음. 정상 코드를 배포하더라도 실제 로그인 Chrome에서의 결과가 확인된 것은 아님.

원복: GitHub 이전 배포본으로 되돌리거나 E-book CSS/Helper JS만 꺼서 이전 모양 복원. Clock/Status/Mapper 및 개인 프로필은 건드리지 않음.
