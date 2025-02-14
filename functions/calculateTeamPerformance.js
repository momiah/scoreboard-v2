export const calculateTeamPerformance = async (
  game,
  retrieveTeams,
  leagueId
) => {
  const allTeams = await retrieveTeams(leagueId);

  // console.log("allTeams", JSON.stringify(allTeams, null, 2));

  // Helper function to normalize team keys
  const normalizeTeamKey = (key) => {
    return key.join("-").split("-").sort().join("-");
  };

  const { result } = game;

  // Generate normalized keys from the result data
  const winnerTeamKey = normalizeTeamKey(result.winner.players);
  const loserTeamKey = normalizeTeamKey(result.loser.players);

  // Helper function to retrieve teams by normalized keys
  const getTeamsByKeys = (teams, winnerKey, loserKey) => {
    let winnerTeam = teams.find(
      (team) => normalizeTeamKey(team.team) === winnerKey
    );
    let loserTeam = teams.find(
      (team) => normalizeTeamKey(team.team) === loserKey
    );
    return [winnerTeam, loserTeam];
  };

  let [winnerTeam, loserTeam] = getTeamsByKeys(
    allTeams,
    winnerTeamKey,
    loserTeamKey
  );

  if (!winnerTeam) {
    winnerTeam = {
      team: result.winner.players.slice().sort(), // Store sorted player IDs
      teamKey: winnerTeamKey,
      numberOfWins: 0,
      numberOfLosses: 0,
      numberOfGamesPlayed: 0,
      resultLog: [],
      pointDifferenceLog: [],
      averagePointDifference: 0,
      currentStreak: 0,
      highestWinStreak: 0,
      highestLossStreak: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
      lossesTo: {},
      rival: null,
    };
  }

  // Create loser team if it doesn't exist
  if (!loserTeam) {
    loserTeam = {
      team: result.loser.players.slice().sort(), // Store sorted player IDs
      teamKey: loserTeamKey,
      numberOfWins: 0,
      numberOfLosses: 0,
      numberOfGamesPlayed: 0,
      resultLog: [],
      pointDifferenceLog: [],
      averagePointDifference: 0,
      currentStreak: 0,
      highestWinStreak: 0,
      highestLossStreak: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
      lossesTo: {},
      rival: null,
    };
  }

  // Calculate point difference for this game
  const pointDifference = result.winner.score - result.loser.score;

  // Update team stats and point difference logs
  updateTeamStats(winnerTeam, "W", pointDifference);
  updateTeamStats(loserTeam, "L", -pointDifference);

  // Update losing team rivalry stats
  if (!loserTeam.lossesTo[winnerTeamKey]) loserTeam.lossesTo[winnerTeamKey] = 0;
  loserTeam.lossesTo[winnerTeamKey] += 1;

  // Update rival info
  const maxLosses = Math.max(...Object.values(loserTeam.lossesTo));
  const rivalKey = Object.keys(loserTeam.lossesTo).find(
    (key) => loserTeam.lossesTo[key] === maxLosses
  );
  loserTeam.rival = { rivalKey, rivalPlayers: winnerTeam.team };

  console.log("winnerTeam", JSON.stringify(winnerTeam, null, 2));
  console.log("loserTeam", JSON.stringify(loserTeam, null, 2));

  // Return the updated teams
  return [winnerTeam, loserTeam];
};

// Helper function to update team stats and point difference logs
function updateTeamStats(team, result, pointDifference) {
  // Update basic stats
  if (result === "W") {
    team.numberOfWins += 1;
  } else {
    team.numberOfLosses += 1;
  }

  team.numberOfGamesPlayed += 1;

  // Update result log (limit to last 10 entries)
  team.resultLog.push(result);
  team.resultLog = team.resultLog.slice(-10);

  // Update point difference log
  if (!team.pointDifferenceLog) {
    team.pointDifferenceLog = [];
  }
  team.pointDifferenceLog.push(pointDifference);
  team.pointDifferenceLog = team.pointDifferenceLog.slice(-10);

  // Calculate average point difference
  const totalPointDifference = team.pointDifferenceLog.reduce(
    (sum, pd) => sum + pd,
    0
  );
  team.averagePointDifference =
    totalPointDifference / team.pointDifferenceLog.length;

  // Update streaks
  updateWinStreaks(team);
}

// Helper function to update win/loss streaks
function updateWinStreaks(team) {
  let currentStreakCount = 0;
  let highestWinStreak = 0;
  let highestLossStreak = 0;
  let isCurrentStreakWin = null;

  team.resultLog.forEach((result) => {
    if (result === "W") {
      if (isCurrentStreakWin === true || isCurrentStreakWin === null) {
        currentStreakCount += 1;
      } else {
        currentStreakCount = 1;
      }
      isCurrentStreakWin = true;
      highestWinStreak = Math.max(highestWinStreak, currentStreakCount);
    } else if (result === "L") {
      if (isCurrentStreakWin === false || isCurrentStreakWin === null) {
        currentStreakCount -= 1;
      } else {
        currentStreakCount = -1;
      }
      isCurrentStreakWin = false;
      highestLossStreak = Math.max(
        highestLossStreak,
        Math.abs(currentStreakCount)
      );
    }
  });

  team.currentStreak = currentStreakCount;
  team.highestWinStreak = highestWinStreak;
  team.highestLossStreak = highestLossStreak;

  // Update win streak milestones
  if (currentStreakCount >= 3) team.winStreak3++;
  if (currentStreakCount >= 5) team.winStreak5++;
  if (currentStreakCount >= 7) team.winStreak7++;
}

// export const calculateTeamPerformance = (newGame, teamPerformance) => {

//   function calculatePointDifferencePercentage(winnerScore, loserScore) {
//     const pointDifference = winnerScore - loserScore;
//     return (pointDifference / winnerScore) * 100;
//   }

//   function updateStreaks(team) {
//     let currentStreakCount = 0;
//     let highestWinStreak = 0;
//     let highestLossStreak = 0;
//     let isCurrentStreakWin = null;

//     team.resultLog.forEach((result) => {
//       if (result === "W") {
//         currentStreakCount = isCurrentStreakWin === true || isCurrentStreakWin === null ? currentStreakCount + 1 : 1;
//         isCurrentStreakWin = true;
//         highestWinStreak = Math.max(highestWinStreak, currentStreakCount);
//       } else if (result === "L") {
//         currentStreakCount = isCurrentStreakWin === false || isCurrentStreakWin === null ? currentStreakCount - 1 : -1;
//         isCurrentStreakWin = false;
//         highestLossStreak = Math.max(highestLossStreak, Math.abs(currentStreakCount));
//       }
//     });

//     team.currentStreak = currentStreakCount;
//     team.highestWinStreak = highestWinStreak;
//     team.highestLossStreak = highestLossStreak;

//     if (currentStreakCount >= 3) team.winStreak3++;
//     if (currentStreakCount >= 5) team.winStreak5++;
//     if (currentStreakCount >= 7) team.winStreak7++;
//   }

//   function updateRival(team, opponentKey, opponentPlayers) {
//     if (!team.lossesTo[opponentKey]) {
//       team.lossesTo[opponentKey] = 0;
//     }
//     team.lossesTo[opponentKey] += 1;
//     const maxLosses = Math.max(...Object.values(team.lossesTo));
//     const rivalKey = Object.keys(team.lossesTo).find(key => team.lossesTo[key] === maxLosses);
//     team.rival = { rivalKey, rivalPlayers: opponentPlayers };
//   }

//   const winnerTeamKey = [newGame.team1.player1, newGame.team1.player2].sort().join("-");
//   const loserTeamKey = [newGame.team2.player1, newGame.team2.player2].sort().join("-");

//   // Initialize team data if not present
//   if (!teamPerformance[winnerTeamKey]) {
//     teamPerformance[winnerTeamKey] = {
//       teamKey: winnerTeamKey,
//       team: [newGame.team1.player1, newGame.team1.player2],
//       numberOfWins: 0,
//       numberOfLosses: 0,
//       numberOfGamesPlayed: 0,
//       resultLog: [],
//       pointEfficiency: 0,
//       currentStreak: 0,
//       highestWinStreak: 0,
//       highestLossStreak: 0,
//       winStreak3: 0,
//       winStreak5: 0,
//       winStreak7: 0,
//       demonWin: 0,
//       lossesTo: {},
//       rival: null,
//     };
//   }

//   if (!teamPerformance[loserTeamKey]) {
//     teamPerformance[loserTeamKey] = {
//       teamKey: loserTeamKey,
//       team: [newGame.team2.player1, newGame.team2.player2],
//       numberOfWins: 0,
//       numberOfLosses: 0,
//       numberOfGamesPlayed: 0,
//       resultLog: [],
//       pointEfficiency: 0,
//       currentStreak: 0,
//       highestWinStreak: 0,
//       highestLossStreak: 0,
//       winStreak3: 0,
//       winStreak5: 0,
//       winStreak7: 0,
//       demonWin: 0,
//       lossesTo: {},
//       rival: null,
//     };
//   }

//   // Update performance data
//   const winner = newGame.result.winner;
//   const loser = newGame.result.loser;

//   teamPerformance[winnerTeamKey].numberOfWins += 1;
//   teamPerformance[winnerTeamKey].numberOfGamesPlayed += 1;
//   teamPerformance[winnerTeamKey].resultLog.push("W");
//   teamPerformance[winnerTeamKey].resultLog = teamPerformance[winnerTeamKey].resultLog.slice(-10);

//   // Update point efficiency
//   const pointEfficiency = calculatePointDifferencePercentage(winner.score, loser.score);
//   teamPerformance[winnerTeamKey].pointEfficiency += pointEfficiency;

//   // Check for demon win
//   if (winner.score - loser.score >= 10) {
//     teamPerformance[winnerTeamKey].demonWin += 1;
//   }

//   teamPerformance[loserTeamKey].numberOfLosses += 1;
//   teamPerformance[loserTeamKey].numberOfGamesPlayed += 1;
//   teamPerformance[loserTeamKey].resultLog.push("L");
//   teamPerformance[loserTeamKey].resultLog = teamPerformance[loserTeamKey].resultLog.slice(-10);

//   // Update streaks
//   updateStreaks(teamPerformance[winnerTeamKey]);
//   updateStreaks(teamPerformance[loserTeamKey]);

//   // Update rival
//   updateRival(teamPerformance[loserTeamKey], winnerTeamKey, [newGame.team1.player1, newGame.team1.player2]);

//   // Calculate the average point efficiency for the winner
//   if (teamPerformance[winnerTeamKey].numberOfWins > 0) {
//     teamPerformance[winnerTeamKey].pointEfficiency /= teamPerformance[winnerTeamKey].numberOfWins;
//   }

//   return [teamPerformance[winnerTeamKey], teamPerformance[loserTeamKey]];
// };

// export const calculatTeamPerformance = (gameData) => {
//   const teamPerformance = {};

//   function calculatePointDifferencePercentage(winnerScore, loserScore) {
//     const pointDifference = winnerScore - loserScore;
//     return (pointDifference / winnerScore) * 100;
//   }

//   function updateStreaks(team) {
//     let currentStreakCount = 0;
//     let highestWinStreak = 0;
//     let highestLossStreak = 0;
//     let isCurrentStreakWin = null;

//     team.resultLog.forEach((result) => {
//       if (result === "W") {
//         if (isCurrentStreakWin === true || isCurrentStreakWin === null) {
//           currentStreakCount += 1;
//         } else {
//           currentStreakCount = 1;
//         }
//         isCurrentStreakWin = true;
//         if (currentStreakCount > highestWinStreak) {
//           highestWinStreak = currentStreakCount;
//         }
//       } else if (result === "L") {
//         if (isCurrentStreakWin === false || isCurrentStreakWin === null) {
//           currentStreakCount -= 1;
//         } else {
//           currentStreakCount = -1;
//         }
//         isCurrentStreakWin = false;
//         if (Math.abs(currentStreakCount) > highestLossStreak) {
//           highestLossStreak = Math.abs(currentStreakCount);
//         }
//       }
//     });

//     team.currentStreak = currentStreakCount;
//     team.highestWinStreak = highestWinStreak;
//     team.highestLossStreak = highestLossStreak;

//     // Update the win streak counts
//     if (currentStreakCount >= 3) team.winStreak3++;
//     if (currentStreakCount >= 5) team.winStreak5++;
//     if (currentStreakCount >= 7) team.winStreak7++;
//   }

//   function updateRival(team, opponentKey, opponentPlayers) {
//     if (!team.lossesTo[opponentKey]) {
//       team.lossesTo[opponentKey] = 0;
//     }
//     team.lossesTo[opponentKey] += 1;
//     const maxLosses = Math.max(...Object.values(team.lossesTo));
//     const rivalKey = Object.keys(team.lossesTo).find(
//       (key) => team.lossesTo[key] === maxLosses
//     );
//     team.rival = {
//       rivalKey: rivalKey,
//       rivalPlayers: opponentPlayers,
//     };
//   }

//   gameData.forEach((game) => {
//     const winnerTeamKey = game.result.winner.players.sort().join("-");
//     const loserTeamKey = game.result.loser.players.sort().join("-");

//     if (!teamPerformance[winnerTeamKey]) {
//       teamPerformance[winnerTeamKey] = {
//         teamKey: winnerTeamKey,
//         team: game.result.winner.players,
//         numberOfWins: 0,
//         numberOfLosses: 0,
//         numberOfGamesPlayed: 0,
//         resultLog: [],
//         pointEfficiency: 0,
//         currentStreak: 0,
//         highestWinStreak: 0,
//         highestLossStreak: 0,
//         winStreak3: 0,
//         winStreak5: 0,
//         winStreak7: 0,
//         demonWin: 0,
//         lossesTo: {},
//         rival: null,
//       };
//     }

//     if (!teamPerformance[loserTeamKey]) {
//       teamPerformance[loserTeamKey] = {
//         teamKey: loserTeamKey,
//         team: game.result.loser.players,
//         numberOfWins: 0,
//         numberOfLosses: 0,
//         numberOfGamesPlayed: 0,
//         resultLog: [],
//         pointEfficiency: 0,
//         currentStreak: 0,
//         highestWinStreak: 0,
//         highestLossStreak: 0,
//         winStreak3: 0,
//         winStreak5: 0,
//         winStreak7: 0,
//         demonWin: 0,
//         lossesTo: {},
//         rival: null,
//       };
//     }

//     // Update performance data for the winning team
//     teamPerformance[winnerTeamKey].numberOfWins += 1;
//     teamPerformance[winnerTeamKey].numberOfGamesPlayed += 1;
//     teamPerformance[winnerTeamKey].resultLog.push("W");
//     teamPerformance[winnerTeamKey].resultLog =
//       teamPerformance[winnerTeamKey].resultLog.slice(-10);

//     // Update point efficiency for the winning team
//     const pointEfficiency = calculatePointDifferencePercentage(
//       game.result.winner.score,
//       game.result.loser.score
//     );
//     teamPerformance[winnerTeamKey].pointEfficiency += pointEfficiency;

//     // Check for demon win
//     if (game.result.winner.score - game.result.loser.score >= 10) {
//       teamPerformance[winnerTeamKey].demonWin += 1;
//     }

//     // Update performance data for the losing team
//     teamPerformance[loserTeamKey].numberOfLosses += 1;
//     teamPerformance[loserTeamKey].numberOfGamesPlayed += 1;
//     teamPerformance[loserTeamKey].resultLog.push("L");
//     teamPerformance[loserTeamKey].resultLog =
//       teamPerformance[loserTeamKey].resultLog.slice(-10);

//     // Update streaks for both teams
//     updateStreaks(teamPerformance[winnerTeamKey]);
//     updateStreaks(teamPerformance[loserTeamKey]);

//     // Update rival information for the losing team
//     updateRival(
//       teamPerformance[loserTeamKey],
//       winnerTeamKey,
//       game.result.winner.players
//     );
//   });

//   // Calculate the average point efficiency for each team
//   Object.values(teamPerformance).forEach((team) => {
//     if (team.numberOfWins > 0) {
//       team.pointEfficiency = team.pointEfficiency / team.numberOfWins;
//     }
//   });

//   // Convert to array and sort
//   const teamPerformanceArray = Object.values(teamPerformance);
//   teamPerformanceArray.sort((a, b) => {
//     if (b.numberOfWins !== a.numberOfWins) {
//       return b.numberOfWins - a.numberOfWins;
//     }
//     const winRatioA = a.numberOfWins / a.numberOfGamesPlayed;
//     const winRatioB = b.numberOfWins / b.numberOfGamesPlayed;
//     return winRatioB - winRatioA;
//   });

//   return teamPerformanceArray;
// };
