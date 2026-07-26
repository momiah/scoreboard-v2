import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";

import { db } from "../services/firebase.config";
import { COLLECTION_NAMES } from "@shared";
import { enrichPlayers } from "./enrichPlayers";

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
 * Sort an aggregated player list by the same ordering PlayerPerformance uses:
 * wins → total point difference → XP. Callers must enrich (XP) first.
 */
export const sortClubPlayers = (players: ClubPlayerStat[]): ClubPlayerStat[] =>
  [...players].sort(
    (a, b) =>
      (b.numberOfWins || 0) - (a.numberOfWins || 0) ||
      (b.totalPointDifference || 0) - (a.totalPointDifference || 0) ||
      (b.XP || 0) - (a.XP || 0),
  );

type GetUserById = (
  userId: string,
) => Promise<{ profileDetail?: { XP?: number } } | null>;

/**
 * Fetch, aggregate, enrich and rank a club's full player leaderboard.
 * The returned array is sorted so the winner is index 0 (rank = index + 1).
 */
export const getClubPlayerLeaderboard = async ({
  clubId,
  getUserById,
}: {
  clubId: string;
  getUserById: GetUserById;
}): Promise<ClubPlayerStat[]> => {
  const clubFilter = where("clubId", "==", clubId);

  const [membersSnap, leaguesSnap, tournamentsSnap] = await Promise.all([
    getDocs(collection(db, COLLECTION_NAMES.clubs, clubId, "participants")),
    getDocs(query(collection(db, COLLECTION_NAMES.leagues), clubFilter)),
    getDocs(query(collection(db, COLLECTION_NAMES.tournaments), clubFilter)),
  ]);

  const players = buildClubPlayerMap({
    members: membersSnap.docs.map((d) => d.data() as RawMember),
    leagues: leaguesSnap.docs.map((d) => d.data() as RawCompetitionData),
    tournaments: tournamentsSnap.docs.map((d) => d.data() as RawCompetitionData),
  });

  const enriched = (await enrichPlayers(
    getUserById,
    players,
  )) as ClubPlayerStat[];

  return sortClubPlayers(enriched);
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
 * Returns null if the club no longer exists.
 */
export const getUserClubActivity = async ({
  clubId,
  userId,
  getUserById,
}: {
  clubId: string;
  userId: string;
  getUserById: GetUserById;
}): Promise<ClubActivity | null> => {
  const [clubSnap, leaderboard] = await Promise.all([
    getDoc(doc(db, COLLECTION_NAMES.clubs, clubId)),
    getClubPlayerLeaderboard({ clubId, getUserById }),
  ]);

  if (!clubSnap.exists()) return null;

  const clubData = clubSnap.data() as {
    clubName?: string;
    clubLocation?: string;
  };
  const index = leaderboard.findIndex((p) => p.userId === userId);
  const userRow = index >= 0 ? leaderboard[index] : undefined;

  return {
    clubId,
    clubName: clubData.clubName ?? "Club",
    clubLocation: clubData.clubLocation ?? "",
    wins: userRow?.numberOfWins ?? 0,
    userRank: index >= 0 ? index + 1 : 0,
  };
};
