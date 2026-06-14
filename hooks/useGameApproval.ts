// hooks/useGameApproval.ts
import { useContext, useState, useCallback } from "react";
import { LeagueContext } from "../context/LeagueContext";
import { UserContext } from "../context/UserContext";
import { notificationTypes } from "@shared";
import { NormalizedCompetition, Game, CollectionName } from "@shared/types";

const findGame = (
  competition: NormalizedCompetition,
  gameId: string,
  isLeague: boolean,
): Game | null => {
  if (isLeague) {
    return competition.games?.find((game) => game.gameId === gameId) ?? null;
  }
  for (const fixture of competition.fixtures ?? []) {
    const fixtureGame = fixture.games?.find((game) => game.gameId === gameId);
    if (fixtureGame) return fixtureGame;
  }
  return competition.games?.find((game) => game.gameId === gameId) ?? null;
};

interface ApprovalActionParams {
  gameId: string;
  competitionId: string;
  senderId: string;
  notificationId?: string;
  notificationType: string;
}

interface UseGameApprovalResult {
  approve: (params: ApprovalActionParams) => Promise<void>;
  decline: (params: ApprovalActionParams) => Promise<void>;
  loadingDecision: boolean;
  findGameInCompetition: typeof findGame;
}

export const useGameApproval = (): UseGameApprovalResult => {
  const { approveGame, declineGame } = useContext(LeagueContext);
  const { currentUser } = useContext(UserContext);
  const [loadingDecision, setLoadingDecision] = useState(false);

  const runAction = useCallback(
    async (
      action: typeof approveGame | typeof declineGame,
      params: ApprovalActionParams,
    ) => {
      setLoadingDecision(true);
      try {
        const userId = currentUser?.userId ?? "";
        const notificationId = params.notificationId ?? "";
        await action({ ...params, userId, notificationId });
      } catch (error) {
        console.error("Error processing game approval:", error);
        throw error;
      } finally {
        setLoadingDecision(false);
      }
    },
    [approveGame, declineGame, currentUser?.userId],
  );

  const approve = useCallback(
    (params: ApprovalActionParams) => runAction(approveGame, params),
    [runAction, approveGame],
  );

  const decline = useCallback(
    (params: ApprovalActionParams) => runAction(declineGame, params),
    [runAction, declineGame],
  );

  return {
    approve,
    decline,
    loadingDecision,
    findGameInCompetition: findGame,
  };
};
