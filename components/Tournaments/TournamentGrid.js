import React, { useState, useCallback } from "react";
import styled from "styled-components/native";
import Tag from "../Tag";
import { Skeleton } from "moti/skeleton";
import { calculateCompetitionStatus } from "../../helpers/calculateCompetitionStatus";
import { COMPETITION_TYPES, ccImageEndpoint } from "../../schemas/schema";
import { useNavigation } from "@react-navigation/native";

const skeletonColors = ["rgb(5, 26, 51)", "rgb(12, 68, 133)", "rgb(5, 26, 51)"];

const TournamentGrid = ({ navigationRoute, tournaments }) => {
  const navigation = useNavigation();

  const navigateTo = useCallback(
    (tournamentId) => {
      navigation.navigate(navigationRoute, { tournamentId });
    },
    [navigation, navigationRoute],
  );

  return (
    <Container>
      {tournaments.slice(0, 4).map((tournament) => {
        const status = calculateCompetitionStatus(
          tournament,
          COMPETITION_TYPES.TOURNAMENT,
        );
        const maxPlayers = tournament.maxPlayers;
        const participantsLength = tournament.tournamentParticipants.length;
        const numberOfPlayers = `${participantsLength} / ${maxPlayers}`;
        const location = `${tournament.location.city}, ${tournament.location.countryCode}`;
        const tournamentNameClipped =
          tournament.tournamentName.length > 15
            ? tournament.tournamentName.slice(0, 15) + "..."
            : tournament.tournamentName;

        return (
          <TournamentCardItem
            key={tournament.id || tournament.tournamentId}
            tournament={tournament}
            onPress={() => navigateTo(tournament.tournamentId)}
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

const TournamentCardItem = ({
  tournament,
  onPress,
  status,
  numberOfPlayers,
  location,
  tournamentNameClipped,
}) => {
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
            source={{ uri: tournament.tournamentImage || ccImageEndpoint }}
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
            {tournament.location.courtName || ""}
          </TournamentLocation>
          <TournamentLocation>{location || ""}</TournamentLocation>
          <BottomTags>
            <Tag
              name={tournament.tournamentType}
              color="#2F2F30"
              iconColor="white"
              iconSize={10}
              fontSize={9}
            />
            <Tag
              name={tournament.tournamentMode}
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
