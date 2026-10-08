import { renderHook } from "@testing-library/react-native";
import type { Game } from "@shared/types";

const mockScrollToGameGlow = jest.fn();
jest.mock("@/components/GameCardGlow", () => ({
  useScrollToGameGlow: (...args: unknown[]) => mockScrollToGameGlow(...args),
}));

import {
  findGamePosition,
  useBracketScrollToGame,
} from "./useBracketScrollToGame";

const game = (gameId: string) => ({ gameId }) as unknown as Game;

const treeRounds = [
  { round: 1, games: [game("r1-s0"), game("r1-s1"), game("r1-s2")] },
  { round: 2, games: [game("r2-s0")] },
];
const playoffGame = game("r2-s1");

const setup = (scrollToGameId?: string, scrollTopOffset = 40) => {
  const scrollTo = jest.fn();
  const scrollToEnd = jest.fn();
  const cardLayout = jest.fn((roundIndex: number, gameIndex: number) => ({
    x: 0,
    y: 100 + roundIndex * 1000 + gameIndex * 200,
    width: 300,
    height: 120,
  }));
  renderHook(() =>
    useBracketScrollToGame({
      scrollToGameId,
      treeRounds,
      playoffGame,
      maxGamesInAnyRound: 3,
      verticalScrollRef: { current: { scrollTo, scrollToEnd } } as never,
      cardLayout,
      scrollTopOffset,
    }),
  );
  const scrollToGame = mockScrollToGameGlow.mock.calls.at(-1)?.[1] as jest.Mock;
  return { scrollTo, scrollToEnd, scrollToGame };
};

beforeEach(() => {
  mockScrollToGameGlow.mockReset();
});

describe("findGamePosition", () => {
  it("finds the round and slot of a game", () => {
    expect(findGamePosition(treeRounds, "r1-s2")).toEqual({
      roundIndex: 0,
      gameIndex: 2,
    });
    expect(findGamePosition(treeRounds, "r2-s0")).toEqual({
      roundIndex: 1,
      gameIndex: 0,
    });
  });

  it("returns -1 for an unknown game or no id", () => {
    const missing = { roundIndex: -1, gameIndex: -1 };
    expect(findGamePosition(treeRounds, "nope")).toEqual(missing);
    expect(findGamePosition(treeRounds, undefined)).toEqual(missing);
  });
});

describe("useBracketScrollToGame", () => {
  it("passes the target game to the glow hook", () => {
    setup("r1-s1");
    expect(mockScrollToGameGlow.mock.calls.at(-1)?.[0]).toBe("r1-s1");
  });

  it("scrolls to the game's measured position minus the top offset", () => {
    const { scrollTo, scrollToGame } = setup("r1-s1");

    expect(scrollToGame("r1-s1")).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ y: 260, animated: true });
  });

  it("never scrolls above the top", () => {
    const { scrollTo, scrollToGame } = setup("r1-s0", 500);

    scrollToGame("r1-s0");
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it("scrolls to the end for the 3rd/4th playoff", () => {
    const { scrollTo, scrollToEnd, scrollToGame } = setup("r2-s1");

    expect(scrollToGame("r2-s1")).toBe(true);
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does nothing for a game that is not in the bracket", () => {
    const { scrollTo, scrollToEnd, scrollToGame } = setup("nope");

    expect(scrollToGame("nope")).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(scrollToEnd).not.toHaveBeenCalled();
  });
});
