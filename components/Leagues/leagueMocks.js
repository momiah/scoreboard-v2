import * as mockImages from "../../mockImages";
import moment from "moment";

const prizeTypes = ["Trophy", "Medal", "Cash Prize"];
const currencyTypes = ["GBP", "USD", "EUR", "INR"];
const leagueTypes = ["Mixed Doubles", "Fixed Doubles", "Singles"];
const privacyTypes = ["Public", "Private"];
const maxPlayers = [8, 16, 32, 64, 128, 256, 512];
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
const leagueStatus = [
  { status: "enlisting", color: "#FAB234" },
  { status: "full", color: "#286EFA" },
  { status: "completed", color: "#167500" },
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
    name: `League ${i + 1} - ${randomItem(leagueTypes)}`,
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

// Example usage
export const generatedLeagues = generateLeagues({
  numLeagues: 10,
  numAdmins: 3,
  numParticipants: 5,
  numGames: 4,
  numDays: 3,
});
console.log(generatedLeagues);
