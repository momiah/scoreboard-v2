import * as mockImages from "../../mockImages";
import moment from "moment";

export const leagues = [
  {
    id: 1,
    leagueAdmins: ["Rayyan", "Hussain"],
    leageueParticipants: [
      {
        id: "Rayyan",
        memberSince: moment().format("MMM YYYY"),
        XP: 10,
        prevGameXP: 0,
        lastActive: "",
        numberOfWins: 0,
        numberOfLosses: 0,
        numberOfGamesPlayed: 0,
        winPercentage: 0,
        resultLog: [],
        pointEfficiency: 0,
        totalPoints: 0,
        totalPointEfficiency: 0,
        winStreak5: 0,
        winStreak7: 0,
        winStreak3: 0,
        demonWin: 0,
        currentStreak: {
          type: null,
          count: 0,
        },
        highestLossStreak: 0,
        highestWinStreak: 0,
      },
    ],
    name: "Laura Trotter Badminton League",
    location: "Cheshunt",
    country: "England",
    startDate: "24/12/2023",
    endDate: "",
    image: mockImages.court1,
    games: [
      {
        id: "15-08-2024-game-2",
        team1: {
          player1: "Rayyan",
          score: 21,
          player2: "Hussain",
        },
        gameId: "15-08-2024-game-2",
        result: {
          loser: {
            team: "Team 2",
            score: 10,
            players: ["Yasin", "Abdul"],
          },
          winner: {
            score: 21,
            players: ["Rayyan", "Hussain"],
            team: "Team 1",
          },
        },
        team2: {
          score: 10,
          player2: "Abdul",
          player1: "Yasin",
        },
        date: "15-08-2024",
        gamescore: "21 - 10",
      },
    ],
  },
  {
    id: 2,
    name: "Manchester Elite Badminton League",
    location: "Manchester",
    country: "England",
    startDate: "10/01/2024",
    endDate: "20/01/2024",
    image: mockImages.court2,
    games: [
      {
        id: "10-01-2024-game-1",
        team1: {
          player1: "Alice",
          score: 18,
          player2: "Bob",
        },
        gameId: "10-01-2024-game-1",
        result: {
          loser: {
            team: "Team 2",
            score: 15,
            players: ["Chris", "Derek"],
          },
          winner: {
            score: 18,
            players: ["Alice", "Bob"],
            team: "Team 1",
          },
        },
        team2: {
          score: 15,
          player2: "Derek",
          player1: "Chris",
        },
        date: "10-01-2024",
        gamescore: "18 - 15",
      },
    ],
  },
  {
    id: 3,
    name: "Birmingham International League",
    location: "Birmingham",
    country: "England",
    startDate: "05/02/2024",
    endDate: "15/02/2024",
    image: mockImages.court3,
    games: [
      {
        id: "05-02-2024-game-3",
        team1: {
          player1: "Ethan",
          score: 25,
          player2: "Emma",
        },
        gameId: "05-02-2024-game-3",
        result: {
          loser: {
            team: "Team 2",
            score: 22,
            players: ["Frank", "Grace"],
          },
          winner: {
            score: 25,
            players: ["Ethan", "Emma"],
            team: "Team 1",
          },
        },
        team2: {
          score: 22,
          player2: "Grace",
          player1: "Frank",
        },
        date: "05-02-2024",
        gamescore: "25 - 22",
      },
    ],
  },
  {
    id: 4,
    name: "Oxford Badminton Championship",
    location: "Oxford",
    country: "England",
    startDate: "15/03/2024",
    endDate: "25/03/2024",
    image: mockImages.court4,
    games: [
      {
        id: "15-03-2024-game-4",
        team1: {
          player1: "George",
          score: 21,
          player2: "Helen",
        },
        gameId: "15-03-2024-game-4",
        result: {
          loser: {
            team: "Team 2",
            score: 12,
            players: ["Ivy", "Jack"],
          },
          winner: {
            score: 21,
            players: ["George", "Helen"],
            team: "Team 1",
          },
        },
        team2: {
          score: 12,
          player2: "Jack",
          player1: "Ivy",
        },
        date: "15-03-2024",
        gamescore: "21 - 12",
      },
    ],
  },
  {
    id: 5,
    name: "Leeds Open Badminton Tournament",
    location: "Leeds",
    country: "England",
    startDate: "01/04/2024",
    endDate: "10/04/2024",
    image: mockImages.court1,
    games: [
      {
        id: "01-04-2024-game-5",
        team1: {
          player1: "Kevin",
          score: 23,
          player2: "Lucy",
        },
        gameId: "01-04-2024-game-5",
        result: {
          loser: {
            team: "Team 2",
            score: 19,
            players: ["Mason", "Nancy"],
          },
          winner: {
            score: 23,
            players: ["Kevin", "Lucy"],
            team: "Team 1",
          },
        },
        team2: {
          score: 19,
          player2: "Nancy",
          player1: "Mason",
        },
        date: "01-04-2024",
        gamescore: "23 - 19",
      },
    ],
  },
  {
    id: 6,
    name: "Cambridge Badminton League",
    location: "Cambridge",
    country: "England",
    startDate: "20/05/2024",
    endDate: "30/05/2024",
    image: mockImages.court2,
    games: [
      {
        id: "20-05-2024-game-6",
        team1: {
          player1: "Oliver",
          score: 17,
          player2: "Sophia",
        },
        gameId: "20-05-2024-game-6",
        result: {
          loser: {
            team: "Team 2",
            score: 15,
            players: ["Quinn", "Riley"],
          },
          winner: {
            score: 17,
            players: ["Oliver", "Sophia"],
            team: "Team 1",
          },
        },
        team2: {
          score: 15,
          player2: "Riley",
          player1: "Quinn",
        },
        date: "20-05-2024",
        gamescore: "17 - 15",
      },
    ],
  },
];

function generateDatasets(n) {
  const datasets = [];
  for (let i = 0; i < n; i++) {
    datasets.push({
      id: i + 1,
      name: `Dataset ${i + 1}`,
      data: [],
    });
  }
  return datasets;
}

// // Example usage:
// const datasets = generateDatasets(5);
// console.log(datasets);
