import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { logFailure } from "@rebirth/core/http";
import { createSignedUrl } from "@rebirth/core/storage";
import { findPublicReport, findReportPhotoPaths } from "@rebirth/db";
import { ImageResponse } from "next/og";
import { toDataURL } from "qrcode";

import { LIFECYCLE_LABEL } from "@rebirth/types";

import {
  SIZE_LABEL,
  STATUS_LABEL,
  breedLabel,
  describeAnimal,
  formatMonthDay,
  withObject,
} from "@/lib/report-label";

// 공유 카드. ratio=story 는 인스타 스토리용 9:16, 기본은 링크 미리보기용 OG 1.91:1
// 정확 좌표와 제보자 정보, 품종 확정 표현을 넣지 않음

export const revalidate = 300;

const RATIOS = {
  story: { width: 1080, height: 1920 },
  og: { width: 1200, height: 630 },
} as const;

// 위는 계정 이름, 아래는 답장 입력창이 덮는 인스타그램 UI 자리
const STORY_SAFE_TOP = 180;
const STORY_SAFE_BOTTOM = 220;

// 네 값을 더하면 1920. 비율로 나누면 본문이 넘쳐 QR 이 잘리므로 고정값으로 둠
const STORY_PHOTO_H = 800;
const STORY_PANEL_H = 1920 - STORY_SAFE_TOP - STORY_PHOTO_H - STORY_SAFE_BOTTOM;

// 58px 두 줄이 들어가는 글자 수. 넘기면 말줄임해 본문 높이를 지킴
const HEADLINE_MAX = 30;

/* SEED 토큰 값. satori 는 CSS 변수를 못 읽어 팔레트에서 뽑은 값을 그대로 둠
   gray 는 다크 모드 단계, carrot 은 globals.css 가 바꿔 둔 브랜드 원천 */
const T = {
  surface: "#16171b", // palette-gray-100
  layer: "#1d2025", // palette-gray-200
  line: "#2b2e35", // palette-gray-300
  fgMuted: "#868b94", // palette-gray-700
  fg: "#ffffff", // palette-static-white
  brand: "#5ea740", // palette-carrot-700
  brandInk: "#172f0c", // palette-carrot-1000
  radius: 20, // radius-x5
  round: 9999,
} as const;

// 사진만 퍼가도 무엇인지 읽히게 아래에 겹치는 글자 띠 높이
const OG_BAND = 180;

// QR 한 변, 폰 카메라가 한 걸음 거리에서 읽는 최소치 기준
const QR_SIZE = 180;

const PADDING = 72;

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// 카카오톡 미리보기 크롤러 타임아웃 회피
const CACHE_CONTROL = "public, max-age=300, s-maxage=600, stale-while-revalidate=86400";

/** 정해진 글자 수를 넘으면 말줄임. 본문이 상자를 넘겨 아래가 잘리는 것 방지 */
function clamp(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** 사진이 없거나 서명이 실패하면 텍스트만으로 카드를 만듦 */
async function loadPhotoUrl(id: string): Promise<string | null> {
  try {
    const rows = await findReportPhotoPaths(id);
    const first = rows[0];
    if (!first || first.visibility !== "public") return null;
    const signed = await createSignedUrl(first.storagePath);
    return signed.url;
  } catch (error) {
    logFailure("card.photo", error);
    return null;
  }
}

/** 링크 스티커를 못 쓰는 계정도 카드만으로 닿게 하는 우회, 생성 실패는 QR 없이 냄 */
async function loadQrDataUrl(target: string): Promise<string | null> {
  try {
    return await toDataURL(target, { margin: 1, width: QR_SIZE });
  } catch (error) {
    logFailure("card.qr", error);
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
  } catch (error) {
    // 조회 실패는 안내 카드로 대체
    logFailure("card.report", error);
  }

  const photoUrl = report ? await loadPhotoUrl(id) : null;

  const lost = report?.kind === "lost";
  const name = report?.pet?.name ?? null;
  // 계속 돌아다니는 카드라 끝난 신고에는 도움을 더 부르지 않는 갈래
  const done = Boolean(lost && report && report.lifecycle !== "searching");
  const found = report?.lifecycle === "resolved";

  // 품종을 단정하지 않고 털색과 크기로만 부르는 짧은 이름
  const described = report
    ? describeAnimal({
        animalType: report.animalType,
        colors: report.colors,
        size: report.size,
      })
    : "";

  // 부르면 반응하는 것이 이름이라 이름 아는 신고는 이름이 가장 크게 읽히는 기준
  // 이름이 없으면 생김새 문장 대신 짧은 호칭을 씀. 긴 문장은 두 줄을 넘겨 아래가 잘림
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
      : lost
        ? `${described || "반려동물"}을 찾고 있어요`
        : `${described || "동물"}을 봤어요`;

  // 생김새는 제목 아래 본문으로 내리고 길면 줄임
  const looks = clamp(report?.appearance?.split("\n")[0]?.trim() ?? "", 38);
  const where = report?.areaName ?? "위치 미확인";
  // 보호 상황 없는 실종은 빈 값으로 두어 배지를 감춤
  // 며칠째 와 오늘 은 긁힌 그림에 굳어 시간이 지나면 거짓이 됨. 언제부터 찾는지는 날짜로만 적음
  const care =
    lost && report
      ? done
        ? found
          ? LIFECYCLE_LABEL.resolved
          : LIFECYCLE_LABEL.closed
        : `${formatMonthDay(report.occurredAt)}부터 찾고 있어요`
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

  const qrDataUrl = await loadQrDataUrl(`${SITE}/r/${id}`);
  const lastSeen = lost && !done ? `${where}에서 마지막으로 봤어요` : where;
  const since =
    lost && report && !done ? `${formatMonthDay(report.occurredAt)}부터 찾고 있어요` : "";
  const cta = done
    ? found
      ? "도와주신 덕분이에요"
      : "더 찾지 않아요"
    : lost
      ? "가족이 기다리고 있어요"
      : "집으로 돌아갈 수 있게 도와주세요";
  const badge = lost ? (done ? (found ? "찾음" : "종료") : "실종") : (STATUS_LABEL[report?.careSituation ?? "unknown"] ?? "발견");

  return new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          background: T.surface,
          color: T.fg,
        }}
      >
        <div style={{ display: "flex", height: STORY_SAFE_TOP }} />

        <div style={{ display: "flex", width, height: STORY_PHOTO_H, overflow: "hidden" }}>
          {photoUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element -- satori 는 next/image 를 해석하지 못하고 원시 img 만 그림 */
            <img
              src={photoUrl}
              width={width}
              height={STORY_PHOTO_H}
              style={{ objectFit: "cover" }}
              alt=""
            />
          ) : (
            <div
              style={{
                display: "flex",
                width,
                height: STORY_PHOTO_H,
                background: T.layer,
              }}
            />
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width,
            height: STORY_PANEL_H,
            padding: `40px ${PADDING}px 0`,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: T.fgMuted }}>다시집</div>
            {badge ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 28,
                  fontWeight: 700,
                  padding: "7px 20px",
                  borderRadius: T.round,
                  background: T.brand,
                  color: T.brandInk,
                }}
              >
                {badge}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", marginTop: 26, fontSize: 58, fontWeight: 700, lineHeight: 1.24 }}>
            {clamp(headline, HEADLINE_MAX)}
          </div>

          {looks ? (
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontSize: 30,
                lineHeight: 1.4,
                color: T.fgMuted,
              }}
            >
              {looks}
            </div>
          ) : null}

          {chips.length ? (
            <div style={{ display: "flex", marginTop: 22, gap: 10 }}>
              {chips.map((chip) => (
                <div
                  key={chip}
                  style={{
                    display: "flex",
                    fontSize: 26,
                    padding: "8px 18px",
                    borderRadius: T.round,
                    background: T.layer,
                    color: T.fgMuted,
                  }}
                >
                  {chip}
                </div>
              ))}
            </div>
          ) : null}

          <div style={{ display: "flex", marginTop: 30, width: "100%", height: 1, background: T.line }} />

          <div style={{ display: "flex", flexDirection: "column", marginTop: 26 }}>
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, lineHeight: 1.3 }}>
              {lastSeen}
            </div>
            {since ? (
              <div style={{ display: "flex", marginTop: 8, fontSize: 28, color: T.fgMuted }}>
                {since}
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 30 }}>
            {qrDataUrl ? (
              <div
                style={{
                  display: "flex",
                  padding: 10,
                  borderRadius: T.radius,
                  background: T.fg,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- satori 는 next/image 를 해석하지 못하고 원시 img 만 그림 */}
                <img src={qrDataUrl} width={QR_SIZE} height={QR_SIZE} alt="" />
              </div>
            ) : null}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", fontSize: 38, fontWeight: 700, lineHeight: 1.25 }}>
                {cta}
              </div>
              {/* 끝난 신고에는 목격을 부르지 않아 헛걸음 방지 */}
              {done ? null : (
                <div style={{ display: "flex", fontSize: 27, color: T.fgMuted }}>
                  QR 을 찍으면 목격 제보 창이 바로 열려요
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", height: STORY_SAFE_BOTTOM }} />
      </div>
    ),
    { width, height, headers: { "Cache-Control": CACHE_CONTROL } },
  );
}
