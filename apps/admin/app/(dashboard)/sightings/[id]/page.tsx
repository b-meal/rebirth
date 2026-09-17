import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { findAdminReport, listMatchesForSighting } from "@rebirth/db";
import { FLAG_REASON_LABEL, type FlagReason } from "@rebirth/types";

import { SightingDetailView, type SightingDetail } from "./view";

export const metadata: Metadata = { title: "제보 상세" };

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function SightingDetailPage({ params }: Params) {
  const { id } = await params;

  const report = await findAdminReport(id).catch(() => undefined);
  if (!report) notFound();

  const matches = await listMatchesForSighting(id).catch(() => []);

  const detail: SightingDetail = {
    id: report.id,
    kind: report.kind,
    animalType: report.animalType,
    breedGuess: report.breedGuess,
    appearance: report.appearance,
    colors: report.colors,
    size: report.size,
    careSituation: report.careSituation,
    conditionTags: report.conditionTags,
    collar: report.collar,
    injury: report.injury,
    earTip: report.earTip,
    areaName: report.areaName,
    areaCode: report.areaCode,
    locationSource: report.locationSource,
    coarseGridM: report.coarseGridM,
    visibility: report.visibility,
    lifecycle: report.lifecycle,
    version: report.version,
    aiModel: report.aiModel,
    aiEditedFields: report.aiEditedFields,
    aiAnalyzedAt: report.aiAnalyzedAt?.toISOString() ?? null,
    occurredAt: report.occurredAt.toISOString(),
    createdAt: report.createdAt.toISOString(),
    photoCount: report.photos.length,
    flags: report.flags.map((flag) => ({
      id: flag.id,
      reason: FLAG_REASON_LABEL[flag.reason as FlagReason] ?? flag.reason,
      resolvedAt: flag.resolvedAt?.toISOString() ?? null,
      createdAt: flag.createdAt.toISOString(),
    })),
    matches: matches.map((match) => ({
      lostId: match.lostId,
      score: match.score,
      breakdown: match.breakdown,
    })),
  };

  return <SightingDetailView detail={detail} />;
}
