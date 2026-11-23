# Jaroo's Company · E-book Editorial Notebook v0.2.3

**2026-11-24 | E-book 테마 독립 배포 | 실제 로그인 Chrome 검수 대기**

## 수정 핵심

**좌측 프로젝트명, 채팅명, 우측 일반 대화 본문, 전송된 사용자 메시지, 프롬프트 작성 중 텍스트를 같은 폰트 크기로 맞춘다.** 데스크톱 기준 **14px**이며, 좁은 화면에서는 `--eb-ui-size` 값을 따라 모두 함께 변경된다. 상단 현재 채팅명(16px)·문서 제목·보조 레이블은 내용 위계에 따라 별도 유지한다.

- **영문·숫자**: 설치된 `IBM Plex Mono`
- **한글**: 설치된 `Pretendard Variable` (IBM Plex Mono에 없는 한글 글리프의 폴백)
- **업로드 이미지/파일과 입력 텍스트 사이 가로선**: 액센트 `#1F1E1A`
- **프롬프트 작성창 외곽**: 액센트 `#1F1E1A` **2.5px** — 사용자 메시지 테두리와 동일
- 그림자·글로우 제거, 기존 모눈종이 배경·둥근 모서리 유지
- 기존 상단 채팅명 강조, Dot 배지, Extra High 강조 및 Clock/Status 관련 로직 유지

## 바로 설치

| 유형 | 설치/업데이트 URL | 버전 |
|---|---|---|
| Stylus CSS | [E-book theme.user.css](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css) | **0.2.3** |
| Tampermonkey JS | [E-book indicators.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js) | **0.2.3** |

설치된 E-book v0.2.2에서 두 항목을 각각 업데이트한 후 ChatGPT를 `Ctrl+Shift+R`로 새로고침한다. 업데이트 확인이 반응하지 않으면 위 URL에서 기존 E-book 항목을 덮어쓰고 중복 항목은 비활성화한다.

**유지:** Stylus Dracula 및 Flat Neon 스타일 OFF / Stylus E-book ON. Tampermonkey의 E-book JS와 핵심 Clock·Status·Mapper JS ON, Flat Neon 보조 JS OFF. 개인 로컬 프로필은 삭제하지 않는다.

ChatGPT 모양 설정: 라이트 / 배경 `#F6F2E8` / 전경 `#1F1E1A` / 액센트 `#1F1E1A`.

## 실제 글자 크기 확인

개발자도구 Console에서 다음을 실행한다.

```javascript
window.__jarooEbookIvoryMonoV1?.diagnostics?.().fontAudit
```

출력되는 `project.fontSize`, `chat.fontSize`, `reply.fontSize`, `user.fontSize`, `prompt.fontSize`가 가능한 경우 모두 `14px`여야 한다. `found:false`는 해당 텍스트가 DOM에 없거나 요소 탐지에 실패한 경우다. 이 진단은 메시지 내용을 출력하지 않고 계산된 CSS 속성만 반환한다.

**검증 상태:** 코드 구문, 기존 원본 보존, CSS 속성 연결 및 배포 원본 일치는 확인 가능하지만, 실제 로그인 Chrome에서의 계산 스타일과 시각적 완성도는 사용자 PC에서 확인해야 한다.

## 원상 복구

E-book CSS/JS만 비활성화하고 Dracula 또는 Flat Neon 스타일로 되돌린다. 기존 Clock/Status/Mapper와 로컬 프로필은 그대로 둔다.
