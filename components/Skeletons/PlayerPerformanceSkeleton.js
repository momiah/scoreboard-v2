import React from "react";
import { Skeleton } from "moti/skeleton";
import styled from "styled-components/native";

const SKELETON_COLOR_MODE = "dark";

const PlayerPerformanceSkeleton = () => {
  return (
    <Row>
      <RankCell>
        <Skeleton width={30} height={18} radius={4} colorMode={SKELETON_COLOR_MODE} />
      </RankCell>
      <NameCell>
        <Skeleton width={90} height={16} radius={4} colorMode={SKELETON_COLOR_MODE} />
      </NameCell>
      <StatCell>
        <Skeleton width={28} height={14} radius={4} colorMode={SKELETON_COLOR_MODE} />
        <Skeleton width={20} height={16} radius={4} colorMode={SKELETON_COLOR_MODE} />
      </StatCell>
      <StatCell>
        <Skeleton width={20} height={14} radius={4} colorMode={SKELETON_COLOR_MODE} />
        <Skeleton width={28} height={16} radius={4} colorMode={SKELETON_COLOR_MODE} />
      </StatCell>
      <MedalCell>
        <Skeleton radius="round" width={45} height={45} colorMode={SKELETON_COLOR_MODE} />
        <Skeleton width={16} height={12} radius={4} colorMode={SKELETON_COLOR_MODE} />
      </MedalCell>
    </Row>
  );
};

const Row = styled.View({
  flexDirection: "row",
  alignItems: "center",
  paddingTop: 15,
  paddingBottom: 15,
  paddingLeft: 20,
  borderTopWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  gap: 10,
});

const RankCell = styled.View({
  width: 35,
  justifyContent: "center",
  alignItems: "flex-start",
});

const NameCell = styled.View({
  width: 110,
  justifyContent: "center",
});

const StatCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: 4,
});

const MedalCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  gap: 5,
});

export default PlayerPerformanceSkeleton;
