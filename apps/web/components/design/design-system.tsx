"use client";

import { Box, Divider, Flex, HStack, Text, VStack } from "@seed-design/react";

import { CATALOG, SEED_DOCS_ORIGIN } from "./registry";
import { CatalogComponents } from "./catalog-components";
import { CatalogFoundations } from "./catalog-foundations";
import { CatalogPatterns } from "./catalog-patterns";

// SEED 카탈로그, 이 저장소가 실제로 설치한 스니펫과 토큰만 보여줌

export function DesignSystem() {
  return (
    <Flex align="flex-start" minHeight="100dvh" bg="bg.layerDefault">
      <Box
        display={{ base: "none", md: "block" }}
        position="sticky"
        top="0"
        width="240px"
        maxHeight="100dvh"
        overflowY="auto"
        p="x5"
        borderRightWidth={1}
        borderColor="stroke.neutralMuted"
      >
        <VStack align="stretch" gap="x5">
          {CATALOG.map((group) => (
            <VStack key={group.id} align="stretch" gap="x2">
              <Text textStyle="t2Bold" color="fg.neutralSubtle">
                {group.title}
              </Text>
              {group.sections.map((section) => (
                <a key={section.id} href={`#${section.id}`}>
                  <Text textStyle="t3Regular" color="fg.neutralMuted">
                    {section.title}
                  </Text>
                </a>
              ))}
            </VStack>
          ))}
        </VStack>
      </Box>

      <Box flexGrow={1} minWidth="0" px="spacingX.globalGutter" py="x8" maxWidth="960px">
        <VStack align="stretch" gap="x2" pb="x6">
          <Text as="h1" textStyle="screenTitle" color="fg.neutral">
            SEED 디자인 시스템
          </Text>
          <Text textStyle="t5Regular" color="fg.neutralMuted">
            다시집 web 은 당근 SEED 하나만 씁니다. 아래 값과 컴포넌트는 설치된
            @seed-design/css 와 seed-design/ui 스니펫에서 그대로 읽어 그립니다
          </Text>
          <HStack gap="x3" wrap>
            <a href={SEED_DOCS_ORIGIN} target="_blank" rel="noreferrer noopener">
              <Text textStyle="t3Regular" color="fg.brand" textDecorationLine="underline">
                seed-design.io
              </Text>
            </a>
            <a href={`${SEED_DOCS_ORIGIN}/llms.txt`} target="_blank" rel="noreferrer noopener">
              <Text textStyle="t3Regular" color="fg.brand" textDecorationLine="underline">
                llms.txt
              </Text>
            </a>
            <a
              href={`${SEED_DOCS_ORIGIN}/react/llms.txt`}
              target="_blank"
              rel="noreferrer noopener"
            >
              <Text textStyle="t3Regular" color="fg.brand" textDecorationLine="underline">
                react/llms.txt
              </Text>
            </a>
          </HStack>
        </VStack>

        <Divider />

        <CatalogFoundations />
        <CatalogComponents />
        <CatalogPatterns />
      </Box>
    </Flex>
  );
}
