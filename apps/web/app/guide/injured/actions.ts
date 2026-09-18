"use server";

import {
  composeRescueBody,
  rescueFieldErrors,
  rescueRequestInput,
} from "@rebirth/core/support/rescue";
import { hashToken, issueReference, issueToken, logFailure } from "@rebirth/core/http";
import { insertSupportRequest } from "@rebirth/db";

// 구조·보호 요청 접수
// 사용자는 세 칸만 채우고 접수번호를 받음. 어느 기관에 연락할지는 운영자가 판단함

export type RescueFormState = {
  /** 접수되면 사용자에게 보여 줄 번호 */
  reference?: string;
  errors?: Record<string, string>;
  message?: string;
};

export async function requestRescue(
  _prev: RescueFormState,
  formData: FormData,
): Promise<RescueFormState> {
  const parsed = rescueRequestInput.safeParse({
    where: formData.get("where"),
    what: formData.get("what"),
    condition: formData.get("condition") ?? undefined,
    reportId: formData.get("reportId") ?? undefined,
  });

  if (!parsed.success) return { errors: rescueFieldErrors(parsed.error) };

  try {
    const row = await insertSupportRequest({
      kind: "rescue",
      body: composeRescueBody(parsed.data),
      // 제보에서 온 접수는 어느 건인지 남김. 없으면 같은 동물의 중복 접수를 가릴 수 없음
      // 문의 API 와 같은 열을 씀. 운영 화면이 이미 이 열로 제보를 이어 봄
      relatedReportId: parsed.data.reportId,
      reference: issueReference("SR"),
      // 조회 토큰은 지금 화면에서 쓰지 않지만 열이 NOT NULL 이라 발급해 둠
      tokenHash: hashToken(issueToken()),
    });
    return { reference: row.reference };
  } catch (error) {
    // 원인을 그대로 내보내지 않음. 급한 사람에게는 전화가 더 빠름
    // 다친 동물 접수가 막힌 것은 가장 급한 고장이라 로그에는 반드시 남김
    logFailure("guide.injuredRequest", error);
    return { message: "접수하지 못했어요. 급하시면 아래 번호로 전화해 주세요" };
  }
}
