export const generateUniqueGameId = (transformedDate, existingGames) => {
  let gameNumber = existingGames.length + 1;
  let gameId;

  while (true) {
    gameId = `${transformedDate}-game-${gameNumber}`;
    const gameExists = existingGames.some((game) => game.gameId === gameId);

    if (!gameExists) {
      break;
    }

    gameNumber++;
  }

  return gameId;
};
