"use client";

import { useEffect, useRef } from "react";
import { Box, Flex, Text } from "@chakra-ui/react";

import { CATEGORIES, type CategoryId } from "./registry";

// 데스크톱 좌측 내비, 분류를 묶음 제목으로 두고 절을 그 아래 항목으로 나열

export type DesignNavProps = {
  categoryId: CategoryId;
  activeSection: string | null;
  onNavigate: (hash: string) => void;
};

export function DesignNav({ categoryId, activeSection, onNavigate }: DesignNavProps) {
  const root = useRef<HTMLDivElement>(null);

  // 목록이 127개라 고른 항목이 화면 밖이면 보이는 위치로 끌어올림
  useEffect(() => {
    root.current?.querySelector("[data-nav-active]")?.scrollIntoView({ block: "nearest" });
  }, [activeSection, categoryId]);

  return (
    <Flex ref={root} direction="column" gap="6" paddingBottom="10">
      {CATEGORIES.map((category) => {
        const current = category.id === categoryId;
        return (
          <Flex key={category.id} direction="column" gap="1">
            <Text
              textStyle="overline"
              color={current ? "brand.fg" : "fg.assistive"}
              paddingInline="3"
              paddingBottom="1"
            >
              {category.label}
            </Text>
            {category.sections.map((section) => {
              const active = current && activeSection === section.id;
              return (
                <Box
                  key={section.id}
                  asChild
                  paddingInline="3"
                  paddingBlock="1.5"
                  borderRadius="control"
                  textStyle="bodySm"
                  textAlign="start"
                  cursor="pointer"
                  color={active ? "fg.default" : "fg.alternative"}
                  fontWeight={active ? "600" : "400"}
                  backgroundColor={active ? "brand.muted" : "transparent"}
                  _hover={{ backgroundColor: active ? "brand.muted" : "bg.subtle" }}
                >
                  <button
                    type="button"
                    data-nav-active={active ? "" : undefined}
                    aria-current={active ? "page" : undefined}
                    onClick={() => onNavigate(`${category.id}/${section.id}`)}
                  >
                    {section.label}
                  </button>
                </Box>
              );
            })}
          </Flex>
        );
      })}
    </Flex>
  );
}
