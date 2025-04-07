import React, { useContext } from "react";
import { View, Text, Modal, TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import MedalDisplay from "../performance/MedalDisplay";
import MedalProgress from "../performance/MedalProgress";
import MatchMedals from "../performance/MatchMedals";
import AnimateNumber from "../performance/AnimateNumber";
import { Dimensions } from "react-native";
import ResultLog from "../performance/ResultLog";
import { GameContext } from "../../context/GameContext";
import { BlurView } from "expo-blur";
import { useNavigation } from "@react-navigation/native";
import PerformanceStats from "../performance/PerformanceStats";

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
const screenAdjustedMedalSize = screenWidth <= 400 ? 60 : 70;

const PlayerDetails = ({
  showPlayerDetails,
  setShowPlayerDetails,
  selectedPlayer,
}) => {
  const navigation = useNavigation();
  const { medalNames } = useContext(GameContext);
  const winRatio = selectedPlayer.numberOfWins / selectedPlayer.numberOfLosses;

  const currentStreakValue = currentStreak(selectedPlayer.resultLog);

  const statData = [
    {
      statTitle: "Wins",
      stat: (
        <AnimateNumber
          number={selectedPlayer.numberOfWins}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
    {
      statTitle: "Losses",
      stat: (
        <AnimateNumber
          number={selectedPlayer.numberOfLosses}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
    {
      statTitle: "Win Ratio",
      stat: <Stat>{isNaN(winRatio) ? 0 : winRatio.toFixed(2)}</Stat>,
    },
    {
      statTitle: "Avg Point Difference",
      stat: (
        <AnimateNumber
          number={selectedPlayer.averagePointDifference?.toFixed(0) || 0}
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
          number={selectedPlayer.highestWinStreak}
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
                <PlayerName>{selectedPlayer.username}</PlayerName>
                <Text
                  style={{
                    color: "#aaa",
                    fontSize: screenWidth <= 400 ? 12 : 14,
                  }}
                >
                  Member since {selectedPlayer.memberSince}
                </Text>
                <Text
                  style={{
                    color: "#aaa",
                    fontSize: screenWidth <= 400 ? 12 : 14,
                  }}
                >
                  Last Active {selectedPlayer.lastActive}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowPlayerDetails(false); // Close the modal
                    // Navigate to the Profile tab, passing the selected user's ID
                    navigation.navigate("UserProfile", {
                      userId: selectedPlayer.userId,
                    });
                  }}
                >
                  <Text
                    style={{
                      color: "white",
                      fontSize: screenWidth <= 400 ? 12 : 14,
                      marginTop: 15,
                      fontWeight: "bold",
                      backgroundColor: "#00A2FF",
                      padding: 5,
                      borderRadius: 5,
                      alignSelf: "flex-start",
                    }}
                  >
                    Go to profile
                  </Text>
                </TouchableOpacity>
              </View>

              <MedalContainer>
                <MedalDisplay
                  xp={selectedPlayer.XP}
                  size={screenAdjustedMedalSize}
                />
                <Text style={{ color: "white", marginTop: 10, fontSize: 12 }}>
                  {medalNames(selectedPlayer.XP)}
                </Text>
              </MedalContainer>
            </PlayerDetail>
            <MedalProgress
              xp={selectedPlayer.XP}
              prevGameXp={selectedPlayer.prevGameXP}
            />
            <Divider />
            <ResultLog resultLog={selectedPlayer.resultLog} />
            <MatchMedals
              demonWin={selectedPlayer.demonWin}
              winStreak3={selectedPlayer.winStreak3}
              winStreak5={selectedPlayer.winStreak5}
              winStreak7={selectedPlayer.winStreak7}
            />

            <PerformanceStats
              statData={statData}
              selectedPlayer={selectedPlayer}
            />
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
