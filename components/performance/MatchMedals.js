import rankingMedals from "../../rankingMedals";
import styled from "styled-components/native";
import React from "react";
import { View, Image, Text } from "react-native";

const MatchMedals = ({
  demonWin = 0,
  winStreak3 = 0,
  winStreak5 = 0,
  winStreak7 = 0,
}) => {
  const Medals = [
    {
      medal: rankingMedals.demon_win,
      stat: demonWin,
    },
    {
      medal: rankingMedals.win_streak_3,
      stat: winStreak3,
    },
    {
      medal: rankingMedals.win_streak_5,
      stat: winStreak5,
    },
    {
      medal: rankingMedals.win_streak_7,
      stat: winStreak7,
    },
  ];
  return (
    <Container>
      {Medals.map((medal, index) => {
        return (
          <MedalContainer key={index}>
            <Medal source={medal.medal} />
            <MedalStat>{medal.stat}</MedalStat>
          </MedalContainer>
        );
      })}
    </Container>
  );
};

const Container = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  borderTopColor: "#262626",
  borderTopWidth: 1,
  width: "100%",
  paddingVertical: 20,
});

const Medal = styled.Image({
  width: 50,
  height: 50,
});

const MedalContainer = styled.View({
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
});

const MedalStat = styled.Text({
  color: "white",
  fontWeight: "bold",
});

export default MatchMedals;
