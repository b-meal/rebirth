import type { Metadata } from "next";

import { isAutoSignInEnabled } from "@rebirth/core/auth";
import { createSignedThumbUrls } from "@rebirth/core/storage";
import {
  countReporterReportsByKind,
  countUnreadAreaReports,
  countUnreadMatchAlerts,
  listPets,
} from "@rebirth/db";

import { getCurrentUser } from "@/lib/auth/session";
import { isAuthConfigured } from "@/lib/supabase/config";
import { MineScreen, type PetCard } from "@/components/mine/mine-screen";
import { SignOutButton } from "./sign-out-button";
import { removePet } from "./actions";

// 계정 화면, 로그인 여부에 따라 권유와 활동 내역을 갈라 보여 줌

export const metadata: Metadata = { title: "마이페이지" };

// 방금 남긴 제보와 관심이 바로 보여야 해 캐시하지 않음
export const dynamic = "force-dynamic";

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

  // 서로 기다릴 이유가 없어 함께 보냄
  const [pets, counts, unread] = user
    ? await Promise.all([
        listPets(user.id).then(toPetCards).catch((): PetCard[] => []),
        countReporterReportsByKind(user.id).catch(() => ({ sighting: 0, lost: 0 })),
        // 동네 새 제보와 내 신고에 닮은 제보를 한 숫자로 합침
        Promise.all([
          countUnreadAreaReports(user.id).catch(() => 0),
          countUnreadMatchAlerts(user.id).catch(() => 0),
        ]).then(([areas, matches]) => areas + matches),
      ])
    : [[], { sighting: 0, lost: 0 }, 0];

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
      pets={pets}
      counts={counts}
      unread={unread}
      authReady={isAuthConfigured()}
      signOut={
        <SignOutButton restartsGuest={user?.provider === "anonymous" && isAutoSignInEnabled()} />
      }
      removePet={removePet}
    />
  );
}
