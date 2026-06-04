import React, { useEffect } from "react";
import { Text, Dimensions } from "react-native";
import styled from "styled-components/native";
import SelectPlayer from "./SelectPlayer";
import moment from "moment";
import Tag from "../../Tag";
import { FixtureStatusLabel } from "../../Tournaments/Fixtures/FixturesAtoms";
import { Player } from "@shared/types";
import {
  formatScoreDigits,
  deriveScoresFromInput,
  formatScoresToInput,
} from "../../../helpers/scoreInputHelpers";

const { width: screenWidth } = Dimensions.get("window");

interface SelectedPlayers {
  [key: string]: (Player | null)[];
  team1: (Player | null)[];
  team2: (Player | null)[];
}

interface PresetPlayers {
  team1?: {
    player1?: Player;
    player2?: Player;
  };
  team2?: {
    player1?: Player;
    player2?: Player;
  };
}

interface AddGameDetailsProps {
  team1Score: string;
  setTeam1Score: (score: string) => void;
  team2Score: string;
  setTeam2Score: (score: string) => void;
  selectedPlayers: SelectedPlayers;
  setSelectedPlayers: React.Dispatch<React.SetStateAction<SelectedPlayers>>;
  leagueType: string;
  isReadOnly?: boolean;
  presetPlayers?: PresetPlayers | null;
  gameNumber?: number | null;
  court?: number | null;
  approvalStatus?: string | null;
}

const AddGameDetails: React.FC<AddGameDetailsProps> = ({
  team1Score,
  setTeam1Score,
  team2Score,
  setTeam2Score,
  selectedPlayers,
  setSelectedPlayers,
  leagueType,
  isReadOnly = false,
  presetPlayers = null,
  gameNumber = null,
  court = null,
  approvalStatus = null,
}) => {
  const [scoreInput, setScoreInput] = React.useState(() =>
    formatScoresToInput({ team1Score, team2Score }),
  );

  useEffect(() => {
    const derivedScores = deriveScoresFromInput(scoreInput);

    if (
      derivedScores.team1Score !== team1Score ||
      derivedScores.team2Score !== team2Score
    ) {
      setScoreInput(formatScoresToInput({ team1Score, team2Score }));
    }
  }, [team1Score, team2Score]);

  const handleScoreInputChange = (incomingValue: string) => {
    const isDeleting = incomingValue.length < scoreInput.length;
    let digits = incomingValue.replace(/[^0-9]/g, "").slice(0, 4);

    if (isDeleting && digits.length === 2 && !incomingValue.endsWith("-")) {
      digits = digits.slice(0, 1);
    }

    const formattedValue = formatScoreDigits(digits);
    const { team1Score: nextTeam1Score, team2Score: nextTeam2Score } =
      deriveScoresFromInput(formattedValue);

    setScoreInput(formattedValue);
    setTeam1Score(nextTeam1Score);
    setTeam2Score(nextTeam2Score);
  };

  const handleSelectPlayer = (
    team: "team1" | "team2",
    index: number,
    player: Player | null,
  ) => {
    setSelectedPlayers((prev) => {
      const newTeam = [...prev[team]];
      newTeam[index] = player;

      return {
        ...prev,
        [team]: newTeam,
      };
    });
  };

  const statusLabel =
    approvalStatus === "Scheduled"
      ? "Scheduled"
      : approvalStatus === "pending" || approvalStatus === "Pending"
        ? "Pending Approval"
        : null;

  return (
    <GameContainer>
      {gameNumber && court && (
        <FixtureGameHeaderContainer>
          <Tag name={`Game ${gameNumber}`} bold color="#00A2FF" />
          <Text style={{ color: "white", fontSize: 12 }}>
            {moment().format("DD-MM-YYYY")}
          </Text>
          <Tag name={`Court ${court}`} bold color="#005322ff" />
        </FixtureGameHeaderContainer>
      )}
      <GameContentContainer>
        <TeamContainer>
          <SelectPlayer
            onSelectPlayer={
              isReadOnly
                ? () => {}
                : (player: Player | null) =>
                    handleSelectPlayer("team1", 0, player)
            }
            selectedPlayers={selectedPlayers}
            borderType={leagueType === "Singles" ? "none" : "topLeft"}
            team="team1"
            index={0}
            readonly={isReadOnly}
            presetPlayer={
              isReadOnly ? (presetPlayers?.team1?.player1 ?? null) : null
            }
          />
          {leagueType === "Doubles" && (
            <SelectPlayer
              onSelectPlayer={
                isReadOnly
                  ? () => {}
                  : (player: Player | null) =>
                      handleSelectPlayer("team1", 1, player)
              }
              selectedPlayers={selectedPlayers}
              borderType="bottomLeft"
              team="team1"
              index={1}
              readonly={isReadOnly}
              presetPlayer={
                isReadOnly ? (presetPlayers?.team1?.player2 ?? null) : null
              }
            />
          )}
        </TeamContainer>

        <ResultsContainer>
          <ScoreContainer>
            <ScoreInput
              keyboardType="number-pad"
              placeholder="00-00"
              placeholderSize={20}
              placeholderTextColor="#1d3a5f"
              value={scoreInput}
              onChangeText={handleScoreInputChange}
              maxLength={5}
            />
          </ScoreContainer>
        </ResultsContainer>

        <TeamContainer>
          <SelectPlayer
            onSelectPlayer={
              isReadOnly
                ? () => {}
                : (player: Player | null) =>
                    handleSelectPlayer("team2", 0, player)
            }
            selectedPlayers={selectedPlayers}
            borderType={leagueType === "Singles" ? "none" : "topRight"}
            team="team2"
            index={0}
            readonly={isReadOnly}
            presetPlayer={
              isReadOnly ? (presetPlayers?.team2?.player1 ?? null) : null
            }
          />
          {leagueType === "Doubles" && (
            <SelectPlayer
              onSelectPlayer={
                isReadOnly
                  ? () => {}
                  : (player: Player | null) =>
                      handleSelectPlayer("team2", 1, player)
              }
              selectedPlayers={selectedPlayers}
              borderType="bottomRight"
              team="team2"
              index={1}
              readonly={isReadOnly}
              presetPlayer={
                isReadOnly ? (presetPlayers?.team2?.player2 ?? null) : null
              }
            />
          )}
        </TeamContainer>
      </GameContentContainer>
      {statusLabel && (
        <FixtureGameFooterContainer>
          <FixtureStatusLabel status={approvalStatus}>
            {statusLabel}
          </FixtureStatusLabel>
        </FixtureGameFooterContainer>
      )}
    </GameContainer>
  );
};

const GameContainer = styled.View({
  flexDirection: "column",
  justifyContent: "space-between",
  marginBottom: 16,
  marginTop: 40,
  borderRadius: 8,
  height: "auto",
  borderWidth: 1,
  borderColor: "#262626",
  backgroundColor: "#001123",
});

const GameContentContainer = styled.View({
  flexDirection: "row",
});

const TeamContainer = styled.View({
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  borderRadius: 8,
});

const ResultsContainer = styled.View({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
  paddingBottom: 30,
  width: screenWidth <= 400 ? 110 : 140,
});

const ScoreContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  marginTop: 30,
});

const ScoreInput = styled.TextInput({
  fontSize: 25,
  fontWeight: "bold",
  textAlign: "center",
  letterSpacing: 2,
  width: "100%",
  color: "#00A2FF",
});

const FixtureGameHeaderContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 12,
});

const FixtureGameFooterContainer = styled.View({
  flexDirection: "row",
  justifyContent: "center",
  alignItems: "center",
  paddingBottom: 12,
});

export default AddGameDetails;
