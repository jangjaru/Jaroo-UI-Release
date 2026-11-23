# ChatGPT UI · Neo-Brutalist 8.0.2

**2026-11-23 KST**

- 본문·코드·사이드바·메뉴·입력창과 Jaroo 위젯의 텍스트를 Pretendard Variable로 통일했습니다. 기본 굵기는 400, 제목과 의미상 강조는 600입니다. 이모지와 SVG·아이콘은 기존 표시를 유지합니다.
- 좁은 사이드바에서도 긴 프로젝트명과 대화 제목이 줄바꿈됩니다. 더보기 버튼을 위한 공간과 대화 역할 색을 유지합니다. RUN은 옅은 청록색, DONE은 옅은 노란색 제목 배경으로 표시합니다.
- 시계를 일반 숫자 24시간제 표기로 바꿨습니다. 넓은 사이드바에는 초를 함께 표시합니다.

| 변경 파일 | 버전 |
|---|---|
| `chatgpt/theme.user.css` | 8.0.2 |
| `chatgpt/clock.user.js` | 3.8.2 |
| `chatgpt/status.user.js` | 6.7.1 |

Mapper와 Google Calendar의 세 파일은 이전 릴리스와 동일합니다. 파일 해시는 [SHA256.json](../SHA256.json)에서 확인할 수 있습니다.

오프라인 Chromium에서 좁고 넓은 사이드바의 글꼴과 굵기를 검사했고, 180·220·260·290·395·420px에서 제목 줄바꿈과 더보기 버튼, 역할 색, 상태 전환을 확인했습니다. 실제 로그인 화면과 Tampermonkey·Stylus 업데이트는 Chrome에서 확인합니다. [Chrome 업데이트 절차](INSTALLATION_KO.md)

이전 버전의 파일과 해시는 [8.0.1 공개 커밋](https://github.com/jangjaru/Jaroo-UI-Release/tree/329dd9693fb0283fef21198883b8925344b63a6f)에 보관되어 있습니다.
