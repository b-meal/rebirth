import Link from "next/link";
import { HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

import { ANIMAL_LABEL, SIZE_LABEL } from "@/lib/report-label";
import { AppHeader } from "@/components/ui/app-header";
import { Badge } from "@/components/ui/badge";
import { PhotoCarousel } from "@/components/ui/photo-carousel";
import { Screen, ScreenBody, Section } from "@/components/ui/screen";

// 등록한 동물 한 마리. 올려 둔 사진을 모두 넘겨 보는 자리
// 보호자가 자기 동물을 보는 화면이라 품종을 계열 추정으로 낮추지 않음

export type PetDetailItem = {
  id: string;
  name: string;
  animalType: string;
  breedGuess: string | null;
  size: string;
  colors: string[];
  registrationNumber: string | null;
  note: string | null;
};

/** 15 자리를 붙여 두면 눈으로 세어야 해 국가코드와 나머지를 끊어 보여 줌 */
function registrationLabel(value: string): string {
  return [value.slice(0, 3), value.slice(3, 7), value.slice(7, 11), value.slice(11)]
    .filter(Boolean)
    .join(" ");
}

export function PetDetail({
  pet,
  photoUrls,
}: {
  pet: PetDetailItem;
  photoUrls: string[];
}) {
  const animal = ANIMAL_LABEL[pet.animalType] ?? "";
  const size = SIZE_LABEL[pet.size] ?? "";
  const tags = [animal, size, pet.breedGuess, ...pet.colors].filter(
    (value): value is string => Boolean(value),
  );

  return (
    <Screen>
      <AppHeader title={pet.name} />

      <ScreenBody gap="x6">
        {photoUrls.length > 0 ? (
          <PhotoCarousel urls={photoUrls} />
        ) : (
          // 사진이 없다고 빈 자리를 두면 무엇이 빠진 화면처럼 보임
          <Text textStyle="t3Regular" color="fg.neutralMuted">
            아직 올린 사진이 없어요
          </Text>
        )}

        <Section gap="x2">
          <Text as="h2" textStyle="t5Bold" color="fg.neutral">
            생김새
          </Text>
          {tags.length > 0 ? (
            <HStack gap="spacingX.betweenChips" wrap>
              {tags.map((tag) => (
                <Badge key={tag} label={tag} />
              ))}
            </HStack>
          ) : (
            <Text textStyle="t3Regular" color="fg.neutralMuted">
              적어 둔 생김새가 없어요
            </Text>
          )}
        </Section>

        {pet.registrationNumber ? (
          <Section gap="x2">
            <Text as="h2" textStyle="t5Bold" color="fg.neutral">
              동물등록번호
            </Text>
            <Text textStyle="t4Regular" color="fg.neutral">
              {registrationLabel(pet.registrationNumber)}
            </Text>
            {/* 실종 신고는 공개 글이라 이 번호를 옮겨 담지 않음을 알림 */}
            <Text textStyle="t3Regular" color="fg.neutralSubtle">
              이 번호는 나만 볼 수 있고 제보나 실종 신고에 실리지 않습니다
            </Text>
          </Section>
        ) : null}

        {pet.note ? (
          <Section gap="x2">
            <Text as="h2" textStyle="t5Bold" color="fg.neutral">
              특징
            </Text>
            <Text
              textStyle="t4Regular"
              color="fg.neutral"
              style={{ overflowWrap: "anywhere" }}
            >
              {pet.note}
            </Text>
          </Section>
        ) : null}
      </ScreenBody>

      {/* 이 화면에서 할 일은 고치기 하나뿐이라 아래에 크게 둠
          pb 는 유틸이 안전 영역을 더해 다시 잡으므로 여기서 주지 않음 */}
      <VStack
        className="rebirth-bottom-bar"
        position="sticky"
        bottom="0"
        zIndex={1}
        align="stretch"
        px="spacingX.globalGutter"
        pt="x3"
        bg="bg.layerDefault"
      >
        <ActionButton variant="brandSolid" size="large" asChild>
          <Link href={`/mine/pets/${pet.id}/edit`}>정보 수정</Link>
        </ActionButton>
      </VStack>
    </Screen>
  );
}
