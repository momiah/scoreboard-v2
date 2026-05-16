import React, { useState, useEffect, useCallback } from "react";
import { FlatList, Image, Dimensions } from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";

import TeamDetails from "../../../../../components/Modals/TeamDetailsModal";
import LoadingOverlay from "../../../../../components/LoadingOverlay";
import { PlayerPerformanceIcon } from "../../../../../assets";
import { db } from "../../../../../services/firebase.config";
import { MOCK_TEAMS, USE_MOCK_DATA } from "../../mockClubData";

const { width: screenWidth } = Dimensions.get("window");

interface ClubTeamPerformanceProps {
  clubId: string;
}

interface RawTeam {
  teamKey: string;
  team?: string[];
  numberOfWins?: number;
  totalPointDifference?: number;
  averagePointDifference?: number;
  resultLog?: string[];
  [key: string]: unknown;
}

const ClubTeamPerformance: React.FC<ClubTeamPerformanceProps> = ({
  clubId,
}) => {
  const [teams, setTeams] = useState<RawTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<RawTeam | null>(null);
  const [showTeamDetails, setShowTeamDetails] = useState(false);

  const fetchAndAggregate = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setTeams(MOCK_TEAMS as RawTeam[]);
      setLoading(false);
      return;
    }
    if (!clubId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const clubFilter = where("clubId", "==", clubId);
      const [leaguesSnap, tournamentsSnap] = await Promise.all([
        getDocs(query(collection(db, "leagues"), clubFilter)),
        getDocs(query(collection(db, "tournaments"), clubFilter)),
      ]);

      const merged = new Map<string, RawTeam>();

      const mergeTeams = (rawTeams: RawTeam[]) => {
        rawTeams
          .filter((t) => t.teamKey && Array.isArray(t.team))
          .forEach((t) => {
            const existing = merged.get(t.teamKey);
            if (!existing) {
              merged.set(t.teamKey, {
                ...t,
                numberOfWins: t.numberOfWins ?? 0,
                totalPointDifference: t.totalPointDifference ?? 0,
                resultLog: [...(t.resultLog ?? [])],
              });
            } else {
              existing.numberOfWins =
                (existing.numberOfWins ?? 0) + (t.numberOfWins ?? 0);
              existing.totalPointDifference =
                (existing.totalPointDifference ?? 0) +
                (t.totalPointDifference ?? 0);
              const combined = [
                ...(existing.resultLog ?? []),
                ...(t.resultLog ?? []),
              ];
              existing.resultLog = combined.slice(-10);
            }
          });
      };

      leaguesSnap.forEach((doc) => {
        const data = doc.data();
        mergeTeams(data.leagueTeams ?? data.teams ?? []);
      });

      tournamentsSnap.forEach((doc) => {
        const data = doc.data();
        mergeTeams(data.tournamentTeams ?? data.teams ?? []);
      });

      const sorted = Array.from(merged.values()).sort((a, b) => {
        if ((b.numberOfWins ?? 0) !== (a.numberOfWins ?? 0))
          return (b.numberOfWins ?? 0) - (a.numberOfWins ?? 0);
        return (
          (b.totalPointDifference ?? 0) - (a.totalPointDifference ?? 0)
        );
      });

      setTeams(sorted);
    } catch (e) {
      console.error("Club team performance fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    fetchAndAggregate();
  }, [fetchAndAggregate]);

  const renderTeam = useCallback(
    ({ item: team, index }: { item: RawTeam; index: number }) => {
      const pd = team.totalPointDifference ?? 0;
      const teamPlayers = team.team ?? [];
      const lastResult = team.resultLog?.[(team.resultLog?.length ?? 0) - 1];
      const resultIcon = lastResult === "W" ? "caretup" : "caretdown";
      const resultColor = lastResult === "W" ? "green" : "red";
      const suffix =
        index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th";

      return (
        <TableRow
          onPress={() => {
            setSelectedTeam(team);
            setShowTeamDetails(true);
          }}
        >
          <TableCell>
            <Rank>
              {index + 1}
              {suffix}
            </Rank>
          </TableCell>

          <TeamCell>
            <TeamNameCell>
              {teamPlayers.map((player, idx) => (
                <PlayerName key={`${player}-${idx}`} numberOfLines={1}>
                  {player}
                </PlayerName>
              ))}
            </TeamNameCell>
            {lastResult ? (
              <AntDesign name={resultIcon} size={10} color={resultColor} />
            ) : null}
          </TeamCell>

          <TableCell>
            <StatTitle>Wins</StatTitle>
            <Stat>{team.numberOfWins ?? 0}</Stat>
          </TableCell>

          <TableCell>
            <StatTitle>PD</StatTitle>
            <Stat style={{ color: pd < 0 ? "red" : "green" }}>{pd}</Stat>
          </TableCell>

          <TableCell>
            <Image
              source={PlayerPerformanceIcon}
              style={{ width: 45, height: 45, resizeMode: "contain" }}
            />
          </TableCell>
        </TableRow>
      );
    },
    [],
  );

  if (loading) {
    return (
      <TableContainer>
        <LoadingOverlay visible />
      </TableContainer>
    );
  }

  if (teams.length === 0) {
    return (
      <TableContainer>
        <EmptyState>
          Team performance across all club leagues and tournaments will appear
          here once doubles games have been played.
        </EmptyState>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <FlatList
        data={teams}
        renderItem={renderTeam}
        keyExtractor={(t, i) => `${t.teamKey}-${i}`}
      />

      {showTeamDetails && selectedTeam && (
        <TeamDetails
          showTeamDetails={showTeamDetails}
          setShowTeamDetails={setShowTeamDetails}
          teamStats={selectedTeam}
        />
      )}
    </TableContainer>
  );
};

const TableContainer = styled.View({
  paddingTop: 20,
  flex: 1,
});

const TableRow = styled.TouchableOpacity({
  flexDirection: "row",
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 15,
  paddingBottom: 15,
  borderTopWidth: 1,
  borderColor: "rgb(9, 33, 62)",
});

const TeamCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingRight: 5,
  width: 130,
  borderTopWidth: 1,
  borderColor: "rgb(9, 33, 62)",
});

const TeamNameCell = styled.View({
  justifyContent: "flex-start",
  alignItems: "flex-start",
  paddingTop: 15,
  paddingBottom: 15,
  gap: 6,
  flex: 1,
});

const PlayerName = styled.Text({
  fontSize: 14,
  fontWeight: "bold",
  color: "white",
});

const Rank = styled.Text({
  fontSize: 14,
  color: "#00A2FF",
  fontWeight: "bold",
});

const StatTitle = styled.Text({
  fontSize: 12,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: screenWidth <= 400 ? 20 : 25,
  fontWeight: "bold",
  color: "white",
});

const EmptyState = styled.Text({
  color: "#aaa",
  fontStyle: "italic",
  fontSize: 15,
  textAlign: "center",
  marginTop: 50,
  lineHeight: 22,
});

export default ClubTeamPerformance;
