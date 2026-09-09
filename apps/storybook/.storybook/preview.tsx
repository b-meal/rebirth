import type { Decorator, Preview } from "@storybook/react-vite";
import { ChakraProvider } from "@chakra-ui/react";
import { system } from "../../web/lib/theme";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";

// 다시집이 실제로 쓰는 테마를 그대로 걸어 확인
const withTheme: Decorator = (Story) => (
  <ChakraProvider value={system}>
    <Story />
  </ChakraProvider>
);

const preview: Preview = {
  decorators: [withTheme],
  parameters: {
    layout: "padded",
    controls: { expanded: true },
  },
};

export default preview;
