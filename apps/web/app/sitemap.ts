import { logFailure } from "@rebirth/core/http";
import { listPublicReports } from "@rebirth/db";
import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// 한 파일에 담는 상한, 넘기면 색인 파일을 쪼개야 함
const REPORT_LIMIT = 5000;

const STATIC_PATHS = ["/", "/find", "/reports", "/shelters", "/community"];

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
  }));

  let rows: Awaited<ReturnType<typeof listPublicReports>> = [];
  try {
    // includeClosed 기본값이 visibility public 과 lifecycle active searching 을 함께 걸러 줌
    rows = await listPublicReports({ limit: REPORT_LIMIT });
  } catch (error) {
    // 조회가 실패해도 고정 경로만으로 색인 파일을 내보냄
    // 제보가 통째로 빠진 사이트맵은 검색 유입이 조용히 끊기는 길이라 남겨 둠
    logFailure("sitemap.reports", error);
  }

  return [
    ...entries,
    ...rows.map((row) => ({
      url: `${siteUrl}/r/${row.id}`,
      lastModified: row.createdAt,
    })),
  ];
}
