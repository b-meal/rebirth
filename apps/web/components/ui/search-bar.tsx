"use client";

import { Button, CloseButton, Flex, Input, InputGroup, type InputProps } from "@chakra-ui/react";

import { Icon } from "./icons";

// 검색 입력 한 줄, 값이 있으면 지우기 버튼이 나오고 취소는 넘긴 곳에만 붙음

export type SearchBarProps = Omit<InputProps, "value" | "onChange" | "onSubmit"> & {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (value: string) => void;
  onCancel?: () => void;
  cancelLabel?: string;
};

export function SearchBar({
  value,
  onChange,
  onSubmit,
  onCancel,
  cancelLabel = "취소",
  placeholder = "검색",
  ...rest
}: SearchBarProps) {
  return (
    <Flex
      as="form"
      role="search"
      gap="2"
      align="center"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit?.(value);
      }}
    >
      <InputGroup
        flex="1"
        startElement={<Icon name="search" size={18} />}
        endElement={
          value ? (
            <CloseButton
              size="xs"
              borderRadius="full"
              aria-label="지우기"
              onClick={() => onChange("")}
            />
          ) : undefined
        }
        endElementProps={{ pointerEvents: "auto" }}
      >
        <Input
          type="search"
          variant="subtle"
          borderRadius="full"
          enterKeyHint="search"
          autoComplete="off"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          css={{ "&::-webkit-search-cancel-button": { display: "none" } }}
          {...rest}
        />
      </InputGroup>
      {onCancel ? (
        <Button variant="plain" colorPalette="gray" paddingInline="1" onClick={onCancel}>
          {cancelLabel}
        </Button>
      ) : null}
    </Flex>
  );
}
