import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import {
  ANIMAL_TYPE_LABEL,
  CARE_SITUATION_LABEL,
  SIZE_LABEL,
  findPublicReportMock,
  formatSightedAt,
} from "../../../../../lib/report-mock";

// 저장용 카드. 정확 좌표와 관리 주소는 담지 않음
const WIDTH = 1080;
const HEIGHT = 1350;

// 폰트는 2.5MB 라 요청마다 읽지 않고 한 번만 불러 재사용
let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 700 }[]> | null =
  null;

function loadFonts() {
  // 번들러가 폰트를 모듈로 넣지 않도록 경로를 런타임에 조립함
  const fontDir = join(
    process.cwd(),
    "node_modules/pretendard/dist/public/static/alternative",
  );

  fontsPromise ??= Promise.all(
    ([
      ["Pretendard-Regular.ttf", 400],
      ["Pretendard-Bold.ttf", 700],
    ] as const).map(async ([file, weight]) => ({
      name: "Pretendard",
      data: await readFile(join(fontDir, file)),
      weight,
    })),
  );
  return fontsPromise;
}

export async function GET(_request: Request, ctx: RouteContext<"/api/reports/[id]/share-card">) {
  const { id } = await ctx.params;
  const report = findPublicReportMock(id);
  if (!report) return new Response("not found", { status: 404 });

  const color = report.colors.join(" ");
  const kind =
    report.animalType === "dog"
      ? `${SIZE_LABEL[report.size]}견`
      : ANIMAL_TYPE_LABEL[report.animalType];
  const heading = `${color} ${kind}`.trim();

  const fonts = await loadFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: WIDTH,
          height: HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          backgroundColor: "#ffffff",
          fontFamily: "Pretendard",
          color: "#111827",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: "#2563eb" }}>다시집</div>
          <div style={{ fontSize: 84, fontWeight: 700, lineHeight: 1.25 }}>
            {`${heading}을 발견했어요`}
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <span
              style={{
                fontSize: 34,
                padding: "12px 28px",
                borderRadius: 999,
                backgroundColor: "#eff6ff",
                color: "#1d4ed8",
              }}
            >
              {CARE_SITUATION_LABEL[report.careSituation]}
            </span>
            {report.injury === true && (
              <span
                style={{
                  fontSize: 34,
                  padding: "12px 28px",
                  borderRadius: 999,
                  backgroundColor: "#fef2f2",
                  color: "#b91c1c",
                }}
              >
                다친 것으로 보여요
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, fontSize: 40 }}>
          {report.appearance && (
            <div style={{ lineHeight: 1.45, color: "#374151" }}>{report.appearance}</div>
          )}
          {report.areaName && <div style={{ color: "#6b7280" }}>{report.areaName}</div>}
          <div style={{ color: "#6b7280" }}>
            {`발견 시각 ${formatSightedAt(report.occurredAt)}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 30 }}>
          <div style={{ color: "#6b7280" }}>
            정확한 위치는 담기지 않았어요. 장소는 행정동까지만 적혀 있어요
          </div>
          <div style={{ color: "#9ca3af" }}>품종과 개체는 확정된 정보가 아니에요</div>
        </div>
      </div>
    ),
    { width: WIDTH, height: HEIGHT, fonts },
  );
}
