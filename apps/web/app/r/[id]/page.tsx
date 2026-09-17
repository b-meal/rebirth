import { DRAFT_COOKIE, hashToken, peekManageAccess } from "@rebirth/core/http";
import { distanceKm } from "@rebirth/core/location/geo";
import { createSignedThumbUrls } from "@rebirth/core/storage";
import {
  countReportInterests,
  findNearbyShelters,
  findPublicReport,
  findReportCoarsePoint,
  hasReportInterest,
  isReportAreaSubscribed,
  isReportReporter,
  listMapReports,
  listReportComments,
} from "@rebirth/db";
import { LIST_PERIOD_DAYS } from "@rebirth/types";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";
import { CARE_LABEL, describeAnimal, searchingDays, sinceLabel } from "@/lib/report-label";
import { LostDetail } from "@/components/lost/lost-detail";
import { ReportDetail } from "@/components/report/report-detail";
import type { ReportCardItem } from "@/components/report/report-card";
import type { ReportComment } from "@/components/report/report-comments";
import type { ShelterItem } from "@/components/report/report-shelters";

// 공유 링크를 받은 제3자용 화면, 정확 좌표와 제보자 정보와 품종 확정 표현 제외
// 발견 제보와 실종 신고가 한 표에 담겨 있어 kind 로 화면을 갈라 그림

type Params = { params: Promise<{ id: string }> };

// 숨김 처리와 새 제보, 새 댓글이 즉시 반영돼야 해 캐시하지 않음
export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// 아래에 붙이는 다른 제보 수와 조회 기간
const NEARBY_COUNT = 4;
const NEARBY_DAYS = LIST_PERIOD_DAYS[1];
// 전화를 걸 만한 후보 수. 더 늘리면 고르는 일이 되어 버림
const SHELTER_COUNT = 3;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;

  let report: Awaited<ReturnType<typeof findPublicReport>> = undefined;
  try {
    report = await findPublicReport(id);
  } catch {
    // 조회 실패 시 기본 메타로 떨어뜨림
  }

  if (!report) {
    return { title: "찾는 제보가 없습니다", robots: { index: false } };
  }

  const isLost = report.kind === "lost";
  // 끝난 신고는 링크 미리보기로도 목격을 부르지 않음. 카드가 계속 돌아다니기 때문
  const isDone = isLost && report.lifecycle !== "searching";
  const where = report.areaName ?? "위치 미확인";
  // layout 의 title.template 이 서비스명을 붙이므로 여기서 넣지 않음
  const petName = report.pet?.name ?? null;
  const title = isDone
    ? (petName ?? "끝난 신고")
    : (petName ?? report.appearance?.split("\n")[0] ?? (isLost ? "반려동물을 찾고 있어요" : "발견동물 제보"));
  // 링크 미리보기에서 한눈에 판단할 값만 앞에 둠. 카카오톡은 두 줄 남짓만 보임
  // 실종 신고는 보호 상황을 쓰지 않아 그 자리를 비움
  const facts = [
    where,
    isLost ? null : CARE_LABEL[report.careSituation],
    describeAnimal(report),
  ].filter(Boolean);
  const description = isDone
    ? `${facts.join(", ")} — ${report.lifecycle === "resolved" ? "가족을 만났어요" : "끝난 신고예요"}`
    : isLost
      ? `${facts.join(", ")} — 이 아이를 본 적 있나요?`
      : `${facts.join(", ")} — 이 동물을 본 적 있나요?`;
  const image = `${SITE}/r/${id}/card`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "다시집",
      locale: "ko_KR",
      url: `${SITE}/r/${id}`,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${where}에서 ${isLost ? "잃어버린" : "발견된"} 동물`,
        },
      ],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

type NearbyOrigin = { lat: number; lng: number } | null;

/**
 * 아래에 붙일 다른 제보. 좌표가 있으면 가까운 순, 없으면 최근 순
 * 격자 좌표는 서버에서만 읽고 카드에는 지역명만 내보냄. POL-09
 */
async function loadNearby(currentId: string, origin: NearbyOrigin): Promise<ReportCardItem[]> {
  try {
    const since = new Date(Date.now() - NEARBY_DAYS * 86_400_000);
    const rows = (await listMapReports({ fromOccurredAt: since })).filter(
      (row) => row.id !== currentId && row.coarsePoint !== null,
    );

    const ordered = origin
      ? [...rows].sort(
          (a, b) =>
            distanceKm(origin, { lat: a.coarsePoint!.y, lng: a.coarsePoint!.x }) -
            distanceKm(origin, { lat: b.coarsePoint!.y, lng: b.coarsePoint!.x }),
        )
      : rows;
    const picked = ordered.slice(0, NEARBY_COUNT);

    // 비공개 버킷이라 서명이 필요하고 카드와 핀이 같은 축소본을 함께 씀
    const paths = picked.flatMap((row) => (row.photoPath ? [row.photoPath] : []));
    const signed = await createSignedThumbUrls(paths).catch(() => new Map<string, string>());

    return picked.map((row) => ({
      id: row.id,
      animalType: row.animalType,
      colors: row.colors,
      size: row.size,
      careSituation: row.careSituation,
      injury: row.injury,
      areaName: row.areaName,
      sinceLabel: sinceLabel(row.occurredAt),
      photoUrl: row.photoPath ? (signed.get(row.photoPath) ?? null) : null,
    }));
  } catch {
    return [];
  }
}

/** 근처 보호, 구조 기관. 아직 시드되지 않았거나 조회가 실패하면 절을 감춤 */
async function loadShelters(origin: NearbyOrigin): Promise<ShelterItem[]> {
  if (!origin) return [];
  try {
    return await findNearbyShelters({ point: origin, limit: SHELTER_COUNT });
  } catch {
    return [];
  }
}

async function loadComments(reportId: string): Promise<ReportComment[]> {
  try {
    const rows = await listReportComments(reportId);
    return rows.map((row) => ({
      id: row.id,
      authorSeq: row.authorSeq,
      body: row.body,
      sinceLabel: sinceLabel(row.createdAt),
    }));
  } catch {
    return [];
  }
}

/** 하트 상태는 쿠키 해시로 바로 조회함, 열람만으로 세션을 새로 만들지 않음 */
async function loadInterest(reportId: string): Promise<{ count: number; mine: boolean }> {
  try {
    const token = (await cookies()).get(DRAFT_COOKIE)?.value;
    const [count, mine] = await Promise.all([
      countReportInterests(reportId),
      token ? hasReportInterest({ reportId, tokenHash: hashToken(token) }) : false,
    ]);
    return { count, mine };
  } catch {
    return { count: 0, mine: false };
  }
}

/**
 * 내 기록인지와 지금 이 브라우저가 관리할 수 있는지
 * 두 값은 다른 축임. 로그인 계정은 소유를 말할 뿐이고 고치고 닫는 권한은
 * 관리 주소를 교환해 받은 세션에서만 나옴. POL-03
 */
async function loadOwnership(
  reportId: string,
): Promise<{ mine: boolean; canManage: boolean }> {
  try {
    const user = await getCurrentUser();
    const mine = user ? await isReportReporter({ reportId, userId: user.id }) : false;
    // 서버 컴포넌트는 Request 를 받지 않아 쿠키를 헤더에서 되살려 관리 세션을 찾음
    // 열람일 뿐이라 유휴 만료를 밀지 않는 쪽을 씀. 여기서 touch 하면 상세를 보기만 해도
    // 만료가 계속 밀려 고치고 지우는 권한의 유휴 만료가 사라짐. POL-04
    const cookie = (await headers()).get("cookie") ?? "";
    const canManage = await peekManageAccess(
      new Request("http://local", { headers: { cookie } }),
      reportId,
    );
    return { mine, canManage };
  } catch {
    return { mine: false, canManage: false };
  }
}

/** 구독 버튼의 시작 상태. 로그인 전이면 끈 상태로 두고 누를 때 로그인으로 보냄 */
async function loadAreaSubscribed(reportId: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    return await isReportAreaSubscribed(user.id, reportId);
  } catch {
    return false;
  }
}

export default async function ReportDetailPage({ params }: Params) {
  const { id } = await params;

  const report = await findPublicReport(id);
  if (!report) notFound();

  const spot = await findReportCoarsePoint(id).catch(() => undefined);
  const point = spot?.coarsePoint ? { lat: spot.coarsePoint.y, lng: spot.coarsePoint.x } : null;

  const isLost = report.kind === "lost";

  const [comments, nearby, shelters, interest, areaSubscribed, ownership] = await Promise.all([
    loadComments(id),
    loadNearby(id, point),
    loadShelters(point),
    loadInterest(id),
    loadAreaSubscribed(id),
    // 발견 제보에는 관리 줄이 없어 실종일 때만 물음
    isLost ? loadOwnership(id) : Promise.resolve({ mine: false, canManage: false }),
  ]);

  if (isLost) {
    return (
      <LostDetail
        report={report}
        ownership={ownership}
        shareUrl={`${SITE}/r/${id}`}
        sinceLabel={sinceLabel(report.occurredAt)}
        searchingDays={searchingDays(report.occurredAt)}
        location={point ? { point, gridMeters: spot?.coarseGridM ?? 300 } : null}
        comments={comments}
        nearby={nearby}
        shelters={shelters}
        interest={interest}
        areaSubscribed={areaSubscribed}
      />
    );
  }

  return (
    <ReportDetail
      report={report}
      shareUrl={`${SITE}/r/${id}`}
      sinceLabel={sinceLabel(report.occurredAt)}
      location={point ? { point, gridMeters: spot?.coarseGridM ?? 300 } : null}
      comments={comments}
      nearby={nearby}
      shelters={shelters}
      interest={interest}
      areaSubscribed={areaSubscribed}
    />
  );
}
