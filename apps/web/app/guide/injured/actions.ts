"use server";

import {
  composeRescueBody,
  rescueFieldErrors,
  rescueRequestInput,
} from "@rebirth/core/support/rescue";
import { hashToken, issueReference, issueToken } from "@rebirth/core/http";
import { insertSupportRequest } from "@rebirth/db";

// 구조 요청 접수
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
  });

  if (!parsed.success) return { errors: rescueFieldErrors(parsed.error) };

  try {
    const row = await insertSupportRequest({
      kind: "rescue",
      body: composeRescueBody(parsed.data),
      reference: issueReference("SR"),
      // 조회 토큰은 지금 화면에서 쓰지 않지만 열이 NOT NULL 이라 발급해 둠
      tokenHash: hashToken(issueToken()),
    });
    return { reference: row.reference };
  } catch {
    // 원인을 그대로 내보내지 않음. 급한 사람에게는 전화가 더 빠름
    return { message: "접수하지 못했습니다. 아래 번호로 전화해 주세요" };
  }
}
