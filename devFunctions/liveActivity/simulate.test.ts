import moment from "moment";
import type {
  CompetitionLocation,
  Game,
  League,
  Tournament,
} from "@shared/types";
import { getGamePlayerIds, isKnockoutComplete } from "@shared/helpers";
import { getUsernameRuleError } from "@shared/helpers/signupFields";
import { validateBadmintonScores } from "../../helpers/validateBadmintonScores";
import fs from "fs";
import path from "path";
import { LiveActivity, simulateLiveActivity } from "./simulate";
import { SEED_LEAGUES, SEED_TOURNAMENTS } from "./competitions";
import { ROSTER, SeedCity } from "./roster";

jest.mock("react-native", () => ({ Alert: { alert: jest.fn() } }));
const RANKS = [
  ...new Map(
    [
      ...fs
        .readFileSync(
          path.join(__dirname, "../../rankingMedals/ranking/ranks.js"),
          "utf8",
        )
        .replace(/^\s*\/\/.*$/gm, "")
        .matchAll(/name: "([^"]+)",\s*xp: (\d+)/g),
    ].map((m) => [m[1], { name: m[1], xp: Number(m[2]) }]),
  ).values(),
].sort((a, b) => a.xp - b.xp);

const court = (city: SeedCity): CompetitionLocation => ({
  city,
  country: "United Kingdom",
  countryCode: "GB",
  postCode: "",
  address: "",
  courtName: `${city} Sports Centre`,
  courtId: `${city}-court`,
});

const NOW = moment("25-11-2026 14:00", "DD-MM-YYYY HH:mm");

let activity: LiveActivity;
beforeAll(async () => {
  activity = await simulateLiveActivity({
    now: NOW,
    courts: {
      London: court("London"),
      Manchester: court("Manchester"),
      Birmingham: court("Birmingham"),
      Bristol: court("Bristol"),
    },
  });
});

const isApproved = (g: Game) => g.approvalStatus === "approved";
const tournamentGames = (t: Tournament) => t.fixtures.flatMap((r) => r.games);
const approvedGames = () => [
  ...activity.leagues.flatMap((l) => l.games.filter(isApproved)),
  ...activity.tournaments.flatMap((t) => tournamentGames(t).filter(isApproved)),
];
const scoresOf = (g: Game) =>
  g.gamescore.split("-").map((s) => Number(s.trim()));

describe("seeded players", () => {
  it("are unique, valid and hyphen-free", () => {
    const usernames = activity.users.map((u) => u.usernameLower);
    expect(new Set(usernames).size).toBe(ROSTER.length);
    activity.users.forEach((u) => {
      expect(getUsernameRuleError(u.username)).toBeNull();
      expect(u.userId).toMatch(/^[A-Za-z0-9]{28}$/);
    });
  });

  it("have profile totals equal to every approved game they played", () => {
    const games = approvedGames();
    activity.users.forEach((user) => {
      const mine = games.filter((g) =>
        getGamePlayerIds(g).includes(user.userId),
      );
      const wins = mine.filter(
        (g) =>
          (g.result!.winner.team === "Team 1" ? g.team1 : g.team2) &&
          [
            (g.result!.winner.team === "Team 1" ? g.team1 : g.team2).player1
              ?.userId,
            (g.result!.winner.team === "Team 1" ? g.team1 : g.team2).player2
              ?.userId,
          ].includes(user.userId),
      );
      expect(user.profileDetail.numberOfGamesPlayed).toBe(mine.length);
      expect(user.profileDetail.numberOfWins).toBe(wins.length);
      expect(user.profileDetail.numberOfLosses).toBe(mine.length - wins.length);
      expect(user.profileDetail.XP).toBeGreaterThanOrEqual(20);
    });
  });
});

describe("seeded leagues", () => {
  it("match the plan's size and fill", () => {
    SEED_LEAGUES.forEach((config) => {
      const league = activity.leagues.find(
        (l) => l.leagueName === config.name,
      )!;
      expect(league.leagueParticipants).toHaveLength(config.players);
      expect(league.participantIds).toHaveLength(config.players);
      expect(league.maxPlayers).toBe(config.maxPlayers);
      expect(league.games.length).toBeGreaterThanOrEqual(20);
    });
  });

  it("have standings that add up to their approved games", () => {
    activity.leagues.forEach((league: League) => {
      const games = league.games.filter(isApproved);
      league.leagueParticipants.forEach((p) => {
        const played = games.filter((g) =>
          getGamePlayerIds(g).includes(p.userId!),
        );
        expect(p.numberOfGamesPlayed).toBe(played.length);
      });
    });
  });

  it("only hold games inside the season and before now", () => {
    activity.leagues.forEach((league) => {
      const start = moment(league.startDate, "DD-MM-YYYY");
      const end = moment(league.endDate, "DD-MM-YYYY");
      league.games.forEach((g) => {
        const at = moment(g.createdAt);
        expect(at.isBefore(NOW)).toBe(true);
        expect(at.isSameOrAfter(start, "day")).toBe(true);
        expect(at.isBefore(end, "day")).toBe(true);
      });
    });
  });

  it("leave only the last day's games pending", () => {
    activity.leagues.forEach((league) =>
      league.games
        .filter((g) => !isApproved(g))
        .forEach((g) =>
          expect(NOW.diff(moment(g.createdAt), "hours", true)).toBeLessThan(24),
        ),
    );
  });
});

describe("seeded tournaments", () => {
  it("are played as planned", () => {
    SEED_TOURNAMENTS.forEach((config) => {
      const t = activity.tournaments.find(
        (x) => x.tournamentName === config.name,
      )!;
      const played = tournamentGames(t).filter(isApproved).length;
      expect(t.tournamentParticipants).toHaveLength(config.players);
      expect(t.gamesCompleted).toBe(played);
      if (config.gamesToPlay) {
        expect(played).toBe(config.gamesToPlay);
      } else {
        expect(played).toBe(t.numberOfGames);
        if (config.mode === "Knockout") {
          expect(isKnockoutComplete(t.fixtures)).toBe(true);
        }
      }
    });
  });

  it("have standings that add up to their approved games", () => {
    activity.tournaments.forEach((t) => {
      const games = tournamentGames(t).filter(isApproved);
      t.tournamentParticipants.forEach((p) => {
        const played = games.filter((g) =>
          getGamePlayerIds(g).includes(p.userId!),
        );
        expect(p.numberOfGamesPlayed).toBe(played.length);
      });
    });
  });

  it("keep game ids on the day the fixtures were drawn", () => {
    activity.tournaments.forEach((t) =>
      tournamentGames(t).forEach((g) =>
        expect(g.gameId).not.toContain(moment().format("DD-MM-YYYY")),
      ),
    );
  });
});

describe("every posted game", () => {
  it("has a valid badminton score", () => {
    approvedGames().forEach((g) => {
      const [a, b] = scoresOf(g);
      expect(validateBadmintonScores(a, b)).toBeNull();
    });
  });

  it("fits in a Firestore document", () => {
    [...activity.leagues, ...activity.tournaments].forEach((doc) =>
      expect(JSON.stringify(doc).length).toBeLessThan(900_000),
    );
  });
});

it("spreads players across the ranks", () => {
  const rankOf = (xp: number) =>
    [...RANKS].reverse().find((r: { xp: number }) => xp >= r.xp)!.name;
  const counts: Record<string, number> = {};
  activity.users.forEach((u) => {
    const name = rankOf(u.profileDetail.XP);
    counts[name] = (counts[name] ?? 0) + 1;
  });
  expect(Object.keys(counts).length).toBeGreaterThan(4);
});
