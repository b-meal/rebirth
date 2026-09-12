"use client";

// design-system-allow:raw-element 보이지 않는 hidden 필드라 SEED 에 대응 컴포넌트가 없음

import { useFormStatus } from "react-dom";
import { Flex } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

// design-system-allow:raw-element form 은 SEED 에 대응 컴포넌트가 없는 표준 요소

import { NEXT_PARAM, type ProviderDescriptor } from "@rebirth/core/auth";

import { signInWithProvider } from "./actions";

// 제공자 버튼 하나. form 으로 감싸 자바스크립트가 없어도 눌리게 함
// 제공자 화면으로 넘어가기까지 왕복이 있어 진행 표시가 필요함

type Props = {
  provider: ProviderDescriptor;
  next: string;
};

export function ProviderButton({ provider, next }: Props) {
  return (
    <form action={signInWithProvider}>
      <input type="hidden" name="provider" value={provider.id} />
      <input type="hidden" name={NEXT_PARAM} value={next} />
      {/* ActionButton 은 width 를 받지 않아 flex 컨테이너에서 flexGrow 로 늘림 */}
      <Flex align="stretch">
        <SubmitButton label={provider.label} />
      </Flex>
    </form>
  );
}

/** useFormStatus 는 form 안에서만 값을 읽으므로 버튼을 따로 둠 */
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <ActionButton
      type="submit"
      variant="neutralOutline"
      size="large"
      flexGrow={1}
      loading={pending}
      disabled={pending}
    >
      {label}
    </ActionButton>
  );
}
