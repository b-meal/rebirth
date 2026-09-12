import { z } from 'zod'

import {
  closeReason,
  supportRequestKind,
  type SupportRequestKind,
} from './enums'

// 관리 권한과 문의. WEB-12, WEB-16, WEB-17, WEB-24, WEB-36

/**
 * 화면이 보여주는 약관·개인정보 문서 버전
 * 동의 기록에 이 값이 함께 남아 "그때 어떤 문구에 동의했는가" 를 답할 수 있음
 * 문서를 개정하면 이 값을 올리고 legal_documents 에 새 버전을 발행함. POL-22
 */
export const CONSENT_DOCUMENT_VERSION = '2026-09-01'

/* 관리 주소 교환 */

/**
 * 관리 토큰을 세션으로 교환함. WEB-36
 * 응답에 원 토큰을 다시 담지 않음. 토큰은 URL 로 한 번 들어와 쿠키로 바뀜
 */
export const exchangeManageToken = z.object({
  token: z
    .string()
    .trim()
    .min(20, '관리 주소가 올바르지 않습니다')
    .max(200, '관리 주소가 올바르지 않습니다'),
  // 교환 후 돌아갈 내부 경로. 외부 도메인과 비밀 쿼리는 거부됨
  returnTo: z.string().max(200).optional(),
})

export type ExchangeManageToken = z.infer<typeof exchangeManageToken>

/* 종료와 삭제 */

const CLOSE_NOTE_MIN = 10
const CLOSE_NOTE_MAX = 500

/**
 * 종료·찾음·삭제 요청. WEB-17
 * 세 동작의 되돌림 가능성이 달라 각각 다른 엔드포인트로 둠
 */
export const closeReport = z
  .object({
    reason: closeReason,
    note: z
      .string()
      .trim()
      .max(CLOSE_NOTE_MAX, `사유는 ${CLOSE_NOTE_MAX}자까지 넣을 수 있습니다`)
      .optional(),
    version: z.number().int().positive('버전이 올바르지 않습니다'),
  })
  .refine(
    (v) =>
      v.reason !== 'other' || (v.note?.trim().length ?? 0) >= CLOSE_NOTE_MIN,
    {
      error: `그 외를 고르면 사유를 ${CLOSE_NOTE_MIN}자 이상 적어 주십시오`,
      path: ['note'],
    },
  )

export type CloseReport = z.infer<typeof closeReport>

/**
 * 삭제 요청. 되돌릴 수 없어 화면이 본 version 을 함께 받음
 * 사유는 받지 않음. 삭제를 사유 입력으로 막지 않기 위함
 */
export const deleteReport = z.object({
  version: z.number().int().positive('버전이 올바르지 않습니다'),
})

export type DeleteReport = z.infer<typeof deleteReport>

/* 후속 상태 기록 */

/**
 * 찾음·인계 확인 기록. WEB-32
 * 한쪽 응답으로 다른 쪽 기록을 강제 종료하지 않음. 양쪽 진술을 따로 남김
 */
export const resolutionStatus = z.enum(
  ['checking', 'found', 'handed_to_agency', 'different_animal'],
  { error: '상태가 올바르지 않습니다' },
)

export const recordResolution = z.object({
  status: resolutionStatus,
  note: z
    .string()
    .trim()
    .max(500, '설명은 500자까지 넣을 수 있습니다')
    .optional(),
  version: z.number().int().positive('버전이 올바르지 않습니다'),
})

export type RecordResolution = z.infer<typeof recordResolution>
export type ResolutionStatus = z.infer<typeof resolutionStatus>

/* 문의와 권리 요청 */

const SUPPORT_BODY_MIN = 10
const SUPPORT_BODY_MAX = 1000

// 사용자가 고르는 문의 유형 문구. 법 용어 대신 무엇이 필요한지로 씀
export const SUPPORT_KIND_LABEL: Record<SupportRequestKind, string> = {
  manage_token_lost: '관리 주소를 잃어버렸습니다',
  deletion: '내 기록을 삭제해 주십시오',
  correction: '잘못된 내용을 고쳐 주십시오',
  privacy_exposure: '개인정보가 노출됐습니다',
  rescue: '다친 동물을 봤습니다',
  general: '그 외 문의',
}

/**
 * 문의 접수. WEB-24
 * 관리 주소를 잃은 사람도 접수할 수 있어 관리 권한을 요구하지 않음
 * 신분증 원문과 개인 연락처는 받지 않음
 */
export const createSupportRequest = z.object({
  kind: supportRequestKind,
  body: z
    .string()
    .trim()
    .min(SUPPORT_BODY_MIN, `무엇이 필요한지 ${SUPPORT_BODY_MIN}자 이상 적어 주십시오`)
    .max(SUPPORT_BODY_MAX, `${SUPPORT_BODY_MAX}자까지 넣을 수 있습니다`),
  // 관련 공개 기록. 관리 토큰이 아니라 공개 ID 만 참조함
  relatedReportId: z.uuid('공개 기록 주소가 올바르지 않습니다').optional(),
})

export type CreateSupportRequest = z.infer<typeof createSupportRequest>

/**
 * 관리 토큰이 본문에 섞여 들어오는 것을 막음
 * 사용자가 실수로 붙여넣으면 저장하지 않고 되돌려보냄. WEB-24
 */
export function looksLikeToken(value: string): boolean {
  return /[A-Za-z0-9_-]{20,}/.test(value.replace(/\s+/g, ''))
}
