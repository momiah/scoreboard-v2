import React from "react";
import { Text, Dimensions } from "react-native";
import styled from "styled-components/native";
import SelectPlayer from "./SelectPlayer";
import moment from "moment";

const AddGame = ({
  team1Score,
  setTeam1Score,
  team2Score,
  setTeam2Score,
  selectedPlayers,
  setSelectedPlayers,
  leagueType,
  isReadOnly = false,
  presetPlayers = null,
}) => {
  const handleScoreChange = (setScore) => (text) => {
    const numericText = text.replace(/[^0-9]/g, "");
    if (numericText.length <= 2) {
      setScore(numericText);
    }
  };

  const handleSelectPlayer = (team, index, player) => {
    setSelectedPlayers((prev) => {
      const newTeam = [...prev[team]];
      newTeam[index] = player;

      return {
        ...prev,
        [team]: newTeam,
      };
    });
  };

  return (
    <GameContainer>
      <TeamContainer>
        <SelectPlayer
          onSelectPlayer={
            isReadOnly
              ? () => {}
              : (player) => handleSelectPlayer("team1", 0, player)
          }
          selectedPlayers={selectedPlayers}
          borderType={leagueType === "Singles" ? "none" : "topLeft"}
          team="team1"
          index={0}
          readonly={isReadOnly}
          presetPlayer={isReadOnly ? presetPlayers?.team1?.player1 : null}
        />
        {leagueType === "Doubles" && (
          <SelectPlayer
            onSelectPlayer={
              isReadOnly
                ? () => {}
                : (player) => handleSelectPlayer("team1", 1, player)
            }
            selectedPlayers={selectedPlayers}
            borderType="bottomLeft"
            team="team1"
            index={1}
            readonly={isReadOnly}
            presetPlayer={isReadOnly ? presetPlayers?.team1?.player2 : null}
          />
        )}
      </TeamContainer>

      <ResultsContainer>
        <Text style={{ color: "white", fontSize: 12 }}>
          {moment().format("DD-MM-YYYY")}
        </Text>
        <ScoreContainer>
          <ScoreInput
            keyboardType="numeric"
            placeholder="0"
            value={team1Score}
            onChangeText={handleScoreChange(setTeam1Score)}
          />
          <Text style={{ fontSize: 30, color: "#00A2FF" }}>-</Text>
          <ScoreInput
            keyboardType="numeric"
            placeholder="0"
            value={team2Score}
            onChangeText={handleScoreChange(setTeam2Score)}
          />
        </ScoreContainer>
      </ResultsContainer>

      <TeamContainer>
        <SelectPlayer
          onSelectPlayer={
            isReadOnly
              ? () => {}
              : (player) => handleSelectPlayer("team2", 0, player)
          }
          selectedPlayers={selectedPlayers}
          borderType={leagueType === "Singles" ? "none" : "topRight"}
          team="team2"
          index={0}
          readonly={isReadOnly}
          presetPlayer={isReadOnly ? presetPlayers?.team2?.player1 : null}
        />
        {leagueType === "Doubles" && (
          <SelectPlayer
            onSelectPlayer={
              isReadOnly
                ? () => {}
                : (player) => handleSelectPlayer("team2", 1, player)
            }
            selectedPlayers={selectedPlayers}
            borderType="bottomRight"
            team="team2"
            index={1}
            readonly={isReadOnly}
            presetPlayer={isReadOnly ? presetPlayers?.team2?.player2 : null}
          />
        )}
      </TeamContainer>
    </GameContainer>
  );
};

const screenWidth = Dimensions.get("window").width;

const GameContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  marginTop: 40,
  borderWidth: 1,
  borderColor: "#262626",
  borderRadius: 8,
  height: screenWidth <= 400 ? 100 : "auto",
  backgroundColor: "#001123",
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
  width: screenWidth <= 450 ? 110 : 140,
});

const ScoreContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  marginTop: 20,
});

const ScoreInput = styled.TextInput({
  fontSize: 25,
  fontWeight: "bold",
  margin: "0 5px",
  textAlign: "center",
  color: "#00A2FF",
});

export default AddGame;
