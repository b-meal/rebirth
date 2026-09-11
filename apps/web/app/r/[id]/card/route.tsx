import { createSignedUrl } from "@rebirth/core/storage";
import { findPublicReport, findReportPhotoPaths } from "@rebirth/db";
import { ImageResponse } from "next/og";

import { CARE_LABEL, SIZE_LABEL, breedLabel } from "@/lib/report-label";

// 공유 카드. ratio=story 는 인스타 스토리용 9:16, 기본은 OG 이미지로 쓰는 4:5
// 정확 좌표와 제보자 정보, 품종 확정 표현을 넣지 않음

export const dynamic = "force-dynamic";

const RATIOS = {
  story: { width: 1080, height: 1920 },
  og: { width: 1080, height: 1350 },
} as const;

// 사진이 차지하는 비율. 스토리는 배경으로 깔려도 꽉 차 보이게 더 크게 씀
const PHOTO_SHARE = { story: 0.68, og: 0.52 } as const;

const PADDING = 72;

/** 사진이 없거나 서명이 실패하면 텍스트만으로 카드를 만듦 */
async function loadPhotoUrl(id: string): Promise<string | null> {
  try {
    const rows = await findReportPhotoPaths(id);
    const first = rows[0];
    if (!first || first.visibility !== "public") return null;
    const signed = await createSignedUrl(first.storagePath);
    return signed.url;
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const kind = new URL(request.url).searchParams.get("ratio") === "story" ? "story" : "og";
  const { width, height } = RATIOS[kind];
  const photoHeight = Math.round(height * PHOTO_SHARE[kind]);

  let report: Awaited<ReturnType<typeof findPublicReport>> = undefined;
  try {
    report = await findPublicReport(id);
  } catch {
    // 조회 실패는 안내 카드로 대체
  }

  const photoUrl = report ? await loadPhotoUrl(id) : null;

  const headline = report?.appearance?.split("\n")[0] ?? "발견동물 제보";
  const where = report?.areaName ?? "위치 미확인";
  const care = CARE_LABEL[report?.careSituation ?? "unknown"] ?? "확인 중";
  const chips = report
    ? [SIZE_LABEL[report.size] ?? "", ...report.colors, breedLabel(report.breedGuess) ?? ""]
        .filter(Boolean)
        .slice(0, 4)
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          background: "#0f1115",
          color: "#ffffff",
        }}
      >
        {photoUrl ? (
          <div
            style={{
              display: "flex",
              width,
              height: photoHeight,
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- satori 는 next/image 를 해석하지 못하고 원시 img 만 그림 */}
            <img
              src={photoUrl}
              width={width}
              height={photoHeight}
              style={{ objectFit: "cover" }}
              alt=""
            />
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            justifyContent: "space-between",
            padding: PADDING,
            gap: 32,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ fontSize: 40, opacity: 0.7 }}>다시집</div>
              <div
                style={{
                  display: "flex",
                  fontSize: 34,
                  padding: "10px 26px",
                  borderRadius: 999,
                  background: "#2b6cff",
                }}
              >
                {care}
              </div>
            </div>

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

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 40, opacity: 0.75 }}>{where}</div>
            {/* 보호자가 없는 개체도 있어 주인 대신 집으로 씀. 서비스명과도 맞음 */}
            <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.3 }}>
              집으로 돌아갈 수 있게 도와주세요
            </div>
            <div style={{ fontSize: 32, opacity: 0.62 }}>
              이 동물을 봤다면 알려 주세요
            </div>
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
