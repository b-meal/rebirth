"use client";

import { Box, Flex, Text, VStack } from "@seed-design/react";
import { vars } from "@seed-design/css/vars";
import { textVariantMap } from "@seed-design/css/recipes/text";
import {
  IconBellLine,
  IconCameraFill,
  IconChevronRightLine,
  IconHouseLine,
  IconLocationpinFill,
  IconMagnifyingglassLine,
  IconPawprintFill,
  IconPictureLine,
} from "@karrotmarket/react-monochrome-icon";

import { CATALOG } from "./registry";
import { Row, Spec, Stage, Swatch } from "./spec";

// 파운데이션 절, 값 목록을 손으로 적지 않고 SEED 토큰 원본에서 그대로 읽음

const SECTIONS = Object.fromEntries(
  CATALOG.flatMap((group) => group.sections).map((section) => [section.id, section]),
);

const ICONS = [
  { name: "IconPawprintFill", svg: <IconPawprintFill /> },
  { name: "IconCameraFill", svg: <IconCameraFill /> },
  { name: "IconLocationpinFill", svg: <IconLocationpinFill /> },
  { name: "IconMagnifyingglassLine", svg: <IconMagnifyingglassLine /> },
  { name: "IconPictureLine", svg: <IconPictureLine /> },
  { name: "IconBellLine", svg: <IconBellLine /> },
  { name: "IconHouseLine", svg: <IconHouseLine /> },
  { name: "IconChevronRightLine", svg: <IconChevronRightLine /> },
];

function ColorGrid({ scope, entries }: { scope: string; entries: Record<string, string> }) {
  return (
    <Row label={scope}>
      {Object.entries(entries).map(([name, value]) => (
        <Swatch
          key={name}
          name={`${scope}.${name}`}
          value={value}
          preview={
            <Box
              height="x12"
              borderRadius="r2"
              borderWidth={1}
              borderColor="stroke.neutralMuted"
              bg={`${scope}.${name}`}
            />
          }
        />
      ))}
    </Row>
  );
}

export function CatalogFoundations() {
  return (
    <>
      <Spec section={SECTIONS.color}>
        <ColorGrid scope="fg" entries={vars.$color.fg} />
        <ColorGrid scope="bg" entries={vars.$color.bg} />
        <ColorGrid scope="stroke" entries={vars.$color.stroke} />
        <ColorGrid scope="palette" entries={vars.$color.palette} />
      </Spec>

      <Spec section={SECTIONS.typography}>
        <VStack align="stretch" gap="x3">
          {textVariantMap.textStyle.map((style) => (
            <Flex key={style} gap="x4" align="center" wrap>
              <Box width="140px">
                <Text textStyle="t1Medium" color="fg.neutralSubtle">
                  {style}
                </Text>
              </Box>
              <Text textStyle={style} color="fg.neutral">
                다시집 발견동물 제보
              </Text>
            </Flex>
          ))}
        </VStack>
      </Spec>

      <Spec section={SECTIONS.spacing}>
        <Row label="dimension">
          {Object.entries(vars.$dimension)
            .filter(([, value]) => typeof value === "string")
            .map(([name, value]) => (
              <Swatch
                key={name}
                name={name}
                value={value as string}
                preview={<Box height="x6" width={name} bg="bg.brandSolid" borderRadius="r0_5" />}
              />
            ))}
        </Row>
        <Row label="spacingX">
          {Object.entries(vars.$dimension.spacingX).map(([name, value]) => (
            <Swatch
              key={name}
              name={`spacingX.${name}`}
              value={value}
              preview={
                <Box height="x6" width={`spacingX.${name}`} bg="bg.brandSolid" borderRadius="r0_5" />
              }
            />
          ))}
        </Row>
        <Row label="spacingY">
          {Object.entries(vars.$dimension.spacingY).map(([name, value]) => (
            <Swatch
              key={name}
              name={`spacingY.${name}`}
              value={value}
              preview={
                <Box height={`spacingY.${name}`} bg="bg.brandSolid" borderRadius="r0_5" />
              }
            />
          ))}
        </Row>
      </Spec>

      <Spec section={SECTIONS.radius}>
        <Row>
          {Object.entries(vars.$radius).map(([name, value]) => (
            <Swatch
              key={name}
              name={name}
              value={value}
              preview={
                <Box
                  height="x12"
                  borderRadius={name}
                  borderWidth={1}
                  borderColor="stroke.neutralSolid"
                  bg="bg.neutralWeak"
                />
              }
            />
          ))}
        </Row>
      </Spec>

      <Spec section={SECTIONS.elevation}>
        <Stage>
          <Flex gap="x6" wrap>
            {Object.entries(vars.$shadow).map(([name, value]) => (
              <Swatch
                key={name}
                name={name}
                value={value}
                preview={
                  <Box height="x12" borderRadius="r2" bg="bg.layerDefault" boxShadow={name} />
                }
              />
            ))}
          </Flex>
        </Stage>
      </Spec>

      <Spec section={SECTIONS.iconography}>
        <Row label="@karrotmarket/react-monochrome-icon">
          {ICONS.map((icon) => (
            <Swatch
              key={icon.name}
              name={icon.name}
              preview={
                <Flex
                  align="center"
                  justify="center"
                  height="x12"
                  borderRadius="r2"
                  bg="bg.neutralWeak"
                  color="fg.neutral"
                >
                  {icon.svg}
                </Flex>
              }
            />
          ))}
        </Row>
      </Spec>
    </>
  );
}
