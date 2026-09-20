# REBIRTH 프로젝트 규칙

서비스명은 다시집, 코드명은 REBIRTH입니다. Wanted AI Championship 2026 출품작이며 제출 마감은 2026-09-20 23:59:59 KST입니다.

## 문서는 노션에만 작성

이 저장소에 문서를 마크다운 파일로 만들지 않습니다. PRD, ADR, 결정 기록, 작업 로그, 일정, 아키텍처, 회의록, 리서치, 제출 자료를 포함한 모든 문서의 단일 원천은 노션입니다.

노션 루트: https://app.notion.com/p/PRD-3d5ca900ab2080c4a36aeff61dbc47a2

`.claude/hooks/block-markdown-docs.mjs`가 PreToolUse에서 Write, Edit, NotebookEdit의 대상 경로와 Bash의 리다이렉션, tee, touch, sed -i 를 검사해 차단합니다. 저장소에서 허용되는 마크다운은 하네스 문서뿐입니다.

새 문서를 만들기 전에 기존 페이지에 섹션으로 붙일 수 있는지 먼저 봅니다. 문서가 흩어지면 어디를 봐야 하는지 알 수 없습니다.

### 노션 블록 절약

무료 팀 워크스페이스는 1,000블록이 상한입니다. 유료 플랜은 쓰지 않습니다. 표는 한 행이 한 블록이라 금방 찹니다.

| 쓰는 것 | 대신 |
|---|---|
| 항목이 3개 이상인 목록·표 | 코드블록 하나에 정렬해 담음. 블록 1개 |
| 나열형 설명 | 문단 하나로 이어 씀 |
| 표 | 비교가 핵심인 3열 이하에만. 5행을 넘기지 않음 |
| 불릿 목록 | 문단. 불릿 1개가 블록 1개 |

| 허용 | 용도 |
|---|---|
| `CLAUDE.md`, `CLAUDE.local.md` | Claude Code가 자동으로 읽는 프로젝트 규칙 |
| `AGENTS.md` | 에이전트 규칙 |
| `.claude/**` | skill, agent, command 정의 |
| `.github` 이슈·PR 템플릿 | GitHub 기능 설정 |
| `.cursor/**`, `.codex/**` | 다른 도구의 규칙 파일 |

## 스택

Next.js 16 App Router · React 19 · TypeScript · web 은 SEED(`@seed-design/react`) · admin 은 shadcn/ui(Tailwind v4) · Supabase Postgres(PostGIS, pgvector) · Supabase Storage · Drizzle ORM · Vercel · Anthropic `claude-sonnet-5`

## 검증

변경 후 아래를 실행합니다.

```bash
pnpm lint
pnpm typecheck
pnpm build
```

API를 건드렸다면 정상 경로와 오류 경로를 모두 호출해 확인합니다.

## 절대 규칙

| 규칙 | 이유 |
|---|---|
| 문서를 마크다운으로 만들지 않고 노션에 작성 | 문서 단일 원천 유지 |
| 정확 좌표를 공개 API 응답, UI, 공유 카드에 넣지 않음 | 발견 동물과 제보자 보호 |
| API 키를 코드·커밋·로그·문서에 넣지 않음 | 저장소가 public |
| 기존 마이그레이션을 수정하지 않고 새로 추가 | 배포된 스키마 일관성 |
| 실제 AI 연결 전 완료로 표시하지 않음 | 제출 자료 사실성 |
| 품종을 단정하지 않음 | 오판 시 신뢰 손상 |
| 개체 동일성을 확정하지 않음, 확인할 후보로 표기 | 허위 매칭 방지 |

## 제품 언어

| 금지 | 사용 |
|---|---|
| 유기동물 판별 | 발견동물 제보 |
| 말티즈 | 흰색 소형견, 말티즈 계열 추정 |
| 동일 개체 확정 | 확인할 후보 |
| AI 진단 | AI 초안, 수정 가능 |
| 배회 중, 찾는 중 | 발견 |
| 찾음, 가족을 만났어요 | 집으로 돌아옴 |

화면에 나가는 상태 어휘는 `apps/web/lib/report-label.ts` 의 `STATUS_LABEL` 이 단일 원천입니다. 실종·발견·보호 중·집으로 돌아옴 네 개만 쓰고 `unknown` 은 빈 문자열이라 배지가 붙지 않습니다. 금지어 표의 배회 중, 찾는 중 은 상태를 가리키는 자리에 적용합니다. 찾는 중인 신고 처럼 문장 안에서 무엇을 가리키는지 꾸미는 말은 그대로 씁니다. 한 종류만 담는 탭 안에서는 탭 이름을 배지로 되풀이하지 않습니다.

이 규칙은 `apps/web/lib/report-label.test.ts` 가 지킵니다. 금지어가 `STATUS_LABEL` 에 들어오면 테스트가 깨집니다. 문서만 고치면 병합 한 번에 되돌아가므로 어휘를 바꿀 때는 테스트도 함께 고칩니다.

제보 폼에서 고르는 문구와 admin 표는 `packages/types/src/labels.ts` 를 씁니다. 폼은 1인칭이라 `CARE_INPUT_LABEL` 의 길에 있음, 내가 보호 중 을 그대로 내고, 저장 뒤 목록 배지는 `STATUS_LABEL` 의 발견, 보호 중 이 됩니다. 두 층은 말하는 사람이 달라 문구가 같지 않아도 되지만 가리키는 값은 같아야 합니다.

품종 규칙은 추정값에 적용합니다. 보호자가 `pets` 에 직접 적은 품종은 추정이 아니므로 실종 신고 화면에서 계열 추정을 붙이지 않고 그대로 씁니다. AI 가 채운 `reports.breed_guess` 와 발견 제보는 계열 추정 표기를 그대로 지킵니다.

실종 신고 화면은 보호자가 주인공입니다. 발견자 쪽 말인 가족을 찾았어요 를 쓰지 않고, 이름을 아는 신고는 몰리를 찾고 있어요 처럼 이름으로 부릅니다. 내 신고를 내가 열었을 때는 보호자가 대신 내가 로 씁니다.

## 디자인 시스템

`apps/admin` 은 shadcn/ui 를 씁니다. 무채색 한 벌에 `--radius: 0`, 차트 색도 `--chart-1`~`--chart-5` 가 전부 회색 단계입니다. 컴포넌트는 `pnpm dlx shadcn@latest add <이름>` 으로 받아 `apps/admin/components/ui` 에 둡니다. 유채색은 `--destructive` 한 곳에만 씁니다.

`apps/web` 의 UI 단일 원천은 당근 SEED 하나입니다. 자체 디자인 시스템을 만들지 않고 컴포넌트와 토큰을 모두 SEED 에서 가져옵니다.

| 대상 | 위치 |
|---|---|
| 컴포넌트 | `apps/web/seed-design/ui/*` |
| 레이아웃과 타이포 | `@seed-design/react` |
| 토큰 | `@seed-design/css/vars` |
| 아이콘 | `@karrotmarket/react-monochrome-icon` |
| 앱 전용 껍데기 | `apps/web/components/ui` |

`apps/web/seed-design/**` 은 SEED CLI 가 내려받은 원본이라 직접 고치지 않습니다. 없는 컴포넌트는 손으로 만들기 전에 레지스트리에서 찾아 내려받습니다.

```bash
pnpm --filter @rebirth/web exec npx @seed-design/cli@latest add ui:<이름>
```

규칙 전문은 `.claude/DESIGN.md`, 탐색 절차는 `.claude/skills/seed-design` 입니다. `.claude/hooks/enforce-design-system.mjs` 가 PreToolUse 에서 하드코딩과 다른 UI 라이브러리 유입을 차단하고, 토큰 이름은 설치된 `@seed-design/css` 에서 읽어 검사합니다.

문서는 llms.txt 가 단일 원천입니다. 전체는 `https://seed-design.io/llms.txt`, React 는 `https://seed-design.io/react/llms.txt` 이고 `.mcp.json` 의 `seed-docs` 서버로도 같은 내용을 조회합니다. 값은 `/design` 화면에서 눈으로 확인합니다.

## 코드 컨벤션

- 파일명은 kebab-case, 컴포넌트는 PascalCase, 훅은 `use` 접두사입니다.
- 서버 전용 모듈은 `server-only`를 import해 클라이언트 번들 유입을 막습니다.
- API 입력은 zod로 검증하고 실패 시 400과 필드별 메시지를 반환합니다.
- 주석은 한 줄, 명사형 종결, 마침표 없이 씁니다. 식별자가 이미 말하는 내용은 주석으로 쓰지 않습니다.

## 브랜치와 병합

`develop`이 기본 브랜치입니다. 작업 브랜치는 `develop`에서 파생합니다.

| 브랜치 | 보호 |
|---|---|
| `main` | PR 필수, 승인 1명, force push·삭제 금지, 관리자 예외 없음 |
| `develop` | PR 필수, 승인 0명, force push·삭제 금지, 관리자 예외 없음 |

두 브랜치 모두 관리자 예외가 없습니다. 계정 소유자도 PR 없이 push할 수 없습니다.

병합은 merge commit만 허용합니다. rebase와 squash는 비활성화했고 선형 히스토리 규칙도 껐습니다. 어떤 PR이 언제 들어왔는지 git 히스토리만 보고 알 수 있어야 하고, 되돌릴 때 머지 커밋 하나만 revert하면 됩니다. squash를 쓰지 않는 이유는 GitHub이 서버에서 커밋을 새로 만들면서 author를 프로필 표시명으로 바꾸기 때문입니다. merge commit은 원본 커밋을 그대로 두므로 author가 보존됩니다. 작업 브랜치의 커밋이 그대로 쌓이므로 커밋 단위를 깔끔하게 유지합니다.

커밋 메시지는 Conventional Commits를 따르고 본문은 한국어로 씁니다.

```
feat: 제보 상세 페이지 추가
fix: 위치 권한 거부 시 폼이 멈추는 문제 수정
chore: Drizzle 마이그레이션 생성
```

### 커밋과 PR 설명은 불릿 요약

커밋 본문과 PR 본문은 산문 대신 `- ` 불릿 목록으로 씁니다. 한 줄이 한 항목이고 무엇을 왜 했는지 한 문장으로 끝냅니다. 문단으로 풀어 쓰지 않습니다.

```
feat: 보호 상황 열 추가

- 제보 1단계 필수 입력인 보호 상황을 care_situation 열로 분리
- condition_tags 에 섞으면 4단계 마무리 문구를 분기할 수 없어 열로 둠
- 값은 roaming, in_care, unknown. 실종 신고는 unknown
- 마이그레이션 0003 은 enum 생성과 NOT NULL DEFAULT 열 추가뿐
```

PR 본문도 같습니다. 절이 필요하면 `## 제목` 아래에 불릿을 놓고, 검증 결과와 남은 일도 불릿으로 적습니다. 코드블록과 표는 값을 나열할 때만 씁니다.

### 작업 하나가 끝나면 바로 커밋

한 가지를 끝낼 때마다 커밋합니다. 여러 주제를 쌓아 두었다가 한 번에 올리지 않습니다. 커밋하지 않은 변경이 남은 채로 다음 주제를 시작하지 않습니다.

| 시점 | 할 일 |
|---|---|
| 한 주제를 끝냈을 때 | `pnpm lint` `pnpm typecheck` `pnpm build` 를 돌리고 통과하면 커밋 |
| 여러 주제를 손댔을 때 | 주제별로 `git add <파일>` 해서 나눠 커밋 |
| 사용자가 푸시를 지시했을 때 | 작업 브랜치에 push, `main` 과 `develop` 은 PR 로만 |

한 커밋은 한 주제입니다. 화면 하나, 버그 하나, 규칙 하나. 한 파일에 두 주제가 섞여 나눌 수 없으면 커밋 본문 마지막 불릿에 그 사실을 적습니다.

검증을 통과하지 못한 변경은 커밋하지 않습니다. 되돌릴 지점이 있어야 다음 시도를 마음 놓고 합니다.

### 배포는 PR 로만

`vercel deploy` 와 `vercel promote` 로 손에서 곧장 올리지 않습니다. 무엇이 언제 올라갔는지 git 히스토리에 남지 않고, 되돌릴 때 머지 커밋 하나를 revert 하는 길도 사라집니다.

| 상황 | 할 일 |
|---|---|
| 작업이 끝났을 때 | `develop` 으로 PR |
| 폰이나 남에게 보여 줄 때 | PR 에 달리는 Preview 배포 주소 |
| Production 반영 | `main` 으로 PR, 승인 1명 |

Vercel CLI 로 직접 올리는 것은 PR 로는 만들 수 없는 상황을, 사용자가 그 상황을 알고 지시했을 때만 합니다. 한 번 지시받았다고 다음 배포까지 이어지지 않습니다.

## 범위 관리

새 기능 아이디어는 먼저 노션 PRD의 P0 완료 여부를 확인한 뒤 P1 목록에 넣습니다. P0가 끝나기 전에 P1을 시작하지 않습니다.
