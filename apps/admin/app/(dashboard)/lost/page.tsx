import type { Metadata } from "next";

import { listAdminReports } from "@rebirth/db";

import { LostView, type LostRow } from "./view";

export const metadata: Metadata = { title: "실종 신고" };

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function LostPage() {
  const rows = await listAdminReports({ kind: "lost", limit: PAGE_SIZE }).catch(() => []);

  const items: LostRow[] = rows.map((row) => ({
    id: row.id,
    animalType: row.animalType,
    colors: row.colors,
    size: row.size,
    breedGuess: row.breedGuess,
    conditionTags: row.conditionTags,
    areaName: row.areaName,
    lifecycle: row.lifecycle,
    visibility: row.visibility,
    occurredAt: row.occurredAt.toISOString(),
  }));

  return <LostView items={items} />;
}
