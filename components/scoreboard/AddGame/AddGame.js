import React from "react";
import { View, Text, Dimensions } from "react-native";
import styled from "styled-components/native";
import SelectPlayer from "./SelectPlayer";
import moment from "moment";

const AddGame = ({
  team1Score,
  setTeam1Score,
  team2Score,
  setTeam2Score,
  selectedPlayers,
  handleSelectPlayer,
}) => {
  const handleScoreChange = (setScore) => (text) => {
    const numericText = text.replace(/[^0-9]/g, "");
    if (numericText.length <= 2) {
      setScore(numericText);
    }
  };

  return (
    <GameContainer>
      <TeamContainer>
        <SelectPlayer
          onSelectPlayer={(player) => handleSelectPlayer("team1", 0, player)}
          selectedPlayers={selectedPlayers}
          borderType={"topLeft"}
        />
        <SelectPlayer
          onSelectPlayer={(player) => handleSelectPlayer("team1", 1, player)}
          selectedPlayers={selectedPlayers}
          borderType={"bottomLeft"}
        />
      </TeamContainer>

      <ResultsContainer>
        <Text style={{ color: "white" }}>{moment().format("DD-MM-YYYY")}</Text>
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
          onSelectPlayer={(player) => handleSelectPlayer("team2", 0, player)}
          selectedPlayers={selectedPlayers}
          borderType={"topRight"}
        />
        <SelectPlayer
          onSelectPlayer={(player) => handleSelectPlayer("team2", 1, player)}
          selectedPlayers={selectedPlayers}
          borderType={"bottomRight"}
        />
      </TeamContainer>
    </GameContainer>
  );
};

const screenWidth = Dimensions.get("window").width;

const GameContainer = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 16px;
  margin-top: 40px;
  border: 1px solid #262626;
  border-radius: 8px;
  height: ${screenWidth <= 400 ? "100px" : "auto"};
  background-color: #001123;
`;

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

const ScoreContainer = styled.View`
  display: flex;
  flex-direction: row;
  justify-content: center;
  margin-top: ${screenWidth <= 400 ? "20px" : "0"};
`;

const ScoreInput = styled.TextInput({
  fontSize: 25,
  fontWeight: "bold",
  margin: "0 5px",
  textAlign: "center",
  color: "#00A2FF",
});

export default AddGame;
