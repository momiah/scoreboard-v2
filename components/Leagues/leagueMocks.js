import * as mockImages from "../../mockImages";
import moment from "moment";

const prizeTypes = ["Trophy", "Medal", "Cash Prize"];
const currencyTypes = ["GBP", "USD", "EUR", "INR"];
const leagueTypes = ["Mixed Doubles", "Fixed Doubles", "Singles"];
const privacyTypes = ["Public", "Private"];
const maxPlayers = [8, 16, 32, 64, 128, 256, 512];
const leagueStatus = [
  { status: "enlisting", color: "#FF5733" },
  { status: "full", color: "#33FF57" },
  { status: "completed", color: "#3357FF" },
];
const daysOfWeek = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const sampleLeagues = [
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
    maxPlayers: maxPlayers[0],
    privacy: privacyTypes[0],
    name: "Laura Trotter Badminton League",
    playingTime: [
      {
        day: "Monday",
        startTime: "6:00 PM",
        endTime: "8:00 PM",
      },
      {
        day: "Wednesday",
        startTime: "6:00 PM",
        endTime: "8:00 PM",
      },
      {
        day: "Friday",
        time: "6:00 PM",
        endTime: "8:00 PM",
      },
    ],
    leagueStatus: leagueStatus[0],
    location: "Cheshunt",
    country: "England",
    startDate: "24/12/2023",
    endDate: "",

    leagueType: leagueTypes[0],
    prizeType: prizeTypes[0],
    entryFee: 10,
    currencyType: currencyTypes[0],
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

// Utility function to select a random item from an array
const randomItem = (array) => array[Math.floor(Math.random() * array.length)];

// Utility function to generate a result log of exactly 10 entries
const generateResultLog = () =>
  Array.from({ length: 10 }, () => randomItem(["W", "L"]));

// Generate random usernames
const generateUsernames = (num) => {
  const usernames = [];
  const adjectives = ["Swift", "Clever", "Brave", "Loyal", "Mighty"];
  const animals = ["Tiger", "Falcon", "Wolf", "Lion", "Eagle"];

  for (let i = 0; i < num; i++) {
    usernames.push(
      `${randomItem(adjectives)}${randomItem(animals)}${Math.floor(
        Math.random() * 100
      )}`
    );
  }
  return usernames;
};

// Generate random league participants
const generateParticipants = (num) => {
  return Array.from({ length: num }, (_, i) => ({
    id: `user-${i + 1}`,
    memberSince: moment()
      .subtract(Math.floor(Math.random() * 12), "months")
      .format("MMM YYYY"),
    XP: Math.floor(Math.random() * 1000),
    prevGameXP: Math.floor(Math.random() * 100),
    lastActive: moment()
      .subtract(Math.floor(Math.random() * 30), "days")
      .format("DD/MM/YYYY"),
    numberOfWins: Math.floor(Math.random() * 50),
    numberOfLosses: Math.floor(Math.random() * 50),
    numberOfGamesPlayed: Math.floor(Math.random() * 100),
    winPercentage: Math.random().toFixed(2) * 100,
    resultLog: generateResultLog(),
    pointEfficiency: Math.random().toFixed(2) * 100,
    totalPoints: Math.floor(Math.random() * 5000),
    totalPointEfficiency: Math.random().toFixed(2) * 100,
    winStreak5: Math.floor(Math.random() * 5),
    winStreak7: Math.floor(Math.random() * 7),
    winStreak3: Math.floor(Math.random() * 3),
    demonWin: Math.floor(Math.random() * 10),
    currentStreak: {
      type: randomItem([null, "win", "loss"]),
      count: Math.floor(Math.random() * 10),
    },
    highestLossStreak: Math.floor(Math.random() * 10),
    highestWinStreak: Math.floor(Math.random() * 10),
  }));
};

// Generate random games
const generateGames = (numGames) => {
  return Array.from({ length: numGames }, (_, i) => ({
    id: `${moment().format("DD-MM-YYYY")}-game-${i + 1}`,
    team1: {
      player1: `Player${Math.floor(Math.random() * 10) + 1}`,
      player2: `Player${Math.floor(Math.random() * 10) + 1}`,
      score: Math.floor(Math.random() * 21),
    },
    gameId: `${moment().format("DD-MM-YYYY")}-game-${i + 1}`,
    result: {
      loser: {
        team: "Team 2",
        score: Math.floor(Math.random() * 21),
        players: ["Player3", "Player4"],
      },
      winner: {
        score: 21,
        players: ["Player1", "Player2"],
        team: "Team 1",
      },
    },
    team2: {
      player1: `Player${Math.floor(Math.random() * 10) + 1}`,
      player2: `Player${Math.floor(Math.random() * 10) + 1}`,
      score: Math.floor(Math.random() * 21),
    },
    date: moment().format("DD-MM-YYYY"),
    gamescore: `${Math.floor(Math.random() * 21)} - ${Math.floor(
      Math.random() * 21
    )}`,
  }));
};

// Generate random playing times for up to 7 days
const generatePlayingTimes = (numDays) => {
  const daysSelected = new Set();
  const playingTimes = [];

  while (daysSelected.size < numDays) {
    const day = randomItem(daysOfWeek);
    if (!daysSelected.has(day)) {
      daysSelected.add(day);
      playingTimes.push({
        day,
        startTime: `${Math.floor(Math.random() * 12) + 1}:00 PM`,
        endTime: `${Math.floor(Math.random() * 2) + 6}:00 PM`,
      });
    }
  }
  return playingTimes;
};

// Generate leagues with destructured arguments
const generateLeagues = ({
  numLeagues = 1,
  numAdmins = 2,
  numParticipants = 10,
  numGames = 5,
  numDays = 3,
} = {}) => {
  return Array.from({ length: numLeagues }, (_, i) => ({
    id: i + 1,
    leagueAdmins: generateUsernames(numAdmins),
    leagueParticipants: generateParticipants(numParticipants),
    maxPlayers: randomItem(maxPlayers),
    privacy: randomItem(privacyTypes),
    name: `League ${i + 1} - ${randomItem(leagueTypes)}`,
    playingTime: generatePlayingTimes(numDays),
    leagueStatus: randomItem(leagueStatus),
    location: "Cheshunt",
    country: "England",
    startDate: moment().add(i, "days").format("DD/MM/YYYY"),
    endDate: "",
    leagueType: randomItem(leagueTypes),
    prizeType: randomItem(prizeTypes),
    entryFee: Math.floor(Math.random() * 100) + 1,
    currencyType: randomItem(currencyTypes),
    image: randomItem(Object.values(mockImages)),
    games: generateGames(numGames),
  }));
};

// Example usage
export const generatedLeagues = generateLeagues({
  numLeagues: 10,
  numAdmins: 3,
  numParticipants: 5,
  numGames: 4,
  numDays: 3,
});
console.log(generatedLeagues);
