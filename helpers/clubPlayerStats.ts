import {
  collection,
  collectionGroup,
  getDocs,
  getDoc,
  doc,
  query,
  where,
} from "firebase/firestore";

import { db } from "../services/firebase.config";
import { COLLECTION_NAMES } from "@shared";
import { getPlayerRankInCompetition } from "@shared/helpers/getRankInCompetition";
import type { ScoreboardProfile } from "@shared/types";

/**
 * Shared club player aggregation.
 *
 * A club's player leaderboard is the accumulation of every participant's stats
 * across all of the club's leagues AND tournaments. This is the single source
 * of truth used by both the club performance "Player" tab and the profile
 * "Clubs" activity tab, so the wins/rank shown in both stay consistent.
 */

export interface ClubPlayerStat {
  userId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  numberOfWins: number;
  totalPointDifference: number;
  resultLog: string[];
  numberOfGamesPlayed: number;
  numberOfLosses: number;
  XP?: number;
  [key: string]: unknown;
}

interface RawParticipant {
  userId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  numberOfWins?: number;
  totalPointDifference?: number;
  resultLog?: string[];
  numberOfGamesPlayed?: number;
  numberOfLosses?: number;
}

interface RawCompetitionData {
  leagueParticipants?: RawParticipant[];
  tournamentParticipants?: RawParticipant[];
  participants?: RawParticipant[];
}

interface RawMember {
  userId?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

const mergeIntoPlayer = (
  map: Map<string, ClubPlayerStat>,
  base: RawMember,
  stats: RawParticipant,
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

/**
 * Build the accumulated player map from already-fetched club data (pure).
 *
 * Every club member is seeded with zero stats so they always appear, then
 * league and tournament participant stats are layered on top.
 */
export const buildClubPlayerMap = ({
  members,
  leagues,
  tournaments,
}: {
  members: RawMember[];
  leagues: RawCompetitionData[];
  tournaments: RawCompetitionData[];
}): ClubPlayerStat[] => {
  const playerMap = new Map<string, ClubPlayerStat>();

  // Seed all club members with zero stats
  members.forEach((m) => {
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
  leagues.forEach((data) => {
    const participants = data.leagueParticipants ?? data.participants ?? [];
    participants.forEach((p) => {
      const base = playerMap.get(p.userId ?? "") ?? p;
      mergeIntoPlayer(playerMap, base, p);
    });
  });

  // Layer tournament stats on top
  tournaments.forEach((data) => {
    const participants = data.tournamentParticipants ?? data.participants ?? [];
    participants.forEach((p) => {
      const base = playerMap.get(p.userId ?? "") ?? p;
      mergeIntoPlayer(playerMap, base, p);
    });
  });

  return Array.from(playerMap.values());
};

/**
 * Fetch a club's fully-accumulated player list (unsorted). Every member is
 * seeded, then league + tournament stats are layered on. Ordering/ranking is
 * left to the shared leaderboard helpers so it stays identical to the rest of
 * the app (League/Tournament screens, prize distribution, etc.).
 */
export const getClubAggregatedPlayers = async ({
  clubId,
}: {
  clubId: string;
}): Promise<ClubPlayerStat[]> => {
  const clubFilter = where("clubId", "==", clubId);

  const [membersSnap, leaguesSnap, tournamentsSnap] = await Promise.all([
    getDocs(collection(db, COLLECTION_NAMES.clubs, clubId, "participants")),
    getDocs(query(collection(db, COLLECTION_NAMES.leagues), clubFilter)),
    getDocs(query(collection(db, COLLECTION_NAMES.tournaments), clubFilter)),
  ]);

  return buildClubPlayerMap({
    members: membersSnap.docs.map((d) => d.data() as RawMember),
    leagues: leaguesSnap.docs.map((d) => d.data() as RawCompetitionData),
    tournaments: tournamentsSnap.docs.map((d) => d.data() as RawCompetitionData),
  });
};

/**
 * All clubs a user belongs to, resolved from the `participants` subcollections
 * directly (owner, admins and members are all stored there). This is the source
 * of truth for membership — unlike deriving clubs from the competitions a user
 * plays in, it also surfaces clubs the user has joined but has no games in yet.
 *
 * Uses a collection-group query, which needs a COLLECTION_GROUP single-field
 * index on `participants.userId` (see firestore.indexes.json). If that index
 * isn't deployed yet the query throws — we swallow it and return [] so callers
 * can fall back to their competition-derived list instead of erroring.
 */
export const getMemberClubIds = async (userId: string): Promise<string[]> => {
  if (!userId) return [];
  try {
    const snap = await getDocs(
      query(collectionGroup(db, "participants"), where("userId", "==", userId)),
    );
    const ids = snap.docs
      // participant doc → participants collection → club doc → clubs collection
      .filter((d) => d.ref.parent.parent?.parent.id === COLLECTION_NAMES.clubs)
      .map((d) => d.ref.parent.parent?.id)
      .filter((id): id is string => !!id);
    return Array.from(new Set(ids));
  } catch (error) {
    console.error("getMemberClubIds failed (participants index missing?):", error);
    return [];
  }
};

export interface ClubTeamStat {
  teamKey: string;
  team: string[];
  numberOfWins: number;
  totalPointDifference: number;
}

export interface ClubSummaryStats {
  /** Highest-ranked player across the club's competitions (null if no games). */
  topPlayer: ClubPlayerStat | null;
  /** Highest-ranked team across the club's competitions (null if no games). */
  topTeam: ClubTeamStat | null;
  /** Approved games played across all of the club's leagues + tournaments. */
  totalGamesPlayed: number;
}

const isApprovedGame = (game: unknown): boolean =>
  String((game as { approvalStatus?: string })?.approvalStatus ?? "")
    .toLowerCase() === "approved";

// League games live on `games`; tournament games are nested in `fixtures[].games`.
const countApprovedGames = (data: {
  games?: unknown[];
  fixtures?: { games?: unknown[] }[];
}): number => {
  const direct = Array.isArray(data.games) ? data.games : [];
  const fixtureGames = Array.isArray(data.fixtures)
    ? data.fixtures.flatMap((f) => (Array.isArray(f?.games) ? f.games : []))
    : [];
  return [...direct, ...fixtureGames].filter(isApprovedGame).length;
};

/**
 * Club-level headline stats for the Summary tab: the top player, top team, and
 * total games played, aggregated across every league + tournament the club
 * manages. Reuses the same player accumulation as the performance/activity tabs.
 */
export const getClubSummaryStats = async ({
  clubId,
}: {
  clubId: string;
}): Promise<ClubSummaryStats> => {
  const clubFilter = where("clubId", "==", clubId);

  const [membersSnap, leaguesSnap, tournamentsSnap] = await Promise.all([
    getDocs(collection(db, COLLECTION_NAMES.clubs, clubId, "participants")),
    getDocs(query(collection(db, COLLECTION_NAMES.leagues), clubFilter)),
    getDocs(query(collection(db, COLLECTION_NAMES.tournaments), clubFilter)),
  ]);

  const leagues = leaguesSnap.docs.map((d) => d.data() as RawCompetitionData);
  const tournaments = tournamentsSnap.docs.map(
    (d) => d.data() as RawCompetitionData,
  );

  // Top player — accumulate members across all comps, rank by wins → point diff.
  const players = buildClubPlayerMap({
    members: membersSnap.docs.map((d) => d.data() as RawMember),
    leagues,
    tournaments,
  }).sort(
    (a, b) =>
      b.numberOfWins - a.numberOfWins ||
      b.totalPointDifference - a.totalPointDifference,
  );
  const topPlayer = players.find((p) => p.numberOfWins > 0) ?? null;

  // Top team — merge team stats keyed by teamKey across all comps.
  const teamMap = new Map<string, ClubTeamStat>();
  const mergeTeams = (
    raw: { leagueTeams?: unknown[]; tournamentTeams?: unknown[]; teams?: unknown[] },
  ) => {
    const teams = (raw.leagueTeams ??
      raw.tournamentTeams ??
      raw.teams ??
      []) as {
      teamKey?: string;
      team?: string[];
      numberOfWins?: number;
      totalPointDifference?: number;
    }[];
    teams.forEach((t) => {
      if (!t.teamKey || !Array.isArray(t.team)) return;
      const existing = teamMap.get(t.teamKey);
      if (!existing) {
        teamMap.set(t.teamKey, {
          teamKey: t.teamKey,
          team: t.team,
          numberOfWins: t.numberOfWins ?? 0,
          totalPointDifference: t.totalPointDifference ?? 0,
        });
      } else {
        existing.numberOfWins += t.numberOfWins ?? 0;
        existing.totalPointDifference += t.totalPointDifference ?? 0;
      }
    });
  };
  [...leaguesSnap.docs, ...tournamentsSnap.docs].forEach((d) =>
    mergeTeams(d.data() as Record<string, unknown>),
  );
  const topTeam =
    Array.from(teamMap.values())
      .sort(
        (a, b) =>
          b.numberOfWins - a.numberOfWins ||
          b.totalPointDifference - a.totalPointDifference,
      )
      .find((t) => t.numberOfWins > 0) ?? null;

  const totalGamesPlayed = [...leagues, ...tournaments].reduce(
    (sum, data) => sum + countApprovedGames(data as never),
    0,
  );

  return { topPlayer, topTeam, totalGamesPlayed };
};

export interface ClubActivity {
  clubId: string;
  clubName: string;
  clubLocation: string;
  /** Accumulated wins for the user across the club's leagues + tournaments. */
  wins: number;
  /** The user's 1-based rank on the club leaderboard (0 if they don't appear). */
  userRank: number;
}

/**
 * Resolve a single user's activity within a club: the club's name/location plus
 * the user's accumulated wins and their rank on the club leaderboard.
 *
 * Ranking uses the shared `getPlayerRankInCompetition` (wins → point
 * difference) — the exact same helper that ranks a single league/tournament on
 * the profile Activity tab, the competition screens, and the backend prize
 * distribution — so a club's aggregated leaderboard follows the same rules.
 *
 * Returns null if the club no longer exists.
 */
export const getUserClubActivity = async ({
  clubId,
  userId,
}: {
  clubId: string;
  userId: string;
}): Promise<ClubActivity | null> => {
  const [clubSnap, players] = await Promise.all([
    getDoc(doc(db, COLLECTION_NAMES.clubs, clubId)),
    getClubAggregatedPlayers({ clubId }),
  ]);

  if (!clubSnap.exists()) return null;

  const clubData = clubSnap.data() as {
    clubName?: string;
    clubLocation?: { city?: string; country?: string };
  };
  const userRow = players.find((p) => p.userId === userId);
  const location = clubData.clubLocation;

  return {
    clubId,
    clubName: clubData.clubName ?? "Club",
    clubLocation: location?.city
      ? `${location.city}, ${location.country}`
      : "",
    wins: userRow?.numberOfWins ?? 0,
    userRank: getPlayerRankInCompetition(
      players as unknown as ScoreboardProfile[],
      userId,
    ),
  };
};
