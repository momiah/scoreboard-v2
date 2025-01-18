import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import styled from "styled-components/native";

import PrizeDistribution from "./PrizeDistribution";
import ParticipantCarousel from "./ParticipantCarousel";
import PlayTime from "./PlayTime";

const LeagueSummary = ({ leagueDetails, setLeagueDetails, userRole }) => {
  const [description, setDescription] = useState(
    leagueDetails?.description || ""
  );
  const [playTimes, setPlayTimes] = useState(leagueDetails?.playTimes || []);

  const handleDescriptionChange = (text) => {
    setDescription(text);
    setLeagueDetails((prevDetails) => ({
      ...prevDetails,
      description: text,
    }));
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
      <PlayTime playTimes={playTimes} setPlayTimes={setPlayTimes} />
      {/* <Section>
        <SectionTitle>Play Time</SectionTitle>
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
      </Section> */}

      {/* Participants */}
      <ParticipantCarousel
        leagueParticipants={leagueDetails?.leagueParticipants}
      />

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
  borderRadius: 12,
  marginBottom: 20,
});

const Section = styled.View({
  marginBottom: 30,
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

export default LeagueSummary;
