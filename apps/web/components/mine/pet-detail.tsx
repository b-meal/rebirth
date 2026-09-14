import { Divider, HStack, Text, VStack } from "@seed-design/react";
import {
  IconArrowLeftBracketRightFill,
  IconPawprintFill,
  IconSparkle2Fill,
} from "@karrotmarket/react-monochrome-icon";

import { ANIMAL_LABEL, SIZE_LABEL } from "@/lib/report-label";
import { PetActionLink } from "@/components/mine/pet-action-link";
import { AppHeader } from "@/components/ui/app-header";
import { Badge } from "@/components/ui/badge";
import { PhotoCarousel } from "@/components/ui/photo-carousel";
import { FeatureRow, Screen, SectionCard, SectionTitle } from "@/components/ui/screen";

// 등록한 동물 한 마리. 올려 둔 사진을 모두 넘겨 보는 자리
// 보호자가 자기 동물을 보는 화면이라 품종을 계열 추정으로 낮추지 않음
// 제보 상세와 같은 짜임을 써 두 화면을 오갈 때 눈이 자리를 다시 찾지 않음

const UNKNOWN = "적지 않음";

export type PetDetailItem = {
  id: string;
  name: string;
  animalType: string;
  breedGuess: string | null;
  size: string;
  colors: string[];
  registrationNumber: string | null;
  note: string | null;
  createdAt: string;
};

/** 15 자리를 붙여 두면 눈으로 세어야 해 국가코드와 나머지를 끊어 보여 줌 */
function registrationLabel(value: string): string {
  return [value.slice(0, 3), value.slice(3, 7), value.slice(7, 11), value.slice(11)]
    .filter(Boolean)
    .join(" ");
}

/** 뱃지에 다 담기 어려운 값을 제목 아래 한 줄로 줄임 */
function summarize(pet: PetDetailItem): string {
  const parts = [pet.colors.join(" "), SIZE_LABEL[pet.size], ANIMAL_LABEL[pet.animalType]];
  return parts.filter(Boolean).join(" ") || "적어 둔 생김새가 없어요";
}

export function PetDetail({ pet, photoUrls }: { pet: PetDetailItem; photoUrls: string[] }) {
  const animal = ANIMAL_LABEL[pet.animalType];
  const size = SIZE_LABEL[pet.size];

  return (
    <Screen bg="bg.layerBasement">
      <AppHeader title={pet.name} />

      {photoUrls.length > 0 ? (
        <PhotoCarousel urls={photoUrls} />
      ) : (
        // 사진이 없다고 빈 자리를 두면 무엇이 빠진 화면처럼 보임
        <SectionCard>
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            아직 올린 사진이 없어요
          </Text>
        </SectionCard>
      )}

      {/* 카드가 적어도 이 묶음이 화면을 채워야 아래 버튼 띠가 화면 맨 아래에 붙음 */}
      <VStack align="stretch" gap="x2" pb="x4" grow={1}>
        <SectionCard gap="x3">
          <HStack gap="x1_5" wrap>
            <Badge label={animal ?? "적지 않음"} tone="neutral" icon={<IconPawprintFill />} />
            {pet.breedGuess ? (
              <Badge label={pet.breedGuess} tone="neutral" icon={<IconSparkle2Fill />} />
            ) : null}
            {size ? (
              <Badge
                label={size}
                tone="neutral"
                icon={<IconArrowLeftBracketRightFill />}
              />
            ) : null}
            {pet.colors.map((color) => (
              <Badge key={color} label={color} tone="neutral" />
            ))}
          </HStack>

          <VStack align="stretch" gap="x1">
            <Text as="h1" textStyle="t8Bold" color="fg.neutral">
              {pet.name}
            </Text>
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              {summarize(pet)}
            </Text>
          </VStack>

          <Divider />

          <Text textStyle="t3Regular" color="fg.neutralMuted">
            {pet.createdAt}에 등록
          </Text>
        </SectionCard>

        {pet.note ? (
          <SectionCard gap="x2">
            <SectionTitle>메모</SectionTitle>
            <Text
              textStyle="articleBody"
              color="fg.neutral"
              whiteSpace="pre-wrap"
              style={{ overflowWrap: "anywhere" }}
            >
              {pet.note}
            </Text>
          </SectionCard>
        ) : null}

        <SectionCard gap="x2_5">
          <SectionTitle>특징</SectionTitle>
          <VStack align="stretch" gap="x2">
            <FeatureRow label="종류" value={animal ?? UNKNOWN} />
            <FeatureRow label="품종" value={pet.breedGuess ?? UNKNOWN} />
            <FeatureRow label="크기" value={size || UNKNOWN} />
            <FeatureRow
              label="털색"
              value={pet.colors.length > 0 ? pet.colors.join(", ") : UNKNOWN}
            />
          </VStack>
        </SectionCard>

        {pet.registrationNumber ? (
          <SectionCard gap="x2">
            <SectionTitle>동물등록번호</SectionTitle>
            <Text textStyle="t4Regular" color="fg.neutral">
              {registrationLabel(pet.registrationNumber)}
            </Text>
            {/* 실종 신고는 공개 글이라 이 번호를 옮겨 담지 않음을 알림 */}
            <Text textStyle="t3Regular" color="fg.neutralSubtle">
              이 번호는 나만 볼 수 있고 제보나 실종 신고에 실리지 않아요
            </Text>
          </SectionCard>
        ) : null}
      </VStack>

      {/* 고치기와 실종 신고를 아래에 나란히 둠
          pb 는 유틸이 안전 영역을 더해 다시 잡으므로 여기서 주지 않음 */}
      <HStack
        className="rebirth-bottom-bar"
        position="sticky"
        bottom="0"
        zIndex={1}
        align="stretch"
        gap="x2"
        px="spacingX.globalGutter"
        pt="x3"
        bg="bg.layerDefault"
      >
        <PetActionLink href={`/mine/pets/${pet.id}/edit`} variant="neutralOutline">
          정보 수정
        </PetActionLink>
        {/* 등록해 둔 사진과 특징을 그대로 옮겨 마지막 목격 위치만 고르면 끝남 */}
        <PetActionLink href={`/lost/new?petId=${pet.id}`}>실종 신고</PetActionLink>
      </HStack>
    </Screen>
  );
}
