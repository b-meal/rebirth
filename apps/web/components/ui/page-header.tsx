import type { ReactNode } from "react";
import { Flex, Text, type FlexProps } from "@chakra-ui/react";

// 화면 본문 첫머리의 큰 제목 블록, 상단 바 제목과 달리 스크롤과 함께 올라감

export type PageHeaderProps = Omit<FlexProps, "title"> & {
  /** 제목 위 작은 분류 문구 */
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** 제목 아래 칩이나 메타 정보 행 */
  children?: ReactNode;
  align?: "start" | "center";
};

export function PageHeader({
  eyebrow,
  title,
  description,
  children,
  align = "start",
  ...rest
}: PageHeaderProps) {
  return (
    <Flex
      direction="column"
      gap="2"
      paddingInline="screen"
      paddingTop="4"
      paddingBottom="2"
      textAlign={align}
      alignItems={align === "center" ? "center" : "stretch"}
      {...rest}
    >
      {eyebrow ? (
        <Text textStyle="overline" color="brand.fg">
          {eyebrow}
        </Text>
      ) : null}
      <Text as="h1" textStyle="title1">
        {title}
      </Text>
      {description ? (
        <Text textStyle="bodySm" color="fg.alternative">
          {description}
        </Text>
      ) : null}
      {children ? (
        <Flex gap="2" wrap="wrap" marginTop="1" justify={align === "center" ? "center" : "flex-start"}>
          {children}
        </Flex>
      ) : null}
    </Flex>
  );
}
