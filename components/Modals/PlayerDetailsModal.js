import React, { useContext } from "react";
import { View, Text, Modal } from "react-native";
import styled from "styled-components/native";
import { AntDesign, Ionicons } from "@expo/vector-icons";
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
import { transformDate } from "@shared/helpers/dateTransform";
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

/**
 * @param {{
 *   showPlayerDetails?: boolean,
 *   setShowPlayerDetails?: (value: boolean) => void,
 *   selectedPlayer?: any,
 *   route?: any,
 * }} props
 */
const PlayerDetails = ({
  showPlayerDetails,
  setShowPlayerDetails,
  selectedPlayer,
  route,
}) => {
  // Modal mode when opened as a popup (Leagues/Tournaments/standings); screen
  // mode when React Navigation injects a route (Ladder Current Position).
  const isModal = showPlayerDetails !== undefined;
  const navigation = useNavigation();
  const { medalNames } = useContext(GameContext);

  const player = selectedPlayer ?? route?.params?.selectedPlayer ?? null;
  if (!player) return null;

  // Enriched callers flatten XP to the top level; a raw ladder participant
  // keeps it nested under profileDetail. Read whichever is present.
  const playerXp = player.XP ?? player.profileDetail?.XP;

  const winRatio = player.numberOfWins / player.numberOfLosses;

  const goToProfile = () => {
    if (isModal) setShowPlayerDetails(false);
    navigation.navigate("UserProfile", {
      userId: player.userId,
    });
  };

  const currentStreakValue = currentStreak(player.resultLog);

  const statData = [
    {
      statTitle: "Wins",
      stat: (
        <AnimateNumber
          number={player.numberOfWins}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
    {
      statTitle: "Losses",
      stat: (
        <AnimateNumber
          number={player.numberOfLosses}
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
          number={player.averagePointDifference?.toFixed(0) || 0}
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
          number={player.highestWinStreak}
          fontSize={screenAdjustedStatFontSize}
        />
      ),
    },
  ];

  const content = (
    <>
      <PlayerDetail>
        <View>
          <PlayerName>{player.username}</PlayerName>
          <Text
            style={{
              color: "#aaa",
              fontSize: screenAdjustedDescriptionFontSize,
            }}
          >
            Member since {player.memberSince}
          </Text>
          <Text
            style={{
              color: "#aaa",
              fontSize: screenAdjustedDescriptionFontSize,
            }}
          >
            Last Active {transformDate(player.lastActive)}
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

        {isModal && (
          <MedalContainer>
            <MedalDisplay xp={playerXp} size={screenAdjustedMedalSize} />
            <Text style={{ color: "white", marginTop: 10, fontSize: 12 }}>
              {medalNames(playerXp)}
            </Text>
          </MedalContainer>
        )}
      </PlayerDetail>
      {isModal ? (
        // League/tournament popup: global rank medal + progress.
        <MedalProgress xp={playerXp} prevGameXp={player.prevGameXP} />
      ) : (
        // Ladder profile: per-ladder CP only, no rank medal — same as teams.
        <MedalProgress
          xp={player.competitionXP ?? 0}
          prevGameXp={player.prevGameXP}
          showMedals={false}
        />
      )}
      <Divider />
      <ResultLog resultLog={player.resultLog} />
      <MatchMedals
        demonWin={player.demonWin}
        winStreak3={player.winStreak3}
        winStreak5={player.winStreak5}
        winStreak7={player.winStreak7}
      />

      <PerformanceStats statData={statData} selectedPlayer={player} />
    </>
  );

  // ── Screen mode: full-screen Ladder route ──
  if (!isModal) {
    return (
      <Screen>
        <Header>
          <BackButton
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            testID="player-details-back"
          >
            <Ionicons name="chevron-back" size={24} color="white" />
          </BackButton>
          <HeaderSpacer />
        </Header>
        <Body
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </Body>
      </Screen>
    );
  }

  // ── Modal mode: the read-only stats popup ──
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
                name="close-circle"
                size={26}
                color="red"
              />
            </CloseIconContainer>

            {content}
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

// ── Screen-mode styles (Ladder Current Position full screen) ──
const Screen = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
  paddingHorizontal: 20,
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 20,
  paddingBottom: 12,
});

const Body = styled.ScrollView({
  flex: 1,
});

const BackButton = styled.TouchableOpacity({
  width: 32,
  justifyContent: "center",
});

const HeaderSpacer = styled.View({
  width: 32,
});

export default PlayerDetails;
