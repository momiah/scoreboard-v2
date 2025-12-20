import React from "react";
import { Dimensions, ActivityIndicator } from "react-native";

import { TeamColumn } from "../../scoreboard/ScoreboardAtoms";
import styled from "styled-components/native";

import Tag from "../../Tag";

const { width: screenWidth } = Dimensions.get("window");

export const GeneratedFixturesScreen = ({
  generatedFixtures,
  tournamentType,
  onBack,
  onGenerateTournament,
  isGenerating,
}) => (
  <>
    <ModalTitle>Generated Fixtures</ModalTitle>

    <FixturesContainer>
      {generatedFixtures?.fixtures?.map((round, roundIndex) => (
        <RoundContainer key={`round_${round.round}`}>
          <TitleContainer>
            <RoundTitle>ROUND {round.round}</RoundTitle>
          </TitleContainer>

          {round.games.map((game, gameIndex) => (
            <GameCard key={game.gameId}>
              <GameHeader>
                <Tag name={`Game ${game.gameNumber}`} bold color="#00A2FF" />
                <Tag name={`Court ${game.court}`} bold />
              </GameHeader>

              <TeamVsContainer>
                <TeamColumn
                  team="left"
                  players={{
                    player1: game.team1.player1,
                    player2: game.team1.player2,
                  }}
                  leagueType={tournamentType}
                />

                <VsText>VS</VsText>

                <TeamColumn
                  team="right"
                  players={{
                    player1: game.team2.player1,
                    player2: game.team2.player2,
                  }}
                  leagueType={tournamentType}
                />
              </TeamVsContainer>
            </GameCard>
          ))}
        </RoundContainer>
      ))}
    </FixturesContainer>

    <ButtonContainer>
      <BackButton onPress={onBack}>
        <BackText>Back</BackText>
      </BackButton>
      <ConfirmButton onPress={onGenerateTournament} disabled={isGenerating}>
        {isGenerating && <ActivityIndicator size="small" color="#fff" />}
        <ConfirmText>Confirm</ConfirmText>
      </ConfirmButton>
    </ButtonContainer>
  </>
);

const ModalTitle = styled.Text({
  fontSize: 20,
  color: "#fff",
  fontWeight: "bold",
  marginBottom: 20,
  textAlign: "center",
});

const FixturesContainer = styled.ScrollView({
  maxHeight: screenWidth <= 405 ? 400 : 600,
});

const RoundContainer = styled.View({
  marginBottom: 20,
});

const TitleContainer = styled.View({
  borderRadius: 5,
  paddingHorizontal: 16,
  backgroundColor: "#1d1d1dff",
  borderColor: "#444444ff",
  borderWidth: 1,
  marginBottom: 12,
  paddingVertical: 8,
});

const RoundTitle = styled.Text({
  color: "#fff",
  fontSize: 12,
  fontWeight: "bold",
  textAlign: "start",
});

const GameCard = styled.View({
  backgroundColor: " rgb(3, 16, 31)",
  border: "1px solid rgb(9, 33, 62)",
  paddingHorizontal: 16,
  paddingTop: 12,
  borderRadius: 8,
  marginBottom: 10,
});

const GameHeader = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 12,
});

const TeamVsContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 8,
});

const VsText = styled.Text({
  color: "#fff",
  fontSize: 16,
  fontWeight: "bold",
  marginHorizontal: 16,
});

const ButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 20,
  gap: 12,
});

const BackButton = styled.TouchableOpacity({
  flex: 1,
  padding: 12,
  backgroundColor: "#666",
  borderRadius: 6,
  alignItems: "center",
});

const ConfirmButton = styled.TouchableOpacity(({ disabled }) => ({
  flex: 1,
  padding: 12,
  backgroundColor: disabled ? "#666" : "#00A2FF",
  borderRadius: 6,
  alignItems: "center",
  flexDirection: "row",
  justifyContent: "center",
  gap: 8,
}));

const BackText = styled.Text({
  color: "white",
  fontSize: 16,
  fontWeight: "500",
});

const ConfirmText = styled.Text({
  color: "white",
  fontWeight: "bold",
  fontSize: 16,
});
