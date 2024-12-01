import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import styled from "styled-components/native";

const GameItem = ({ game }) => (
  <GameContainer>
    <TeamContainer>
      <TeamText>{game.team1.player1}</TeamText>
      <TeamText>{game.team1.player2}</TeamText>
    </TeamContainer>
    <Score>{game.gamescore}</Score>
    <TeamContainer>
      <TeamText>{game.team2.player1}</TeamText>
      <TeamText>{game.team2.player2}</TeamText>
    </TeamContainer>
  </GameContainer>
);

export default GameItem;

const GameContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 8px;
  margin-bottom: 8px;
`;

const TeamContainer = styled.View`
  flex-direction: column;
`;

const TeamText = styled.Text`
  font-size: 16px;
`;

const Score = styled.Text`
  font-size: 20px;
  font-weight: bold;
  color: #00a2ff;
`;
