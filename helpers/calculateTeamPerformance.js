export const calculateTeamPerformance = async (
  game,
  retrieveTeams,
  leagueId
) => {
  const allTeams = await retrieveTeams(leagueId);

  const normalizeTeamKey = (key) => {
    return key.join("-").split("-").sort().join("-");
  };

  const { result } = game;

  const winnerTeamKey = normalizeTeamKey(result.winner.players);
  const loserTeamKey = normalizeTeamKey(result.loser.players);

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
      team: result.winner.players.slice().sort(),
      teamKey: winnerTeamKey,
      numberOfWins: 0,
      numberOfLosses: 0,
      numberOfGamesPlayed: 0,
      resultLog: [],
      pointDifferenceLog: [],
      averagePointDifference: 0,
      totalPointDifference: 0,
      currentStreak: 0,
      highestWinStreak: 0,
      highestLossStreak: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
      demonWin: 0,
      lossesTo: {},
      rival: null,
    };
  }

  if (!loserTeam) {
    loserTeam = {
      team: result.loser.players.slice().sort(),
      teamKey: loserTeamKey,
      numberOfWins: 0,
      numberOfLosses: 0,
      numberOfGamesPlayed: 0,
      resultLog: [],
      pointDifferenceLog: [],
      averagePointDifference: 0,
      totalPointDifference: 0,
      currentStreak: 0,
      highestWinStreak: 0,
      highestLossStreak: 0,
      winStreak3: 0,
      winStreak5: 0,
      winStreak7: 0,
      demonWin: 0,
      lossesTo: {},
      rival: null,
    };
  }

  const pointDifference = result.winner.score - result.loser.score;

  updateTeamStats(winnerTeam, "W", pointDifference);
  updateTeamStats(loserTeam, "L", -pointDifference);

  if (!loserTeam.lossesTo[winnerTeamKey]) loserTeam.lossesTo[winnerTeamKey] = 0;
  loserTeam.lossesTo[winnerTeamKey] += 1;

  const lossesToValues = Object.values(loserTeam.lossesTo);
  const maxLosses = Math.max(...lossesToValues);
  
  if (maxLosses > 1) {
    const teamsWithMaxLosses = Object.keys(loserTeam.lossesTo).filter(
      (key) => loserTeam.lossesTo[key] === maxLosses
    );
    
    if (teamsWithMaxLosses.length === 1) {
      const rivalKey = teamsWithMaxLosses[0];
      loserTeam.rival = { rivalKey, rivalPlayers: winnerTeam.team };
    } else {
      loserTeam.rival = null;
    }
  } else {
    loserTeam.rival = null;
  }

  return [winnerTeam, loserTeam];
};

function updateTeamStats(team, result, pointDifference) {
  const previousWinStreak = team.currentStreak > 0 ? team.currentStreak : 0;
  
  if (result === "W") {
    team.numberOfWins += 1;
    
    if (pointDifference >= 10) {
      team.demonWin = (team.demonWin || 0) + 1;
    }
  } else {
    team.numberOfLosses += 1;
  }

  team.numberOfGamesPlayed += 1;

  team.resultLog.push(result);
  team.resultLog = team.resultLog.slice(-10);

  if (!team.pointDifferenceLog) {
    team.pointDifferenceLog = [];
  }

  if (typeof team.totalPointDifference !== "number")
    team.totalPointDifference = 0;

  team.totalPointDifference += pointDifference;
  team.pointDifferenceLog.push(pointDifference);
  team.pointDifferenceLog = team.pointDifferenceLog.slice(-10);

  const totalPointDifference = team.pointDifferenceLog.reduce(
    (sum, pd) => sum + pd,
    0
  );
  team.averagePointDifference =
    totalPointDifference / team.pointDifferenceLog.length;

  updateWinStreaks(team, previousWinStreak);
}

function updateWinStreaks(team, previousWinStreak) {
  const previousResult = team.resultLog.length > 1 ? team.resultLog[team.resultLog.length - 2] : null;
  const currentResult = team.resultLog[team.resultLog.length - 1];
  
  if (currentResult === "W") {
    if (previousResult === "L" || previousResult === null) {
      team.currentStreak = 1;
    } else {
      team.currentStreak += 1;
    }
  } else if (currentResult === "L") {
    if (previousResult === "W" || previousResult === null) {
      team.currentStreak = -1;
    } else {
      team.currentStreak -= 1;
    }
  }

  if (team.currentStreak > 0) {
    team.highestWinStreak = Math.max(team.highestWinStreak || 0, team.currentStreak);
  } else if (team.currentStreak < 0) {
    team.highestLossStreak = Math.max(team.highestLossStreak || 0, Math.abs(team.currentStreak));
  }

  const currentWinStreak = team.currentStreak > 0 ? team.currentStreak : 0;
  
  if (typeof team.winStreak3 !== "number") team.winStreak3 = 0;
  if (typeof team.winStreak5 !== "number") team.winStreak5 = 0;
  if (typeof team.winStreak7 !== "number") team.winStreak7 = 0;
  
  if (previousWinStreak < 3 && currentWinStreak >= 3) {
    team.winStreak3 += 1;
  }
  if (previousWinStreak < 5 && currentWinStreak >= 5) {
    team.winStreak5 += 1;
  }
  if (previousWinStreak < 7 && currentWinStreak >= 7) {
    team.winStreak7 += 1;
  }
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
