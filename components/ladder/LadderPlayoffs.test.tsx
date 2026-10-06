import React from "react";
import { render } from "@testing-library/react-native";
import { LADDER_STATUS, LADDER_TYPE } from "@shared";
import { buildLadderPlayoffTies } from "@shared/helpers";

jest.mock("../../context/LadderContext", () => ({
  LadderContext: require("react").createContext({}),
}));

const mockBracketTree = jest.fn();
jest.mock("../Tournaments/Brackets/BracketTree", () => {
  const { Text } = require("react-native");
  return (props: { fixtures: unknown[]; tournamentType: string }) => {
    mockBracketTree(props);
    return <Text testID="bracket-tree">bracket</Text>;
  };
});

import LadderPlayoffs from "./LadderPlayoffs";

const { LadderContext } = require("../../context/LadderContext");

const ladder = (overrides = {}) =>
  ({
    ladderId: "L1",
    ladderType: LADDER_TYPE.SINGLES,
    status: LADDER_STATUS.REGISTRATION_CLOSED,
    participantCount: 300,
    maxPlayers: 512,
    playoffStartsAt: new Date(2026, 11, 1, 18, 0),
    ...overrides,
  }) as never;

const renderWithTies = (
  ladderOverrides = {},
  ties: unknown[] | null = [],
) => {
  const subscribeToLadderPlayoffTies = jest.fn(
    (_ladderId: string, onUpdate: (ties: unknown[]) => void) => {
      if (ties) onUpdate(ties);
      return () => {};
    },
  );
  const utils = render(
    <LadderContext.Provider value={{ subscribeToLadderPlayoffTies }}>
      <LadderPlayoffs ladder={ladder(ladderOverrides)} />
    </LadderContext.Provider>,
  );
  return { ...utils, subscribeToLadderPlayoffTies };
};

const entrant = (key: string) => ({
  entrantKey: key,
  teamId: null,
  players: [{ userId: key, firstName: key, lastName: "", username: key }],
  competitionXP: 0,
  numberOfWins: 0,
  totalPointDifference: 0,
  globalXp: 0,
  joinedAt: null,
  homeCourt: null,
});

beforeEach(() => mockBracketTree.mockClear());

describe("LadderPlayoffs", () => {
  it("shows a skeleton until the ties load", () => {
    const { getByTestId } = renderWithTies({}, null);
    expect(getByTestId("ladder-playoffs-loading")).toBeTruthy();
  });

  it("explains when the bracket is created and how many qualify", () => {
    const { getByTestId, getByText } = renderWithTies();
    expect(getByTestId("ladder-playoffs-empty")).toBeTruthy();
    expect(getByText("Playoffs haven't started yet")).toBeTruthy();
    expect(
      getByText(
        "The bracket is created on Tue 1 Dec at 18:00. The top 16 players in the ladder qualify, and first-round opponents are paired by home court distance.",
      ),
    ).toBeTruthy();
  });

  it("says teams for doubles", () => {
    const { getByText } = renderWithTies({
      ladderType: LADDER_TYPE.DOUBLES,
      participantCount: 150,
    });
    expect(getByText(/The top 8 teams in the ladder qualify/)).toBeTruthy();
  });

  it("explains the minimum when the ladder is too small", () => {
    const { getByText } = renderWithTies({ participantCount: 90 });
    expect(
      getByText("Playoffs need at least 128 players when registration closes."),
    ).toBeTruthy();
  });

  it("shows the cancellation reason for a cancelled ladder", () => {
    const { getByText } = renderWithTies({
      status: LADDER_STATUS.CANCELLED,
      cancelledReason: "Too few registrations",
    });
    expect(getByText("This ladder was cancelled")).toBeTruthy();
    expect(getByText("Too few registrations")).toBeTruthy();
  });

  it("renders the bracket from the ties", () => {
    const ties = buildLadderPlayoffTies({
      ladderId: "L1",
      qualifiers: ["a", "b", "c", "d"].map(entrant),
    });
    const { getByTestId, subscribeToLadderPlayoffTies } = renderWithTies(
      { status: LADDER_STATUS.PLAYOFFS },
      ties,
    );

    expect(subscribeToLadderPlayoffTies).toHaveBeenCalledWith(
      "L1",
      expect.any(Function),
      expect.any(Function),
    );
    expect(getByTestId("ladder-playoffs-bracket")).toBeTruthy();
    const { fixtures, tournamentType } = mockBracketTree.mock.calls[0][0];
    expect(tournamentType).toBe(LADDER_TYPE.SINGLES);
    expect(
      fixtures.map((round: { games: { gameId: string }[] }) =>
        round.games.map((game) => game.gameId),
      ),
    ).toEqual([
      ["r1-s0", "r1-s1"],
      ["r2-s0", "r2-s1"],
    ]);
  });
});
