import { useCallback } from "react";
import { ScrollView } from "react-native";
import { useScrollToGameGlow } from "@/components/GameCardGlow";
import { Game } from "@shared/types";

interface BracketRound {
  round: number;
  games: Game[];
}

interface UseBracketScrollToGameArgs {
  scrollToGameId?: string;
  treeRounds: BracketRound[];
  playoffGame: Game | null;
  maxGamesInAnyRound: number;
  verticalScrollRef: React.RefObject<ScrollView | null>;
  cardLayout: (
    roundIndex: number,
    gameIndex: number,
    gamesInRound: number,
    maxGamesInAnyRound: number,
  ) => { x: number; y: number; width: number; height: number };
  scrollTopOffset: number;
}

// Finds which round a game lives in. Used by BracketTree to START on the
// correct round (no scrolling), and here for the vertical position.
export const findGamePosition = (
  treeRounds: BracketRound[],
  gameId?: string,
): { roundIndex: number; gameIndex: number } => {
  if (!gameId) return { roundIndex: -1, gameIndex: -1 };
  for (let roundIndex = 0; roundIndex < treeRounds.length; roundIndex++) {
    const gameIndex = treeRounds[roundIndex].games.findIndex(
      (game) => game.gameId === gameId,
    );
    if (gameIndex !== -1) return { roundIndex, gameIndex };
  }
  return { roundIndex: -1, gameIndex: -1 };
};

export const useBracketScrollToGame = ({
  scrollToGameId,
  treeRounds,
  playoffGame,
  maxGamesInAnyRound,
  verticalScrollRef,
  cardLayout,
  scrollTopOffset,
}: UseBracketScrollToGameArgs) => {
  const scrollToGame = useCallback(
    (gameId: string): boolean => {
      const { roundIndex, gameIndex } = findGamePosition(treeRounds, gameId);
      const isPlayoffTarget =
        roundIndex === -1 && playoffGame?.gameId === gameId;
      if (roundIndex === -1 && !isPlayoffTarget) return false;

      if (isPlayoffTarget) {
        verticalScrollRef.current?.scrollToEnd({ animated: true });
        return true;
      }

      const layout = cardLayout(
        roundIndex,
        gameIndex,
        treeRounds[roundIndex].games.length,
        maxGamesInAnyRound,
      );
      verticalScrollRef.current?.scrollTo({
        y: Math.max(layout.y - scrollTopOffset, 0),
        animated: true,
      });
      return true;
    },
    [treeRounds, playoffGame, maxGamesInAnyRound],
  );

  return useScrollToGameGlow(scrollToGameId, scrollToGame);
};
