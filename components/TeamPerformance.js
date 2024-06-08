import React from "react";
import { View, Text } from "react-native";

const TeamPerformance = () => {
  return (
    <View>
      <Text>Team Performance</Text>
    </View>
  );
};

export default TeamPerformance;

// Hardcoded games
const initialGames = [
  {
    date: "2024-06-01",
    team1: { player1: "Person A", player2: "Person B", score: 21 },
    team2: { player1: "Person B", player2: "Person C", score: 19 },
    get winner() {
      return calculateWin(this.team1.score, this.team2.score);
    },
  },
  {
    date: "2024-06-02",
    team1: { player1: "Person D", player2: "Person E", score: 22 },
    team2: { player1: "Person F", player2: "Person G", score: 20 },
    get winner() {
      return calculateWin(this.team1.score, this.team2.score);
    },
  },
  {
    date: "2024-06-03",
    team1: { player1: "Person H", player2: "Person I", score: 30 },
    team2: { player1: "Person J", player2: "Person K", score: 28 },
    get winner() {
      return calculateWin(this.team1.score, this.team2.score);
    },
  },
  {
    date: "2024-06-04",
    team1: { player1: "Person L", player2: "Person M", score: 21 },
    team2: { player1: "Person N", player2: "Person O", score: 23 },
    get winner() {
      return calculateWin(this.team1.score, this.team2.score);
    },
  },
  {
    date: "2024-06-05",
    team1: { player1: "Person P", player2: "Person Q", score: 19 },
    team2: { player1: "Person R", player2: "Person S", score: 21 },
    get winner() {
      return calculateWin(this.team1.score, this.team2.score);
    },
  },
  {
    date: "2024-06-06",
    team1: { player1: "Person T", player2: "Person U", score: 25 },
    team2: { player1: "Person V", player2: "Person W", score: 27 },
    get winner() {
      return calculateWin(this.team1.score, this.team2.score);
    },
  },
];
