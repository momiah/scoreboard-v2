import React, { useState, useEffect, useCallback, useContext } from "react";
import { FlatList, Image } from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import styled from "styled-components/native";
import { AntDesign } from "@expo/vector-icons";

import PlayerDetails from "../../../../../components/Modals/PlayerDetailsModal";
import LoadingOverlay from "../../../../../components/LoadingOverlay";
import { UserContext } from "../../../../../context/UserContext";
import { formatDisplayName } from "../../../../../helpers/formatDisplayName";
import { enrichPlayers } from "../../../../../helpers/enrichPlayers";
import { PlayerPerformanceIcon } from "../../../../../assets";
import { db } from "../../../../../services/firebase.config";

interface ClubPlayerPerformanceProps {
  clubId: string;
}

interface RawParticipant {
  userId: string;
  numberOfWins?: number;
  totalPointDifference?: number;
  resultLog?: string[];
  XP?: number;
  [key: string]: unknown;
}

/**
 * Fetches all leagues belonging to the club, merges leagueParticipants by
 * userId (summing wins + PD, keeping last 10 resultLog entries), then enriches
 * with each player's global XP from their user profile — the same approach
 * as the per-league PlayerPerformance, just aggregated across the club.
 */
const ClubPlayerPerformance: React.FC<ClubPlayerPerformanceProps> = ({
  clubId,
}) => {
  const { getUserById } = useContext(UserContext);
  const [players, setPlayers] = useState<RawParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<RawParticipant | null>(
    null,
  );
  const [showPlayerDetails, setShowPlayerDetails] = useState(false);

  const fetchAndAggregate = useCallback(async () => {
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

      const merged = new Map<string, RawParticipant>();

      const mergeParticipants = (
        participants: RawParticipant[],
      ) => {
        participants.forEach((p) => {
          if (!p?.userId) return;
          const existing = merged.get(p.userId);
          if (!existing) {
            merged.set(p.userId, {
              ...p,
              numberOfWins: p.numberOfWins ?? 0,
              totalPointDifference: p.totalPointDifference ?? 0,
              resultLog: [...(p.resultLog ?? [])],
            });
          } else {
            existing.numberOfWins =
              (existing.numberOfWins ?? 0) + (p.numberOfWins ?? 0);
            existing.totalPointDifference =
              (existing.totalPointDifference ?? 0) +
              (p.totalPointDifference ?? 0);
            const combined = [
              ...(existing.resultLog ?? []),
              ...(p.resultLog ?? []),
            ];
            existing.resultLog = combined.slice(-10);
          }
        });
      };

      leaguesSnap.forEach((doc) => {
        const data = doc.data();
        mergeParticipants(data.leagueParticipants ?? data.participants ?? []);
      });

      tournamentsSnap.forEach((doc) => {
        const data = doc.data();
        mergeParticipants(
          data.tournamentParticipants ?? data.participants ?? [],
        );
      });

      // Enrich with global XP from user profile (same as per-league view)
      const enriched = (await enrichPlayers(
        getUserById,
        Array.from(merged.values()),
      )) as RawParticipant[];
      setPlayers(enriched);
    } catch (e) {
      console.error("Club player performance fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [clubId, getUserById]);

  useEffect(() => {
    fetchAndAggregate();
  }, [fetchAndAggregate]);

  const renderPlayer = useCallback(
    ({ item: player, index }: { item: RawParticipant; index: number }) => {
      const playerXp = (player.XP as number) || 0;
      const displayName = formatDisplayName(player);
      const lastResult = player.resultLog?.[(player.resultLog?.length ?? 0) - 1];
      const resultIcon = lastResult === "W" ? "caretup" : "caretdown";
      const resultColor = lastResult === "W" ? "green" : "red";
      const suffix =
        index === 0 ? "st" : index === 1 ? "nd" : index === 2 ? "rd" : "th";

      return (
        <TableRow
          onPress={() => {
            setSelectedPlayer(player);
            setShowPlayerDetails(true);
          }}
        >
          <TableCell>
            <Rank>
              {index + 1}
              {suffix}
            </Rank>
          </TableCell>

          <PlayerNameCell>
            <PlayerName numberOfLines={1}>{displayName}</PlayerName>
            {lastResult ? (
              <AntDesign name={resultIcon} size={10} color={resultColor} />
            ) : null}
          </PlayerNameCell>

          <TableCell>
            <StatTitle>Wins</StatTitle>
            <Stat>{player.numberOfWins ?? 0}</Stat>
          </TableCell>

          <TableCell>
            <StatTitle>XP</StatTitle>
            <Stat>{Math.round(playerXp)}</Stat>
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

  if (players.length === 0) {
    return (
      <TableContainer>
        <EmptyState>
          Accumulated player performance from all club leagues will appear here
          once leagues with activity exist.
        </EmptyState>
      </TableContainer>
    );
  }

  return (
    <TableContainer>
      <FlatList
        data={players}
        renderItem={renderPlayer}
        keyExtractor={(p) => p.userId}
      />

      {showPlayerDetails && selectedPlayer && (
        <PlayerDetails
          selectedPlayer={selectedPlayer}
          showPlayerDetails={showPlayerDetails}
          setShowPlayerDetails={setShowPlayerDetails}
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

const PlayerNameCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingTop: 15,
  paddingBottom: 15,
  paddingRight: 5,
  borderTopWidth: 1,
  width: 130,
  borderColor: "rgb(9, 33, 62)",
});

const PlayerName = styled.Text({
  fontSize: 14,
  fontWeight: "bold",
  color: "white",
  flexShrink: 1,
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
  fontSize: 14,
  fontWeight: "bold",
  color: "white",
});

const EmptyState = styled.Text({
  color: "#aaa",
  fontSize: 14,
  textAlign: "center",
  flex: 1,
  marginTop: 40,
  fontStyle: "italic",
  lineHeight: 22,
});

export default ClubPlayerPerformance;
