import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import styled from "styled-components/native";
import MedalDisplay from "./MedalDisplay";
import { LinearGradient } from "expo-linear-gradient";
import { FontAwesome } from "@expo/vector-icons";
import AnimateNumber from "./AnimateNumber";
import { ranks } from "../../rankingMedals/ranking/ranks";
import { formatNumber } from "../../helpers/formatNumber";

const getNextRank = (xp) => {
  for (let i = 0; i < ranks.length; i++) {
    if (xp < ranks[i].xp) {
      return ranks[i];
    }
  }
  return ranks[ranks.length - 1]; // Return the last rank if xp is very high
};

const MedalProgress = ({ xp, prevGameXp }) => {
  const currentRank = ranks.reduce((prev, current) =>
    current.xp <= xp ? current : prev
  );

  // const xpFormmated = formatNumber(xp);

  const previousGameXp = prevGameXp ? prevGameXp.toFixed(0) : null;

  const nextRank = getNextRank(xp);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: xp - currentRank.xp,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();
  }, [xp, currentRank, progressAnim]);

  return (
    <Container>
      <ProgressArrow>
        <Animated.View
          style={[
            styles.progressArrow,
            {
              width: progressAnim.interpolate({
                inputRange: [0, nextRank.xp - currentRank.xp],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        >
          <ProgressArrowContainer>
            <AnimateNumber number={xp} progressBar />
            <FontAwesome name="caret-down" size={16} color="white" />
          </ProgressArrowContainer>
        </Animated.View>
      </ProgressArrow>
      <ProgressBar>
        <Animated.View
          style={[
            styles.progress,
            {
              width: progressAnim.interpolate({
                inputRange: [0, nextRank.xp - currentRank.xp],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        >
          <LinearGradient
            colors={["#FFD100", "#FF7800"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </ProgressBar>
      <ProgressRanks>
        <RankContainer style={{ alignItems: "flex-start" }}>
          <RankXpText>{formatNumber(currentRank.xp)} XP</RankXpText>
          <MedalDisplay xp={currentRank.xp} size={20} />
          <Text style={{ color: "#aaa" }}>{currentRank.name}</Text>
        </RankContainer>
        {previousGameXp !== null && (
          <PreviousGameXpContainer>
            <PreviousGameXp prevGameXp={previousGameXp}>
              {previousGameXp < 0
                ? `${previousGameXp} XP`
                : `+${previousGameXp} XP`}
            </PreviousGameXp>
            <Text style={{ color: "#aaa", fontSize: 11, paddingLeft: 6 }}>
              Last Match
            </Text>
          </PreviousGameXpContainer>
        )}
        <RankContainer style={{ alignItems: "flex-end" }}>
          <RankXpText>{formatNumber(nextRank.xp)} XP</RankXpText>
          <MedalDisplay xp={nextRank.xp} size={20} />
          <Text style={{ color: "#aaa" }}>{nextRank.name}</Text>
        </RankContainer>
      </ProgressRanks>
    </Container>
  );
};

const Container = styled.View({
  marginVertical: 20,
});

const RankXpText = styled.Text({
  color: "white",
  fontWeight: "bold",
  marginBottom: 5,
});
const ProgressBar = styled.View({
  height: 20,
  width: "100%",
  backgroundColor: "#e0e0e0",
  borderRadius: 10,
  overflow: "hidden",
  marginVertical: 10,
});
const ProgressArrow = styled.View({
  height: 20,
  width: "100%",
});

const ProgressArrowContainer = styled.View({
  alignItems: "flex-end",
  position: "relative",
  left: 5,
  padding: 5,
  bottom: 5,
});

const PreviousGameXp = styled.Text`
  color: ${(props) => (props.prevGameXp < 0 ? "red" : "green")};
  font-size: 20px;
  font-weight: bold;
`;

const ProgressRanks = styled.View({
  justifyContent: "space-between",
  flexDirection: "row",
  alignItems: "center",
});

const RankContainer = styled.View({
  flexDirection: "column",
  width: "40%",
});

const PreviousGameXpContainer = styled.View({
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
});

const styles = StyleSheet.create({
  progress: {
    height: "100%",
    backgroundColor: "#FFD100",
    position: "relative",
  },
  progressArrow: {
    height: "100%",
    marginTop: 2,
    textAlign: "center",
    flexDirection: "column",
    justifyContent: "center",
  },
  number: {
    fontSize: 48,
    marginBottom: 20,
  },
});

export default MedalProgress;
