import React, { useState, useRef } from "react";

import styled from "styled-components/native";
import { TouchableOpacity, Dimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import PrizeDistribution from "./PrizeDistribution";
import ParticipantCarousel from "./ParticipantCarousel";
import PlayTime from "./PlayTime";
import { copyLocationAddress } from "../../helpers/copyLocationAddress";
import { View } from "moti";

const LeagueSummary = ({ leagueDetails, userRole, startDate, endDate }) => {
  const [isCopied, setIsCopied] = useState(false);
  const timeoutRef = useRef(null);

  const maxPlayers = leagueDetails.maxPlayers;
  const numberOfGamesPlayed = leagueDetails.games.length;
  const totalGamePointsWon = leagueDetails.games.reduce((acc, game) => {
    return acc + game.result.winner.score;
  }, 0);

  const { courtName, address, postCode, city, countryCode } =
    leagueDetails.location;
  const fullAddress = `${courtName}, ${address}, ${city}, ${postCode}, ${countryCode}`;

  const prizePool = maxPlayers * numberOfGamesPlayed + totalGamePointsWon;

  return (
    <LeagueSummaryContainer>
      <PrizeDistribution
        prizePool={prizePool}
        endDate={endDate}
        leagueParticipants={leagueDetails?.leagueParticipants}
      />

      {/* League Name and Location */}
      <Section>
        <TouchableOpacity
          onPress={() =>
            copyLocationAddress(leagueDetails.location, timeoutRef, setIsCopied)
          }
          style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
        >
          <SectionTitle>Full Address</SectionTitle>
          <Ionicons
            name={isCopied ? "checkmark-circle-outline" : "copy-outline"}
            size={16}
            color={isCopied ? "green" : "white"}
          />
        </TouchableOpacity>
        <FullAddressText>{fullAddress}</FullAddressText>
      </Section>

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

const { width: screenWidth } = Dimensions.get("window");

const LeagueSummaryContainer = styled.ScrollView({
  padding: 20,
  borderRadius: 12,
  marginBottom: 20,
});

const Section = styled.View({
  marginTop: 10,
  gap: 10,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
  // marginBottom: 10,
});

const DescriptionText = styled.Text({
  color: "#ccc",
  fontSize: screenWidth <= 400 ? 13 : 14,
  marginBottom: 30,
});

const FullAddressText = styled.Text({
  color: "#ccc",
  fontSize: screenWidth <= 400 ? 13 : 14,
  marginBottom: 10,
});

const DisabledText = styled.Text({
  flex: 1,
  color: "#888",
  fontSize: 14,
});

const DateRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  marginTop: 20,
});

const DateView = styled.View({
  width: "48%",
});

const DateValue = styled.Text({
  color: "#ccc",
  fontSize: 14,
  marginTop: 10,
});

export default LeagueSummary;
