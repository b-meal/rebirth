import type { Metadata } from "next";
import { LostView } from "./view";

export const metadata: Metadata = { title: "실종 신고" };

export default function LostPage() {
  return <LostView />;
}
