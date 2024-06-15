import moment from "moment";

export const generateUniqueGameId = (existingGames) => {
  // Get today's date in the desired format
  const today = moment().format("DD-MM-YYYY");

  // Filter out games for today
  const todayGames = existingGames.filter((game) =>
    game.gameId.startsWith(today)
  );

  // Initialize game number
  let gameNumber = todayGames.length + 1;
  let gameId;

  // Loop to find a unique game ID
  while (true) {
    gameId = `${today}-game-${gameNumber}`;
    const gameExists = todayGames.some((game) => game.gameId === gameId);

    if (!gameExists) {
      break;
    }

    gameNumber++;
  }

  return gameId;
};
