import type { Decorator, Preview } from "@storybook/react-vite";
import { ThemeProvider } from "@wanteddev/wds";
import "@wanteddev/wds/reset.css";
import "@wanteddev/wds/global.css";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

// 다시집이 실제로 쓰는 테마를 그대로 걸어 확인
const withTheme: Decorator = (Story) => (
  <ThemeProvider>
    <Story />
  </ThemeProvider>
);

const preview: Preview = {
  decorators: [withTheme],
  parameters: {
    layout: "padded",
    controls: { expanded: true },
  },
};

export default preview;
