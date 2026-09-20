import { logFailure } from "@rebirth/core/http";
import type { Metadata } from "next";

import {
  adminOverview,
  breedCodeCoverage,
  careSituationBreakdown,
  govDataSummary,
  rescueKindTotals,
  rescueSidoTotals,
  rescueStateTotals,
  reportsByArea,
  reportsDaily,
  unmatchedBreedGuesses,
} from "@rebirth/db";

import { MetricsView, type MetricsData } from "./view";

export const metadata: Metadata = { title: "지표" };

export const dynamic = "force-dynamic";

const TREND_ROWS = 14;

async function safe<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (error) {
    logFailure("metrics.list", error);
    return fallback;
  }
}

export default async function MetricsPage() {
  const [overview, daily, areas, care] = await Promise.all([
    safe(() => adminOverview(), null),
    safe(() => reportsDaily(), []),
    safe(() => reportsByArea(), []),
    safe(() => careSituationBreakdown(), []),
  ]);

  const [gov, states, kinds, sido, breed, unmatched] = await Promise.all([
    safe(() => govDataSummary(), undefined),
    safe(() => rescueStateTotals(), []),
    safe(() => rescueKindTotals(), []),
    safe(() => rescueSidoTotals(), []),
    safe(() => breedCodeCoverage(), undefined),
    safe(() => unmatchedBreedGuesses(), []),
  ]);

  const data: MetricsData = {
    overview,
    daily: daily.slice(0, TREND_ROWS),
    areas,
    care,
    gov: gov ?? null,
    rescueStates: states,
    rescueKinds: kinds,
    rescueSido: sido,
    breed: breed ?? null,
    unmatchedBreeds: unmatched,
  };

  return <MetricsView data={data} />;
}
