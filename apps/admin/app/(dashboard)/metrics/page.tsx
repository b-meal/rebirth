import type { Metadata } from "next";

import {
  adminOverview,
  careSituationBreakdown,
  reportsByArea,
  reportsDaily,
} from "@rebirth/db";

import { MetricsView, type MetricsData } from "./view";

export const metadata: Metadata = { title: "지표" };

export const dynamic = "force-dynamic";

const TREND_ROWS = 14;

export default async function MetricsPage() {
  const [overview, daily, areas, care] = await Promise.all([
    adminOverview().catch(() => null),
    reportsDaily().catch(() => []),
    reportsByArea().catch(() => []),
    careSituationBreakdown().catch(() => []),
  ]);

  const data: MetricsData = {
    overview,
    daily: daily.slice(0, TREND_ROWS),
    areas,
    care,
  };

  return <MetricsView data={data} />;
}
