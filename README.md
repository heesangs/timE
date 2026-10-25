# 인생 시계 (timE)

나이를 하루 24시간 시계로 바꿔 보여주고, 시곗바늘을 돌려 과거와 미래를 오가며 '지금'을 다른 눈으로 다시 보게 하는 웹 서비스. (인생 100년 = 24시간, 50세 = 낮 12:00)

## 실행

```bash
npm install
npm run dev     # 개발 서버
npm test        # 계산 함수 테스트 (Vitest)
npm run build   # 정적 빌드 (dist/)
```

## 구조

- `src/lib/lifeClock.ts` — 나이 ↔ 분 ↔ 각도 변환, 과거/미래 판정, Delta, 라벨 (순수 함수)
- `src/lib/tone.ts` — 시각에 따른 배경 톤 보간, 밝기 기준 전경색 전환
- `src/lib/storage.ts` — `localStorage` 키 `lifeclock:v1` 읽기/쓰기/초기화
- `src/lib/copy.ts` — 모든 한국어 문구
- `src/reducer.ts` — 6개 화면 상태 전이
- `src/components/` — 화면 컴포넌트 (props만으로 동작)
- `src/hooks/` — 베젤 드래그, 멈춤(dwell) 판정

외부 런타임 의존성은 React/ReactDOM뿐이다. 저장은 브라우저 로컬에만 한다.
