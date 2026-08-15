import React, { useState, useEffect } from "react";
import styled from "styled-components/native";
import { trophies, medals } from "../../mockImages";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import { useImageLoader } from "../../utils/imageLoader";
import { useNavigation } from "@react-navigation/native";

import { CircleSkeleton, TextSkeleton } from "../Skeletons/SkeletonComponents";
import { COMPETITION_TYPES } from "@shared";
import { formatCurrency } from "../../helpers/formatCurrency";

const PrizeContenders = ({
  item: player,
  index,
  isDataLoading = false,
  distribution,
  prizePool,
  hasPrizesDistributed,
  competitionType,
  prizeImages,
  cashPool,
  currencyType,
}) => {
  const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();
  const [showSkeleton, setShowSkeleton] = useState(true);
  const navigation = useNavigation();

  const displayName = formatDisplayName(player);
  const prizesType =
    prizeImages ||
    (competitionType === COMPETITION_TYPES.LEAGUE ? trophies : medals);
  const prizeSource = prizesType[index] || prizesType[0];

  const prizeXP =
    distribution && prizePool ? Math.floor(prizePool * distribution[index]) : 0;
  const prizeCash =
    distribution && cashPool != null
      ? Math.floor(cashPool * distribution[index])
      : null;

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
        <TextSkeleton show={showSkeleton} height={16} width={25}>
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
        <TextSkeleton show={showSkeleton} height={16} width={80}>
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
          style={{ marginBottom: 5 }}
        >
          {imageLoaded && !showSkeleton ? <StatTitle>Wins</StatTitle> : null}
        </TextSkeleton>

        <TextSkeleton show={showSkeleton} height={16} width={20}>
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
            style={{ marginBottom: 5 }}
          >
            {imageLoaded && !showSkeleton ? (
              <StatTitle>{prizeCash != null ? "Prize" : "CP"}</StatTitle>
            ) : null}
          </TextSkeleton>

          {prizeCash != null && (
            <TextSkeleton show={showSkeleton} height={16} width={30}>
              {imageLoaded && !showSkeleton ? (
                <CashText>{formatCurrency(prizeCash, currencyType)}</CashText>
              ) : null}
            </TextSkeleton>
          )}

          <TextSkeleton show={showSkeleton} height={16} width={20}>
            {imageLoaded && !showSkeleton ? (
              <PrizeText>
                {prizeCash != null ? `+${prizeXP} CP` : `+${prizeXP}`}
              </PrizeText>
            ) : null}
          </TextSkeleton>
        </TableCell>
      )}

      <TableCell>
        <CircleSkeleton show={showSkeleton} size={30}>
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
  resizeMode: "contain",
});

const PrizeText = styled.Text({
  fontSize: 12,
  fontWeight: "bold",
  color: "#2E7D32",
  textAlign: "center",
});

const CashText = styled.Text({
  fontSize: 12,
  fontWeight: "bold",
  color: "#00A2FF",
  textAlign: "center",
  marginBottom: 2,
});

export default PrizeContenders;
