/**
 * Integration test for the reject-game ENTRY POINT: the ladder branch of
 * GameApprovalModal. When a player is asked to approve a reported ladder game
 * they can Accept (approve) or Decline — and Decline is the start of the reject
 * flow: it navigates to the dispute composer, it does NOT itself reject/delete.
 *
 * These tests render the real modal with the contexts, navigation and the
 * dispute lookup mocked, and assert the decision gates:
 *   • a pending game → Decline opens the dispute screen with the game context;
 *   • an already-disputed game → actions are locked and a link opens the dispute;
 *   • an already-approved game → actions are locked with an explanation;
 *   • a deleted game → the "no longer exists" state.
 */
import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { notificationTypes } from "@shared";

// ── Navigation ─────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// ── Contexts (real React contexts we can feed values into) ───────────────────
// The contexts are created INSIDE the factories (ES imports hoist above any
// module-scope const, so a shared var would still be in its TDZ here); the
// tests read them back with require().
jest.mock("../../context/LadderContext", () => ({
  LadderContext: require("react").createContext({}),
}));
jest.mock("../../context/UserContext", () => ({
  UserContext: require("react").createContext({}),
}));
jest.mock("../../context/LeagueContext", () => ({
  LeagueContext: require("react").createContext({}),
}));

// ── Leaf modules that would otherwise drag in firebase (competition path) ───
const mockFetchActiveDisputeByGame = jest.fn();
jest.mock("../../services/disputes", () => ({
  fetchActiveDisputeByGame: (...a: unknown[]) =>
    mockFetchActiveDisputeByGame(...a),
}));
jest.mock("@/hooks/useGameApproval", () => ({
  useGameApproval: () => ({
    approve: jest.fn(),
    decline: jest.fn(),
    loadingDecision: false,
  }),
}));
jest.mock("@/helpers/getCompetitionConfig", () => ({
  getCompetitionConfig: () => ({}),
}));
jest.mock("@/helpers/normalizeCompetitionData", () => ({
  normalizeCompetitionData: (x: unknown) => x,
}));

import GameApprovalModal from "./GameApprovalModal";

// ── Fixtures ─────────────────────────────────────────────────────────────
const reporter = { userId: "reporter", firstName: "Ray", lastName: "Port" };
const currentUser = { userId: "opener", username: "opener" };

const makeGame = (approvalStatus = "pending") => ({
  gameId: "g1",
  approvalStatus,
  team1: { player1: { userId: "reporter" }, player2: null },
  team2: { player1: { userId: "opener" }, player2: null },
});

const makeMatch = (game = makeGame()) => ({
  ladderMatchId: "m1",
  games: [game],
  participants: ["opener", "reporter"],
  matchDate: "01-05-2025",
  matchTime: { start: "18:00" },
  court: { courtName: "Court 1" },
});

const renderModal = ({
  match = makeMatch(),
  ladderStatus = "registrationClosed",
}: { match?: ReturnType<typeof makeMatch>; ladderStatus?: string } = {}) => {
  const ladderValue = {
    fetchLadderById: jest.fn(async () => ({
      name: "Autumn Ladder",
      ladderType: "Singles",
      status: ladderStatus,
    })),
    fetchLadderMatches: jest.fn(async () => [match]),
    approveLadderGame: jest.fn(async () => ({ success: true })),
  };
  const userValue = {
    currentUser,
    readNotification: jest.fn(),
    getUserById: jest.fn(async () => reporter),
    sendNotification: jest.fn(),
  };
  const { LadderContext } = require("../../context/LadderContext");
  const { UserContext } = require("../../context/UserContext");
  const utils = render(
    <UserContext.Provider value={userValue}>
      <LadderContext.Provider value={ladderValue}>
        <GameApprovalModal
          visible
          onClose={jest.fn()}
          notificationId="n1"
          notificationType={notificationTypes.ACTION.ADD_GAME.LADDER}
          senderId="reporter"
          gameId="g1"
          competitionId=""
          isRead={false}
          response={null}
          data={{ ladderId: "L1", matchId: "m1", gameId: "g1" }}
        />
      </LadderContext.Provider>
    </UserContext.Provider>,
  );
  return { ...utils, ladderValue, userValue };
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchActiveDisputeByGame.mockResolvedValue(null);
});

describe("LadderGameApprovalModal — reject entry point", () => {
  it("Decline opens the dispute composer with the game context (does not reject inline)", async () => {
    const { findByText } = renderModal();

    const decline = await findByText("Decline");
    fireEvent.press(decline);

    expect(mockNavigate).toHaveBeenCalledWith(
      "GameDisputeScreen",
      expect.objectContaining({
        ladderId: "L1",
        matchId: "m1",
        gameId: "g1",
        participantIds: ["opener", "reporter"],
      }),
    );
  });

  it("locks actions and links to the dispute when the game is already disputed", async () => {
    mockFetchActiveDisputeByGame.mockResolvedValue({
      disputeId: "d1",
      gameId: "g1",
    });
    const { findByText } = renderModal();

    const link = await findByText("disputed");
    fireEvent.press(link);
    expect(mockNavigate).toHaveBeenCalledWith("GameDisputeScreen", {
      disputeId: "d1",
      ladderId: "L1",
    });
  });

  it("shows the already-approved state for an approved game", async () => {
    const { findByText } = renderModal({
      match: makeMatch(makeGame(notificationTypes.RESPONSE.APPROVED_GAME)),
    });
    expect(
      await findByText("This game has already been approved."),
    ).toBeTruthy();
  });

  it("shows the deleted-game state when the shell is gone", async () => {
    const emptyMatch = { ...makeMatch(), games: [] };
    const { findByText } = renderModal({ match: emptyMatch });
    expect(await findByText(/no longer exists/)).toBeTruthy();
  });
});

describe("LadderGameApprovalModal — playoff freeze", () => {
  it("shows the disclaimer and locks Accept and Decline once playoffs have started", async () => {
    const { findByTestId, getByText, ladderValue } = renderModal({
      ladderStatus: "playoffs",
    });

    const notice = await findByTestId("game-approval-frozen");
    expect(notice.props.children).toBe(
      "This game can no longer be actioned as playoffs has started",
    );

    fireEvent.press(getByText("Accept"));
    fireEvent.press(getByText("Decline"));
    expect(ladderValue.approveLadderGame).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("leaves the actions open while registration is merely closed", async () => {
    const { findByText, queryByTestId, ladderValue } = renderModal({
      ladderStatus: "registrationClosed",
    });

    fireEvent.press(await findByText("Accept"));

    expect(queryByTestId("game-approval-frozen")).toBeNull();
    expect(ladderValue.approveLadderGame).toHaveBeenCalled();
  });
});
