# Jaroo Calendar E-Book v0.2.0 — 디자인 통합 2차

2026.11.25 / 사용자 제공 분할 화면(v0.1.0)을 기준으로 ChatGPT E-Book v1.0의 공통 디자인 언어를 적용. 기존 이름·업데이트 URL·브랜치 유지.

- 좌측 실제 캘린더 탐색 영역에 쿨그레이 빗금/얇은 경계선, 섹션 레이블 형광펜, 만들기 버튼 그림자 제거와 옐로 마커. 캘린더 색상 체크박스·스와치는 보존.
- 헤더 Calendar 브랜드 핑크·월 제목 라임 마커. 오늘·보기·업그레이드·선택 세그먼트는 확인된 이름/네이티브 상태에 한해 모노톤. Google 로고·계정 아바타·기타 고유 아이콘은 그대로 유지. Material 기본 강조색 변경은 확인된 UI 표면으로 제한.
- 미니 달력 숫자 글꼴과 명시적 오늘/선택 표시 통일. 월간 본문 22px 모눈을 약하게 하고 날짜 셀 경계 분리, 오늘 셀의 넓은 라임 채움 제거 및 날짜 강조 유지.
- 일정은 태그/분류/색상 매핑 그대로, 파스텔 틴트 56%/hover 72%, 제목·날짜 15px(900px 이하 14px). 기존 셀·일정 높이, 드래그·클릭·편집, 원래 일정 데이터 유지.
- 검증된 더보기 팝업/불투명 상세 대화상자 표면을 E-Book으로 정리. 오늘·다음 요약 및 범례의 테두리·헤더·간격·종료 표현 개선.
- 기존 scan/cleanup에 표현 마커를 추가했으며 새 폴링·옵저버·외부 호출 없음. 실제 화면 구조가 다르면 일부 표시를 안전하게 건너뜀.
- 검증: 분할 화면을 재구성한 모의 DOM에서 헤더·왼쪽 패널·미니 달력·제어·글자 마커 16개 및 관계없는 패널 제외 확인. 실제 페이지의 DOM과는 별개. 전체 JS 구문, 원본 Model 및 핵심 일정 인식·판정·날짜·열기·스캔 함수 원문 대조, 제어 버튼 분류 15조건, 단색 대비 24조건(최저 4.97:1), CSS 균형 및 마커 정리 범위 확인. 실제 Google Calendar DOM·브라우저 렌더링/편집·드래그 및 리소스 실측은 미검증. 신규 저장소 생성 도구 미지원으로 기존 독립 시험 브랜치 유지.
- 설치: 기존 v0.1.0 CSS 및 JS를 같은 URL에서 각각 갱신 후 F5. 기존 Dracula Gold와 중복 실행하지 않음. ChatGPT main 변경 없음.

# Jaroo Calendar E-Book v0.1.0 — first preview

Google Calendar 전용 Cool E-Ink Graph Paper. ChatGPT E-Book v1.0의 확정 디자인 토큰을 계승하되 일정은 Google Calendar의 네이티브 화면/데이터를 그대로 사용한다.

## 설치
1. Google Calendar 설정(톱니바퀴 → 모양/Appearance)에서 **라이트/Light**를 선택한다. 실제 메뉴 명칭은 환경별 차이가 있을 수 있다.
2. 기존 **Jaroo Google Calendar Dracula Gold** Stylus 스타일과 **Jaroo · Google Calendar Companion** Tampermonkey 스크립트를 비활성화한다. 삭제하지 않아도 된다. ChatGPT E-Book CSS 및 JS는 그대로 유지한다.
3. [Stylus CSS 설치](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/calendar-ebook-v0.1/calendar-ebook/theme.user.css), [Tampermonkey JS 설치](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/calendar-ebook-v0.1/calendar-ebook/companion.user.js)를 각각 한 개씩 설치한다. IBM Plex Mono와 Pretendard Variable은 기존 ChatGPT 테마와 공유한다.
4. Google Calendar 탭에서 F5. 월간 화면을 먼저 검토한다. 다른 보기, 더보기 팝업, 일정 상세/편집, 드래그, 색상 선택도 확인한다.
5. 문제가 있으면 이 두 모듈을 비활성화하고 원래 Light/Dark 설정 및 이전 테마를 복원한다.

## 디자인
- PAPER #EFF1F2 / SIDEBAR #E7EAEB / PANEL #F5F6F6 / INK #292D30 / ACCENT #303438.
- 확인된 월간 그리드에서만 22px 미세 모눈. 현재 월 제목 및 오늘은 라임 표시. 본문과 일정은 기본 레이아웃을 보존.
- 색상: [회의]/[협의] 라임 #D8EA8B, [제작]/[관리]/[작업] 민트 #8FE3CD, [기획]/[검토] 라벤더 #CFC1EF, [실행]/[연락] 핑크 #F3B9CB, [출장]/[외근] 앰버 #FFD36A, [개인]/[휴가] 블루 #AFCFF7. 실제 기본 색상 선택값은 변경하지 않는다.
- [완료]/[취소]/[취소·종결]은 저채도 회색과 취소선, [중단]은 적색과 취소선. [중요]/[최우선] 테두리, [마감] 하단선. 일정 태그/기존 분류 규칙은 유지.
- 텍스트는 짙은 잉크, 파스텔은 배경/왼쪽 키라인에 사용. 일정 글자 14px(좁은 폭 13px), 날짜도 같은 기준. 글꼴/길이에 따른 실제 말줄임은 검수 필요.

## 기능
기존 Calendar Companion v1.3.7 기반. 오늘·다음 7일·화면 전체 목록, 탭 내 최대 3개 고정, 제목 기반 분류/색상 토글, 헤더 범례, 월간 더보기 팝업, 개인정보를 제외한 진단을 유지. 현재 DOM에 렌더링된 항목만 읽으며 계정 전체의 일정을 가져오거나 API 호출, 일정 수정, 새 일정 작성, 색상 저장을 수행하지 않는다. 확인되지 않은 날짜나 제목은 추정하지 않는다. 표시 설정과 핀은 새로고침하면 초기화된다.

## 검증 / 한계
- 원천: 기존 Calendar CSS v1.2.2 / JS v1.3.7 (25292b482cd477e6db0645c323a525b4c89a41d7) 및 ChatGPT E-Book v1.0 색상·글꼴 토큰.
- 전체 JS 구문 검사, 기존 Model 색상 외 원문 동일성 검사, 핵심 DOM/일정 처리 함수 대조, 모의 제목·태그 17조건, 기본/hover 고정색 대비 18조건(최소 4.97:1) 통과.
- 색상 대비는 계산된 단색 조합이며 실제 브라우저 결과가 아니다. 실제 Google Calendar DOM·월/주/일/목록·팝업·이벤트/드래그, Chrome 사용자 화면, 실제 CPU와 RAM은 미검증. 네이티브 Light 모드에서 검수 후 확정한다. Google이 DOM 구조를 변경하면 일부 표시가 적용되지 않을 수 있다.
- 별도 저장소 생성 권한을 제공하는 도구가 없으므로 초기 시험 배포는 기존 공개 Release 저장소의 독립 브랜치 및 calendar-ebook 폴더에 둔다. main과 기존 ChatGPT/Calendar 파일은 변경하지 않는다. 독립 저장소로 이관 시 CSS/JS의 updateURL 및 downloadURL, 설치 링크를 새 원본으로 교체한다.
