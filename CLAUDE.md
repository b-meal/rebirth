# REBIRTH 프로젝트 규칙

서비스명은 다시집, 코드명은 REBIRTH입니다. Wanted AI Championship 2026 출품작이며 제출 마감은 2026-09-20 23:59:59 KST입니다.

작업 전 `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/SCHEDULE.md`를 읽습니다. 결정을 바꿀 때는 `docs/DECISIONS.md`에 항목을 추가합니다.

## 스택

Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase Postgres(PostGIS, pgvector) · Supabase Storage · Drizzle ORM · Vercel · Anthropic `claude-sonnet-5`

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

## 브랜치

`develop`이 기본 브랜치입니다. 작업 브랜치는 `develop`에서 파생해 squash로 병합합니다. 상세 규칙은 `CONTRIBUTING.md`에 있습니다.

## 범위 관리

새 기능 아이디어는 먼저 `docs/PRD.md`의 P0 완료 여부를 확인한 뒤 P1 목록에 넣습니다. P0가 끝나기 전에 P1을 시작하지 않습니다.
