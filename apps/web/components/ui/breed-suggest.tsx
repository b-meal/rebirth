"use client";

import { useEffect, useState } from "react";
import { HStack, Text, VStack } from "@seed-design/react";
import { ActionButton } from "seed-design/ui/action-button";

// 국가동물보호정보시스템 표준 품종을 제안함
// 고르지 않아도 넘어갈 수 있음. 품종을 단정하지 않는다는 규칙이 먼저임

const MIN_LENGTH = 1;
const MAX_SHOWN = 4;
// 입력이 멈춘 뒤에 부름. 글자마다 부르면 목록이 깜박임
const DEBOUNCE_MS = 250;

type Kind = { kindCd: string; kindNm: string; upKindNm: string };

export function BreedSuggest({
  value,
  animalType,
  onPick,
}: {
  value: string;
  /** 개나 고양이면 그 축종 안에서만 찾음 */
  animalType?: string;
  onPick: (kindNm: string) => void;
}) {
  const [items, setItems] = useState<Kind[]>([]);

  const query = value.trim();

  useEffect(() => {
    if (query.length < MIN_LENGTH) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const params = new URLSearchParams({ q: query });
      if (animalType === "dog") params.set("upKindCd", "417000");
      if (animalType === "cat") params.set("upKindCd", "422400");

      try {
        const response = await fetch(`/api/kinds?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const body = (await response.json()) as { items: Kind[] };
        // 이미 표준 표기 그대로면 제안할 것이 없음
        setItems(
          body.items.filter((item) => item.kindNm !== query).slice(0, MAX_SHOWN),
        );
      } catch {
        // 제안이 없어도 입력은 그대로 쓸 수 있으므로 조용히 넘김
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, animalType]);

  // 입력이 짧아졌을 때 목록을 지우려고 effect 에서 상태를 건드리면 렌더가 연쇄됨
  const shown = query.length < MIN_LENGTH ? [] : items;
  if (shown.length === 0) return null;

  return (
    <VStack align="stretch" gap="x1_5">
      <Text textStyle="t2Regular" color="fg.neutralSubtle">
        표준 표기로 바꾸기
      </Text>
      <HStack gap="x2" flexWrap="wrap">
        {shown.map((item) => (
          <ActionButton
            key={item.kindCd}
            type="button"
            size="small"
            variant="neutralOutline"
            onClick={() => onPick(item.kindNm)}
          >
            {item.kindNm}
          </ActionButton>
        ))}
      </HStack>
    </VStack>
  );
}
