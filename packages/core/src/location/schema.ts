import { z } from "zod";

import { KOREA_BOUNDS } from "./geo";
import { KAKAO_CATEGORY_GROUPS } from "./kakao-categories";

// API 입력 검증. 실패 메시지는 화면에 그대로 쓸 수 있는 한국어

const OUT_OF_KOREA = "국내 좌표가 아닙니다";

export const latLngSchema = z.object({
  lat: z
    .number({ error: "위도가 필요합니다" })
    .min(KOREA_BOUNDS.minLat, OUT_OF_KOREA)
    .max(KOREA_BOUNDS.maxLat, OUT_OF_KOREA),
  lng: z
    .number({ error: "경도가 필요합니다" })
    .min(KOREA_BOUNDS.minLng, OUT_OF_KOREA)
    .max(KOREA_BOUNDS.maxLng, OUT_OF_KOREA),
});

export const geocodeRequestSchema = latLngSchema.extend({
  regionType: z
    .enum(["H", "B"], { error: "행정구역 종류가 올바르지 않습니다" })
    .optional(),
  // 도로명 주소까지 필요한 확인 화면에서만 켬
  withAddress: z.boolean({ error: "주소 포함 여부가 올바르지 않습니다" }).optional(),
});

const categoryGroupCodeSchema = z.enum(
  Object.keys(KAKAO_CATEGORY_GROUPS) as [
    keyof typeof KAKAO_CATEGORY_GROUPS,
    ...(keyof typeof KAKAO_CATEGORY_GROUPS)[],
  ],
  { error: "카테고리 코드가 올바르지 않습니다" },
);

// 쿼리스트링은 전부 문자열로 오므로 coerce 로 받음
export const placeSearchSchema = z
  .object({
    mode: z
      .enum(["keyword", "address", "category"], {
        error: "검색 방식이 올바르지 않습니다",
      })
      .default("keyword"),
    query: z
      .string()
      .trim()
      .min(1, "검색어를 입력해 주십시오")
      .max(80, "검색어는 80자까지 넣을 수 있습니다")
      .optional(),
    category: categoryGroupCodeSchema.optional(),
    lat: z.coerce
      .number({ error: OUT_OF_KOREA })
      .min(KOREA_BOUNDS.minLat, OUT_OF_KOREA)
      .max(KOREA_BOUNDS.maxLat, OUT_OF_KOREA)
      .optional(),
    lng: z.coerce
      .number({ error: OUT_OF_KOREA })
      .min(KOREA_BOUNDS.minLng, OUT_OF_KOREA)
      .max(KOREA_BOUNDS.maxLng, OUT_OF_KOREA)
      .optional(),
    radius: z.coerce
      .number({ error: "반경이 올바르지 않습니다" })
      .int("반경은 정수여야 합니다")
      .min(0, "반경은 0m 이상이어야 합니다")
      .max(20_000, "반경은 20000m 까지만 됩니다")
      .optional(),
    sort: z
      .enum(["accuracy", "distance"], { error: "정렬 방식이 올바르지 않습니다" })
      .optional(),
    page: z.coerce
      .number({ error: "페이지가 올바르지 않습니다" })
      .int("페이지는 정수여야 합니다")
      .min(1, "페이지는 1부터 시작합니다")
      .max(45, "페이지는 45까지만 됩니다")
      .optional(),
    size: z.coerce
      .number({ error: "건수가 올바르지 않습니다" })
      .int("건수는 정수여야 합니다")
      .min(1, "건수는 1 이상이어야 합니다")
      .max(15, "한 번에 15건까지 받을 수 있습니다")
      .optional(),
  })
  .refine((v) => v.mode === "category" || Boolean(v.query), {
    error: "검색어를 입력해 주십시오",
    path: ["query"],
  })
  .refine((v) => v.mode !== "category" || Boolean(v.category), {
    error: "카테고리를 선택해 주십시오",
    path: ["category"],
  })
  .refine((v) => v.mode !== "category" || (v.lat !== undefined && v.lng !== undefined), {
    error: "카테고리 검색은 중심 좌표가 필요합니다",
    path: ["lat"],
  })
  .refine((v) => (v.lat === undefined) === (v.lng === undefined), {
    error: "위도와 경도를 함께 보내야 합니다",
    path: ["lng"],
  });

export type GeocodeRequest = z.infer<typeof geocodeRequestSchema>;
export type PlaceSearchRequest = z.infer<typeof placeSearchSchema>;

// 필드별 메시지. 400 응답 본문에 그대로 담음
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    result[key] ??= issue.message;
  }
  return result;
}
