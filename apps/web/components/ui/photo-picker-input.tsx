"use client";

// design-system-allow:raw-element 카메라 즉시 실행에 네이티브 file 입력이 필요함

import { useImperativeHandle, useRef, type ChangeEvent, type Ref } from "react";
import { PHOTO_ACCEPT } from "@/lib/image";

export type PhotoPickerInputHandle = {
  open: () => void;
};

// 사진을 어디서 가져올지 정하는 자리는 여기 하나뿐임
//
// 웹에서 고르는 창은 파일 입력 그 자체임
// iOS 와 안드로이드는 accept 가 image 인 입력 하나를 열면 사진 보관함, 사진 찍기, 파일 선택 을 스스로 묻고
// 그 물음은 우리가 없앨 수도 줄일 수도 없음. 앞에 시트나 버튼 두 개를 세우면 같은 물음이 두 번 나오고
// 앨범을 고른 사람이 바로 다음 화면에서 사진 찍기 를 또 봄
//
// capture 는 휴대폰에서만 듣는 값이라 PC 에서는 촬영 입력이 앨범 입력과 똑같은 파일 창을 엶
// 그래서 갈 곳을 묻는 화면은 어느 기기에서도 값을 더하지 못함. 부르는 자리는 언제나 버튼 하나
//
// mode 는 그 하나의 버튼이 어디로 갈지만 정함
// library 는 기기가 묻게 두는 기본값이고, camera 는 현장 촬영만 받는 화면에서 물음을 건너뛸 때만 씀

export type PhotoPickerInputProps = {
  // camera 는 휴대폰에서 후면 카메라 즉시 실행, library 는 기기가 보관함과 촬영을 함께 물음
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
      // display:none 인 입력은 Safari 가 open() 을 무시해 크기만 줄여 숨김
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        opacity: 0,
        pointerEvents: "none",
      }}
      tabIndex={-1}
      aria-hidden="true"
    />
  );
}
