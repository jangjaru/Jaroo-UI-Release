# Jaroo E-book Classic Paper — Helper JS v0.2.5

**2026-11-24 | 좌측 채팅명만 정확히 1pt 축소**

이전 E-book CSS v0.2.10에서도 채팅명 크기가 안 줄어든 이유는, 실제 채팅명 내부에 E-book Tampermonkey JS가 `font-size: ... !important`를 직접 지정하고 있었기 때문일 가능성이 크다. 기존 0.2.4 JS가 공통 변수로 프로젝트/채팅명을 함께 처리했지만, 사용자 화면에서는 채팅명이 그대로였다.

그래서 **E-book JS v0.2.5가 채팅명 최종 텍스트 요소에만 14.667px을 직접 지정하도록 변경**했다. 앞서 성공한 16px보다 1pt 작은 값이다.

- **좌측 채팅명:** 실제 글자 16px → **14.667px**
- **좌측 프로젝트명:** 건드리지 않음 (기존 CSS 값과 적용 구조 유지)
- **우측 본문, 입력창, 색상·종이질감, 기타 UI:** 변경 없음
- 기존 Clock/Status/Mapper, Dracula, Flat Neon 그대로 유지
- **Stylus CSS v0.2.10 그대로**, 이번에는 **Tampermonkey JS만 업데이트**한다.

### 설치

[Tampermonkey E-book JS v0.2.5](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js)

Tampermonkey의 기존 E-book Role Indicators & Clock Skin 스크립트를 업데이트하고, 버전 **0.2.5**를 확인한 뒤 ChatGPT에서 `Ctrl+Shift+R`.

진단 명령:
```javascript
window.__jarooEbookIvoryMonoV1?.diagnostics?.()
```
이제 `opticalChatTarget: "14.667px"`가 출력된다. 선택한 채팅명 가장 안쪽 span의 **Computed font-size가 약 14.67px인지** 실제 Chrome에서 확인해야 정상 적용 여부를 판단할 수 있다. 프로젝트명은 별도 수정하지 않았다.

원복 시 E-book 보조 JS 이전 버전을 GitHub 이력에서 복원하면 된다. 핵심 Life Clock / Status / Mapper 개인 데이터는 삭제하지 않는다.
