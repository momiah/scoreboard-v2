import React, { useState } from "react";
import styled from "styled-components/native";
import { Dimensions } from "react-native";
import Tag from "../../Tag";
import AddTournamentGameModal from "../../Modals/AddTournamentGameModal";

const { width: screenWidth } = Dimensions.get("window");

// Individual player cell for fixtures
export const FixturePlayerCell = ({ position, player }) => (
  <FixtureTeamTextContainer position={position}>
    <FixtureTeamText position={position}>
      {player?.displayName || player?.firstName || "TBD"}
    </FixtureTeamText>
  </FixtureTeamTextContainer>
);

// Team column showing player(s)
export const FixtureTeamColumn = ({ team, position, tournamentType }) => (
  <FixtureTeamContainer>
    <FixturePlayerCell position={position} player={team?.player1} />
    {tournamentType === "Doubles" && team?.player2 && (
      <FixturePlayerCell position={position} player={team?.player2} />
    )}
  </FixtureTeamContainer>
);

// Score/status display for fixtures
export const FixtureScoreDisplay = ({ game }) => {
  const hasResult = game?.result;
  const approvalStatus = game?.approvalStatus;
  const isScheduled = approvalStatus === "Scheduled";
  const isPending =
    approvalStatus === "pending" || approvalStatus === "Pending";

  return (
    <FixtureResultsContainer>
      <FixtureScoreContainer>
        {hasResult ? (
          <FixtureScore>
            {game.team1.score} - {game.team2.score}
          </FixtureScore>
        ) : (
          <FixtureScore>-</FixtureScore>
        )}
      </FixtureScoreContainer>
      {isScheduled && (
        <FixtureStatusLabel status={approvalStatus}>
          Scheduled
        </FixtureStatusLabel>
      )}
      {isPending && (
        <FixtureStatusLabel status={approvalStatus}>
          Pending Approval
        </FixtureStatusLabel>
      )}
    </FixtureResultsContainer>
  );
};

// Game header with tags - NEW COMPONENT
export const FixtureGameHeader = ({ game }) => (
  <FixtureGameHeaderContainer>
    <Tag name={`Game ${game.gameNumber}`} bold color="#00A2FF" />
    <Tag name={`Court ${game.court}`} bold color="#005322ff" />
  </FixtureGameHeaderContainer>
);

// Individual fixture game item - UPDATED
export const FixtureGameItem = ({ game, tournamentType, onPress }) => {
  const GameContainer =
    game.approvalStatus === "pending" || game.approvalStatus === "Pending"
      ? PendingFixtureGameContainer
      : FixtureGameContainer;
  return (
    <GameContainer onPress={() => onPress(game)}>
      <FixtureGameHeader game={game} />
      <FixtureTeamVsContainer>
        <FixtureTeamColumn
          team={game?.team1}
          position="left"
          tournamentType={tournamentType}
        />
        <FixtureScoreDisplay game={game} />
        <FixtureTeamColumn
          team={game?.team2}
          position="right"
          tournamentType={tournamentType}
        />
      </FixtureTeamVsContainer>
    </GameContainer>
  );
};

// Round header
export const FixtureRoundHeader = ({ roundNumber }) => (
  <FixtureRoundHeaderContainer>
    <FixtureRoundHeaderText>Round {roundNumber}</FixtureRoundHeaderText>
  </FixtureRoundHeaderContainer>
);

// Main fixtures display component
export const FixturesDisplay = ({
  fixtures,
  tournamentType,
  currentUser,
  tournamentName,
  tournamentId,
}) => {
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

  const handleGamePress = (game) => {
    setSelectedGame(game);
    setGameModalVisible(true);
  };

  if (!fixtures?.length) {
    return (
      <NoFixturesContainer>
        <NoFixturesText>No fixtures available</NoFixturesText>
      </NoFixturesContainer>
    );
  }

  return (
    <FixturesContainer>
      {fixtures.map((round) => (
        <FixtureRoundContainer key={round.round}>
          <FixtureRoundHeader
            roundNumber={round.round}
            gamesCount={round.games?.length || 0}
          />
          {round.games?.map((game) => (
            <FixtureGameItem
              key={game.gameId}
              game={game}
              tournamentType={tournamentType}
              onPress={handleGamePress}
            />
          ))}
        </FixtureRoundContainer>
      ))}
      <AddTournamentGameModal
        visible={gameModalVisible}
        game={selectedGame}
        tournamentType={tournamentType}
        currentUser={currentUser}
        tournamentName={tournamentName}
        tournamentId={tournamentId}
        onClose={() => {
          setGameModalVisible(false);
          setSelectedGame(null);
        }}
        onGameUpdated={(gameData) => {
          console.log("Game updated:", gameData);
        }}
      />
    </FixturesContainer>
  );
};

// Styled Components
const FixturesContainer = styled.ScrollView({
  flex: 1,
  backgroundColor: "#020D18",
});

const FixtureRoundContainer = styled.View({
  marginBottom: 20,
});

const FixtureRoundHeaderContainer = styled.View({
  backgroundColor: "rgba(255, 255, 255, 0.1)",
  padding: 12,
  marginHorizontal: 20,
  marginBottom: 10,
  borderRadius: 8,
});

const FixtureRoundHeaderText = styled.Text({
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
  textAlign: "center",
});

const FixtureTeamContainer = styled.View({
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  borderRadius: 8,
});

const FixtureTeamTextContainer = styled.View({
  display: "flex",
  flexDirection: "column",
  padding: 15,
  paddingLeft: 20,
  paddingRight: 20,
  width: screenWidth <= 405 ? 125 : 140,
});

const FixtureTeamText = styled.Text(({ position }) => ({
  color: "white",
  fontSize: screenWidth <= 405 ? 13 : 14,
  textAlign: position === "right" ? "right" : "left",
}));

const FixtureResultsContainer = styled.View({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  minWidth: 100,
});

const FixtureScoreContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  marginTop: 5,
});

const FixtureScore = styled.Text({
  fontSize: 24,
  fontWeight: "bold",
  color: "#00A2FF",
});

const FixtureGameHeaderContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingTop: 12,
  marginBottom: 8,
});

const FixtureTeamVsContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 8,
});

// Update your existing FixtureGameContainer:
const FixtureGameContainer = styled.TouchableOpacity({
  marginHorizontal: 20,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  borderRadius: 8,
  backgroundColor: "rgb(3, 16, 31)",
  overflow: "hidden",
});

const PendingFixtureGameContainer = styled.View({
  marginHorizontal: 20,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  borderRadius: 8,
  backgroundColor: "rgb(3, 16, 31)",
  overflow: "hidden",
  opacity: 0.6,
});

const FixtureStatusLabel = styled.Text(({ status }) => ({
  paddingHorizontal: 6,
  paddingVertical: 2,
  marginTop: 8,
  fontSize: 9,
  color: "white",
  backgroundColor:
    status === "Scheduled"
      ? "rgba(0, 162, 255, 0.6)"
      : status === "Approved"
      ? "rgba(0, 255, 0, 0.6)"
      : "rgba(255, 165, 0, 0.6)",
  borderRadius: 4,
  overflow: "hidden",
}));

const NoFixturesContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  padding: 20,
});

const NoFixturesText = styled.Text({
  color: "#ccc",
  fontSize: 16,
  textAlign: "center",
});
