import React from "react";
import { render } from "@testing-library/react-native";

const mockDispatch = jest.fn();
let mockParams: Record<string, unknown> = {};
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: mockDispatch,
  }),
  useRoute: () => ({ params: mockParams }),
  useFocusEffect: (effect: () => void | (() => void)) =>
    require("react").useEffect(effect, []),
  StackActions: {
    popTo: (name: string, params: object) => ({ type: "POP_TO", name, params }),
  },
}));
jest.mock("../../../context/LadderContext", () => ({
  LadderContext: require("react").createContext({}),
}));
jest.mock("../../../context/UserContext", () => ({
  UserContext: require("react").createContext({}),
}));
jest.mock("../../../components/ChatRoom/ChatRoom", () => () => null);
jest.mock("../../../components/ladder/GameLobby", () => () => null);
const mockMatchCard = jest.fn((_props: Record<string, unknown>) => null);
jest.mock(
  "../../../components/ladder/MatchCard",
  () => (props: Record<string, unknown>) => mockMatchCard(props),
);
jest.mock(
  "../../../components/ladder/MatchCancellationBanner",
  () => () => null,
);
jest.mock("../../../components/ladder/MatchRescheduleBanner", () => () => null);
jest.mock(
  "../../../components/ladder/PlayoffMatchConfirmBanner",
  () => () => null,
);
jest.mock("../../../components/Modals/MatchCheckinModal", () => ({
  LocationVerifierModal: () => null,
}));
jest.mock("../../../helpers/useForfeitLabel", () => ({
  useForfeitLabel: () => undefined,
}));

import MatchDetails from "./MatchDetails";

const { LadderContext } = require("../../../context/LadderContext");
const { UserContext } = require("../../../context/UserContext");

const match = (overrides: Record<string, unknown> = {}) => ({
  ladderMatchId: "r1-s0-leg1",
  playoffTieId: "r1-s0",
  playoffLeg: 1,
  matchStatus: "posted",
  participants: ["u1", "u2"],
  createdBy: "u1",
  games: [],
  court: { courtName: "Court" },
  ...overrides,
});

const renderWith = (current: Record<string, unknown>, userId = "u1") => {
  mockParams = {
    ladderId: "L1",
    matchId: current.ladderMatchId,
    match: current,
  };
  return render(
    <UserContext.Provider value={{ currentUser: { userId } }}>
      <LadderContext.Provider
        value={{
          subscribeToLadderMatches: (
            _id: string,
            onUpdate: (m: unknown[]) => void,
          ) => {
            onUpdate([current]);
            return () => {};
          },
        }}
      >
        <MatchDetails />
      </LadderContext.Provider>
    </UserContext.Provider>,
  );
};

beforeEach(() => mockDispatch.mockClear());

describe("MatchDetails for a playoff match", () => {
  it("returns to the tie screen once the match is cancelled or expired", () => {
    renderWith(match({ matchStatus: "cancelled" }));
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "POP_TO",
      name: "PlayoffMatchDetails",
      params: { ladderId: "L1", tieId: "r1-s0" },
    });
  });

  it("stays on an open playoff match and on a cancelled regular match", () => {
    renderWith(match());
    renderWith(
      match({
        matchStatus: "cancelled",
        playoffTieId: null,
        ladderMatchId: "m2",
      }),
    );
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it("shows the match menu to players only", () => {
    expect(
      renderWith(match({ matchStatus: "accepted" })).getByTestId(
        "match-details-burger",
      ),
    ).toBeTruthy();
    expect(
      renderWith(match({ matchStatus: "accepted" }), "stranger").queryByTestId(
        "match-details-burger",
      ),
    ).toBeNull();
  });

  it("offers check-in to players only, and shows spectators the match status", () => {
    mockMatchCard.mockClear();
    renderWith(match({ matchStatus: "accepted" }));
    expect(mockMatchCard.mock.calls.at(-1)?.[0]).toMatchObject({
      showProgress: false,
    });
    expect(mockMatchCard.mock.calls.at(-1)?.[0].checkin).toBeTruthy();

    mockMatchCard.mockClear();
    renderWith(match({ matchStatus: "accepted" }), "stranger");
    expect(mockMatchCard.mock.calls.at(-1)?.[0]).toMatchObject({
      showProgress: true,
    });
    expect(mockMatchCard.mock.calls.at(-1)?.[0].checkin).toBeUndefined();
  });
});
