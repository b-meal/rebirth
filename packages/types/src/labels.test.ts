import assert from 'node:assert/strict'
import test from 'node:test'

import { careSituation, reportKind } from './enums.ts'
import {
  CARE_INPUT_LABEL,
  CARE_LABEL,
  KIND_LABEL,
  KIND_SHORT_LABEL,
  lifecyclesOf,
  reportStatus,
} from './labels.ts'

// 도달 가능한 모든 조합. 종류별 lifecycle 은 DB CHECK 와 같은 표에서 옴
const combos = reportKind.options.flatMap((kind) =>
  lifecyclesOf(kind).flatMap((lifecycle) =>
    careSituation.options.map((care) => ({ kind, lifecycle, careSituation: care })),
  ),
)

test('한 종류만 담는 탭 안에서 배지가 탭 이름을 되풀이하지 않는다', () => {
  for (const input of combos) {
    const status = reportStatus(input, { inKindTab: true })
    if (!status) continue
    assert.notEqual(status.label, KIND_LABEL[input.kind], JSON.stringify(input))
    assert.notEqual(status.label, KIND_SHORT_LABEL[input.kind], JSON.stringify(input))
  }
})

test('진행 중인 발견 제보는 보호 상황이 있으면 반드시 배지를 가진다', () => {
  for (const care of ['roaming', 'in_care'] as const) {
    const status = reportStatus({ kind: 'sighting', careSituation: care, lifecycle: 'active' })
    assert.equal(status?.label, CARE_LABEL[care])
  }
})

test('끝난 상태는 종류와 보호 상황보다 먼저 읽힌다', () => {
  assert.equal(
    reportStatus({ kind: 'lost', careSituation: 'unknown', lifecycle: 'resolved' })?.tone,
    'done',
  )
  assert.equal(
    reportStatus({ kind: 'sighting', careSituation: 'in_care', lifecycle: 'closed' })?.tone,
    'closed',
  )
})

test('섞인 목록에서 실종은 실종으로, 같은 탭 안에서는 배지를 비운다', () => {
  const lost = { kind: 'lost', careSituation: 'unknown', lifecycle: 'searching' } as const
  assert.equal(reportStatus(lost)?.label, '실종')
  assert.equal(reportStatus(lost, { inKindTab: true }), null)
})

test('폼에서 고른 말과 저장 뒤 배지의 끝말이 같다', () => {
  // 길에 있음 ↔ 길에 있음, 내가 보호 중 ↔ 제보자 보호 중
  for (const key of Object.keys(CARE_INPUT_LABEL) as (keyof typeof CARE_INPUT_LABEL)[]) {
    const tail = (s: string) => s.split(' ').slice(-2).join(' ')
    assert.equal(tail(CARE_INPUT_LABEL[key]), tail(CARE_LABEL[key]), key)
  }
})

test('어떤 라벨도 주어가 필요한 배회 중, 찾음 을 쓰지 않는다', () => {
  const banned = ['배회 중', '찾음', '만남']
  const all = [
    ...Object.values(CARE_LABEL),
    ...Object.values(CARE_INPUT_LABEL),
    ...combos.map((c) => reportStatus(c)?.label ?? ''),
  ]
  for (const label of all) {
    for (const word of banned) assert.equal(label.includes(word), false, `${label} 에 ${word}`)
  }
})
