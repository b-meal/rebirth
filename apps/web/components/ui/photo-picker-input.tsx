"use client";

import { useImperativeHandle, useRef, type ChangeEvent, type Ref } from "react";
import { PHOTO_ACCEPT } from "../../lib/image";

export type PhotoPickerInputHandle = {
  open: () => void;
};

export type PhotoPickerInputProps = {
  // camera 는 후면 카메라 즉시 실행, library 는 앨범·파일 선택
  mode: "camera" | "library";
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
  ref?: Ref<PhotoPickerInputHandle>;
};

// 화면에 보이지 않는 파일 입력. 버튼에서 open() 으로 열어 촬영 또는 선택 시작
export function PhotoPickerInput({
  mode,
  multiple = false,
  disabled = false,
  onFiles,
  ref,
}: PhotoPickerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({ open: () => inputRef.current?.click() }), []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    // 같은 파일을 다시 골라도 change 가 발생하도록 값 초기화
    event.target.value = "";
    if (files.length > 0) onFiles(files);
  };

  return (
    <input
      ref={inputRef}
      type="file"
      accept={PHOTO_ACCEPT}
      capture={mode === "camera" ? "environment" : undefined}
      multiple={mode === "library" && multiple}
      disabled={disabled}
      onChange={handleChange}
      hidden
      tabIndex={-1}
      aria-hidden="true"
    />
  );
}
