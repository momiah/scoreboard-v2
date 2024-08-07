import React from "react";
import { View, Text, Modal } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import MedalDisplay from "../MedalDisplay";
import MedalProgress from "../MedalProgress";
import { medalNames } from "../../../functions/medalNames";
import MatchMedals from "../MatchMedals";
import AnimateNumber from "../AnimateNumber";
import { transformDate } from "../../../functions/dateTransform";
import { Dimensions } from "react-native";

// Function to calculate the current streak
const currentStreak = (resultLog) => {
  if (resultLog.length === 0) return 0;

  let currentStreakCount = 1;
  let streakType = resultLog[resultLog.length - 1]; // Get the most recent result

  for (let i = resultLog.length - 2; i >= 0; i--) {
    if (resultLog[i] === streakType) {
      currentStreakCount++;
    } else {
      break;
    }
  }

  return streakType === "W" ? currentStreakCount : -currentStreakCount;
};

const { width: screenWidth } = Dimensions.get("window");
const screenAdjustedStatFontSize = screenWidth <= 400 ? 20 : 25;
const screenAdjustedMedalSize = screenWidth <= 400 ? 50 : 70;

const PlayerDetails = ({
  showPlayerDetails,
  setShowPlayerDetails,
  playerStats,
  playerName,
  memberSince,
}) => {
  const winRatio = playerStats.numberOfWins / playerStats.numberOfLosses;

  const currentStreakValue = currentStreak(playerStats.resultLog);

  const statData = [
    {
      statTitle: "Wins",
      stat: (
        <AnimateNumber
          number={playerStats.numberOfWins}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
    {
      statTitle: "Losses",
      stat: (
        <AnimateNumber
          number={playerStats.numberOfLosses}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
    {
      statTitle: "Win Ratio",
      stat: <Stat>{winRatio.toFixed(2)}</Stat>,
    },
    {
      statTitle: "Point Efficiency",
      stat: (
        <AnimateNumber
          number={`${playerStats.pointEfficiency.toFixed(1)}%`}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
    {
      statTitle: "Current Streak",
      stat: (
        <AnimateNumber
          number={currentStreakValue}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
    {
      statTitle: "Highest Streak",
      stat: (
        <AnimateNumber
          number={playerStats.highestWinStreak}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
  ];

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
                <Text
                  style={{
                    color: "#aaa",
                  }}
                >
                  Member since {memberSince}
                </Text>
                <Text
                  style={{
                    color: "#aaa",
                  }}
                >
                  Last Active {transformDate(playerStats.lastActive)}
                </Text>
              </View>

              <MedalContainer>
                <MedalDisplay
                  xp={playerStats.XP + playerStats.totalPoints}
                  size={screenAdjustedMedalSize}
                />
                <Text style={{ color: "white", marginTop: 10 }}>
                  {medalNames(playerStats.XP + playerStats.totalPoints)}
                </Text>
              </MedalContainer>
            </PlayerDetail>
            <MedalProgress xp={playerStats.XP + playerStats.totalPoints} />
            <MatchMedals
              demonWin={playerStats.demonWin}
              winStreak3={playerStats.winStreak3}
              winStreak5={playerStats.winStreak5}
              winStreak7={playerStats.winStreak7}
            />
            {/* Player Stats */}
            <PlayerStat>
              {statData.map((data, index) => {
                return (
                  <TableCell key={index}>
                    <StatTitle>{data.statTitle}</StatTitle>
                    {data.stat}
                  </TableCell>
                );
              })}
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
  paddingTop: screenWidth <= 400 ? 15 : 20,
  paddingBottom: screenWidth <= 400 ? 15 : 20,
  borderTopWidth: 1,
  borderColor: "#262626",
});

const StatTitle = styled.Text({
  fontSize: screenWidth <= 400 ? 12 : 14,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: screenAdjustedStatFontSize,
  fontWeight: "bold",
  color: "white",
});

export default PlayerDetails;
