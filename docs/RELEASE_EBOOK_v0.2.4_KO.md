# E-book Classic Paper v0.2.4 변경 요약

- 사용자 선택 1번 클래식 페이퍼: 은은한 종이 섬유/미세 입자와 가벼운 모눈 격자.
- IBM Plex Mono 고정폭 공백으로 인한 넓은 띄어쓰기 문제를 줄이기 위해 @font-face unicode-range에서 U+0020 제외.
- IBM 영문/숫자, Pretendard Variable 한글/공백. 띄어쓰기 간격을 다른 문자 자간과 분리.
- 기존 본문 및 좌측 제목 font-size는 14px 유지. 실제 체감 크기 동일성은 검증 필요.
- E-book CSS만 교체. E-book JS 0.2.3, 기존 Dracula/Flat Neon 및 Clock/Status/Mapper 유지.
- 실제 로그인 Chrome의 글꼴 적용과 최종 시각 검수는 별도.
