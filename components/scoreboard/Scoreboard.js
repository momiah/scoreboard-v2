import React, { useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
} from "react-native";
import styled from "styled-components/native";
import AddPlayer from "./AddPlayer";

// Define the calculateWin function
// const calculateWin = (teamAScore, teamBScore) => {
//   if (teamAScore >= 21 && (teamAScore - teamBScore >= 2 || teamAScore === 30)) {
//     return "Team 1";
//   }
//   if (teamBScore >= 21 && (teamBScore - teamAScore >= 2 || teamBScore === 30)) {
//     return "Team 2";
//   }
//   return "No winner";
// };

const players = {
  Mohsin: {
    wins: 0,
    losses: 0,
  },
  Yasin: {
    wins: 0,
    losses: 0,
  },
  Rayyan: {
    wins: 0,
    losses: 0,
  },
  Saiful: {
    wins: 0,
    losses: 0,
  },
  Raqeeb: {
    wins: 0,
    losses: 0,
  },
};

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

const calculateWin = (score1, score2) => {
  return score1 > score2 ? "Team 1" : "Team 2";
};

// Define the Scoreboard component
const Scoreboard = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlayers, setSelectedPlayers] = useState({
    team1: ["", ""],
    team2: ["", ""],
  });
  const [team1Score, setTeam1Score] = useState("");
  const [team2Score, setTeam2Score] = useState("");
  const [initialGames, setInitialGames] = useState([
    {
      date: "2024-06-01",
      team1: { player1: "Person A", player2: "Person B", score: 21 },
      team2: { player1: "Person B", player2: "Person C", score: 19 },
      get winner() {
        return calculateWin(this.team1.score, this.team2.score);
      },
    },
  ]);

  const handleSelectPlayer = (team, index, player) => {
    setSelectedPlayers((prev) => {
      const newTeam = [...prev[team]];
      newTeam[index] = player;
      return { ...prev, [team]: newTeam };
    });
  };

  const handleAddGame = () => {
    const newGame = {
      date: 0,
      team1: {
        player1: selectedPlayers.team1[0],
        player2: selectedPlayers.team1[1],
        score: parseInt(team1Score) || 0,
      },
      team2: {
        player1: selectedPlayers.team2[0],
        player2: selectedPlayers.team2[1],
        score: parseInt(team2Score) || 0,
      },
      get winner() {
        return calculateWin(this.team1.score, this.team2.score);
      },
    };

    setInitialGames((prevGames) => [...prevGames, newGame]);
    console.log(newGame);
    // Reset states
    setSelectedPlayers({ team1: ["", ""], team2: ["", ""] });
    setTeam1Score("");
    setTeam2Score("");
    setModalVisible(false);
  };

  return (
    <Container>
      <AddGameButton onPress={() => setModalVisible(true)}>
        <Text>Add Game</Text>
      </AddGameButton>

      <FlatList
        data={initialGames}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => (
          <GameContainer>
            <TeamContainer>
              <Team>{item.team1.player1}</Team>
              <Team>{item.team1.player2}</Team>
            </TeamContainer>

            <ResultsContainer>
              <Date>{item.date}</Date>
              <ScoreContainer>
                <Score>{item.team1.score} - </Score>
                <Score>{item.team2.score}</Score>
              </ScoreContainer>
            </ResultsContainer>

            <TeamContainer>
              <Team>{item.team2.player1}</Team>
              <Team>{item.team2.player2}</Team>
            </TeamContainer>
          </GameContainer>
        )}
      />

      {modalVisible && (
        <View>
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <ModalContainer style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <ModalContent>
                <GameContainer>
                  <TeamContainer>
                    <AddPlayer
                      onSelectPlayer={(player) =>
                        handleSelectPlayer("team1", 0, player)
                      }
                    />
                    <AddPlayer
                      onSelectPlayer={(player) =>
                        handleSelectPlayer("team1", 1, player)
                      }
                    />
                  </TeamContainer>

                  <ResultsContainer>
                    <Date>4</Date>
                    <ScoreContainer>
                      <ScoreInput
                        keyboardType="numeric"
                        placeholder="0"
                        value={team1Score | 0}
                        onChangeText={setTeam1Score}
                      />
                      <Text style={{ fontSize: 30 }}>-</Text>
                      <ScoreInput
                        keyboardType="numeric"
                        placeholder="0"
                        value={team2Score | 0}
                        onChangeText={setTeam2Score}
                      />
                    </ScoreContainer>
                  </ResultsContainer>

                  <TeamContainer>
                    <AddPlayer
                      onSelectPlayer={(player) =>
                        handleSelectPlayer("team2", 0, player)
                      }
                    />
                    <AddPlayer
                      onSelectPlayer={(player) =>
                        handleSelectPlayer("team2", 1, player)
                      }
                    />
                  </TeamContainer>

                  <ScoreContainer></ScoreContainer>
                </GameContainer>

                <ButtonContainer>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Text style={styles.button}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleAddGame}>
                    <Text style={styles.button}>Submit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => console.log("Register Player")}
                  >
                    <Text style={styles.button}>Register Player</Text>
                  </TouchableOpacity>
                </ButtonContainer>
              </ModalContent>
            </ModalContainer>
          </Modal>
        </View>
      )}
    </Container>
  );
};

// Define styles
const Container = styled.View({
  flex: 1,
  padding: 5,
  backgroundColor: "#fff",
});

const AddGameButton = styled.TouchableOpacity({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  fontSize: 24,
  fontWeight: "bold",
  marginBottom: 15,
  marginTop: 15,
  padding: 10,
  backgroundColor: "#BBDCFF",
  border: "1px solid #ccc",
});

const GameContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 16,
  borderWidth: 1,
  borderColor: "#ccc",
  borderRadius: 8,
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
});

const ScoreContainer = styled.View({
  display: "flex",
  flexDirection: "row",
});

const Score = styled.Text({
  fontSize: 30,
  fontWeight: "bold",
});
const ScoreInput = styled.TextInput({
  fontSize: 30,
  fontWeight: "bold",
  margin: "0 5px",
  textAlign: "center",
});

const Date = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
});

const Team = styled.Text({
  display: "flex",
  border: "1px solid #ccc",
  flexDirection: "column",
  fontSize: 16,
  padding: 15,
  paddingLeft: 30,
  paddingRight: 30,
  borderRadius: 20,
});

const ModalContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "white",
});

const ModalContent = styled.View({
  backgroundColor: "#fff",
  padding: 20,
  borderRadius: 10,
  // shadowColor: "#000",
  // shadowOffset: { width: 0, height: 2 },
  // shadowOpacity: 0.8,
  // shadowRadius: 2,
  // elevation: 5,
});

const ButtonContainer = styled.View({
  flexDirection: "row",
  justifyContent: "space-around",
  marginTop: 20,
});

const styles = StyleSheet.create({
  button: {
    padding: 10,
    backgroundColor: "#BBDCFF",
    borderRadius: 5,
  },
});

export default Scoreboard;
