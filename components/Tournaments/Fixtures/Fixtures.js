import React, { useState, useContext } from "react";
import { SafeAreaView, Alert } from "react-native";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import { UserContext } from "../../../context/UserContext";
import GenerateFixturesModal from "../../Modals/GenerateFixturesModal";
import { FixturesDisplay } from "./FixturesAtoms";
import { EmptyStateContainer } from "../EmptyStateContainer";

const Fixtures = ({ tournament, userRole, scrollToGameId, glowColor }) => {
  const [showGenerateFixturesModal, setShowGenerateFixturesModal] =
    useState(false);

  const [generatedFixtures, setGeneratedFixtures] = useState(
    tournament?.fixtures ?? null,
  );

  const fixturesArray = generatedFixtures?.fixtures || generatedFixtures || [];

  const { currentUser } = useContext(UserContext);

  const numberOfParticipants = tournament?.tournamentParticipants
    ? tournament.tournamentParticipants.length
    : 0;

  const hasFixtures = fixturesArray && fixturesArray.length > 0;
  const tournamentType = tournament?.tournamentType || "Singles";
  const numberOfCourts = tournament?.numberOfCourts || 1;

  const numberOfTeams = Math.floor(numberOfParticipants / 2);
  const participantsValue =
    tournamentType === "Singles" ? numberOfParticipants : numberOfTeams;
  const participantsLabel =
    tournamentType === "Singles"
      ? `Player${numberOfParticipants !== 1 ? "s" : ""}`
      : `Team${numberOfTeams !== 1 ? "s" : ""}`;

  const allGames = fixturesArray.flatMap((round) => round.games || []);
  const numberOfMatches = allGames.length;
  const gamesCompleted = allGames.filter(
    (game) => game.approvalStatus === "approved",
  ).length;
  const allGamesCompleted = gamesCompleted === numberOfMatches;

  const isEvenNumberOfParticipants = numberOfParticipants % 2 === 0;
  const emptyStateMessage =
    userRole === "admin"
      ? "Create your tournament fixtures to start organizing matches"
      : "Please contact the tournament organizer to generate fixtures.";

  const handleShowGenerateFixtures = () => {
    if (!isEvenNumberOfParticipants) {
      Alert.alert("Please ensure an even number of participants.");
      return;
    }

    setShowGenerateFixturesModal(true);
  };

  return (
    <Container>
      {hasFixtures && (
        <Header>
          <LeftGroup>
            <DetailItem>
              <Ionicons name="grid-outline" size={15} color="#00A2FF" />
              <DetailText>
                {numberOfCourts} Court{numberOfCourts > 1 ? "s" : ""}
              </DetailText>
            </DetailItem>
            <DetailItem>
              <Ionicons name="people-outline" size={15} color="#00A2FF" />
              <DetailText>
                {participantsValue} {participantsLabel}
              </DetailText>
            </DetailItem>
          </LeftGroup>
          <DetailItem>
            <Ionicons
              name="checkmark-done-outline"
              size={15}
              color={allGamesCompleted ? "#00A2FF" : "#ccc"}
            />
            <DetailText>
              {gamesCompleted}/{numberOfMatches} Matches
            </DetailText>
          </DetailItem>
        </Header>
      )}

      {hasFixtures ? (
        <FixturesDisplay
          fixtures={fixturesArray}
          tournamentType={tournamentType}
          currentUser={currentUser}
          tournamentName={tournament?.tournamentName}
          tournamentId={tournament?.tournamentId}
          scrollToGameId={scrollToGameId}
          glowColor={glowColor}
        />
      ) : (
        <EmptyStateContainer
          emptyStateMessage={emptyStateMessage}
          userRole={userRole}
          handleShowGenerateFixtures={handleShowGenerateFixtures}
          label="Fixtures"
        />
      )}

      {showGenerateFixturesModal && (
        <GenerateFixturesModal
          modalVisible={showGenerateFixturesModal}
          setModalVisible={setShowGenerateFixturesModal}
          competition={tournament}
          currentUser={currentUser}
          setGeneratedFixtures={setGeneratedFixtures}
          generatedFixtures={generatedFixtures}
        />
      )}
    </Container>
  );
};

const Container = styled(SafeAreaView)({
  flex: 1,
});

const Header = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "15px 20px",
  marginBottom: 10,
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255, 255, 255, 0.1)",
});

const LeftGroup = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 14,
});

const DetailItem = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
});

const DetailText = styled.Text({
  fontSize: 13,
  fontWeight: "600",
  color: "#ccc",
});

export default Fixtures;
