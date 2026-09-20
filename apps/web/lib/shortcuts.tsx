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
  // 홈 시트와 덮개가 같은 곳을 우리 아이 찾기 로 부름. 문마다 이름이 다르면 다른 곳인 줄 앎
  { href: "/lost/new", label: "우리 아이 찾기", icon: <IconMegaphoneLine /> },
  { href: "/guide/injured", label: "다친 동물", icon: <IconHospitalcrossShieldLine /> },
];
