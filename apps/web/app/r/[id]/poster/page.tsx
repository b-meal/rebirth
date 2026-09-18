import { createSignedUrl } from "@rebirth/core/storage";
import { findPublicReport, findReportPhotoPaths } from "@rebirth/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { toString as qrToString } from "qrcode";
import { Box, HStack, Text, VStack } from "@seed-design/react";

import { STATUS_LABEL, describeAnimal, formatAbsolute, withObject } from "@/lib/report-label";
import { PrintButton } from "./print-button";

// 손으로 붙이는 A4 전단, 마지막 목격은 지역명까지만 적고 정확 좌표 제외

type Params = { params: Promise<{ id: string }> };

// 찾음으로 바뀐 신고를 계속 인쇄하지 않게 매번 다시 읽음
export const dynamic = "force-dynamic";

// 전단이 검색에 잡히면 신고 원본과 입구가 둘로 갈림
export const metadata: Metadata = { robots: { index: false } };

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// QR 한 변, 폰 카메라가 한 걸음 거리에서 읽는 최소치 기준
const QR_SIZE = 200;

/**
 * 인쇄 전용 규칙, 색은 화면과 같은 SEED 토큰을 쓰고 여기서는 종이 크기와 여백만 정함
 * :has 로 전단을 품은 조상만 골라 앱 프레임의 390px 폭 제한을 종이 한 장으로 폄
 */
const PRINT_CSS = `
@page { size: A4; margin: 12mm; }
@media print {
  body { background: none; }
  body *:has(.rebirth-poster) {
    max-width: none;
    width: auto;
    min-height: 0;
    background: none;
  }
  .rebirth-poster { break-inside: avoid; }
  .rebirth-poster-screen-only { display: none; }
}
`;

/** 사진이 없거나 서명이 실패하면 글자만으로 전단을 냄 */
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

/** QR 생성이 실패해도 전단은 나와야 하므로 빈 문자열로 떨어뜨림 */
async function loadQrSvg(url: string): Promise<string> {
  try {
    return await qrToString(url, { type: "svg", margin: 1, width: QR_SIZE });
  } catch {
    return "";
  }
}

export default async function LostPosterPage({ params }: Params) {
  const { id } = await params;

  const report = await findPublicReport(id);
  // 발견 제보와 끝난 신고는 붙일 전단이 아님
  if (!report || report.kind !== "lost" || report.lifecycle !== "searching") notFound();

  const shareUrl = `${SITE}/r/${id}`;
  const [photoUrl, qrSvg] = await Promise.all([loadPhotoUrl(id), loadQrSvg(shareUrl)]);

  const name = report.pet?.name ?? null;
  // 보호자가 적어 둔 품종은 아는 값이라 계열 추정을 붙이지 않음
  const breedText = report.pet?.breedGuess ?? null;
  const looks = [breedText, describeAnimal(report)].filter(Boolean).join(", ");
  const where = report.areaName ?? "지역 미확인";

  return (
    <VStack
      align="stretch"
      gap="x6"
      px="spacingX.globalGutter"
      py="x6"
      bg="bg.layerDefault"
      className="rebirth-poster"
    >
      <style>{PRINT_CSS}</style>

      <VStack align="stretch" gap="x2">
        <Text textStyle="t4Bold" color="fg.critical">
          {STATUS_LABEL.lost}
        </Text>
        <Text as="h1" textStyle="t9Bold" color="fg.neutral">
          {name ? `${withObject(name)} 찾고 있어요` : "이 아이를 찾고 있어요"}
        </Text>
        <Text textStyle="t5Regular" color="fg.neutralMuted">
          {looks}
        </Text>
      </VStack>

      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- 서명 URL 은 remotePatterns 밖이고 인쇄본은 최적화가 필요 없음
        <img
          src={photoUrl}
          alt={`${where}에서 잃어버린 동물`}
          style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover" }}
        />
      ) : null}

      <VStack align="stretch" gap="x3">
        <VStack align="stretch" gap="x1">
          <Text textStyle="t4Bold" color="fg.neutral">
            마지막으로 본 곳
          </Text>
          <Text textStyle="t6Regular" color="fg.neutral">
            {where}
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            {formatAbsolute(report.occurredAt)}
          </Text>
        </VStack>

        {report.appearance ? (
          <VStack align="stretch" gap="x1">
            <Text textStyle="t4Bold" color="fg.neutral">
              생김새
            </Text>
            <Text textStyle="t5Regular" color="fg.neutral">
              {report.appearance}
            </Text>
          </VStack>
        ) : null}
      </VStack>

      <HStack align="center" gap="x4">
        {qrSvg ? (
          // QR 은 qrcode 가 만든 문자열만 들어오고 사용자 입력이 닿지 않는 경로
          <Box
            width={`${QR_SIZE}px`}
            flexShrink={0}
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
        ) : null}
        <VStack align="stretch" gap="x1" minWidth="0">
          <Text textStyle="t5Bold" color="fg.neutral">
            보신 적 있나요
          </Text>
          <Text textStyle="t4Regular" color="fg.neutralMuted">
            폰 카메라로 이 QR 을 비추면 목격 제보 창이 열려요. 전화번호를 적지 않아도 돼요
          </Text>
          <Text textStyle="t3Regular" color="fg.neutralSubtle">
            {shareUrl}
          </Text>
        </VStack>
      </HStack>

      <VStack align="stretch" gap="x2" className="rebirth-poster-screen-only">
        <PrintButton />
        <Text textStyle="t3Regular" color="fg.neutralSubtle">
          인쇄 대화상자에서 용지를 A4, 배율을 100% 로 두면 이 화면 그대로 나와요
        </Text>
      </VStack>
    </VStack>
  );
}
