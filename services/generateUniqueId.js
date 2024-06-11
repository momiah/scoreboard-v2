import moment from "moment";

export const generateUniqueGameId = (existingGames) => {
  // Get today's date in the desired format
  const today = moment().format("DD-MM-YYYY");

  // Initialize game number
  let gameNumber = 1;
  let gameId;

  // Loop to find a unique game ID
  while (true) {
    gameId = `${today}-game-${gameNumber}`;
    const gameExists = existingGames.some((game) => game.gameId === gameId);

    if (!gameExists) {
      break;
    }

    gameNumber++;
  }

  return gameId;
};
