import { collection, getDocs, getDoc, doc, query, where } from "firebase/firestore";

import { db } from "../services/firebase.config";
import { COLLECTION_NAMES } from "@shared";
import { getPlayerRankInCompetition } from "@shared/helpers/getRankInCompetition";
import type { ScoreboardProfile } from "@shared/types";
import { formatClubLocation, type ClubLocation } from "./formatClubLocation";

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
    clubLocation?: ClubLocation | string;
  };
  const userRow = players.find((p) => p.userId === userId);

  return {
    clubId,
    clubName: clubData.clubName ?? "Club",
    clubLocation: formatClubLocation(clubData.clubLocation),
    wins: userRow?.numberOfWins ?? 0,
    userRank: getPlayerRankInCompetition(
      players as unknown as ScoreboardProfile[],
      userId,
    ),
  };
};
