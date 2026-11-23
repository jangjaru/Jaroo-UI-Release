# Jaroo's Company · E-book Editorial Notebook v0.2.1

**2026-11-24 · 독립 E-book CSS/JS 배포 / 로그인 Chrome 시각 검수 대기**

현재 Dracula Neon, Flat Neon Pixel 및 핵심 Life Clock·Status·Mapper 스크립트와 별도 경로에서만 업데이트되는 E-book 디자인 테마야.

| 앱 | 설치/업데이트 파일 | 버전 |
|---|---|---|
| Stylus | [E-book CSS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css) | **0.2.1** |
| Tampermonkey | [E-book Indicators & Clock Skin JS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js) | **0.2.1** |

### 변경 사항

1. 대화 일반 본문은 14px 기준에서 약 2pt 낮추되, 가독성을 위해 **최소 12px**을 유지. 좌측 프로젝트·채팅명과 입력 중인 프롬프트는 14px 그대로.
2. 실제 이미지/첨부파일 미리보기가 있는 작성창에만 텍스트 입력 영역 위 **연회색 가로선** 추가.
3. 프롬프트 작성창 외곽은 **1px 차콜(`#1F1E1A`) 테두리**와 18px 라운드, 그림자와 글로우 제거.
4. 사용자 메시지 버블은 **투명 배경 + 2px 차콜 테두리**로, 뒤의 노트 격자가 보이도록 변경.
5. 모델/추론 강도 표시는 E-book 보조 JS가 해당 버튼을 인식한 경우 **차콜색 굵은 글자와 화살표**로 표시. 모델 선택 동작은 변경하지 않음.

### 업데이트 순서
1. Stylus·Tampermonkey의 설치 설정을 백업하고 **E-book CSS·JS만** 위 링크에서 업데이트.
2. **Dracula CSS / Flat Neon CSS는 OFF**, E-book CSS는 ON. Flat Neon 시각 JS는 OFF.
3. **Life Clock·Status·Mapper JS 및 개인 로컬 프로필은 계속 ON**.
4. ChatGPT 모양은 라이트 / 배경 `#F6F2E8` / 전경 `#1F1E1A` / 액센트 `#1F1E1A`.
5. `Ctrl+Shift+R` 새로고침 후 사용자 메시지, 첨부파일 있는 프롬프트, 모델·추론 강도 드롭다운을 비교.

### 원상 복구
E-book CSS·JS만 비활성화하고 이전에 사용하던 Dracula / Flat Neon 테마를 다시 켠 뒤 앱 모양을 원래 값으로 돌려. 기존 Clock/Status/Mapper 및 개인 프로필은 제거하지 않아.

**검증 범위:** CSS 구조와 JS 구문, 비공개·공개 GitHub 파일 일치 확인. 실제 로그인 Chrome DOM 구조, 첨부 구분선 선택자, 모델 선택 버튼 마커의 렌더링 효과는 사용자 PC에서 최종 확인 필요.
