import type { AnalyzeResult } from "@rebirth/types";

// 3단계 화면이 어떤 상태를 렌더할지 정함. 화면 기획서 R3-004~R3-007 에 대응
// confidence 숫자는 화면에 내보내지 않음. 확률을 보여주면 확정으로 읽힘

// @rebirth/types 의 RETAKE_CONFIDENCE 와 같은 값
// 런타임 import 를 두면 단위 테스트에서 패키지 전체를 끌어와 해석이 깨짐
const RETAKE_CONFIDENCE = 0.4;

function needsRetake(result: AnalyzeResult) {
  return result.animalType === "unknown" || result.confidence < RETAKE_CONFIDENCE;
}

export type AnalyzeAdvice =
  // 초안을 그대로 채움
  | { state: "draft"; message: null }
  // 동물이 안 보임. 1단계로 돌려보냄
  | { state: "not-animal"; message: string }
  // 사진이 어두워 초안이 부실함. 진행과 재촬영 둘 다 열어 둠
  | { state: "low-quality"; message: string };

const NOT_ANIMAL =
  "동물이 보이지 않아요. 동물이 담긴 사진으로 다시 찍어 주세요";
const LOW_QUALITY =
  "사진이 어두워 자동 정리가 어려워요. 그대로 진행하거나 다시 찍을 수 있어요";

export function adviseFromResult(result: AnalyzeResult): AnalyzeAdvice {
  if (result.animalType === "unknown") {
    return { state: "not-animal", message: NOT_ANIMAL };
  }
  if (needsRetake(result)) {
    return { state: "low-quality", message: LOW_QUALITY };
  }
  return { state: "draft", message: null };
}

// 분석이 실패했을 때 화면이 쓸 문구. 빈 폼을 열어 직접 입력하게 함
export const ANALYZE_FAILED_MESSAGE =
  "자동 정리가 안 됐어요. 내용을 직접 적어 제보할 수 있어요";
