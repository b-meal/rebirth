"use client";

import type { LocationCandidate } from "@rebirth/core/location/candidate";
import { Box, Flex, IconButton, Input, Skeleton, Text } from "@chakra-ui/react";

import type { PlaceSearchState } from "@/hooks/use-place-search";
import { IconClose } from "./icons";
import { SectionMessage } from "./section-message";

// 장소·주소 검색창. 결과를 흐름에 두면 열릴 때마다 아래 요소가 밀려 내려가므로 겹쳐 띄움

export type PlaceSearchFieldProps = {
  search: PlaceSearchState;
  onPick: (candidate: LocationCandidate) => void;
  placeholder?: string;
  // 결과 목록의 최대 높이. 겹칠 대상에 맞춰 조절
  maxListHeight?: number;
  // 결과가 없을 때 띄울 안내. 검색 방식마다 다음 행동이 다름
  emptyMessage?: string;
};

const MAX_LIST_HEIGHT = 220;

// 결과 자리를 잡아 두는 행 수. 결과가 들어오면 그대로 목록으로 바뀜
const SKELETON_ROWS = [0, 1];

// 반경 검색에서만 거리가 오므로 있을 때만 덧붙임
function withDistance(detail: string, meters: number | null): string {
  if (meters === null) return detail;
  const distance =
    meters < 1000 ? `${meters}m` : `${(meters / 1000).toFixed(1)}km`;
  return detail ? `${detail} · ${distance}` : distance;
}

export function PlaceSearchField({
  search,
  onPick,
  placeholder = "지하철역, 건물, 주소로 검색",
  maxListHeight = MAX_LIST_HEIGHT,
  emptyMessage = "검색 결과가 없습니다",
}: PlaceSearchFieldProps) {
  // 결과가 없거나 찾는 중에도 열어 둠. 아무것도 안 뜨면 고장난 것으로 보임
  const open =
    search.loading ||
    search.empty ||
    search.items.length > 0 ||
    Boolean(search.error);

  return (
    <Box position="relative">
      <Input
        placeholder={placeholder}
        value={search.query}
        onChange={(event) => search.setQuery(event.target.value)}
        aria-busy={search.loading}
        // 지우기 버튼과 글자가 겹치지 않게 오른쪽을 비움
        paddingRight={search.query ? "10" : undefined}
      />
      {search.query ? (
        <IconButton
          aria-label="검색어 지우기"
          variant="ghost"
          size="sm"
          position="absolute"
          top="50%"
          right="1"
          transform="translateY(-50%)"
          onClick={() => search.clear()}
        >
          <IconClose />
        </IconButton>
      ) : null}

      {open && (
        <Flex
          direction="column"
          position="absolute"
          top="100%"
          left="0"
          right="0"
          marginTop="1"
          maxHeight={`${maxListHeight}px`}
          overflowY="auto"
          borderRadius="card"
          borderWidth="1px"
          borderColor="border"
          backgroundColor="bg.panel"
          boxShadow="md"
          // 카카오 지도 레이어보다 위
          zIndex="10"
        >
          {search.error && (
            <SectionMessage variant="negative">{search.error}</SectionMessage>
          )}
          {/* 앞 결과가 남아 있으면 그대로 두고, 빈 자리에서만 결과 자리를 잡아 둠 */}
          {/* 진행 상태는 검색창의 aria-busy 가 알리므로 여기는 장식으로만 둠 */}
          {search.loading && search.items.length === 0 && (
            <Flex direction="column" aria-hidden="true">
              {SKELETON_ROWS.map((row) => (
                <Flex
                  key={row}
                  direction="column"
                  gap="1.5"
                  padding="3.5"
                  borderBottomWidth={row === SKELETON_ROWS.length - 1 ? "0" : "1px"}
                  borderColor="border"
                >
                  <Skeleton width="45%" height="16px" />
                  <Skeleton width="70%" height="13px" />
                </Flex>
              ))}
            </Flex>
          )}
          {search.empty && (
            <Flex padding="3.5">
              <Text color="fg.alternative">{emptyMessage}</Text>
            </Flex>
          )}
          {search.items.length > 0 && (
            <Box as="ul" listStyleType="none">
              {search.items.map((candidate, row) => (
                <Flex
                  key={candidate.id}
                  as="li"
                  direction="column"
                  gap="0.5"
                  padding="3.5"
                  cursor="pointer"
                  borderBottomWidth={row === search.items.length - 1 ? "0" : "1px"}
                  borderColor="border"
                  _hover={{ backgroundColor: "bg.alternative" }}
                  onClick={() => onPick(candidate)}
                >
                  <Text>{candidate.name}</Text>
                  <Text textStyle="sm" color="fg.alternative">
                    {withDistance(candidate.detail, candidate.distanceMeters)}
                  </Text>
                </Flex>
              ))}
            </Box>
          )}
        </Flex>
      )}
    </Box>
  );
}
