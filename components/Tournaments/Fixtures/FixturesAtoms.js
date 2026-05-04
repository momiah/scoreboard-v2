import React, { useState, useEffect } from "react";
import styled from "styled-components/native";
import { Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Tag from "../../Tag";
import AddTournamentGameModal from "../../Modals/AddTournamentGameModal";
import { COMPETITION_TYPES } from "@shared";

const { width: screenWidth } = Dimensions.get("window");

export const FixturePlayerCell = ({ position, player }) => (
  <FixtureTeamTextContainer position={position}>
    <FixtureTeamText position={position}>
      {player?.displayName || player?.firstName || "TBD"}
    </FixtureTeamText>
  </FixtureTeamTextContainer>
);

export const FixtureTeamColumn = ({ team, position, tournamentType }) => (
  <FixtureTeamContainer>
    <FixturePlayerCell position={position} player={team?.player1} />
    {tournamentType === "Doubles" && team?.player2 && (
      <FixturePlayerCell position={position} player={team?.player2} />
    )}
  </FixtureTeamContainer>
);

export const FixtureScoreDisplay = ({ game }) => {
  const hasResult = game?.result;
  const approvalStatus = game?.approvalStatus;
  const videoCount = game?.videoCount ?? 0;

  const statusLabel =
    approvalStatus === "Scheduled"
      ? "Scheduled"
      : approvalStatus === "pending" || approvalStatus === "Pending"
        ? "Pending Approval"
        : null;

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
      {statusLabel && (
        <FixtureStatusLabel status={approvalStatus}>
          {statusLabel}
        </FixtureStatusLabel>
      )}
      {videoCount > 0 && (
        <VideoIndicator>
          <Ionicons
            name="videocam-outline"
            size={10}
            color="rgba(255,255,255,0.6)"
          />
          <VideoIndicatorText>
            {videoCount} {videoCount === 1 ? "video" : "videos"}
          </VideoIndicatorText>
        </VideoIndicator>
      )}
    </FixtureResultsContainer>
  );
};

export const FixtureGameHeader = ({ game }) => (
  <FixtureGameHeaderContainer>
    <Tag name={`Game ${game.gameNumber}`} bold color="#00A2FF" />
    <Tag name={`Court ${game.court}`} bold color="#005322ff" />
  </FixtureGameHeaderContainer>
);

export const FixtureGameItem = ({ game, tournamentType, onPress }) => (
  <FixtureGameContainer
    onPress={() => onPress(game)}
    style={{
      opacity:
        game.approvalStatus === "pending" || game.approvalStatus === "Pending"
          ? 0.6
          : 1,
    }}
  >
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
  </FixtureGameContainer>
);

export const FixtureRoundHeader = ({ roundNumber }) => (
  <FixtureRoundHeaderContainer>
    <FixtureRoundHeaderText>Round {roundNumber}</FixtureRoundHeaderText>
  </FixtureRoundHeaderContainer>
);

export const FixturesDisplay = ({
  fixtures,
  tournamentType,
  currentUser,
  tournamentName,
  tournamentId,
}) => {
  const navigation = useNavigation();
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [localFixtures, setLocalFixtures] = useState(fixtures);

  useEffect(() => {
    setLocalFixtures(fixtures);
  }, [fixtures]);

  const handleGamePress = (game) => {
    if (game.result) {
      navigation.navigate("GameScreen", {
        gameId: game.gameId,
        competitionId: tournamentId,
        competitionType: COMPETITION_TYPES.TOURNAMENT,
        competitionName: tournamentName,
        gamescore: game.gamescore,
        date: game.date ?? "",
        team1: game.team1,
        team2: game.team2,
      });
      return;
    }

    setSelectedGame(game);
    setGameModalVisible(true);
  };

  const handleGameUpdated = (updatedGame) => {
    setLocalFixtures((prevFixtures) =>
      prevFixtures.map((round) => ({
        ...round,
        games: round.games.map((game) =>
          game.gameId === updatedGame.gameId ? updatedGame : game,
        ),
      })),
    );
  };

  if (!localFixtures?.length) {
    return (
      <NoFixturesContainer>
        <NoFixturesText>No fixtures available</NoFixturesText>
      </NoFixturesContainer>
    );
  }

  return (
    <FixturesContainer>
      {localFixtures.map((round) => (
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
        onGameUpdated={handleGameUpdated}
      />
    </FixturesContainer>
  );
};

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
  justifyContent: "center",
  alignItems: "center",
  padding: 10,
  minWidth: 100,
});

const FixtureScoreContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
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

const FixtureGameContainer = styled.TouchableOpacity({
  marginHorizontal: 20,
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  borderRadius: 8,
  backgroundColor: "rgb(3, 16, 31)",
  overflow: "hidden",
});

export const FixtureStatusLabel = styled.Text(({ status }) => ({
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

const VideoIndicator = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 3,
  marginTop: 8,
});

const VideoIndicatorText = styled.Text({
  fontSize: 9,
  color: "rgba(255,255,255,0.6)",
});

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
