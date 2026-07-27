import React, { useState, useEffect, useCallback, useContext } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";

import LineTabs from "../../../../components/LineTabs";
import PlayerPerformance from "../../../../components/performance/Player/PlayerPerformance";
import TeamPerformance from "../../../../components/performance/Team/TeamPerformance";
import LeaguePerformance from "./performance/LeaguePerformance";
import TournamentPerformance from "./performance/TournamentPerformance";

import { UserContext } from "../../../../context/UserContext";
import { enrichPlayers } from "../../../../helpers/enrichPlayers";
import {
  buildClubPlayerMap,
  ClubPlayerStat,
} from "../../../../helpers/clubPlayerStats";
import { db } from "../../../../services/firebase.config";
import { COLLECTION_NAMES } from "@shared";
import { USE_MOCK_DATA, MOCK_PLAYERS, MOCK_TEAMS } from "../mockClubData";

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
// Player aggregation lives in helpers/clubPlayerStats so the profile "Clubs"
// tab can reuse the exact same accumulation. Team aggregation stays local.

interface AggregatedTeam {
  teamKey: string;
  team?: string[];
  numberOfWins: number;
  totalPointDifference: number;
  averagePointDifference: number;
  resultLog: string[];
  [key: string]: unknown;
}

const mergeIntoTeam = (
  map: Map<string, AggregatedTeam>,
  t: {
    teamKey?: string;
    team?: string[];
    numberOfWins?: number;
    totalPointDifference?: number;
    averagePointDifference?: number;
    resultLog?: string[];
  },
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

  const [playersData, setPlayersData] = useState<ClubPlayerStat[]>([]);
  const [teamsData, setTeamsData] = useState<AggregatedTeam[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const fetchAndAggregate = useCallback(async () => {
    if (USE_MOCK_DATA) {
      setPlayersData(MOCK_PLAYERS as unknown as ClubPlayerStat[]);
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
        getDocs(
          query(collection(db, COLLECTION_NAMES.tournaments), clubFilter),
        ),
      ]);

      // ── Players ──────────────────────────────────────────────────────────
      // Accumulate every member's stats across the club's leagues + tournaments
      const players = buildClubPlayerMap({
        members: membersSnap.docs.map((d) => d.data()),
        leagues: leaguesSnap.docs.map((d) => d.data()),
        tournaments: tournamentsSnap.docs.map((d) => d.data()),
      });

      // Enrich with global XP (PlayerPerformance applies the final sort)
      const enriched = (await enrichPlayers(
        getUserById,
        players,
      )) as ClubPlayerStat[];
      setPlayersData(enriched);

      // ── Teams ─────────────────────────────────────────────────────────────
      const teamMap = new Map<string, AggregatedTeam>();
      leaguesSnap.forEach((doc) => {
        const data = doc.data();
        (data.leagueTeams ?? data.teams ?? []).forEach((t: AggregatedTeam) =>
          mergeIntoTeam(teamMap, t),
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
          <PlayerPerformance playersData={dataLoaded ? playersData : []} />
        );
      case "team":
        return (
          <TeamPerformance leagueTeams={dataLoaded ? teamsData : undefined} />
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
      <LineTabs
        tabs={PERFORMANCE_SUB_TABS.map((t) => ({ key: t.key, label: t.label }))}
        activeTab={activeTab}
        onTabPress={setActiveTab}
        fontSize={13}
      />
      {renderContent()}
    </>
  );
};

export default ClubPerformance;
