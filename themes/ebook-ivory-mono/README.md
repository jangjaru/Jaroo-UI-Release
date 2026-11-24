# Indicators v0.3.2 — 목차 버튼 및 선택색 개선

- 접힌 목차 버튼은 짙은 잉크색 `#2B2F32` 2px 테두리와 얕은 그림자로 플로팅 느낌을 표현한다. 테두리가 두꺼워진 만큼 내부 여백을 1px씩 줄여 기존 버튼 외형 치수를 유지한다.
- 열린 버튼 및 선택된 목차 항목은 개나리색 `#F2D35A`, 호버는 `#F8E9AA`로 통일. 선택 항목에는 얇은 내부 강조선만 적용. 기존 연두색 제거.
- 목차 검색·이동·진단·키보드 포커스·레이아웃과 다른 위젯/테마 기능은 유지. Indicators만 업데이트한다. 소스 및 문법 검사 완료, 로그인 Chrome 시각 확인 필요.

# E-Book 0.3.1 · Clock 3.11.2 · Status 6.9.1 — 상태 표시 초기화 및 반응형 위젯

- 일반 채팅 목록의 사용자 정의 실행중/완료 손글씨, 밑줄, 애니메이션과 SVG 자산 및 제목 마커 처리 삭제. Status의 기본 로딩/미확인 아이콘 숨김과 위치 조정 로직도 삭제. ChatGPT 기본 상태 표시 사용. 상단 RUN/DONE 집계, 확인 및 ALL/ONLY 필터는 유지하며 필터 전용 목록에는 구분을 위한 일반 RUN/DONE 텍스트만 남김.
- 회사명 22px/700 굵기. 위젯 기본 항목명과 날짜 및 작업 상태 제목은 기존 채팅명 토큰 15.333px 공유. 보조 설명은 13px, 항목명 다음 줄.
- 위젯 실제 폭 기반 컨테이너 쿼리: 280px 미만 Life 수치 상하 배치, 310px 미만 날짜/시계 상하 배치, 230px 미만 진행률 상세를 세로 정리. 185px 미만에서 보조 설명 및 슬로건 숨김, 상태 집계 1열. 160px 미만 시계는 같은 크기의 HH:MM만 시각적으로 표시(초 계산 및 접근성 레이블은 유지). 좁은 폭에서도 핵심 글자 및 수치 축소 금지.
- LIFE CLOCK 프로필/계산 및 접기 설정, 8px 역할 원/픽셀 보정, 선택 회색 배경, 기존 IME 보호, 목차·정렬·카운터 유지. 구 네온 렌더러 미복원.
- 소스/문법 및 핵심 로직 비교 완료. 실제 로그인 Chrome 및 사용자의 실제 글꼴/최소 사이드바 폭에서 확인 필요.

# Clock v3.11.1 — LIFE CLOCK 표시 복구

기존 로컬 프로필을 매 시계 갱신 시 재확인하여 늦게 로드되더라도 복구한다. 미설정 시 위젯 전체를 숨기지 않고 `—`와 설정 버튼을 표시한다. 기존 프로필이 없으면 설정에서 생년월일을 직접 입력할 수 있다(65세 은퇴·80세 계획, 명시적 저장 시 chatgpt.com 로컬 저장소에만 저장). 기존 계산식, E-Book 최초 렌더링, 나머지 위젯은 유지한다. 개인 날짜를 저장소에 포함하지 않는다. 브라우저 실사용 확인 필요.

# E-Book 안정화 CSS/Indicators v0.3.0 · Clock 3.11.0 · Status 6.9.0

- 초기 화면: 이전 Clock의 네온 렌더링 후 Shadow DOM을 덮던 방식 제거. E-Book 전용 Clock이 최종 CSS 및 위젯을 detached Shadow DOM에 완성하고 첫 표시. E-Book 전용 Status도 처음부터 조용한 스타일. 옛 Clock/Status 경로는 구 테마 호환을 위해 보존하고 새 E-Book 경로로 설치/업데이트한다(스크립트 이름·namespace·런타임 키는 동일). 혼합 설치 시 이전 위젯/도크 숨김. 이전 이미지나 폰트 파일을 초기 화면에 표시하지 않음.
- 입력: 한글 IME 및 일반 입력 중 편집 영역과 문단의 인라인 스타일/속성 변경 경로 삭제. 입력창 프레임 및 글꼴은 CSS 전담. 첨부 구분선은 편집 영역 바깥에서만 표시하고 입력/조합 종료 후 180ms 안정 구간에 배치. Status 관찰은 편집 텍스트/문단 변화 제외. 텍스트 중복 제거, 키 차단, 강제 커서 이동은 하지 않음.
- 최적화: 불필요한 구형 Clock/Status 네온 CSS 및 원격 로고 글꼴, 브랜드/시간 수치 반복 측정 루프 제거. 남은 근무시간 계산은 같은 KST 평일·점심시간 조건에서 전체 주 단위 산식으로 변경. 상태 전환만 발생하면 전체 사이드바 스캔 대신 상태 메모 갱신. 실제 상태가 있는 채팅에만 Status 배지 생성.
- 원 크기 7→8px, 10px 슬롯 및 픽셀 스냅 보존. 선택 회색 음영, F안 펜 메모, 역할 팔레트, 자동 정렬, 목차, 카운터, 기존 상태 판정/확인 로직 및 로컬 개인 설정 유지.
- 검증: 세 JS 문법, 근무시간 2,800 비교 케이스, 픽셀 보정 72개 조건, IME 입력 보류 로직 단위 검사, 상태 버스 원문 일치, CSS 구조/자산/버전/스코프 검사. 로그인 Chrome의 실제 한글 IME 및 초기 화면은 별도 확인 필요. 전체 CSS의 역사적 패치 전면 재작성은 영향이 크므로 이 버전에서 하지 않음.

**설치:** 기존 Stylus와 Indicators 업데이트. 기존 Clock/Status를 아래 E-Book 전용 링크로 교체(같은 이름/namespace이며 중복 설치 금지). 기존 개인 프로필 스크립트는 유지. Ctrl+Shift+R.

- [CSS](theme.user.css)
- [Indicators](indicators.user.js)
- [E-Book Clock](clock.user.js)
- [E-Book Status](status.user.js)

# E-Book CSS v0.2.64 / JS v0.2.47 — 위젯 및 펜 메모 가독성 개선

- 브랜드, LIFE CLOCK, LIFE PROGRESS, 날짜·날씨, RUN/DONE 글씨 및 숫자 확대. F안 메모 표시 영역 53×20px → 68×25px. 좁은 사이드바에는 줄바꿈 및 2열 배치 적용. 색상, 벡터, 5.6초 애니메이션, 7px 역할 원, 기존 Clock/Status 계산·상태 로직 유지. 전자시계 세그먼트 모양과 크기는 유지.
- CSS/Indicators만 업데이트. 배포 원본 및 JS 문법 검증, 실제 로그인 Chrome에서 크기와 배치 확인 필요.

# E-Book CSS v0.2.63 / JS v0.2.46 — 대시보드 복원 및 F안 펜 메모

- 브랜드 헤더, Life Clock, Life Progress, LCD 시계와 날짜·날씨, RUN/DONE 및 ALL/ONLY에 무채색 E-Book 스킨 적용.
- 기존 Clock v3.10.2 / Status v6.8.2 원본을 재사용한다. 이전에 삭제했다면 두 스크립트를 재설치한다. Mapper는 필요하지 않다. Dracula 및 Flat Neon 시각 테마 중복 적용 금지.
- Clock의 원래 브랜드 클릭은 네이티브 메뉴 연결을 유지한다. 별도 우측 화살표는 시간 정보만 접고 펼친다. RUN/DONE과 ONLY 목록은 계속 접근 가능하다.
- F안 이미지에서 추출한 손글씨를 SVG 마스크로 적용한다. 선택된 RUN만 밑줄→실행중… 순차 공개→유지→지우기(5.6초). 비선택 RUN은 고정, DONE은 완료 ✓ 고정. 실제 획순이 아니라 벡터 클리핑으로 표현한다. 안전한 제목 래퍼가 확인되지 않으면 우측 메모만 표시한다. 시스템 동작 감소 설정을 존중한다.
- 기존 원 7px, 픽셀 스냅, 역할 팔레트, 직책 굵기, 정렬, 목차, 카운터 유지. 원본 Clock/Status의 계산, 상태 감지, 확인 및 필터 로직은 변경하지 않는다.
- Life Clock 및 날씨는 기존 로컬 전용 프로필을 사용한다. 프로필이 없거나 유효하지 않으면 원래 Clock 규칙에 따라 Life Clock이 숨겨지며 날씨도 사용할 수 없을 수 있다. 개인 생년월일·좌표·프로필·폰트 파일은 저장소에 추가하지 않는다.
- 원본 및 JS 문법 검사 완료. 실제 로그인 Chrome에서 설치, 화면 배치, RUN/DONE 전환 및 프로필을 확인해야 한다.

기존 E-Book CSS와 Indicators를 업데이트하고 필요 시 [Clock](../../chatgpt/clock.user.js)과 [Status](../../chatgpt/status.user.js)를 다시 설치한다. 새로고침 후 확인한다. 아래는 기존 이력이다.

# Jaroo E-book · Cool E-Ink Graph Paper

**2026-11-24 · Stylus CSS v0.2.47 / Tampermonkey JS v0.2.36**

This update modifies the existing Classic Paper theme; it is **not** a separate mockup or a second overlay.

## v0.2.47 / v0.2.36 · 2026-11-24 — 완료·중단 채팅 제목 표시

- 사이드바 제목 맨 앞 `[완료]`: 연회색 `#92999E` + 1px 취소선. `[중단]`: 적색 `#C83B42` + 1px 취소선. 태그와 전체 제목에 적용.
- 역할 기호 유무와 무관하게 감지. 태그 수정·제거 시 기존 사이드바 갱신 경로에서 표시를 전환·해제. 채팅 원본 제목, 역할 색상 점, 카운터, 기타 UI와 기존 설치 경로 유지. `[보류]`의 기존 처리 유지.
- 검증: 이전 원본/배포 일치 및 SHA-256 대조, JS 전체 구문, 태그 분류 8건·마커 전환/해제 5건·fallback 2건 단위 검증. 실제 로그인 Chrome 시각 검수는 대기.

## v0.2.46 / v0.2.35 · 2026-11-24 — 채팅 제목 최초 렌더링 및 고정/해제 시 글꼴 안정화

- 기존 채팅 제목 14px/14.667px/15.333px의 중첩 규칙에서 생기는 크기 차이를 줄이기 위해 기존 제목 크기 토큰을 승인값 15.333px로, 프로젝트명 토큰을 16px로 통일.
- 네이티브 고정·최근·프로젝트 목록 및 신규 마크업의 제목/텍스트 leaf를 CSS에서 직접 매칭. 제목 이동이나 React 재생성 시 JavaScript의 사후 보정을 기다리지 않음. 카운터, 아이콘, 숨은 접근성 텍스트, 본문 링크는 별도 유지.
- 일반 제목/프로젝트 글꼴은 CSS가 담당. JS 인라인 보정은 실제로 충돌하는 인라인 !important 또는 구버전 CSS 호환 상황에 한정. 고정/최근 네이티브 section과 실제 레일을 관찰하여 새 노드 및 목록 변경 감지 보완.
- 이전 전송 프롬프트 읽기 토큰도 16.067px/572 승인값과 연결하여 경쟁 규칙을 줄임. 입력 중 16px, 기존 색상·패턴·외곽선 및 다른 디자인 유지.
- 직전 JS v0.2.34의 사이드바 실시간 위치 갱신, 160ms 후 구조 보완 검사, 카운터 집계/색상/정렬 및 첨부 구분선 로직 유지.
- 검증: 실제 과거 규칙을 재현한 Chromium 모의 DOM에서 고정/최근 간 재생성 20회 직후(별도 JS 보정 없이) 15.333px 유지. 프로젝트 16px, 카운터/본문 테스트 요소 크기 유지, 신규 section 매칭 확인. 동일 CSS 패치 SHA-256 대조 및 전체 JS 구문/인라인 예외 5건/직전 주요 함수 동일성 검증. 로그인된 Chrome에서의 전체 첫 페인트 및 실측 지연은 아직 미검증.
- 진단 `firstPaintNav`는 CSS 최초 표시 규칙의 존재 여부, `opticalLeaves`와 `projectWeightLeaves`는 JS 예외 보정 수를 나타냄.

## v0.2.45 / v0.2.34 · 2026-11-24 — 사이드바 폭 변경 시 카운터 실시간 추적

- 브라우저 분할 화면 또는 사이드바 크기 변경 중 카운터가 뒤늦게 이동하는 문제 개선. 기존 ID에 한정하지 않고 실제 카운터 레이어의 사이드바, Dot 행과 해당 조상, 고정 영역을 ResizeObserver로 감시.
- 크기 변경 시 기존 숫자/색/정렬을 보존하면서 위치만 갱신. 드래그가 멈춘 후 160ms에 메뉴 구조 및 입력창 등 보완 검사를 한 번 예약. 기존 스크롤/포커스 동작, 숨긴 탭 보류, 좌표 일괄 계산 유지.
- 브라우저 및 visualViewport resize 이벤트도 위치 전용 갱신 경로로 연결. 감시 대상 교체/스크립트 종료 시 감시와 타이머 해제.
- CSS v0.2.45 및 모든 색상, 글꼴, 카운터 집계·표시 규칙, 사선 패턴과 첨부 구분선 유지. Clock/Status/Mapper 미변경.
- 로컬 Chromium 모의 DOM: 기존 사이드바 ID가 없는 실제 레일 너비 250~350px 왕복 21회, 모든 보이는 카운터의 Dot 중심축 오차 0px, 드래그 중 구조 재검사 0회, 종료 후 1회 예약 확인. 테스트 범위는 위치 추적이며 실제 Chrome 분할 화면 검수는 대기.
- 성능 진단의 `performance.passes.position` 및 `positionResizeTargets`로 위치 갱신과 감시 대상 확인 가능.

## v0.2.45 / v0.2.33 · 2026-11-24 — E-book 단독 실행 성능 개선 1차

- 기존 3개 보조 스크립트(Clock, Status, Mapper)는 사용자가 삭제한 상태이므로 최적화 대상에서 제외. 저장소 원본 및 선택적 호환 기능은 유지하며 재설치하지 않음.
- 카운터 위치 계산: 공유 조상 클리핑/레이어 좌표 캐시, 모든 레이아웃 읽기 후 일괄 스타일 쓰기, Dot 참조 재사용, 프로젝트 내부 포인터 이동 재계산 제외.
- 새 채팅/Dot·모델 선택 UI는 네이티브 사이드바/입력창 범위 우선 탐색. 필요한 경우에만 전역 탐색. Chat/Work의 유효한 기존 요소 재사용, 헤더 후보 문구 대조 후 좌표 측정, 전송 메시지 동일 버블 중복 탐색 제거.
- 화면 표시 코드만 숨긴 탭에서 보류하고 복귀 시 재동기화. 구조 회복 검사 2초→5초, 전체 보완 검사 20초→60초. 리사이즈에서 과거 메시지 글꼴 전수 보정 제외. CSSOM 동일값 쓰기 방지 및 첨부 없는 입력창에서 구분선 위치 계산 생략.
- 스크롤바 숨김 선택자를 식별된 사이드바로 제한하고 광범위한 :has() 사용 제거. 기존 스크롤 기능 및 본문 스크롤바 유지. 다른 CSS 선언·순서·색상·글꼴·사선·종이 질감은 변경하지 않음.
- 로컬 Chromium의 프로젝트 11개/스크롤 6개 상태 비교에서 모든 배지 숫자·색·정렬·표시 여부 동일. 위치 갱신 100회: 스타일 조회 3,600→2,300, 좌표 조회 5,200→2,700, 해당 모의 테스트 시간 46.3→28.6ms. 전체 페이지 실제 성능 개선율은 미측정. 별도 스크롤바 모의 DOM의 사이드바 숨김/본문 유지/스크롤 가능 검증, CSSOM 동일값 및 스케줄 보류/병합 단위 테스트, JS 구문 및 기존·신규 SHA-256 검증.
- 진단의 performance.events / performance.passes에 실행·병합·숨김 보류 및 영역별 평균/최대 실행시간 기록. 사용자 브라우저에서 전체 기능/초기 렌더링/타이핑/스크롤 성능 검수 필요. 대규모 CSS 정리나 질감 교체는 회귀 방지를 위해 다음 단계로 보류.

## v0.2.44 / v0.2.32 · 2026-11-24 — 상단 빗금 및 카운터 테두리 재수정

- 상단 고정영역: 기존 배경이 네이티브 래퍼에 가려질 수 있는 방식을 폐기하고, 프로젝트 카운터와 같은 사이드바 기준으로 독립 사선 패턴 레이어를 표시. ChatGPT / 새 채팅 / Dot까지만 연한 회색 사선(1px / 10px, 9% 불투명도) 및 하단 경계 적용. 기존 고정·스크롤·버튼 배치 및 클릭은 그대로 유지.
- 네이티브 스크롤 경계, 상단 래퍼, Dot 행 하단 순으로 높이 판정. 안전 범위에 해당하지 않으면 패턴을 숨김. Clock 영역은 제외.
- 모든 프로젝트 카운터: CSS의 상태별 우선순위 보강, 가상 요소 제거, JS에서 실제 배지에 inline important 테두리/외곽선/그림자/배경 이미지 제거. Dot 자체와 키보드 포커스 가능한 기본 컨트롤은 변경하지 않음.
- 1~9 회색 원, 10개 이상 확인 시 액센트 원/흰색 9, 크기와 정렬 및 집계 로직 유지. 다른 UI와 기존 로딩 최적화는 유지.
- 검증: CSS 구조, JS 구문, 9개 경계·좌표 테스트 및 테두리 직접 적용 모의 단위 테스트, 공개·비공개 원본/기존 해시 대조. 실제 로그인 Chrome에서 적용 여부는 검수 대기. 미적용 시 진단의 fixedSidebarTop 및 projectCountBorders 확인.

## v0.2.43 / v0.2.31 · 2026-11-24 — 프로젝트 카운터 테두리 제거

- 모든 프로젝트 카운터에서 점선, 실선 테두리 및 외곽선 제거. 집계가 완료되지 않은 경우에도 동일한 원형 디자인 사용.
- 회색 원/차콜 숫자 및 10개 이상 확인 시 액센트색 원/흰색 9, 원 크기, Dot 중심축 정렬 유지. 미확정 집계 상태는 진단정보에 유지하며 실제 전체 채팅 수를 추정하지 않음.
- CSS만 v0.2.43으로 변경. JS v0.2.31 및 기타 디자인 유지. 소스와 배포 해시 검증, 실제 Chrome 표시 확인 대기.

## v0.2.42 / v0.2.31 · 2026-11-24 — 사이드바 스크롤바 숨김 및 전송 글자 미세 조정

- 좌측 사이드바 내부의 스크롤바 표시만 CSS로 숨김. overflow나 스크롤 이벤트는 변경하지 않으므로 마우스 휠·터치패드·키보드 스크롤 기능 유지. 우측 본문 스크롤바는 대상 제외.
- 전송한 프롬프트의 글자 크기를 12.25pt → 12.05pt(16.333px → 16.067px, -0.2pt)로 조정. 굵기 572, 색상, 말풍선 테두리, 작성 중인 입력창 및 답변은 유지.
- 기존 프로젝트 카운터/Dot 정렬, 상단 고정영역, 형광펜, 첨부 구분선 등 다른 규칙 및 로직 유지.
- 검증: 변경 범위 외 원본 동일성, JS 구문, 이전 SHA-256 대조 및 신규 배포 해시 확인. 실제 로그인 Chrome의 시각·스크롤 동작 검수는 대기.

## v0.2.41 / v0.2.30 · 2026-11-24 — 프로젝트 카운터 미표시 및 Dot 정렬 수정

- 프로젝트명 너비나 내부 overflow 때문에 Dot 중심축이 제목 영역 밖에 있으면 기존 코드가 배지를 생성하지 않던 조건 제거. 좁은 버튼과 독립적인 사이드바 표시 레이어에 배지를 배치.
- Dot의 실제 배지 중심·크기·색상을 참조하고, 스크롤 시 위치만 재계산. 원래 제목, 펼침/접힘, 메뉴 클릭 구조는 변경하지 않음.
- 1~9는 기존 회색 원, 10개 이상 확인 시 액센트색(#303438) 원에 흰색 9. 빈 목록 0, 부분 로딩 점선/미확정 ? 등 기존 집계 원칙 유지. 전체 수 메타데이터가 없으면 숨겨진 대화 수를 추정하지 않음.
- 프로젝트 제목과 채팅 목록이 형제 DOM인 구조의 집계 범위 보완. 다른 프로젝트나 최근 채팅 목록과 혼합하지 않도록 단일 프로젝트 그룹을 확인.
- 테스트용 Chromium에서 실제 95px 프로젝트 버튼의 overflow:hidden, Dot과 배지 중심축 298px 일치, 1/3/12개 사례, 스크롤 클리핑, 키보드 포커스, 정리 확인. 테스트에 사용한 세 패치의 SHA-256 동일성 및 전체 JS 구문, 배포 해시 검증. 실제 로그인 Chrome 검수는 대기.
- 전송 프롬프트 크기/굵기, 첨부 구분선, 기존 색상 및 다른 기능은 유지.

## v0.2.40 / v0.2.29 · 2026-11-24 — 전송 프롬프트 글자 미세 조정

- 전송된 사용자 메시지 본문만 15.667px → 16.333px(11.75pt → 12.25pt, +0.5pt), 글꼴 굵기 520 → 572(+10%) 적용.
- CSS의 최종 적용 토큰과 초기 표시 기본값, JS 인라인 보정 기본값을 일치시킴. 글꼴 굵기 값은 10% 증가이며 실제 시각적 두께의 증가율은 폰트 렌더링에 따라 달라질 수 있음.
- 작성 중인 입력창, 답변, 사이드바, 말풍선 색·테두리·라운드, 프로젝트 카운터, 상단 사선 패턴, 첨부파일 구분선 수정 및 기존 로딩 최적화 유지.
- 검증: 변경된 토큰·기본값·버전 외 CSS/JS 바이트 동일성, JS 구문, 기존 공개/비공개 원본 및 SHA-256 대조. 실제 로그인 Chrome에서 크기와 굵기 검수 필요.

## v0.2.39 / v0.2.28 · 2026-11-24 — 첨부파일 구분선 겹침 수정

- 파일 미리보기, 파일명, 카드 하단 및 인접 첨부 카드의 실제 표시 범위를 기준으로 구분선 위치를 계산. 썸네일의 하단만 기준으로 삼거나 입력 영역 안쪽으로 강제 보정하지 않음.
- 첨부 카드 전체와 입력 첫 줄 사이의 실제 빈 공간 중앙에 선 배치. 안전 여백이 확보되지 않으면 다음 레이아웃 갱신까지 표시하지 않음. 입력창 외곽선 두께 및 스크롤 오프셋 반영.
- 업로드 중인 카드와 파일 선택 직후 네이티브 자리표시자의 표시 영역도 감지. 카드/미리보기 크기 변경을 별도로 관찰해 구분선만 갱신하며, 첨부 삭제 시 제거. 원본 업로드 이벤트와 파일 데이터는 변경하지 않음.
- CSS v0.2.39, 상단 사선 패턴, 프로젝트 색상/카운터, 글꼴, RUN/DONE, Life Clock, 기존 로딩 최적화 유지.
- 검증: JS 구문, 9개 간격 경계 테스트, 좌표 보정 2개, 영역 판정 2개, 기존 배포 해시 및 공개·비공개 소스 동일성. 실제 로그인 Chrome의 PDF·이미지·다중 첨부 표시 검수 필요.

## v0.2.39 / v0.2.27 · 2026-11-24 — 상단 고정영역 사선 종이 패턴

- 선택한 사선 시안: ChatGPT 헤더, 새 채팅, Dot이 있는 상단 고정 영역에만 옅은 쿨그레이(#EDF0F1)와 135도 사선(1px / 10px 반복, 회색 6% 불투명도), 하단 1px 경계.
- 기존 네이티브 스크롤 뷰포트 또는 확인 가능한 상단 래퍼의 경계까지만 적용. 스크롤 고정 방식, 높이, 버튼, 클릭, DOM 구조는 변경하지 않음. 경계를 확인하지 못하거나 Clock 영역과 겹치면 적용하지 않음.
- 확정된 11개 조직 색상, 하위 채팅명, 카운터, 본문 격자, 팝업, 업로드 최적화와 기타 스크립트 유지.
- 검증: 이전 원본/배포 SHA-256 대조, CSS 구조, 전체 JS 구문 및 상단 경계 산술/가드 9건 확인. 실제 로그인 Chrome DOM 식별과 스크롤 시 표시 검수는 대기.

## v0.2.38 / v0.2.26 · 2026-11-24 — 조직 그룹별 형광펜 농도 재정렬

- 사용자 확정 색상표를 그대로 적용. 같은 계열에서 아래 순서대로 진한색 → 연한색을 배정.
- 사업·수주: BD팀 `#FFD36A` → 영업팀 `#FFE08A` → 제안팀 `#FFEDB3`.
- 전문 역량·실행: 디자인팀 `#8FE3CD` → 기술운영팀 `#AEEBDD` → 인재개발팀 `#CFF5EA`.
- 업무 지원: 경영관리실 `#AFCFF7` → 개인비서실 `#D7E9FF`.
- 대표실 `#F3B9CB`, 전략기획본부 `#CFC1EF`, CEO 경영철학과 판단 `#DDE0E2` 유지.
- CSS 형광펜 색상 토큰과 버전만 변경. 기존 마커 모양, 불투명도, 카운터, 팝업, 글꼴, 로딩 및 업로드 개선, JS v0.2.26 유지.
- 변경 대상 외 CSS 바이트 동일성 및 기존 SHA-256 대조 완료. 실제 Chrome의 색감 검수는 대기.

## v0.2.37 / v0.2.26 · 2026-11-24 — E-book 채팅 메뉴 정리

- 채팅 더보기/프로젝트 이동 등의 네이티브 액션 메뉴: 기존 쿨 페이퍼 배경 `#F5F6F6`, 차콜 잉크, 얇은 `#C5CDD0` 단일 테두리, 10px 모서리, 낮은 음영으로 통일.
- 메뉴를 감싸는 명시적 native-menu-root/popover 래퍼의 중복 테두리·배경·그림자 제거. 메뉴가 실제 역할을 가진 경우에 한정하며 위치·크기 계산과 메뉴 열기/닫기 동작은 바꾸지 않음.
- 메뉴 행의 6px 모서리, 호버/키보드 선택 시 기존 쿨그레이 강조 배경, 기존 삭제 경고색·비활성 표시·아이콘·단축키 유지.
- 일반 대화상자·리스트박스·툴팁·Jaroo 상태 메뉴는 변경 대상에서 제외. 프로젝트 카운터, 형광펜, 폰트 크기 및 업로드 최적화는 유지.
- CSS만 v0.2.37로 변경. JS v0.2.26은 그대로 유지.
- 로컬 Chromium 모의 메뉴 DOM에서 외부/내부 중복 테두리 제거, 단일 메뉴 테두리와 그림자, 선택 배경, 삭제 빨간색 보존, 일반 dialog/listbox 미변경 확인. 실제 로그인 Chrome의 DOM과 출력 검수는 대기.

## v0.2.36 / v0.2.26 · 2026-11-24 — 프로젝트 원형 카운터 한 자리 표시

- 전체 수 0~9개: 기존 Dot과 동일한 원 배경 및 글자색으로 실제 숫자 표시.
- 10개 이상이 확인되면: 원 크기와 위치를 유지하고 액센트색(`#303438` 기본값) 배경에 흰색 `9` 표시. 두 자리 숫자와 `9+` 표시는 사용하지 않음.
- 미완전 목록: 실제 확인한 수(최대 9)에 회색 점선 테두리로 하한을 구분하고, 수를 전혀 확인하지 못하면 `?` 표시. 확인된 채팅이 10개 이상이면 전체 수가 아직 미확정이어도 액센트 배경으로 표시. 9개까지만 확인된 상태를 초과로 추정하지 않음.
- 집계값·확정 여부·초과 여부는 진단정보에 보존. 기존 우측 정렬, Dot 자체, 네이티브 메뉴, 글꼴·색상·초기 스타일 및 업로드 최적화 유지.
- 사전 검증: JS 구문, CSS 구조, 0/9/10 경계 및 미확정 수 등 12개 집계·표시 테스트. 실제 로그인 Chrome 검수 필요.

## v0.2.35 / v0.2.25 · 2026-11-24 — 프로젝트 채팅 카운터 및 초기 표시 최적화

- 프로젝트별 원형 카운터: Dot의 실제 배지 색·크기·글꼴을 읽어 오른쪽 중심선을 일치시킴. 기존 메뉴 조작을 가리지 않도록 프로젝트 행 hover/focus 시 배지 숨김.
- 집계: 네이티브 프로젝트 영역의 고유 채팅 ID 중복 제거, 명시적 전체 수 메타데이터가 있으면 우선. 목록에 더 보기/로딩/접힘이 있으면 확인한 하한을 N+ 또는 ?로 표시. 완전하게 로드된 것으로 판단되는 그룹만 숫자 표시. 미확인 전체 수를 추정하지 않으며 API 호출, 강제 더 보기 클릭, 채팅 내용 수집, 저장은 없음. 실제 DOM 그룹 구조·완전성 검수 필요.
- 초기 표시: JS document-start, 기본 글꼴과 입력창 외곽선은 네이티브 CSS 선택자로 선적용. 사이드바/입력창/전송 메시지/헤더/시계의 갱신 분리, 편집 중 과거 대화 전체 재검사 제거, 4초 전체 재검사 대신 경량 감시와 20초 보완 검사.
- 업로드 구분선: 업로드 선택/붙여넣기/드롭 이벤트의 파일 존재, 로딩 카드·진행 표시·실제 확보된 미리보기 영역과 크기 변경을 감지. 완료된 이미지 높이 조건 없이 표시하고 첨부 제거 시 정리. 네이티브 업로드 이벤트·파일 내용·전송 동작 변경 없음.
- 확정 파스텔 팔레트, 본문 격자·종이 질감·지시문·Dot·RUN/DONE·Life Clock 및 다른 테마 유지. 실제 속도 개선량과 초기/업로드 표시 타이밍은 로그인 Chrome에서 검증 필요.
- 소스/배포 동일성 및 SHA-256 대조, JS 구문, CSS 구조, 카운트 상태 8건과 ID 추출 2건 단위 검증. 브라우저 실측은 미수행.

## v0.2.34 / v0.2.24 · 2026-11-24 — 상큼한 파스텔 그룹 색상 및 Dot 글꼴 통일

- 대표실 핑크 `#F3B9CB`, 전략기획본부 라벤더 `#CFC1EF` 유지.
- 영업팀 `#FFE08A` / BD팀 `#FFEBAD` / 제안팀 `#FFD68A`: 밝은 레몬 옐로 계열.
- 디자인팀 `#9FE8D3` / 기술운영팀 `#B5EFDE` / 인재개발팀 `#C9F4E7`: 같은 민트 계열의 밝기 차등.
- 경영관리실 `#B8D9FF` / 개인비서실 `#D0E6FF`: 맑은 스카이 블루. CEO 경영철학과 판단 `#DDE0E2`: 연회색.
- Dot: 실제 텍스트를 찾아 새 채팅의 글자색, 크기, 굵기, 글꼴을 일치시킴(기준 #292D30 / 16px / 650). 노란 형광펜은 새 채팅만 유지. Dot 아이콘·알림 숫자와 클릭 기능은 변경하지 않음.
- 기존 경계 그림자, Chat/Work, 글꼴·본문 격자·입력창·지시문·RUN/DONE·Life Clock과 다른 테마를 변경하지 않음.
- 공개/비공개 이전 소스 동일성·SHA-256, JS 구문, CSS 구조, Dot 텍스트 식별 단위 테스트 확인. 로그인 Chrome의 실제 DOM/렌더링 검수 대기.

## v0.2.33 / v0.2.23 · 2026-11-24 — 종이 경계와 조직별 형광펜

- 사이드바와 본문 경계: 첫 번째 시안의 은은한 심(seam) 효과. 얇은 우측 그림자와 안쪽 하이라이트만 추가하며 사이드바 폭·배치·88% 질감 완화 설정은 유지.
- 상단 Chat/Work: 기존 위치와 버튼 크기를 보존. 옅은 회색 바탕과 미세한 그림자, 선택된 탭은 기존 액센트 잉크/700 굵기, 비선택은 회색/400. 네이티브 선택 상태를 읽기만 하며 불명확하면 기존 표시를 유지.
- 프로젝트 이름에만 짧고 불규칙한 반투명 형광펜: 대표실 핑크, 전략기획본부 라벤더, 영업·BD·제안은 골드/살구 계열, 디자인 민트, 기술 블루, 인재 세이지 그린, 경영관리·개인비서는 피치 계열, CEO 경영철학은 회보라.
- 폴더 아이콘, 하위 채팅명, RUN/DONE, Life Clock, 본문 22px 격자, 지시문 영역, 새 채팅/Dot, 현재 제목과 프롬프트 서식 유지.
- 검증: 기존 공개/비공개 파일 일치, 기존 SHA-256 대조, JS 구문 컴파일, CSS 구조 검사, 선택 상태·조직 분류 단위 테스트 통과. 실제 로그인 Chrome의 DOM 및 시각/기능 검수는 대기.
- CSS v0.2.33 / JS v0.2.23, 기존 두 설치 항목을 업데이트. 다른 테마 및 보조 JS 변경 없음.

## v0.2.32 · Quiet sidebar + editorial instruction blocks (2026-11-24)
- Sidebar: option 3 selected. Original continuous sidebar, typography and role status preserved. The existing embedded paper SVG is now attenuated by an 88% cool-gray veil; no new panels, cards, decorative borders or shadows.
- Instruction/writing blocks (only when their dedicated DOM class/data markers match): transparent surfaces including immediate inner wrappers, 1px top/bottom rule in rgba(65,75,85,.25), no side borders, radius or shadow; padding 14px vertical / 10px horizontal, margin 16px vertical.
- Copy controls remain clickable and borderless with transparent background. No changes to font, body grid, user bubble, composer, RUN/DONE, Clock/Status/Mapper or other themes.
- CSS-only update: Tampermonkey JS remains v0.2.22.
- Validation limit: CSS structure, private/public identical blob and release SHA256 verified. The connected browser does not expose the signed-in DOM here; whether the native writing block uses targeted selectors and actual styling must be confirmed in Chrome. If no style change appears, inspect the block and refine the exact selector.

## What's changed
- Cool graphite e-paper palette: main `#EFF1F2`, sidebar `#E7EAEB`, panels `#F5F6F6`, body ink `#292D30`, accent `#303438`.
- Subtle 22px square notebook grid, preserving the existing embedded paper-grain image.
- '새 채팅' and 'Dot' labels now match project labels: 16px / weight 650.
- Current selected conversation heading: 16px → 24px and soft lime marker `#D8EA8B`, only on the active breadcrumb.
- **Sent** user prompts: 16.067px (12.05pt), weight 572, charcoal ink. Editable composer remains 16px.
- E-book Clock skin follows the cooler neutrals while preserving segmented digits, Life Clock and existing animations.

## Install / update in place
- [Stylus CSS v0.2.47](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/theme.user.css)
- [Tampermonkey JS v0.2.36](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/themes/ebook-ivory-mono/indicators.user.js)

Update the **existing** two extension entries rather than installing duplicates. In Stylus and Tampermonkey, run the built-in **Check for updates**, then reload ChatGPT with `Ctrl + Shift + R`.

Do not enable the older Dracula / Flat Neon visual themes simultaneously. Leave Clock v3.10.2, Status v6.8.2 and Mapper v1.3.6 enabled as before; the update does not edit those scripts.

## Validation and rollback
Use the ChatGPT page console:
```js
window.__jarooEbookIvoryMonoV1?.diagnostics?.()
```
Expected: JS `version: '0.2.36'`, `sentPromptTarget: '16.067px'`; a selected chat should produce `headerMarkers: 1` when its title is visible. CSS version is `0.2.47`. `firstPaintNav` reports the CSS first-paint rule; `opticalLeaves` and `projectWeightLeaves` count inline exceptions. `performance` gives scoped pass execution counts/average/peak times and scheduling stats. `fixedSidebarTop` reports the actual overlay height, visibility and computed pattern. `projectCountBorders` reports computed border/outline styles. `projectCounts` reports the one-character display, exact/partial/unknown state, overflow and confirmed count, `lastPassMs` reports the most recent scoped update durations (ms), not end-to-end page load time. `quickNavMarkers` reports the actual size, weight and color of New Chat/Dot labels. Diagnostics include `projectMarkers`, `sidebarSeams` and `workSwitcher`; live DOM matching still requires visual confirmation.

To roll back, use the extensions' version history or the previous Git commit of the two E-book files. This release is code-published and statically checked, but **the user's signed-in Chrome rendering and updates have not been verified in this chat**.

Existing private scripts, personal profiles, credentials, RUN/DONE controls, click handlers and Chrome browser chrome remain untouched.
