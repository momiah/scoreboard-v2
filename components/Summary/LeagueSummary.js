import React from "react";

import styled from "styled-components/native";

import PrizeDistribution from "./PrizeDistribution";
import ParticipantCarousel from "./ParticipantCarousel";
import PlayTime from "./PlayTime";

const LeagueSummary = ({ leagueDetails, userRole, startDate, endDate }) => {
  const maxPlayers = leagueDetails.maxPlayers;
  const numberOfGamesPlayed = leagueDetails.games.length;
  const totalGamePointsWon = leagueDetails.games.reduce((acc, game) => {
    return acc + game.result.winner.score;
  }, 0);

  const prizePool = maxPlayers * numberOfGamesPlayed + totalGamePointsWon;

  return (
    <LeagueSummaryContainer>
      <PrizeDistribution
        prizePool={prizePool}
        endDate={endDate}
        leagueParticipants={leagueDetails?.leagueParticipants}
      />

      {/* Start and End Dates */}
      <Section>
        <DateRow>
          <DateView>
            <SectionTitle>Start Date</SectionTitle>
            <DateValue>{startDate || "N/A"}</DateValue>
          </DateView>
          <DateView>
            <SectionTitle>End Date</SectionTitle>
            <DateValue>{endDate || "N/A"}</DateValue>
          </DateView>
        </DateRow>
      </Section>

      <PlayTime userRole={userRole} />

      {/* Participants */}
      <ParticipantCarousel
        leagueParticipants={leagueDetails?.leagueParticipants}
        leagueAdmins={leagueDetails?.leagueAdmins}
        leagueOwner={leagueDetails?.leagueOwner}
      />

      {/* League Description */}
      <Section>
        <SectionTitle>League Description</SectionTitle>
        {leagueDetails?.leagueDescription ? (
          <DescriptionText>{leagueDetails.leagueDescription}</DescriptionText>
        ) : (
          <DisabledText>No description available</DisabledText>
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

export default LeagueSummary;
