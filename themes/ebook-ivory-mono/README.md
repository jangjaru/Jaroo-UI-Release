# Jaroo E-book Classic Paper CSS v0.2.15 / JS v0.2.9

**2026-11-24 · 이미 전송한 프롬프트 텍스트만 20px / Bold 700 강조**

사용자가 보낸 말풍선의 실제 텍스트 노드를 **20px, font-weight 700**으로 보정해 더 크고 선명하게 표시합니다. 기존 글자색 `#1F1E1A`와 종이 질감·라운드·테두리를 유지합니다.

## 유지
- 작성 중인 입력창: **16px**, 크기·굵기 변경 없음
- AI 응답 본문: 기존 **14px** 및 표 크기 유지
- 왼쪽 프로젝트/채팅명, 작은 비비드 도트, 시계, Life Clock, RUN/DONE 표시와 애니메이션 유지
- ChatGPT 원본 데이터·대화 내용 변경 없음

## 설치 / 업데이트
- [Stylus CSS v0.2.15](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css)
- [Tampermonkey E-book Helper JS v0.2.9](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js)

둘 다 기존 항목에 업데이트해야 합니다. 기존 자동 업데이트를 연결한 환경은 **업데이트 확인** 후 `Ctrl + Shift + R`을 누르세요. 다른 테마 Dracula / Flat Neon CSS는 동시에 켜지지 않게 유지합니다. Clock/Status/Mapper 핵심 JS는 그대로 켜 두세요.

## 확인
브라우저 콘솔: `window.__jarooEbookIvoryMonoV1?.diagnostics?.()`

`sentPromptTarget: "20px"`, `promptOpticalTarget: "16px"`으로 나오도록 설계했습니다. 실제 로그인한 Chrome 렌더링 결과는 별도 사용자 화면 확인이 필요합니다.

### 이력
- v0.2.14 / v0.2.8: 전송 프롬프트와 작성 중 프롬프트 모두 16px, 전송 굵기 600
- v0.2.15 / v0.2.9: **전송 프롬프트만 20px / 700**, 작성 중 입력창 16px 유지
