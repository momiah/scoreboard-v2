import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import {
  sortLadderParticipantsByPlacement,
  sortTeamsByPlacement,
} from "@shared/helpers";
import type { ScoreboardProfile, TeamStats } from "@shared/types";

import { LadderContext } from "../../../context/LadderContext";
import { UserContext } from "../../../context/UserContext";
import { GameContext } from "../../../context/GameContext";
import { enrichPlayers } from "../../../helpers/enrichPlayers";
import { formatDisplayName } from "../../../helpers/formatDisplayName";
import PaginatedList from "../../../components/PaginatedList";
import PerformanceRow from "../../../components/performance/Player/PerformanceRow";
import PlayerDetails from "../../../components/Modals/PlayerDetailsModal";
import TeamDetails from "../../../components/Modals/TeamDetailsModal";
import LoadingOverlay from "../../../components/LoadingOverlay";

type StandingsMode = "players" | "teams";

interface LadderStandingsParams {
  ladderId: string;
  mode: StandingsMode;
  ladderName?: string;
}

type RankedParticipant = ScoreboardProfile & { cp: number; rank: number };
type RankedTeam = TeamStats & { rank: number };

const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return "st";
  if (j === 2 && k !== 12) return "nd";
  if (j === 3 && k !== 13) return "rd";
  return "th";
};

const LadderStandings: React.FC = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, LadderStandingsParams>, string>>();
  const { ladderId, mode, ladderName } = route.params;

  const { fetchLadderParticipants, fetchLadderTeams } =
    useContext(LadderContext);
  const { getUserById } = useContext(UserContext);
  const { recentGameResult } = useContext(GameContext);

  const [participants, setParticipants] = useState<ScoreboardProfile[]>([]);
  const [teams, setTeams] = useState<TeamStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<ScoreboardProfile | null>(
    null,
  );
  const [selectedTeam, setSelectedTeam] = useState<TeamStats | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        if (mode === "teams") {
          const rows = await fetchLadderTeams(ladderId);
          if (active) setTeams(rows);
        } else {
          const rows = await fetchLadderParticipants(ladderId);
          if (active) setParticipants(rows);
        }
      } catch (error) {
        console.error("[LadderStandings] Failed to load standings:", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [ladderId, mode, fetchLadderParticipants, fetchLadderTeams]);

  // Rank the full list once (0-win entrants unranked, appended below), stamping
  // each row's placement so search can't shuffle the numbering.
  const orderedPlayers = useMemo<RankedParticipant[]>(() => {
    const ranked = sortLadderParticipantsByPlacement(participants);
    const rankedIds = new Set(ranked.map((p) => p.userId));
    const unranked = participants.filter((p) => !rankedIds.has(p.userId));
    return [...ranked, ...unranked].map((p, index) => ({
      ...p,
      cp: p.XP ?? 0,
      rank: index < ranked.length ? index + 1 : 0,
    }));
  }, [participants]);

  const orderedTeams = useMemo<RankedTeam[]>(() => {
    const valid = teams.filter((t) => t.teamKey && Array.isArray(t.team));
    const ranked = sortTeamsByPlacement(valid);
    const rankedKeys = new Set(ranked.map((t) => t.teamKey));
    const unranked = valid.filter((t) => !rankedKeys.has(t.teamKey));
    return [...ranked, ...unranked].map((t, index) => ({
      ...t,
      rank: index < ranked.length ? index + 1 : 0,
    }));
  }, [teams]);

  const fetchPlayerPage = useCallback(
    async (page: number, pageSize: number, search: string) => {
      const query = (search ?? "").toLowerCase();
      const filtered = query
        ? orderedPlayers.filter((p) =>
            (formatDisplayName(p) || p.username || "")
              .toLowerCase()
              .includes(query),
          )
        : orderedPlayers;
      const start = (page - 1) * pageSize;
      const slice = filtered.slice(start, start + pageSize);
      const enriched = await enrichPlayers(getUserById, slice);
      return {
        items: enriched,
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      };
    },
    [orderedPlayers, getUserById],
  );

  const fetchTeamPage = useCallback(
    async (page: number, pageSize: number, search: string) => {
      const query = (search ?? "").toLowerCase();
      const filtered = query
        ? orderedTeams.filter((t) =>
            (t.team ?? []).join(" ").toLowerCase().includes(query),
          )
        : orderedTeams;
      const start = (page - 1) * pageSize;
      return {
        items: filtered.slice(start, start + pageSize),
        totalItems: filtered.length,
        totalPages: Math.ceil(filtered.length / pageSize),
      };
    },
    [orderedTeams],
  );

  const renderPlayer = useCallback(
    ({ item }: { item: RankedParticipant }) => (
      <PerformanceRow
        player={item}
        rank={item.rank}
        ladder
        cp={item.cp}
        onPress={(p: ScoreboardProfile) => setSelectedPlayer(p)}
      />
    ),
    [],
  );

  const renderTeam = useCallback(
    ({ item }: { item: RankedTeam }) => {
      const pointDifference = item.totalPointDifference || 0;
      return (
        <TeamRow onPress={() => setSelectedTeam(item)}>
          <TableCell>
            <Rank>
              {item.rank > 0 ? `${item.rank}${getOrdinalSuffix(item.rank)}` : "-"}
            </Rank>
          </TableCell>
          <TeamCell>
            <TeamNameCell>
              {(item.team ?? []).map((player, idx) => (
                <PlayerName key={`${player}-${idx}`}>{player}</PlayerName>
              ))}
            </TeamNameCell>
            {recentGameResult(item.resultLog)}
          </TeamCell>
          <TableCell>
            <StatTitle>PD</StatTitle>
            <Stat style={{ color: pointDifference < 0 ? "red" : "green" }}>
              {pointDifference}
            </Stat>
          </TableCell>
          <TableCell>
            <StatTitle>Wins</StatTitle>
            <Stat>{item.numberOfWins}</Stat>
          </TableCell>
        </TeamRow>
      );
    },
    [recentGameResult],
  );

  const isTeams = mode === "teams";
  const title = ladderName ?? "Standings";

  return (
    <Screen>
      <Header>
        <BackButton
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="white" />
        </BackButton>
        <HeaderTitle numberOfLines={1}>{title}</HeaderTitle>
        <HeaderSpacer />
      </Header>

      {loading ? (
        <LoadingOverlay visible loadingText="Standings" />
      ) : isTeams ? (
        <PaginatedList
          fetchPage={fetchTeamPage}
          renderItem={renderTeam}
          keyExtractor={(team: RankedTeam, index: number) =>
            (team.team ?? []).join("-") + index
          }
          searchPlaceholder="Search teams..."
          countLabel={(total: number) => `${total} teams`}
          emptyText="No teams yet"
        />
      ) : (
        <PaginatedList
          fetchPage={fetchPlayerPage}
          renderItem={renderPlayer}
          keyExtractor={(player: RankedParticipant) => player.userId ?? ""}
          searchPlaceholder="Search players..."
          countLabel={(total: number) => `${total} players`}
          emptyText="No players yet"
        />
      )}

      {selectedPlayer && (
        <PlayerDetails
          selectedPlayer={selectedPlayer}
          showPlayerDetails={!!selectedPlayer}
          setShowPlayerDetails={() => setSelectedPlayer(null)}
        />
      )}

      {selectedTeam && (
        <TeamDetails
          showTeamDetails={!!selectedTeam}
          setShowTeamDetails={() => setSelectedTeam(null)}
          teamStats={selectedTeam}
        />
      )}
    </Screen>
  );
};

const Screen = styled.View({
  flex: 1,
  backgroundColor: "rgb(3, 16, 31)",
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingTop: 20,
  paddingBottom: 12,
});

const BackButton = styled.TouchableOpacity({
  width: 32,
  justifyContent: "center",
});

const HeaderTitle = styled.Text({
  flex: 1,
  textAlign: "center",
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
});

const HeaderSpacer = styled.View({
  width: 32,
});

const TeamRow = styled.TouchableOpacity({
  flexDirection: "row",
  backgroundColor: "#001123",
});

const TableCell = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
  paddingTop: 20,
  paddingBottom: 20,
  borderTopWidth: 1,
  borderColor: "#262626",
});

const TeamCell = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingRight: 40,
  width: 150,
  borderTopWidth: 1,
  borderColor: "#262626",
});

const TeamNameCell = styled.View({
  justifyContent: "flex-start",
  alignItems: "flex-start",
  paddingTop: 20,
  paddingBottom: 20,
  paddingRight: 20,
  width: 130,
  gap: 20,
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
  fontSize: 14,
  color: "#aaa",
});

const Stat = styled.Text({
  fontSize: 20,
  fontWeight: "bold",
  color: "white",
});

export default LadderStandings;
