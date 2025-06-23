import styled from "styled-components/native";
import { Dimensions } from "react-native";

const { width: screenWidth } = Dimensions.get("window");

export const PlayerCell = ({ position, player }) => (
  <TeamTextContainer position={position}>
    <TeamText position={position}>{player}</TeamText>
  </TeamTextContainer>
);

export const TeamColumn = ({ team, players = {}, leagueType }) => (
  <TeamContainer>
    <PlayerCell position={team} player={players?.player1} />
    {leagueType === "Doubles" && (
      <PlayerCell position={team} player={players?.player2} />
    )}
  </TeamContainer>
);


export const ScoreDisplay = ({ date, team1, team2, item }) => {
  const isPending = item.approvalStatus === "pending";
  return (
    <ResultsContainer style={!isPending ? { paddingBottom: 20 } : undefined}>
      <DateText>{date}</DateText>
      <ScoreContainer>
        <Score>
          {team1} - {team2}
        </Score>
      </ScoreContainer>
      {isPending && <PendingLabel>Pending Approval</PendingLabel>}
    </ResultsContainer>
  );
};


const PendingLabel = styled.Text({
  paddingHorizontal: 6,
  paddingVertical: 2,
  marginTop: 10,
  fontSize: 9,
  color: "white",
  backgroundColor: "rgba(255, 0, 0, 0.6)",
  borderRadius: 4,
  overflow: "hidden",
});
const ResultsContainer = styled.View({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 10,
});
const Score = styled.Text({
  fontSize: 28,
  fontWeight: "bold",
  color: "#00A2FF",
});
const ScoreContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "center",
  marginTop: screenWidth <= 400 ? 20 : null,
});
const TeamText = styled.Text({
  color: "white",
  fontSize: screenWidth <= 400 ? 15 : 16,
  textAlign: (props) => (props.position === "right" ? "right" : "left"),
});
const TeamContainer = styled.View({
  display: "flex",
  justifyContent: "center",
  flexDirection: "column",
  borderRadius: 8,
});
const TeamTextContainer = styled.View({
  display: "flex",
  flexDirection: "column",
  padding: 15,
  paddingLeft: 20,
  paddingRight: 20,
  width: screenWidth <= 400 ? 125 : 140,
});

const DateText = styled.Text({
  fontSize: 10,
  fontWeight: "bold",
  color: "white",
  marginBottom: screenWidth <= 400 ? 0 : 15,
});