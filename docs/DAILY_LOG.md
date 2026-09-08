# 작업 로그

매일 22:00에 당일 담당자가 갱신합니다. 완료하지 않은 항목은 완료로 적지 않습니다.

## 2026-09-08 화

### 완료

- `b-meal/rebirth` 저장소 생성, public, 기본 브랜치 `develop`
- `main` 브랜치 보호: PR 필수, 승인 1명, force push·삭제 금지, 선형 히스토리, 대화 해결 필수
- `develop` 브랜치 보호: PR 필수, 승인 0명, force push·삭제 금지, 선형 히스토리
- 병합 정책: squash 전용, 병합 후 브랜치 자동 삭제
- 기획 문서 작성: `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/SCHEDULE.md`, `docs/DECISIONS.md`
- 규칙 문서 작성: `CONTRIBUTING.md`, `CLAUDE.md`

### 결정

- 서비스명 다시집, 코드명 REBIRTH
- 백지에서 Next.js 15 재구축, 기존 vinext 구현은 참고만
- Vercel + Supabase(PostGIS, pgvector, Storage)
- 비전 모델 `claude-sonnet-5`, 비용 상한 5만 원
- 매칭 v1은 이미지 임베딩 없이 규칙 기반 점수

### 미완

- 원티드 AI 챔피언십 참가 접수 상태 미확인
- 팀원 2명 조직 초대 수락 대기
- Anthropic, Supabase, 카카오 API 키 미발급
- Next.js 스캐폴딩 미착수

### 다음 작업

1. 참가 접수 완료 확인
2. Next.js 15 스캐폴딩과 CI 워크플로 추가
3. Supabase 프로젝트 생성과 스키마 마이그레이션
