import type { Metadata } from "next";
import { MetricsView } from "./view";

export const metadata: Metadata = { title: "지표" };

export default function MetricsPage() {
  return <MetricsView />;
}
