import React, { useState, useEffect } from "react";
import styled from "styled-components/native";
import { trophies, medals } from "../../mockImages";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import { useImageLoader } from "../../utils/imageLoader";
import { useNavigation } from "@react-navigation/native";

import {
  CircleSkeleton,
  TextSkeleton,
} from "../../components/Skeletons/UserProfileSkeleton";
import { SKELETON_THEMES } from "../../components/Skeletons/skeletonConfig";
import { COMPETITION_TYPES } from "../../schemas/schema";

const PrizeContenders = ({
  item: player,
  index,
  isDataLoading = false,
  distribution,
  prizePool,
  hasPrizesDistributed,
  competitionType,
}) => {
  const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();
  const [showSkeleton, setShowSkeleton] = useState(true);
  const navigation = useNavigation();

  const displayName = formatDisplayName(player);
  const prizesType =
    competitionType === COMPETITION_TYPES.LEAGUE ? trophies : medals;
  const prizeSource = prizesType[index] || prizesType[0];

  const prizeXP =
    distribution && prizePool ? Math.floor(prizePool * distribution[index]) : 0;

  useEffect(() => {
    if (!isDataLoading && imageLoaded) {
      const timer = setTimeout(() => setShowSkeleton(false), 100);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(true);
    }
  }, [isDataLoading, imageLoaded]);

  return (
    <TableRow
      key={player.userId}
      onPress={() => {
        navigation.navigate("UserProfile", {
          userId: player.userId,
        });
      }}
    >
      <TableCell>
        <TextSkeleton
          show={showSkeleton}
          height={16}
          width={25}
          config={SKELETON_THEMES.dark}
        >
          {imageLoaded && !showSkeleton ? (
            <Rank>
              {index + 1}
              {index === 0
                ? "st"
                : index === 1
                ? "nd"
                : index === 2
                ? "rd"
                : "th"}
            </Rank>
          ) : null}
        </TextSkeleton>
      </TableCell>

      <PlayerNameCell>
        <TextSkeleton
          show={showSkeleton}
          height={16}
          width={80}
          config={SKELETON_THEMES.dark}
        >
          {imageLoaded && !showSkeleton ? (
            <PlayerName>{displayName}</PlayerName>
          ) : null}
        </TextSkeleton>
      </PlayerNameCell>

      <TableCell>
        <TextSkeleton
          show={showSkeleton}
          height={12}
          width={30}
          config={SKELETON_THEMES.dark}
          style={{ marginBottom: 5 }}
        >
          {imageLoaded && !showSkeleton ? <StatTitle>Wins</StatTitle> : null}
        </TextSkeleton>

        <TextSkeleton
          show={showSkeleton}
          height={16}
          width={20}
          config={SKELETON_THEMES.dark}
        >
          {imageLoaded && !showSkeleton ? (
            <Stat>{player.numberOfWins}</Stat>
          ) : null}
        </TextSkeleton>
      </TableCell>
      {hasPrizesDistributed && (
        <TableCell>
          <TextSkeleton
            show={showSkeleton}
            height={12}
            width={30}
            config={SKELETON_THEMES.dark}
            style={{ marginBottom: 5 }}
          >
            {imageLoaded && !showSkeleton ? <StatTitle>XP</StatTitle> : null}
          </TextSkeleton>

          <TextSkeleton
            show={showSkeleton}
            height={16}
            width={20}
            config={SKELETON_THEMES.dark}
          >
            {imageLoaded && !showSkeleton ? (
              <PrizeText>+{prizeXP}</PrizeText>
            ) : null}
          </TextSkeleton>
        </TableCell>
      )}

      <TableCell>
        <CircleSkeleton
          show={showSkeleton}
          size={30}
          config={SKELETON_THEMES.dark}
        >
          <PrizeImage
            source={prizeSource}
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ opacity: imageLoaded && !showSkeleton ? 1 : 0 }}
          />
        </CircleSkeleton>
      </TableCell>
    </TableRow>
  );
};

const TableRow = styled.TouchableOpacity({
  flexDirection: "row",
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 15,
  paddingBottom: 15,
  borderTopWidth: 1,
  borderColor: "1px solid rgb(9, 33, 62)",
});

const PlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 15,
  paddingBottom: 15,
  paddingRight: 5,
  borderTopWidth: 1,
  width: 130,
  borderColor: "1px solid rgb(9, 33, 62)",
});

const PlayerName = styled.Text({
  fontSize: 14,
  fontWeight: "bold",
  color: "white",
});

const Rank = styled.Text({
  fontSize: 14,
  color: "#00A2FF",
  fontWeight: "bold",
  //   paddingRight: 50,
});

const StatTitle = styled.Text({
  fontSize: 12,
  color: "#aaa",
  textAlign: "center",
});

const Stat = styled.Text({
  fontSize: 14,
  fontWeight: "bold",
  color: "white",
});

const PrizeImage = styled.Image({
  width: 30,
  height: 30,
});

const PrizeText = styled.Text({
  fontSize: 12,
  fontWeight: "bold",
  color: "#2E7D32", // Darker green
  textAlign: "center",
});

export default PrizeContenders;
