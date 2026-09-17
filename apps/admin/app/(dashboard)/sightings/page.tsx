import type { Metadata } from "next";

import { listAdminReports } from "@rebirth/db";

import { SightingsView, type AdminReportRow } from "./view";

export const metadata: Metadata = { title: "제보" };

export const dynamic = "force-dynamic";

const PAGE_SIZE = 100;

export default async function SightingsPage() {
  const rows = await listAdminReports({ kind: "sighting", limit: PAGE_SIZE }).catch(
    () => [],
  );

  const items: AdminReportRow[] = rows.map((row) => ({
    id: row.id,
    animalType: row.animalType,
    appearance: row.appearance,
    colors: row.colors,
    size: row.size,
    careSituation: row.careSituation,
    areaName: row.areaName,
    visibility: row.visibility,
    lifecycle: row.lifecycle,
    aiModel: row.aiModel,
    aiEditedFields: row.aiEditedFields,
    occurredAt: row.occurredAt.toISOString(),
  }));

  return <SightingsView items={items} />;
}
