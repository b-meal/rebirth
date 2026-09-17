# 이동 경로 추적 작업지시서 C. 어휘·검색·AI 해석

상태 어휘와 CTA 를 통일하고, 검색을 발견·실종 목적으로 나누고, 경로를 읽어 탐색 순서를 적는 모델 해석을 만드는 담당 C 의 유일한 체크리스트입니다. 담당 A 는 `2026-09-17-track-a-core-api-worklist.md`, 담당 B 는 `2026-09-17-track-b-screen-worklist.md` 를 봅니다.

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
- 이 파일에 없는 파일은 건드리지 않습니다. 담당 A·B 의 파일이 필요하면 `## 추가 항목` 에 적고 넘어갑니다.
- 경로는 저장소 루트 `/Users/hahmjuntae/Desktop/workspace/b-meal/rebirth` 기준입니다. 행 번호가 다르면 내용으로 찾아 진행하고 실제 위치를 보고합니다.

## 다른 담당과의 순서

- Phase 3 은 A 의 Phase 0 마지막 항목이 `[x]` 가 된 뒤 시작합니다. 브랜치 `feat/track-prediction` 이 그때 생깁니다.
- Phase 3 이 끝나면 B 에게 알립니다. B 의 Phase 8 이 `apps/web/components/lost/lost-detail.tsx` 를 이어서 고칩니다.
- Phase 5 와 Phase 7 은 A·B 와 동시에 진행합니다. 겹치는 파일이 없고 Phase 7 의 `track-review.ts` 는 A 의 `track.ts` 를 import 하지 않습니다.
- Phase 7 이 끝나면 A 에게 알립니다. A 의 Phase 9 가 `reviewTrack` 을 API 에 붙입니다.

| 순서 | A | B | C (이 파일) |
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
| 검색 placeholder | 발견 `동물 특징이나 동네로 검색` · 실종 `이름, 특징, 동네로 검색` |
| 기준선 | `@rebirth/core` `pass 87` · `@rebirth/web` `pass 3` · `lint` 2 tasks · `typecheck` 5 tasks |
| 범위 밖 | 실종 신고 없는 개체의 체인, 탐색 지점 가중치 튜닝 화면, 체인 결과 캐시 테이블, sighting↔sighting 배점, 홈 검색 아이콘 |

## Phase 3. 상태 어휘와 CTA 통일

- [x] `apps/web/components/report/report-detail.tsx` 의 하단 CTA 두 개를 행동 언어로 바꿉니다
  - [x] `<Link href="/guide/injured">구조 요청</Link>` 의 문구를 `구조·보호 요청` 으로 바꿉니다
  - [x] `<Link href="/lost/new">내 가족 같아요</Link>` 의 문구를 `우리 아이인지 확인` 으로 바꿉니다
  - [x] `grep -n "내 가족 같아요\|구조 요청<" apps/web/components/report/report-detail.tsx` 가 아무 줄도 내지 않는 것을 확인합니다
- [x] `apps/web/components/report/report-card.tsx` 와 `report-list.tsx` 의 상태 배지를 어휘 표에 맞춥니다
  - [x] `apps/web/components/report/report-card.tsx:68` 의 `찾는 중` 배지를 `실종` 으로 바꿉니다
  - [x] `apps/web/components/report/report-list.tsx:111` 의 `<Badge label="찾는 중" ...>` 를 `실종` 으로 바꿉니다
  - [x] `grep -rn '"찾는 중"\|>찾는 중<' apps/web/components` 가 아무 줄도 내지 않는 것을 확인합니다
- [x] `apps/web/components/lost/candidate-deck.tsx` 의 `CARE_LABEL` 을 주어 없는 어휘로 바꿉니다
  - [x] `roaming: "배회 중"` 을 `roaming: "발견"` 으로, `in_care: "제보자 보호 중"` 을 `in_care: "보호 중"` 으로 바꿉니다
  - [x] `unknown: "확인 중"` 은 그대로 두고 값을 바꾸지 않습니다
  - [x] `sed -n '36,42p' apps/web/components/lost/candidate-deck.tsx` 로 세 값을 눈으로 확인합니다
- [x] `apps/web/components/lost/lost-detail.tsx` 의 `statusBadge` 문구를 어휘 표에 맞춥니다
  - [x] `찾는 중 ${searchingDays}일째` 를 `실종 ${searchingDays}일째` 로 바꿉니다
  - [x] `집에 왔어요` 와 `집으로 돌아왔어요` 는 보호자 화면의 말이라 그대로 둡니다
  - [x] `오늘 잃어버렸어요` 도 그대로 둡니다
- [x] `apps/web` 검증을 통과시키고 Phase 3 담당 경로만 커밋한 뒤 B 에게 알립니다
  - [x] `pnpm lint 2>&1 | tail -5` 와 `pnpm typecheck 2>&1 | tail -5` 를 돌려 각각 `2 successful` 과 `5 successful` 을 봅니다
  - [x] `git add apps/web/components/report/report-detail.tsx apps/web/components/report/report-card.tsx apps/web/components/report/report-list.tsx apps/web/components/lost/candidate-deck.tsx apps/web/components/lost/lost-detail.tsx` 로 담습니다
  - [x] `git commit -m "fix: 상태 어휘를 실종·발견·보호 중으로 통일하고 CTA 를 행동 언어로 바꿈"` 으로 커밋하고 `exit 0` 을 확인합니다

## Phase 5. 검색 목적 분리

- [ ] `packages/db/src/queries/reports.ts` 의 `listPublicReports` 검색어 매칭에 반려동물 이름을 더합니다
  - [ ] `packages/db/src/queries/reports.ts:187-193` 의 `q` 조건 `or exists (...)` 뒤에 `or exists (select 1 from ${pets} p where p.id = ${reports}.pet_id and p.name ilike ${'%' + q + '%'})` 를 넣습니다
  - [ ] `pets` 가 이미 같은 파일에서 import 되어 있는지 `grep -n "pets" packages/db/src/queries/reports.ts | head -3` 으로 확인합니다
  - [ ] `pnpm --filter @rebirth/db typecheck 2>&1 | tail -3` 을 돌려 오류 없이 끝나는 것을 봅니다
- [ ] `apps/web/app/search/page.tsx` 가 `kind` 쿼리를 읽어 목록 종류를 고르게 합니다
  - [ ] `loadResults` 의 `listQuery.safeParse` 입력에 `...(first(params.kind) && { kind: first(params.kind) })` 를 더합니다
  - [ ] `listPublicReports({ kind: "sighting", ... })` 의 고정값을 `kind: parsed.data.kind ?? "sighting"` 으로 바꿉니다
  - [ ] `SearchScreen` 에 `kind={parsed.data.kind ?? "sighting"}` 를 넘기도록 props 를 하나 더합니다
- [ ] `apps/web/components/search/search-screen.tsx` 에 검색 목적 선택을 둡니다
  - [ ] `SHORTCUTS` 카드 위에 `Chip.Button` 두 개 `발견 제보 찾기` `실종 신고 찾기` 를 두고 현재 `kind` 인 쪽만 선택 상태로 그립니다
  - [ ] `TextFieldInput` 의 `placeholder` 를 `kind` 에 따라 설계 상수 표의 두 문구로 갈라 씁니다
  - [ ] `submit` 이 `router.push` 하는 주소에 `kind` 를 붙이고 `SHORTCUTS` 클릭 주소에도 같은 `kind` 를 유지합니다
  - [ ] `실종 신고 찾기` 모드에서 결과 카드가 `petName` 이 있으면 이름을 먼저 부르는지 `ReportCard` 의 기존 동작으로 확인합니다
- [ ] `apps/web/components/search/search-screen.tsx` 의 빈 결과 문구를 모드별로 갈라 씁니다
  - [ ] `발견 제보 찾기` 는 기존 문구를 유지하고 `실종 신고 찾기` 는 `이름이나 특징으로 다시 찾아보세요` 로 둡니다
  - [ ] `grep -n "kind" apps/web/components/search/search-screen.tsx | wc -l` 이 `4` 이상인지 확인합니다
- [ ] `apps/web` 검증을 통과시키고 Phase 5 담당 경로만 커밋합니다
  - [ ] `pnpm --filter @rebirth/web dev` 를 띄우고 `/search?kind=lost&q=몰리` 를 열어 `200` 과 실종 신고 카드만 나오는지 확인합니다
  - [ ] `pnpm lint 2>&1 | tail -5` 와 `pnpm typecheck 2>&1 | tail -5` 를 돌려 `2 successful` 과 `5 successful` 을 봅니다
  - [ ] `git add packages/db/src/queries/reports.ts apps/web/app/search/page.tsx apps/web/components/search/search-screen.tsx` 로 담습니다
  - [ ] `git commit -m "feat: 검색을 발견 제보 찾기와 실종 신고 찾기로 나누고 이름 검색을 더함"` 으로 커밋하고 `exit 0` 을 확인합니다

## Phase 7. 경로 해석 모델과 사진 대조

- [ ] `packages/core/src/matching/track-review.ts` 에 해석 스키마와 시스템 프롬프트를 둡니다
  - [ ] `review.ts` 를 본떠 `TRACK_MODEL` `TRACK_TIMEOUT_MS` `TRACK_PROMPT_VERSION` `TRACK_PHOTO_MAX` 를 설계 상수 값으로 둡니다
  - [ ] `trackReview` 를 `z.object({ movement: z.string(), photoConsistency: z.enum(["consistent", "mixed", "unclear"]), searchOrder: z.array(z.string()).max(3), caution: z.string().nullable() })` 로 씁니다
  - [ ] `SYSTEM` 에 개체 동일성을 확정하지 않고 품종을 단정하지 않으며 점수를 다시 매기지 않는다는 원칙을 넣습니다
  - [ ] `SYSTEM` 에 사진은 털색·크기·목줄 같은 눈에 보이는 특징이 서로 어긋나는지만 보고 같은 개체라고 말하지 말라는 지시를 넣습니다
  - [ ] `SYSTEM` 에 좌표 숫자를 그대로 쓰지 말고 지역명과 방향으로만 말하라는 지시를 넣습니다
- [ ] `packages/core/src/matching/track-review.ts` 에 사진 블록을 만드는 `loadTrackPhotos` 를 넣습니다
  - [ ] `findFirstPhotoPaths` 를 `@rebirth/db` 에서, `downloadPhoto` 를 `../storage/supabase-storage.ts` 에서 불러 최근 노드부터 `TRACK_PHOTO_MAX` 장을 받습니다
  - [ ] `vision/analyze.ts:140-145` 와 같은 모양으로 `{ type: "image", source: { type: "base64", media_type, data } }` 블록을 만듭니다
  - [ ] `Promise.allSettled` 로 받아 한 장 실패가 나머지를 막지 않게 하고 사진이 0장이면 빈 배열을 돌려 텍스트만으로 해석합니다
- [ ] `packages/core/src/matching/track-review.ts` 에 `describeTrack` 과 `reviewTrack` 호출부를 넣습니다
  - [ ] `describeTrack(input)` 이 노드별 지역명과 시각, `confidence`, `straightness`, `bearingDeg` 를 방향 낱말로 바꾼 값, 예측 반경만 문장에 담고 좌표 숫자는 담지 않게 씁니다
  - [ ] `reviewTrack` 이 `messages.parse` 와 `zodOutputFormat` 을 `review.ts` 와 같은 방식으로 쓰고 `content` 를 `[...photoBlocks, { type: "text", text }]` 로 넣습니다
  - [ ] `TrackReviewError` 를 `ReviewError` 와 같은 분류 `no-config` `timeout` `rate-limit` `api` `parse` 로 둡니다
  - [ ] `stop_reason` 이 `refusal` 이면 오류로 던지고 호출부가 경로만 그리게 합니다
- [ ] `packages/core/src/matching/track-review.test.ts` 에 API 호출 없는 검증을 넣습니다
  - [ ] `SYSTEM` 문자열에 `확정` 이 없고 원칙 다섯 줄의 핵심 낱말이 모두 들어 있는 검증 1건을 씁니다
  - [ ] `trackReview` 스키마가 `searchOrder` 4개와 `photoConsistency: "same"` 을 거부하는 검증 2건을 씁니다
  - [ ] `describeTrack` 이 좌표 숫자를 문장에 넣지 않는 검증 1건을 씁니다
  - [ ] `pnpm --filter @rebirth/core test 2>&1 | tail -10` 을 돌려 `fail 0` 을 봅니다
- [ ] `packages/core` 검증을 통과시키고 Phase 7 담당 경로만 커밋한 뒤 A 에게 알립니다
  - [ ] `pnpm typecheck 2>&1 | tail -5` 를 돌려 `5 successful, 5 total` 을 봅니다
  - [ ] `git add packages/core/src/matching/track-review.ts packages/core/src/matching/track-review.test.ts` 로 담습니다
  - [ ] `git commit -m "feat: 이동 경로와 노드 사진을 읽어 탐색 순서를 적는 모델 해석 추가"` 로 커밋하고 `exit 0` 을 확인합니다

## 추가 항목

## 참고

### 지시서 결함

- Phase 3 네 부모의 첫 20자가 모두 `` `apps/web/components `` 로 같아 보고에서 부모를 구분할 수 없음. 파일명으로 갈라야 함

### 실측 기록

- `apps/web/components` 에 남은 `찾는 중` 4건은 전부 주석(`place-search-field.tsx:47` `home-screen.tsx:83` `lost-form.tsx:422,424`)이라 상태 어휘 아님
- `report-detail.tsx:220` 주석의 `구조 요청` 은 부상 제보 분기 근거 서술이라 CTA 문구 참조가 아니어서 유지
- `pnpm lint`·`pnpm typecheck` 가 FULL TURBO 캐시 적중이라 `--filter @rebirth/web` 로 재실행해 eslint·tsc 실제 통과를 확인함
