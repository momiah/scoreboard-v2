import React from "react";
import { View, Text, Modal } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import MedalDisplay from "./MedalDisplay";
import MedalProgress from "./MedalProgress";
import { medalNames } from "../../functions/medalNames";

const PlayerDetails = ({
  showPlayerDetails,
  setShowPlayerDetails,
  playerStats,
  playerName,
}) => {
  const winRatio = playerStats.numberOfWins / playerStats.numberOfLosses;
  return (
    <View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={showPlayerDetails}
      >
        <ModalContainer>
          <ModalContent>
            <CloseIconContainer>
              <AntDesign
                onPress={() => setShowPlayerDetails(false)}
                name="closecircleo"
                size={20}
                color="red"
              />
            </CloseIconContainer>

            <PlayerDetail>
              <View>
                <PlayerName>{playerName}</PlayerName>
                <Text style={{ color: "white" }}>Member since 2024</Text>
              </View>

              <MedalContainer>
                <MedalDisplay
                  xp={playerStats.XP + playerStats.totalPoints}
                  size={70}
                />
                <Text style={{ color: "white", marginTop: 10 }}>
                  {medalNames(playerStats.XP + playerStats.totalPoints)}
                </Text>
              </MedalContainer>
            </PlayerDetail>
            <MedalProgress xp={playerStats.XP + playerStats.totalPoints} />
            {/* Player Stats */}
            <PlayerStat>
              <TableCell>
                <StatTitle>Wins</StatTitle>
                <Stat>{playerStats.numberOfWins}</Stat>
              </TableCell>
              <TableCell>
                <StatTitle>Losses</StatTitle>
                <Stat>{playerStats.numberOfLosses}</Stat>
              </TableCell>
              <TableCell>
                <StatTitle>Win Ratio</StatTitle>
                <Stat>{winRatio.toFixed(1)}</Stat>
              </TableCell>
              <TableCell>
                <StatTitle>Point Efficiency</StatTitle>
                <Stat>80%</Stat>
              </TableCell>
              <TableCell>
                <StatTitle>Current Streak</StatTitle>
                <Stat>{playerStats.numberOfWins}</Stat>
              </TableCell>
              <TableCell>
                <StatTitle>Highest Streak</StatTitle>
                <Stat>{playerStats.numberOfWins}</Stat>
              </TableCell>
              <TableCell>
                <StatTitle>Best Partner</StatTitle>
                <Stat>Saiful</Stat>
              </TableCell>
              <TableCell>
                <StatTitle>Rival</StatTitle>
                <Stat>Mohsin</Stat>
              </TableCell>
            </PlayerStat>
          </ModalContent>
        </ModalContainer>
      </Modal>
    </View>
  );
};

const ModalContainer = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "rgba(0,0,0,0.5)",
});

const ModalContent = styled.View({
  backgroundColor: "#00152B",
  margin: 10,
  padding: 20,
  paddingLeft: 30,
  paddingRight: 30,
  borderRadius: 10,
});

const CloseIconContainer = styled.View({
  display: "flex",
  flexDirection: "row",
  justifyContent: "flex-end",
  padding: 5,
  marginBottom: 20,
});

const PlayerName = styled.Text({
  fontSize: 30,
  color: "white",
  fontWeight: "bold",
});

const PlayerStat = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
});

const PlayerDetail = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottomColor: "#262626",
  borderBottomWidth: 1,
  paddingBottom: 30,
});

const MedalContainer = styled.View({
  flexDirection: "column",
  alignItems: "center",
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

export default PlayerDetails;
