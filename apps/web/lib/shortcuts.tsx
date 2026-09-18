import {
  IconCameraLine,
  IconHospitalcrossShieldLine,
  IconMegaphoneLine,
} from "@karrotmarket/react-monochrome-icon";

// 홈 시트 머리와 마이페이지가 같은 정의를 그려 두 화면 문구가 갈라지지 않음

export type MineLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

// 길에서 급히 찾는 일 셋
export const SHORTCUTS: MineLink[] = [
  { href: "/report", label: "제보하기", icon: <IconCameraLine /> },
  { href: "/lost/new", label: "실종 신고", icon: <IconMegaphoneLine /> },
  { href: "/guide/injured", label: "다친 동물", icon: <IconHospitalcrossShieldLine /> },
];
