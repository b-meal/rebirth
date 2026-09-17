# 이동 경로 추적 작업지시서 B. 문구와 화면

시간을 행동 문구로 바꾸고, 탐색 지점 공식 T5 를 만들고, 경로 지도와 예측 원을 그리는 담당 B 의 유일한 체크리스트입니다. 담당 A 는 `2026-09-17-track-a-core-api-worklist.md`, 담당 C 는 `2026-09-17-track-c-copy-search-ai-worklist.md` 를 봅니다.

## 실행 규칙

- 진행 기록은 이 파일의 `[ ]`를 `[x]`로 바꾸는 것만 허용하고, 회귀하면 해당 `[x]`를 `[ ]`로 되돌립니다.
- 이 파일에 문장·설명·결과 요약·날짜를 덧붙이지 않습니다. 작업 중 새로 생긴 **실행 대상**만 `## 추가 항목` 맨 아래에 `- [ ]` 한 줄로 추가하고, 실행 대상이 아닌 관찰은 `## 참고`의 해당 절에 체크박스 없는 `- ` 한 줄로 추가합니다.
- worklog·task 파일·HANDOFF·보고서·별도 md 를 새로 만들지 않습니다. `.claude/hooks/block-markdown-docs.mjs` 가 `.claude/**` 밖의 `.md` 쓰기를 PreToolUse 에서 차단하므로 시도하지 않습니다. 문서가 필요하면 노션에 씁니다.
- 주석은 한 줄, 명사형 종결, 마침표 없이 씁니다. `.claude/hooks/comment-style.mjs` 가 Write·Edit 에서 검사해 위반을 도구 호출 단계에서 막습니다. 화살표는 `→` 만 씁니다.
- `apps/web` 의 UI 는 SEED 만 씁니다. 색·간격·반경 리터럴을 쓰지 않고 `@seed-design/css/vars` 토큰만 씁니다. `.claude/hooks/enforce-design-system.mjs` 가 하드코딩을 차단합니다.
- 정확 좌표 `reports.exactPoint` 를 읽는 코드를 만들지 않습니다. 거리·경로·예측·탐색 지점은 전부 `reports.coarsePoint` 로만 계산합니다.
- 개체 동일성을 확정하는 문구를 코드·프롬프트·화면 어디에도 쓰지 않습니다. 모든 결과는 확인할 후보이고 AI 결과는 `AI 초안, 수정 가능` 으로 표기합니다.
- 커밋은 `git add <경로>` 로 담당 경로만 담아 `git commit` 으로 합니다. Phase 의 마지막 검증 항목이 `[x]` 가 된 직후 그 Phase 담당 경로만 커밋합니다. merge·PR 생성·`main`·`develop` 직접 변경을 하지 않습니다.
- 셋이 같은 checkout 이면 push 하지 않습니다. 각자 checkout 이면 Phase 커밋 직후 `feat/track-prediction` 에 push 하고 다음 Phase 전에 `git pull` 합니다.
- 삭제는 `trash`, 이동은 `git mv` 를 씁니다. `apps/web/seed-design/**` 은 SEED CLI 산출물이라 읽기 전용입니다.
- 한 항목이 10분 넘게 막히면 그 항목을 `[ ]`로 두고 `## 추가 항목`에 사유를 한 줄로 추가한 뒤 다음 항목으로 넘어갑니다.
- 각 Phase 의 마지막 검증 항목이 실패하면 다음 Phase 를 시작하지 않습니다.
- 이 파일에 없는 파일은 건드리지 않습니다. 담당 A·C 의 파일이 필요하면 `## 추가 항목` 에 적고 넘어갑니다.
- 경로는 저장소 루트 `/Users/hahmjuntae/Desktop/workspace/b-meal/rebirth` 기준입니다. 행 번호가 다르면 내용으로 찾아 진행하고 실제 위치를 보고합니다.

## 다른 담당과의 순서

- Phase 2 는 A 의 Phase 0 마지막 항목이 `[x]` 가 된 뒤 시작합니다. 브랜치 `feat/track-prediction` 이 그때 생깁니다.
- Phase 2 와 Phase 4 는 A·C 와 동시에 진행합니다. 겹치는 파일이 없습니다.
- Phase 8 은 A 의 Phase 6 (경로 API) 과 C 의 Phase 3 (`lost-detail.tsx` 문구) 마지막 항목이 둘 다 `[x]` 가 된 뒤 시작합니다.
- Phase 8 이 끝나면 A 에게 알립니다. A 의 Phase 9 가 `track-section.tsx` 에 해석 문장을 덧붙입니다.

| 순서 | A | B (이 파일) | C |
|---|---|---|---|
| 1 | Phase 0 | 대기 | 대기 |
| 2 | Phase 1 | Phase 2 | Phase 3 |
| 3 | Phase 1 계속 | Phase 4 | Phase 5 |
| 4 | Phase 6 | 대기 | Phase 7 |
| 5 | 대기 | Phase 8 | 끝 |
| 6 | Phase 9 | 끝 | |

## 설계 상수

| 항목 | 값 |
|---|---|
| 작업 브랜치 | `feat/track-prediction`, `develop` 에서 분기 |
| 새 마이그레이션 | 없음. `reports` `match_scores` `report_photos` `pets` 를 읽기만 함 |
| 좌표 출처 | `reports.coarsePoint` 만. `exactPoint` 를 읽는 코드 0줄 |
| core 서브패스 export | `"./matching/*": "./src/matching/*.ts"` |
| `V_MAX_KMH` | `{ small: 3.0, medium: 4.5, large: 6.0, unknown: 4.5 }` |
| `SIGMA_KM` | `{ small: 0.28, medium: 0.38, large: 0.5, unknown: 0.38 }` |
| `R_MIN_KM` / `R_MAX_KM` | `0.4` / `8` |
| `GPS_EPSILON_KM` | `0.3` |
| `MIN_LEG_SCORE` | `45` |
| `MIN_TRACK_NODES` / `MAX_TRACK_NODES` | `2` / `12` |
| `SPOT_KEYWORDS` | `{ 공원: 1.0, 하천: 1.0, 산책로: 0.9, 학교: 0.7, 아파트: 0.7 }` |
| `SPOT_LIMIT` | `4` |
| `TRACK_MODEL` | `claude-sonnet-5` |
| `TRACK_PROMPT_VERSION` | `track-1` |
| `TRACK_TIMEOUT_MS` | `20_000` |
| `TRACK_PHOTO_MAX` | `4`, 최근 노드부터 첫 사진 한 장씩 |
| `track` 응답 모양 | `{ nodes: TrackNode[], legs: TrackLeg[], confidence: number }` 또는 `null` |
| `prediction` 응답 모양 | `{ center: LatLng, radiusKm, straightness, hoursSinceLast, bearingDeg }` 또는 `null` |
| `density` 응답 모양 | `{ count, radiusKm, newestHoursAgo }` 또는 `null` |
| 경로 API | `GET /api/lost/:id/track` → Phase 6 `{ track, prediction, density, gridMeters }`, Phase 9 에서 `spots` `interpretation` 추가 |
| 긴급도 등급 | `fresh` `<6h` · `recent` `<24h` · `stale` `<72h` · `cold` `>=72h` |
| 밀도 문구 | `0건` → `반경 {r}km 안에 새 제보가 없어요`, 그 밖 → `반경 {r}km 안에 제보 {n}건` |
| 상태 어휘 | `실종` `발견` `보호 중` `구조 요청` `찾음` |
| CTA 문구 | `구조 요청` → `구조·보호 요청`, `내 가족 같아요` → `우리 아이인지 확인` |
| 검색 모드 | 쿼리 `kind=sighting` 발견 제보 찾기 · `kind=lost` 실종 신고 찾기, 기본 `sighting` |
| 기준선 | `@rebirth/core` `pass 87` · `@rebirth/web` `pass 3` · `lint` 2 tasks · `typecheck` 5 tasks |
| 범위 밖 | 실종 신고 없는 개체의 체인, 탐색 지점 가중치 튜닝 화면, 체인 결과 캐시 테이블, sighting↔sighting 배점, 홈 검색 아이콘 |

## Phase 2. 시간을 행동으로

- [x] `apps/web/lib/report-label.ts` 의 `CARE_LABEL` 을 주어 없는 상태 어휘로 바꿉니다
  - [x] `roaming: "배회 중"` 을 `roaming: "발견"` 으로, `in_care: "제보자가 보호 중"` 을 `in_care: "보호 중"` 으로 바꿉니다
  - [x] `unknown: "확인되지 않음"` 은 그대로 둡니다
  - [x] `grep -n "배회 중" apps/web/lib/report-label.ts` 가 아무 줄도 내지 않는 것을 확인합니다
- [x] `apps/web/lib/report-label.ts` 에 긴급도 등급 `urgencyLevel` 을 추가합니다
  - [x] `sinceLabel` 뒤에 `export type UrgencyLevel = "fresh" | "recent" | "stale" | "cold"` 를 둡니다
  - [x] `urgencyLevel(date, now)` 가 경과 시간으로 `6` `24` `72` 시간을 경계 삼아 네 등급을 반환하게 씁니다
  - [x] `fresh` 로 눌러 미래 시각이 들어와도 시계 오차가 등급을 뒤집지 않게 합니다
- [x] `apps/web/lib/report-label.ts` 에 등급별 행동 문구 `urgencyHint` 를 추가합니다
  - [x] `URGENCY_HINT` 를 `Record<UrgencyLevel, string>` 으로 두고 `fresh` 는 `지금 주변을 확인해 보세요` 로 씁니다
  - [x] `recent` 는 `주변 추가 제보를 확인해 보세요`, `stale` 은 `마지막 목격지 주변 이동 경로를 확인해 보세요` 로 씁니다
  - [x] `cold` 는 `이동 가능 지역을 넓혀 찾아보세요` 로 두고 등급 문구에 숫자를 넣지 않습니다
  - [x] `urgencyHint(date, now)` 가 `URGENCY_HINT[urgencyLevel(date, now)]` 를 반환하게 합니다
- [x] `apps/web/lib/report-label.ts` 에 제보 밀도 문구 `densityLine` 을 추가합니다
  - [x] `densityLine({ count, radiusKm })` 가 `count` 가 `0` 이면 `반경 {r}km 안에 새 제보가 없어요` 를 반환하게 씁니다
  - [x] `count` 가 `1` 이상이면 `반경 {r}km 안에 제보 {n}건` 을 반환하고 `r` 은 소수 첫째 자리까지만 적습니다
- [x] `apps/web/lib/report-label.test.ts` 에 등급 경계와 밀도 문구 검증을 넣습니다
  - [x] `urgencyLevel` 이 `5h59m` 과 `6h01m` 에서 `fresh` 와 `recent` 로 갈리는 검증 2건을 씁니다
  - [x] `urgencyLevel` 의 `23h59m` `24h01m` `71h` `73h` 네 지점 등급 검증 4건을 씁니다
  - [x] `urgencyHint` 반환에 숫자가 없는 검증 1건과 미래 시각이 `fresh` 인 검증 1건을 씁니다
  - [x] `densityLine` 이 `0` 과 `3` 에서 설계 상수 문구를 내는 검증 2건을 씁니다
  - [x] `pnpm --filter @rebirth/web test 2>&1 | tail -10` 을 돌려 `fail 0` 을 봅니다
- [x] `apps/web` 검증을 통과시키고 Phase 2 담당 경로만 커밋합니다
  - [x] `pnpm lint 2>&1 | tail -5` 와 `pnpm typecheck 2>&1 | tail -5` 를 돌려 `2 successful` 과 `5 successful` 을 봅니다
  - [x] `git add apps/web/lib/report-label.ts apps/web/lib/report-label.test.ts` 로 담습니다
  - [x] `git commit -m "feat: 목격 시각을 긴급도 등급·행동 문구·제보 밀도로 바꿈"` 으로 커밋하고 `exit 0` 을 확인합니다

## Phase 4. `search-spots.ts` 탐색 지점 T5

- [x] `packages/core/src/matching/search-spots.ts` 에 설계 상수와 순수 배점 `rankSpots` 를 넣습니다
  - [x] `packages/core/src/matching/search-spots.ts` 를 만들고 `import "server-only"` 없이 시작해 `rankSpots` 가 테스트에서 돌게 합니다
  - [x] `SPOT_KEYWORDS` 와 `SPOT_LIMIT` 을 설계 상수 표 값 그대로 `export const` 로 둡니다
  - [x] `export type Spot = { name: string; point: LatLng; keyword: keyof typeof SPOT_KEYWORDS; priority: number }` 를 둡니다
  - [x] `rankSpots({ candidates, center, radiusKm })` 가 후보마다 `w / (1 + Math.abs(distanceKm(center, point) - radiusKm) / radiusKm)` 를 매기게 씁니다
  - [x] `rankSpots` 가 이름이 같은 후보를 하나로 합치고 `priority` 내림차순 상위 `SPOT_LIMIT` 개만 반환하게 합니다
- [x] `packages/core/src/matching/search-spots.ts` 에 Kakao 호출 래퍼 `searchSpots` 를 넣습니다
  - [x] `searchKeyword` 를 `../location/kakao-local.ts` 에서 불러 `SPOT_KEYWORDS` 의 키마다 `{ center, radiusMeters: radiusKm * 1000, size: 5 }` 로 부릅니다
  - [x] `Promise.allSettled` 로 다섯 호출을 묶고 실패한 키는 건너뛰어 한 호출 실패가 전체를 비우지 않게 합니다
  - [x] `KakaoLocalError` 를 포함한 모든 예외에서 `[]` 를 돌려 경로 화면이 탐색 지점 없이도 그려지게 합니다
  - [x] `// ponytail: 요청마다 Kakao 5회 호출, 느려지면 격자 키로 캐시` 한 줄을 래퍼 위에 둡니다
- [x] `packages/core/src/matching/search-spots.test.ts` 에 배점 회귀 검증을 넣습니다
  - [x] `rankSpots` 가 예측 반경 위에 있는 공원을 중심에 붙은 학교보다 앞에 두는 검증 1건을 씁니다
  - [x] `rankSpots` 가 이름이 같은 후보 둘을 하나로 합치는 검증 1건을 씁니다
  - [x] `rankSpots` 가 후보 10개를 넣어도 `SPOT_LIMIT` 개만 돌려주는 검증 1건을 씁니다
  - [x] `pnpm --filter @rebirth/core test 2>&1 | tail -10` 을 돌려 `fail 0` 을 봅니다
- [x] `packages/core` 검증을 통과시키고 Phase 4 담당 경로만 커밋합니다
  - [x] `pnpm typecheck 2>&1 | tail -5` 를 돌려 `5 successful, 5 total` 을 봅니다
  - [x] `git add packages/core/src/matching/search-spots.ts packages/core/src/matching/search-spots.test.ts` 로 담습니다
  - [x] `git commit -m "feat: 예측 원 안 공원·하천·산책로를 탐색 우선순위로 매기는 공식 추가"` 로 커밋하고 `exit 0` 을 확인합니다

## Phase 8. 경로 지도와 예측 원

- [x] `apps/web/components/lost/track-map.tsx` 에 경로선과 예측 원을 그리는 컴포넌트를 만듭니다
  - [x] `useMap` 을 `interactive: false` 로 불러 `report-location-map.tsx` 와 같은 `160px` 높이 상수를 씁니다
  - [x] `map.addSource` 로 `LineString` 을 넣고 `addLayer` 로 경로선을 그리되 색은 `var(--seed-color-bg-brand-solid)` 만 씁니다
  - [x] `Polygon` 64각형으로 예측 원을 만들어 `fill-opacity` 낮은 레이어로 깔고 색은 `var(--seed-color-bg-brand-weak)` 만 씁니다
  - [x] `Marker` 를 노드마다 찍고 순서 번호를 넣어 어느 것이 최근인지 보이게 합니다
  - [x] `Text` 로 지도 아래에 격자 좌표와 추정이라는 것을 알리는 한 줄을 둡니다
- [x] `apps/web/components/lost/track-section.tsx` 에 경로 요약 카드를 만듭니다
  - [x] `/api/lost/${id}/track` 을 불러 `loading` `empty` `ready` 세 상태만 그립니다
  - [x] `ready` 에서 `lastSeenLine` `densityLine` `urgencyHint` 를 `@/lib/report-label` 에서 불러 세 줄로 쌓고 개체 동일성 확정이 아님을 함께 적습니다
  - [x] `empty` 에서는 `아직 이을 만한 목격이 없어요` 를 그리고 지도를 그리지 않습니다
  - [x] `bearingDeg` 를 `북` `북동` `동` `남동` `남` `남서` `서` `북서` 여덟 낱말로 옮기는 표를 두고 숫자를 화면에 내보내지 않습니다
- [x] `apps/web/components/lost/lost-detail.tsx` 에 경로 카드를 답니다
  - [x] `마지막으로 본 곳` `SectionCard` 바로 아래에 `TrackSection` 을 넣습니다
  - [x] `location` 이 `null` 이거나 `lifecycle` 이 `searching` 이 아니면 렌더하지 않습니다
  - [x] `ownership.mine` 여부와 무관하게 보이게 해 이웃도 경로를 보고 찾을 곳을 알 수 있게 합니다
- [x] `apps/web` 검증을 통과시키고 Phase 8 담당 경로만 커밋한 뒤 A 에게 알립니다
  - [x] `pnpm build 2>&1 | tail -10` 을 돌려 실패 없이 끝나는 것을 봅니다
  - [x] `pnpm lint 2>&1 | tail -5` 와 `pnpm typecheck 2>&1 | tail -5` 를 돌려 `2 successful` 과 `5 successful` 을 봅니다
  - [x] `git add apps/web/components/lost/track-map.tsx apps/web/components/lost/track-section.tsx apps/web/components/lost/lost-detail.tsx` 로 담습니다
  - [x] `git commit -m "feat: 실종 신고 상세에 이동 경로·예측 원·제보 밀도 지도 추가"` 로 커밋하고 `exit 0` 을 확인합니다

## 추가 항목

## 참고

### 지시서 결함

- Phase 8 은 이웃도 경로를 보게 하라 하나 Phase 6 의 `getLostTrackHandler` 가 `checkManageAccess` 로 작성자만 허용함. 경로가 `match_scores` 로 만들어지고 후보 목록은 POL-03 이 작성자 전용으로 못박아 작성자 전용을 유지함

- Phase 8 은 `lastSeenLine` 을 `@/lib/report-label` 에서 부르라 하나 Phase 2 가 그 함수를 만들지 않음. `sinceLabel` 과 `areaName` 을 직접 엮어 갈음함

- Phase 4 는 `searchSpots` 의 인자 모양을 정하지 않아 `rankSpots` 와 맞춰 `{ center, radiusKm }` 객체 인자로 둠

- Phase 2 테스트 항목은 등급 2+4건·힌트 2건·밀도 2건 총 10 assertion 을 요구하나 `test()` 블록 5개에 묶여 실행 단위는 5건

### 실측 기록

- `TrackSection` 은 `ownership.mine` 을 보지 않고 API 응답에만 반응함. 403 이면 `hidden` 상태로 카드를 감춰 비작성자에게 거짓 문구를 보이지 않음
- MapLibre 가 CSS 변수를 못 읽어 `getComputedStyle` 로 `--seed-color-bg-brand-solid` 와 `-weak` 를 읽어 넘김
- 예측 반경이 `0.4`~`8`km 로 변해 고정 zoom 이면 원이 잘림. `map.fitBounds` 에 `FIT_PADDING=24` `FIT_MAX_ZOOM=15` 사용
- `BEARING_WORD` 배열을 `track-section.tsx` 에 둠. Phase 9 가 같은 파일에 덧붙일 자리 있음

- `kakao-local.ts` 가 `import "server-only"` 로 시작해 Node 테스트에서 모듈 로드 즉시 throw. 정적 import 불가
- `searchSpots` 안에서 `await import("../location/kakao-local.ts")` 로 호출 시점 동적 import, 타입만 정적 import
- `@rebirth/core` 테스트가 `pass 91` 에서 `pass 94` 로 3건 증가. 설계 상수 표의 `pass 87` 은 Phase 4 이후 `pass 94` 로 읽어야 함

- `@rebirth/web` 테스트가 기존 3건 + 신규 5건으로 `pass 8`. 설계 상수 표의 기준선 `pass 3` 은 Phase 2 이후 `pass 8` 로 읽어야 함
- `densityLine` 반경은 정수도 `toFixed(1)` 로 통일해 `반경 2.0km` 로 출력. 테스트가 그 값으로 고정됨
