// pgEnum 과 zod enum 의 값이 어긋나면 typecheck 가 깨짐
// 어디서도 import 하지 않음. tsc 가 읽는 것만으로 검사가 돌아감
import type * as t from '@rebirth/types'

import type {
  animalSex,
  animalSize,
  animalType,
  careSituation,
  flagReason,
  flagResolution,
  neuterStatus,
  reportKind,
  reportStatus,
} from './enums'

type Values<E extends { enumValues: readonly string[] }> = E['enumValues'][number]
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never

const _kind: Same<Values<typeof reportKind>, t.ReportKind> = true
const _status: Same<Values<typeof reportStatus>, t.ReportStatus> = true
const _animal: Same<Values<typeof animalType>, t.AnimalType> = true
const _size: Same<Values<typeof animalSize>, t.AnimalSize> = true
const _sex: Same<Values<typeof animalSex>, t.AnimalSex> = true
const _neuter: Same<Values<typeof neuterStatus>, t.NeuterStatus> = true
const _care: Same<Values<typeof careSituation>, t.CareSituation> = true
const _flagReason: Same<Values<typeof flagReason>, t.FlagReason> = true
const _flagResolution: Same<Values<typeof flagResolution>, t.FlagResolution> = true

void [
  _kind,
  _status,
  _animal,
  _size,
  _sex,
  _neuter,
  _care,
  _flagReason,
  _flagResolution,
]
