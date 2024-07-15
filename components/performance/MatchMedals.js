import rankingMedals from "../../rankingMedals";
import styled from "styled-components/native";
import React from "react";
import { View, Image, Text } from "react-native";
import { Dimensions } from "react-native";

const MatchMedals = ({
  demonWin = 0,
  winStreak3 = 0,
  winStreak5 = 0,
  winStreak7 = 0,
}) => {
  const Medals = [
    {
      medal: rankingMedals.demon_win,
      title: "Demon Win",
      stat: demonWin,
    },
    {
      medal: rankingMedals.win_streak_3,
      title: "3 Win Streak",
      stat: winStreak3,
    },
    {
      medal: rankingMedals.win_streak_5,
      title: "5 Win Streak",
      stat: winStreak5,
    },
    {
      medal: rankingMedals.win_streak_7,
      title: "7 Win Streak",
      stat: winStreak7,
    },
  ];
  return (
    <Container>
      {Medals.map((medal, index) => {
        return (
          <MedalContainer key={index}>
            <Medal source={medal.medal} />
            <MedalTitle>{medal.title}</MedalTitle>
            <MedalStat>{medal.stat}</MedalStat>
          </MedalContainer>
        );
      })}
    </Container>
  );
};

const { width: screenWidth } = Dimensions.get("window");

const Container = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  borderTopColor: "#262626",
  borderTopWidth: 1,
  width: "100%",
  paddingVertical: 20,
});

const Medal = styled.Image({
  width: screenWidth <= 400 ? 45 : 50,
  height: screenWidth <= 400 ? 45 : 50,
});

const MedalContainer = styled.View({
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
});

const MedalTitle = styled.Text({
  color: "white",
  fontSize: 10,
  color: "#aaa",
});

const MedalStat = styled.Text({
  color: "white",
  fontWeight: "bold",
});

export default MatchMedals;
