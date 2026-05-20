import React, { useState, useEffect, useCallback, useContext } from "react";
import { ScrollView, Dimensions } from "react-native";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import styled from "styled-components/native";

import PlayerPerformance from "../../../../components/performance/Player/PlayerPerformance";
import TeamPerformance from "../../../../components/performance/Team/TeamPerformance";
import LeaguePerformance from "./performance/LeaguePerformance";
import TournamentPerformance from "./performance/TournamentPerformance";

import { UserContext } from "../../../../context/UserContext";
import { enrichPlayers } from "../../../../helpers/enrichPlayers";
import { db } from "../../../../services/firebase.config";
import { COLLECTION_NAMES } from "@shared";
import {
  USE_MOCK_DATA,
  MOCK_PLAYERS,
  MOCK_TEAMS,
} from "../mockClubData";

const { width: screenWidth } = Dimensions.get("window");

const PERFORMANCE_SUB_TABS = [
  { key: "player", label: "Player" },
  { key: "team", label: "Team" },
  { key: "league", label: "League" },
  { key: "tournament", label: "Tournament" },
] as const;

type PerformanceSubTab = (typeof PERFORMANCE_SUB_TABS)[number]["key"];

interface ClubPerformanceProps {
  clubId: string;
  initialSubTab?: PerformanceSubTab;
}

// ─── Aggregation helpers ──────────────────────────────────────────────────────

interface AggregatedPlayer {
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  numberOfWins: number;
  totalPointDifference: number;
  resultLog: string[];
  numberOfGamesPlayed: number;
  numberOfLosses: number;
  [key: string]: unknown;
}

interface AggregatedTeam {
  teamKey: string;
  team?: string[];
  numberOfWins: number;
  totalPointDifference: number;
  averagePointDifference: number;
  resultLog: string[];
  [key: string]: unknown;
}

const mergeIntoPlayer = (
  map: Map<string, AggregatedPlayer>,
  base: { userId?: string; firstName?: string; lastName?: string; username?: string },
  stats: {
    numberOfWins?: number;
    totalPointDifference?: number;
    resultLog?: string[];
    numberOfGamesPlayed?: number;
    numberOfLosses?: number;
  },
) => {
  if (!base.userId) return;
  const existing = map.get(base.userId);
  if (!existing) {
    map.set(base.userId, {
      userId: base.userId,
      firstName: base.firstName,
      lastName: base.lastName,
      username: base.username,
      numberOfWins: stats.numberOfWins ?? 0,
      totalPointDifference: stats.totalPointDifference ?? 0,
      resultLog: [...(stats.resultLog ?? [])],
      numberOfGamesPlayed: stats.numberOfGamesPlayed ?? 0,
      numberOfLosses: stats.numberOfLosses ?? 0,
    });
  } else {
    existing.numberOfWins += stats.numberOfWins ?? 0;
    existing.totalPointDifference += stats.totalPointDifference ?? 0;
    existing.numberOfGamesPlayed += stats.numberOfGamesPlayed ?? 0;
    existing.numberOfLosses += stats.numberOfLosses ?? 0;
    const combined = [...existing.resultLog, ...(stats.resultLog ?? [])];
    existing.resultLog = combined.slice(-10);
  }
};

const mergeIntoTeam = (
  map: Map<string, AggregatedTeam>,
  t: { teamKey?: string; team?: string[]; numberOfWins?: number; totalPointDifference?: number; averagePointDifference?: number; resultLog?: string[] },
) => {
  if (!t.teamKey || !Array.isArray(t.team)) return;
  const existing = map.get(t.teamKey);
  if (!existing) {
    map.set(t.teamKey, {
      ...t,
      teamKey: t.teamKey,
      numberOfWins: t.numberOfWins ?? 0,
      totalPointDifference: t.totalPointDifference ?? 0,
      averagePointDifference: t.averagePointDifference ?? 0,
      resultLog: [...(t.resultLog ?? [])],
    });
  } else {
    existing.numberOfWins += t.numberOfWins ?? 0;
    existing.totalPointDifference += t.totalPointDifference ?? 0;
    const combined = [...existing.resultLog, ...(t.resultLog ?? [])];
    existing.resultLog = combined.slice(-10);
  }
};

// ─── Component ───────────────────────────────────────────────────────────────

const ClubPerformance: React.FC<ClubPerformanceProps> = ({
  clubId,
  initialSubTab = "player",
}) => {
  const { getUserById } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState<PerformanceSubTab>(initialSubTab);

  const [playersData, setPlayersData] = useState<AggregatedPlayer[]>([]);
  const [teamsData, setTeamsData] = useState<AggregatedTeam[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const fetchAndAggregate = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setPlayersData(MOCK_PLAYERS as unknown as AggregatedPlayer[]);
      setTeamsData(MOCK_TEAMS as unknown as AggregatedTeam[]);
      setDataLoaded(true);
      return;
    }

    if (!clubId) return;

    try {
      const clubFilter = where("clubId", "==", clubId);

      // Fetch all data in parallel
      const [membersSnap, leaguesSnap, tournamentsSnap] = await Promise.all([
        getDocs(collection(db, COLLECTION_NAMES.clubs, clubId, "participants")),
        getDocs(query(collection(db, COLLECTION_NAMES.leagues), clubFilter)),
        getDocs(query(collection(db, COLLECTION_NAMES.tournaments), clubFilter)),
      ]);

      // ── Players ──────────────────────────────────────────────────────────
      // Seed all club members with zero stats so they always appear
      const playerMap = new Map<string, AggregatedPlayer>();
      membersSnap.forEach((doc) => {
        const m = doc.data();
        if (!m.userId) return;
        playerMap.set(m.userId, {
          userId: m.userId,
          firstName: m.firstName,
          lastName: m.lastName,
          username: m.username,
          numberOfWins: 0,
          totalPointDifference: 0,
          resultLog: [],
          numberOfGamesPlayed: 0,
          numberOfLosses: 0,
        });
      });

      // Layer league stats on top
      leaguesSnap.forEach((doc) => {
        const data = doc.data();
        const participants = data.leagueParticipants ?? data.participants ?? [];
        participants.forEach((p: AggregatedPlayer) => {
          const base = playerMap.get(p.userId) ?? p;
          mergeIntoPlayer(playerMap, base, p);
        });
      });

      // Layer tournament stats on top
      tournamentsSnap.forEach((doc) => {
        const data = doc.data();
        const participants =
          data.tournamentParticipants ?? data.participants ?? [];
        participants.forEach((p: AggregatedPlayer) => {
          const base = playerMap.get(p.userId) ?? p;
          mergeIntoPlayer(playerMap, base, p);
        });
      });

      // Enrich with global XP then sort
      const enriched = (await enrichPlayers(
        getUserById,
        Array.from(playerMap.values()),
      )) as AggregatedPlayer[];
      setPlayersData(enriched);

      // ── Teams ─────────────────────────────────────────────────────────────
      const teamMap = new Map<string, AggregatedTeam>();
      leaguesSnap.forEach((doc) => {
        const data = doc.data();
        (data.leagueTeams ?? data.teams ?? []).forEach(
          (t: AggregatedTeam) => mergeIntoTeam(teamMap, t),
        );
      });
      tournamentsSnap.forEach((doc) => {
        const data = doc.data();
        (data.tournamentTeams ?? data.teams ?? []).forEach(
          (t: AggregatedTeam) => mergeIntoTeam(teamMap, t),
        );
      });

      const sortedTeams = Array.from(teamMap.values()).sort(
        (a, b) =>
          b.numberOfWins - a.numberOfWins ||
          b.totalPointDifference - a.totalPointDifference,
      );
      setTeamsData(sortedTeams);
    } catch (e) {
      console.error("Club performance fetch error:", e);
    } finally {
      setDataLoaded(true);
    }
  }, [clubId, getUserById]);

  useEffect(() => {
    fetchAndAggregate();
  }, [fetchAndAggregate]);

  const renderContent = () => {
    switch (activeTab) {
      case "player":
        return (
          <PlayerPerformance
            playersData={dataLoaded ? playersData : []}
          />
        );
      case "team":
        return (
          <TeamPerformance
            leagueTeams={dataLoaded ? teamsData : undefined}
          />
        );
      case "league":
        return <LeaguePerformance clubId={clubId} />;
      case "tournament":
        return <TournamentPerformance clubId={clubId} />;
      default:
        return null;
    }
  };

  return (
    <>
      <TabRow>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 4 }}
        >
          {PERFORMANCE_SUB_TABS.map((t) => (
            <SubTabItem
              key={t.key}
              isActive={activeTab === t.key}
              onPress={() => setActiveTab(t.key)}
            >
              <SubTabText isActive={activeTab === t.key}>
                {t.label}
              </SubTabText>
            </SubTabItem>
          ))}
        </ScrollView>
      </TabRow>
      {renderContent()}
    </>
  );
};

const TabRow = styled.View({
  flexDirection: "row",
  marginBottom: 0,
  paddingTop: 4,
});

const SubTabItem = styled.TouchableOpacity<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    flex: 1,
    minWidth: (screenWidth - 32) / 4,
    borderBottomColor: isActive ? "#00A2FF" : "rgb(9, 33, 62)",
    borderBottomWidth: 2,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  }),
);

const SubTabText = styled.Text<{ isActive: boolean }>(
  ({ isActive }: { isActive: boolean }) => ({
    fontSize: 13,
    fontWeight: "bold",
    color: isActive ? "#fff" : "#aaa",
    textAlign: "center",
  }),
);

export default ClubPerformance;
