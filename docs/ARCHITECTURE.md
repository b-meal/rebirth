# 아키텍처

Next.js App Router 단일 애플리케이션을 Vercel에 배포하고, 데이터와 파일은 Supabase가 담당합니다.

## 기술 스택

| 계층 | 선택 | 근거 |
|---|---|---|
| 프레임워크 | Next.js 15 App Router, React 19, TypeScript | Server Actions와 Route Handler로 API를 한 저장소에서 관리 |
| 스타일 | Tailwind CSS 4, shadcn/ui | 모바일 우선 컴포넌트를 빠르게 구성 |
| 배포 | Vercel | Preview 배포로 PR마다 심사 가능한 URL 확보 |
| 데이터베이스 | Supabase Postgres + PostGIS | 반경 검색과 거리 정렬을 SQL 한 줄로 처리 |
| 벡터 | pgvector | 이미지 임베딩 유사도, P1 확장 여지 |
| 스토리지 | Supabase Storage | 원본 사진 비공개 버킷, 서명 URL로 노출 |
| ORM | Drizzle ORM + drizzle-kit | 마이그레이션 SQL을 직접 검토 |
| 비전 분석 | Anthropic `claude-sonnet-5` | 구조화 출력과 한국어 설명 품질 |
| 역지오코딩 | 카카오 로컬 API | 국내 주소 정확도, 무료 한도 충분 |

## 데이터 흐름

```
[모바일 브라우저]
  사진 촬영 → 클라이언트 리사이즈(장변 1568px) → EXIF 제거
      │
      ├─ POST /api/analyze ──→ Anthropic Messages API (structured output)
      │                         ← animalType, color, size, condition, warnings
      │
      ├─ Geolocation API → POST /api/geocode → 카카오 로컬 API → 행정동명
      │
      └─ POST /api/reports ─→ Supabase Storage(원본) + Postgres(메타)
                                 │
                                 └→ GET /api/reports        공개 목록, 좌표 제외
                                    GET /r/[id]             제보 상세, OG 메타
                                    POST /api/lost          실종 신고 등록
                                    GET /api/lost/[id]/matches  후보 + 근거
```

## 데이터 모델

### `sightings` 목격 제보

| 컬럼 | 타입 | 공개 | 비고 |
|---|---|---|---|
| `id` | uuid | 예 | 상세 URL 식별자 |
| `photo_path` | text | 아니오 | Storage 경로, 서명 URL로만 노출 |
| `animal_type` | text | 예 | `dog` `cat` `other` `unknown` |
| `appearance` | text | 예 | 외형 요약 |
| `colors` | text[] | 예 | 털색 태그 |
| `size` | text | 예 | `small` `medium` `large` `unknown` |
| `condition_tags` | text[] | 예 | 배회 중, 다친 것 같음 등 |
| `collar` | boolean | 예 | 목줄·하네스 |
| `injury` | boolean | 예 | 눈에 보이는 부상 |
| `ear_tip` | boolean | 예 | 귀 끝 절단 |
| `exact_point` | geography(Point) | 아니오 | 정확 좌표, 공개 응답에서 제외 |
| `coarse_point` | geography(Point) | 예 | 300m 격자 스냅 좌표 |
| `area_name` | text | 예 | 행정동명 |
| `ai_raw` | jsonb | 아니오 | 모델 원본 응답, 평가용 |
| `ai_edited_fields` | text[] | 아니오 | 사용자가 수정한 필드, 정확도 측정용 |
| `status` | text | 예 | `open` `matched` `hidden` |
| `sighted_at` | timestamptz | 예 | 목격 시각 |
| `created_at` | timestamptz | 예 | 생성 시각 |

### `lost_pets` 실종 신고

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `id` | uuid | 식별자 |
| `photo_path` | text | Storage 경로 |
| `animal_type` | text | 종류 |
| `colors` | text[] | 털색 |
| `size` | text | 크기 |
| `features` | text | 특징 자유 입력 |
| `last_seen_point` | geography(Point) | 마지막 목격 위치 |
| `last_seen_at` | timestamptz | 마지막 목격 시각 |
| `contact_token` | text | 익명 조회 토큰, 연락처 저장 안 함 |
| `status` | text | `searching` `resolved` |

### `match_scores` 매칭 결과 캐시

| 컬럼 | 타입 | 비고 |
|---|---|---|
| `lost_id` | uuid | 실종 신고 |
| `sighting_id` | uuid | 목격 제보 |
| `score` | numeric | 0~100 |
| `breakdown` | jsonb | 항목별 점수와 사람이 읽는 이유 |

## 매칭 점수 구성

동물 종류가 다르면 후보에서 제외한 뒤 아래 항목을 합산합니다.

| 항목 | 배점 | 계산 |
|---|---|---|
| 거리 | 35 | 마지막 목격 위치 기준, 0km 만점에서 5km 0점까지 선형 감소 |
| 시간 | 25 | 실종 시각 이후 목격만 유효, 72시간까지 선형 감소 |
| 털색 | 20 | 색상 태그 교집합 비율 |
| 크기 | 10 | 일치 10점, 한 단계 차이 5점 |
| 특징 | 10 | 목줄, 부상, 귀컷 일치 항목당 가점 |

응답에는 항상 근거 문장을 포함합니다. 예시는 다음과 같습니다.

> 마지막 위치에서 1.2km, 실종 3시간 뒤 목격, 흰색 소형견과 빨간 하네스 특징 일치

`match_scores.score`는 유사도 지표이며 개체 동일성 확정이 아닙니다. UI 문구는 "확인할 후보"로 고정합니다.

## 위치 보호 규칙

| 규칙 | 구현 |
|---|---|
| 정확 좌표 비공개 | `exact_point`는 공개 SELECT 대상에서 제외, 서버 전용 |
| 공개 좌표 | `coarse_point`는 300m 격자에 스냅한 값만 사용 |
| 민감 제보 | 품종견, 어린 개체, 부상 제보는 1km 격자로 확대 |
| 공유 카드 | 행정동명까지만 표기, 좌표와 지도 핀 제외 |
| 사진 | 업로드 전 클라이언트에서 재인코딩해 EXIF GPS 제거 |

## 보안과 운영

| 항목 | 조치 |
|---|---|
| 시크릿 | Vercel 환경변수로만 관리, 저장소에 커밋 금지 |
| Supabase RLS | 공개 읽기는 뷰로 제한, 쓰기는 서버 키로만 |
| 레이트리밋 | IP 기준 제보 생성 분당 3회, 분석 분당 5회 |
| 파일 검증 | 서버에서 MIME과 8MB 상한 재검증 |
| 신고·숨김 | `status = hidden` 전환으로 공개 목록에서 제외 |
| 로그 | 좌표와 원본 이미지를 로그에 남기지 않음 |

## 환경변수

| 키 | 용도 | 노출 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 비전 분석 | 서버 전용 |
| `SUPABASE_URL` | 데이터베이스 | 공개 가능 |
| `SUPABASE_ANON_KEY` | 클라이언트 읽기 | 공개 가능 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 쓰기 | 서버 전용 |
| `KAKAO_REST_API_KEY` | 역지오코딩 | 서버 전용 |
| `DATABASE_URL` | Drizzle 마이그레이션 | 서버 전용 |
