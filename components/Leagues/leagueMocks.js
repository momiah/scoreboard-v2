import * as mockImages from "../../mockImages";
import moment from "moment";

export const leagueTypes = ["Doubles", "Singles"];
export const privacyTypes = ["Public", "Private"];
export const maxPlayers = [8, 16, 32, 64];
export const leagueStatus = [
  { status: "enlisting", color: "#FAB234" },
  { status: "full", color: "#286EFA" },
  { status: "completed", color: "#167500" },
];

const prizeTypes = ["Trophy", "Medal", "Cash Prize"];
const currencyTypes = ["GBP", "USD", "EUR", "INR"];
const locations = [
  "Milton Keynes",
  "London",
  "Birmingham",
  "Manchester",
  "York",
  "Nottingham",
  "Bath",
  "Glasgow",
  "Edinburgh",
  "Leeds",
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

export const sampleLeagues = {
  id: 1,
  leagueAdmins: ["Rayyan", "Hussain"],
  leagueParticipants: [
    {
      id: "Rayyan2",
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
  centerName: "Cheshunt Sports Center",
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
};

export const sampleLeagues2 = {
  id: 10,
  leagueAdmins: ["BraveFalco", "LoyalTiger", "SwiftFalco"],
  leagueParticipants: [
    {
      id: "BraveFalco",
      memberSince: "Feb 2024",
      XP: 948,
      prevGameXP: 5,
      lastActive: "20/11/2024",
      numberOfWins: 20,
      numberOfLosses: 35,
      numberOfGamesPlayed: 0,
      winPercentage: 44,
      resultLog: ["W", "W", "L", "L", "L", "L", "W", "W", "L", "L"],
      pointEfficiency: 56.00000000000001,
      totalPoints: 1766,
      totalPointEfficiency: 81,
      winStreak5: 4,
      winStreak7: 5,
      winStreak3: 1,
      demonWin: 2,
      currentStreak: {
        type: null,
        count: 8,
      },
      highestLossStreak: 8,
      highestWinStreak: 2,
    },
    {
      id: "LoyalTiger",
      memberSince: "Aug 2024",
      XP: 567,
      prevGameXP: 53,
      lastActive: "01/12/2024",
      numberOfWins: 47,
      numberOfLosses: 0,
      numberOfGamesPlayed: 51,
      winPercentage: 50,
      resultLog: ["L", "W", "W", "L", "W", "L", "L", "L", "L", "W"],
      pointEfficiency: 39,
      totalPoints: 1627,
      totalPointEfficiency: 85,
      winStreak5: 4,
      winStreak7: 5,
      winStreak3: 1,
      demonWin: 8,
      currentStreak: {
        type: "win",
        count: 8,
      },
      highestLossStreak: 2,
      highestWinStreak: 4,
    },
    {
      id: "SwiftFalco",
      memberSince: "Oct 2024",
      XP: 529,
      prevGameXP: 85,
      lastActive: "03/12/2024",
      numberOfWins: 28,
      numberOfLosses: 23,
      numberOfGamesPlayed: 21,
      winPercentage: 23,
      resultLog: ["W", "W", "L", "L", "W", "L", "W", "L", "W", "L"],
      pointEfficiency: 28.999999999999996,
      totalPoints: 2712,
      totalPointEfficiency: 69,
      winStreak5: 1,
      winStreak7: 1,
      winStreak3: 0,
      demonWin: 0,
      currentStreak: {
        type: "loss",
        count: 9,
      },
      highestLossStreak: 8,
      highestWinStreak: 9,
    },
    {
      id: "CleverLion",
      memberSince: "Aug 2024",
      XP: 425,
      prevGameXP: 88,
      lastActive: "16/11/2024",
      numberOfWins: 18,
      numberOfLosses: 46,
      numberOfGamesPlayed: 48,
      winPercentage: 19,
      resultLog: ["L", "L", "L", "W", "L", "L", "L", "L", "W", "W"],
      pointEfficiency: 31,
      totalPoints: 3974,
      totalPointEfficiency: 81,
      winStreak5: 4,
      winStreak7: 0,
      winStreak3: 1,
      demonWin: 6,
      currentStreak: {
        type: "win",
        count: 9,
      },
      highestLossStreak: 3,
      highestWinStreak: 8,
    },
    {
      id: "MightyFalc",
      memberSince: "Jan 2024",
      XP: 162,
      prevGameXP: 59,
      lastActive: "19/11/2024",
      numberOfWins: 31,
      numberOfLosses: 27,
      numberOfGamesPlayed: 75,
      winPercentage: 37,
      resultLog: ["W", "W", "W", "W", "L", "L", "W", "W", "W", "W"],
      pointEfficiency: 5,
      totalPoints: 1540,
      totalPointEfficiency: 39,
      winStreak5: 4,
      winStreak7: 6,
      winStreak3: 1,
      demonWin: 4,
      currentStreak: {
        type: "win",
        count: 9,
      },
      highestLossStreak: 1,
      highestWinStreak: 3,
    },
  ],
  maxPlayers: 64,
  privacy: "Public",
  name: "League 1 - Singles",
  playingTime: [
    {
      day: "Sunday",
      startTime: "2:00 PM",
      endTime: "7:00 PM",
    },
    {
      day: "Friday",
      startTime: "8:00 PM",
      endTime: "7:00 PM",
    },
    {
      day: "Monday",
      startTime: "10:00 PM",
      endTime: "6:00 PM",
    },
  ],
  leagueStatus: {
    status: "full",
    color: "#33FF57",
  },
  location: "Cheshunt",
  centerName: "Cheshunt Sports Center",
  country: "England",
  startDate: "14/12/2024",
  endDate: "",
  leagueType: "Singles",
  prizeType: "Trophy",
  entryFee: 93,
  currencyType: "USD",
  image: {
    uri: "/assets/?unstable_path=.%2FmockImages/court3.png",
    width: 1256,
    height: 824,
  },
  games: [
    {
      id: "14-12-2024-game-1",
      team1: {
        player1: "BraveFalco",
        player2: "CleverLion",
        score: 9,
      },
      gameId: "14-12-2024-game-1",
      result: {
        loser: {
          team: "Team 2",
          score: 13,
          players: ["MightyFalc", "SwiftFalco"],
        },
        winner: {
          score: 21,
          players: ["BraveFalco", "CleverLion"],
          team: "Team 1",
        },
      },
      team2: {
        player1: "MightyFalc",
        player2: "SwiftFalco",
        score: 8,
      },
      date: "14-12-2024",
      gamescore: "10 - 11",
    },
    {
      id: "14-12-2024-game-2",
      team1: {
        player1: "SwiftFalco",
        player2: "MightyFalc",
        score: 0,
      },
      gameId: "14-12-2024-game-2",
      result: {
        loser: {
          team: "Team 2",
          score: 18,
          players: ["CleverLion", "BraveFalco"],
        },
        winner: {
          score: 21,
          players: ["SwiftFalco", "MightyFalc"],
          team: "Team 1",
        },
      },
      team2: {
        player1: "CleverLion",
        player2: "BraveFalco",
        score: 4,
      },
      date: "14-12-2024",
      gamescore: "5 - 18",
    },
    {
      id: "14-12-2024-game-3",
      team1: {
        player1: "CleverLion",
        player2: "BraveFalco",
        score: 18,
      },
      gameId: "14-12-2024-game-3",
      result: {
        loser: {
          team: "Team 2",
          score: 4,
          players: ["SwiftFalco", "MightyFalc"],
        },
        winner: {
          score: 21,
          players: ["CleverLion", "BraveFalco"],
          team: "Team 1",
        },
      },
      team2: {
        player1: "SwiftFalco",
        player2: "MightyFalc",
        score: 7,
      },
      date: "14-12-2024",
      gamescore: "6 - 9",
    },
    {
      id: "14-12-2024-game-4",
      team1: {
        player1: "LoyalTiger",
        player2: "MightyFalc",
        score: 13,
      },
      gameId: "14-12-2024-game-4",
      result: {
        loser: {
          team: "Team 2",
          score: 1,
          players: ["BraveFalco", "CleverLion"],
        },
        winner: {
          score: 21,
          players: ["LoyalTiger", "MightyFalc"],
          team: "Team 1",
        },
      },
      team2: {
        player1: "BraveFalco",
        player2: "CleverLion",
        score: 5,
      },
      date: "14-12-2024",
      gamescore: "10 - 20",
    },
  ],
};

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
    // Generate a random username and shorten it to 10 characters
    const username = `${randomItem(adjectives)}${randomItem(
      animals
    )}${Math.floor(Math.random() * 100)}`;
    usernames.push(username.slice(0, 10)); // Ensure the username is no longer than 10 characters
  }

  return usernames;
};

// Generate random league participants
const generateParticipants = (num) => {
  const usernames = generateUsernames(num);

  return usernames.map((username) => ({
    id: username,
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

const generateEmptyParticipants = (num) => {
  const usernames = ["Rayyan", "Hussain", "Yasin", "Abdul"];

  return usernames.map((username) => ({
    id: username,
    memberSince: "",
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
  }));
};

// Generate random games
const generateGames = (numGames, leagueParticipants) => {
  return Array.from({ length: numGames }, (_, i) => {
    // Randomly select 4 unique players for the game (2 players per team)
    const selectedPlayers = [];
    while (selectedPlayers.length < 4) {
      const randomPlayer =
        leagueParticipants[
          Math.floor(Math.random() * leagueParticipants.length)
        ];
      if (!selectedPlayers.includes(randomPlayer)) {
        selectedPlayers.push(randomPlayer);
      }
    }

    // Split the selected players into two teams
    const team1 = selectedPlayers.slice(0, 2);
    const team2 = selectedPlayers.slice(2, 4);

    return {
      id: `${moment().format("DD-MM-YYYY")}-game-${i + 1}`,
      team1: {
        player1: team1[0].id,
        player2: team1[1].id,
        score: Math.floor(Math.random() * 21),
      },
      gameId: `${moment().format("DD-MM-YYYY")}-game-${i + 1}`,
      result: {
        loser: {
          team: "Team 2",
          score: Math.floor(Math.random() * 21),
          players: team2.map((player) => player.id),
        },
        winner: {
          score: 21,
          players: team1.map((player) => player.id),
          team: "Team 1",
        },
      },
      team2: {
        player1: team2[0].id,
        player2: team2[1].id,
        score: Math.floor(Math.random() * 21),
      },
      date: moment().format("DD-MM-YYYY"),
      gamescore: `${Math.floor(Math.random() * 21)} - ${Math.floor(
        Math.random() * 21
      )}`,
    };
  });
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

const generateBadmintonCenters = (numCenters) => {
  const descriptors = [
    "Sports Center",
    "Leisure Center",
    "Badminton Academy",
    "Arena",
    "Training Village",
    "Fitness Hub",
    "Community Hall",
    "Sports Complex",
    "Recreation Center",
    "Activity Zone",
  ];

  // Ensure we don't exceed the number of predefined locations or descriptors
  const totalCenters = Math.min(numCenters, locations.length);

  return Array.from({ length: totalCenters }, (_, i) => {
    const location = locations[i % locations.length];
    const descriptor = descriptors[i % descriptors.length];
    return `${location} ${descriptor}`;
  });
};

// Generate leagues with destructured arguments
const generateLeagues = ({
  numLeagues = 1,
  numAdmins = 2,
  numParticipants = 10,
  numGames = 5,
  numDays = 3,
} = {}) => {
  const participants = generateParticipants(numParticipants);
  const leagueAdmins = participants
    .slice(0, numAdmins)
    .map((participant) => participant.id);

  return Array.from({ length: numLeagues }, (_, i) => ({
    id: i + 1,
    leagueAdmins: leagueAdmins,
    leagueParticipants: participants,
    maxPlayers: randomItem(maxPlayers),
    privacy: randomItem(privacyTypes),
    leagueName: `League ${i + 1} - ${randomItem(leagueTypes)}`,
    playingTime: generatePlayingTimes(numDays),
    leagueStatus: randomItem(leagueStatus),
    location: randomItem(locations),
    centerName: randomItem(generateBadmintonCenters(numLeagues)),
    country: "England",
    startDate: moment().add(i, "days").format("DD/MM/YYYY"),
    endDate: "",
    leagueType: randomItem(leagueTypes),
    prizeType: randomItem(prizeTypes),
    entryFee: Math.floor(Math.random() * 100) + 1,
    currencyType: randomItem(currencyTypes),
    image: randomItem(Object.values(mockImages)),
    games: generateGames(numGames, participants),
  }));
};

export const mockedParticipants = generateParticipants(4);
export const mockedEmptyParticipants = generateEmptyParticipants(4);

// Example usage
export const generatedLeagues = generateLeagues({
  numLeagues: 10,
  numAdmins: 3,
  numParticipants: 5,
  numGames: 4,
  numDays: 3,
});
