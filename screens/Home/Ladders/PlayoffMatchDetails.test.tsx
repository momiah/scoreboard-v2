import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { buildLadderPlayoffTies } from "@shared/helpers";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { ladderId: "L1", tieId: "r1-s0" } }),
}));
jest.mock("../../../context/LadderContext", () => ({
  LadderContext: require("react").createContext({}),
}));
jest.mock("../../../context/UserContext", () => ({
  UserContext: require("react").createContext({}),
}));
jest.mock("../../../components/ladder/MatchCard", () => {
  const { Text } = require("react-native");
  return ({ match, testID }: { match: { matchStatus: string }; testID?: string }) => (
    <Text testID={testID}>{`card ${match.matchStatus}`}</Text>
  );
});
jest.mock("../../../components/Summary/LadderHomeCourtSection", () => {
  const { Text } = require("react-native");
  return () => <Text testID="home-court-section">home court</Text>;
});
jest.mock("../../../components/Modals/ScheduleMatchModal", () => {
  const { Text } = require("react-native");
  return ({ title }: { title: string }) => <Text testID="arrange-modal">{title}</Text>;
});
const mockHomeCourt = jest.fn();
jest.mock("../../../hooks/useLadderHomeCourt", () => ({
  useLadderHomeCourt: () => mockHomeCourt(),
}));

import PlayoffMatchDetails from "./PlayoffMatchDetails";

const { LadderContext } = require("../../../context/LadderContext");
const { UserContext } = require("../../../context/UserContext");

const entrant = (key: string) => ({
  entrantKey: key,
  teamId: null,
  players: [{ userId: key, firstName: key.toUpperCase(), lastName: "", username: key }],
  competitionXP: 0,
  numberOfWins: 0,
  totalPointDifference: 0,
  globalXp: 0,
  joinedAt: null,
  homeCourt: null,
});

const ladder = {
  ladderId: "L1",
  name: "Test Ladder",
  ladderType: "Singles",
  currencyType: "GBP",
};

const baseTie = () =>
  buildLadderPlayoffTies({
    ladderId: "L1",
    qualifiers: [entrant("u1"), entrant("u2")],
    createdAt: new Date("2026-10-01T09:00:00Z"),
  })[0];

const game = (winner: string, loser: string) => ({
  approvalStatus: "approved",
  team1: { player1: { userId: winner }, player2: null, score: 21 },
  team2: { player1: { userId: loser }, player2: null, score: 15 },
  result: {
    winner: { team: "Team 1", players: [winner], score: 21 },
    loser: { team: "Team 2", players: [loser], score: 15 },
  },
});

const leg = (playoffLeg: number, overrides: Record<string, unknown> = {}) => ({
  ladderMatchId: `r1-s0-leg${playoffLeg}`,
  playoffTieId: "r1-s0",
  playoffLeg,
  matchStatus: "accepted",
  participants: ["u1", "u2"],
  createdBy: "u1",
  games: [],
  court: { courtId: "c1", courtName: "Court" },
  ...overrides,
});

const homeCourt = { courtId: "c1", courtName: "Home", location: {} };

const renderScreen = ({
  userId,
  tie,
  matches = [],
}: {
  userId: string;
  tie: object;
  matches?: unknown[];
}) => {
  const value = {
    ladderById: ladder,
    fetchLadderById: jest.fn(async () => ladder),
    subscribeToLadderPlayoffTies: (_id: string, onUpdate: (t: unknown[]) => void) => {
      onUpdate([tie]);
      return () => {};
    },
    subscribeToPlayoffMatches: (_l: string, _t: string, onUpdate: (m: unknown[]) => void) => {
      onUpdate(matches);
      return () => {};
    },
    arrangePlayoffMatch: jest.fn(async () => ({ success: true })),
    acceptPlayoffMatch: jest.fn(async () => ({ success: true })),
    flipPlayoffCoin: jest.fn(async () => true),
  };
  const utils = render(
    <UserContext.Provider value={{ currentUser: { userId } }}>
      <LadderContext.Provider value={value}>
        <PlayoffMatchDetails />
      </LadderContext.Provider>
    </UserContext.Provider>,
  );
  return { ...utils, value };
};

const tossed = (firstHost: "team1" | "team2") => ({
  ...baseTie(),
  coinToss: { firstHost, flippedBy: "u1", flippedAt: new Date() },
});

beforeEach(() => {
  mockNavigate.mockClear();
  mockHomeCourt.mockReturnValue({
    homeCourt,
    canChange: true,
    isEntrant: true,
    loading: false,
    confirmHomeCourt: jest.fn(),
  });
});

describe("PlayoffMatchDetails", () => {
  it("shows the round, format and deadline", () => {
    const { getByText, getByTestId } = renderScreen({ userId: "u1", tie: baseTie() });
    expect(getByText("Final")).toBeTruthy();
    expect(getByTestId("playoff-match-format").props.children.join("")).toMatch(
      /^Best of 7 per match · Finish by /,
    );
  });

  it("lets a player flip the coin", async () => {
    const { getByTestId, value } = renderScreen({ userId: "u2", tie: baseTie() });
    fireEvent.press(getByTestId("playoff-coin-flip"));
    await waitFor(() => expect(value.flipPlayoffCoin).toHaveBeenCalledWith("L1", "r1-s0"));
  });

  it("shows a match card for each match before it is arranged", () => {
    const { getByTestId } = renderScreen({ userId: "u1", tie: tossed("team1") });
    expect(getByTestId("playoff-match-leg1-tbd")).toBeTruthy();
    expect(getByTestId("playoff-match-leg2-tbd")).toBeTruthy();
  });

  it("makes viewers wait for the coin toss", () => {
    const { getByTestId } = renderScreen({ userId: "stranger", tie: baseTie() });
    expect(getByTestId("playoff-coin-waiting")).toBeTruthy();
  });

  it("asks the coin winner to arrange match 1 and the opponent to wait", () => {
    const host = renderScreen({ userId: "u1", tie: tossed("team1") });
    expect(host.getByText("Coin toss: U1 hosts the first match")).toBeTruthy();
    fireEvent.press(host.getByTestId("playoff-match-leg1-arrange"));
    expect(host.getByTestId("arrange-modal").props.children).toBe("Arrange match 1");

    const away = renderScreen({ userId: "u2", tie: tossed("team1") });
    expect(away.getByText("Waiting for U1 to arrange this match")).toBeTruthy();
    expect(away.getByTestId("playoff-match-leg2-arrange")).toBeTruthy();
  });

  it("asks a host without a home court to choose one first", () => {
    mockHomeCourt.mockReturnValue({
      homeCourt: null,
      canChange: true,
      isEntrant: true,
      loading: false,
      confirmHomeCourt: jest.fn(),
    });
    const { getByTestId, getByText } = renderScreen({ userId: "u1", tie: tossed("team1") });
    expect(getByText("Choose your home court to arrange this match.")).toBeTruthy();
    expect(getByTestId("home-court-section")).toBeTruthy();
  });

  it("lets only the opposing side accept a posted match", async () => {
    const matches = [leg(1, { matchStatus: "posted" })];
    const away = renderScreen({ userId: "u2", tie: tossed("team1"), matches });
    fireEvent.press(away.getByTestId("playoff-match-leg1-accept"));
    await waitFor(() =>
      expect(away.value.acceptPlayoffMatch).toHaveBeenCalledWith({
        ladderId: "L1",
        matchId: "r1-s0-leg1",
        userId: "u2",
      }),
    );

    const host = renderScreen({ userId: "u1", tie: tossed("team1"), matches });
    expect(host.queryByTestId("playoff-match-leg1-accept")).toBeNull();
  });

  it("totals the aggregate across both matches", () => {
    const matches = [
      leg(1, { matchStatus: "completed", games: [game("u1", "u2"), game("u1", "u2")] }),
      leg(2, { games: [game("u2", "u1")] }),
    ];
    const { getByTestId } = renderScreen({ userId: "u1", tie: tossed("team1"), matches });
    expect(getByTestId("playoff-match-aggregate")).toHaveTextContent(/2 – 1/);
  });

  it("offers to play the second match at the same court once match 1 is complete", () => {
    const matches = [leg(1, { matchStatus: "completed" })];
    const { getByTestId } = renderScreen({ userId: "u2", tie: tossed("team1"), matches });
    expect(getByTestId("playoff-match-play-here")).toBeTruthy();
  });

  it("shows the deciding game", () => {
    const matches = [
      leg(1, { matchStatus: "completed" }),
      leg(2, { matchStatus: "completed" }),
      leg(3, { bestOf: 1 }),
    ];
    const { getByText, getByTestId } = renderScreen({ userId: "u1", tie: tossed("team1"), matches });
    expect(getByText("Level on aggregate. One deciding game to play.")).toBeTruthy();
    expect(getByTestId("playoff-match-decider")).toBeTruthy();
  });

  it("shows who went through once the game is settled", () => {
    const { getByTestId, queryByTestId } = renderScreen({
      userId: "u1",
      tie: { ...tossed("team1"), status: "completed", winner: "team2", outcome: "played" },
    });
    expect(getByTestId("playoff-match-outcome").props.children).toBe("U2 goes through.");
    expect(queryByTestId("playoff-coin-result")).toBeNull();
  });

  it("explains a void game", () => {
    const { getByTestId } = renderScreen({
      userId: "u1",
      tie: { ...baseTie(), status: "completed", winner: null, outcome: "void" },
    });
    expect(getByTestId("playoff-match-outcome").props.children).toBe(
      "Not played in time, so neither side goes through.",
    );
  });
});
