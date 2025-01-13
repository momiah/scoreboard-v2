import React, { useState } from "react";
import { View, Text, TextInput, ScrollView } from "react-native";
import styled from "styled-components/native";
import { trophies } from "../../mockImages/index";
import CourtChampsLogo from "../../assets/court-champ-logo-icon.png";

const LeagueSummary = ({ leagueDetails, setLeagueDetails, userRole }) => {
  const [description, setDescription] = useState(
    leagueDetails?.description || ""
  );

  const handleDescriptionChange = (text) => {
    setDescription(text);
    setLeagueDetails((prevDetails) => ({
      ...prevDetails,
      description: text,
    }));
  };

  console.log("leagueDetails", leagueDetails.maxPlayers);

  return (
    <LeagueSummaryContainer>
      {/* /* Prize Distribution */}
      <Section>
        <SectionTitle>Prize Distribution</SectionTitle>
        <PrizeRow>
          {trophies.map((trophy, index) => (
            <PrizeView key={index}>
              <PrizeImage source={trophy} />
              <PrizeText>200 XP</PrizeText>
            </PrizeView>
          ))}
        </PrizeRow>
      </Section>
      {/* 
    /* Start and End Dates */}
      <Section>
        <SectionTitle>League Dates</SectionTitle>
        <DateRow>
          <DateView>
            <DateLabel>Start Date</DateLabel>
            <DateValue>{leagueDetails?.startDate || "N/A"}</DateValue>
          </DateView>
          <DateView>
            <DateLabel>End Date</DateLabel>
            <DateValue>{leagueDetails?.endDate || "N/A"}</DateValue>
          </DateView>
        </DateRow>
      </Section>
      {/* Participants */}
      <Section>
        <SectionTitle>Participants</SectionTitle>
        {leagueDetails?.leagueParticipants?.length > 0 ? (
          <ScrollView horizontal={true} showsHorizontalScrollIndicator={false}>
            {leagueDetails.leagueParticipants.map((participant, index) => (
              <ParticipantView key={index}>
                <Avatar source={CourtChampsLogo} />
                <ParticipantName>{participant.id}</ParticipantName>
              </ParticipantView>
            ))}
          </ScrollView>
        ) : (
          <DescriptionText>No participants added yet.</DescriptionText>
        )}
      </Section>
      {/* League Description */}
      <Section>
        <SectionTitle>League Description</SectionTitle>
        {userRole === "admin" ? (
          <DescriptionInput
            placeholder="Add a league description..."
            value={description}
            onChangeText={handleDescriptionChange}
            multiline
          />
        ) : (
          <DescriptionText>
            {leagueDetails?.description || "No description available."}
          </DescriptionText>
        )}
      </Section>
    </LeagueSummaryContainer>
  );
};

const LeagueSummaryContainer = styled.ScrollView({
  padding: 20,
  //   backgroundColor: "#00152B",
  borderRadius: 12,
  marginBottom: 20,
});

const Section = styled.View({
  marginBottom: 20,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
  marginBottom: 10,
});

const DescriptionInput = styled.TextInput({
  backgroundColor: "#262626",
  color: "#ffffff",
  borderRadius: 8,
  padding: 10,
  fontSize: 14,
  height: 100,
  textAlignVertical: "top",
});

const DescriptionText = styled.Text({
  color: "#ccc",
  fontSize: 14,
});

const PrizeRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
});

const PrizeView = styled.View({
  width: "30%",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  padding: 10,
  borderRadius: 8,
  alignItems: "center",
});

const PrizeImage = styled.Image({
  width: 60,
  height: 60,

  marginBottom: 5,
});

const PrizeText = styled.Text({
  color: "#ccc",
  fontSize: 14,
  fontWeight: "bold",
});

const PrizeAmount = styled.Text({
  color: "#ffffff",
  fontSize: 16,
  fontWeight: "bold",
});

const DateRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
});

const DateView = styled.View({
  width: "48%",
});

const DateLabel = styled.Text({
  color: "#ccc",
  fontSize: 14,
  fontWeight: "bold",
});

const DateValue = styled.Text({
  color: "#ffffff",
  fontSize: 14,
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

export default LeagueSummary;
