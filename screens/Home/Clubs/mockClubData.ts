/**
 * Mock data for Club tabs — toggle USE_MOCK_DATA in each tab component to test UI.
 * Remove this file and all USE_MOCK_DATA references once real data is confirmed working.
 */

// ─── Leagues ────────────────────────────────────────────────────────────────

export const MOCK_LEAGUES = [
  {
    id: "mock-league-1",
    name: "Club Singles League",
    type: "Singles",
    location: { courtName: "Court 1 - Dhaka" },
    participants: [
      { userId: "u1" },
      { userId: "u2" },
      { userId: "u3" },
      { userId: "u4" },
    ],
    admins: [{ userId: "u1", username: "yasin99" }],
    owner: { userId: "u1", username: "yasin99" },
    endDate: "31-12-2026",
    maxPlayers: 8,
    privacy: "Public",
    fixturesGenerated: true,
  },
  {
    id: "mock-league-2",
    name: "Club Doubles League",
    type: "Doubles",
    location: { courtName: "Court 2 - Gulshan" },
    participants: [{ userId: "u1" }, { userId: "u2" }],
    admins: [],
    owner: { userId: "u2", username: "rayyan_r" },
    endDate: "01-01-2025",
    maxPlayers: 8,
    privacy: "Public",
    fixturesGenerated: false,
  },
  {
    id: "mock-league-3",
    name: "Evening Pro League",
    type: "Singles",
    location: { courtName: "Court 3 - Banani" },
    participants: [
      { userId: "u1" },
      { userId: "u2" },
      { userId: "u3" },
    ],
    admins: [{ userId: "u3", username: "saif_s" }],
    owner: { userId: "u3", username: "saif_s" },
    endDate: "30-06-2026",
    maxPlayers: 4,
    privacy: "Public",
    fixturesGenerated: false,
  },
];

// ─── Tournaments ─────────────────────────────────────────────────────────────

export const MOCK_TOURNAMENTS = [
  {
    id: "mock-tournament-1",
    name: "Club Cup 2026",
    type: "Knockout",
    location: { courtName: "Main Court - Dhanmondi" },
    participants: [
      { userId: "u1" },
      { userId: "u2" },
      { userId: "u3" },
      { userId: "u4" },
      { userId: "u5" },
    ],
    admins: [{ userId: "u1", username: "yasin99" }],
    owner: { userId: "u1", username: "yasin99" },
    endDate: "15-08-2026",
    maxPlayers: 8,
    privacy: "Public",
    fixturesGenerated: true,
  },
  {
    id: "mock-tournament-2",
    name: "Ramadan Invitational",
    type: "Round Robin",
    location: { courtName: "Rooftop Court - Uttara" },
    participants: [{ userId: "u2" }, { userId: "u3" }],
    admins: [],
    owner: { userId: "u2", username: "rayyan_r" },
    endDate: "01-04-2025",
    maxPlayers: 4,
    privacy: "Public",
    fixturesGenerated: false,
  },
];

// ─── Players (for PlayerPerformance tab) ────────────────────────────────────

export const MOCK_PLAYERS = [
  {
    userId: "u1",
    firstName: "Yasin",
    lastName: "Ahmed",
    username: "yasin99",
    numberOfWins: 12,
    totalPointDifference: 34,
    resultLog: ["W", "W", "L", "W", "W", "W", "L", "W", "W", "W"],
    XP: 5513,
  },
  {
    userId: "u2",
    firstName: "Rayyan",
    lastName: "Rahman",
    username: "rayyan_r",
    numberOfWins: 10,
    totalPointDifference: 22,
    resultLog: ["W", "L", "W", "W", "L", "W", "W", "L", "W", "W"],
    XP: 5000,
  },
  {
    userId: "u3",
    firstName: "Saif",
    lastName: "Hossain",
    username: "saif_s",
    numberOfWins: 8,
    totalPointDifference: 15,
    resultLog: ["L", "W", "W", "L", "W", "W", "L", "W", "L", "W"],
    XP: 4500,
  },
  {
    userId: "u4",
    firstName: "Raqeeb",
    lastName: "Islam",
    username: "raqeeb_i",
    numberOfWins: 7,
    totalPointDifference: -5,
    resultLog: ["W", "L", "L", "W", "L", "W", "L", "L", "W", "L"],
    XP: 3800,
  },
  {
    userId: "u5",
    firstName: "Gesh",
    lastName: "Das",
    username: "gesh_d",
    numberOfWins: 5,
    totalPointDifference: -12,
    resultLog: ["L", "L", "W", "L", "W", "L", "L", "W", "L", "L"],
    XP: 3100,
  },
  {
    userId: "u6",
    firstName: "Max",
    lastName: "Khan",
    username: "max_k",
    numberOfWins: 4,
    totalPointDifference: -20,
    resultLog: ["L", "L", "L", "W", "L", "L", "W", "L", "L", "L"],
    XP: 2500,
  },
  {
    userId: "u7",
    firstName: "Bukul",
    lastName: "Mia",
    username: "bukul_m",
    numberOfWins: 3,
    totalPointDifference: -34,
    resultLog: ["L", "L", "L", "L", "W", "L", "L", "L", "W", "L"],
    XP: 2100,
  },
];

// ─── League placements (for LeaguePerformance tab) ───────────────────────────

export const MOCK_LEAGUE_PERFORMANCE = [
  { userId: "u1", firstName: "Yasin",  lastName: "Ahmed",  first: 3, second: 1, third: 0, fourth: 0 },
  { userId: "u2", firstName: "Rayyan", lastName: "Rahman", first: 2, second: 2, third: 1, fourth: 0 },
  { userId: "u3", firstName: "Saif",   lastName: "Hossain",first: 1, second: 2, third: 2, fourth: 0 },
  { userId: "u4", firstName: "Raqeeb", lastName: "Islam",  first: 0, second: 1, third: 2, fourth: 1 },
  { userId: "u5", firstName: "Gesh",   lastName: "Das",    first: 0, second: 0, third: 1, fourth: 3 },
  { userId: "u6", firstName: "Max",    lastName: "Khan",   first: 0, second: 0, third: 0, fourth: 2 },
  { userId: "u7", firstName: "Bukul",  lastName: "Mia",    first: 0, second: 0, third: 0, fourth: 1 },
];

// ─── Tournament placements (for TournamentPerformance tab) ───────────────────

export const MOCK_TOURNAMENT_PERFORMANCE = [
  { userId: "u1", firstName: "Yasin",  lastName: "Ahmed",  first: 2, second: 0, third: 1, fourth: 0 },
  { userId: "u3", firstName: "Saif",   lastName: "Hossain",first: 1, second: 1, third: 0, fourth: 1 },
  { userId: "u2", firstName: "Rayyan", lastName: "Rahman", first: 0, second: 2, third: 1, fourth: 0 },
  { userId: "u5", firstName: "Gesh",   lastName: "Das",    first: 0, second: 0, third: 1, fourth: 2 },
  { userId: "u4", firstName: "Raqeeb", lastName: "Islam",  first: 0, second: 0, third: 0, fourth: 1 },
];

// ─── Teams (for TeamPerformance tab) ─────────────────────────────────────────

export const MOCK_TEAMS = [
  {
    teamKey: "yasin-rayyan",
    team: ["Yasin A", "Rayyan R"],
    numberOfWins: 8,
    totalPointDifference: 28,
    resultLog: ["W", "W", "L", "W", "W", "W", "L", "W"],
  },
  {
    teamKey: "saif-raqeeb",
    team: ["Saif H", "Raqeeb I"],
    numberOfWins: 6,
    totalPointDifference: 12,
    resultLog: ["W", "L", "W", "W", "L", "W", "W", "L"],
  },
  {
    teamKey: "gesh-max",
    team: ["Gesh D", "Max K"],
    numberOfWins: 3,
    totalPointDifference: -10,
    resultLog: ["L", "W", "L", "L", "W", "L", "L", "W"],
  },
  {
    teamKey: "bukul-yasin",
    team: ["Bukul M", "Yasin A"],
    numberOfWins: 2,
    totalPointDifference: -30,
    resultLog: ["L", "L", "W", "L", "L", "L", "W", "L"],
  },
];
