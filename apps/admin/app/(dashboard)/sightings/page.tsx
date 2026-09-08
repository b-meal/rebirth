import type { Metadata } from "next";
import { SightingsView } from "./view";

export const metadata: Metadata = { title: "제보" };

export default function SightingsPage() {
  return <SightingsView />;
}
