import moment from "moment";

export const generateUniqueGameId = ({ existingGames, competitionId }) => {
  const competitionPrefix = competitionId.split("").slice(-5).join("");
  const today = moment().format("DD-MM-YYYY");

  // Fix: Filter games with the same competition prefix AND today's date
  const todayGames = existingGames.filter((game) =>
    game.gameId.startsWith(`${competitionPrefix}-${today}`)
  );

  let gameNumber = todayGames.length + 1;
  let gameId;

  while (true) {
    gameId = `${competitionPrefix}-${today}-game-${gameNumber}`;
    const gameExists = todayGames.some((game) => game.gameId === gameId);

    if (!gameExists) {
      break;
    }

    gameNumber++;
  }

  return gameId;
};
