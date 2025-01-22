import React, { useState, useContext } from "react";
import { TouchableOpacity } from "react-native";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";
import { LeagueContext } from "../../context/LeagueContext";

import PrizeDistribution from "./PrizeDistribution";
import ParticipantCarousel from "./ParticipantCarousel";
import PlayTime from "./PlayTime";

const LeagueSummary = ({ leagueDetails, setLeagueDetails, userRole }) => {
  const { handleLeagueDescription } = useContext(LeagueContext); // Get the function from context
  const [description, setDescription] = useState(
    leagueDetails?.description || ""
  );
  const [isEditing, setIsEditing] = useState(false);

  const handleDescriptionChange = (text) => {
    setDescription(text);
  };

  const handleConfirmDescription = () => {
    handleLeagueDescription(description); // Update Firebase
    setLeagueDetails((prevDetails) => ({
      ...prevDetails,
      description,
    }));
    setIsEditing(false); // Exit editing mode
  };

  const handleCancelDescription = () => {
    setDescription(leagueDetails.description || ""); // Reset to original description
    setIsEditing(false); // Exit editing mode
  };

  const maxPlayers = leagueDetails.maxPlayers;
  const numberOfGamesPlayed = leagueDetails.games.length;
  const totalGamePointsWon = leagueDetails.games.reduce((acc, game) => {
    return acc + game.result.winner.score;
  }, 0);

  const prizePool = maxPlayers * numberOfGamesPlayed + totalGamePointsWon;

  return (
    <LeagueSummaryContainer>
      <PrizeDistribution prizePool={prizePool} />

      {/* Start and End Dates */}
      <Section>
        <DateRow>
          <DateView>
            <SectionTitle>Start Date</SectionTitle>
            <DateValue>{leagueDetails?.startDate || "N/A"}</DateValue>
          </DateView>
          <DateView>
            <SectionTitle>End Date</SectionTitle>
            <DateValue>{leagueDetails?.endDate || "N/A"}</DateValue>
          </DateView>
        </DateRow>
      </Section>

      <PlayTime userRole={userRole} />

      {/* Participants */}
      <ParticipantCarousel
        leagueParticipants={leagueDetails?.leagueParticipants}
      />

      {/* League Description */}
      {/* League Description */}
      <Section>
        <SectionTitle>League Description</SectionTitle>
        {userRole === "admin" ? (
          <>
            <DescriptionInput
              placeholder="Add a league description..."
              value={description}
              onChangeText={handleDescriptionChange}
              multiline
              onFocus={() => setIsEditing(true)} // Enter editing mode
              onBlur={() => setIsEditing(false)} // Exit editing mode on blur
            />
            {isEditing && (
              <IconRow>
                <IconButton
                  onPress={() => {
                    handleConfirmDescription();
                    setIsEditing(false);
                  }}
                >
                  <AntDesign name="check" size={20} color="green" />
                </IconButton>
                <IconButton onPress={handleCancelDescription}>
                  <AntDesign name="close" size={20} color="red" />
                </IconButton>
              </IconRow>
            )}
          </>
        ) : (
          <>
            {leagueDetails?.leagueDescription ? (
              <DescriptionText>
                {leagueDetails.leagueDescription}
              </DescriptionText>
            ) : (
              <DisabledText>No description available</DisabledText>
            )}
          </>
        )}
      </Section>
    </LeagueSummaryContainer>
  );
};

const LeagueSummaryContainer = styled.ScrollView({
  padding: 20,
  borderRadius: 12,
  marginBottom: 20,
});

const Section = styled.View({
  marginTop: 10,
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

const DisabledText = styled.Text({
  flex: 1,
  color: "#888",
  fontSize: 14,
});

const DateRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
});

const DateView = styled.View({
  width: "48%",
});

const DateValue = styled.Text({
  color: "#ffffff",
  fontSize: 14,
});

const IconRow = styled.View({
  flexDirection: "row",
  marginTop: 10,
  marginLeft: 10,
});

const IconButton = styled.TouchableOpacity({
  marginRight: 10,
});

export default LeagueSummary;
