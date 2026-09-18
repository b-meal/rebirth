import "server-only";

import Link from "next/link";
import {
  AspectRatio,
  Box,
  Grid,
  HStack,
  Icon,
  ImageFrame,
  Text,
  VStack,
} from "@seed-design/react";
import {
  IconBellLine,
  IconChevronRightLine,
  IconHeadsetLine,
  IconMegaphoneLine,
  IconPawprintLine,
  IconPersonFill,
  IconWonShieldLine,
} from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Avatar } from "seed-design/ui/avatar";

import { NEXT_PARAM, SIGN_IN_PATH } from "@rebirth/core/auth";

import { AppHeader } from "@/components/ui/app-header";
import { Badge } from "@/components/ui/badge";
import { Screen, SectionCard } from "@/components/ui/screen";
import { ANIMAL_LABEL, SIZE_LABEL } from "@/lib/report-label";
import { SHORTCUTS, type MineLink } from "@/lib/shortcuts";
import { RecentReports } from "./recent-reports";
import { DeletePetButton } from "./delete-pet-button";

// 마이페이지, 제보는 로그인 없이도 되므로 여기서만 계정을 요구함

const PROVIDER_LABEL: Record<string, string> = {
  kakao: "카카오",
  google: "구글",
  anonymous: "체험",
};

// 계정 없이도 쓰는 기능이라 로그인 화면으로 보낼 곳을 미리 정해 둠
const SIGN_IN_HREF = `${SIGN_IN_PATH}?${NEXT_PARAM}=%2Fmine`;

/** 동물 사진 한 변 */
const PET_THUMB = "56px";

// 내 기록은 위 숫자 칸이 맡고, 이 목록은 계정과 상관없이 늘 같은 줄만 둠
const LINKS: MineLink[] = [
  // 계정이 없어도 물을 일이 생겨 로그인과 상관없이 둠
  { href: "/support", label: "문의하기", icon: <IconHeadsetLine /> },
  { href: "/privacy", label: "개인정보 처리방침", icon: <IconWonShieldLine /> },
];

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
  /** 종류별 기록 수. 숨김과 종료도 포함해 기록이 사라져 보이지 않게 함 */
  counts: { sighting: number; lost: number };
  /** 구독한 동네에 마지막으로 본 뒤 올라온 제보 수 */
  unread: number;
  /** 로그인 설정이 끝나지 않은 환경에서는 로그인 버튼을 감춤 */
  authReady: boolean;
  signOut: React.ReactNode;
  removePet: (form: FormData) => Promise<void>;
};

/** 구를 통째로 구독하면 세 자리가 넘어 배지가 줄을 밀어냄 */
function unreadLabel(count: number): string {
  return count > 99 ? "99+" : `${count}`;
}

function joinedLabel(value: Date | string): string {
  const date = new Date(value);
  // 아바타 옆 한 줄이라 길어지면 줄바꿈됨. 제공자 이름과 합쳐 22자 안에 둠
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

/** 기록 한 종류. 숫자를 눌러 그 목록으로 바로 감 */
function StatLink({
  href,
  label,
  value,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <VStack
      asChild
      align="center"
      gap="x1"
      grow={1}
      minWidth="0"
      py="x3"
      borderRadius="r2"
      bg="bg.neutralWeak"
    >
      {/* 바로 가기 칸과 같은 면을 깔고 있어 반응도 같은 결로 둠 */}
      <Link href={href} className="rebirth-tile">
        <Icon svg={icon} size="x5" color="fg.neutralMuted" />
        <Text textStyle="t6Bold" color="fg.neutral">
          {value}
        </Text>
        <Text textStyle="t2Regular" color="fg.neutralMuted" maxLines={1}>
          {label}
        </Text>
      </Link>
    </VStack>
  );
}

/** 바로 가기 한 칸 */
function Shortcut({ href, label, icon }: MineLink) {
  return (
    <VStack
      asChild
      align="center"
      gap="x2"
      py="x4"
      borderRadius="r2"
      bg="bg.neutralWeak"
      minWidth="0"
    >
      {/* 면이 이미 칠해진 칸이라 rebirth-row 대신 한 단계 진해지는 타일로 둠 */}
      <Link href={href} className="rebirth-tile">
        <Icon svg={icon} size="x6" color="fg.brand" />
        <Text textStyle="t3Bold" color="fg.neutral" maxLines={1}>
          {label}
        </Text>
      </Link>
    </VStack>
  );
}

/** 등록한 동물 한 줄. 사진과 이름, 특징 요약을 함께 보여 줌 */
// 보호자가 적어 둔 품종은 아는 값이라 계열 추정을 붙이지 않음. 우리 동물 상세와 같은 표기를 씀
function PetRow({ pet, removePet }: { pet: PetCard; removePet: (form: FormData) => Promise<void> }) {
  const detail = [ANIMAL_LABEL[pet.animalType] ?? "", pet.breedGuess ?? "", SIZE_LABEL[pet.size] ?? ""]
    .filter(Boolean)
    .concat(pet.colors)
    .join(", ");

  return (
    <HStack gap="x3" align="center">
      {/* 삭제 단추가 같은 줄에 있어 줄 전체가 아니라 사진과 글만 링크로 둠 */}
      <HStack asChild gap="x3" align="center" grow={1} minWidth="0">
        <Link href={`/mine/pets/${pet.id}`} className="rebirth-row">
          {pet.photoUrl ? (
            <ImageFrame ratio={1} width={PET_THUMB} src={pet.photoUrl} alt="" borderRadius="r3" />
          ) : (
            // 사진을 올리지 않은 동물도 같은 자리를 차지해 줄이 어긋나지 않음
            <Box width={PET_THUMB} minWidth={PET_THUMB}>
              <AspectRatio ratio={1} borderRadius="r3" bg="bg.neutralWeak">
                <VStack align="center" justify="center" height="full">
                  <Icon svg={<IconPawprintLine />} size="x6" color="fg.neutralSubtle" />
                </VStack>
              </AspectRatio>
            </Box>
          )}

          <VStack align="stretch" gap="x0_5" grow={1} minWidth="0">
            <Text textStyle="t4Bold" color="fg.neutral" maxLines={1}>
              {pet.name}
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralMuted" maxLines={1}>
              {detail || "특징을 적지 않았어요"}
            </Text>
            {pet.note ? (
              <Text textStyle="t2Regular" color="fg.neutralSubtle" maxLines={1}>
                {pet.note}
              </Text>
            ) : null}
          </VStack>
        </Link>
      </HStack>

      {/* 급할 때 상세를 거치지 않고 바로 신고하러 감. 사진과 특징은 다음 화면이 채움 */}
      <ActionButton variant="neutralOutline" size="xsmall" asChild>
        <Link href={`/lost/new?petId=${pet.id}`}>실종 신고</Link>
      </ActionButton>

      <DeletePetButton id={pet.id} name={pet.name} removePet={removePet} />
    </HStack>
  );
}

export function MineScreen({
  user,
  pets,
  counts,
  unread,
  authReady,
  signOut,
  removePet,
}: MineScreenProps) {
  return (
    <Screen bg="bg.layerBasement">
      <AppHeader title="마이페이지" />

      {/* 아래 여백을 두면 마지막 카드 밑에 바탕색 띠가 남아 여백 없이 붙임 */}
      <VStack align="stretch" grow={1} gap="x2">
        <SectionCard gap="x4">
          {user ? (
            <>
              {/* 줄 전체가 프로필로 가는 자리라 따로 수정 단추를 두지 않음 */}
              <HStack asChild gap="x3" align="center" px="x1" py="x1">
                <Link href="/mine/profile" className="rebirth-row">
                  <Avatar
                    size="56"
                    src={user.avatarUrl ?? undefined}
                    alt=""
                    fallback={
                      user.displayName?.slice(0, 1) ?? <Icon svg={<IconPersonFill />} color="fg.neutralSubtle" />
                    }
                  />
                  <VStack align="stretch" gap="x0_5" grow={1} minWidth="0">
                    <Text textStyle="t6Bold" color="fg.neutral" maxLines={1}>
                      {/* 이름은 커뮤니티 작성자로 나가는 값이라 비어 있으면 정하도록 권함 */}
                      {user.displayName ?? "이름을 정해 주세요"}
                    </Text>
                    <Text textStyle="t3Regular" color="fg.neutralMuted" maxLines={1}>
                      {PROVIDER_LABEL[user.provider] ?? "SNS"} 계정, {joinedLabel(user.createdAt)}
                    </Text>
                  </VStack>
                  <Icon svg={<IconChevronRightLine />} size="x5" color="fg.neutralSubtle" />
                </Link>
              </HStack>

              {/* 남긴 기록을 종류별로 세어 그 목록으로 바로 보냄 */}
              <HStack gap="x2" align="stretch">
                <StatLink
                  href="/mine/reports?kind=sighting"
                  label="발견 제보"
                  value={counts.sighting}
                  icon={<IconPawprintLine />}
                />
                <StatLink
                  href="/mine/reports?kind=lost"
                  label="실종 신고"
                  value={counts.lost}
                  icon={<IconMegaphoneLine />}
                />
              </HStack>

              {/* 구독한 동네의 새 제보를 모아 보는 자리. 안 읽은 수가 있을 때만 수를 붙임 */}
              <HStack asChild gap="x3" align="center" px="x1" py="x1">
                <Link href="/mine/notifications" className="rebirth-row">
                  <Icon svg={<IconBellLine />} size="x5" color="fg.neutralMuted" />
                  <VStack align="stretch" grow={1} minWidth="0">
                    <Text textStyle="t4Regular" color="fg.neutral">
                      알림
                    </Text>
                  </VStack>
                  {unread > 0 ? <Badge label={unreadLabel(unread)} tone="brand" /> : null}
                  <Icon svg={<IconChevronRightLine />} size="x5" color="fg.neutralSubtle" />
                </Link>
              </HStack>
            </>
          ) : (
            <VStack align="stretch" gap="x3">
              <VStack align="stretch" gap="x1">
                <Text textStyle="t5Bold" color="fg.neutral">
                  로그인하고 내 활동을 모아 보세요
                </Text>
                <Text textStyle="t3Regular" color="fg.neutralMuted">
                  로그인하지 않아도 제보와 댓글은 남길 수 있어요
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
                  로그인을 준비하고 있어요
                </Text>
              )}
            </VStack>
          )}
        </SectionCard>

        <SectionCard gap="x3">
          <Text as="h2" textStyle="t4Bold" color="fg.neutral">
            바로 가기
          </Text>
          <Grid columns={3} gap="x2">
            {SHORTCUTS.map((item) => (
              <Shortcut key={item.href} {...item} />
            ))}
          </Grid>
        </SectionCard>

        {user ? (
          <SectionCard gap="x3">
            <HStack justify="space-between" align="center">
              <HStack gap="x1_5" align="center">
                <Text as="h2" textStyle="t4Bold" color="fg.neutral">
                  우리 동물
                </Text>
                {pets.length > 0 ? (
                  <Text textStyle="t4Regular" color="fg.neutralMuted">
                    {pets.length}
                  </Text>
                ) : null}
              </HStack>
              <ActionButton variant="ghost" size="xsmall" asChild>
                <Link href="/mine/pets/new">등록</Link>
              </ActionButton>
            </HStack>

            {pets.length === 0 ? (
              <EmptyRow
                title="아직 등록한 동물이 없어요"
                hint="미리 등록해 두면 실종 신고를 빠르게 쓸 수 있어요"
              />
            ) : (
              <VStack align="stretch" gap="x3">
                {pets.map((pet) => (
                  <PetRow key={pet.id} pet={pet} removePet={removePet} />
                ))}
              </VStack>
            )}
          </SectionCard>
        ) : null}

        {/* 로그인과 상관없이 이 브라우저에 남은 기록이라 늘 보여 줌 */}
        <SectionCard gap="x3">
          <Text as="h2" textStyle="t4Bold" color="fg.neutral">
            최근 본 제보
          </Text>
          <RecentReports />
        </SectionCard>

        {/* 비로그인은 이 카드가 마지막이라 남는 높이를 여기서 먹음 */}
        <SectionCard gap="x1" grow={user ? undefined : 1}>
          {LINKS.map((link) => (
            <VStack key={link.href} align="stretch">
              {/* 줄 전체가 누르는 자리라 면 색으로 눌리는 곳을 보여 줌 */}
              {/* 음수 마진 prop 은 토큰 이름을 그대로 내보내 쓰지 않고 안쪽 여백만 줌 */}
              <HStack asChild gap="x3" align="center" py="x3" px="x2">
                <Link href={link.href} className="rebirth-row">
                  <Icon svg={link.icon} size="x5" color="fg.neutralMuted" />
                  <Text textStyle="t4Regular" color="fg.neutral" maxLines={1}>
                    {link.label}
                  </Text>
                  <HStack marginLeft="auto" gap="x1" align="center">
                    <Icon svg={<IconChevronRightLine />} size="x4" color="fg.neutralSubtle" />
                  </HStack>
                </Link>
              </HStack>
            </VStack>
          ))}
        </SectionCard>

        {/* 마지막 카드가 남는 높이를 먹어 아래에 바탕색이 드러나지 않음 */}
        {user ? (
          <SectionCard gap="x2" grow={1}>
            {signOut}
          </SectionCard>
        ) : null}
      </VStack>
    </Screen>
  );
}
