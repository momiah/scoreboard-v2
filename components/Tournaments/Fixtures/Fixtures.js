import React, { useState, useContext } from "react";
import { SafeAreaView, Alert } from "react-native";
import styled from "styled-components/native";
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
  const numberOfCourtsMessage = `${numberOfCourts} Court${
    numberOfCourts > 1 ? "s" : ""
  }`;

  const numberOfParticipantsMessage = `${numberOfParticipants} Participant${
    numberOfParticipants !== 1 ? "s" : ""
  }`;
  const numberOfTeamsMessage = `${Math.floor(numberOfParticipants / 2)} Team${
    Math.floor(numberOfParticipants / 2) !== 1 ? "s" : ""
  }`;

  const FixtureDetailsMessage =
    tournamentType === "Singles"
      ? numberOfParticipantsMessage
      : numberOfTeamsMessage;

  const numberOfMatches =
    fixturesArray.flatMap((round) => round.games || []).length || 0;

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
          <FixtureDetails>
            {numberOfMatches} Matches - {numberOfCourtsMessage} -{" "}
            {FixtureDetailsMessage}
          </FixtureDetails>
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
  // backgroundColor: "#020D18",
});

const Header = styled.View({
  padding: "20px 20px 10px 20px",
  borderBottomWidth: 1,
  borderBottomColor: "rgba(255, 255, 255, 0.1)",
  marginBottom: 10,
});

const FixtureDetails = styled.Text({
  fontSize: 14,
  color: "#ccc",
});

export default Fixtures;
