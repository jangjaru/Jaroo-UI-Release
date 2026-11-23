# Jaroo's Company · E-book Editorial Notebook v0.2.0

**2026-11-23 · 독립 E-book 테마 / Chrome 실제 화면 검수 대기**

이번 버전은 이전 E-book Ivory Mono 0.1.1을 업데이트하며, Dracula Neon / Flat Neon Pixel 및 핵심 Life Clock/Status/Mapper 코드와 별도로 관리해.

## 설치 및 업데이트

| 항목 | 설치 URL | 버전 |
|---|---|---|
| Stylus E-book CSS | [theme.user.css](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css) | **0.2.0** |
| Tampermonkey E-book JS | [indicators.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js) | **0.2.0** |

이미 E-book v0.1.1이 설치됐다면 Stylus·Tampermonkey에서 **업데이트 확인**한 후 ChatGPT를 새로고침해. 자동 업데이트가 안 되면 위 링크에서 기존 항목을 덮어쓰되 중복 설치하지 않도록 해.

최초 설치라면 E-book CSS/JS 두 개를 설치해. Stylus에서는 **Dracula Neon**과 **Flat Neon Pixel PREVIEW CSS**를 비활성화하고 E-book CSS만 켜. Tampermonkey에서는 Flat Neon Pixel 시각 보조 JS만 끄고 E-book 보조 JS를 켜. **Clock 3.10.2, Status 6.8.2, Mapper 1.3.6 및 개인 로컬 프로필은 반드시 유지**해.

## ChatGPT 모양 추천값

- 모드: 라이트
- 배경색: **`#F6F2E8`**
- 전경색: **`#1F1E1A`**
- 액센트: **`#9B8F7A`**

## 이번 수정

- 본문·채팅명·프로젝트명 14px 공통 크기
- 가변폭 **Pretendard Variable** 기본 사용, 숫자·메타·코드는 IBM Plex Mono
- 프로젝트명 600 굵기, 자간 -0.03em / 기존 프로젝트 앞 회색 원 제거
- 채팅명 450 굵기, 자간 -0.035em / 역할별 컬러 원 인디케이터 보존
- 메인 배경에 28px 크기의 극도로 옅은 노트 격자
- 입력창 베이지 메모 카드, 18px 라운드, 회색 포커스 테두리
- 번호·글머리표 입력 시 들여쓰기와 말줄임 개선
- Dot 알림 숫자는 JS가 식별한 경우에만 투명 배경·차콜 테두리의 검정 원형 배지 적용
- Life Clock과 RUN/DONE의 원래 계산·데이터·상태 전환은 변경하지 않음

## 검수와 되돌리기

소스 JS 문법과 CSS 괄호 및 구조를 확인했고, 공개 저장소 파일 일치 여부를 별도 검증한다. 실제 사용자 Chrome 화면에서의 Dot 배지 대상 식별, Life Clock/Status 표시, 입력창 및 텍스트 렌더링 확인은 아직 완료되지 않았어.

원상 복구 시 E-book CSS와 보조 JS만 끄고 기존 Dracula/Flat Neon을 켠 뒤 ChatGPT 모양을 다크/기존 색으로 돌려. **핵심 JS 및 Life Clock 개인 프로필은 절대 지우지 마.**
