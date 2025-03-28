import React from "react";
import { View, Text, Modal } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import MatchMedals from "../performance/MatchMedals";
import AnimateNumber from "../performance/AnimateNumber";
import ResultLog from "../performance/ResultLog";

const TeamDetails = ({ showTeamDetails, setShowTeamDetails, teamStats }) => {
  const winRatio = teamStats.numberOfWins / teamStats.numberOfLosses;

  const statData = [
    {
      statTitle: "Wins",
      stat: <AnimateNumber number={teamStats.numberOfWins} fontSize={25} />,
    },
    {
      statTitle: "Losses",
      stat: <AnimateNumber number={teamStats.numberOfLosses} fontSize={25} />,
    },
    {
      statTitle: "Win Ratio",
      stat: <Stat>{winRatio.toFixed(2)}</Stat>,
    },
    {
      // Need to find the average point difference of the last 10 games
      statTitle: "Avg Point Difference",
      stat: (
        <AnimateNumber
          number={teamStats.averagePointDifference.toFixed(0)}
          fontSize={25}
        />
      ),
    },
    {
      statTitle: "Current Streak",
      stat: <AnimateNumber number={teamStats.currentStreak} fontSize={25} />,
    },
    {
      statTitle: "Highest Streak",
      stat: <AnimateNumber number={teamStats.highestWinStreak} fontSize={25} />,
    },
  ];

  return (
    <View>
      <Modal animationType="slide" transparent={true} visible={showTeamDetails}>
        <ModalContainer>
          <ModalContent>
            <CloseIconContainer>
              <AntDesign
                onPress={() => setShowTeamDetails(false)}
                name="closecircleo"
                size={20}
                color="red"
              />
            </CloseIconContainer>

            <TeamDetail>
              <View>
                <StatTitle>Team</StatTitle>
                <PlayerName>{teamStats.team[0]}</PlayerName>
                <PlayerName>{teamStats.team[1]}</PlayerName>
              </View>

              <RivalContainer>
                {teamStats.rival?.rivalPlayers ? (
                  <>
                    <StatTitle>Rival</StatTitle>
                    <PlayerName>{teamStats.rival.rivalPlayers[0]}</PlayerName>
                    <PlayerName>{teamStats.rival.rivalPlayers[1]}</PlayerName>
                  </>
                ) : null}
              </RivalContainer>
            </TeamDetail>
            <Divider />
            <ResultLog resultLog={teamStats.resultLog} />
            <MatchMedals
              demonWin={teamStats.demonWin}
              winStreak3={teamStats.winStreak3}
              winStreak5={teamStats.winStreak5}
              winStreak7={teamStats.winStreak7}
            />

            {/* Player Stats */}
            <TeamStat>
              {statData.map((data, index) => {
                return (
                  <TableCell key={index}>
                    <StatTitle>{data.statTitle}</StatTitle>
                    {data.stat}
                  </TableCell>
                );
              })}
            </TeamStat>
          </ModalContent>
        </ModalContainer>
      </Modal>
    </View>
  );
};

const Divider = styled.View({
  borderBottomColor: "#262626",
  borderBottomWidth: 1,
});

const ModalContainer = styled(BlurView).attrs({
  intensity: 80,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const ModalContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 0.7)", // Translucent dark blue
  margin: 10,
  padding: 20,
  paddingLeft: 25,
  paddingRight: 25,
  borderRadius: 20,
});

const CloseIconContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "flex-end",
  padding: 5,
  marginBottom: 20,
});

const PlayerName = styled.Text({
  fontSize: 25,
  color: "white",
  fontWeight: "bold",
});

const TeamStat = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
});

const TeamDetail = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottomColor: "#262626",
  borderBottomWidth: 1,
  paddingBottom: 30,
});

const RivalContainer = styled.View({
  flexDirection: "column",
  alignItems: "flex-end",
});

const TableCell = styled.View({
  width: "50%", // Adjust this to fit two cells per row
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 20,
  paddingBottom: 20,
  borderTopWidth: 1,
  borderColor: "#262626",
});

const StatTitle = styled.Text({
  fontSize: 14,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: 25,
  fontWeight: "bold",
  color: "white",
});

export default TeamDetails;
