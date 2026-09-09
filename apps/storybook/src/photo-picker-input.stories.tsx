import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef, useState } from "react";
import { Button, Flex, IconButton, Text } from "@chakra-ui/react";
import { IconCamera, IconImage } from "../../web/components/ui/icons";
import {
  PhotoPickerInput,
  type PhotoPickerInputHandle,
  type PhotoPickerInputProps,
} from "../../web/components/ui/photo-picker-input";

type DemoProps = Pick<PhotoPickerInputProps, "mode" | "multiple" | "disabled"> & {
  // 어떤 UI 에든 붙일 수 있음을 보이기 위한 트리거 종류
  trigger: "button" | "icon";
};

// 헤드리스 입력을 임의의 버튼에 연결하고 onFiles 로 받은 원본 File 을 그대로 표시
function Demo({ mode, multiple, disabled, trigger }: DemoProps) {
  const inputRef = useRef<PhotoPickerInputHandle>(null);
  const [files, setFiles] = useState<File[]>([]);
  const open = () => inputRef.current?.open();

  const summary = files
    .map((file) => `${file.name} · ${file.type || "type 없음"} · ${Math.round(file.size / 1024)}KB`)
    .join(" / ");

  return (
    <Flex direction="column" align="flex-start" gap="3" maxWidth="420px">
      {trigger === "icon" ? (
        <IconButton variant="outline" aria-label="사진 선택" disabled={disabled} onClick={open}>
          <IconCamera />
        </IconButton>
      ) : (
        <Button
          variant="outline"
          disabled={disabled}
          onClick={open}
        >
          {mode === "camera" ? <IconCamera /> : <IconImage />}
          {mode === "camera" ? "사진 촬영" : "앨범에서 선택"}
        </Button>
      )}

      <PhotoPickerInput
        ref={inputRef}
        mode={mode}
        multiple={multiple}
        disabled={disabled}
        onFiles={setFiles}
      />

      <Text textStyle="sm" color="fg.alternative">
        {files.length === 0
          ? "onFiles 로 전달된 파일 없음. 선택할 때마다 새 배열로 호출됨"
          : `onFiles(${files.length}건): ${summary}`}
      </Text>
    </Flex>
  );
}

const meta = {
  title: "다시집/PhotoPickerInput",
  component: Demo,
  args: { mode: "library", multiple: true, disabled: false, trigger: "button" },
  argTypes: {
    mode: { control: "radio", options: ["library", "camera"] },
    trigger: { control: "radio", options: ["button", "icon"] },
  },
} satisfies Meta<typeof Demo>;

export default meta;

type Story = StoryObj<typeof meta>;

export const 앨범선택: Story = {};

export const 카메라모드: Story = {
  args: { mode: "camera", multiple: false },
};

export const 아이콘트리거: Story = {
  args: { trigger: "icon" },
};

export const 비활성: Story = {
  args: { disabled: true },
};
