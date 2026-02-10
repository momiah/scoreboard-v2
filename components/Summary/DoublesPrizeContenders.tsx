import React, { useState, useEffect } from "react";
import { ImageSourcePropType } from "react-native";
import styled from "styled-components/native";
import { trophies, medals } from "../../mockImages";
import { useImageLoader } from "../../utils/imageLoader";

import {
  CircleSkeleton,
  TextSkeleton,
} from "../../components/Skeletons/UserProfileSkeleton";
import {
  SKELETON_THEMES,
  skeletonConfig,
} from "../../components/Skeletons/skeletonConfig";
import { COMPETITION_TYPES } from "../../schemas/schema";
import TeamDetails from "../Modals/TeamDetailsModal";

import { TeamStats, CompetitionType } from "../../types/competition";

interface DoublePrizeContendersProps {
  teams: TeamStats[];
  isDataLoading?: boolean;
  distribution?: number[];
  prizePool?: number;
  hasPrizesDistributed?: boolean;
  competitionType: CompetitionType;
}

const DoublesPrizeContenders: React.FC<DoublePrizeContendersProps> = ({
  teams,
  isDataLoading = false,
  distribution,
  prizePool,
  hasPrizesDistributed,
  competitionType,
}) => {
  const { imageLoaded, handleImageLoad, handleImageError } = useImageLoader();
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);
  const [showTeamDetails, setShowTeamDetails] = useState<boolean>(false);
  const [selectedTeam, setSelectedTeam] = useState<TeamStats | null>(null);

  const prizesType: ImageSourcePropType[] =
    competitionType === COMPETITION_TYPES.LEAGUE ? trophies : medals;

  useEffect(() => {
    if (!isDataLoading && imageLoaded) {
      const timer = setTimeout(() => setShowSkeleton(false), 100);
      return () => clearTimeout(timer);
    } else {
      setShowSkeleton(true);
    }
  }, [isDataLoading, imageLoaded]);

  const getOrdinalSuffix = (index: number): string => {
    if (index === 0) return "st";
    if (index === 1) return "nd";
    if (index === 2) return "rd";
    return "th";
  };

  const handleTeamPress = (team: TeamStats): void => {
    setSelectedTeam(team);
    setShowTeamDetails(true);
  };

  return (
    <>
      {teams.map((team, index) => {
        const prizeSource: ImageSourcePropType =
          prizesType[index] || prizesType[0];
        const prizeXP: number =
          distribution && prizePool
            ? Math.floor(prizePool * distribution[index])
            : 0;

        return (
          <TableRow key={team.teamKey} onPress={() => handleTeamPress(team)}>
            <TableCell>
              <TextSkeleton
                show={showSkeleton}
                height={16}
                width={25}
                config={skeletonConfig}
              >
                {imageLoaded && !showSkeleton ? (
                  <Rank>
                    {index + 1}
                    {getOrdinalSuffix(index)}
                  </Rank>
                ) : null}
              </TextSkeleton>
            </TableCell>

            <TeamNameCell>
              <TextSkeleton
                show={showSkeleton}
                height={16}
                width={80}
                config={skeletonConfig}
              >
                {imageLoaded && !showSkeleton ? (
                  <TeamNamesContainer>
                    {team.team.map((playerName, idx) => (
                      <PlayerName key={`${playerName}-${idx}`}>
                        {playerName}
                      </PlayerName>
                    ))}
                  </TeamNamesContainer>
                ) : null}
              </TextSkeleton>
            </TeamNameCell>

            <TableCell>
              <TextSkeleton
                show={showSkeleton}
                height={12}
                width={30}
                config={skeletonConfig}
                // style={{ marginBottom: 5 }}
              >
                {imageLoaded && !showSkeleton ? (
                  <StatTitle>Wins</StatTitle>
                ) : null}
              </TextSkeleton>

              <TextSkeleton
                show={showSkeleton}
                height={16}
                width={20}
                config={skeletonConfig}
              >
                {imageLoaded && !showSkeleton ? (
                  <Stat>{team.numberOfWins}</Stat>
                ) : null}
              </TextSkeleton>
            </TableCell>

            {hasPrizesDistributed && (
              <TableCell>
                <TextSkeleton
                  show={showSkeleton}
                  height={12}
                  width={30}
                  config={skeletonConfig}
                  //   style={{ marginBottom: 5 }}
                >
                  {imageLoaded && !showSkeleton ? (
                    <StatTitle>XP</StatTitle>
                  ) : null}
                </TextSkeleton>

                <TextSkeleton
                  show={showSkeleton}
                  height={16}
                  width={20}
                  config={skeletonConfig}
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
                config={skeletonConfig}
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
      })}

      {showTeamDetails && selectedTeam && (
        <TeamDetails
          showTeamDetails={showTeamDetails}
          setShowTeamDetails={setShowTeamDetails}
          teamStats={selectedTeam}
        />
      )}
    </>
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
  borderColor: "rgb(9, 33, 62)",
});

const TeamNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-start",
  paddingTop: 15,
  paddingBottom: 15,
  paddingRight: 5,
  borderTopWidth: 1,
  width: 130,
  borderColor: "rgb(9, 33, 62)",
});

const TeamNamesContainer = styled.View({
  flexDirection: "column",
  gap: 4,
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

export default DoublesPrizeContenders;
