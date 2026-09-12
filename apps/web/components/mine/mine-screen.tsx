import Link from "next/link";
import {
  AspectRatio,
  Box,
  Divider,
  HStack,
  Icon,
  ImageFrame,
  Text,
  VStack,
} from "@seed-design/react";
import {
  IconChevronRightLine,
  IconTrashcanLine,
  IconHospitalcrossShieldLine,
  IconPawprintLine,
  IconPersonFill,
  IconWonShieldLine,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";

import { AppHeader } from "@/components/ui/app-header";
import { Screen, SectionCard } from "@/components/ui/screen";
import { ANIMAL_LABEL, SIZE_LABEL, breedLabel } from "@/lib/report-label";

// 마이페이지, 제보는 로그인 없이도 되므로 여기서만 계정을 요구함

const PROVIDER_LABEL: Record<string, string> = {
  kakao: "카카오",
  google: "구글",
};

// 계정 없이도 쓰는 기능이라 로그인 화면으로 보낼 곳을 미리 정해 둠
const SIGN_IN_HREF = `${SIGN_IN_PATH}?${NEXT_PARAM}=%2Fmine`;

const LINKS = [
  { href: "/guide/injured", label: "다친 동물 구조 요청", icon: <IconHospitalcrossShieldLine /> },
  { href: "/reports", label: "최근 발견 제보 모아 보기", icon: <IconPawprintLine /> },
  { href: "/privacy", label: "개인정보 처리방침", icon: <IconWonShieldLine /> },
] as const;

export type MineUser = {
  displayName: string | null;
  avatarUrl: string | null;
  provider: string;
  createdAt: Date | string;
};

export type PetCard = {
  id: string;
  name: string;
  animalType: string;
  breedGuess: string | null;
  size: string;
  colors: string[];
  note: string | null;
  photoUrl: string | null;
};

export type MineScreenProps = {
  user: MineUser | null;
  pets: PetCard[];
  /** 로그인 설정이 끝나지 않은 환경에서는 로그인 버튼을 감춤 */
  authReady: boolean;
  signOut: React.ReactNode;
  removePet: (form: FormData) => Promise<void>;
};

function joinedLabel(value: Date | string): string {
  const date = new Date(value);
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월부터 함께`;
}

function EmptyRow({ title, hint }: { title: string; hint: string }) {
  return (
    <VStack align="stretch" gap="x1">
      <Text textStyle="t4Regular" color="fg.neutralMuted">
        {title}
      </Text>
      <Text textStyle="t3Regular" color="fg.neutralSubtle">
        {hint}
      </Text>
    </VStack>
  );
}

/** 등록한 동물 한 줄. 사진과 이름, 특징 요약을 함께 보여 줌 */
function PetRow({ pet, removePet }: { pet: PetCard; removePet: (form: FormData) => Promise<void> }) {
  const detail = [ANIMAL_LABEL[pet.animalType] ?? "", breedLabel(pet.breedGuess) ?? "", SIZE_LABEL[pet.size] ?? ""]
    .filter(Boolean)
    .concat(pet.colors)
    .join(", ");

  return (
    <HStack gap="x3" align="center">
      {pet.photoUrl ? (
        <ImageFrame ratio={1} width="56px" src={pet.photoUrl} alt="" borderRadius="r3" />
      ) : (
        <Box width="56px">
          <AspectRatio ratio={1} borderRadius="r3" bg="bg.neutralWeak">
            <Box />
          </AspectRatio>
        </Box>
      )}

      <VStack align="stretch" gap="x0_5" grow={1} minWidth="0">
        <Text textStyle="t4Bold" color="fg.neutral" maxLines={1}>
          {pet.name}
        </Text>
        <Text textStyle="t3Regular" color="fg.neutralMuted" maxLines={1}>
          {detail || "특징 미입력"}
        </Text>
        {pet.note ? (
          <Text textStyle="t2Regular" color="fg.neutralSubtle" maxLines={1}>
            {pet.note}
          </Text>
        ) : null}
      </VStack>

      {/* design-system-allow:raw-element form 은 SEED 에 대응 컴포넌트가 없는 표준 요소 */}
      <form action={removePet}>
        <input type="hidden" name="id" value={pet.id} />
        <ActionButton type="submit" variant="ghost" size="xsmall" layout="iconOnly" aria-label={`${pet.name} 삭제`}>
          <Icon svg={<IconTrashcanLine />} />
        </ActionButton>
      </form>
    </HStack>
  );
}

export function MineScreen({
  user,
  pets,
  authReady,
  signOut,
  removePet,
}: MineScreenProps) {
  return (
    <Screen bg="bg.layerBasement">
      <AppHeader title="마이페이지" home />

      <VStack align="stretch" gap="x2" pb="x10">
        <SectionCard gap="x4">
          {user ? (
            <HStack align="center" gap="x3">
              <Avatar
                size="56"
                src={user.avatarUrl ?? undefined}
                alt=""
                fallback={
                  user.displayName?.slice(0, 1) ?? <Icon svg={<IconPersonFill />} color="fg.neutralSubtle" />
                }
              />
              <VStack align="stretch" gap="x0_5" minWidth="0">
                <Text textStyle="t6Bold" color="fg.neutral" maxLines={1}>
                  {user.displayName ?? "이름 없음"}
                </Text>
                <Text textStyle="t3Regular" color="fg.neutralMuted">
                  {PROVIDER_LABEL[user.provider] ?? "SNS"} 계정 · {joinedLabel(user.createdAt)}
                </Text>
                <Text textStyle="t3Regular" color="fg.neutralSubtle">
                  우리 동물 {pets.length}
                </Text>
              </VStack>
            </HStack>
          ) : (
            <VStack align="stretch" gap="x3">
              <VStack align="stretch" gap="x1">
                <Text textStyle="t5Bold" color="fg.neutral">
                  로그인하면 남긴 제보와 관심을 모아 볼 수 있습니다
                </Text>
                <Text textStyle="t3Regular" color="fg.neutralMuted">
                  로그인하지 않아도 제보와 댓글은 그대로 쓸 수 있습니다
                </Text>
              </VStack>
              {authReady ? (
                <HStack align="stretch">
                  <ActionButton variant="brandSolid" size="large" flexGrow={1} asChild>
                    <Link href={SIGN_IN_HREF}>로그인</Link>
                  </ActionButton>
                </HStack>
              ) : (
                <Text textStyle="t3Regular" color="fg.neutralSubtle">
                  SNS 로그인 설정이 아직 끝나지 않았습니다
                </Text>
              )}
            </VStack>
          )}
          {user ? (
            <HStack align="stretch">
              <ActionButton variant="neutralWeak" size="medium" flexGrow={1} asChild>
                <Link href="/mine/profile">프로필 수정</Link>
              </ActionButton>
            </HStack>
          ) : null}
        </SectionCard>

        {user ? (
          <>
            <SectionCard gap="x3">
              <HStack justify="space-between" align="center">
                <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                  우리 동물
                </Text>
                <ActionButton variant="ghost" size="xsmall" asChild>
                  <Link href="/mine/pets/new">등록</Link>
                </ActionButton>
              </HStack>

              {pets.length === 0 ? (
                <EmptyRow
                  title="등록한 동물이 없습니다"
                  hint="미리 적어 두면 실종 신고를 쓸 때 그대로 불러올 수 있습니다"
                />
              ) : (
                <VStack align="stretch" gap="x3">
                  {pets.map((pet) => (
                    <PetRow key={pet.id} pet={pet} removePet={removePet} />
                  ))}
                </VStack>
              )}
            </SectionCard>

          </>
        ) : null}

        <SectionCard gap="x1">
          {LINKS.map((link, index) => (
            <VStack key={link.href} align="stretch">
              {index > 0 ? <Divider /> : null}
              <HStack asChild gap="x3" align="center" py="x3">
                <Link href={link.href}>
                  <Icon svg={link.icon} size="x5" color="fg.neutralMuted" />
                  <Text textStyle="t4Regular" color="fg.neutral" maxLines={1}>
                    {link.label}
                  </Text>
                  <HStack marginLeft="auto">
                    <Icon svg={<IconChevronRightLine />} size="x4" color="fg.neutralSubtle" />
                  </HStack>
                </Link>
              </HStack>
            </VStack>
          ))}
        </SectionCard>

        {user ? <SectionCard gap="x2">{signOut}</SectionCard> : null}
      </VStack>
    </Screen>
  );
}
