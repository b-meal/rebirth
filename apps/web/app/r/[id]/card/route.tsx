import { findPublicReport } from "@rebirth/db";
import { ImageResponse } from "next/og";

// 1080x1350 공유 카드. OG 이미지로 그대로 재사용
// 정확 좌표와 제보자 정보, 품종 확정 표현을 넣지 않음

export const dynamic = "force-dynamic";

const WIDTH = 1080;
const HEIGHT = 1350;

const CARE_LABEL: Record<string, string> = {
  roaming: "배회 중",
  in_care: "제보자 보호 중",
  unknown: "확인 중",
};

const SIZE_LABEL: Record<string, string> = {
  small: "소형",
  medium: "중형",
  large: "대형",
  unknown: "크기 미확인",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let report: Awaited<ReturnType<typeof findPublicReport>> = undefined;
  try {
    report = await findPublicReport(id);
  } catch {
    // 조회 실패는 안내 카드로 대체
  }

  const headline = report?.appearance?.split("\n")[0] ?? "발견동물 제보";
  const where = report?.areaName ?? "위치 미확인";
  const care = CARE_LABEL[report?.careSituation ?? "unknown"] ?? "확인 중";
  const chips = report
    ? [SIZE_LABEL[report.size] ?? "", ...report.colors].filter(Boolean).slice(0, 4)
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0f1115",
          color: "#ffffff",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 40, opacity: 0.7 }}>다시집</div>
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              fontSize: 36,
              padding: "12px 28px",
              borderRadius: 999,
              background: "#2b6cff",
            }}
          >
            {care}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          <div style={{ fontSize: 68, lineHeight: 1.25, fontWeight: 700 }}>
            {headline}
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {chips.map((chip) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  fontSize: 34,
                  padding: "10px 24px",
                  borderRadius: 999,
                  border: "2px solid rgba(255,255,255,0.28)",
                }}
              >
                {chip}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 44 }}>{where}</div>
          <div style={{ fontSize: 32, opacity: 0.62 }}>
            보신 적이 있다면 알려 주십시오
          </div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT },
  );
}
