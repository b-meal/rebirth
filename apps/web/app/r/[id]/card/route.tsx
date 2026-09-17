import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createSignedUrl } from "@rebirth/core/storage";
import { findPublicReport, findReportPhotoPaths } from "@rebirth/db";
import { ImageResponse } from "next/og";

import { CARE_LABEL, SIZE_LABEL, breedLabel, searchingDays, withObject } from "@/lib/report-label";

// 공유 카드. ratio=story 는 인스타 스토리용 9:16, 기본은 링크 미리보기용 OG 1.91:1
// 정확 좌표와 제보자 정보, 품종 확정 표현을 넣지 않음

export const dynamic = "force-dynamic";

const RATIOS = {
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
} as const;

// 스토리 카드에서 사진이 차지하는 비율. 아래 텍스트 블록이 나머지를 씀
const STORY_PHOTO_SHARE = 0.68;

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

/** 사진이 없는 제보의 링크 미리보기. 홈 OG 와 같은 로고 카드로 떨어뜨림 */
async function brandCard(width: number, height: number) {
  const logo = await readFile(join(process.cwd(), "public/logo/logo-house.png")).catch(
    () => null,
  );
  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      {logo ? (
        // eslint-disable-next-line @next/next/no-img-element -- satori 는 next/image 를 해석하지 못하고 원시 img 만 그림
        <img
          src={`data:image/png;base64,${logo.toString("base64")}`}
          width={320}
          height={320}
          alt=""
        />
      ) : null}
    </div>
  );
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const kind = new URL(request.url).searchParams.get("ratio") === "story" ? "story" : "og";
  const { width, height } = RATIOS[kind];

  let report: Awaited<ReturnType<typeof findPublicReport>> = undefined;
  try {
    report = await findPublicReport(id);
  } catch {
    // 조회 실패는 안내 카드로 대체
  }

  const photoUrl = report ? await loadPhotoUrl(id) : null;

  // 링크 미리보기는 제목과 설명이 메타 텍스트로 따로 붙어 카드에 글자를 겹치지 않음
  if (kind === "og") {
    return new ImageResponse(
      photoUrl ? (
        <div style={{ display: "flex", width, height }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- satori 는 next/image 를 해석하지 못하고 원시 img 만 그림 */}
          <img
            src={photoUrl}
            width={width}
            height={height}
            style={{ objectFit: "cover" }}
            alt=""
          />
        </div>
      ) : (
        await brandCard(width, height)
      ),
      { width, height },
    );
  }

  const photoHeight = Math.round(height * STORY_PHOTO_SHARE);

  const lost = report?.kind === "lost";
  const name = report?.pet?.name ?? null;
  // 이미 찾았거나 닫힌 신고는 도움을 더 부르지 않음. 카드가 계속 돌아다니기 때문
  const done = Boolean(lost && report && report.lifecycle !== "searching");
  const found = report?.lifecycle === "resolved";

  // 이름을 아는 신고는 이름이 카드에서 가장 크게 읽혀야 함. 부르면 반응하는 것이 이름임
  const headline = done
    ? name
      ? found
        ? `${name}, 집에 왔어요`
        : `${withObject(name)} 찾지 않아요`
      : found
        ? "집으로 돌아왔어요"
        : "끝난 신고예요"
    : name
      ? `${withObject(name)} 찾고 있어요`
      : (report?.appearance?.split("\n")[0] ??
        (lost ? "반려동물을 찾고 있어요" : "발견동물 제보"));
  const where = report?.areaName ?? "위치 미확인";
  // 실종은 보호 상황을 쓰지 않아 확인되지 않음 이 박히면 안 됨
  // 당일 실종은 0일째 로 적지 않음. 상세 화면과 같은 기준을 씀
  const care =
    lost && report
      ? done
        ? found
          ? "찾았어요"
          : "끝난 신고"
        : searchingDays(report.occurredAt) < 1
          ? "오늘 잃어버렸어요"
          : `찾는 중 ${searchingDays(report.occurredAt)}일째`
      : (CARE_LABEL[report?.careSituation ?? "unknown"] ?? "확인 중");
  // 보호자가 적어 둔 품종은 추정이 아니라 아는 값이라 계열 추정을 붙이지 않음
  const breed = report?.pet?.breedGuess ?? breedLabel(report?.breedGuess ?? null);
  const chips = report
    ? [SIZE_LABEL[report.size] ?? "", ...report.colors, breed ?? ""]
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
            <div style={{ fontSize: 40, opacity: 0.75 }}>
              {lost && !done ? `${where}에서 마지막으로 봤어요` : where}
            </div>
            {/* 발견 제보는 보호자가 없는 개체도 있어 주인 대신 집으로 씀 */}
            {/* 실종은 기다리는 사람이 있어 집이 아니라 그 사람에게 돌아가는 일임 */}
            <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.3 }}>
              {done
                ? found
                  ? "도와주신 덕분이에요"
                  : "더 찾지 않아요"
                : lost
                  ? "가족이 기다리고 있어요"
                  : "집으로 돌아갈 수 있게 도와주세요"}
            </div>
            {/* 끝난 신고에는 목격을 부르지 않음. 헛걸음을 만들 뿐임 */}
            {done ? null : (
              <div style={{ fontSize: 32, opacity: 0.62 }}>
                {name ? `${withObject(name)} 봤다면 알려 주세요` : "이 동물을 봤다면 알려 주세요"}
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { width, height },
  );
}
