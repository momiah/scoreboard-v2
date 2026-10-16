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
  return ({
    match,
    testID,
  }: {
    match: { matchStatus: string };
    testID?: string;
  }) => <Text testID={testID}>{`card ${match.matchStatus}`}</Text>;
});
jest.mock("../../../components/Modals/PlayoffMatchScheduleModal", () => {
  const { Text } = require("react-native");
  return ({
    title,
    bestOf,
    defaultCourt,
  }: {
    title: string;
    bestOf: number;
    defaultCourt: { courtName: string } | null;
  }) => (
    <Text testID="arrange-modal">
      {`${title} | best of ${bestOf} | ${defaultCourt?.courtName ?? "no court"}`}
    </Text>
  );
});
jest.mock("../../../hooks/usePlayoffMatchScheduling", () => ({
  usePlayoffMatchScheduling: () => ({
    notifyArranged: jest.fn(),
    respond: jest.fn(),
  }),
}));
const mockChatRoom = jest.fn((_props: Record<string, unknown>) => null);
jest.mock(
  "../../../components/ChatRoom/ChatRoom",
  () => (props: Record<string, unknown>) => mockChatRoom(props),
);
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
  players: [
    { userId: key, firstName: key.toUpperCase(), lastName: "", username: key },
  ],
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
  otherTies = [],
}: {
  userId: string;
  tie: object;
  matches?: unknown[];
  otherTies?: object[];
}) => {
  const value = {
    ladderById: ladder,
    fetchLadderById: jest.fn(async () => ladder),
    subscribeToLadderPlayoffTies: (
      _id: string,
      onUpdate: (t: unknown[]) => void,
    ) => {
      onUpdate([tie, ...otherTies]);
      return () => {};
    },
    subscribeToPlayoffMatches: (
      _l: string,
      _t: string,
      onUpdate: (m: unknown[]) => void,
    ) => {
      onUpdate(matches);
      return () => {};
    },
    arrangePlayoffMatch: jest.fn(async () => ({ success: true })),
    respondToPlayoffMatch: jest.fn(async () => ({ success: true })),
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

const ranked = (firstHost: "team1" | "team2") => {
  const tie = baseTie();
  const [hostRank, otherRank] = [9, 2];
  return {
    ...tie,
    side1: { ...tie.side1, rank: firstHost === "team1" ? hostRank : otherRank },
    side2: { ...tie.side2, rank: firstHost === "team2" ? hostRank : otherRank },
  };
};

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
  it("shows the round, the best-of and a live countdown to the deadline", () => {
    const { getByText, getByTestId } = renderScreen({
      userId: "u1",
      tie: baseTie(),
    });
    expect(getByTestId("playoff-prize-banner")).toHaveTextContent(
      /Final · Tie 1/,
    );
    expect(getByTestId("playoff-match-format")).toHaveTextContent(
      /Best of 7.*per match/,
    );
    expect(getByTestId("playoff-match-deadline")).toHaveTextContent(
      /\d+ days? and \d+ hours?to complete both matches|Time's up/,
    );
  });

  it("lets the host arrange a match again after it was cancelled", () => {
    const matches = [leg(1, { matchStatus: "cancelled" })];
    const { getByTestId, queryByTestId } = renderScreen({
      userId: "u1",
      tie: ranked("team1"),
      matches,
    });
    expect(queryByTestId("playoff-match-leg1")).toBeNull();
    expect(getByTestId("playoff-match-leg1-arrange")).toBeTruthy();
  });

  it("asks the lower-ranked host to arrange match 1 and the opponent to wait", () => {
    const host = renderScreen({ userId: "u1", tie: ranked("team1") });
    fireEvent.press(host.getByTestId("playoff-match-leg1-arrange"));
    expect(host.getByTestId("arrange-modal").props.children).toBe(
      "Arrange match 1 | best of 7 | Home",
    );
    expect(host.getByTestId("playoff-match-leg2-waiting")).toBeTruthy();
    expect(host.getByTestId("playoff-match-leg1-host")).toHaveTextContent(
      /U1$/,
    );
    expect(host.getByTestId("playoff-match-leg2-host")).toHaveTextContent(
      /U2$/,
    );

    const away = renderScreen({ userId: "u2", tie: ranked("team1") });
    expect(
      away.getByText("Waiting for your opponent to arrange their home match"),
    ).toBeTruthy();
    expect(away.queryByTestId("playoff-match-leg2-arrange")).toBeNull();
    expect(away.getByText("Your opponent arranges match 1 first")).toBeTruthy();
    expect(host.getByText("Arranged once match 1 is arranged")).toBeTruthy();

    const afterMatchOne = renderScreen({
      userId: "u2",
      tie: ranked("team1"),
      matches: [leg(1, { matchStatus: "posted" })],
    });
    expect(
      afterMatchOne.getByTestId("playoff-match-leg2-arrange"),
    ).toBeTruthy();
    expect(away.getByTestId("playoff-match-leg1-host")).toHaveTextContent(
      /U1$/,
    );
    expect(away.getByTestId("playoff-match-leg2-host")).toHaveTextContent(
      /U2$/,
    );
  });

  it("names the host for onlookers, and waits for both players before that", () => {
    const viewer = renderScreen({ userId: "stranger", tie: ranked("team1") });
    expect(
      viewer.getByText("Waiting for U1 to arrange their home match"),
    ).toBeTruthy();
    const early = renderScreen({
      userId: "u1",
      tie: {
        ...baseTie(),
        status: "awaitingEntrants",
        side2: null,
        team2: { player1: null, player2: null },
      },
    });
    expect(viewer.getByTestId("playoff-match-leg1-host")).toHaveTextContent(
      /U1$/,
    );
    expect(
      early.getAllByText("Arranged once both players are known"),
    ).toHaveLength(2);
  });

  it("lets a host without a home court pick any court", () => {
    mockHomeCourt.mockReturnValue({
      homeCourt: null,
      canChange: true,
      isEntrant: true,
      loading: false,
      confirmHomeCourt: jest.fn(),
    });
    const { getByTestId } = renderScreen({
      userId: "u1",
      tie: ranked("team1"),
    });
    fireEvent.press(getByTestId("playoff-match-leg1-arrange"));
    expect(getByTestId("arrange-modal").props.children).toBe(
      "Arrange match 1 | best of 7 | no court",
    );
  });

  it("shows a posted match as its card, with no accept button on this screen", () => {
    const matches = [leg(1, { matchStatus: "posted" })];
    const away = renderScreen({ userId: "u2", tie: ranked("team1"), matches });
    expect(away.getByTestId("playoff-match-leg1")).toBeTruthy();
    expect(away.queryByTestId("playoff-match-leg1-accept")).toBeNull();
  });

  it("totals the aggregate across both matches", () => {
    const matches = [
      leg(1, {
        matchStatus: "completed",
        games: [game("u1", "u2"), game("u1", "u2")],
      }),
      leg(2, { games: [game("u2", "u1")] }),
    ];
    const { getByTestId } = renderScreen({
      userId: "u1",
      tie: ranked("team1"),
      matches,
    });
    expect(getByTestId("playoff-match-aggregate")).toHaveTextContent(
      /Aggregate.*2 - 1/,
    );
  });

  it("shows the deciding game", () => {
    const matches = [
      leg(1, { matchStatus: "completed" }),
      leg(2, { matchStatus: "completed" }),
      leg(3, { bestOf: 1 }),
    ];
    const { getByText, getByTestId } = renderScreen({
      userId: "u1",
      tie: ranked("team1"),
      matches,
    });
    expect(
      getByText("Level on aggregate. One deciding game to play."),
    ).toBeTruthy();
    expect(getByTestId("playoff-match-decider")).toBeTruthy();
  });

  it("shows who went through once the game is settled", () => {
    const { getByTestId, queryByTestId, toJSON } = renderScreen({
      userId: "u1",
      tie: {
        ...ranked("team1"),
        status: "completed",
        winner: "team2",
        outcome: "played",
      },
    });
    expect(getByTestId("playoff-match-outcome")).toHaveTextContent(
      /Winner.*U2.*Ladder champion/,
    );
    const order = ["playoff-match-outcome", "playoff-match-aggregate"].map(
      (id) => JSON.stringify(toJSON()).indexOf(`"testID":"${id}"`),
    );
    expect(order).toEqual([...order].sort((x, y) => x - y));
    expect(getByTestId("playoff-prize-banner")).toBeTruthy();
    expect(getByTestId("playoff-match-deadline")).toHaveTextContent(/Finished/);
  });

  it("explains a void game with the same layout for onlookers", () => {
    const { getByTestId, getAllByText } = renderScreen({
      userId: "stranger",
      tie: { ...baseTie(), status: "completed", winner: null, outcome: "void" },
    });
    expect(getByTestId("playoff-match-outcome")).toHaveTextContent(
      /Not played in time, so neither side goes through\./,
    );
    expect(getByTestId("playoff-match-aggregate")).toBeTruthy();
    expect(getByTestId("playoff-match-deadline")).toHaveTextContent(/Finished/);
    expect(getByTestId("playoff-match-leg1-closed")).toBeTruthy();
    expect(getAllByText("Not played")).toHaveLength(2);
  });

  it("names the next round for a winner, and says when it was a walkover", () => {
    const tie = {
      ...ranked("team1"),
      status: "completed",
      winner: "team1",
      outcome: "walkover",
    };
    const semi = { ...baseTie(), tieId: "r2-s0", round: 2, slot: 0 };
    const { getByTestId } = renderScreen({
      userId: "stranger",
      tie,
      otherTies: [semi],
    });
    expect(getByTestId("playoff-match-outcome")).toHaveTextContent(
      /Winner.*U1.*Through to the Final on a walkover/,
    );
  });

  it("shows the tie chat to everyone but only lets its players use it", () => {
    const player = renderScreen({ userId: "u1", tie: baseTie() });
    expect(player.getByTestId("playoff-match-tab-Tie Lobby")).toBeTruthy();
    fireEvent.press(player.getByTestId("playoff-match-tab-Chat Room"));
    expect(mockChatRoom.mock.calls.at(-1)?.[0]).toMatchObject({
      competitionId: "L1-r1-s0",
      chatPath: ["ladders", "L1", "playoffTies", "r1-s0", "chat"],
      competitionParticipants: [{ userId: "u1" }, { userId: "u2" }],
    });

    expect(mockChatRoom.mock.calls.at(-1)?.[0]).toMatchObject({
      userRole: "participant",
    });

    const spectator = renderScreen({ userId: "stranger", tie: baseTie() });
    fireEvent.press(spectator.getByTestId("playoff-match-tab-Chat Room"));
    expect(mockChatRoom.mock.calls.at(-1)?.[0]).toMatchObject({
      userRole: "user",
    });
  });

  it("has the lower-ranked player host match 1 for everyone", () => {
    for (const userId of ["u1", "u2", "stranger"]) {
      const view = renderScreen({ userId, tie: baseTie() });
      expect(view.getByTestId("playoff-match-leg1-host")).toHaveTextContent(
        /U2$/,
      );
      expect(view.getByTestId("playoff-match-leg2-host")).toHaveTextContent(
        /U1$/,
      );
      expect(view.getByTestId("playoff-match-aggregate")).not.toHaveTextContent(
        /#\d/,
      );
      expect(view.queryByText(/coin/i)).toBeNull();
    }
  });
});
