import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components/native";
import { TouchableOpacity, Dimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import PrizeDistribution from "./PrizeDistribution";
import ParticipantCarousel from "./ParticipantCarousel";
import PlayTime from "./PlayTime";
import PrizeContenders from "./PrizeContenders"; // Import the new component
import { copyLocationAddress } from "../../helpers/copyLocationAddress";
import { GameContext } from "../../context/GameContext";
import { useContext } from "react";
import { enrichPlayers } from "../../helpers/enrichPlayers";
import { UserContext } from "../../context/UserContext";

const LeagueSummary = ({ leagueDetails, userRole, startDate, endDate }) => {
  const { getUserById } = useContext(UserContext);
  const [topContenders, setTopContenders] = useState([]);
  const [isCopied, setIsCopied] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);

  useEffect(() => {
    const loadEnrichedContenders = async () => {
      setIsDataLoading(true);
      const participants = leagueDetails.leagueParticipants || [];

      // Only filter (no sorting - enrichPlayers handles that)
      const contendersWithWins = participants.filter((p) => p.numberOfWins > 0);

      if (contendersWithWins.length > 0) {
        const enriched = await enrichPlayers(getUserById, contendersWithWins);
        setTopContenders(enriched.slice(0, 4));
      } else {
        setTopContenders([]);
      }
      setIsDataLoading(false);
    };

    loadEnrichedContenders();
  }, [leagueDetails.leagueParticipants, getUserById]);

  const locationCopyTimeoutRef = useRef(null);

  const numberOfParticipants = leagueDetails.leagueParticipants.length || 1;
  const numberOfGamesPlayed = leagueDetails.games.length;

  const totalGamePointsWon = leagueDetails.games.reduce((acc, game) => {
    return acc + game.result.winner.score;
  }, 0);

  const { courtName, address, postCode, city, countryCode } =
    leagueDetails.location;
  const fullAddress = `${courtName}, ${address}, ${city}, ${postCode}, ${countryCode}`;

  const prizePool =
    (numberOfParticipants * numberOfGamesPlayed + totalGamePointsWon) / 2;

  const distribution = [0.4, 0.3, 0.2, 0.1];

  const hasPrizesDistributed = leagueDetails.prizesDistributed;
  const leagueId = leagueDetails.leagueId;

  const renderContenders = isDataLoading
    ? Array.from({ length: 4 }, (_, index) => ({
        userId: `placeholder-${index}`,
        username: "",
        numberOfWins: 0,
      }))
    : topContenders;

  return (
    <LeagueSummaryContainer>
      <PrizeDistribution
        prizePool={prizePool}
        endDate={endDate}
        leagueParticipants={leagueDetails?.leagueParticipants}
        hasPrizesDistributed={hasPrizesDistributed}
        leagueId={leagueId}
        distribution={distribution}
      />

      <SectionTitleContainer>
        {hasPrizesDistributed ? (
          <>
            <SectionTitle>Prize Winners</SectionTitle>
            <Ionicons name="checkmark-circle" size={20} color="green" />
          </>
        ) : (
          <>
            <SectionTitle>Top Contenders</SectionTitle>
            <Ionicons name="hourglass-outline" size={20} color="#FF9800" />
          </>
        )}
      </SectionTitleContainer>
      <TableContainer>
        {renderContenders.length === 0 && !isDataLoading ? (
          <EmptyStateContainer>
            <EmptyStateText>
              Top prize contenders will be displayed here once players start
              winning games.
            </EmptyStateText>
          </EmptyStateContainer>
        ) : (
          renderContenders.map((player, index) => (
            <PrizeContenders
              key={player.userId}
              item={player}
              index={index}
              isDataLoading={isDataLoading}
              distribution={distribution}
              prizePool={prizePool}
              hasPrizesDistributed={hasPrizesDistributed}
            />
          ))
        )}
      </TableContainer>

      {/* League Name and Location */}
      <Section>
        <TouchableOpacity
          onPress={() =>
            copyLocationAddress(
              leagueDetails.location,
              locationCopyTimeoutRef,
              setIsCopied
            )
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

const TableContainer = styled.View({
  paddingTop: 20,
  paddingBottom: 20,
  flex: 1,
});

const LeagueSummaryContainer = styled.ScrollView({
  padding: 20,
  borderRadius: 12,
  marginBottom: 20,
});

const SectionTitleContainer = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginTop: 10,
});

const Section = styled.View({
  marginTop: 10,
  gap: 10,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
});

const EmptyStateContainer = styled.View({
  paddingVertical: 20,
  paddingHorizontal: 20,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
});

const EmptyStateText = styled.Text({
  fontSize: screenWidth <= 405 ? 13 : 14,
  color: "#aaa",
  textAlign: "center",
});

const DescriptionText = styled.Text({
  color: "#ccc",
  fontSize: screenWidth <= 405 ? 13 : 14,
  marginBottom: 30,
});

const FullAddressText = styled.Text({
  color: "#ccc",
  fontSize: screenWidth <= 405 ? 13 : 14,
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
