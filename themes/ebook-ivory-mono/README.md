# Jaroo E-book Classic Paper v0.2.12 / JS v0.2.6

**2026-11-24 · 세 가지 시각 수정**

1. **좌측 채팅명 +0.5pt:** 기존 실제 표시 크기 14.667px → **15.333px**. E-book JS가 실제 글자가 들어 있는 내부 span에 직접 적용하는 크기도 변경.
2. **좌측 프로젝트명 굵기 강화:** font-weight **650**. 큰 볼드가 아니라 기존 600보다 조금 더 구분되는 수준. 프로젝트 텍스트에만 적용하고 채팅명의 굵기 변경 없음.
3. **프롬프트 입력창 바깥선:** 액센트 `#1F1E1A`로 **2.5px 실선**, 라운드 **18px**, 그림자와 글로우 제거. 편집 글자가 아닌 실제 외곽 프레임을 E-book JS가 찾아 시각 속성만 설정함.

## 설치 링크

- Stylus CSS: [E-book v0.2.12](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css)
- Tampermonkey JS: [E-book v0.2.6](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js)

**이번에는 CSS와 JS 둘 다 업데이트**한 다음 `Ctrl + Shift + R`로 새로고침해.

기존 Dracula·Flat Neon 스타일은 OFF, E-book만 ON. E-book JS와 핵심 Clock/Status/Mapper는 ON, Flat Neon 시각 보조 JS는 OFF 유지.

## 수정 범위와 검증
- 우측 본문·표 크기·사용자 메시지 버블·종이질감·메타정보·프로젝트명 크기는 그대로.
- 사용자 채팅 제목·프로젝트명 데이터나 앱 기능은 전혀 수정하지 않음.
- 바깥선 적용 대상은 텍스트 편집 요소의 실제 주변 프레임. 프레임이 보이지 않는다면 활성 프레임 식별이 실패했을 수 있으므로 실제 DOM을 확인해야 함.
- E-book 시각 JS는 인라인 스타일 원본을 저장하고 종료 시 복원함.
- 공개/비공개 코드 일치, CSS 괄호, JS 구문은 검증. 실제 로그인 Chrome의 테두리·굵기·크기 검수는 별도.

### 이전 버전으로 복귀
E-book CSS·JS를 이전 Git 기록의 버전으로 되돌리거나 시각 테마 두 개를 비활성화하면 돼. **개인 Life Clock 프로필과 핵심 기능 JS는 지우지 마.**
