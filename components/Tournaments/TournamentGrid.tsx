import React, { useState, useCallback } from "react";
import styled from "styled-components/native";
import Tag from "../Tag";
import { Skeleton } from "moti/skeleton";
import { calculateCompetitionStatus } from "../../helpers/calculateCompetitionStatus";
import { COMPETITION_TYPES, ccImageEndpoint } from "@shared";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { NormalizedCompetition } from "@shared/types";

const skeletonColors = ["rgb(5, 26, 51)", "rgb(12, 68, 133)", "rgb(5, 26, 51)"];

interface TournamentGridProps {
  navigationRoute: string;
  tournaments: NormalizedCompetition[];
}

const TournamentGrid = ({
  navigationRoute,
  tournaments,
}: TournamentGridProps) => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const navigateTo = useCallback(
    (tournamentId: string) => {
      navigation.navigate(navigationRoute, { tournamentId });
    },
    [navigation, navigationRoute],
  );

  return (
    <Container>
      {(tournaments ?? []).slice(0, 4).map((tournament, index) => {
        const status = calculateCompetitionStatus(
          tournament,
          COMPETITION_TYPES.TOURNAMENT,
        );
        const maxPlayers = tournament.maxPlayers;
        const participantsLength = (tournament.participants ?? []).length;
        const numberOfPlayers = `${participantsLength} / ${maxPlayers}`;
        const location = `${tournament.location?.city}, ${tournament.location?.countryCode}`;
        const tournamentNameClipped =
          tournament.name.length > 15
            ? tournament.name.slice(0, 15) + "..."
            : tournament.name;

        return (
          <TournamentCardItem
            key={tournament.id || index}
            tournament={tournament}
            onPress={() => navigateTo(tournament.id)}
            status={status}
            numberOfPlayers={numberOfPlayers}
            location={location}
            tournamentNameClipped={tournamentNameClipped}
          />
        );
      })}
    </Container>
  );
};

interface TournamentCardItemProps {
  tournament: NormalizedCompetition;
  onPress: () => void;
  status: { status: string; color: string };
  numberOfPlayers: string;
  location: string;
  tournamentNameClipped: string;
}

const TournamentCardItem = ({
  tournament,
  onPress,
  status,
  numberOfPlayers,
  location,
  tournamentNameClipped,
}: TournamentCardItemProps) => {
  const [imageLoading, setImageLoading] = useState(true);

  return (
    <TournamentContainer onPress={onPress}>
      <TournamentCard>
        <TournamentImageContainer>
          {imageLoading && (
            <ImageSkeletonOverlay>
              <Skeleton
                width="100%"
                height={120}
                radius={0}
                colors={skeletonColors}
              />
            </ImageSkeletonOverlay>
          )}
          <TournamentImage
            source={{ uri: tournament.image || ccImageEndpoint }}
            resizeMode="cover"
            onLoadEnd={() => setImageLoading(false)}
          >
            <StatusTagContainer>
              <Tag
                name={status.status}
                color={status.color}
                fontSize={9}
                bold={true}
              />
            </StatusTagContainer>
            <NumberOfPlayers>
              <Tag
                name={numberOfPlayers}
                color="rgba(0, 0, 0, 0.7)"
                iconColor="#00A2FF"
                iconSize={15}
                icon="person"
                iconPosition="right"
                bold
              />
            </NumberOfPlayers>
          </TournamentImage>
        </TournamentImageContainer>

        <TournamentInfo>
          <TournamentName>{tournamentNameClipped}</TournamentName>
          <TournamentLocation>
            {tournament.location?.courtName || ""}
          </TournamentLocation>
          <TournamentLocation>{location || ""}</TournamentLocation>
          <BottomTags>
            <Tag
              name={tournament.type}
              color="#2F2F30"
              iconColor="white"
              iconSize={10}
              fontSize={9}
            />
            <Tag
              name={tournament.mode}
              color="#2F2F30"
              iconColor="white"
              iconSize={10}
              fontSize={9}
            />
          </BottomTags>
        </TournamentInfo>
      </TournamentCard>
    </TournamentContainer>
  );
};

const Container = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
  gap: 15,
  paddingHorizontal: 10,
  marginBottom: 40,
});

const TournamentContainer = styled.TouchableOpacity({
  width: "47%",
});

const TournamentCard = styled.View({
  borderRadius: 12,
  overflow: "hidden",
});

const TournamentImageContainer = styled.View({
  height: 120,
  position: "relative",
});

const ImageSkeletonOverlay = styled.View({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: 1,
});

const TournamentImage = styled.ImageBackground({
  width: "100%",
  height: "100%",
  alignItems: "flex-end",
});

const StatusTagContainer = styled.View({
  position: "absolute",
  top: 8,
  right: 8,
});

const NumberOfPlayers = styled.View({
  position: "absolute",
  bottom: 8,
  left: 8,
  borderRadius: 5,
  flexDirection: "row",
  alignItems: "center",
  gap: 5,
});

const TournamentInfo = styled.View({
  padding: 10,
  border: "1px solid #192336",
});

const TournamentName = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
  marginBottom: 4,
});

const TournamentLocation = styled.Text({
  fontSize: 13,
  color: "white",
  borderRadius: 5,
});

const BottomTags = styled.View({
  marginTop: 20,
  flexDirection: "row",
  gap: 6,
  flexWrap: "wrap",
  height: 22,
});

export default TournamentGrid;
