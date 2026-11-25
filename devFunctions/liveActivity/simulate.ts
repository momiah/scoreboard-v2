import moment, { Moment } from "moment";
import {
  ccImageEndpoint,
  leagueSchema,
  locationSchema,
  prizeTypes,
  profileDetailSchema,
  scoreboardProfileSchema,
  tournamentSchema,
  userProfileSchema,
} from "@shared";
import type {
  CompetitionLocation,
  Fixtures,
  Game,
  GameTeam,
  League,
  Player,
  PlayerWithXP,
  ScoreboardProfile,
  TeamStats,
  Tournament,
  UserProfile,
} from "@shared/types";
import {
  applyLeagueGameResults,
  generateInitialTeamStats,
  getGamePlayerIds,
  isShellGame,
} from "@shared/helpers";
import { calculateEndDate } from "../../helpers/calculateEndDate";
import { calculateWin } from "../../helpers/calculateWin";
import { formatDisplayName } from "../../helpers/formatDisplayName";
import {
  generateRoundRobinFixtures,
  generateSinglesRoundRobinFixtures,
} from "../../helpers/Tournament/roundRobin";
import { generateTournamentKnockoutBrackets } from "../../helpers/Tournament/knockout";
import { generateMixedDoublesTeams } from "../../helpers/Tournament/teamGeneration";
import { applyApprovedTournamentGame } from "../../helpers/Tournament/applyApprovedTournamentGame";
import { ROSTER, RosterEntry, SeedCity, SEED_CITY_LOCATIONS } from "./roster";
import {
  SEED_COMPETITIONS,
  SeedCompetition,
  SeedLeague,
  SeedTournament,
} from "./competitions";

const DATE = "DD-MM-YYYY";
const TZ_OFFSET_FORMAT = "DD-MM-YYYY HH:mm";

// ── Deterministic randomness ───────────────────────────────────────────────

export type Rng = () => number;

export const createRng = (seed: number): Rng => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const gauss = (rng: Rng) => {
  const u = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
};
const between = (rng: Rng, min: number, max: number) =>
  min + Math.floor(rng() * (max - min + 1));
const shuffle = <T>(rng: Rng, items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const weightedPick = <T>(rng: Rng, items: T[], weight: (item: T) => number) => {
  const total = items.reduce((sum, item) => sum + weight(item), 0);
  let roll = rng() * total;
  for (const item of items) {
    roll -= weight(item);
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
};

const ID_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const randomId = (rng: Rng, length: number, chars = ID_CHARS) =>
  Array.from({ length }, () => chars[Math.floor(rng() * chars.length)]).join(
    "",
  );

// ── Players ─────────────────────────────────────────────────────────────────

export interface SeedPlayer extends RosterEntry {
  userId: string;
  skill: number;
  activity: number;
  memberSince: Moment;
}

const ORGANISER_USERNAMES = new Set(
  SEED_COMPETITIONS.map((competition) => competition.ownerUsername),
);

const buildPlayers = (rng: Rng): SeedPlayer[] =>
  ROSTER.map((entry) => {
    const organiser = ORGANISER_USERNAMES.has(entry.username);
    return {
      ...entry,
      userId: randomId(rng, 28),
      skill: 1450 + 170 * gauss(rng) + (organiser ? 80 : 0),
      activity: organiser ? 1.6 : 0.45 + rng() * 1.1,
      memberSince: moment("2025-01-01").add(between(rng, 0, 500), "days"),
    };
  });

const buildUser = (player: SeedPlayer, rng: Rng): UserProfile => ({
  ...userProfileSchema,
  firstName: player.firstName,
  lastName: player.lastName,
  username: player.username,
  usernameLower: player.username.toLowerCase(),
  email: "",
  showEmail: false,
  handPreference: player.handPreference,
  provider: rng() < 0.3 ? "google" : "email_password",
  location: {
    ...locationSchema,
    ...SEED_CITY_LOCATIONS[player.city],
  },
  userId: player.userId,
  profileImage: ccImageEndpoint,
  profileViews: between(rng, 3, 60),
  profileDetail: {
    ...JSON.parse(JSON.stringify(profileDetailSchema)),
    memberSince: player.memberSince.format("MMM YYYY"),
  },
});

const gamePlayer = (user: UserProfile): Player => ({
  userId: user.userId,
  firstName: user.firstName,
  lastName: user.lastName,
  username: user.username,
  displayName: formatDisplayName(user),
});

const participantFor = (user: UserProfile, isOwner: boolean) =>
  ({
    ...JSON.parse(JSON.stringify(scoreboardProfileSchema)),
    username: user.username,
    firstName: isOwner ? user.firstName : user.firstName.split(" ")[0],
    lastName: isOwner ? user.lastName : user.lastName.split(" ")[0],
    userId: user.userId,
    memberSince: user.profileDetail.memberSince,
    profileImage: user.profileImage,
  }) as ScoreboardProfile;

// ── Results ─────────────────────────────────────────────────────────────────

const winChance = (skillA: number, skillB: number) =>
  1 / (1 + Math.pow(10, (skillB - skillA) / 320));

// A badminton game to 21, deuce up to 30.
export const playScore = (rng: Rng, team1WinChance: number) => {
  const team1Wins = rng() < team1WinChance;
  const closeness = 1 - Math.abs(team1WinChance - 0.5) * 2;
  let winner = 21;
  let loser: number;
  if (rng() < 0.04 + 0.14 * closeness) {
    loser = 20 + Math.floor(rng() * rng() * 10);
    winner = loser === 29 ? 30 : loser + 2;
  } else {
    const mean = 9 + 8 * closeness;
    loser = Math.round(mean + 3 * gauss(rng));
    loser = Math.min(19, Math.max(4, loser));
  }
  return team1Wins ? [winner, loser] : [loser, winner];
};

// ── Shared state while games are applied in date order ─────────────────────

interface State {
  rng: Rng;
  now: Moment;
  players: Map<string, SeedPlayer>;
  users: Map<string, UserProfile>;
}

const usersFor = (state: State, ids: string[]) =>
  ids.map((id) => state.users.get(id)!);

const saveUsers = (state: State, users: UserProfile[] | undefined) =>
  (users ?? []).forEach((user) => state.users.set(user.userId, user));

const sideSkill = (state: State, team: GameTeam) => {
  const ids = [team.player1?.userId, team.player2?.userId].filter(
    Boolean,
  ) as string[];
  return (
    ids.reduce((sum, id) => sum + state.players.get(id)!.skill, 0) / ids.length
  );
};

const sideIds = (team: GameTeam) =>
  [team.player1?.userId, team.player2?.userId].filter(Boolean) as string[];

// Mostly the winners post the score; the approver is one of the opponents.
const reporterAndApprover = (state: State, game: Game, team1Won: boolean) => {
  const winners = sideIds(team1Won ? game.team1 : game.team2);
  const losers = sideIds(team1Won ? game.team2 : game.team1);
  const winnerReports = state.rng() < 0.72;
  const reporterSide = winnerReports ? winners : losers;
  const approverSide = winnerReports ? losers : winners;
  return {
    reporter: reporterSide[between(state.rng, 0, reporterSide.length - 1)],
    approver: approverSide[between(state.rng, 0, approverSide.length - 1)],
  };
};

const approve = (
  state: State,
  game: Game,
  approverId: string,
  reportedAt: Moment,
) => {
  if (state.rng() < 0.1) {
    const autoApprovedAt = reportedAt
      .clone()
      .add(24, "hours")
      .add(between(state.rng, 1, 29), "minutes");
    return {
      game: {
        ...game,
        numberOfApprovals: 0,
        approvers: [{ userId: "system", username: "AutoApproval" }],
        approvalStatus: "approved" as const,
        autoApproved: true,
        autoApprovedAt: autoApprovedAt.toDate(),
      },
      approvedAt: autoApprovedAt,
    };
  }
  const approver = state.users.get(approverId)!;
  return {
    game: {
      ...game,
      numberOfApprovals: 1,
      approvers: [{ userId: approver.userId, username: approver.username }],
      approvalStatus: "approved" as const,
    },
    approvedAt: reportedAt.clone().add(between(state.rng, 4, 600), "minutes"),
  };
};

// ── Timeline ────────────────────────────────────────────────────────────────

interface TimelineEvent {
  at: Moment;
  order: number;
  run: () => Promise<void>;
}

// ── Competition plumbing ────────────────────────────────────────────────────

const competitionId = (rng: Rng, name: string, startDate: string) =>
  `${name.replace(/\s+/g, "-")}-${startDate}-${randomId(
    rng,
    5,
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  )}`;

const gameIdFor = (id: string, date: string, counters: Map<string, number>) => {
  const key = `${id}|${date}`;
  const next = (counters.get(key) ?? 0) + 1;
  counters.set(key, next);
  return `${id.slice(-5)}-${date}-game-${next}`;
};

const pickParticipants = (
  state: State,
  competition: SeedCompetition,
  owner: SeedPlayer,
) => {
  const pool = [...state.players.values()].filter(
    (p) => p.city === competition.city && p.userId !== owner.userId,
  );
  if (pool.length < competition.players - 1) {
    throw new Error(
      `Not enough ${competition.city} players for ${competition.name}`,
    );
  }
  const chosen: SeedPlayer[] = [owner];
  while (chosen.length < competition.players) {
    const remaining = pool.filter((p) => !chosen.includes(p));
    chosen.push(weightedPick(state.rng, remaining, (p) => p.activity));
  }
  return chosen;
};

const playingTime = (competition: SeedCompetition) =>
  competition.sessions.flatMap((session) =>
    session.days.map((day) => ({
      day,
      startTime: session.startTime,
      endTime: session.endTime,
    })),
  );

const atTime = (date: string, time: string) =>
  moment(`${date} ${time}`, TZ_OFFSET_FORMAT);

const ownerFields = (user: UserProfile) => ({
  userId: user.userId,
  username: user.username,
  firstName: user.firstName,
  lastName: user.lastName,
  location: user.location,
});

// ── Leagues ─────────────────────────────────────────────────────────────────

interface Slot {
  start: Moment;
  end: Moment;
}

const leagueSlots = (
  league: SeedLeague,
  endDate: string,
  now: Moment,
  blocked: Set<string>,
): Slot[] => {
  const last = moment.min(moment(endDate, DATE).subtract(1, "day"), now);
  const slots: Slot[] = [];
  for (
    let day = moment(league.startDate, DATE);
    day.isSameOrBefore(last, "day");
    day.add(1, "day")
  ) {
    const date = day.format(DATE);
    if (blocked.has(`${league.city}|${date}`)) continue;
    for (const session of league.sessions) {
      if (!session.days.includes(day.format("dddd"))) continue;
      const start = atTime(date, session.startTime);
      if (start.isAfter(now)) continue;
      slots.push({ start, end: atTime(date, session.endTime) });
    }
  }
  return slots;
};

const buildLeague = (
  state: State,
  config: SeedLeague,
  location: CompetitionLocation,
  blocked: Set<string>,
  events: TimelineEvent[],
  counters: Map<string, number>,
): League => {
  const { rng } = state;
  const owner = [...state.players.values()].find(
    (p) => p.username === config.ownerUsername,
  )!;
  const members = pickParticipants(state, config, owner);
  const leagueId = competitionId(rng, config.name, config.startDate);
  const endDate = calculateEndDate(config.startDate, config.lengthInMonths);
  const ownerUser = state.users.get(owner.userId)!;
  const isDoubles = config.type === "Doubles";

  const league: League = {
    ...leagueSchema,
    leagueId,
    leagueName: config.name,
    leagueDescription: config.description,
    leagueType: config.type,
    maxPlayers: config.maxPlayers,
    privacy: "Public",
    startDate: config.startDate,
    leagueLengthInMonths: config.lengthInMonths,
    endDate,
    location,
    countryCode: location.countryCode,
    leagueOwner: ownerFields(ownerUser),
    leagueAdmins: [{ userId: ownerUser.userId, username: ownerUser.username }],
    leagueParticipants: members.map((m, i) =>
      participantFor(state.users.get(m.userId)!, i === 0),
    ),
    leagueTeams: [],
    participantIds: members.map((m) => m.userId),
    games: [],
    prizeType: prizeTypes.COMMUNITY,
    leagueImage: null as unknown as string,
    playingTime: playingTime(config),
    createdAt: moment(config.startDate, DATE)
      .subtract(between(rng, 6, 16), "days")
      .hour(between(rng, 9, 22))
      .minute(between(rng, 0, 59))
      .toDate(),
    clubId: null,
    pendingInvites: [],
    pendingRequests: [],
    approvalLimit: 1,
    prizesDistributed: false,
    prizeDistributionDate: null,
  };

  const slots = leagueSlots(config, endDate, state.now, blocked);
  if (slots.length === 0) throw new Error(`${config.name} has no sessions`);

  // Regular partners: most doubles players turn up with the same partner.
  const partners = new Map<string, string>();
  if (isDoubles) {
    const order = shuffle(rng, members).slice(
      0,
      Math.floor((members.length * 0.7) / 2) * 2,
    );
    for (let i = 0; i < order.length; i += 2) {
      partners.set(order[i].userId, order[i + 1].userId);
      partners.set(order[i + 1].userId, order[i].userId);
    }
  }

  const slotIndexes = Array.from({ length: config.games }, () =>
    between(rng, 0, slots.length - 1),
  ).sort((a, b) => a - b);
  const playedInSlot = new Map<number, Map<string, number>>();

  for (const slotIndex of slotIndexes) {
    const slot = slots[slotIndex];
    const counts = playedInSlot.get(slotIndex) ?? new Map<string, number>();
    playedInSlot.set(slotIndex, counts);
    const weight = (p: SeedPlayer) =>
      p.activity / Math.pow(1 + (counts.get(p.userId) ?? 0), 2);

    const chosen: SeedPlayer[] = [];
    const pickNext = () => {
      const available = members.filter((m) => !chosen.includes(m));
      const next = weightedPick(rng, available, weight);
      chosen.push(next);
      return next;
    };
    const pickPartnerOf = (player: SeedPlayer) => {
      const partnerId = partners.get(player.userId);
      const partner = members.find((m) => m.userId === partnerId);
      if (partner && !chosen.includes(partner) && rng() < 0.75) {
        chosen.push(partner);
        return partner;
      }
      return pickNext();
    };

    const a1 = pickNext();
    const a2 = isDoubles ? pickPartnerOf(a1) : null;
    const b1 = pickNext();
    const b2 = isDoubles ? pickPartnerOf(b1) : null;
    chosen.forEach((p) =>
      counts.set(p.userId, (counts.get(p.userId) ?? 0) + 1),
    );

    const playedAt = slot.start
      .clone()
      .add(
        between(rng, 0, Math.max(0, slot.end.diff(slot.start, "minutes") - 25)),
        "minutes",
      );
    const reportedAt = playedAt.clone().add(between(rng, 18, 45), "minutes");
    if (reportedAt.isAfter(state.now)) continue;

    const side = (x: SeedPlayer, y: SeedPlayer | null): GameTeam => ({
      player1: gamePlayer(state.users.get(x.userId)!),
      player2: y ? gamePlayer(state.users.get(y.userId)!) : null,
    });
    const sideA = side(a1, a2);
    const sideB = side(b1, b2);
    const [scoreA, scoreB] = playScore(
      rng,
      winChance(sideSkill(state, sideA), sideSkill(state, sideB)),
    );
    const aWon = scoreA > scoreB;
    const draft = { team1: sideA, team2: sideB } as Game;
    const { reporter, approver } = reporterAndApprover(state, draft, aWon);
    const reporterOnA = sideIds(sideA).includes(reporter);
    const team1 = {
      ...(reporterOnA ? sideA : sideB),
      score: reporterOnA ? scoreA : scoreB,
    };
    const team2 = {
      ...(reporterOnA ? sideB : sideA),
      score: reporterOnA ? scoreB : scoreA,
    };
    const date = reportedAt.format(DATE);

    const reported: Game = {
      gameId: gameIdFor(leagueId, reportedAt.format(DATE), counters),
      gamescore: `${team1.score} - ${team2.score}`,
      createdAt: reportedAt.toDate(),
      date,
      createdTime: reportedAt.format("HH:mm"),
      team1,
      team2,
      result: calculateWin(team1, team2, config.type) as Game["result"],
      numberOfApprovals: 0,
      numberOfDeclines: 0,
      approvalStatus: "Pending",
      reporter,
      approvers: [],
    };

    const stillPending =
      state.now.diff(reportedAt, "hours", true) < 24 && rng() < 0.5;
    const index = league.games.length;
    league.games.push(reported);
    if (stillPending) continue;

    const { game, approvedAt } = approve(state, reported, approver, reportedAt);
    if (approvedAt.isAfter(state.now)) continue;
    events.push({
      at: approvedAt,
      order: events.length,
      run: async () => {
        league.games[index] = game;
        const ids = getGamePlayerIds(game);
        const results = await applyLeagueGameResults({
          games: [game],
          participants: league.leagueParticipants,
          teams: league.leagueTeams,
          users: usersFor(state, ids),
          isDoubles,
        });
        league.leagueParticipants = results.participants;
        if (isDoubles) league.leagueTeams = results.teams;
        saveUsers(state, results.users);
      },
    });
  }
  return league;
};

// ── Tournaments ─────────────────────────────────────────────────────────────

const withXp = (state: State, user: UserProfile): PlayerWithXP => ({
  ...(gamePlayer(user) as PlayerWithXP),
  XP: state.users.get(user.userId)!.profileDetail.XP,
});

// Generators stamp ids and times with "now"; restamp them with when the admin
// generated the fixtures.
const restampFixtures = (
  fixtures: Fixtures[],
  tournamentId: string,
  generatedAt: Moment,
): Fixtures[] => {
  const today = `-${moment().format(DATE)}-`;
  const then = `-${generatedAt.format(DATE)}-`;
  return fixtures.map((round) => ({
    ...round,
    games: round.games.map((game) => ({
      ...game,
      gameId: game.gameId.replace(today, then),
      createdAt: generatedAt.toDate(),
      createdTime: generatedAt.format("HH:mm"),
    })),
  }));
};

const fixtureTeams = (
  state: State,
  config: SeedTournament,
  members: SeedPlayer[],
): GameTeam[] => {
  const players = members.map((m) => withXp(state, state.users.get(m.userId)!));
  if (config.type === "Singles") {
    return shuffle(state.rng, players).map((p) => ({
      player1: p,
      player2: null,
    }));
  }
  if (config.doublesMode === "Mixed Doubles") {
    return generateMixedDoublesTeams({
      generationType: "Balanced",
      participants: players,
    });
  }
  const ordered = shuffle(state.rng, players);
  const teams: GameTeam[] = [];
  for (let i = 0; i < ordered.length; i += 2) {
    teams.push({ player1: ordered[i], player2: ordered[i + 1] });
  }
  return teams;
};

const allGames = (fixtures: Fixtures[]) =>
  [...fixtures]
    .sort((a, b) => a.round - b.round)
    .flatMap((round) =>
      [...round.games].sort(
        (a, b) => (a.gameNumber ?? 0) - (b.gameNumber ?? 0),
      ),
    );

const replaceGame = (fixtures: Fixtures[], game: Game) =>
  fixtures.map((round) => ({
    ...round,
    games: round.games.map((g) => (g.gameId === game.gameId ? game : g)),
  }));

const buildTournament = (
  state: State,
  config: SeedTournament,
  location: CompetitionLocation,
  events: TimelineEvent[],
): Tournament => {
  const { rng } = state;
  const owner = [...state.players.values()].find(
    (p) => p.username === config.ownerUsername,
  )!;
  const members = pickParticipants(state, config, owner);
  const tournamentId = competitionId(rng, config.name, config.startDate);
  const ownerUser = state.users.get(owner.userId)!;
  const isKnockout = config.mode === "Knockout";
  const firstDay = config.playDays[0];
  const session = config.sessions[0];

  const tournament: Tournament & Record<string, unknown> = {
    ...tournamentSchema,
    tournamentId,
    tournamentName: config.name,
    tournamentDescription: config.description,
    tournamentType: config.type,
    tournamentMode: config.mode,
    maxPlayers: config.maxPlayers,
    privacy: "Public",
    startDate: config.startDate,
    endDate: null as unknown as string,
    location,
    countryCode: location.countryCode,
    tournamentOwner: ownerFields(ownerUser),
    tournamentAdmins: [
      { userId: ownerUser.userId, username: ownerUser.username },
    ],
    tournamentParticipants: members.map((m, i) =>
      participantFor(state.users.get(m.userId)!, i === 0),
    ),
    tournamentTeams: [],
    participantIds: members.map((m) => m.userId),
    games: [],
    fixtures: [],
    fixturesGenerated: false,
    prizeType: prizeTypes.COMMUNITY,
    tournamentImage: null as unknown as string,
    playingTime: playingTime(config),
    createdAt: moment(config.startDate, DATE)
      .subtract(between(rng, 10, 24), "days")
      .hour(between(rng, 9, 22))
      .minute(between(rng, 0, 59))
      .toDate(),
    clubId: null,
    pendingInvites: [],
    pendingRequests: [],
    approvalLimit: 1,
    prizesDistributed: false,
    prizeDistributionDate: null,
  };

  const generatedAt = atTime(firstDay, session.startTime).subtract(
    between(rng, 20, 50),
    "minutes",
  );

  events.push({
    at: generatedAt,
    order: events.length,
    run: async () => {
      const teams = fixtureTeams(state, config, members);
      const result = isKnockout
        ? generateTournamentKnockoutBrackets({
            teams,
            numberOfCourts: config.numberOfCourts,
            competitionId: tournamentId,
          })
        : config.type === "Singles"
          ? generateSinglesRoundRobinFixtures({
              players: teams.map((t) => t.player1 as PlayerWithXP),
              numberOfCourts: config.numberOfCourts,
              competitionId: tournamentId,
            })
          : generateRoundRobinFixtures({
              teams,
              numberOfCourts: config.numberOfCourts,
              competitionId: tournamentId,
            });
      if (!result) throw new Error(`No fixtures for ${config.name}`);
      const fixtures = restampFixtures(
        result.fixtures,
        tournamentId,
        generatedAt,
      );
      Object.assign(tournament, {
        fixtures,
        fixturesGenerated: true,
        fixturesGeneratedAt: generatedAt.toDate(),
        numberOfCourts: config.numberOfCourts,
        generationMode: config.type === "Doubles" ? config.doublesMode : "",
        generationType:
          config.doublesMode === "Mixed Doubles" ? "Balanced" : "",
        numberOfGames: fixtures.reduce((n, r) => n + r.games.length, 0),
        gamesCompleted: 0,
        tournamentTeams:
          config.type === "Doubles" ? generateInitialTeamStats(fixtures) : [],
      });
    },
  });

  const quota = config.gamesToPlay;
  const perDay = quota ? Math.ceil(quota / config.playDays.length) : Infinity;
  let played = 0;

  config.playDays.forEach((day, dayIndex) => {
    events.push({
      at: atTime(day, session.startTime),
      order: events.length,
      run: async () => {
        let cursor = atTime(day, session.startTime);
        let playedToday = 0;
        const onePerDay = isKnockout && config.playDays.length > 1;
        const dayLimit = onePerDay
          ? Infinity
          : Math.min(perDay, (quota ?? Infinity) - played);
        const startRound = isKnockout && onePerDay ? dayIndex + 1 : 0;

        for (;;) {
          const fixtures = tournament.fixtures;
          const open = allGames(fixtures).filter(
            (g) =>
              g.approvalStatus === "Scheduled" &&
              !isShellGame(g) &&
              (!onePerDay ||
                fixtures.find((r) => r.games.includes(g))!.round ===
                  startRound),
          );
          if (open.length === 0 || playedToday >= dayLimit) break;
          // Third-place playoff goes on before the final.
          open.sort(
            (a, b) =>
              Number(!!b.isThirdPlacePlayoff) - Number(!!a.isThirdPlacePlayoff),
          );
          const next = open[0];
          await playTournamentGame(state, tournament, next, cursor);
          played++;
          playedToday++;
          if (playedToday % config.numberOfCourts === 0) {
            cursor = cursor.clone().add(between(rng, 16, 24), "minutes");
          }
        }
      },
    });
  });

  return tournament as Tournament;
};

const playTournamentGame = async (
  state: State,
  tournament: Tournament & Record<string, unknown>,
  scheduled: Game,
  roundStart: Moment,
) => {
  const { rng } = state;
  const [score1, score2] = playScore(
    rng,
    winChance(
      sideSkill(state, scheduled.team1),
      sideSkill(state, scheduled.team2),
    ),
  );
  const team1 = { ...scheduled.team1, score: score1 };
  const team2 = { ...scheduled.team2, score: score2 };
  const reportedAt = roundStart.clone().add(between(rng, 14, 30), "minutes");
  const { reporter, approver } = reporterAndApprover(
    state,
    scheduled,
    score1 > score2,
  );
  const approverUser = state.users.get(approver)!;
  const game: Game = {
    ...scheduled,
    gamescore: `${score1}-${score2}`,
    date: reportedAt.format(DATE),
    reportedAt: reportedAt.toDate(),
    reportedTime: reportedAt.format("HH:mm"),
    team1,
    team2,
    result: calculateWin(
      team1,
      team2,
      tournament.tournamentType,
    ) as Game["result"],
    numberOfApprovals: 1,
    numberOfDeclines: 0,
    approvalStatus: "approved",
    reporter,
    approvers: [
      { userId: approverUser.userId, username: approverUser.username },
    ],
  };
  const fixtures = replaceGame(tournament.fixtures, game);
  const applied = await applyApprovedTournamentGame({
    tournament: { ...tournament, fixtures },
    game,
    users: usersFor(state, getGamePlayerIds(game)),
  });
  tournament.fixtures = applied.fixtures;
  tournament.tournamentParticipants = applied.participants;
  if (tournament.tournamentType === "Doubles") {
    tournament.tournamentTeams = applied.teams as TeamStats[];
  }
  tournament.gamesCompleted = ((tournament.gamesCompleted as number) ?? 0) + 1;
  saveUsers(state, applied.usersToUpdate);
};

// ── Entry point ─────────────────────────────────────────────────────────────

export interface LiveActivity {
  users: UserProfile[];
  leagues: League[];
  tournaments: Tournament[];
}

export const SEED_NUMBER = 20261125;

export const simulateLiveActivity = async ({
  courts,
  now,
  seed = SEED_NUMBER,
}: {
  courts: Record<SeedCity, CompetitionLocation>;
  now: Moment;
  seed?: number;
}): Promise<LiveActivity> => {
  const rng = createRng(seed);
  const players = buildPlayers(rng);
  const state: State = {
    rng,
    now,
    players: new Map(players.map((p) => [p.userId, p])),
    users: new Map(players.map((p) => [p.userId, buildUser(p, rng)])),
  };

  const blocked = new Set(
    SEED_COMPETITIONS.filter(
      (c): c is SeedTournament => c.kind === "tournament",
    ).flatMap((t) => t.playDays.map((d) => `${t.city}|${d}`)),
  );

  const events: TimelineEvent[] = [];
  const counters = new Map<string, number>();
  const leagues: League[] = [];
  const tournaments: Tournament[] = [];
  for (const config of SEED_COMPETITIONS) {
    if (config.kind === "league") {
      leagues.push(
        buildLeague(
          state,
          config,
          courts[config.city],
          blocked,
          events,
          counters,
        ),
      );
    } else {
      tournaments.push(
        buildTournament(state, config, courts[config.city], events),
      );
    }
  }

  events.sort((a, b) => a.at.valueOf() - b.at.valueOf() || a.order - b.order);
  for (const event of events) await event.run();

  return {
    users: [...state.users.values()],
    leagues,
    tournaments,
  };
};
