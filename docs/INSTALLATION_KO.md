# Jaroo's Company · Dracula Neon CSS v8.3.3

## 이번 변경
현재 ChatGPT 스크린샷에서 사이드바는 가벼워졌지만 대화 본문은 여전히 두껍게 보이는 현상을 확인했습니다. 이번에는 **CSS만** 업데이트했고, 본문 내부의 텍스트 노드와 가변 Pretendard를 대상으로 굵기 규칙을 추가했습니다.

- 일반 본문: `font-weight: 320`
- 제목·강조 글씨: `font-weight: 430`
- Life Clock/Status JS, Mapper, Google Calendar는 변경하지 않았습니다.

## 설치
1. Stylus 설정을 내보내기로 백업합니다.
2. Stylus의 `Jaroo ChatGPT Dracula Neon` 스타일 업데이트 확인을 실행하여 **8.3.3** 적용.
3. 감지되지 않으면 [GitHub 최신 CSS](https://raw.githubusercontent.com/jangjaru/Jaroo-UI-Release/main/chatgpt/theme.user.css) 주소로 기존 스타일을 중복되지 않게 업데이트합니다.
4. ChatGPT에서 `Ctrl+R` 새로고침.
5. **본문 일반 문장과 강조 문장**이 실제로 달라졌는지 확인한 뒤 전체 화면을 공유합니다.

## 검증 및 제한
- 최종 설치/렌더 검수는 아직 완료하지 않았습니다.
- `font-weight` 숫자만으로 체감상 30% 얇아지는 효과를 보장하지는 않습니다.
- Pretendard Variable 로컬 설치나 CDN 폰트 파일 접근에 실패하면 환경에 따라 다르게 보일 수 있습니다.
- 기존 개인 프로필/시계/상태관리는 수정하지 않았습니다.
