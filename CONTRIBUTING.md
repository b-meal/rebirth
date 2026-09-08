# 기여 규칙

## 브랜치 전략

| 브랜치 | 역할 | 보호 |
|---|---|---|
| `main` | 배포 기준. 태그를 붙인 안정 버전만 반영 | PR 필수, 승인 1명, force push·삭제 금지, 선형 히스토리 |
| `develop` | 통합 브랜치. 기본 브랜치이자 모든 작업의 base | PR 필수, 승인 0명, force push·삭제 금지, 선형 히스토리 |
| `feat/*` `fix/*` `docs/*` `chore/*` | 작업 브랜치 | 없음 |

작업 브랜치는 `develop`에서 파생하고 `develop`으로 병합합니다. 병합은 squash만 허용하며 병합 후 브랜치는 자동 삭제됩니다.

```bash
git checkout develop && git pull
git checkout -b feat/analyze-api
# 작업
gh pr create --base develop --fill
```

## 커밋 메시지

Conventional Commits를 따르고 본문은 한국어로 씁니다.

```
feat: 제보 상세 페이지 추가
fix: 위치 권한 거부 시 폼이 멈추는 문제 수정
docs: 매칭 점수 산식 문서화
chore: Drizzle 마이그레이션 생성
```

| 타입 | 용도 |
|---|---|
| `feat` | 기능 추가 |
| `fix` | 버그 수정 |
| `docs` | 문서 |
| `refactor` | 동작 변화 없는 구조 변경 |
| `test` | 테스트 |
| `chore` | 빌드, 설정, 의존성 |

## PR 규칙

- 하나의 PR은 하나의 논리 단위입니다.
- 제목은 커밋 메시지와 같은 형식을 씁니다.
- 본문에 변경 이유, 확인 방법, 관련 이슈 번호를 적습니다.
- CI가 통과해야 병합합니다.
- `main`으로 가는 PR은 팀원 1명의 승인이 필요합니다.

## 로컬 검증

병합 전 아래를 모두 통과해야 합니다.

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## 금지 사항

- API 키와 credential을 코드, 커밋, 로그, 문서에 넣지 않습니다.
- 기존 마이그레이션 파일을 수정하지 않고 새 마이그레이션을 추가합니다.
- 정확한 좌표를 공개 API 응답에 포함하지 않습니다.
- 실제 AI가 연결되기 전에 완료로 표시하거나 제출 문서에 주장하지 않습니다.
