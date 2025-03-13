import React, { useState } from "react";
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
import AddLeagueModel from "../../../components/Modals/AddLeagueModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import VerticalLeagueCarousel from "../../../components/Leagues/VerticalLeagueCarousel";
import { useNavigation } from "@react-navigation/native";

const Leagues = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();

  const addLeague = async () => {
    const token = await AsyncStorage.getItem("userToken");

    if (token) {
      setModalVisible(true);
    } else {
      navigateTo("Login");
    }
  };

  const navigateTo = (route) => {
    if (route) {
      navigation.navigate(route);
    }
  };

  return (
    <LeagueContainer>
      <Overview>
        <Image
          source={CourtChampLogo}
          style={{ width: 175, height: 175, resizeMode: "contain" }}
        />
      </Overview>
      <SubHeader title="Leagues" onIconPress={addLeague} showIcon />

      <VerticalLeagueCarousel navigationRoute={"League"} />
      {modalVisible && (
        <AddLeagueModel
          modalVisible={modalVisible}
          setModalVisible={setModalVisible}
        />
      )}
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
