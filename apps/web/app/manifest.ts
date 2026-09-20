import type { MetadataRoute } from "next";

// design-system-allow:color
// 매니페스트는 JSON 이라 CSS 변수를 못 읽어 globals.css 의 carrot 700 값을 그대로 적음
const THEME_COLOR = "#5ea740";
const BACKGROUND_COLOR = "#ffffff";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "다시집 | Rebirth",
    short_name: "다시집",
    description: "길에서 만난 보호자 없는 동물을 사진 한 장으로 제보해요.",
    start_url: "/",
    display: "standalone",
    background_color: BACKGROUND_COLOR,
    theme_color: THEME_COLOR,
    icons: [
      { src: "/logo/logo-mark-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/logo/logo-mark-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "발견동물 제보", short_name: "제보", url: "/report" },
      { name: "실종 신고", short_name: "실종", url: "/lost/new" },
    ],
  };
}
