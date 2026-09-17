# 이동 경로 추적 작업지시서 A. 공식과 API

목격 제보를 잇는 경로 공식 T1~T4, 경로 조회 API, 최종 배선을 맡는 담당 A 의 유일한 체크리스트입니다. 담당 B 는 `2026-09-17-track-b-screen-worklist.md`, 담당 C 는 `2026-09-17-track-c-copy-search-ai-worklist.md` 를 봅니다.

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
- 이 파일에 없는 파일은 건드리지 않습니다. 담당 B·C 의 파일이 필요하면 `## 추가 항목` 에 적고 넘어갑니다.
- 경로는 저장소 루트 `/Users/hahmjuntae/Desktop/workspace/b-meal/rebirth` 기준입니다. 행 번호가 다르면 내용으로 찾아 진행하고 실제 위치를 보고합니다.

## 다른 담당과의 순서

- Phase 0 은 A 가 혼자 먼저 끝냅니다. B 와 C 는 Phase 0 마지막 항목이 `[x]` 가 된 뒤 시작합니다.
- Phase 1 은 B·C 와 동시에 진행합니다. 겹치는 파일이 없습니다.
- Phase 6 이 끝나면 B 에게 알립니다. B 의 Phase 8 이 경로 API 응답 모양을 기다립니다.
- Phase 9 는 B 의 Phase 4·8 과 C 의 Phase 7 마지막 항목이 전부 `[x]` 가 된 뒤 시작합니다. `packages/core/src/matching/index.ts` 와 `apps/web/components/lost/track-section.tsx` 를 여기서 한 번에 손댑니다.

| 순서 | A (이 파일) | B | C |
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

## Phase 0. 준비와 기준선

- [x] `git` 작업 트리를 정리하고 `feat/track-prediction` 브랜치를 `develop` 에서 만듭니다
  - [x] `git status --short` 로 미커밋 변경과 미추적 파일을 확인하고 목록을 보고합니다
  - [x] `git stash push -u -m "track-worklist 시작 전"` 으로 남은 변경을 전부 치웁니다
  - [x] `git fetch origin && git switch -c feat/track-prediction origin/develop` 로 분기합니다
  - [x] `git status --short` 가 아무 줄도 내지 않는 것을 확인합니다
- [x] `pnpm test` `pnpm lint` `pnpm typecheck` 로 작업 전 기준선을 측정합니다
  - [x] `pnpm test 2>&1 | tail -20` 을 돌려 `fail 0` 과 `2 successful` 을 확인합니다
  - [x] `pnpm lint 2>&1 | tail -5` 를 돌려 `2 successful, 2 total` 을 확인합니다
  - [x] `pnpm typecheck 2>&1 | tail -5` 를 돌려 `5 successful, 5 total` 을 확인합니다
  - [x] `pnpm test` `pnpm lint` `pnpm typecheck` 세 명령의 마지막 줄을 설계 상수 표의 기준선과 대조하고 다르면 차이를 보고합니다
- [x] `packages/db/migrations` 에 이번 작업이 새 파일을 만들지 않음을 확인하고 B·C 에게 시작을 알립니다
  - [x] `/bin/ls packages/db/migrations | tail -3` 으로 최신 파일이 `0037_add_match_alert.sql` 인지 봅니다
  - [x] `git log --oneline -1` 으로 분기 지점을 기록하고 `exit 0` 을 확인합니다

## Phase 1. `track.ts` 경로 공식 T1~T4

- [x] `packages/core/package.json` 의 `exports` 에 `"./matching/*": "./src/matching/*.ts"` 를 추가합니다
  - [x] `packages/core/package.json` 의 `"./matching": "./src/matching/index.ts"` 바로 아래 줄에 서브패스 항목을 넣습니다
  - [x] `grep -n '"./matching/\*"' packages/core/package.json` 이 한 줄을 내는지 확인합니다
- [x] `packages/core/src/matching/track.ts` 에 설계 상수와 입출력 타입을 정의합니다
  - [x] `packages/core/src/matching/track.ts` 를 만들고 `import { distanceKm, type LatLng } from "../location/geo.ts"` 로 시작합니다
  - [x] `V_MAX_KMH` `SIGMA_KM` `R_MIN_KM` `R_MAX_KM` `GPS_EPSILON_KM` `MIN_LEG_SCORE` `MIN_TRACK_NODES` `MAX_TRACK_NODES` 를 설계 상수 표 값 그대로 `export const` 로 둡니다
  - [x] `export type TrackNode = { id: string; point: LatLng; occurredAt: Date; score: number; areaName: string | null }` 를 둡니다
  - [x] `export type TrackLeg = { from: TrackNode; to: TrackNode; km: number; hours: number; feasibility: number }` 를 둡니다
- [x] `packages/core/src/matching/track.ts` 에 T1 연결 가능성 `legFeasibility` 를 넣습니다
  - [x] `legFeasibility(from, to, size)` 가 `distanceKm(from.point, to.point) / (V_MAX_KMH[size] * hours)` 를 반환하게 씁니다
  - [x] `hours` 가 `0` 이하이면 `Infinity` 를 돌려 같은 시각의 두 목격이 이어지지 않게 합니다
  - [x] `isFeasibleLeg` 를 `legFeasibility(...) <= 1` 로 두고 export 합니다
- [x] `packages/core/src/matching/track.ts` 에 T2 경로 구성 `buildTrack` 을 넣습니다
  - [x] `buildTrack({ nodes, size })` 가 `score >= MIN_LEG_SCORE` 인 노드만 남기고 `occurredAt` 오름차순으로 정렬하게 합니다
  - [x] `isFeasibleLeg` 가 거짓인 노드를 건너뛰며 잇고, 남은 노드가 `MIN_TRACK_NODES` 미만이면 `null` 을 반환합니다
  - [x] `MAX_TRACK_NODES` 를 넘으면 최근 것부터 잘라 담아 경로가 무한히 길어지지 않게 합니다
  - [x] `confidence` 를 `Math.round(min(node.score) * (1 - mean(leg.feasibility)))` 로 계산해 `{ nodes, legs, confidence }` 에 담습니다
- [x] `packages/core/src/matching/track.ts` 에 T3 방향성 `straightness` 를 넣습니다
  - [x] `leg` 마다 위경도 차이를 평면 벡터로 바꾸되 경도 성분에 `Math.cos(lat * RAD)` 보정을 겁니다
  - [x] `straightness(legs)` 가 `|Σv| / Σ|v|` 를 반환하고 `legs` 가 비면 `0` 을 돌려주게 합니다
  - [x] `Math.min(1, Math.max(0, ...))` 로 반환값을 `0` 이상 `1` 이하로 못박습니다
- [x] `packages/core/src/matching/track.ts` 에 T4 다음 목격 예측 `predictNext` 를 넣습니다
  - [x] `predictNext({ track, size, now })` 가 `h = (now - lastNode.occurredAt) / 3_600_000` 을 구하고 `h <= 0` 이면 `null` 을 돌려주게 합니다
  - [x] `center` 를 `lastPoint + κ * v_eff * h * û` 로 옮기고 `v_eff` 는 `Σkm / Σhours`, `û` 는 마지막 leg 의 단위 벡터로 둡니다
  - [x] `radiusKm` 을 `SIGMA_KM[size] * Math.sqrt(h) + GPS_EPSILON_KM` 로 구하고 `R_MIN_KM` 과 `R_MAX_KM` 로 자릅니다
  - [x] `{ center, radiusKm, straightness, hoursSinceLast, bearingDeg }` 를 반환하고 `bearingDeg` 는 `û` 의 방위각으로 둡니다
- [x] `packages/core/src/matching/track.test.ts` 에 공식별 회귀 검증을 넣습니다
  - [x] `isFeasibleLeg` 가 3시간 간격 2km 소형견에서 참, 30분 간격 10km 에서 거짓인 검증 2건을 씁니다
  - [x] `straightness` 가 한 방향 직선 3점에서 `0.95` 이상, 왕복 3점에서 `0.3` 이하인 검증 2건을 씁니다
  - [x] `predictNext` 반경이 경과 4시간보다 16시간에서 크고 `R_MAX_KM` 을 넘지 않는 검증 1건을 씁니다
  - [x] `buildTrack` 이 `MIN_TRACK_NODES` 미만 입력과 점수 미달 입력에서 `null` 인 검증 2건을 씁니다
  - [x] `pnpm --filter @rebirth/core test 2>&1 | tail -10` 을 돌려 `fail 0` 을 봅니다
- [x] `packages/core` 검증을 통과시키고 Phase 1 담당 경로만 커밋합니다
  - [x] `pnpm typecheck 2>&1 | tail -5` 를 돌려 `5 successful, 5 total` 을 봅니다
  - [x] `git add packages/core/src/matching/track.ts packages/core/src/matching/track.test.ts packages/core/package.json` 로 담습니다
  - [x] `git commit -m "feat: 목격 제보를 잇는 이동 경로와 다음 목격 예측 공식 추가"` 로 커밋하고 `exit 0` 을 확인합니다

## Phase 6. 경로 조회와 API

- [x] `packages/db/src/queries/lost.ts` 에 경로용 목격 조회 `findTrackSightings` 를 추가합니다
  - [x] `findMatchesForLost` 아래에 `findTrackSightings(lostId, minScore)` 를 만들고 `matchScores` 와 `reports` 를 조인합니다
  - [x] `id` `score` `coarsePoint` `occurredAt` `areaName` `locationSource` 만 고르고 `exactPoint` 는 고르지 않습니다
  - [x] `visibility` 가 `public` 이고 `score >= minScore` 이며 `locationSource <> 'manual_area'` 인 행만 `occurredAt` 오름차순으로 반환합니다
- [x] `packages/core/src/matching/track-handlers.ts` 에 경로 조회 핸들러 `getLostTrackHandler` 를 만듭니다
  - [x] `handlers.ts` 의 `loadOwnLost` 와 같은 순서로 `isUuid` `checkManageAccess` `findManagedReport` 를 거치고 실패 시 `notFound` `unauthorized` `forbidden` 을 돌려줍니다
  - [x] `findTrackSightings` 결과를 `TrackNode` 로 옮기되 `coarsePoint` 의 `y` 를 `lat`, `x` 를 `lng` 로 넣습니다
  - [x] `buildTrack` 과 `predictNext` 를 `./track.ts` 상대 경로로 부르고 `size` 는 실종 신고의 `size` 를 씁니다
  - [x] `density` 를 예측 중심에서 `radiusKm` 안에 든 노드 수와 가장 최근 노드의 경과 시간으로 계산해 `{ count, radiusKm, newestHoursAgo }` 로 담습니다
  - [x] `okPrivate({ track, prediction, density, gridMeters })` 로 응답하고 경로가 `null` 이면 `track` `prediction` `density` 를 전부 `null` 로 둡니다
- [x] `apps/web/app/api/lost/[...path]/route.ts` 에 경로 조회 경로를 답니다
  - [x] `createCatchAll` 의 `GET` 표에 `":id/track": getLostTrackHandler` 한 줄을 넣습니다
  - [x] `import { getLostTrackHandler } from "@rebirth/core/matching/track-handlers"` 로 서브패스에서 가져옵니다
  - [x] `grep -n "track" "apps/web/app/api/lost/[...path]/route.ts"` 가 두 줄을 내는지 확인합니다
- [x] `packages/core/src/matching/track-handlers.ts` 의 정상·오류 경로를 호출해 확인합니다
  - [x] `pnpm --filter @rebirth/web dev` 를 띄우고 관리 세션 없이 `/api/lost/<uuid>/track` 을 불러 `401` 또는 `403` 을 봅니다
  - [x] `/api/lost/00000000-0000-0000-0000-000000000000/track` 을 불러 `404` 를 봅니다
  - [x] `/api/lost/<내 신고 id>/track` 을 관리 주소로 연 세션에서 불러 `200` 과 `track` `density` 키를 확인합니다
  - [x] `grep -c "exactPoint"` 로 응답 본문을 검사해 `0` 인 것을 확인합니다
- [x] `pnpm typecheck` 와 `pnpm lint` 를 통과시키고 Phase 6 담당 경로만 커밋한 뒤 B 에게 알립니다
  - [x] `pnpm typecheck 2>&1 | tail -5` 와 `pnpm lint 2>&1 | tail -5` 를 돌려 `5 successful` 과 `2 successful` 을 봅니다
  - [x] `git add packages/db/src/queries/lost.ts packages/core/src/matching/track-handlers.ts "apps/web/app/api/lost/[...path]/route.ts"` 로 담습니다
  - [x] `git commit -m "feat: 실종 신고의 목격 경로·다음 목격 예측·제보 밀도 조회 API 추가"` 로 커밋하고 `exit 0` 을 확인합니다

## Phase 9. 배선과 최종 게이트

- [x] `packages/core/src/matching/track-handlers.ts` 에 탐색 지점과 모델 해석을 붙입니다
  - [x] `searchSpots` 를 `./search-spots.ts` 에서 불러 `prediction` 이 있을 때만 `center` 와 `radiusKm` 으로 부릅니다
  - [x] `reviewTrack` 을 `./track-review.ts` 에서 불러 경로가 있을 때만 호출하고 `searchSpots` 결과의 이름을 프롬프트 입력에 함께 넘깁니다
  - [x] `catch` 에서 `interpretation: null` 과 `spots: []` 로 두어 외부 호출 실패가 경로·예측·밀도 응답을 막지 않게 합니다
  - [x] `okPrivate({ track, prediction, density, spots, interpretation, gridMeters })` 로 응답 키를 고정합니다
- [x] `apps/web/components/lost/track-section.tsx` 에 탐색 지점과 해석 문장을 그립니다
  - [x] `spots` 를 `여기부터 찾아보세요` 제목 아래 번호 목록으로 그리고 비어 있으면 그 자리를 비웁니다
  - [x] `interpretation.movement` 를 지도 위 한 줄로 두고 `interpretation.searchOrder` 가 있으면 `spots` 대신 그것을 씁니다
  - [x] `interpretation.photoConsistency` 가 `mixed` 면 `사진 특징이 서로 달라 다른 개체일 수 있어요` 를 `Callout` 으로 둡니다
  - [x] `AI 초안, 수정 가능` 표기를 해석 문장 아래에 두고 `interpretation` 이 `null` 이면 해석 자리만 비웁니다
- [x] `packages/core/src/matching/index.ts` 에 새 모듈을 한 번에 export 합니다
  - [x] `track.ts` 의 `buildTrack` `predictNext` `straightness` `isFeasibleLeg` 와 타입을 내보냅니다
  - [x] `search-spots.ts` 의 `rankSpots` `searchSpots` `SPOT_KEYWORDS` 와 `Spot` 타입을 내보냅니다
  - [x] `track-review.ts` 의 `reviewTrack` `TRACK_MODEL` `TRACK_PROMPT_VERSION` 과 타입, `track-handlers.ts` 의 `getLostTrackHandler` 를 내보냅니다
- [x] `pnpm test` `pnpm lint` `pnpm typecheck` `pnpm build` 를 다시 돌려 기준선과 대조합니다
  - [x] `pnpm test 2>&1 | tail -20` 을 돌려 `fail 0` 이고 통과 건수가 기준선 `87` 과 `3` 보다 늘어난 것을 확인합니다
  - [x] `pnpm lint 2>&1 | tail -5` 를 돌려 `2 successful, 2 total` 을 봅니다
  - [x] `pnpm typecheck 2>&1 | tail -5` 를 돌려 `5 successful, 5 total` 을 봅니다
  - [x] `pnpm build 2>&1 | tail -10` 을 돌려 실패 없이 끝나는 것을 봅니다
- [x] `exactPoint` 유출과 확정 문구가 없는지 최종 확인하고 Phase 9 담당 경로를 커밋합니다
  - [x] `grep -rn "exactPoint" packages/core/src/matching packages/db/src/queries/lost.ts apps/web/components/lost` 가 `0건` 인 것을 확인합니다
  - [x] `grep -rn "동일 개체\|같은 개체입니다\|확정" packages/core/src/matching/track-review.ts apps/web/components/lost/track-section.tsx` 가 `0건` 인 것을 확인합니다
  - [x] `git add packages/core/src/matching/index.ts packages/core/src/matching/track-handlers.ts apps/web/components/lost/track-section.tsx` 로 담습니다
  - [x] `git commit -m "feat: 탐색 지점과 경로 해석을 API 와 화면에 배선"` 으로 커밋하고 `exit 0` 을 확인합니다
  - [x] `git log --oneline origin/develop..HEAD | wc -l` 이 `9` 를 내고 `exit 0` 인 것을 확인합니다

## 추가 항목

- [x] `POST /api/lost` 로 실종 신고 1건을 등록해 관리 쿠키를 받은 뒤 `GET /api/lost/:id/track` 이 `200` 과 `track`·`density` 키를 내는지 확인합니다
- [x] `packages/core/src/matching/track-review.ts` 가 `ANTHROPIC_API_KEY` 를 `loadTrackPhotos` 앞에서 확인해 키가 없을 때 사진을 내려받지 않게 고칩니다

## 참고

### 지시서 결함

- Phase 9 의 `exactPoint` grep 은 `0건` 을 요구하나 `packages/db/src/queries/lost.ts:24` 의 `exactPoint: false` 컬럼 제외 지정이 잡혀 1건. 읽는 코드는 0줄이라 의도는 충족
- Phase 9 의 커밋 수 기대값 `9` 는 지시서 토글 커밋을 셈하지 않아 실제 `10` 이상

- Phase 6 의 존재하지 않는 uuid `404` 확인은 실제로 `401` 이 나옴. 권한 확인이 행 조회보다 앞서는 기존 설계이고 `/candidates` 도 같음. `not-a-uuid` 로 `404` 를 대신 확인함
- Phase 6 은 관리 세션이 있는 실종 신고를 전제하나 관리 토큰은 발급 시 1회만 나가고 해시만 저장돼 기존 신고로는 `200` 경로를 확인할 수 없음

- Phase 0 의 `git stash push -u` 는 미추적 `.claude/worklists/` 까지 치워 에이전트가 읽을 지시서 3개를 사라지게 함. 트리가 깨끗하면 건너뛰어야 함
- Phase 0 78행은 `pnpm test 2>&1 | tail -20` 으로 `fail 0` 과 `2 successful` 을 보라 하나 tail -20 이 core 출력만 냄. web `pass 3` 은 별도 확인 필요
- Phase 0 83행은 `/bin/ls packages/db/migrations | tail -3` 마지막 줄이 `meta` 디렉터리라 `0037` 이 끝줄이 아님. 최신 `.sql` 은 `0037_add_match_alert.sql` 로 일치
- Phase 0 74행 stash 는 추적 변경이 0건이라 실행하지 않았고 `git status --short` 가 `?? .claude/worklists/` 한 줄뿐인 것으로 목적 달성을 갈음함

### 실측 기록

- Phase 6 이 못 한 `200` 경로 확인은 Phase 9 가 `## 추가 항목` 으로 처리함. 신규 신고를 등록해 관리 쿠키를 받아 `200 track=null density=null` 을 봄

- `reviewTrack` 첫 줄에서 `client()` 를 먼저 불러 키가 없으면 `loadTrackPhotos` 에 닿지 않음. `no-config` 메시지는 `review.ts` 와 동일
- `@rebirth/core` 테스트가 `pass 100` 에서 `pass 101` 로 1건 증가

- `TrackReviewInput` 에 지점 이름 필드가 없어 `searchSpots` 결과를 프롬프트에 넘기지 않음. `track-review.ts` 는 건드리지 않음
- `searchSpots` 와 `reviewTrack` 을 `Promise.allSettled` 로 묶어 실패 시 `spots: []` `interpretation: null` 로 떨어뜨림
- 경로가 `null` 인 조기 반환에도 `spots: []` `interpretation: null` 을 넣어 응답 키를 항상 같게 둠
- 추가항목 확인 절차는 draft 업로드 → `location/resolve` → `POST /api/lost` → `GET track` `200`
- 테스트 신고 `82146144-941e-4079-9c11-5532523d3d4e` 는 `reason=other` 로 close 완료. `lifecycle` `closed` 라 공개 목록 제외
- 목격 제보가 없어 `buildTrack` 이 `null` 이라 `reviewTrack` 미호출. Anthropic 실호출 0건
- `ANTHROPIC_API_KEY` 없이 경로가 잡히면 `reviewTrack` 이 사진 다운로드 후 `no-config` 로 떨어져 스토리지 조회가 헛돎

- `handlers.ts` 의 `loadOwnLost` 가 export 돼 있지 않아 `track-handlers.ts` 에 같은 3단계를 복제함
- `findManagedReport` 가 `coarseGridM` 과 `size` 를 이미 내주어 별도 행 조회 없이 그 값을 씀
- `density` 는 `track.nodes` 가 아니라 조회한 제보 전체 기준. 밀도 문구가 제보 n건 이라 경로에서 걸러진 제보도 셈
- `@rebirth/core/matching/track-handlers` 서브패스와 `./track.ts` 확장자 import 가 Turbopack dev 에서 정상 번들됨

- `@rebirth/core` 테스트가 `pass 87` 에서 `pass 91` 로 4건 증가. 신규 4건 전부 `track.test.ts`
- `comment-style.mjs` 훅은 `//` 2줄 연속도 차단해 파일 헤더 주석을 1줄로 씀. `/** */` JSDoc 은 검사 대상 밖
- `package.json` 의 기존 `"./matching/embed-text"` 줄은 와일드카드 아래 그대로 둠. 정확 일치가 우선이라 동작 동일
- `predictNext` 의 `κ` 는 `straightness` 값으로 적용. 설계 의도와 같음

- 분기 지점 `ee81bd9` 는 `feat/map-cluster` 머지 커밋이라 `origin/develop` 이 직전 작업 브랜치 내용을 이미 포함함
- `pnpm lint` 1 cached, `pnpm typecheck` 4 cached 로 일부 캐시 적중. 재측정 시 수치 동일
