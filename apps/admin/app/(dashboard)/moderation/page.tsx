import type { Metadata } from "next";
import { ModerationView } from "./view";

export const metadata: Metadata = { title: "검수" };

export default function ModerationPage() {
  return <ModerationView />;
}
