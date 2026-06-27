import React, { memo } from "react";
import { View, Dimensions } from "react-native";
import styled from "styled-components/native";
import { TextSkeleton } from "./SkeletonComponents";

const { width: screenWidth } = Dimensions.get("window");
const isSmallScreen = screenWidth < 400;

const AVATAR_SIZE = isSmallScreen ? 44 : 52;

const CompetitionListItemSkeleton = memo(() => (
  <ListItemContainer activeOpacity={1} disabled>
    <RowContainer>
      <LeftColumn>
        <AvatarSkeleton />
      </LeftColumn>

      <ContentColumn>
        <TopRow>
          <CompetitionInfo>
            <TextSkeleton show height={isSmallScreen ? 14 : 16} width={160} />
            <View style={{ marginTop: 6 }}>
              <TextSkeleton show height={isSmallScreen ? 11 : 12} width={90} />
            </View>
          </CompetitionInfo>

          <StatsRow>
            <StatBlock>
              <TextSkeleton show height={isSmallScreen ? 10 : 11} width={28} />
              <View style={{ marginTop: 4 }}>
                <TextSkeleton
                  show
                  height={isSmallScreen ? 20 : 24}
                  width={24}
                />
              </View>
            </StatBlock>
            <StatBlock>
              <TextSkeleton show height={isSmallScreen ? 10 : 11} width={28} />
              <View style={{ marginTop: 4 }}>
                <TextSkeleton
                  show
                  height={isSmallScreen ? 20 : 24}
                  width={24}
                />
              </View>
            </StatBlock>
          </StatsRow>
        </TopRow>

        <MetaRow>
          <MetaLeft>
            <TextSkeleton show height={12} width={140} />
          </MetaLeft>
          <TextSkeleton show height={12} width={90} />
        </MetaRow>
      </ContentColumn>
    </RowContainer>
  </ListItemContainer>
));

CompetitionListItemSkeleton.displayName = "CompetitionListItemSkeleton";

const ListItemContainer = styled.TouchableOpacity({
  flexDirection: "column",
  padding: 15,
  backgroundColor: "rgb(3, 16, 31)",
  borderTopWidth: 1,
  borderColor: "rgb(9, 33, 62)",
});

const RowContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  width: "100%",
  gap: 12,
});

const LeftColumn = styled.View({
  width: AVATAR_SIZE,
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
});

const AvatarSkeleton = styled.View({
  width: AVATAR_SIZE,
  height: AVATAR_SIZE,
  borderRadius: AVATAR_SIZE / 2,
  backgroundColor: "rgb(9, 33, 62)",
});

const ContentColumn = styled.View({
  flex: 1,
  flexDirection: "column",
});

const TopRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
});

const CompetitionInfo = styled.View({
  flexDirection: "column",
  flex: 1,
  marginRight: 10,
});

const StatsRow = styled.View({
  flexDirection: "row",
  gap: 16,
  alignItems: "flex-start",
});

const MetaRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  marginTop: 10,
});

const MetaLeft = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
});

const StatBlock = styled.View({
  alignItems: "center",
});

export default CompetitionListItemSkeleton;
