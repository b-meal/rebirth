"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useTheme } from "next-themes";
import { Box, Flex, IconButton, Image, Text } from "@chakra-ui/react";

import { AppBar } from "@/components/ui/app-bar";
import { Icon } from "@/components/ui/icons";
import { Chip } from "@/components/ui/chip";
import { MenuDrawer } from "@/components/ui/menu-drawer";
import { ScrollRow } from "@/components/ui/screen";
import { POINT } from "@/lib/theme";

import { CATEGORIES, isCategoryId, type CategoryId } from "./registry";
import { DesignNav } from "./design-nav";
import { FoundationsCatalog } from "./catalog-foundations";
import { ElementsCatalog } from "./catalog-elements";
import { FormsCatalog } from "./catalog-forms";
import { OverlaysCatalog } from "./catalog-overlays";
import { NavigationCatalog } from "./catalog-navigation";
import { DataCatalog } from "./catalog-data";
import { FeedbackCatalog } from "./catalog-feedback";
import { ChartsCatalog } from "./catalog-charts";
import { LayoutCatalog } from "./catalog-layout";
import { ShellsCatalog } from "./catalog-shells";

// 카탈로그 껍데기, 데스크톱은 좌측 내비와 넓은 본문, 좁은 화면은 상단 바와 칩 내비

const CATALOG: Record<CategoryId, ComponentType> = {
  foundations: FoundationsCatalog,
  elements: ElementsCatalog,
  forms: FormsCatalog,
  overlays: OverlaysCatalog,
  navigation: NavigationCatalog,
  data: DataCatalog,
  feedback: FeedbackCatalog,
  charts: ChartsCatalog,
  layout: LayoutCatalog,
  shells: ShellsCatalog,
};

const SIDEBAR_WIDTH = "264px";

// 이전 다음 이동에 쓰는 평평한 절 목록
const FLAT = CATEGORIES.flatMap((category) =>
  category.sections.map((section) => ({
    hash: `${category.id}/${section.id}`,
    label: section.label,
    category: category.label,
  })),
);

function readHash(): { category: CategoryId; section: string } {
  const [raw, section] = window.location.hash.slice(1).split("/");
  const category = isCategoryId(raw) ? raw : "foundations";
  const sections = CATEGORIES.find((item) => item.id === category)!.sections;
  const found = sections.find((item) => item.id === section);
  return { category, section: found?.id ?? sections[0].id };
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <IconButton
      variant="ghost"
      colorPalette="gray"
      size="lg"
      aria-label="테마 전환"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {/* 서버는 저장된 테마를 몰라 아이콘 선택을 상태 대신 CSS 에 맡김 */}
      <Box as="span" display="inline-flex" _dark={{ display: "none" }}>
        <Icon name="moon" size={22} />
      </Box>
      <Box as="span" display="none" _dark={{ display: "inline-flex" }}>
        <Icon name="sun" size={22} />
      </Box>
    </IconButton>
  );
}

export function DesignSystem() {
  const [categoryId, setCategoryId] = useState<CategoryId>("foundations");
  const [activeSection, setActiveSection] = useState(CATEGORIES[0].sections[0].id);
  const [menuOpen, setMenuOpen] = useState(false);

  // 주소의 hash 를 상태로 삼아 새로고침과 공유 링크에서 같은 절이 열림
  useEffect(() => {
    const apply = () => {
      const { category, section } = readHash();
      setCategoryId(category);
      setActiveSection(section);
      window.scrollTo({ top: 0 });
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  const category = CATEGORIES.find((item) => item.id === categoryId) ?? CATEGORIES[0];
  const Catalog = CATALOG[category.id];
  const section =
    category.sections.find((item) => item.id === activeSection) ?? category.sections[0];
  const flatIndex = FLAT.findIndex((item) => item.hash === `${category.id}/${section.id}`);
  const previous = flatIndex > 0 ? FLAT[flatIndex - 1] : null;
  const next = flatIndex >= 0 && flatIndex < FLAT.length - 1 ? FLAT[flatIndex + 1] : null;
  const navigate = (hash: string) => {
    window.location.hash = hash;
  };

  return (
    <Flex minHeight="100dvh" backgroundColor="bg.canvas" alignItems="flex-start">
      <Box
        as="aside"
        display={{ base: "none", lg: "block" }}
        flexShrink={0}
        width={SIDEBAR_WIDTH}
        position="sticky"
        top="0"
        height="100dvh"
        overflowY="auto"
        borderInlineEndWidth="1px"
        borderColor="border.muted"
        backgroundColor="bg.panel"
        paddingInline="4"
        paddingTop="5"
      >
        <Flex
          asChild
          align="center"
          gap="2.5"
          width="100%"
          paddingInline="3"
          paddingBottom="5"
          textAlign="start"
          cursor="pointer"
        >
          <button type="button" onClick={() => navigate("foundations")}>
            <Image src="/logo/logo-mark-512.png" alt="" boxSize="7" borderRadius="control" />
            <Box>
              <Text textStyle="heading">다시집</Text>
              <Text textStyle="caption" color="fg.assistive">
                디자인 시스템
              </Text>
            </Box>
          </button>
        </Flex>

        <DesignNav
          categoryId={category.id}
          activeSection={activeSection}
          onNavigate={navigate}
        />
      </Box>

      <Box flex="1" minWidth="0">
        {/* 상단 바와 칩을 한 덩어리로 붙여야 sticky 가 부모 높이에 갇히지 않음 */}
        <Box
          display={{ base: "block", lg: "none" }}
          position="sticky"
          top="0"
          zIndex="sticky"
        >
          <AppBar
            title="다시집 디자인 시스템"
            subtitle={category.label}
            sticky={false}
            onMenu={() => setMenuOpen(true)}
            actions={<ThemeToggle />}
          />
          <Box
            backgroundColor="bg.canvas"
            borderBottomWidth="1px"
            borderColor="border.muted"
            paddingInline="screen"
            paddingBlock="2"
          >
            <ScrollRow>
              {category.sections.map((section) => (
                <Chip
                  key={section.id}
                  size="small"
                  active={activeSection === section.id}
                  onClick={() => navigate(`${category.id}/${section.id}`)}
                >
                  {section.label}
                </Chip>
              ))}
            </ScrollRow>
          </Box>
        </Box>

        <Flex
          display={{ base: "none", lg: "flex" }}
          position="sticky"
          top="0"
          zIndex="sticky"
          justify="flex-end"
          align="center"
          gap="3"
          height="appBar"
          paddingInline="10"
          backgroundColor="bg.canvas"
          borderBottomWidth="1px"
          borderColor="border.muted"
        >
          <Text textStyle="caption" color="fg.assistive">
            POINT hue {POINT.hue} chroma {POINT.chroma}
          </Text>
          <ThemeToggle />
        </Flex>

        <Box maxWidth="780px" paddingInline={{ base: "screen", lg: "10" }} paddingBottom="24">
          <Flex
            as="header"
            direction="column"
            gap="2"
            paddingTop={{ base: "6", lg: "10" }}
            paddingBottom="6"
            borderBottomWidth="1px"
            borderColor="border.muted"
          >
            <Text textStyle="overline" color="brand.fg">
              {category.label}
            </Text>
            <Text as="h1" textStyle="display">
              {section.label}
            </Text>
            <Text textStyle="caption" color="fg.assistive">
              {category.description}
            </Text>
          </Flex>

          {/* 고른 절만 남기고 나머지는 숨겨 한 화면에 하나만 보이게 함 */}
          <Box
            css={{
              "& [data-spec]": { display: "none" },
              [`& [data-spec][id="${section.id}"]`]: {
                display: "flex",
                borderBottomWidth: 0,
                paddingTop: "var(--chakra-spacing-6)",
              },
              "& [data-spec-title]": { display: "none" },
            }}
          >
            <Catalog />
          </Box>

          <Flex
            justify="space-between"
            gap="3"
            marginTop="10"
            paddingTop="6"
            borderTopWidth="1px"
            borderColor="border.muted"
          >
            {previous ? (
              <Flex
                asChild
                direction="column"
                gap="0.5"
                align="flex-start"
                textAlign="start"
                cursor="pointer"
                color="fg.alternative"
                _hover={{ color: "fg.default" }}
              >
                <button type="button" onClick={() => navigate(previous.hash)}>
                  <Text textStyle="caption" color="fg.assistive">
                    이전 · {previous.category}
                  </Text>
                  <Text textStyle="bodyStrong">{previous.label}</Text>
                </button>
              </Flex>
            ) : (
              <Box />
            )}
            {next ? (
              <Flex
                asChild
                direction="column"
                gap="0.5"
                align="flex-end"
                textAlign="end"
                cursor="pointer"
                color="fg.alternative"
                _hover={{ color: "fg.default" }}
              >
                <button type="button" onClick={() => navigate(next.hash)}>
                  <Text textStyle="caption" color="fg.assistive">
                    다음 · {next.category}
                  </Text>
                  <Text textStyle="bodyStrong">{next.label}</Text>
                </button>
              </Flex>
            ) : (
              <Box />
            )}
          </Flex>
        </Box>
      </Box>

      <MenuDrawer
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title="디자인 시스템"
        groups={[
          {
            title: "분류",
            items: CATEGORIES.map((item) => ({
              label: item.label,
              icon: item.icon,
              active: item.id === category.id,
              onSelect: () => navigate(item.id),
            })),
          },
        ]}
        footer={
          <Text textStyle="caption" color="fg.assistive">
            POINT hue {POINT.hue} chroma {POINT.chroma}
          </Text>
        }
      />
    </Flex>
  );
}
