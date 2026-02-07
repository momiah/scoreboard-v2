import React, { useState, useRef, useEffect, useMemo, memo } from "react";
import styled from "styled-components/native";
import { TouchableOpacity, Dimensions } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import PrizeDistribution from "./PrizeDistribution";
import ParticipantCarousel from "./ParticipantCarousel";
import PlayTime from "./PlayTime";
import PrizeContenders from "./PrizeContenders";
import DoublesPrizeContenders from "../Summary/DoublesPrizeContenders";
import { copyLocationAddress } from "../../helpers/copyLocationAddress";
import { useContext } from "react";
import { enrichPlayers } from "../../helpers/enrichPlayers";
import { UserContext } from "../../context/UserContext";
import { normalizeCompetitionData } from "../../helpers/normalizeCompetitionData";
import { COMPETITION_TYPES } from "../../schemas/schema";
import { calculateTournamentPrizePool } from "../../helpers/Tournament/calculateTournamentPrizePool";

// Constants moved outside to prevent recreation
const PLACEHOLDER_CONTENDERS = Array.from({ length: 4 }, (_, index) => ({
  userId: `placeholder-${index}`,
  username: "",
  numberOfWins: 0,
}));

const PLACEHOLDER_TEAMS = Array.from({ length: 4 }, (_, index) => ({
  teamKey: `placeholder-${index}`,
  team: ["", ""],
  numberOfWins: 0,
  resultLog: [],
  totalPointDifference: 0,
  highestWinStreak: 0,
  numberOfGamesPlayed: 0,
  highestLossStreak: 0,
  lossesTo: {},
  demonWin: 0,
  pointDifferenceLog: [],
  rival: null,
  winStreak5: 0,
  winStreak3: 0,
  averagePointDifference: 0,
  currentStreak: 0,
  winStreak7: 0,
  numberOfLosses: 0,
}));

const DISTRIBUTION = [0.4, 0.3, 0.2, 0.1];

const CompetitionSummary = memo(
  ({ competitionDetails, userRole, startDate, endDate, competitionType }) => {
    const { getUserById } = useContext(UserContext);
    const [topContenders, setTopContenders] = useState([]);
    const [topTeams, setTopTeams] = useState([]);
    const [isCopied, setIsCopied] = useState(false);
    const [isDataLoading, setIsDataLoading] = useState(true);

    const locationCopyTimeoutRef = useRef(null);

    const competitionData = useMemo(
      () =>
        normalizeCompetitionData({
          rawData: competitionDetails,
          competitionType,
        }),
      [competitionDetails, competitionType]
    );

    const participants = competitionData?.participants || [];
    const teams = competitionData?.teams || [];
    const games = competitionData?.games || [];
    const admins = competitionData?.admins || [];
    const owner = competitionData?.owner || {};
    const description = competitionData?.description || "";
    const playtime = competitionData?.playingTime || [];
    const competitionId = competitionData.id;

    // Determine if this is a Doubles tournament
    const isDoublesTournament =
      competitionType === COMPETITION_TYPES.TOURNAMENT &&
      competitionData?.type === "Doubles";

    const gameStats = useMemo(() => {
      const numberOfParticipants = participants.length || 1;
      const numberOfGamesPlayed = games.length || 0;
      const totalGamePointsWon =
        games.reduce((acc, game) => {
          return acc + (game?.result?.winner?.score || 0);
        }, 0) || 0;

      const fixturesArray = competitionData?.fixtures || [];
      const numberOfMatches =
        fixturesArray.flatMap((round) => round.games || []).length || 0;

      // Prize pool calculation
      let prizePool;
      if (competitionType === COMPETITION_TYPES.LEAGUE) {
        prizePool =
          (numberOfParticipants * numberOfGamesPlayed + totalGamePointsWon) / 2;
      } else {
        const gameMode = competitionData?.type || "Singles";
        const tournamentPrizePool = calculateTournamentPrizePool(
          numberOfMatches,
          gameMode
        );

        prizePool = tournamentPrizePool;
      }

      return {
        numberOfParticipants,
        numberOfGamesPlayed,
        totalGamePointsWon,
        prizePool,
      };
    }, [
      participants.length,
      games.length,
      games,
      competitionType,
      competitionData?.competitionType,
      competitionData?.fixtures,
    ]);

    useEffect(() => {
      const loadContenders = async () => {
        setIsDataLoading(true);

        if (isDoublesTournament) {
          // For Doubles tournaments, sort teams by wins
          const teamsWithWins = teams.filter((t) => t.numberOfWins > 0);
          const sortedTeams = [...teamsWithWins].sort((a, b) => {
            if (b.numberOfWins !== a.numberOfWins) {
              return b.numberOfWins - a.numberOfWins;
            }
            return b.totalPointDifference - a.totalPointDifference;
          });
          setTopTeams(sortedTeams.slice(0, 4));
        } else {
          // For Singles competitions, enrich player data
          const contendersWithWins = participants.filter(
            (p) => p.numberOfWins > 0
          );

          if (contendersWithWins.length > 0) {
            try {
              const enriched = await enrichPlayers(
                getUserById,
                contendersWithWins
              );
              setTopContenders(enriched.slice(0, 4));
            } catch (error) {
              console.error("Error enriching players:", error);
              setTopContenders([]);
            }
          } else {
            setTopContenders([]);
          }
        }

        setIsDataLoading(false);
      };

      loadContenders();
    }, [
      participants.length,
      teams.length,
      competitionType,
      isDoublesTournament,
    ]);

    const addressData = useMemo(() => {
      const { courtName, address, postCode, city, countryCode } =
        competitionData?.location || {};
      const fullAddress = `${courtName || ""}, ${address || ""}, ${
        city || ""
      }, ${postCode || ""}, ${countryCode || ""}`;
      return { courtName, address, postCode, city, countryCode, fullAddress };
    }, [competitionData?.location]);

    const hasPrizesDistributed = competitionData?.prizesDistributed;

    const renderContenders = isDataLoading
      ? PLACEHOLDER_CONTENDERS
      : topContenders;

    const renderTeams = isDataLoading ? PLACEHOLDER_TEAMS : topTeams;

    const renderPrizeContenders = () => {
      if (isDoublesTournament) {
        // Doubles Tournament - render DoublesPrizeContenders
        if (renderTeams.length === 0 && !isDataLoading) {
          return (
            <EmptyStateContainer>
              <EmptyStateText>
                Top prize contenders will be displayed here once teams start
                winning games.
              </EmptyStateText>
            </EmptyStateContainer>
          );
        }

        return (
          <DoublesPrizeContenders
            teams={renderTeams}
            isDataLoading={isDataLoading}
            distribution={DISTRIBUTION}
            prizePool={gameStats.prizePool}
            hasPrizesDistributed={hasPrizesDistributed}
            competitionType={competitionType}
          />
        );
      }

      // Singles competitions - render PrizeContenders
      if (renderContenders.length === 0 && !isDataLoading) {
        return (
          <EmptyStateContainer>
            <EmptyStateText>
              Top prize contenders will be displayed here once players start
              winning games.
            </EmptyStateText>
          </EmptyStateContainer>
        );
      }

      return renderContenders.map((player, index) => (
        <PrizeContenders
          key={player.userId}
          item={player}
          index={index}
          isDataLoading={isDataLoading}
          distribution={DISTRIBUTION}
          prizePool={gameStats.prizePool}
          hasPrizesDistributed={hasPrizesDistributed}
          competitionType={competitionType}
        />
      ));
    };

    return (
      <CompetitionSummaryContainer>
        <PrizeDistribution
          prizePool={gameStats.prizePool}
          distribution={DISTRIBUTION}
          competitionType={competitionType}
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

        <TableContainer>{renderPrizeContenders()}</TableContainer>

        {/* Competition Location */}
        <Section>
          <TouchableOpacity
            onPress={() =>
              copyLocationAddress(
                competitionData?.location,
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
          <FullAddressText>{addressData.fullAddress}</FullAddressText>
        </Section>

        {/* Start and End Dates */}
        <Section>
          <DateRow>
            <DateView>
              <SectionTitle>Start Date</SectionTitle>
              <DateValue>{startDate || "N/A"}</DateValue>
            </DateView>
            {endDate && (
              <DateView>
                <SectionTitle>End Date</SectionTitle>
                <DateValue>{endDate || "N/A"}</DateValue>
              </DateView>
            )}
          </DateRow>
        </Section>

        <PlayTime
          userRole={userRole}
          competitionType={competitionType}
          playtime={playtime}
          competitionId={competitionId}
        />

        {/* Participants */}
        <ParticipantCarousel
          participants={participants}
          admins={admins}
          owner={owner}
        />

        {/* Competition Description */}
        <Section>
          <SectionTitle>Description</SectionTitle>
          {description ? (
            <DescriptionText>{description}</DescriptionText>
          ) : (
            <DisabledText>No description available</DisabledText>
          )}
        </Section>
      </CompetitionSummaryContainer>
    );
  }
);

// ✅ OPTIMIZATION 6: Add display name for better debugging
CompetitionSummary.displayName = "CompetitionSummary";

// Styled components remain the same...
const { width: screenWidth } = Dimensions.get("window");

const TableContainer = styled.View({
  paddingTop: 20,
  paddingBottom: 20,
  flex: 1,
});

const CompetitionSummaryContainer = styled.ScrollView({
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

export default CompetitionSummary;
