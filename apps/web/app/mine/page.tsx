import type { Metadata } from "next";

import { createSignedThumbUrls } from "@rebirth/core/storage";
import { listInterestedReports, listPets, listReportsByReporter } from "@rebirth/db";

import { sinceLabel } from "@/lib/report-label";
import { getCurrentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/supabase/config";
import { MineScreen, type PetCard } from "@/components/mine/mine-screen";
import type { ReportCardItem } from "@/components/report/report-card";
import { SignOutButton } from "./sign-out-button";
import { removePet } from "./actions";

// 계정 화면, 로그인 여부에 따라 권유와 활동 내역을 갈라 보여 줌

export const metadata: Metadata = { title: "마이페이지" };

// 방금 남긴 제보와 관심이 바로 보여야 해 캐시하지 않음
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  animalType: ReportCardItem["animalType"];
  colors: string[];
  size: string;
  careSituation: string;
  injury: boolean | null;
  areaName: string | null;
  occurredAt: Date;
  photoPath: string | null;
};

/** 카드에 쓸 사진만 서명해 붙임, 경로는 화면으로 내보내지 않음 */
async function toCards(rows: Row[]): Promise<ReportCardItem[]> {
  const paths = rows.flatMap((row) => (row.photoPath ? [row.photoPath] : []));
  const signed = await createSignedThumbUrls(paths).catch(() => new Map<string, string>());

  return rows.map((row) => ({
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
}

/** 등록한 동물 카드. 사진 경로는 서명해 붙이고 화면으로 내보내지 않음 */
async function toPetCards(
  rows: {
    id: string;
    name: string;
    animalType: string;
    breedGuess: string | null;
    size: string;
    colors: string[];
    note: string | null;
    photoPath: string | null;
  }[],
): Promise<PetCard[]> {
  const paths = rows.flatMap((row) => (row.photoPath ? [row.photoPath] : []));
  const signed = await createSignedThumbUrls(paths).catch(() => new Map<string, string>());

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    animalType: row.animalType,
    breedGuess: row.breedGuess,
    size: row.size,
    colors: row.colors,
    note: row.note,
    photoUrl: row.photoPath ? (signed.get(row.photoPath) ?? null) : null,
  }));
}

export default async function MinePage() {
  const user = await getCurrentUser();

  const [myReports, interested, pets] = user
    ? await Promise.all([
        listReportsByReporter(user.id).then(toCards).catch(() => []),
        listInterestedReports(user.id).then(toCards).catch(() => []),
        listPets(user.id).then(toPetCards).catch((): PetCard[] => []),
      ])
    : [[], [], []];

  return (
    <MineScreen
      user={
        user
          ? {
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              provider: user.provider,
              createdAt: user.createdAt,
            }
          : null
      }
      myReports={myReports}
      interested={interested}
      pets={pets}
      authReady={isAuthConfigured()}
      signOut={<SignOutButton />}
      removePet={removePet}
    />
  );
}
