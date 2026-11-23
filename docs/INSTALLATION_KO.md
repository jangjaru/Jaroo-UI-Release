# Dracula Neon · Typography Light 2 설치 및 업데이트

**2026-11-23 | CSS 8.3.2 · Clock 3.10.2 · Status 6.8.2**

전체적인 글자 굵기를 이전 적용 상태의 약 70% 수준으로 낮췄습니다. 프로젝트 캡슐, 채팅 제목, 대화 본문, 제목/강조, 표, Clock 라벨, RUN/DONE/ALL이 대상입니다. 색상·글꼴 크기·기능과 개인 정보는 유지합니다.

## 설치 방법
1. 현재 Tampermonkey·Stylus 설정을 내보내 백업합니다. Life Clock 개인 프로필은 별도 보존합니다.
2. Tampermonkey에서 **사용자 스크립트 업데이트 확인**을 실행하여 Clock **3.10.2**, Status **6.8.2** 버전을 확인합니다.
3. Stylus에서 **모든 스타일 업데이트 확인**을 실행해 `Jaroo ChatGPT Dracula Neon 8.3.2`를 적용합니다.
4. ChatGPT 새로고침 후 프로젝트명·채팅 제목·대화 본문·사용자 메시지·Life Clock·RUN/DONE 글꼴을 한 화면에서 확인합니다.

| 항목 | 자동 업데이트/재설치 주소 |
|---|---|
| Life Clock JS 3.10.2 | [clock.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/clock.user.js) |
| Status JS 6.8.2 | [status.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/status.user.js) |
| Mapper JS 1.3.6 (변경 없음) | [mapper.user.js](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/mapper.user.js) |
| ChatGPT CSS 8.3.2 | [theme.user.css](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/theme.user.css) |

**업데이트가 없다고 표시되면:** `frozen` 브랜치 설치 또는 수동 수정한 스타일일 수 있습니다. 백업 후 위 `main` 링크에서 기존 항목을 업데이트하거나 중복 없이 설치하세요.

**주의:** 원래 Dracula 다크/네온 색상은 유지됩니다. 실제 글꼴 렌더링은 로컬 Pretendard 파일·Chrome 디스플레이 배율에 따라 다르므로 로그인한 화면에서 시각 검수를 진행합니다. 실제 Chrome 시각 검수는 아직 완료하지 않았습니다.
