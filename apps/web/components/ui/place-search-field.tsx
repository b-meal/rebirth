"use client";

import type { LocationCandidate } from "@rebirth/core/location/candidate";
import { Box, Icon, Skeleton, Text, VStack } from "@seed-design/react";
import { IconXmarkCircleFill } from "@karrotmarket/react-monochrome-icon";
import { ActionButton } from "seed-design/ui/action-button";
import { Callout } from "seed-design/ui/callout";
import { List, ListButtonItem } from "seed-design/ui/list";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

import type { PlaceSearchState } from "@/hooks/use-place-search";

// 장소 검색창, 결과를 흐름에 두면 아래 요소가 밀려 내려가므로 겹쳐 띄움

export type PlaceSearchFieldProps = {
  search: PlaceSearchState;
  onPick: (candidate: LocationCandidate) => void;
  placeholder?: string;
  /** 결과 목록의 최대 높이, 겹칠 대상에 맞춰 조절 */
  maxListHeight?: number;
  /** 결과가 없을 때 띄울 안내, 검색 방식마다 다음 행동이 다름 */
  emptyMessage?: string;
};

const MAX_LIST_HEIGHT = 220;

// 결과 자리를 잡아 두는 행 수, 결과가 들어오면 그대로 목록으로 바뀜
const SKELETON_ROWS = [0, 1];

// 반경 검색에서만 거리가 오므로 있을 때만 덧붙임
function withDistance(detail: string, meters: number | null): string {
  if (meters === null) return detail;
  const distance = meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
  return detail ? `${detail} · ${distance}` : distance;
}

export function PlaceSearchField({
  search,
  onPick,
  placeholder = "지하철역, 건물, 주소로 검색",
  maxListHeight = MAX_LIST_HEIGHT,
  emptyMessage = "검색 결과가 없습니다",
}: PlaceSearchFieldProps) {
  // 결과가 없거나 찾는 중에도 열어 둠, 아무것도 안 뜨면 고장난 것으로 보임
  const open = search.loading || search.empty || search.items.length > 0 || Boolean(search.error);

  return (
    <Box position="relative">
      <TextField value={search.query} onValueChange={(next) => search.setQuery(next.value)}>
        <TextFieldInput
          placeholder={placeholder}
          aria-label={placeholder}
          aria-busy={search.loading}
        />
      </TextField>

      {search.query ? (
        <Box position="absolute" top="0" right="x2" height="full">
          <VStack justify="center" height="full">
            <ActionButton
              variant="ghost"
              size="xsmall"
              layout="iconOnly"
              aria-label="검색어 지우기"
              onClick={() => search.clear()}
            >
              <Icon svg={<IconXmarkCircleFill />} />
            </ActionButton>
          </VStack>
        </Box>
      ) : null}

      {open ? (
        <Box
          position="absolute"
          top="100%"
          left="0"
          right="0"
          mt="x1"
          maxHeight={`${maxListHeight}px`}
          overflowY="auto"
          borderRadius="r3"
          borderWidth={1}
          borderColor="stroke.neutralMuted"
          bg="bg.layerFloating"
          boxShadow="s2"
          zIndex={10}
        >
          {search.error ? <Callout tone="critical" description={search.error} /> : null}

          {/* 앞 결과가 남아 있으면 그대로 두고 빈 자리에서만 결과 자리를 잡아 둠 */}
          {search.loading && search.items.length === 0 ? (
            <VStack align="stretch" gap="x2" p="x4" aria-hidden="true">
              {SKELETON_ROWS.map((row) => (
                <VStack key={row} align="stretch" gap="x1_5">
                  <Skeleton width="45%" height="x4" radius="8" />
                  <Skeleton width="70%" height="x3_5" radius="8" />
                </VStack>
              ))}
            </VStack>
          ) : null}

          {search.empty ? (
            <Box p="x4">
              <Text textStyle="t4Regular" color="fg.neutralMuted">
                {emptyMessage}
              </Text>
            </Box>
          ) : null}

          {search.items.length > 0 ? (
            <List>
              {search.items.map((candidate) => (
                <ListButtonItem
                  key={candidate.id}
                  title={candidate.name}
                  detail={withDistance(candidate.detail, candidate.distanceMeters)}
                  onClick={() => onPick(candidate)}
                />
              ))}
            </List>
          ) : null}
        </Box>
      ) : null}
    </Box>
  );
}
