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
import { PlatformBlurView as BlurView } from "../../components/PlatformBlurView";
import { useNavigation } from "@react-navigation/native";
import PerformanceStats from "../performance/PerformanceStats";
import { UserContext } from "../../context/UserContext";
import Tag from "../Tag";

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
const screenAdjustedStatFontSize = screenWidth <= 405 ? 20 : 25;
const screenAdjustedNameFontSize = screenWidth <= 405 ? 20 : 25;
const screenAdjustedDescriptionFontSize = screenWidth <= 405 ? 12 : 14;
const screenAdjustedMedalSize = screenWidth <= 405 ? 60 : 70;
const screenAdjustedPadding = screenWidth <= 405 ? 10 : 20;

const PlayerDetails = ({
  showPlayerDetails,
  setShowPlayerDetails,
  selectedPlayer,
}) => {
  const navigation = useNavigation();
  const { medalNames } = useContext(GameContext);
  const winRatio = selectedPlayer.numberOfWins / selectedPlayer.numberOfLosses;

  const { currentUser } = useContext(UserContext);

  const goToProfile = () => {
    setShowPlayerDetails(false);
    navigation.navigate("UserProfile", {
      userId: selectedPlayer.userId,
    });
  };

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
                    fontSize: screenAdjustedDescriptionFontSize
                  }}
                >
                  Member since {selectedPlayer.memberSince}
                </Text>
                <Text
                  style={{
                    color: "#aaa",
                    fontSize: screenAdjustedDescriptionFontSize
                  }}
                >
                  Last Active {selectedPlayer.lastActive}
                </Text>

                <View style={{ marginTop: 10, alignSelf: "flex-start" }}>
                  <Tag
                    name={"Go to profile"}
                    icon="person"
                    iconSize={screenAdjustedDescriptionFontSize}
                    iconColor="white"
                    iconPosition="left"
                    color="#00A2FF"
                    onPress={goToProfile}
                    bold
                  />
                </View>
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

console.log('screenWidth', screenWidth);

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
  marginVertical: 20,
  padding: screenAdjustedPadding,
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
  fontSize: screenAdjustedNameFontSize,
  color: "white",
  fontWeight: "bold",
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

const Stat = styled.Text({
  fontSize: screenAdjustedStatFontSize,
  fontWeight: "bold",
  color: "white",
});

export default PlayerDetails;
