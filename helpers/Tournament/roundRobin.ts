import { generateUniqueGameId } from "../generateUniqueId";
import { Alert } from "react-native";
import moment from "moment";

import {
  PlayerWithXP,
  GameTeam,
  Game,
  FixtureDisclaimer,
  FixtureMetadata,
  FixtureResult,
} from "@shared/types";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_DOUBLES_TEAMS = 32;
const MAX_SINGLES_PLAYERS = 64;
const MAX_COURTS = 32;
const MINS_PER_GAME = 15;
const MINS_PER_DAY = 480; // 8 hours

// ─── Metadata Builder ────────────────────────────────────────────────────────

const buildMetadata = (
  totalRounds: number,
  numberOfCourts: number,
  totalGames: number,
  numTeams: number,
): FixtureMetadata => {
  const totalMatchups = (numTeams * (numTeams - 1)) / 2;
  const estimatedMinutes = totalRounds * MINS_PER_GAME;
  const estimatedHours = Math.ceil(estimatedMinutes / 60);

  const disclaimers: FixtureDisclaimer[] = [];

  if (totalMatchups % numberOfCourts !== 0) {
    disclaimers.push({
      heading: "Uneven Final Round",
      body: "The last round will have fewer games than the others.",
    });

    disclaimers.push({
      heading: "Court Imbalance",
      body: "One team will play on one court slightly more than the others.",
    });
  }

  if (estimatedMinutes > MINS_PER_DAY) {
    disclaimers.push({
      heading: "Multiple Sessions Required",
      body: `This tournament will take around ${estimatedHours} hours and will need multiple sessions to complete.`,
    });
  }

  return {
    totalRounds,
    totalGames,
    estimatedMinutes,
    estimatedHours,
    disclaimers,
  };
};

// ─── Berger Pairing Generator ────────────────────────────────────────────────

const generateAllBergerPairings = (
  n: number,
): { idx1: number; idx2: number }[] => {
  const indices = Array.from({ length: n }, (_, i) => i);
  const allPairings: { idx1: number; idx2: number }[] = [];

  for (let round = 0; round < n - 1; round++) {
    for (let match = 0; match < n / 2; match++) {
      allPairings.push({ idx1: indices[match], idx2: indices[n - 1 - match] });
    }
    const last = indices[n - 1];
    for (let i = n - 1; i > 1; i--) indices[i] = indices[i - 1];
    indices[1] = last;
  }

  return allPairings;
};

// ─── Round Builder ───────────────────────────────────────────────────────────

const buildRounds = (
  allPairings: { idx1: number; idx2: number }[],
  numberOfCourts: number,
  numSlots: number,
): { idx1: number; idx2: number }[][] => {
  const remaining = [...allPairings];
  const sitOutCount = new Array(numSlots).fill(0);
  const fullRounds: { idx1: number; idx2: number }[][] = [];
  const incompleteRounds: { idx1: number; idx2: number }[][] = [];

  while (remaining.length > 0) {
    const round: { idx1: number; idx2: number }[] = [];
    const playingThisRound = new Set<number>();

    remaining.sort((a, b) => {
      const priorityA = Math.max(sitOutCount[a.idx1], sitOutCount[a.idx2]);
      const priorityB = Math.max(sitOutCount[b.idx1], sitOutCount[b.idx2]);
      return priorityB - priorityA;
    });

    const consumedIndices: number[] = [];

    for (
      let i = 0;
      i < remaining.length && round.length < numberOfCourts;
      i++
    ) {
      const { idx1, idx2 } = remaining[i];
      if (!playingThisRound.has(idx1) && !playingThisRound.has(idx2)) {
        round.push(remaining[i]);
        playingThisRound.add(idx1);
        playingThisRound.add(idx2);
        consumedIndices.push(i);
      }
    }

    for (let i = consumedIndices.length - 1; i >= 0; i--) {
      remaining.splice(consumedIndices[i], 1);
    }

    for (let s = 0; s < numSlots; s++) {
      if (!playingThisRound.has(s)) sitOutCount[s]++;
    }

    if (round.length === numberOfCourts) fullRounds.push(round);
    else if (round.length > 0) incompleteRounds.push(round);
  }

  return [...fullRounds, ...incompleteRounds];
};

// ─── Court Assignment ────────────────────────────────────────────────────────

const getPermutations = (arr: number[]): number[][] => {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((val, i) =>
    getPermutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map((perm) => [
      val,
      ...perm,
    ]),
  );
};

const assignCourtsForRound = (
  pairings: { idx1: number; idx2: number }[],
  numberOfCourts: number,
  courtPlayCount: number[][],
  lastCourtByIndex: number[],
  numSlots: number,
): { idx1: number; idx2: number; court: number }[] => {
  const courts = Array.from({ length: numberOfCourts }, (_, i) => i + 1);

  // Permutation solver for ≤ 6 courts (max 720 permutations)
  if (numberOfCourts <= 6) {
    const permutations = getPermutations(courts);
    let bestAssignment: { idx1: number; idx2: number; court: number }[] = [];
    let bestPrimary = Infinity;
    let bestSecondary = Infinity;

    for (const perm of permutations) {
      let primary = 0;
      let secondary = 0;
      const tempCount = courtPlayCount.map((row) => [...row]);

      for (let p = 0; p < pairings.length; p++) {
        const { idx1, idx2 } = pairings[p];
        const court = perm[p];
        tempCount[idx1][court]++;
        tempCount[idx2][court]++;
        if (lastCourtByIndex[idx1] === court) secondary++;
        if (lastCourtByIndex[idx2] === court) secondary++;
      }

      for (let t = 0; t < numSlots; t++) {
        for (let c = 1; c <= numberOfCourts; c++) {
          primary += tempCount[t][c] * tempCount[t][c];
        }
      }

      if (
        primary < bestPrimary ||
        (primary === bestPrimary && secondary < bestSecondary)
      ) {
        bestPrimary = primary;
        bestSecondary = secondary;
        bestAssignment = pairings.map((pairing, i) => ({
          ...pairing,
          court: perm[i],
        }));
      }
    }

    return bestAssignment;
  }

  // Greedy fallback for > 6 courts
  const usedCourts = new Set<number>();
  const result: { idx1: number; idx2: number; court: number }[] = [];
  const totalGamesPlayed = courtPlayCount[0].reduce((a, b) => a + b, 0);
  const rotateBy = pairings.length > 0 ? totalGamesPlayed % pairings.length : 0;
  const orderedPairings = [
    ...pairings.slice(rotateBy),
    ...pairings.slice(0, rotateBy),
  ];

  for (const { idx1, idx2 } of orderedPairings) {
    let bestCourt = -1;
    let bestScore = Infinity;

    for (let c = 1; c <= numberOfCourts; c++) {
      if (usedCourts.has(c)) continue;
      const playCount = courtPlayCount[idx1][c] + courtPlayCount[idx2][c];
      const repeatPenalty =
        (lastCourtByIndex[idx1] === c ? 1 : 0) +
        (lastCourtByIndex[idx2] === c ? 1 : 0);
      const score = playCount * 10 + repeatPenalty;
      if (score < bestScore) {
        bestScore = score;
        bestCourt = c;
      }
    }

    usedCourts.add(bestCourt);
    result.push({ idx1, idx2, court: bestCourt });
  }

  return result;
};

// ─── Fixture Builder ─────────────────────────────────────────────────────────

const buildFixtures = (
  allRounds: { idx1: number; idx2: number }[][],
  slots: (GameTeam | PlayerWithXP | null)[],
  isDoubles: boolean,
  numberOfCourts: number,
  numTeams: number,
  competitionId: string,
): FixtureResult => {
  const fixtures: { round: number; games: Game[] }[] = [];
  const allCreatedGames: Game[] = [];
  let gameNumber = 1;

  const courtPlayCount: number[][] = Array.from({ length: slots.length }, () =>
    new Array(numberOfCourts + 1).fill(0),
  );
  const lastCourtByIndex = new Array(slots.length).fill(0);

  for (let roundIdx = 0; roundIdx < allRounds.length; roundIdx++) {
    const pairings = allRounds[roundIdx];

    const courtAssignments = assignCourtsForRound(
      pairings,
      numberOfCourts,
      courtPlayCount,
      lastCourtByIndex,
      slots.length,
    );

    courtAssignments.sort((a, b) => a.court - b.court);

    const roundGames: Game[] = courtAssignments.map(({ idx1, idx2, court }) => {
      const slot1 = slots[idx1]!;
      const slot2 = slots[idx2]!;

      const team1 = isDoubles
        ? {
            player1: (slot1 as GameTeam).player1,
            player2: (slot1 as GameTeam).player2,
          }
        : { player1: slot1 as PlayerWithXP, player2: null };

      const team2 = isDoubles
        ? {
            player1: (slot2 as GameTeam).player1,
            player2: (slot2 as GameTeam).player2,
          }
        : { player1: slot2 as PlayerWithXP, player2: null };

      const game: Game = {
        gameId: generateUniqueGameId({
          existingGames: allCreatedGames,
          competitionId,
        }),
        gameNumber: gameNumber++,
        team1,
        team2,
        court,
        gamescore: "",
        createdAt: new Date(),
        reportedAt: null,
        reportedTime: null,
        createdTime: moment().format("HH:mm"),
        approvalStatus: "Scheduled",
        result: null,
        numberOfApprovals: 0,
        numberOfDeclines: 0,
        reporter: "",
        approvers: [],
      };

      allCreatedGames.push(game);
      courtPlayCount[idx1][court]++;
      courtPlayCount[idx2][court]++;
      lastCourtByIndex[idx1] = court;
      lastCourtByIndex[idx2] = court;

      return game;
    });

    fixtures.push({ round: roundIdx + 1, games: roundGames });
  }

  const metadata = buildMetadata(
    allRounds.length,
    numberOfCourts,
    allCreatedGames.length,
    numTeams,
  );

  return { fixtures, metadata };
};

// ─── Doubles ────────────────────────────────────────────────────────────────

export const generateRoundRobinFixtures = ({
  teams,
  numberOfCourts,
  competitionId,
}: {
  teams: GameTeam[];
  numberOfCourts: number;
  competitionId: string;
}): FixtureResult | null => {
  const numTeams = teams.length;

  if (numTeams < 2) {
    Alert.alert("Error", "Need at least 2 teams to generate fixtures");
    return null;
  }

  if (numTeams > MAX_DOUBLES_TEAMS) {
    Alert.alert(
      "Error",
      `Doubles tournaments support a maximum of ${MAX_DOUBLES_TEAMS} teams`,
    );
    return null;
  }

  if (numberOfCourts > MAX_COURTS) {
    Alert.alert("Error", `Maximum of ${MAX_COURTS} courts supported`);
    return null;
  }

  const teamsWithBye: (GameTeam | null)[] =
    numTeams % 2 === 1 ? [...teams, null] : [...teams];
  const n = teamsWithBye.length;

  const allPairings = generateAllBergerPairings(n).filter(
    ({ idx1, idx2 }) => teamsWithBye[idx1] && teamsWithBye[idx2],
  );

  const rounds = buildRounds(allPairings, numberOfCourts, n);

  return buildFixtures(
    rounds,
    teamsWithBye,
    true,
    numberOfCourts,
    numTeams,
    competitionId,
  );
};

// ─── Singles ────────────────────────────────────────────────────────────────

export const generateSinglesRoundRobinFixtures = ({
  players,
  numberOfCourts,
  competitionId,
}: {
  players: PlayerWithXP[];
  numberOfCourts: number;
  competitionId: string;
}): FixtureResult | null => {
  const numPlayers = players.length;

  if (numPlayers < 2) {
    Alert.alert("Error", "Need at least 2 players to generate fixtures");
    return null;
  }

  if (numPlayers > MAX_SINGLES_PLAYERS) {
    Alert.alert(
      "Error",
      `Singles tournaments support a maximum of ${MAX_SINGLES_PLAYERS} players`,
    );
    return null;
  }

  if (numberOfCourts > MAX_COURTS) {
    Alert.alert("Error", `Maximum of ${MAX_COURTS} courts supported`);
    return null;
  }

  const playersWithBye: (PlayerWithXP | null)[] =
    numPlayers % 2 === 1 ? [...players, null] : [...players];
  const n = playersWithBye.length;

  const allPairings = generateAllBergerPairings(n).filter(
    ({ idx1, idx2 }) => playersWithBye[idx1] && playersWithBye[idx2],
  );

  const rounds = buildRounds(allPairings, numberOfCourts, n);

  return buildFixtures(
    rounds,
    playersWithBye,
    false,
    numberOfCourts,
    numPlayers,
    competitionId,
  );
};
