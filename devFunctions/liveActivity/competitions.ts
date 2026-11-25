import type { SeedCity } from "./roster";

interface Session {
  days: string[];
  startTime: string;
  endTime: string;
}

interface BaseCompetition {
  key: string;
  name: string;
  description: string;
  city: SeedCity;
  ownerUsername: string;
  maxPlayers: number;
  players: number;
  type: "Singles" | "Doubles";
  startDate: string;
  sessions: Session[];
}

export interface SeedLeague extends BaseCompetition {
  kind: "league";
  lengthInMonths: string;
  games: number;
}

export interface SeedTournament extends BaseCompetition {
  kind: "tournament";
  mode: "Round Robin" | "Knockout";
  doublesMode?: "Fixed Doubles" | "Mixed Doubles";
  numberOfCourts: number;
  playDays: string[];
  gamesToPlay?: number;
}

export type SeedCompetition = SeedLeague | SeedTournament;

const SAT_MORNING = {
  days: ["Saturday"],
  startTime: "10:00",
  endTime: "13:00",
};
const WEEKNIGHT = (day: string) => ({
  days: [day],
  startTime: "19:00",
  endTime: "22:00",
});
const SUN_AFTERNOON = {
  days: ["Sunday"],
  startTime: "14:00",
  endTime: "17:00",
};

export const SEED_LEAGUES: SeedLeague[] = [
  {
    kind: "league",
    key: "ldn-summer",
    name: "London Summer League 2026",
    description:
      "Summer doubles for East London. Rotate partners, play as often as you like, top four take home bragging rights.",
    city: "London",
    ownerUsername: "KwameM",
    maxPlayers: 32,
    players: 29,
    type: "Doubles",
    startDate: "06-06-2026",
    lengthInMonths: "3",
    games: 190,
    sessions: [SAT_MORNING, WEEKNIGHT("Wednesday")],
  },
  {
    kind: "league",
    key: "man-summer",
    name: "Manchester Summer Singles",
    description:
      "Singles league for all levels. Arrange your games with anyone in the league and post the score straight after.",
    city: "Manchester",
    ownerUsername: "RyanD",
    maxPlayers: 16,
    players: 14,
    type: "Singles",
    startDate: "07-06-2026",
    lengthInMonths: "3",
    games: 130,
    sessions: [WEEKNIGHT("Tuesday"), SUN_AFTERNOON],
  },
  {
    kind: "league",
    key: "bhm-summer",
    name: "Birmingham Summer Doubles",
    description:
      "Thursday night doubles over the summer. Bring a partner or get paired on the night.",
    city: "Birmingham",
    ownerUsername: "SunilR",
    maxPlayers: 16,
    players: 14,
    type: "Doubles",
    startDate: "04-06-2026",
    lengthInMonths: "3",
    games: 90,
    sessions: [WEEKNIGHT("Thursday")],
  },
  {
    kind: "league",
    key: "brs-summer",
    name: "Bristol Summer Singles",
    description: "Small friendly singles league. Play everyone at least once!",
    city: "Bristol",
    ownerUsername: "AlexS",
    maxPlayers: 8,
    players: 7,
    type: "Singles",
    startDate: "13-06-2026",
    lengthInMonths: "2",
    games: 56,
    sessions: [SAT_MORNING, WEEKNIGHT("Monday")],
  },
  {
    kind: "league",
    key: "ldn-winter",
    name: "London Winter League 2026",
    description:
      "The big one. Winter doubles league running to the new year, Saturday mornings and Wednesday nights. Mixed abilities welcome.",
    city: "London",
    ownerUsername: "KwameM",
    maxPlayers: 64,
    players: 58,
    type: "Doubles",
    startDate: "03-10-2026",
    lengthInMonths: "3",
    games: 170,
    sessions: [SAT_MORNING, WEEKNIGHT("Wednesday")],
  },
  {
    kind: "league",
    key: "man-winter",
    name: "Manchester Singles League",
    description:
      "Autumn/winter singles. Challenge anyone, post your score, climb the table.",
    city: "Manchester",
    ownerUsername: "RyanD",
    maxPlayers: 32,
    players: 29,
    type: "Singles",
    startDate: "04-10-2026",
    lengthInMonths: "3",
    games: 120,
    sessions: [WEEKNIGHT("Tuesday"), SUN_AFTERNOON],
  },
  {
    kind: "league",
    key: "bhm-winter",
    name: "Birmingham Midweek Doubles",
    description: "Midweek doubles through the winter. Courts booked 7-10pm.",
    city: "Birmingham",
    ownerUsername: "SunilR",
    maxPlayers: 16,
    players: 14,
    type: "Doubles",
    startDate: "04-11-2026",
    lengthInMonths: "3",
    games: 36,
    sessions: [WEEKNIGHT("Wednesday"), WEEKNIGHT("Thursday")],
  },
  {
    kind: "league",
    key: "brs-winter",
    name: "Bristol Social Singles",
    description: "Back for another season. Social singles, all welcome.",
    city: "Bristol",
    ownerUsername: "AlexS",
    maxPlayers: 8,
    players: 7,
    type: "Singles",
    startDate: "17-10-2026",
    lengthInMonths: "2",
    games: 36,
    sessions: [SAT_MORNING, WEEKNIGHT("Monday")],
  },
];

export const SEED_TOURNAMENTS: SeedTournament[] = [
  {
    kind: "tournament",
    key: "brs-ko",
    name: "Bristol Autumn Knockout",
    description: "16-player singles knockout. Lose and you're out!",
    city: "Bristol",
    ownerUsername: "AlexS",
    maxPlayers: 16,
    players: 16,
    type: "Singles",
    mode: "Knockout",
    numberOfCourts: 4,
    startDate: "31-10-2026",
    playDays: ["31-10-2026"],
    sessions: [{ days: ["Saturday"], startTime: "10:00", endTime: "15:00" }],
  },
  {
    kind: "tournament",
    key: "ldn-ko",
    name: "London Doubles Knockout Cup",
    description:
      "32 pairs, one day, one trophy. Fixed doubles knockout with a third-place playoff.",
    city: "London",
    ownerUsername: "priyash",
    maxPlayers: 64,
    players: 64,
    type: "Doubles",
    doublesMode: "Fixed Doubles",
    mode: "Knockout",
    numberOfCourts: 8,
    startDate: "14-11-2026",
    playDays: ["14-11-2026"],
    sessions: [{ days: ["Saturday"], startTime: "09:30", endTime: "18:00" }],
  },
  {
    kind: "tournament",
    key: "bhm-rr",
    name: "Birmingham Singles Shootout",
    description: "Everyone plays everyone. Seven players, one afternoon.",
    city: "Birmingham",
    ownerUsername: "SunilR",
    maxPlayers: 8,
    players: 7,
    type: "Singles",
    mode: "Round Robin",
    numberOfCourts: 3,
    startDate: "15-11-2026",
    playDays: ["15-11-2026"],
    sessions: [{ days: ["Sunday"], startTime: "12:00", endTime: "17:00" }],
  },
  {
    kind: "tournament",
    key: "man-mix",
    name: "Manchester Mixed Doubles Classic",
    description:
      "Balanced teams drawn on the day, round robin format. Great way to meet new partners.",
    city: "Manchester",
    ownerUsername: "amirak",
    maxPlayers: 16,
    players: 14,
    type: "Doubles",
    doublesMode: "Mixed Doubles",
    mode: "Round Robin",
    numberOfCourts: 3,
    startDate: "22-11-2026",
    playDays: ["22-11-2026"],
    sessions: [{ days: ["Sunday"], startTime: "11:00", endTime: "16:00" }],
  },
  {
    kind: "tournament",
    key: "man-ko",
    name: "Manchester Winter Knockout",
    description:
      "32-player singles knockout played over the weekends. Quarter-finals on the 28th.",
    city: "Manchester",
    ownerUsername: "amirak",
    maxPlayers: 32,
    players: 32,
    type: "Singles",
    mode: "Knockout",
    numberOfCourts: 4,
    startDate: "14-11-2026",
    playDays: ["14-11-2026", "21-11-2026"],
    gamesToPlay: 24,
    sessions: [{ days: ["Saturday"], startTime: "10:00", endTime: "16:00" }],
  },
  {
    kind: "tournament",
    key: "ldn-open",
    name: "London Winter Doubles Open",
    description:
      "Fixed pairs round robin, played Sunday mornings until mid-December.",
    city: "London",
    ownerUsername: "priyash",
    maxPlayers: 32,
    players: 28,
    type: "Doubles",
    doublesMode: "Fixed Doubles",
    mode: "Round Robin",
    numberOfCourts: 6,
    startDate: "08-11-2026",
    playDays: ["08-11-2026", "15-11-2026", "22-11-2026"],
    gamesToPlay: 36,
    sessions: [{ days: ["Sunday"], startTime: "09:30", endTime: "13:00" }],
  },
];

export const SEED_COMPETITIONS: SeedCompetition[] = [
  ...SEED_LEAGUES,
  ...SEED_TOURNAMENTS,
];
