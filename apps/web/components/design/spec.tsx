"use client";

import type { ReactNode } from "react";
import { Box, Divider, Flex, HStack, Text, VStack } from "@seed-design/react";

import { SEED_DOCS_ORIGIN, type CatalogSection } from "./registry";

// 카탈로그 한 절의 껍데기, 제목과 공식 문서 링크와 예시 자리만 제공

export function Spec({ section, children }: { section: CatalogSection; children: ReactNode }) {
  return (
    <VStack as="section" id={section.id} align="stretch" gap="x4" py="x6">
      <VStack align="stretch" gap="x1">
        <HStack gap="x2" align="center" wrap>
          <Text as="h2" textStyle="t7Bold" color="fg.neutral">
            {section.title}
          </Text>
          {section.doc ? (
            <a
              href={`${SEED_DOCS_ORIGIN}/${section.doc}`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <Text
                textStyle="t2Regular"
                color="fg.neutralSubtle"
                textDecorationLine="underline"
              >
                공식 문서
              </Text>
            </a>
          ) : null}
        </HStack>
      </VStack>
      {children}
      <Divider />
    </VStack>
  );
}

/** 예시 한 줄, 왼쪽에 변형 이름을 붙이고 오른쪽에 실물을 놓음 */
export function Row({ label, children }: { label?: ReactNode; children: ReactNode }) {
  return (
    <VStack align="stretch" gap="x2">
      {label ? (
        <Text textStyle="t2Medium" color="fg.neutralSubtle">
          {label}
        </Text>
      ) : null}
      <Flex gap="x3" wrap align="center">
        {children}
      </Flex>
    </VStack>
  );
}

/** 토큰 값을 보여주는 칸, 이름과 실제 값을 같이 읽게 함 */
export function Swatch({
  name,
  value,
  preview,
}: {
  name: string;
  value?: string;
  preview: ReactNode;
}) {
  return (
    <VStack align="stretch" gap="x1" width="140px">
      {preview}
      <Text textStyle="t1Medium" color="fg.neutral">
        {name}
      </Text>
      {value ? (
        <Text textStyle="t1Regular" color="fg.neutralSubtle" maxLines={1}>
          {value}
        </Text>
      ) : null}
    </VStack>
  );
}

/** 배경 위에 올라가는 예시를 담는 상자 */
export function Stage({ children }: { children: ReactNode }) {
  return (
    <Box
      p="x4"
      borderRadius="r3"
      borderWidth={1}
      borderColor="stroke.neutralMuted"
      bg="bg.layerBasement"
      width="full"
    >
      {children}
    </Box>
  );
}
