# E-book Editorial Notebook · v0.2.2 상세 변경 내역

**2026-11-24**

이전 0.2.1에서는 화면상 본문 크기·Extra High 강조·첨부 구분선·Dot 배지가 예상대로 적용되지 않았음. 새로운 버전은 넓은 DOM 선택자 및 시각 마커를 사용하여 보완함. 실제 Computed Style을 확인하기 전까지 원인과 정상 작동을 확정하지 않음.

| 부분 | 수정 |
|---|---|
| Assistant 본문 | 11.2px 강제 적용 범위 확대 |
| 사용자 메시지 | 10.8px, 배경 투명, 2.5px 외곽선 |
| 상단 채팅명 | 실제 선택 대화명과 상단 breadcrumb를 비교하여 마커, 16px / 720 |
| Dot 배지 | 숫자 요소가 anchor 형제인 상황까지 탐색 후 마커, 투명 원형 배지 |
| 작성창 | #composer-background 및 폼을 구분하여 가시 외곽 1px 및 shadow 제거 |
| 업로드 분리선 | 첨부 미리보기의 위치와 editor 위치를 비교해 시각 전용 overlay line |
| Extra High | 작성창 하단과 선택 버튼 후보를 함께 확인, 아이콘 포함 Bold/차콜 |

개인정보·ChatGPT 메시지·React 상태·다른 테마의 코드는 수정하지 않았음. 로그인 Chrome 검수 필요.
