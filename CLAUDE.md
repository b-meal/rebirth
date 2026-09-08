# REBIRTH 프로젝트 규칙

서비스명은 다시집, 코드명은 REBIRTH입니다. Wanted AI Championship 2026 출품작이며 제출 마감은 2026-09-20 23:59:59 KST입니다.

## 문서는 노션에만 작성

이 저장소에 문서를 마크다운 파일로 만들지 않습니다. PRD, ADR, 결정 기록, 작업 로그, 일정, 아키텍처, 회의록, 리서치, 제출 자료를 포함한 모든 문서의 단일 원천은 노션입니다.

노션 루트: https://app.notion.com/p/PRD-3d5ca900ab2080c4a36aeff61dbc47a2

`.claude/hooks/block-markdown-docs.mjs`가 PreToolUse에서 Write, Edit, NotebookEdit의 대상 경로와 Bash의 리다이렉션, tee, touch, sed -i 를 검사해 차단합니다. 저장소에서 허용되는 마크다운은 하네스 문서뿐입니다.

### 노션 블록 절약

무료 팀 워크스페이스는 1,000블록이 상한입니다. 유료 플랜은 쓰지 않습니다. 표는 한 행이 한 블록이라 금방 찹니다.

| 쓰는 것 | 대신 |
|---|---|
| 항목이 3개 이상인 목록·표 | 코드블록 하나에 정렬해 담음. 블록 1개 |
| 나열형 설명 | 문단 하나로 이어 씀 |
| 표 | 비교가 핵심인 3열 이하에만. 5행을 넘기지 않음 |
| 불릿 목록 | 문단. 불릿 1개가 블록 1개 |

새 문서를 만들기 전에 기존 페이지에 섹션으로 붙일 수 있는지 먼저 봅니다. 페이지가 늘수록 헤딩과 문단이 따라 늘어납니다.

| 허용 | 용도 |
|---|---|
| `CLAUDE.md`, `CLAUDE.local.md` | Claude Code가 자동으로 읽는 프로젝트 규칙 |
| `AGENTS.md` | 에이전트 규칙 |
| `.claude/**` | skill, agent, command 정의 |
| `.github` 이슈·PR 템플릿 | GitHub 기능 설정 |
| `.cursor/**`, `.codex/**` | 다른 도구의 규칙 파일 |

## 스택

Next.js 16 App Router · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase Postgres(PostGIS, pgvector) · Supabase Storage · Drizzle ORM · Vercel · Anthropic `claude-sonnet-5`

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

## 코드 컨벤션

- 파일명은 kebab-case, 컴포넌트는 PascalCase, 훅은 `use` 접두사입니다.
- 서버 전용 모듈은 `server-only`를 import해 클라이언트 번들 유입을 막습니다.
- API 입력은 zod로 검증하고 실패 시 400과 필드별 메시지를 반환합니다.
- 주석은 한 줄, 명사형 종결, 마침표 없이 씁니다. 식별자가 이미 말하는 내용은 주석으로 쓰지 않습니다.

## 브랜치와 병합

`develop`이 기본 브랜치입니다. 작업 브랜치는 `develop`에서 파생합니다.

| 브랜치 | 보호 |
|---|---|
| `main` | PR 필수, 승인 1명, force push·삭제 금지, 선형 히스토리 |
| `develop` | PR 필수, 승인 0명, force push·삭제 금지, 선형 히스토리 |

병합은 rebase merge만 허용합니다. squash는 GitHub이 서버에서 커밋을 새로 만들면서 author를 프로필 표시명으로 바꾸기 때문에 비활성화했습니다. 작업 브랜치의 커밋이 그대로 쌓이므로 커밋 단위를 깔끔하게 유지합니다.

커밋 메시지는 Conventional Commits를 따르고 본문은 한국어로 씁니다.

```
feat: 제보 상세 페이지 추가
fix: 위치 권한 거부 시 폼이 멈추는 문제 수정
chore: Drizzle 마이그레이션 생성
```

## 범위 관리

새 기능 아이디어는 먼저 노션 PRD의 P0 완료 여부를 확인한 뒤 P1 목록에 넣습니다. P0가 끝나기 전에 P1을 시작하지 않습니다.
