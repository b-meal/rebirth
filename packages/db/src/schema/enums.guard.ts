// pgEnum 과 zod enum 의 값이 어긋나면 typecheck 가 깨짐
// 어디서도 import 하지 않음. tsc 가 읽는 것만으로 검사가 돌아감
import type * as t from '@rebirth/types'

import type {
  animalSex,
  animalSize,
  animalType,
  areaCodeSystem,
  careSituation,
  closeReason,
  flagReason,
  flagResolution,
  lifecycle,
  locationSource,
  neuterStatus,
  reportKind,
  visibility,
} from './enums'

type Values<E extends { enumValues: readonly string[] }> = E['enumValues'][number]
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never

const _kind: Same<Values<typeof reportKind>, t.ReportKind> = true
const _visibility: Same<Values<typeof visibility>, t.Visibility> = true
const _lifecycle: Same<Values<typeof lifecycle>, t.Lifecycle> = true
const _animal: Same<Values<typeof animalType>, t.AnimalType> = true
const _size: Same<Values<typeof animalSize>, t.AnimalSize> = true
const _sex: Same<Values<typeof animalSex>, t.AnimalSex> = true
const _neuter: Same<Values<typeof neuterStatus>, t.NeuterStatus> = true
const _care: Same<Values<typeof careSituation>, t.CareSituation> = true
const _flagReason: Same<Values<typeof flagReason>, t.FlagReason> = true
const _flagResolution: Same<Values<typeof flagResolution>, t.FlagResolution> = true
const _locationSource: Same<Values<typeof locationSource>, t.LocationSource> = true
const _areaCodeSystem: Same<Values<typeof areaCodeSystem>, t.AreaCodeSystem> = true
const _closeReason: Same<Values<typeof closeReason>, t.CloseReason> = true

void [
  _kind,
  _visibility,
  _lifecycle,
  _animal,
  _size,
  _sex,
  _neuter,
  _care,
  _flagReason,
  _flagResolution,
  _locationSource,
  _areaCodeSystem,
  _closeReason,
]
