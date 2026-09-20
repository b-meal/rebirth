import { LIFECYCLE_BY_KIND, type CareSituation, type Lifecycle, type ReportKind } from './enums.ts'

// 상태 어휘의 단일 원천. 웹, 폼, 운영 화면, 공유 카드가 모두 여기서만 가져다 씀
// 주어 없이 읽히는 명사형만 둠. 배회 중, 찾음 은 누가 그런지 해석해야 해 쓰지 않음
// satisfies 로 묶어 enum 에 값이 늘면 typecheck 가 여기서 깨짐

// 탭과 절 제목에 쓰는 종류 이름
export const KIND_LABEL = {
  sighting: '발견 제보',
  lost: '실종 신고',
  sheltered: '임시보호',
} as const satisfies Record<ReportKind, string>

// 배지처럼 좁은 자리에 쓰는 종류 이름
export const KIND_SHORT_LABEL = {
  sighting: '발견',
  lost: '실종',
  sheltered: '임시보호',
} as const satisfies Record<ReportKind, string>

// 보호 상황. 누가 보호하는지 적어 임시보호 종류와 헷갈리지 않게 함
export const CARE_LABEL = {
  roaming: '길에 있음',
  in_care: '제보자 보호 중',
  unknown: '확인되지 않음',
} as const satisfies Record<CareSituation, string>

// 제보 폼에서 고르는 1인칭 문구. 저장 뒤 배지와 끝말이 같아야 고른 말이 그대로 보임
export const CARE_INPUT_LABEL = {
  roaming: '길에 있음',
  in_care: '내가 보호 중',
} as const satisfies Record<Exclude<CareSituation, 'unknown'>, string>

// 진행 상태. searching 은 실종 신고만 쓰므로 찾는 쪽이 보호자로 정해져 있음
export const LIFECYCLE_LABEL = {
  active: '진행 중',
  closed: '종료',
  searching: '찾는 중',
  resolved: '집으로 돌아옴',
} as const satisfies Record<Lifecycle, string>

export type ReportStatusTone = 'lost' | 'done' | 'closed' | 'care' | 'roaming' | 'sheltered'

export type ReportStatusInput = {
  kind: ReportKind
  careSituation: CareSituation
  /** 공개 목록은 진행 건만 담아 생략함. 없으면 진행 중으로 봄 */
  lifecycle?: Lifecycle
}

export type ReportStatusOptions = {
  /** 한 종류만 담는 탭 안에서는 종류 이름을 배지로 되풀이하지 않음 */
  inKindTab?: boolean
}

export type ReportStatus = { label: string; tone: ReportStatusTone }

/**
 * 카드 하나에 붙는 상태 배지 하나
 * 끝난 상태가 종류보다 먼저 읽히고, 종류가 보호 상황보다 먼저 읽힘
 */
export function reportStatus(
  input: ReportStatusInput,
  options: ReportStatusOptions = {},
): ReportStatus | null {
  if (input.lifecycle === 'resolved') return { label: LIFECYCLE_LABEL.resolved, tone: 'done' }
  if (input.lifecycle === 'closed') return { label: LIFECYCLE_LABEL.closed, tone: 'closed' }
  if (input.kind === 'lost') {
    return options.inKindTab ? null : { label: KIND_SHORT_LABEL.lost, tone: 'lost' }
  }
  if (input.kind === 'sheltered') {
    return options.inKindTab ? null : { label: KIND_SHORT_LABEL.sheltered, tone: 'sheltered' }
  }
  if (input.careSituation === 'in_care') return { label: CARE_LABEL.in_care, tone: 'care' }
  if (input.careSituation === 'roaming') return { label: CARE_LABEL.roaming, tone: 'roaming' }
  // 발견 제보에 보호 상황이 비는 일은 없음. 들어오면 배지를 비워 잘못된 말을 만들지 않음
  return null
}

/** 종류별로 실제로 도달하는 lifecycle 만 돌려줌. 테스트와 운영 필터가 같은 표를 씀 */
export function lifecyclesOf(kind: ReportKind): readonly Lifecycle[] {
  return LIFECYCLE_BY_KIND[kind]
}
