import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import Tooltip from "../Tooltip"; // Import the Tooltip component
import { trophies } from "../../mockImages/index";
import styled from "styled-components/native";
import CourtChampsLogo from "../../assets/court-champ-logo-icon.png";
import { useNavigation } from "@react-navigation/native";

const ParticipantCarousel = ({ leagueParticipants }) => {
  const navigation = useNavigation();

  return (
    <ParticipantContainer>
      <SectionTitle>Participants</SectionTitle>
      {leagueParticipants?.length > 0 ? (
        <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
          {leagueParticipants.map((participant, index) => (
            <ParticipantView
              key={index}
              onPress={() => {
                navigation.navigate("UserProfile", {
                  userId: participant.userId,
                });
              }}
            >
              <Avatar source={CourtChampsLogo} />
              <ParticipantName>{participant.username}</ParticipantName>
            </ParticipantView>
          ))}
        </ScrollView>
      ) : (
        <DescriptionText>No participants added yet.</DescriptionText>
      )}
    </ParticipantContainer>
  );
};

const DescriptionText = styled.Text({
  color: "#888",
  fontSize: 14,
});

const ParticipantContainer = styled.View({
  marginBottom: 20,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
  marginBottom: 10,
});

const ParticipantView = styled.TouchableOpacity({
  alignItems: "center",
  marginRight: 15,
});

const Avatar = styled.Image({
  width: 60,
  height: 60,
  borderRadius: 30,
  borderWidth: 2,
  borderColor: "#00A2FF",
  marginBottom: 5,
});

const ParticipantName = styled.Text({
  color: "#ffffff",
  fontSize: 12,
  textAlign: "center",
});

export default ParticipantCarousel;
