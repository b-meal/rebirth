# 다시집 · REBIRTH

길에서 만난 보호자 없는 반려동물을 사진 한 장으로 30초 안에 제보하고, AI가 외형 정보를 구조화해 보호자와 지역사회에 안전하게 연결하는 모바일 웹앱입니다.

Wanted AI Championship 2026 출품작입니다.

## 현재 상태

기획 완료, 구현 착수 전입니다. 배포 URL은 확보되면 이 항목에 적습니다.

## 문서

| 문서 | 내용 |
|---|---|
| `docs/PRD.md` | 문제 정의, 대상 사용자, P0/P1 범위, AI 출력 스키마 |
| `docs/ARCHITECTURE.md` | 기술 스택, 데이터 모델, 매칭 산식, 위치 보호 규칙 |
| `docs/SCHEDULE.md` | 09-08부터 09-20까지 날짜별 계획과 역할 분담 |
| `docs/DECISIONS.md` | 스택과 모델 선택 근거 |
| `docs/DAILY_LOG.md` | 날짜별 완료·미완·다음 작업 |
| `CONTRIBUTING.md` | 브랜치 전략, 커밋 규칙, PR 규칙 |

## 기술 스택

Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS 4 · shadcn/ui · Supabase Postgres(PostGIS, pgvector) · Supabase Storage · Drizzle ORM · Vercel · Anthropic `claude-sonnet-5`

## 라이선스

MIT
