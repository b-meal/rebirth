"use client";

import { useFormStatus } from "react-dom";
import { Flex } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

import { signOut } from "@/app/sign-out/actions";

// 로그아웃 버튼. form 으로 감싸 자바스크립트가 없어도 눌림

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Flex align="stretch">
        <SubmitButton />
      </Flex>
    </form>
  );
}

/** useFormStatus 는 form 안에서만 값을 읽으므로 버튼을 따로 둠 */
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <ActionButton
      type="submit"
      variant="neutralWeak"
      size="large"
      flexGrow={1}
      loading={pending}
      disabled={pending}
    >
      로그아웃
    </ActionButton>
  );
}
