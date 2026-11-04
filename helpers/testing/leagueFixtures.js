import { profileDetailSchema, scoreboardProfileSchema } from "@shared";

const clone = (v) => JSON.parse(JSON.stringify(v));

export const player = (userId) => ({
  userId,
  username: userId,
  firstName: userId,
  lastName: "Test",
  displayName: userId,
});

export const participant = (userId) => ({
  ...clone(scoreboardProfileSchema),
  ...player(userId),
});

export const user = (userId, XP = 100) => ({
  ...player(userId),
  profileDetail: { ...clone(profileDetailSchema), XP },
});

export const leagueGame = ({
  gameId,
  team1,
  team2,
  score: [s1, s2],
  approvalStatus = "Pending",
  reporter = team1[0],
}) => {
  const team1Wins = s1 > s2;
  return {
    gameId,
    gamescore: `${s1} - ${s2}`,
    date: "02-11-2026",
    createdAt: "2026-11-02T10:00:00.000Z",
    approvalStatus,
    reporter,
    approvers: [],
    numberOfApprovals: 0,
    numberOfDeclines: 0,
    team1: { player1: player(team1[0]), player2: team1[1] ? player(team1[1]) : null, score: s1 },
    team2: { player1: player(team2[0]), player2: team2[1] ? player(team2[1]) : null, score: s2 },
    result: {
      winner: { team: team1Wins ? "Team 1" : "Team 2", score: Math.max(s1, s2), players: [] },
      loser: { team: team1Wins ? "Team 2" : "Team 1", score: Math.min(s1, s2), players: [] },
    },
  };
};

export const league = ({ leagueId = "L1", leagueType = "Singles", ids, games = [], teams = [] }) => ({
  leagueId,
  leagueName: "Test League",
  leagueType,
  approvalLimit: 1,
  maxPlayers: 8,
  leagueParticipants: ids.map(participant),
  leagueTeams: teams,
  games,
  prizesDistributed: false,
});
