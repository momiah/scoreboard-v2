import React, { useEffect, useContext, useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Tooltip from "../Tooltip";
import { trophies } from "../../mockImages/index";
import styled from "styled-components/native";
import moment from "moment";
import { calculatePrizeAllocation } from "../../helpers/calculatePrizeAllocation";
import { UserContext } from "../../context/UserContext";
import { useImageLoader } from "../../utils/imageLoader";
import {
  CircleSkeleton,
  TextSkeleton,
  TrophyItemSkeleton,
} from "../../components/Skeletons/UserProfileSkeleton";
import { SKELETON_THEMES } from "../../components/Skeletons/skeletonConfig";

const PrizeDistribution = ({
  prizePool,
  endDate,
  leagueParticipants,
  hasPrizesDistributed,
  leagueId,
}) => {
  const { updatePlacementStats, currentUser } = useContext(UserContext);
  const distribution = [0.4, 0.3, 0.2, 0.1];

  // Memoize prize calculation to avoid recalculation on every render
  const prizes = useMemo(() => {
    return distribution.map((percentage, index) => ({
      xp: Math.floor(prizePool * percentage),
      trophy: trophies[index],
    }));
  }, [prizePool]);

  // Memoize user participation check
  const userIsParticipant = useMemo(() => {
    return (
      currentUser?.userId &&
      leagueParticipants?.some(
        (participant) => participant.userId === currentUser.userId
      )
    );
  }, [currentUser?.userId, leagueParticipants]);

  // Memoize date comparison
  const canDistributePrizes = useMemo(() => {
    const today = moment().format("DD-MM-YYYY");
    const endDateMoment = moment(endDate, "DD-MM-YYYY");
    const todayMoment = moment(today, "DD-MM-YYYY");

    return (
      todayMoment.isSameOrAfter(endDateMoment) &&
      !hasPrizesDistributed &&
      userIsParticipant
    );
  }, [endDate, hasPrizesDistributed, userIsParticipant]);

  useEffect(() => {
    if (canDistributePrizes) {
      calculatePrizeAllocation(
        leagueParticipants,
        prizePool,
        updatePlacementStats,
        distribution,
        leagueId
      );
    }
  }, [canDistributePrizes]);

  const TrophyItem = React.memo(({ trophySource, statValue, index }) => {
    const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();

    return (
      <PrizeView>
        <CircleSkeleton
          show={!imageLoaded}
          size={60}
          config={SKELETON_THEMES.dark}
        >
          <PrizeImage
            source={trophySource}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ opacity: imageLoaded ? 1 : 0 }}
          />
        </CircleSkeleton>

        <TextSkeleton
          show={!imageLoaded}
          height={14}
          width={30}
          config={SKELETON_THEMES.dark}
        >
          {imageLoaded ? (
            <PrizeText style={{ opacity: 1 }}>{statValue} XP</PrizeText>
          ) : null}
        </TextSkeleton>
      </PrizeView>
    );
  });

  return (
    <PrizeDistributionContainer>
      <SectionTitleContainer>
        <SectionTitle>Prize Distribution</SectionTitle>
        <Tooltip message="Prize Distribution is calculated by the total number of games played, number of players in the league and total number of winning points accumulated in the league" />
      </SectionTitleContainer>
      <PrizeRow>
        {prizes.map((prize, index) => (
          <TrophyItem
            key={index}
            trophySource={prize.trophy}
            statValue={prize.xp ?? 0}
            index={index}
          />
        ))}
      </PrizeRow>
    </PrizeDistributionContainer>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const PrizeDistributionContainer = styled.View({
  marginBottom: 20,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
});

const SectionTitleContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  gap: 10,
  marginBottom: 10,
});

const PrizeRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
});

const PrizeView = styled.View({
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  border: "1px solid rgb(26, 28, 54)",
  padding: screenWidth <= 400 ? 10 : 15,
  borderRadius: 8,
  alignItems: "center",
});

const PrizeImage = styled.Image({
  width: 60,
  height: 60,
  marginBottom: 5,
});

const PrizeText = styled.Text({
  color: "#ccc",
  fontSize: 14,
  fontWeight: "bold",
});

export default PrizeDistribution;
