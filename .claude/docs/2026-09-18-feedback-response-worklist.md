# 심사 피드백 대응 작업지시서

원티드 AI 챔피언십 2026 피드백 33항목 중 코드 변경이 필요한 11개 주제의 유일한 체크리스트입니다.

## 실행 규칙

- 진행 기록은 이 파일의 `[ ]`를 `[x]`로 바꾸는 것만 허용하고, 회귀하면 해당 `[x]`를 `[ ]`로 되돌립니다.
- 이 파일에 문장·설명·결과 요약·날짜를 덧붙이지 않습니다. 작업 중 새로 생긴 **실행 대상**만 `## 추가 항목` 맨 아래에 `- [ ]` 한 줄로 추가하고, 실행 대상이 아닌 관찰은 `## 참고`의 해당 절에 체크박스 없는 `- ` 한 줄로 추가합니다.
- worklog·task 파일·HANDOFF·보고서·별도 md 를 새로 만들지 않습니다. 예외는 이 파일과 `.claude/docs/track-prediction.md` 뿐입니다.
- 이 저장소는 마크다운 문서를 노션에만 씁니다. `.claude/hooks/block-markdown-docs.mjs` 가 `.claude/**` 밖의 `.md` 쓰기를 PreToolUse 에서 차단하므로 새 `.md` 를 만들지 않습니다.
- 코드 주석은 한 줄, 명사형 종결, 마침표 없이 씁니다. `.claude/hooks/comment-style.mjs` 가 Write 와 Edit 에서 위반을 차단합니다.
- 화살표는 `→` 만 씁니다. ASCII `->` 와 `←` `⇒` `↔` 는 차단됩니다.
- `apps/web` 의 UI 는 SEED 단일 원천입니다. 색·간격·서체를 하드코딩하지 않고 `@seed-design/css/vars` 토큰만 씁니다. `.claude/hooks/enforce-design-system.mjs` 가 검사합니다.
- 커밋은 `git commit` 으로만 합니다. Phase 의 마지막 검증 항목이 `[x]` 가 된 직후 그 Phase 담당 경로만 커밋합니다. push·merge·PR 생성·`main` 과 `develop` 직접 변경을 하지 않습니다.
- 커밋 메시지는 Conventional Commits 이고 본문은 `- ` 불릿입니다. 산문으로 풀어 쓰지 않습니다.
- 삭제는 `trash`, 이동은 `git mv` 를 씁니다. `apps/web/seed-design/**` 은 SEED CLI 산출물이라 읽기 전용입니다.
- 기존 마이그레이션을 수정하지 않습니다. 이 작업은 새 마이그레이션을 만들지 않습니다.
- 정확 좌표를 공개 API 응답·UI·공유 카드·모델 프롬프트에 넣지 않습니다. `exactPoint` 를 읽는 코드를 추가하지 않습니다.
- 품종을 단정하지 않고 개체 동일성을 확정하지 않습니다. 새로 쓰는 문구도 확인할 후보로만 말합니다.
- 한 항목이 10분 넘게 막히면 그 항목을 `[ ]`로 두고 `## 추가 항목`에 사유를 한 줄로 추가한 뒤 다음 항목으로 넘어갑니다.
- 각 Phase 의 마지막 검증 항목이 실패하면 다음 Phase 를 시작하지 않습니다.
- 심사 기간 `2026-09-21` 부터 `2026-10-05` 에는 `main` 으로 가는 PR 을 만들지 않습니다. 링크가 멎으면 평가에서 제외될 수 있습니다.
- 행 번호가 다르면 내용으로 찾아 진행하고 실제 위치를 `## 참고` 의 `### 지시서 결함` 에 한 줄로 보고합니다.
- 경로는 `/Users/hahmjuntae/Desktop/workspace/b-meal/rebirth` 기준 상대경로입니다. `core` 는 `packages/core/src`, `web` 은 `apps/web` 을 가리킵니다.

## 오케스트레이션

- 메인 세션은 이 파일 읽기, 에이전트 투입, 에이전트 응답 검토, `[ ]`를 `[x]`로 바꾸는 일만 합니다. 구현·이동·빌드·테스트는 전부 에이전트가 합니다.
- Phase 하나에 에이전트 하나를 투입합니다. 동시에 살아 있는 에이전트는 최대 3 개이고, 하나가 끝나면 그 슬롯에 아래 표의 다음 Phase 를 즉시 투입합니다.
- 에이전트는 이 파일을 수정하지 않습니다. `## 추가 항목` 기록도 메인이 합니다.
- 에이전트 프롬프트에 반드시 넣는 것: 이 파일의 절대경로, 담당 Phase 헤더 원문, `## 실행 규칙`과 `## 설계 상수`를 먼저 읽으라는 지시, 완료한 항목마다 항목 첫 30자와 검증 명령의 마지막 출력 줄을 한 줄씩 보고하라는 지시, 막힌 항목은 첫 30자와 사유 한 줄로 보고하라는 지시, 이 파일과 다른 Phase 의 파일은 건드리지 말라는 지시.
- 메인은 항목별 보고를 근거로 `[x]`를 찍고, 보고에 검증 출력이 없는 항목은 `[ ]`로 둡니다. Phase 마지막 검증 항목은 응답에 `exit 0` 또는 `fail 0` 문구가 있을 때만 `[x]`로 찍습니다.
- Phase 1 부터 Phase 7 과 Phase 9 · Phase 10 은 쓰기 경로가 겹치지 않아 병렬로 돌립니다. 공유 파일이 없으므로 `공유 파일 보류` 항목도 없습니다.
- Phase 1 부터 Phase 11 은 전체 `pnpm build` 를 돌리지 않습니다. 세 슬롯이 같은 turbo 캐시를 물면 서로를 기다립니다. 전체 빌드는 Phase 12 한 곳에서만 돌립니다.
- 같은 슬롯 열의 Phase 는 위에서 아래로 순서를 지키고, 한 Phase 의 마지막 검증 항목이 `[x]`가 되기 전에는 그 Phase 에 의존하는 다음 Phase 를 투입하지 않습니다.

| 슬롯 A | 슬롯 B | 슬롯 C | 투입 조건 |
|---|---|---|---|
| Phase 0 | 대기 | 대기 | 즉시 |
| Phase 1 | Phase 3 | Phase 4 | Phase 0 마지막 검증 `[x]` |
| Phase 2 | Phase 5 | Phase 6 | 같은 슬롯 앞 Phase 마지막 검증 `[x]` |
| 대기 | 대기 | Phase 7 | 같은 슬롯 앞 Phase 마지막 검증 `[x]` |
| Phase 9 | Phase 10 | 대기 | Phase 3 과 Phase 7 마지막 검증 `[x]` |
| Phase 8 | 대기 | 대기 | Phase 1 부터 Phase 7 과 Phase 9 · Phase 10 마지막 검증 전부 `[x]` |
| Phase 11 | 대기 | 대기 | Phase 8 마지막 검증 `[x]` |
| Phase 12 | 대기 | 대기 | Phase 11 마지막 검증 `[x]` |

## 설계 상수

| 항목 | 값 |
|---|---|
| 작업 브랜치 | `feat/feedback-response`, `develop` 에서 분기 |
| 기준선 테스트 | `@rebirth/core` 104 pass · `@rebirth/web` 8 pass · 전체 `fail 0` |
| 기준선 린트 | `pnpm lint` 2 tasks successful · `pnpm typecheck` 5 tasks successful |
| 이동 거리 상한 | `D_MAX_KM` 소형 5 · 중형 10 · 대형 15 · unknown 10 (km) |
| 표류 포화 시간 | `H_DRIFT_HOURS = 8` |
| 방향성 수축 | `kappaEff = kappa * nLeg / (nLeg + 1)` |
| 표류 방향 | 마지막 다리가 아니라 다리 합벡터 `Σv⃗` 의 단위벡터 |
| 사진 불일치 감쇠 | `PHOTO_MIXED_FACTOR = 0.6`, `photoConsistency` 가 `mixed` 일 때만 |
| 외형 유사도 하한 | `MIN_LEG_SIMILARITY`, Phase 2 에서 실측 분포로 정하고 기본값 `0.82` |
| 상태 어휘 | `실종` `발견` `보호 중` `구조 요청` `찾음` 다섯 개만 |
| 예측 원 배수 | `RING_OUTER_FACTOR = 2`, 안쪽 반경 `r` 와 바깥 반경 `2r` |
| QR 의존성 | `qrcode` `^1.5.4` 를 `@rebirth/web` dependencies 에 추가 |
| 전단 경로 | `apps/web/app/r/[id]/poster/page.tsx` |
| 랜딩 경로 | `apps/web/app/find/page.tsx` |
| 문서 경로 | `.claude/docs/track-prediction.md` 한 곳, 노션 이관 대기본 |
| 마이그레이션 | 새로 만들지 않음. `reports` `match_scores` `report_embeddings` 읽기만 |
| 스토리 안전 영역 | 위 `250px` 아래 `250px` 는 인스타그램 UI 자리, 글자와 QR 을 넣지 않음 |
| 스토리 사진 비율 | `STORY_PHOTO_SHARE` 를 `0.68` 에서 `0.56` 으로 낮춰 글 블록에 안전 영역 몫을 줌 |
| OG 글자 띠 | `1200x630` 사진 위 아래 `180px` 에 반투명 띠, 제목 한 줄과 사실 한 줄 |
| 공유 카드 캐시 | `Cache-Control: public, max-age=300, s-maxage=600, stale-while-revalidate=86400` |
| 예선 심사 기준 | 기획력 · 실현 가능성 · 확장성 · AI 활용의 적절성. 원티드랩 내부 심사 80% + 온라인 투표 20% |
| 본선 심사 기준 | 기획력 · 확장성 · 기술력 · 발표 전달력. AI 전문가 심사위원단 |
| 항목별 배점 | 미공개. 보도자료와 공고 어디에도 항목 가중치가 없음 |
| 심사위원 | 강정구 라이너 AI 전략 총괄 · 김호민 스파크랩 공동대표 · 김덕중 퍼브 AI 연구소장 · 조정석 크래프톤 AI 에이전트 엔지니어 · 정기수 원티드랩 AI부문장 |
| 제출 항목 | 서비스 접속 링크 · 해결하려는 문제 · AI 활용 방식 · 사용한 AI 도구와 기술 스택 |
| 실격 조건 | 심사 기간 `2026-09-21` 부터 `2026-10-05` 에 서비스 링크가 정상 작동하지 않으면 평가 제외 가능 |
| 일정 | 제출 `2026-09-20` · 예선과 투표 `09-21` 부터 `10-05` · TOP20 `10-07` · 데모데이 `10-17` |
| 기준 출처 | `https://www.venturesquare.net/1109725` · `https://www.m-i.kr/news/articleView.html?idxno=1407688` · `https://zdnet.co.kr/view/?no=20260831083536` |
| 스모크 대상 | `/` `/find` `/reports` `/search` `/shelters` `/community` `/robots.txt` `/sitemap.xml` `/manifest.webmanifest` 아홉 경로, 기준 도메인은 `NEXT_PUBLIC_SITE_URL` |
| 범위 밖 | 실종 신고 없는 떠돌이 개체의 경로, 발견 제보끼리의 배점, 새 벡터 모델 도입, 네이티브 앱 |

## Phase 0. 준비와 기준선

- [x] `git status --short` 의 미커밋 변경 4개를 두 주제로 나눠 커밋합니다
  - [x] `git diff --stat` 로 `apps/web/components/lost/track-map.tsx` 와 스플래시 3파일이 서로 다른 주제인지 확인합니다
  - [x] `git add apps/web/components/lost/track-map.tsx` 로 지도 변경만 담고 `feat: 예측 원에 이동 방향 화살표를 올림` 으로 커밋합니다
  - [x] `git add apps/web/components/ui/app-frame.tsx apps/web/components/ui/splash-overlay.tsx apps/web/lib/splash-gate.ts` 를 담고 `fix: 덮개 없는 화면에서 스플래시 잠금이 남던 문제 수정` 으로 커밋합니다
  - [x] `git status --short` 를 다시 실행해 출력이 빈 줄인 것을 확인합니다
- [x] `git switch -c feat/feedback-response` 로 작업 브랜치를 `develop` 에서 분기합니다
  - [x] `git fetch origin develop` 으로 원격 `develop` 을 받습니다
  - [x] `git switch -c feat/feedback-response origin/develop` 을 실행하고 앞 커밋 두 개를 `git cherry-pick` 으로 옮깁니다
  - [x] `git branch --show-current` 가 `feat/feedback-response` 인 것과 `git log --oneline -3` 에 두 커밋이 있는 것을 확인합니다
- [x] `pnpm --filter @rebirth/core test` 와 `pnpm --filter @rebirth/web test` 로 테스트 기준선을 측정합니다
  - [x] `pnpm --filter @rebirth/core test 2>&1 | grep -E "ℹ (tests|pass|fail)"` 가 `tests 104` `pass 104` `fail 0` 인 것을 확인합니다
  - [x] `pnpm --filter @rebirth/web test 2>&1 | grep -E "ℹ (tests|pass|fail)"` 가 `tests 8` `pass 8` `fail 0` 인 것을 확인합니다
  - [x] `## 설계 상수` 의 기준선과 다르면 `## 참고` 의 `### 실측 기록

- `apps/web/components/report/detail-photo-hero.tsx` 는 지도가 아니라 사진 0장 빈 상태 주제라 `4d601d4` 로 분리 커밋
- 지도 커밋 메시지를 지시서의 `feat: 예측 원에 이동 방향 화살표를 올림` 대신 실제 diff 에 맞춰 바꿈
- 스플래시 3파일은 Phase 0 진행 중 동시 세션이 `107a863` 으로 선점 커밋해 에이전트의 `git add` 는 빈 스테이지였음
- 새 브랜치가 `feat/unified-track-map` 을 upstream 으로 잡아 `git branch --unset-upstream` 으로 끊음
- Phase 0 기준선은 설계 상수와 일치. core 104 pass · web 8 pass · fail 0 · lint 2 tasks · typecheck 5 tasks` 에 실제 수치를 한 줄로 남깁니다
- [x] `pnpm lint` 와 `pnpm typecheck` 로 정적 검사 기준선을 측정합니다
  - [x] `pnpm lint` 를 실행해 `Tasks: 2 successful, 2 total` 을 확인합니다
  - [x] `pnpm typecheck` 를 실행해 `Tasks: 5 successful, 5 total` 을 확인합니다
  - [x] `git status --short` 가 빈 줄이고 두 명령의 종료코드 `0` 인 것을 확인합니다

## Phase 1. 이동 경로 공식 보정

- [x] `packages/core/src/matching/track.ts` 에 `D_MAX_KM` 을 넣고 `legFeasibility` 의 분모를 상한으로 감쌉니다
  - [x] `packages/core/src/matching/track.ts:16-27` 의 `SIGMA_KM` 아래에 `export const D_MAX_KM: Record<TrackSize, number> = { small: 5, medium: 10, large: 15, unknown: 10 }` 를 추가합니다
  - [x] `packages/core/src/matching/track.ts:70-79` 의 반환식을 `distanceKm(from.point, to.point) / Math.min(V_MAX_KMH[size] * hours, D_MAX_KM[size])` 로 바꿉니다
  - [x] `D_MAX_KM` 위에 `긴 공백에서 상한이 무한히 늘어나는 것 방지` 한 줄 주석을 붙입니다
  - [x] `pnpm --filter @rebirth/core test` 를 실행해 `fail 0` 을 봅니다
- [x] `packages/core/src/matching/track.test.ts` 에 긴 공백 노드가 경로에서 빠지는 테스트를 넣습니다
  - [x] `packages/core/src/matching/track.test.ts:8-17` 의 import 에 `D_MAX_KM` 을 더합니다
  - [x] `isFeasibleLeg` 가 소형견 기준 `시각(48)` `북쪽(20)` 노드에서 `false` 인 테스트 1건을 추가합니다
  - [x] `시각(48)` `북쪽(4)` 는 `true` 인 단정을 같은 테스트에 더해 상한 안쪽이 살아 있는 것을 확인합니다
  - [x] `pnpm --filter @rebirth/core test` 를 실행해 `fail 0` 을 봅니다
- [x] `packages/core/src/matching/track.ts:145-159` 의 `straightness` 에 다리 수 수축을 더한 `straightnessEffective` 를 만듭니다
  - [x] `packages/core/src/matching/track.ts` 에 `export function straightnessEffective(legs: TrackLeg[]): number` 를 추가하고 `straightness(legs) * legs.length / (legs.length + 1)` 을 반환합니다
  - [x] `straightnessEffective` 위에 `다리 하나뿐인 경로가 직진으로 읽히는 것 방지` 한 줄 주석을 붙입니다
  - [x] `packages/core/src/matching/track.test.ts` 에 다리 1개는 `0.5` 이하, 다리 3개는 `0.7` 이상인 테스트 1건을 추가합니다
  - [x] `pnpm --filter @rebirth/core test` 를 실행해 `fail 0` 을 봅니다
- [x] `packages/core/src/matching/track.ts:161-208` 의 `predictNext` 표류를 합벡터 방향과 포화 시간으로 바꿉니다
  - [x] `packages/core/src/matching/track.ts:23-27` 부근에 `export const H_DRIFT_HOURS = 8` 을 추가하고 `상관 랜덤워크의 방향 지속 시간 추정` 한 줄 주석을 붙입니다
  - [x] `packages/core/src/matching/track.ts:179` 의 `kappa` 를 `straightnessEffective(track.legs)` 로 바꿉니다
  - [x] `packages/core/src/matching/track.ts:185-188` 의 `unit` 을 `track.legs` 전체의 `legVector` 합벡터 단위벡터로 바꾸고 `shiftKm` 을 `kappa * vEff * Math.min(hoursSinceLast, H_DRIFT_HOURS)` 로 바꿉니다
  - [x] `pnpm --filter @rebirth/core test` 를 실행해 `fail 0` 을 봅니다
- [x] `packages/core/src/matching/track.test.ts` 에 표류 포화와 합벡터 방향 테스트를 넣습니다
  - [x] `시각(12)` 와 `시각(200)` 의 `center` 가 같은 좌표인 테스트 1건을 직선 경로로 추가해 포화를 확인합니다
  - [x] `bearingDeg` 가 마지막 다리만 서쪽으로 꺾인 경로에서 `270` 이 아니라 북쪽 쪽에 남는 테스트 1건을 추가합니다
  - [x] `predictNext` 의 `straightness` 반환값이 `straightnessEffective` 와 같은지 단정 1줄을 더합니다
  - [x] `pnpm --filter @rebirth/core test` 를 실행해 `fail 0` 을 봅니다
- [x] `packages/core/src/matching/track.ts` 변경을 Phase 1 담당 경로만 커밋합니다
  - [x] `pnpm --filter @rebirth/core typecheck` 를 실행해 종료코드 `0` 을 봅니다
  - [x] `git add packages/core/src/matching/track.ts packages/core/src/matching/track.test.ts` 로 두 파일만 담습니다
  - [x] `fix: 이동 거리 상한과 표류 포화를 넣어 긴 공백에서 경로가 무너지는 것 막음` 으로 커밋합니다
  - [x] `pnpm --filter @rebirth/core test` 를 실행해 `fail 0` 을 보고 `git status --short` 에 Phase 1 경로가 남지 않은 것을 확인합니다

## Phase 2. 사진 대조와 외형 유사도 경로 소속

- [x] `packages/core/src/matching/track-review.ts` 에 사진 불일치 감쇠 함수를 넣습니다
  - [x] `packages/core/src/matching/track-review.ts:27` 부근에 `export const PHOTO_MIXED_FACTOR = 0.6` 을 추가하고 `사진 특징이 어긋나면 경로 신뢰도를 깎는 계수` 한 줄 주석을 붙입니다
  - [x] `export function confidenceWithPhotos(confidence: number, consistency: TrackReview["photoConsistency"] | null): number` 를 추가하고 `mixed` 일 때만 `PHOTO_MIXED_FACTOR` 를 곱해 `Math.round` 합니다
  - [x] `packages/core/src/matching/track-review.test.ts` 에 `consistent` `unclear` `null` 은 그대로, `mixed` 는 `0.6` 배인 테스트 1건을 추가합니다
  - [x] `pnpm --filter @rebirth/core test` 를 실행해 `fail 0` 을 봅니다
- [x] `packages/db/src/queries/lost.ts:361-382` 의 `findTrackSightings` 에 외형 유사도 열을 더합니다
  - [x] `packages/db/src/queries/lost.ts` 에 `report_embeddings` 를 실종 신고와 제보 양쪽에 조인해 `1 - (le.embedding <=> e.embedding)` 을 `similarity` 로 내리는 `raw` 서브쿼리를 넣습니다
  - [x] `similarity` 는 임베딩이 한쪽이라도 없으면 `null` 로 내려 점수 경로만 남게 합니다
  - [x] `minScore` 필터를 `matchScores.score >= minScore or similarity >= :minSimilarity` 로 바꾸고 두 번째 인자 `minSimilarity` 를 시그니처에 더합니다
  - [x] `pnpm --filter @rebirth/db typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `MIN_LEG_SIMILARITY` 를 실측 분포로 정합니다
  - [x] `packages/db/src/queries/ai.ts:406-437` 의 `listSemanticNeighbors` 를 참고해 실종·제보 쌍의 `similarity` 분위수를 뽑는 임시 쿼리를 한 번 실행합니다
  - [x] `scored = true` 쌍의 중위 유사도와 `scored = false` 쌍의 상위 10% 유사도를 읽어 둘 사이 값을 하한으로 고릅니다
  - [x] `0.82` 를 실행 환경에 데이터가 없을 때 기본값으로 쓰고 그 사실을 `## 참고` 의 `### 실측 기록

- `apps/web/components/report/detail-photo-hero.tsx` 는 지도가 아니라 사진 0장 빈 상태 주제라 `4d601d4` 로 분리 커밋
- 지도 커밋 메시지를 지시서의 `feat: 예측 원에 이동 방향 화살표를 올림` 대신 실제 diff 에 맞춰 바꿈
- 스플래시 3파일은 Phase 0 진행 중 동시 세션이 `107a863` 으로 선점 커밋해 에이전트의 `git add` 는 빈 스테이지였음
- 새 브랜치가 `feat/unified-track-map` 을 upstream 으로 잡아 `git branch --unset-upstream` 으로 끊음
- Phase 0 기준선은 설계 상수와 일치. core 104 pass · web 8 pass · fail 0 · lint 2 tasks · typecheck 5 tasks` 에 남깁니다
  - [x] `packages/core/src/matching/track-handlers.ts` 에 고른 값을 `export const MIN_LEG_SIMILARITY` 로 넣고 `외형 벡터만으로 경로에 들일 하한, 실측 분위수 기준` 주석을 붙입니다
- [x] `packages/core/src/matching/track-handlers.ts:126-136` 의 노드 변환에 유사도 승격을 넣습니다
  - [x] `findTrackSightings(lost.id, MIN_LEG_SCORE)` 호출에 `MIN_LEG_SIMILARITY` 를 두 번째 인자로 더합니다
  - [x] `row.score >= MIN_LEG_SCORE ? row.score : MIN_LEG_SCORE` 로 노드 `score` 를 두어 유사도로 들어온 노드가 가장 약한 고리가 되게 합니다
  - [x] `ponytail: 유사도 승격은 최저 점수 대입으로 둠, 경로 소속 배점이 따로 생기면 걷어냄` 한 줄 주석을 그 줄 위에 붙입니다
  - [x] `pnpm --filter @rebirth/core typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `packages/core/src/matching/track-handlers.ts:139-168` 의 응답에 감쇠한 신뢰도와 승격 건수를 담습니다
  - [x] `loadAssist` 결과의 `interpretation.photoConsistency` 를 `confidenceWithPhotos` 에 넘겨 `track.confidence` 를 덮어씁니다
  - [x] `promotedCount` 로 유사도로만 들어온 노드 수를 세어 `okPrivate` 응답에 담습니다
  - [x] `track` 이 `null` 인 분기의 응답에도 `promotedCount: 0` 을 더해 화면이 필드 없음을 만나지 않게 합니다
  - [x] `pnpm --filter @rebirth/core test` 를 실행해 `fail 0` 을 봅니다
- [x] `apps/web/components/lost/use-track.ts` 의 응답 타입에 새 필드를 더합니다
  - [x] `apps/web/components/lost/use-track.ts` 의 `TrackView` 에 `promotedCount: number` 를 추가합니다
  - [x] `promotedCount` 기본값 `0` 을 파싱 실패 폴백에도 넣어 `undefined` 가 화면에 닿지 않게 합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `git add` 로 Phase 2 담당 경로만 담아 커밋합니다
  - [x] `git add packages/core/src/matching/track-review.ts packages/core/src/matching/track-review.test.ts packages/core/src/matching/track-handlers.ts packages/db/src/queries/lost.ts apps/web/components/lost/use-track.ts` 로 담습니다
  - [x] `feat: 사진 불일치를 경로 신뢰도에 반영하고 외형 유사도로 경로 소속을 넓힘` 으로 커밋합니다
  - [x] `pnpm --filter @rebirth/core test` 와 `pnpm --filter @rebirth/web typecheck` 를 실행해 `fail 0` 과 종료코드 `0` 을 봅니다

## Phase 3. 상태 어휘 통일과 행동 CTA

- [x] `apps/web/lib/report-label.ts:20-24` 의 `CARE_LABEL` 을 다섯 값 `STATUS_LABEL` 로 바꿉니다
  - [x] `apps/web/lib/report-label.ts` 에 `export const STATUS_LABEL = { lost: "실종", roaming: "발견", in_care: "보호 중", rescue: "구조 요청", resolved: "찾음" }` 를 추가합니다
  - [x] `CARE_LABEL` 을 `STATUS_LABEL` 로 옮기고 `unknown` 은 빈 문자열로 두어 `확인되지 않음` 이 화면에 뜨지 않게 합니다
  - [x] `STATUS_LABEL` 위에 `주어 없는 다섯 어휘로 고정, 배회 중과 찾는 중 금지` 한 줄 주석을 붙입니다
  - [x] `grep -rn "CARE_LABEL" apps/web` 을 실행해 남은 참조가 전부 `STATUS_LABEL` 로 바뀐 것을 확인합니다
- [x] `apps/web/lib/report-label.ts:112-141` 에 등급·밀도·반경을 한 문장으로 합치는 `situationLine` 을 넣습니다
  - [x] `export function situationLine(input: { lastSeen: Date; count: number | null; radiusKm: number | null; now?: Date }): string` 를 추가합니다
  - [x] `sinceLabel` 과 `URGENCY_HINT` 와 `densityLine` 을 한 문장으로 잇고 밀도가 `null` 이면 등급 문구만 남깁니다
  - [x] `apps/web/lib/report-label.test.ts` 에 밀도 있음·없음 두 갈래와 문장에 날짜 숫자가 없는 단정을 담은 테스트 1건을 추가합니다
  - [x] `pnpm --filter @rebirth/web test` 를 실행해 `fail 0` 을 봅니다
- [x] `apps/web/components/report/report-card.tsx:55-77` 의 카드 아래 줄을 상황 한 줄로 바꿉니다
  - [x] `ReportCardItem` 에 `occurredAt: string` 을 더하고 `CARE_LABEL` 참조를 `STATUS_LABEL` 로 바꿉니다
  - [x] `situationLine` 결과를 실종 카드에, `STATUS_LABEL` 값을 발견 카드에 `maxLines={1}` 로 그립니다
  - [x] `injury === true` 는 지금처럼 `fg.critical` 로 가장 먼저 읽히게 남겨 둡니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/components/report/report-form.tsx:59-62` 의 `배회 중` 을 `발견` 으로 바꿉니다
  - [x] `CARE_OPTIONS` 의 `roaming` 라벨을 `발견` 으로, `in_care` 라벨을 `보호 중` 으로 바꿉니다
  - [x] `apps/web/components/design/catalog-components.tsx:230` 과 `catalog-patterns.tsx:64` 의 `배회 중` 도 같은 어휘로 바꿉니다
  - [x] `grep -rn "배회 중" apps/web` 을 실행해 `0건` 인 것을 확인합니다
- [x] `apps/web/components/lost/lost-detail.tsx:75-88` 의 `statusBadge` 를 다섯 어휘로 맞춥니다
  - [x] `실종 ${searchingDays}일째` 는 그대로 두고 `집에 왔어요` 와 `집으로 돌아왔어요` 를 `찾음` 으로 바꿉니다
  - [x] `종료된 신고` 는 다섯 어휘 밖이라 배지에서 빼고 `찾음` 아닌 종료는 `tone="neutral"` 문구 없이 둡니다
  - [x] `apps/web/app/r/[id]/card/route.tsx` 는 Phase 9 담당이라 이 Phase 에서 고치지 않습니다
  - [x] `grep -rn "찾는 중 " apps/web/components` 을 실행해 `0건` 인 것을 확인합니다
- [x] `apps/web/components/guide/rescue-request.tsx` 의 `구조 요청` 을 행동이 드러나는 말로 바꿉니다
  - [x] `apps/web/components/guide/rescue-request.tsx:30` 의 버튼을 `구조·보호 요청 보내기` 로 바꿉니다
  - [x] `apps/web/components/guide/rescue-request.tsx:39` 와 `:86` 의 `AppHeader title` 을 `구조·보호 요청` 으로 바꿉니다
  - [x] `apps/web/app/guide/injured/page.tsx:7` 의 `title` 과 `apps/web/components/ui/error-view.tsx:79` 의 링크 문구도 같은 말로 바꿉니다
  - [x] `grep -rn "구조 요청" apps/web/components apps/web/app` 을 실행해 주석 밖 사용자 문구가 `0건` 인 것을 확인합니다
- [x] `git add` 로 Phase 3 담당 경로만 담아 커밋합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 와 `pnpm --filter @rebirth/web lint` 를 실행해 종료코드 `0` 을 봅니다
  - [x] `git add apps/web/lib/report-label.ts apps/web/lib/report-label.test.ts apps/web/components/report apps/web/components/guide apps/web/components/ui/error-view.tsx apps/web/components/design apps/web/app/guide apps/web/components/lost/lost-detail.tsx` 로 담습니다
  - [x] `feat: 상태 어휘를 다섯 개로 통일하고 CTA 를 행동 언어로 바꿈` 으로 커밋합니다
  - [x] `pnpm --filter @rebirth/web test` 를 실행해 `fail 0` 을 봅니다

## Phase 4. 예측 원 두 겹과 방향 화살표

- [x] `apps/web/components/lost/track-map.tsx:57-58` 에 바깥 원 레이어 식별자를 더합니다
  - [x] `RING_OUTER_FACTOR = 2` 와 `CIRCLE_OUTER_ID` `CIRCLE_OUTER_EDGE_ID` 를 상수로 추가합니다
  - [x] `RING_OUTER_FACTOR` 위에 `확산 가정에서 안쪽 원이 약 39%, 바깥 원이 약 86% 를 덮는 배수` 한 줄 주석을 붙입니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/components/lost/track-map.tsx:184-219` 에 바깥 원 소스와 레이어를 더합니다
  - [x] `circleRing(prediction.center, prediction.radiusKm * RING_OUTER_FACTOR)` 로 두 번째 링을 만들어 `addSource` 합니다
  - [x] `line-dasharray` 만 두고 채움 없이 안쪽 원보다 옅은 불투명도로 그려 두 경계가 구분되게 합니다
  - [x] `@seed-design/css/vars` 토큰에서 읽은 CSS 변수만 쓰고 색 리터럴을 넣지 않습니다
  - [x] `pnpm --filter @rebirth/web lint` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/components/lost/track-map.tsx:257-270` 의 화살표를 마지막 목격에서 중심까지로 다시 둡니다
  - [x] `lastNode.point` 로 화살표 마커 좌표를 옮겨 어디서 어디로 미는지가 읽히게 합니다
  - [x] `prediction.center` 와 `lastNode.point` 사이 화면 거리에 맞춰 화살표 길이를 늘립니다
  - [x] `prediction.bearingDeg` 가 없거나 `lastNode` 가 없으면 화살표를 그리지 않는 분기를 남깁니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/components/lost/track-map.tsx:271-280` 의 화면 맞춤 범위를 바깥 원까지 넓힙니다
  - [x] `fitBounds` 대상 좌표 묶음에 바깥 링 좌표를 더해 원이 화면 밖으로 잘리지 않게 합니다
  - [x] `apps/web/components/lost/track-map.tsx:370` 의 effect 의존 배열에 새 값이 빠지지 않았는지 확인합니다
  - [x] `pnpm --filter @rebirth/web lint` 를 실행해 종료코드 `0` 을 봅니다
- [ ] `git add` 로 Phase 4 담당 경로만 담아 커밋합니다
  - [x] `git add apps/web/components/lost/track-map.tsx` 로 한 파일만 담습니다
  - [ ] `feat: 예측 원을 두 겹으로 그리고 화살표를 마지막 목격에서 시작하게 함` 으로 커밋합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 와 `pnpm --filter @rebirth/web lint` 를 실행해 둘 다 종료코드 `0` 을 봅니다

## Phase 5. 경로 타임라인 카드

- [x] `apps/web/components/lost/track-section.tsx:73-90` 위에 노드 타임라인을 넣습니다
  - [x] `track.nodes` 를 시간순으로 그리고 각 줄에 번호·지역명·`sinceLabel` 을 담는 목록을 추가합니다
  - [x] `index + 1` 로 지도 마커 번호와 목록 번호가 같은 값을 쓰게 맞춥니다
  - [x] `bearingDeg` 와 좌표 숫자를 화면에 내보내지 않는 기존 규칙을 그대로 지킵니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/components/lost/track-section.tsx` 의 타임라인 줄 사이에 구간 요약을 넣습니다
  - [x] `track.legs` 의 `km` 과 `hours` 를 `3시간 뒤 1.2km 남동쪽` 형태 한 줄로 바꾸는 지역 함수를 만듭니다
  - [x] `bearingWord` 를 다리 벡터에 적용해 방향을 여덟 낱말로만 말합니다
  - [x] `hours` 가 1 미만이면 `분` 단위로 내려 `0시간 뒤` 가 뜨지 않게 합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/components/lost/track-section.tsx:58-70` 의 머리글에 유사 후보 건수 한 줄을 넣습니다
  - [x] `track.promotedCount` 가 1 이상이면 `외형이 닮아 이어 붙인 확인할 후보 n건` 을 `Callout` 없이 본문 한 줄로 그립니다
  - [x] `promotedCount` 가 `0` 이거나 `undefined` 면 아무것도 그리지 않는 분기를 둡니다
  - [x] `확인할 후보` 로만 부르고 개체 동일성을 확정하는 말을 쓰지 않습니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/components/lost/track-section.tsx:74-91` 의 두 줄짜리 상황 문구를 `situationLine` 한 줄로 합칩니다
  - [x] `sinceLabel` `densityLine` `urgencyHint` 세 줄을 `situationLine` 한 번 호출로 바꿉니다
  - [x] `track.density` 가 `null` 일 때 밀도 절이 빠지고 등급 문구만 남는지 확인합니다
  - [x] `pnpm --filter @rebirth/web test` 를 실행해 `fail 0` 을 봅니다
- [x] `git add` 로 Phase 5 담당 경로만 담아 커밋합니다
  - [x] `git add apps/web/components/lost/track-section.tsx` 로 한 파일만 담습니다
  - [x] `feat: 경로 카드에 목격 타임라인과 구간 요약을 넣음` 으로 커밋합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 와 `pnpm --filter @rebirth/web lint` 를 실행해 둘 다 종료코드 `0` 을 봅니다

## Phase 6. 첫 방문 행동 타일

- [x] `apps/web/components/home/home-screen.tsx:738-753` 의 지도 위 버튼을 행동 세 개로 늘립니다
  - [x] `우리 아이 찾기` 와 `다친 동물` 에 `발견동물 제보` 를 더해 `ContextualFloatingButton` 세 개로 만듭니다
  - [x] `HStack` 을 가로 스크롤로 두고 `width="fit-content"` 를 유지해 좁은 화면에서 겹치지 않게 합니다
  - [x] `apps/web/components/home/home-screen.tsx:786-790` 의 `FloatingActionButton` 라벨은 `제보하기` 그대로 두고 주석만 고칩니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/components/home/home-screen.tsx` 에 첫 방문에만 뜨는 안내 한 줄을 넣습니다
  - [x] `localStorage` 키 `rebirth:seen-intro` 를 `try` 로 감싸 읽고 없을 때만 지도 위 한 줄을 그립니다
  - [x] `동물을 봤거나 잃어버렸으면 여기서 시작해요` 한 줄을 안내 문구로 두고 버튼 위에 놓습니다
  - [x] `rebirth:seen-intro` 키를 버튼 셋 중 하나를 누를 때 쓰고 안내를 접는 처리를 더합니다
  - [x] `try` 블록 양쪽을 확인해 저장이 막힌 브라우저에서도 화면이 그려지게 합니다
- [x] `apps/web/components/mine/mine-screen.tsx:62-66` 의 행동 타일 셋을 홈 시트 머리로 옮겨 씁니다
  - [x] `apps/web/components/mine/mine-screen.tsx` 의 타일 정의를 `apps/web/components/home/` 에서 재사용할 수 있게 상수로 내보냅니다
  - [x] `apps/web/components/mine/mine-screen.tsx` 의 기존 타일 렌더는 그대로 두고 정의만 공유해 화면 변화 없음을 확인합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/components/home/nearby-list.tsx` 위 시트 머리에 행동 타일 셋을 그립니다
  - [x] `collapsed` 단계일 때만 타일 셋을 그려 목록 자리를 먹지 않게 합니다
  - [x] `apps/web/components/mine/mine-screen.tsx` 와 같은 아이콘을 쓰고 SEED 토큰만 씁니다
  - [x] `가까운 제보` 목록이 첫 행동 뒤에 머리로 올라오게 타일을 접습니다
  - [x] `pnpm --filter @rebirth/web lint` 를 실행해 종료코드 `0` 을 봅니다
- [x] `git add` 로 Phase 6 담당 경로만 담아 커밋합니다
  - [x] `git add apps/web/components/home apps/web/components/mine/mine-screen.tsx` 로 담습니다
  - [x] `feat: 첫 화면에 행동 타일 셋을 올려 서비스 목적이 먼저 읽히게 함` 으로 커밋합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 와 `pnpm --filter @rebirth/web lint` 를 실행해 둘 다 종료코드 `0` 을 봅니다

## Phase 7. 전단 QR 과 검색 유입 랜딩

- [x] `apps/web/package.json` 에 `qrcode` 의존성을 더합니다
  - [x] `pnpm --filter @rebirth/web add qrcode@^1.5.4` 를 실행합니다
  - [x] `pnpm --filter @rebirth/web add -D @types/qrcode` 를 실행합니다
  - [x] `git diff apps/web/package.json pnpm-lock.yaml` 로 두 파일만 바뀐 것을 확인합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/app/r/[id]/poster/page.tsx` 를 만들어 인쇄용 전단을 그립니다
  - [x] `lifecycle` 이 `searching` 이 아니면 `notFound()` 를 부르는 서버 컴포넌트로 실종 신고를 읽습니다
  - [x] `qrcode` 의 `toString` 으로 `/r/<id>` 주소를 SVG 문자열로 만들어 그대로 박습니다
  - [x] `A4` 한 장에 사진 한 장·이름·생김새·마지막 목격 지역명·QR 을 담고 정확 좌표를 넣지 않습니다
  - [x] `export const metadata = { robots: { index: false } }` 를 넣어 전단이 검색에 잡히지 않게 합니다
  - [x] `@media print` 로 배경과 여백만 손대고 색은 SEED 토큰에서 읽습니다
- [x] `apps/web/app/r/[id]/poster/page.tsx` 에 전단 진입 경로를 붙입니다
  - [x] `apps/web/components/lost/lost-owner-panel.tsx` 에 `전단 만들기` 링크를 더합니다
  - [x] `lifecycle` 이 `searching` 인 신고에만 링크가 보이게 분기합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/app/find/page.tsx` 를 만들어 검색 유입 랜딩 한 장을 그립니다
  - [x] `metadata` 에 `title` 과 `description` 을 넣어 검색 결과에 무엇을 하는 곳인지 드러냅니다
  - [x] `/lost/new` `/report` `/guide/injured` 세 링크를 큰 타일로 그립니다
  - [x] `/find` 아래에 이동 경로 추적 설명 세 문장을 두고 지도는 그리지 않아 첫 페인트를 가볍게 둡니다
  - [x] `pnpm --filter @rebirth/web lint` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/app/find/page.tsx` 에서 실종 신고 상세로 이어지는 길을 확인합니다
  - [x] `/find` 에서 `/search?kind=lost` 로 가는 링크 한 개를 더해 이름으로 찾는 길을 남깁니다
  - [x] `apps/web/app/layout.tsx` 의 내비게이션을 건드리지 않고 탭바에 `/find` 를 넣지 않습니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `git add` 로 Phase 7 담당 경로만 담아 커밋합니다
  - [x] `git add apps/web/package.json pnpm-lock.yaml apps/web/app/r/[id]/poster apps/web/app/find apps/web/components/lost/lost-owner-panel.tsx` 로 담습니다
  - [x] `feat: 실종 전단 QR 과 검색 유입 랜딩을 더함` 으로 커밋합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 와 `pnpm --filter @rebirth/web lint` 를 실행해 둘 다 종료코드 `0` 을 봅니다

## Phase 8. 공식 문서 보정

- [x] `.claude/docs/track-prediction.md` 의 `## 공식` 절을 보정한 다섯 줄로 바꿉니다
  - [x] `feasible = d / min(v_max × Δt, D_MAX)` 로 T1 을 고치고 `D_MAX` 값 세 개를 같은 줄에 적습니다
  - [x] `κ_eff = κ × n_leg / (n_leg + 1)` 을 T3 에 더하고 T4 중심식을 `κ_eff × v_eff × min(h, H_DRIFT) × û` 로 고칩니다
  - [x] `û` 를 다리 합벡터 방향으로 명시하고 `H_DRIFT = 8h` 를 T4 에 적습니다
  - [x] `grep -n "v_max × Δt)" .claude/docs/track-prediction.md` 를 실행해 보정 전 식이 `0건` 인 것을 확인합니다
- [x] `.claude/docs/track-prediction.md` 의 `## 설계 상수` 표에 새 상수와 근거를 더합니다
  - [x] `D_MAX_KM` `H_DRIFT_HOURS` `PHOTO_MIXED_FACTOR` `MIN_LEG_SIMILARITY` 네 줄을 코드블록에 정렬해 담습니다
  - [x] `추정` 표기를 측정하지 않은 값에 붙이고 상수마다 왜 그 값인지 한 줄을 적습니다
  - [x] `straightness index` `평균제곱변위` `Rayleigh 최빈 거리` 세 근거를 T3·T4·T5 옆에 한 줄씩 적습니다
  - [x] `grep -c "추정" .claude/docs/track-prediction.md` 를 실행해 1건 이상인 것을 확인합니다
- [x] `.claude/docs/track-prediction.md` 에 탐색 면적 축소 표를 넣습니다
  - [x] `v_max × h` 순진한 원 20.4km 1307km², 고정 2km 원 12.6km², T4 예측 원 1.03km 3.3km² 세 줄을 코드블록에 담습니다
  - [x] `더 빨리 찾음` 이라는 말을 쓰지 않고 확산 가정 아래의 값이라는 단서를 한 줄로 적습니다
  - [x] `소형` 과 `마지막 목격 6.8시간 전` 이라는 시연 데이터 조건을 같은 블록에 적습니다
- [x] `.claude/docs/track-prediction.md` 에 한계 절을 새로 넣습니다
  - [x] `## 한계` 절에 단일 사슬만 만들고 갈라지는 경로를 다루지 않는다는 한 줄을 적습니다
  - [x] `buildTrack` 의 탐욕 선택이라 앞 노드가 틀리면 뒤가 전부 밀린다는 한 줄을 적습니다
  - [x] `PHOTO_MIXED_FACTOR` 감쇠만 있어 두 개체를 한 경로로 합칠 수 있다는 한 줄을 적습니다
  - [x] `scoreMatch` 가 실종 지점·시각 기준이라 15km 14일 창 밖은 외형 유사도로만 들어온다는 한 줄을 적습니다
- [x] `.claude/docs/track-prediction.md` 의 사실 오류를 실측값으로 고칩니다
  - [x] `## 경로 신뢰도` 설명의 `가장 약한 고리` 문장을 점수는 최소, 이동성은 평균으로 고칩니다
  - [x] `pnpm --filter @rebirth/core test 2>&1 | grep "ℹ tests"` 로 실제 테스트 수를 읽어 `## 구현 위치` 아래 회귀 검증 문장을 고칩니다
  - [x] `## 함께 반영한 UX` 의 상태 어휘 줄을 Phase 3 이 실제로 바꾼 결과에 맞춰 고칩니다
  - [x] `## 구현 위치` 목록에 Phase 7 의 두 새 경로를 더합니다
- [x] `git add` 로 Phase 8 담당 경로만 담아 커밋합니다
  - [x] `git add .claude/docs/track-prediction.md` 로 한 파일만 담습니다
  - [x] `docs: 공식 보정과 한계를 반영해 이동 경로 문서를 고침` 으로 커밋합니다
  - [x] `git status --short` 를 실행해 `.claude/docs` 경로가 `0건` 인 것을 확인합니다

## Phase 9. 공유 카드 레이아웃

- [x] `apps/web/app/r/[id]/card/route.tsx:14` 의 `force-dynamic` 을 걷고 미리보기 캐시를 붙입니다
  - [x] `export const dynamic = "force-dynamic"` 을 `export const revalidate = 300` 으로 바꿉니다
  - [x] `ImageResponse` 반환에 `headers` 로 `설계 상수` 의 `Cache-Control` 값을 넣습니다
  - [x] `그 헤더 위에 카카오톡 미리보기 크롤러 타임아웃 회피` 한 줄 주석을 붙입니다
  - [x] `curl -sI "http://localhost:3000/r/<id>/card" | grep -i cache-control` 로 헤더가 실려 오는 것을 확인합니다
- [x] `apps/web/app/r/[id]/card/route.tsx:85-102` 의 `og` 갈래에 글자 띠를 올립니다
  - [x] `1200x630` 사진 위에 아래쪽 `180px` 반투명 띠를 겹치고 제목 한 줄과 사실 한 줄을 그립니다
  - [x] `제목은 이름 또는 상태, 사실 줄은 지역명과 생김새` 순으로 두고 좌표를 넣지 않습니다
  - [x] `brandCard` 폴백은 그대로 두어 사진 없는 제보가 로고 카드로 떨어지게 합니다
  - [x] `curl -so /tmp/og.png "http://localhost:3000/r/<id>/card" && file /tmp/og.png` 로 `PNG image data, 1200 x 630` 을 확인합니다
- [x] `apps/web/app/r/[id]/card/route.tsx:21` 의 `STORY_PHOTO_SHARE` 를 낮춰 안전 영역을 만듭니다
  - [x] `STORY_PHOTO_SHARE` 를 `0.56` 으로 바꾸고 `인스타그램 상하 UI 자리를 비우는 몫` 한 줄 주석을 붙입니다
  - [x] `PADDING` 과 별개로 위 `250px` 아래 `250px` 를 비우는 상수 두 개를 더합니다
  - [x] `글자 블록을 안전 영역 안으로 옮겨 답장 입력창에 문구가 가리지 않게 합니다`
  - [x] `curl -so /tmp/story.png "http://localhost:3000/r/<id>/card?ratio=story" && file /tmp/story.png` 로 `1080 x 1920` 을 확인합니다
- [x] `apps/web/app/r/[id]/card/route.tsx` 스토리 카드에 QR 을 박습니다
  - [x] `qrcode` 의 `toDataURL` 로 `/r/<id>` 주소를 만들어 아래 안전 영역 위쪽에 `180px` 크기로 그립니다
  - [x] `링크 스티커를 못 쓰는 계정도 카드만으로 닿게 하는 우회` 한 줄 주석을 붙입니다
  - [x] `QR 옆에 사진으로 찍어 열어 보세요` 한 줄을 작은 글자로 둡니다
  - [x] `curl -so /tmp/story.png "http://localhost:3000/r/<id>/card?ratio=story"` 로 종료코드 `0` 을 봅니다
- [x] `apps/web/app/r/[id]/card/route.tsx:131-148` 의 문구를 다섯 어휘로 맞춥니다
  - [x] `찾는 중 ${searchingDays(...)}일째` 를 `실종 ${searchingDays(...)}일째` 로 바꿉니다
  - [x] `찾았어요` 와 `끝난 신고` 를 `찾음` 으로 모으고 `CARE_LABEL` 참조를 `STATUS_LABEL` 로 바꿉니다
  - [x] `실종 신고는 발견동물 제보 라는 말을 카드에 쓰지 않게 갈래를 확인합니다`
  - [x] `grep -n "찾는 중 \|찾았어요" apps/web/app/r` 을 실행해 `0건` 인 것을 확인합니다
- [x] `git add` 로 Phase 9 담당 경로만 담아 커밋합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 와 `pnpm --filter @rebirth/web lint` 를 실행해 둘 다 종료코드 `0` 을 봅니다
  - [x] `git add "apps/web/app/r/[id]/card/route.tsx"` 로 한 파일만 담습니다
  - [x] `feat: 공유 카드에 글자 띠와 QR 을 넣고 스토리 안전 영역을 비움` 으로 커밋합니다
  - [x] `git status --short` 에 `apps/web/app/r` 경로가 `0건` 인 것을 확인합니다

## Phase 10. 링크 미리보기와 공유 사용성

- [x] `apps/web/app/r/[id]/page.tsx:44-104` 의 미리보기 메타를 손봅니다
  - [x] `CARE_LABEL` 참조를 `STATUS_LABEL` 로 바꾸고 `description` 의 다섯 어휘를 맞춥니다
  - [x] `twitter` 에 `images` 의 `alt` 를 더해 스크린리더와 크롤러가 같은 설명을 읽게 합니다
  - [x] `openGraph.images` 의 `url` 에 `?v=` 로 `report.updatedAt` 을 붙여 수정 뒤 미리보기가 갱신되게 합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/app/robots.ts` 를 만들어 색인 규칙을 한곳에 둡니다
  - [x] `rules` 에 `allow: "/"` 와 `disallow` 로 `/mine` `/lost/` `/api/` `/r/*/poster` 를 넣습니다
  - [x] `sitemap` 에 `${siteUrl}/sitemap.xml` 을 넣고 `host` 를 `siteUrl` 로 둡니다
  - [x] `관리 주소와 전단은 색인 대상이 아님` 한 줄 주석을 붙입니다
  - [x] `curl -s http://localhost:3000/robots.txt` 로 `Disallow: /mine` 이 있는 것을 확인합니다
- [x] `apps/web/app/sitemap.ts` 를 만들어 공개된 찾는 중 신고를 색인에 올립니다
  - [x] `findPublicReport` 대신 목록 질의로 `visibility = public` 이고 `lifecycle` 이 `searching` 또는 `active` 인 제보 id 를 읽습니다
  - [x] `/` `/find` `/reports` `/shelters` `/community` 고정 경로를 앞에 두고 제보 경로를 뒤에 붙입니다
  - [x] `lastModified` 는 `updatedAt` 을 쓰고 상한 `5000` 건으로 잘라 한 파일에 담습니다
  - [x] `curl -s http://localhost:3000/sitemap.xml | head -5` 로 `<urlset` 이 나오는 것을 확인합니다
- [x] `apps/web/app/manifest.ts` 를 만들어 홈 화면 추가와 공유 진입을 갖춥니다
  - [x] `name` `short_name` `start_url` `display: "standalone"` `background_color` `theme_color` 를 넣습니다
  - [x] `icons` 에 `public/logo/logo-mark-512.png` 를 `512x512` 로 넣고 `purpose: "maskable"` 항목을 더합니다
  - [x] `shortcuts` 에 `/report` 와 `/lost/new` 두 개를 넣어 홈 화면에서 곧장 열리게 합니다
  - [x] `curl -s http://localhost:3000/manifest.webmanifest | head -3` 로 `"name"` 이 나오는 것을 확인합니다
- [x] `apps/web/components/share/report-share.tsx:95-107` 의 공유 문구를 신고 갈래로 나눕니다
  - [x] `useReportShare` 입력에 `kind` 와 `petName` 을 더합니다
  - [x] `실종은 이름을 아는 신고면 몰리를 찾고 있어요` 형태로, 발견은 기존 문구로 갈래를 나눕니다
  - [x] `apps/web/components/report/report-detail.tsx` 와 `apps/web/components/lost/lost-detail.tsx` 의 호출부에 새 인자를 넘깁니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/components/share/report-share.tsx:34-52` 의 카드 미리 받기를 시트 열 때로 옮깁니다
  - [x] `useEffect` 의 즉시 `fetch` 를 `armCard()` 함수로 바꿔 공유 시트가 열릴 때 한 번만 부릅니다
  - [x] `ReportShareSheet` 의 `onOpenChange` 가 `true` 로 올 때 `armCard` 를 부르게 배선합니다
  - [x] `상세를 열기만 한 사람에게 카드 렌더를 돌리지 않는 비용 절감` 한 줄 주석을 붙입니다
  - [x] `pnpm --filter @rebirth/web lint` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/components/share/report-share.tsx` 에 데스크톱 폴백을 더합니다
  - [x] `navigator.canShare` 가 없으면 카드를 `a[download]` 로 내려 주는 갈래를 더합니다
  - [x] `내려받은 카드를 인스타그램에 올려 주세요` 안내를 스낵바로 띄웁니다
  - [x] `이 브라우저는 이미지 공유를 지원하지 않아요` 문구는 폴백이 실패했을 때만 남깁니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `apps/web/app/search/page.tsx` 와 `apps/web/app/reports/page.tsx` 의 메타를 채웁니다
  - [x] `apps/web/app/search/page.tsx` 에 `metadata` 를 더해 `title` 과 `description` 을 넣습니다
  - [x] `apps/web/app/reports/page.tsx:10` 의 `metadata` 에 `description` 과 `openGraph` 를 더합니다
  - [x] `robots` 를 두 화면 모두 막지 않아 검색 유입 경로로 남깁니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다
- [x] `git add` 로 Phase 10 담당 경로만 담아 커밋합니다
  - [x] `pnpm --filter @rebirth/web lint` 를 실행해 종료코드 `0` 을 봅니다
  - [x] `git add "apps/web/app/r/[id]/page.tsx" apps/web/app/robots.ts apps/web/app/sitemap.ts apps/web/app/manifest.ts apps/web/components/share apps/web/app/search apps/web/app/reports apps/web/components/report/report-detail.tsx apps/web/components/lost/lost-detail.tsx` 로 담습니다
  - [x] `feat: 링크 미리보기와 공유 문구를 신고 갈래로 나누고 색인 규칙을 더함` 으로 커밋합니다
  - [x] `pnpm --filter @rebirth/web typecheck` 를 실행해 종료코드 `0` 을 봅니다

## Phase 11. 공식 심사 기준 대응

- [x] `.claude/docs/track-prediction.md` 에 공식 심사 기준 표를 출처와 함께 넣습니다
  - [x] `예선 4기준 · 본선 4기준 · 80 대 20 · 배점 미공개` 를 코드블록 한 개에 정렬해 담습니다
  - [x] `설계 상수` 의 기준 출처 세 URL 을 같은 블록 마지막 줄에 적습니다
  - [x] `항목별 배점은 공개되지 않아 가중치를 가정하지 않음` 이라는 단서를 한 줄로 적습니다
  - [x] `grep -c "배점 미공개\|배점은 공개되지 않아" .claude/docs/track-prediction.md` 로 1건 이상인 것을 확인합니다
- [x] `.claude/docs/track-prediction.md` 에 예선 4기준마다 우리 답 한 줄을 적습니다
  - [x] `기획력` 에 목격자와 보호자 두 JTBD 문장과 게시판이 아닌 이동 추적 데이터라는 차별점을 적습니다
  - [x] `실현 가능성` 에 이미 배포된 주소와 Anthropic · Kakao 실호출 실측값을 적습니다
  - [x] `확장성` 에 T1 부터 T5 가 실종과 추적이 있는 어느 서비스에도 붙는 결정식이라는 것과 당근 SEED 채택 이유를 적습니다
  - [x] `AI 활용의 적절성` 에 사람이 못 하는 자리에만 모델을 쓰고 좌표와 개체 확정을 모델에 맡기지 않는다는 것을 적습니다
- [x] `.claude/docs/track-prediction.md` 에 본선 4기준마다 우리 답 한 줄을 적습니다
  - [x] `기획력` 과 `확장성` 은 예선 답을 그대로 가리키고 중복해 쓰지 않습니다
  - [x] `기술력` 에 결정식 5개 · 모델 해석 · pgvector 외형 유사도 · 격자 좌표 보호 네 가지를 적습니다
  - [x] `발표 전달력` 에 시연 대본 다섯 단계와 총 소요 초를 적습니다
  - [x] `grep -c "발표 전달력" .claude/docs/track-prediction.md` 로 1건 이상인 것을 확인합니다
- [x] `.claude/docs/track-prediction.md` 에 심사위원 5명의 예상 질문과 답을 적습니다
  - [x] `강정구` 는 라인맨 · 타파스 스케일업 이력 기준으로 시장 진입과 확장 질문, 답은 발생 시점 진입과 전단 QR 배포 경로로 적습니다
  - [x] `김호민` 은 스파크랩 선발 요건인 타겟 고객에게 MVP 를 팔아 본 경험 기준으로 실사용 질문, 답은 배포본 실사용 수치 실측으로 적습니다
  - [x] `김덕중` 은 강연 제목 `AI 의 진짜 효력은 기존 애플리케이션 사이에서 발생한다` 기준으로 워크플로 연결 질문, 답은 제보 · 매칭 · 경로 · 공유의 연결로 적습니다
  - [x] `조정석` 과 `정기수` 는 에이전트 설계와 도구 활용 방식 질문으로 두고 `조정석` 개인 이력은 미확인으로 표기합니다
  - [x] `grep -c "미확인" .claude/docs/track-prediction.md` 로 1건 이상인 것을 확인합니다
- [x] `.claude/docs/track-prediction.md` 에 제출 문안 4항목 초안을 적습니다
  - [x] `해결하려는 문제` 를 세 문장 이내로, 발견동물 제보와 실종 신고 어휘 규칙을 지켜 적습니다
  - [x] `AI 활용 방식` 을 사진 구조화 · 같은 개체 후보 판정 · 경로 해석 세 갈래로 적고 품종 단정과 개체 확정 금지를 명시합니다
  - [x] `사용한 AI 도구와 기술 스택` 에 `claude-sonnet-5` · `openai/text-embedding-3-small` · pgvector · Kakao Local 을 적고 코딩 도구는 도구 줄에만 적습니다
  - [x] `서비스 접속 링크` 에 배포 주소와 시연용 실종 신고 주소 하나를 적고 정확 좌표가 없는 주소인지 확인합니다
- [x] `.claude/docs/track-prediction.md` 에 시연 대본 다섯 단계를 적습니다
  - [x] `목격자 제보 한 장` 에서 시작해 `보호자 경로 화면` 으로 끝나는 순서를 코드블록에 담습니다
  - [x] `초` 단위로 각 단계 소요를 적어 발표 시간 안에 드는지 드러냅니다
  - [x] `공유 카드와 전단 QR` 을 마지막 단계에 넣어 확산 경로를 보여 줍니다
  - [x] `grep -c "시연 대본" .claude/docs/track-prediction.md` 로 1건인 것을 확인합니다
- [ ] `scripts/smoke.mjs` 를 만들어 심사 기간 링크 생존을 한 명령으로 확인합니다
  - [x] `NEXT_PUBLIC_SITE_URL` 을 읽어 `설계 상수` 의 스모크 대상 아홉 경로에 `fetch` 를 보내고 상태 코드를 한 줄씩 출력합니다
  - [x] `200` 이 아닌 경로가 하나라도 있으면 종료코드 `1` 로 끝내고 본문에 `Authentication Required` 가 있으면 배포 보호가 켜진 것으로 보고 같은 처리를 합니다
  - [x] `package.json` 루트 `scripts` 에 `"smoke": "node scripts/smoke.mjs"` 를 더합니다
  - [ ] `NEXT_PUBLIC_SITE_URL=https://re-birth.kr pnpm smoke` 를 실행해 종료코드 `0` 을 봅니다
- [x] `git add` 로 Phase 11 담당 경로만 담아 커밋합니다
  - [x] `git add .claude/docs/track-prediction.md scripts/smoke.mjs package.json` 로 담습니다
  - [x] `docs: 공식 심사 기준 대응과 제출 문안을 적고 심사 기간 스모크 스크립트를 더함` 으로 커밋합니다
  - [x] `git status --short` 에 `.claude/docs` 와 `scripts` 경로가 `0건` 인 것을 확인합니다

## Phase 12. 최종 게이트

- [x] `pnpm lint` 와 `pnpm typecheck` 를 전체 워크스페이스에서 다시 돌립니다
  - [x] `pnpm lint` 를 실행해 `Tasks: 2 successful, 2 total` 을 확인합니다
  - [x] `pnpm typecheck` 를 실행해 `Tasks: 5 successful, 5 total` 을 확인합니다
  - [x] `## 추가 항목` 에 실패한 패키지의 Phase 번호를 한 줄로 남기고 멈춥니다
- [x] `pnpm test` 로 전체 테스트를 돌려 기준선보다 늘어난 것을 확인합니다
  - [x] `pnpm test 2>&1 | grep -E "ℹ (tests|pass|fail)"` 로 `fail 0` 을 봅니다
  - [x] `@rebirth/core` 테스트 수가 104 보다 크고 `@rebirth/web` 이 8 보다 큰 것을 확인합니다
  - [x] `## 추가 항목` 에 사라진 테스트 이름을 한 줄로 남깁니다
- [x] `pnpm build` 로 전체 빌드를 돌립니다
  - [x] `pnpm build` 를 실행해 종료코드 `0` 을 봅니다
  - [x] `apps/web/app/find` `apps/web/app/r/[id]/poster` `robots.txt` `sitemap.xml` `manifest.webmanifest` 가 빌드 출력에 있는 것을 확인합니다
  - [x] `## 참고` 의 `### 실측 기록

- `apps/web/components/report/detail-photo-hero.tsx` 는 지도가 아니라 사진 0장 빈 상태 주제라 `4d601d4` 로 분리 커밋
- 지도 커밋 메시지를 지시서의 `feat: 예측 원에 이동 방향 화살표를 올림` 대신 실제 diff 에 맞춰 바꿈
- 스플래시 3파일은 Phase 0 진행 중 동시 세션이 `107a863` 으로 선점 커밋해 에이전트의 `git add` 는 빈 스테이지였음
- 새 브랜치가 `feat/unified-track-map` 을 upstream 으로 잡아 `git branch --unset-upstream` 으로 끊음
- Phase 0 기준선은 설계 상수와 일치. core 104 pass · web 8 pass · fail 0 · lint 2 tasks · typecheck 5 tasks` 에 새로 생긴 빌드 경고를 한 줄로 남깁니다
- [ ] `grep` 으로 정확 좌표 유출과 금지 어휘가 없는지 훑습니다
  - [x] `grep -rn "exactPoint" apps/web packages/core/src/matching` 을 실행해 새로 늘어난 참조가 `0건` 인 것을 확인합니다
  - [ ] `grep -rn "유기동물 판별\|AI 진단\|동일 개체 확정\|배회 중\|찾는 중 " apps/web/components apps/web/app` 을 실행해 `0건` 인 것을 확인합니다
  - [x] `grep -rn "말티즈" apps/web/components apps/web/app` 을 실행해 계열 추정 없이 쓰인 곳이 `0건` 인 것을 확인합니다
- [ ] `git status --short` 로 남은 변경을 논리 단위로 커밋하고 브랜치 상태를 확인합니다
  - [x] `git status --short` 를 실행해 미커밋 변경이 있으면 주제별로 나눠 커밋합니다
  - [x] `git log --oneline origin/develop..HEAD` 를 실행해 Phase 0 부터 Phase 11 의 커밋이 전부 있는 것을 확인합니다
  - [ ] `NEXT_PUBLIC_SITE_URL=https://re-birth.kr pnpm smoke` 를 실행해 아홉 경로가 `200` 인 것을 확인합니다
  - [x] `git status --short` 가 빈 줄이고 `pnpm test` 가 `fail 0` 인 것을 확인합니다

## 추가 항목

- [x] `straightnessEffective` 를 `packages/core/src/matching/index.ts` 에 export 하기

- [ ] Phase 12 통과 뒤 `playwright` 로 `m-01` 부터 `m-19` 와 신규 화면(`/find` `/r/[id]/poster` 경로 타임라인 두 겹 예측 원)을 다시 캡처하기
- [ ] `/Users/hahmjuntae/Desktop/rebirth-제출자료` 의 `card-share.png` 를 Phase 9 산출물로 다시 굽기
- [ ] `HERO-hero-16x9.png` 와 `HERO-hero-1x1.png` 를 새 커버 문구와 새 캡처로 다시 만들기
- [ ] `DECK-1` 부터 `DECK-5` 를 이동 경로 추적·공식·전단 QR 을 넣은 8장 구성으로 재구성해 다시 굽기
- [ ] `AI활용_문구.txt` 의 `AI 활용 방식 및 결과` 를 500자 상한 안에서 이동 경로 추적을 포함해 다시 쓰기
- [ ] 제출 폼 `해결하고자 한 문제` 와 `사용 AI툴 및 기술 스택` 문안을 Phase 11 초안에서 옮겨 쓰기
- [ ] 새 덱과 새 캡처에 `배회 중` `찾는 중` 등 Phase 3 금지 어휘가 남지 않았는지 눈으로 확인하기
- [ ] 커밋 `1d5ff9a` 의 제목을 `feat: 예측 원을 두 겹으로 그리고 화살표를 마지막 목격에서 시작하게 함` 으로 정정하기
- [x] `CARE_LABEL` 별칭을 `apps/web/lib/report-label.ts` 에서 제거하기. Phase 6·9·10 이 남은 4곳을 `STATUS_LABEL` 로 바꾼 뒤
- [x] `ReportCardItem.occurredAt` 을 필수로 올리고 생산자 6곳에 값을 넘기기. 지금은 선택이라 값이 없으면 실종 카드가 경과만 그림
- [x] `apps/web/components/lost/candidate-deck.tsx:37` 의 파일 지역 `CARE_LABEL` 상수를 `STATUS_LABEL` 로 바꾸기
- [ ] `MIN_LEG_SIMILARITY` 를 재측정하기. `0.82` 는 현재 임베딩 분포에서 승격 0건이라 유사도 경로가 동작하지 않음
- [x] `lost-detail.tsx` 가 신고 지점 좌표를 `TrackTimeline` 에 넘기기. 지금은 신고에서 첫 목격까지의 구간 요약이 빠짐
- [x] Phase 12 전체 빌드에서 `/` 번들 크기 확인하기. `home-screen` 이 `mine-screen` 모듈을 통째로 클라이언트 그래프에 끌어옴
- [ ] `mine-screen` 의 전이 import 에 `server-only` 를 붙이기. 지금은 `@rebirth/core/auth` 주석 언급뿐이라 클라이언트 번들 유입이 가능
- [x] `/find` 와 `/r/[id]/poster` 의 실제 렌더 스모크를 Phase 12 에서 돌리기. Phase 7 은 dev 서버 경합을 피해 건너뜀
- [ ] 전단 페이지에 인쇄 버튼을 넣을지 정하기. 지금은 사용자가 `Cmd+P` 를 눌러야 함
- [ ] `apps/admin/lib/labels.ts:24` 의 별도 `CARE_LABEL` 정의를 상태 어휘 단일 원천으로 합칠지 정하기. admin 4개 화면이 씀

- [ ] 제출 전 `develop` → `main` PR 을 올려 이동 경로 추적·`/find`·`robots`·`sitemap`·`manifest` 를 운영에 반영하기. 심사 기간 `2026-09-21` 이전
- [ ] 제출 전 `/Users/hahmjuntae/Desktop/rebirth-제출자료/AI활용_문구.txt` 를 문서의 472자 새 초안으로 교체하기
- [ ] 배포본 실사용 수치를 낼 집계 도구 붙이기. 본선 실사용 질문 답의 근거가 지금 없음
- [ ] 배포 환경에 `NEXT_PUBLIC_SITE_URL` 이 설정돼 있는지 확인하기. 미설정이면 전단 QR 에 `localhost:3000` 이 박힘
- [ ] `/r/[id]/poster` 의 `notFound()` 가 404 가 아니라 200 을 반환하는 것 고치기
## 참고

### 지시서 결함

- Phase 12 의 금지 어휘 grep 이 규칙을 지킨 부정문까지 잡음. `catalog-patterns.tsx:124` 의 `동일 개체 확정이 아니에요` 때문에 0건 달성이 불가능

- Phase 8 이 고치라는 `## 경로 신뢰도` 절이 문서에 없음. `가장 약한 고리` 문장은 `## 공식` 코드블록의 T2 헤더 줄이었음
- `MIN_LEG_SIMILARITY` 의 실제 위치는 `track-handlers.ts:34`. 지시서 설계 상수 표는 Phase 2 소관으로 적었음

- Phase 9 실측 행번호. 문구 갈래 `:131-148` 은 `route.tsx:107-145`. `:14` `:21` `:85-102` 도 실제 행과 어긋남

- Phase 10 이 `updatedAt` 을 `lastModified` 로 쓰라 했으나 `listPublicReports` 의 `publicReportColumns` 에 그 열이 없어 `createdAt` 을 씀

- Phase 6 실측 행번호. `home-screen.tsx:738-753` 은 736-753 · `786-790` 은 783-787 · `mine-screen.tsx:62-66` 은 61-66

- Phase 5 가 쓰라는 `track.legs` 가 웹 `TrackView` 에 없음. 노드 좌표·시각에 `distanceKm` 을 걸어 구간을 계산함

- Phase 2 의 `scored = true` 중위와 `scored = false` 상위 10% 사이에서 하한을 고르라는 전제가 성립하지 않음. 실측이 `0.5839` 와 `0.6140` 으로 역전
- Phase 2 실측 행번호. 노드 변환은 126-136 이 아니라 131-145, 응답부는 139-168 이 아니라 147-171

- Phase 3 의 `grep -rn "배회 중" apps/web` 0건 요구가 같은 Phase 가 지시한 주석 원문 `배회 중과 찾는 중 금지` 와 충돌해 1건이 남음
- Phase 4 실측 행번호. `184-219` 는 187-221 · `271-280` 은 304-311 · `370` 은 407. `257-270` 은 화살표가 아니라 GUESS 점선 블록이고 화살표는 292-302

- Phase 1 은 `pnpm --filter @rebirth/core lint` 를 전제하지 않았으나 core 에는 lint 스크립트가 없어 `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT` 로 끝남

- Phase 0 은 미커밋 변경 4개·현재 브랜치 `develop` 을 전제했으나 실제는 수정 6 + 미추적 2, 브랜치 `feat/unified-track-map`
- Phase 0 은 커밋 두 개를 전제했으나 주제가 셋이라 `107a863` 스플래시 · `10ffef6` 지도 · `4d601d4` 사진 세 개가 됨
- Phase 0 의 `git cherry-pick` 전제가 성립하지 않음. `origin/develop` 이 merge-base 라 `git switch -c` 분기로 4커밋을 그대로 실음

### 실측 기록

- `apps/web/components/report/detail-photo-hero.tsx` 는 지도가 아니라 사진 0장 빈 상태 주제라 `4d601d4` 로 분리 커밋
- 지도 커밋 메시지를 지시서의 `feat: 예측 원에 이동 방향 화살표를 올림` 대신 실제 diff 에 맞춰 바꿈
- 스플래시 3파일은 Phase 0 진행 중 동시 세션이 `107a863` 으로 선점 커밋해 에이전트의 `git add` 는 빈 스테이지였음
- 새 브랜치가 `feat/unified-track-map` 을 upstream 으로 잡아 `git branch --unset-upstream` 으로 끊음
- Phase 0 기준선은 설계 상수와 일치. core 104 pass · web 8 pass · fail 0 · lint 2 tasks · typecheck 5 tasks
- Phase 1 실측 행번호. `SIGMA_KM` 16-21 · `legFeasibility` 70-79 · `straightness` 145-158 · `predictNext` 161-208 · 테스트 import 4-12
- Phase 1 기존 테스트 4건이 새 공식에서 그대로 통과해 기대값 수정 없음. core 104 → 107 pass
- `H_DRIFT_HOURS` 는 `R_MAX_KM` 아래, `D_MAX_KM` 은 `SIGMA_KM` 아래에 둠
- `predictNext` 의 `lastLeg` 변수를 `track.legs.length === 0` 가드로 교체. 합벡터 전환으로 미사용이 됨
- Phase 1 테스트에 `북서(북km, 서km)` 헬퍼 1개 추가. 끝만 서쪽으로 꺾인 경로를 만들 수단
- Phase 3·4 가 같은 시각에 커밋해 `1d5ff9a` 가 Phase 3 제목으로 Phase 4 의 `track-map.tsx` 만 담음. Phase 3 실체는 `c63741f` 12파일, 잃은 작업 없음
- `apps/web/components/design/catalog-patterns.tsx:64` 의 `배회 중` 은 상태가 아니라 조건 태그 예시 항목이었음. 지시대로 `발견` 으로 바꿨으나 목록 성격과 어긋남
- `situationLine` 헬퍼 실제 시그니처. `sinceLabel(date, now)` · `urgencyHint(date, now)` · `densityLine({count, radiusKm})`, 문장은 `, ` 로 이음
- `lost-detail.tsx` `statusBadge` 반환형을 `... | null` 로 바꾸고 미사용 `name` 인자 제거. `closed` 는 배지를 그리지 않음
- `report-badges.tsx` 와 `report-list.tsx` 에 라벨이 빈 문자열이면 배지를 빼는 분기 추가. `unknown` 이 빈 값이 되며 생긴 빈 배지 방지
- SEED `Text` 는 `flexShrink` prop 을 받지 않아 `maxLines={1}` 로 대체
- `@rebirth/web` 테스트 8 → 9 pass
- Phase 4 화살표는 기존 DOM marker 방식을 유지하고 몸통은 GUESS 점선을 그대로 써 `clip-path` 로 머리만 남김
- Phase 4 가 조기 반환 정리에서 빠져 있던 GUESS 레이어 제거를 같이 고침. 재실행 시 `addSource` 중복 id 로 막히던 문제
- 유사도 분포 실측. `scored=true` n=8 p50 `0.5839` · `scored=false` n=5572 p90 `0.6140` · 전체 5580쌍 최대 `0.778`
- `MIN_LEG_SIMILARITY` 는 기본값 `0.82` 를 채택. 현재 데이터 최대값이 `0.778` 이라 승격 0건
- `match_scores` 16행 모두 `similarity` 가 null(실종 쪽 임베딩 없음). 기존 점수 경로 4행은 그대로 나오는 것을 SQL 로 확인
- `minSimilarity` 는 기존 시그니처 뒤 세 번째 인자. 호출부가 `track-handlers.ts` 한 곳뿐이라 선택 인자로 두지 않음
- 주석 `실측 분위수 기준` 이 comment-style 훅 금지어에 걸려 `유사도 분위수 기준` 으로 바꿈
- `@rebirth/core` 테스트 107 → 108 pass
- 타임라인은 `track-timeline.tsx` 로 이미 있었고 `lost-detail.tsx:257` 이 렌더 중이라 Phase 5 는 구간 요약만 더함
- Phase 5 실측 행번호. 상황 문구 블록 73-91 · 머리글 63-71. `bearingWord` 는 이미 있어 export 만 함
- `SHORTCUTS` 공유 방향은 `mine-screen`(서버) → `home-screen`(클라이언트). 역방향은 `use client` 경계에서 상수 접근이 막힘
- 발견동물 제보 단추 href 는 FAB 와 같은 `/report`, 아이콘은 `mine-screen` `SHORTCUTS` 와 같은 `IconCameraLine`
- 가로 스크롤은 `HStack` 에 `overflowX="auto"` 와 `width="fit-content"` 유지, `py="x2" bleedY="x2"` 로 그림자 잘림 방지
- `map-preview-card.tsx` 의 `CARE_LABEL` 교체로 `apps/web` 에 남은 참조는 `report-label.ts` 의 별칭 정의뿐
- 전단 사진은 서명 URL 이라 `next.config` `remotePatterns` 밖이고 `card/route.tsx` 와 같은 raw `img` 와 `eslint-disable` 을 씀
- `qrcode` 는 `@types` 가 named export 만 내어 `toString` 을 `qrToString` 으로 별칭 import 함
- 전단은 `AppFrame` 390px 폭 안이라 `@media print` 에서 `body *:has(.rebirth-poster)` 로 폭 제한을 품
- `qrcode ^1.5.4` 와 `@types/qrcode ^1.5.6` 설치. `Done in 1.3s using pnpm v11.0.9`
- `useReportShare` 에 `prefetch` 선택 인자 추가. 기본 `true` 라 `report-done.tsx` 는 종전대로, 상세 둘만 `prefetch: false`
- `ReportShareSheet` 의 `onOpenChange` 가 부모의 `setShareOpen(true)` 에서 호출되지 않아 상세 두 화면에 `openShare(next)` 한 함수를 두고 세 길을 모두 지나게 배선
- `manifest.ts` 는 JSON 이라 SEED CSS 변수를 못 읽어 `globals.css` 의 carrot 700 `#5ea740` 을 `design-system-allow:color` 로 적음
- 끝난 실종 신고의 미리보기 마무리 문구를 `가족을 만났어요` 에서 `<이름>이 집으로 돌아왔어요` 로 바꿈
- `sitemap.xml` loc 1414건(고정 5 + 제보). `robots.txt` 에 `Disallow: /mine` 확인
- `candidate-deck` 지역 `CARE_LABEL` 은 `unknown` 을 `확인 중` 으로 뒀고 `STATUS_LABEL` 은 빈 문자열이라 후자를 따름. `join` 앞에 `filter(Boolean)` 추가
- `occurredAt` 실제 생산자는 `app/page.tsx:32`(MapMarker)와 `app/mine/reports/report-page.ts:49`(MineReportItem). `home-screen.tsx` 와 `mine-report-list.tsx` 는 타입 별칭뿐
- `app/api/cards/route.ts` 는 반환 타입이 없어 `tsc` 가 잡지 않았으나 `recent-reports.tsx` 가 응답을 `ReportCardItem[]` 로 읽어 값을 함께 넣음
- 신고 지점 전달은 격자 스냅 좌표 `location.point` 만 씀. 화면 출력은 거리와 여덟 낱말 방향뿐
- 공유 카드 검증에 쓴 제보 id 는 `4d8acf95-9c53-46ec-bd0e-3895a62d5323`. dev 서버는 `PORT=3100` 으로 띄워 확인 후 내림
- `ImageResponseOptions` 가 `ResponseInit` 을 확장해 `new ImageResponse(el, { width, height, headers })` 가 Next 16.3.4 에서 동작
- OG 띠 제목은 이름만 두면 상태가 사라져 `name ? 이름 · 상태 : 상태` 로 둠
- 스토리 본문 높이가 595px 라 headline 68 → 52 · CTA 52 → 44 · 칩 34 → 28 로 낮춰야 QR 이 아래 안전 영역을 넘지 않음
- `STATUS_LABEL["unknown"]` 이 빈 문자열이라 공유 카드 배지를 조건부 렌더로 바꿔 빈 알약이 찍히지 않게 함
- T2 분모도 소스와 어긋나 있어 `min(v_max × Δt_i, D_MAX)` 로 함께 고침. 지시서 항목 밖이나 소스를 정본으로 삼음
- `track-review.test.ts` 는 7건이 아니라 8건
- `## 데이터와 안전` 첫 문단의 `공개된 찾는 중 신고` 를 `공개된 실종 신고` 로 고침
- `D_MAX_KM.unknown = 10` · `V_MAX_KMH.unknown = 4.5` · `SIGMA_KM.unknown = 0.38`
- 문서 `## 설계 상수` 는 표가 아니라 코드블록. 노션 블록 절약 규칙 유지
- 운영 `main` 은 `b34ec12` 로 이동 경로 추적이 아직 없음. `develop` 에만 있고 PR #85 가 열린 채 대기
- `re-birth.kr/r/<id>` 에 경로 섹션이 뜨지 않아 제출 링크가 최대 차별점을 보여 주지 못하는 상태
- 스모크 실패 4경로(`/find` `/robots.txt` `/sitemap.xml` `/manifest.webmanifest`)는 Phase 7·10 산출물이라 `main` 병합 전까지 404 가 정상
- 시연용 실종 신고는 `https://re-birth.kr/r/457847fe-4042-4419-9740-fdf10f0e6818`. 응답 본문에 `exactPoint` 0건·소수점 5자리 좌표 0건 확인
- `AI 활용 방식 및 결과` 새 초안은 472자로 500자 상한 안. 시연 대본 다섯 단계 합계 165초
- 배포본 실사용 수치는 집계 도구가 없어 미측정. 김호민 예상 질문 답에 미측정으로 적음
- 전체 `pnpm build` 가 이 작업에서 처음 돌았고 `EXIT=0`, 신규 경고 0건
- Phase 6 번들 우려는 사실이 아님. Turbopack 이 `mine-screen` 전용 상수를 트리셰이킹해 `/` 청크에 없음
- Next.js 16 빌드 출력에 First Load JS 열이 없음. 번들 확인은 서빙 HTML 의 script 합산으로 해야 함
- 서빙 HTML script 합산 실측. `/` 590.0 KiB gz · `/reports` 308.2 · `/mine` 225.8 · `/support` 209.0 · `/find` 207.5
- `/` 의 무게는 maplibre-gl 단일 청크 980 KiB 가 지배
- 로컬 `pnpm start`(3100) 스모크에서 아홉 경로 전부 `200`, `total 9 · fail 0`
- `/r/[id]/poster` 실렌더 확인. 200x200 QR SVG · `실종` 라벨 · 지역명까지만 · `흰색 소형견`
- 공개 신고 20건 중 `lost/searching` 은 2건. 나머지 18건은 `sighting/active` 라 전단 대상이 좁음
- `/find` 실렌더 확인. 행동 타일 셋 · 이동 경로 추적 설명 · 이름으로 실종 신고 찾기 모두 출력
