"use client";

import { Field as ChakraField } from "@chakra-ui/react";
import type { ReactNode } from "react";

// 입력 한 칸의 라벨·도움말·오류를 묶음
// 라벨과 입력이 for/id 로 이어져 라벨을 눌러도 입력에 포커스가 감

export type FieldProps = {
  label?: ReactNode;
  // 라벨 옆에 붙는 것. AI 초안 배지 자리
  labelSuffix?: ReactNode;
  helper?: ReactNode;
  // 값이 있으면 오류로 그리고 helper 대신 이걸 보여줌
  error?: string | null;
  required?: boolean;
  children: ReactNode;
};

export function Field({
  label,
  labelSuffix,
  helper,
  error,
  required = false,
  children,
}: FieldProps) {
  return (
    <ChakraField.Root invalid={Boolean(error)} required={required} gap="2">
      {label ? (
        <ChakraField.Label>
          {label}
          {required ? <ChakraField.RequiredIndicator /> : null}
          {labelSuffix}
        </ChakraField.Label>
      ) : null}

      {children}

      {/* 오류가 있으면 도움말을 밀어내고 오류만 남김. 둘을 같이 띄우면 무엇을 고칠지 흐려짐 */}
      {error ? (
        <ChakraField.ErrorText>{error}</ChakraField.ErrorText>
      ) : helper ? (
        <ChakraField.HelperText>{helper}</ChakraField.HelperText>
      ) : null}
    </ChakraField.Root>
  );
}
