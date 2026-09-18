import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createSignedUrl } from "@rebirth/core/storage";
import { findPublicReport, findReportPhotoPaths } from "@rebirth/db";
import { ImageResponse } from "next/og";
import { toDataURL } from "qrcode";

import { SIZE_LABEL, STATUS_LABEL, breedLabel, searchingDays, withObject } from "@/lib/report-label";

// 공유 카드. ratio=story 는 인스타 스토리용 9:16, 기본은 링크 미리보기용 OG 1.91:1
// 정확 좌표와 제보자 정보, 품종 확정 표현을 넣지 않음

export const revalidate = 300;

const RATIOS = {
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
} as const;

// 인스타그램 상하 UI 자리를 비우는 몫
const STORY_PHOTO_SHARE = 0.56;

// 위는 사진이 덮고 아래는 답장 입력창 자리라 글자와 QR 을 넣지 않는 여백
const STORY_SAFE_TOP = 250;
const STORY_SAFE_BOTTOM = 250;

// 사진만 퍼가도 무엇인지 읽히게 아래에 겹치는 글자 띠 높이
const OG_BAND = 180;

// QR 한 변, 폰 카메라가 한 걸음 거리에서 읽는 최소치 기준
const QR_SIZE = 180;

const PADDING = 72;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// 카카오톡 미리보기 크롤러 타임아웃 회피
const CACHE_CONTROL = "public, max-age=300, s-maxage=600, stale-while-revalidate=86400";

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

/** 링크 스티커를 못 쓰는 계정도 카드만으로 닿게 하는 우회, 생성 실패는 QR 없이 냄 */
async function loadQrDataUrl(target: string): Promise<string | null> {
  try {
    return await toDataURL(target, { margin: 1, width: QR_SIZE });
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

  const lost = report?.kind === "lost";
  const name = report?.pet?.name ?? null;
  // 계속 돌아다니는 카드라 끝난 신고에는 도움을 더 부르지 않는 갈래
  const done = Boolean(lost && report && report.lifecycle !== "searching");
  const found = report?.lifecycle === "resolved";

  // 부르면 반응하는 것이 이름이라 이름 아는 신고는 이름이 가장 크게 읽히는 기준
  const headline = done
    ? name
      ? found
        ? `${name}, 집에 왔어요`
        : `${withObject(name)} 찾지 않아요`
      : found
        ? "집으로 돌아왔어요"
        : "지금은 찾지 않아요"
    : name
      ? `${withObject(name)} 찾고 있어요`
      : (report?.appearance?.split("\n")[0] ??
        (lost ? "반려동물을 찾고 있어요" : "발견동물 제보"));
  const where = report?.areaName ?? "위치 미확인";
  // 당일 실종은 0일째 로 적지 않고 보호 상황 없는 실종은 빈 값으로 두어 배지 감춤
  const care =
    lost && report
      ? done
        ? "찾음"
        : searchingDays(report.occurredAt) < 1
          ? "오늘 잃어버렸어요"
          : `실종 ${searchingDays(report.occurredAt)}일째`
      : (STATUS_LABEL[report?.careSituation ?? "unknown"] ?? "");
  // 보호자가 적어 둔 품종은 추정이 아니라 아는 값이라 계열 추정을 붙이지 않음
  const breed = report?.pet?.breedGuess ?? breedLabel(report?.breedGuess ?? null);
  const chips = report
    ? [SIZE_LABEL[report.size] ?? "", ...report.colors, breed ?? ""]
        .filter(Boolean)
        .slice(0, 4)
    : [];

  // 메타 텍스트가 잘리는 앱이 있어 사진만 퍼가도 읽히게 띠 두 줄을 얹음
  if (kind === "og") {
    const bandTitle = name ? `${name} · ${care}` : (care || headline);
    const bandFact = [where, ...chips].filter(Boolean).join(" · ");
    return new ImageResponse(
      photoUrl ? (
        <div style={{ display: "flex", position: "relative", width, height }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- satori 는 next/image 를 해석하지 못하고 원시 img 만 그림 */}
          <img
            src={photoUrl}
            width={width}
            height={height}
            style={{ objectFit: "cover" }}
            alt=""
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width,
              height: OG_BAND,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 12,
              padding: "0 56px",
              background: "rgba(15,17,21,0.72)",
              color: "#ffffff",
            }}
          >
            <div style={{ fontSize: 52, fontWeight: 700 }}>{bandTitle}</div>
            <div style={{ fontSize: 30, opacity: 0.82 }}>{bandFact}</div>
          </div>
        </div>
      ) : (
        await brandCard(width, height)
      ),
      { width, height, headers: { "Cache-Control": CACHE_CONTROL } },
    );
  }

  const photoHeight = Math.round(height * STORY_PHOTO_SHARE);
  const qrDataUrl = await loadQrDataUrl(`${SITE}/r/${id}`);

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
            overflow: "hidden",
            paddingTop: photoUrl ? 32 : STORY_SAFE_TOP,
            paddingLeft: PADDING,
            paddingRight: PADDING,
            paddingBottom: STORY_SAFE_BOTTOM,
            gap: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ fontSize: 34, opacity: 0.7 }}>다시집</div>
              {care ? (
                <div
                  style={{
                    display: "flex",
                    fontSize: 30,
                    padding: "8px 22px",
                    borderRadius: 999,
                    background: "#2b6cff",
                  }}
                >
                  {care}
                </div>
              ) : null}
            </div>

            <div style={{ fontSize: 52, lineHeight: 1.2, fontWeight: 700 }}>
              {headline}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {chips.map((chip) => (
                <div
                  key={chip}
                  style={{
                    display: "flex",
                    fontSize: 28,
                    padding: "8px 18px",
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
            <div style={{ fontSize: 34, opacity: 0.75 }}>
              {lost && !done ? `${where}에서 마지막으로 봤어요` : where}
            </div>
            {/* 실종은 기다리는 사람이 있어 집이 아니라 그 사람에게 돌아가는 일임 */}
            <div style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.25 }}>
              {done
                ? found
                  ? "도와주신 덕분이에요"
                  : "더 찾지 않아요"
                : lost
                  ? "가족이 기다리고 있어요"
                  : "집으로 돌아갈 수 있게 도와주세요"}
            </div>
            {qrDataUrl ? (
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- satori 는 next/image 를 해석하지 못하고 원시 img 만 그림 */}
                <img src={qrDataUrl} width={QR_SIZE} height={QR_SIZE} alt="" />
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    fontSize: 28,
                    opacity: 0.68,
                  }}
                >
                  <div>사진으로 찍어 열어 보세요</div>
                  {/* 끝난 신고에는 목격을 부르지 않아 헛걸음 방지 */}
                  {done ? null : (
                    <div>
                      {name
                        ? `${withObject(name)} 봤다면 알려 주세요`
                        : "이 동물을 봤다면 알려 주세요"}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    { width, height, headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
