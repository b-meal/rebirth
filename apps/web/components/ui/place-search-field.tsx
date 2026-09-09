"use client";

import type { LocationCandidate } from "@rebirth/core/location/candidate";
import {
  FlexBox,
  List,
  ListCell,
  Loading,
  SearchField,
  SectionMessage,
  Typography,
} from "@wanteddev/wds";
import type { PlaceSearchState } from "../../hooks/use-place-search";

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
    <FlexBox flexDirection="column" sx={{ position: "relative" }}>
      <SearchField
        placeholder={placeholder}
        value={search.query}
        onChange={(event) => search.setQuery(event.target.value)}
        onReset={() => search.clear()}
      />

      {open && (
        <FlexBox
          flexDirection="column"
          sx={(theme) => ({
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: "4px",
            maxHeight: maxListHeight,
            overflowY: "auto",
            borderRadius: 12,
            border: `1px solid ${theme.semantic.line.normal.normal}`,
            backgroundColor: theme.semantic.background.elevated.normal,
            boxShadow: theme.semantic.elevation.shadow.normal.medium,
            // 카카오 지도 레이어보다 위
            zIndex: 10,
          })}
        >
          {search.error && (
            <SectionMessage variant="negative" open>
              {search.error}
            </SectionMessage>
          )}
          {search.loading && (
            <FlexBox alignItems="center" gap="8px" sx={{ padding: "14px 16px" }}>
              <Loading size={16} />
              <Typography variant="body2" color="semantic.label.alternative">
                찾고 있습니다
              </Typography>
            </FlexBox>
          )}
          {search.empty && (
            <FlexBox sx={{ padding: "14px 16px" }}>
              <Typography variant="body2" color="semantic.label.alternative">
                {emptyMessage}
              </Typography>
            </FlexBox>
          )}
          {search.items.length > 0 && (
            <List>
              {search.items.map((candidate) => (
                <ListCell
                  key={candidate.id}
                  divider
                  fillWidth
                  textProps={{
                    caption: withDistance(
                      candidate.detail,
                      candidate.distanceMeters,
                    ),
                  }}
                  onClick={() => onPick(candidate)}
                >
                  {candidate.name}
                </ListCell>
              ))}
            </List>
          )}
        </FlexBox>
      )}
    </FlexBox>
  );
}
