import { Button, IconButton, type ButtonProps } from "@chakra-ui/react";

import { Icon, type IconName } from "./icons";

// 화면 우하단에 떠 있는 주 동작 버튼, Screen 안 마지막 자리에 두면 스크롤에 따라 붙어 다님

export type FabProps = Omit<ButtonProps, "children" | "aria-label"> & {
  icon: IconName;
  label: string;
  /** 라벨을 함께 보이는 넓은 형태 */
  extended?: boolean;
  /** 탭 바 같은 하단 요소 높이만큼 위로 띄우는 값 */
  offset?: string;
};

export function Fab({ icon, label, extended = false, offset = "0px", ...rest }: FabProps) {
  const shared = {
    position: "sticky",
    bottom: `calc(${offset} + var(--chakra-spacing-screen) + var(--chakra-spacing-safeBottom))`,
    alignSelf: "flex-end",
    marginInlineEnd: "screen",
    marginBlock: "3",
    zIndex: "docked",
    height: "fab",
    borderRadius: "full",
    boxShadow: "float",
    colorPalette: "brand",
  } as const;

  if (extended) {
    return (
      <Button {...shared} paddingInline="5" gap="2" {...rest}>
        <Icon name={icon} size={22} />
        {label}
      </Button>
    );
  }
  return (
    <IconButton {...shared} width="fab" aria-label={label} {...rest}>
      <Icon name={icon} size={24} />
    </IconButton>
  );
}
