import type { Preview } from "@storybook/react-vite";
import "@seed-design/css/all.css";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

// SEED 는 html 의 data-seed 속성으로 색 토큰을 걸어 프리뷰 문서에 직접 표시
if (typeof document !== "undefined") {
  document.documentElement.setAttribute("data-seed", "");
  document.documentElement.setAttribute("data-seed-color-mode", "system");
  document.documentElement.setAttribute("data-seed-user-color-scheme", "light");
  document.documentElement.style.fontFamily =
    '"Pretendard Variable", Pretendard, system-ui, sans-serif';
}

const preview: Preview = {
  parameters: {
    layout: "padded",
    controls: { expanded: true },
  },
};

export default preview;
