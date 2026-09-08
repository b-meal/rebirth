import type { Metadata } from "next";
import { SightingDetailView } from "./view";

export const metadata: Metadata = { title: "제보 상세" };

export default async function SightingDetailPage({
  params,
}: PageProps<"/sightings/[id]">) {
  const { id } = await params;

  return <SightingDetailView id={id} />;
}
