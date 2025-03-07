import React from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
} from "react-native";
import styled from "styled-components/native";
import { CourtChampLogo } from "../../../assets";
import SubHeader from "../../../components/SubHeader";
import VerticalLeagueCarousel from "../../../components/Leagues/VerticalLeagueCarousel";

const Leagues = () => {
  const handleIconPress = () => {};

  return (
    <LeagueContainer>
      <Overview>
        <Image
          source={CourtChampLogo}
          style={{ width: 175, height: 175, resizeMode: "contain" }}
        />
      </Overview>
      <SubHeader title="Leagues" onIconPress={handleIconPress} showIcon />

      <VerticalLeagueCarousel navigationRoute={"League"} />
    </LeagueContainer>
  );
};

const LeagueContainer = styled.View({
  flex: 1,
  backgroundColor: " rgb(3, 16, 31)",
  width: "100%",
  paddingHorizontal: 20,
});

const Overview = styled.View({
  flexDirection: "row",
  height: 100,
  width: "100%",
  justifyContent: "center",
  alignItems: "center",
  paddingRight: 15,
});

export default Leagues;
