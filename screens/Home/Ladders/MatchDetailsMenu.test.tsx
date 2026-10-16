import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockGoBack = jest.fn();
const mockDispatch = jest.fn();
const mockStartCancellation = jest.fn();
let mockParams: Record<string, unknown> = {};
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: mockGoBack,
    dispatch: mockDispatch,
  }),
  StackActions: {
    popTo: (name: string, params: object) => ({ type: "POP_TO", name, params }),
  },
  useRoute: () => ({ params: mockParams }),
}));
jest.mock("../../../context/LadderContext", () => ({
  LadderContext: require("react").createContext({}),
}));
jest.mock("../../../context/UserContext", () => ({
  UserContext: require("react").createContext({}),
}));
jest.mock("../../../context/PopupContext", () => ({
  PopupContext: require("react").createContext({}),
}));
jest.mock("../../../components/Modals/ReportPlayerModal", () => () => null);
jest.mock("../../../components/Modals/ScheduleMatchModal", () => {
  const { Text } = require("react-native");
  return ({ visible, testID }: { visible: boolean; testID: string }) =>
    visible ? <Text testID={testID}>schedule</Text> : null;
});
jest.mock("../../../components/Modals/InfoModal", () => {
  const { Text, TouchableOpacity, View } = require("react-native");
  return ({
    visible,
    description,
    ctaLabel,
    onCtaPress,
    testID,
  }: {
    visible: boolean;
    description: string;
    ctaLabel: string;
    onCtaPress: () => void;
    testID: string;
  }) =>
    visible ? (
      <View testID={testID}>
        <Text testID={`${testID}-description`}>{description}</Text>
        <TouchableOpacity testID={`${testID}-cta`} onPress={onCtaPress}>
          <Text>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    ) : null;
});
jest.mock("../../../hooks/useLadderMatchCancellation", () => ({
  useLadderMatchCancellation: () => ({
    startCancellation: mockStartCancellation,
  }),
}));
const mockExtendMatch = jest.fn(async () => true);
jest.mock("../../../hooks/useLadderMatchChanges", () => ({
  useLadderMatchChanges: () => ({
    requestReschedule: jest.fn(),
    extendMatch: mockExtendMatch,
  }),
}));

import MatchDetailsMenu from "./MatchDetailsMenu";

const { LadderContext } = require("../../../context/LadderContext");
const { UserContext } = require("../../../context/UserContext");
const { PopupContext } = require("../../../context/PopupContext");

const shell = { gameId: "g1", result: null, approvalStatus: "" };
const reported = {
  gameId: "g1",
  result: { winner: { team: "Team 1" } },
  approvalStatus: "approved",
};

const baseMatch = (overrides: Record<string, unknown> = {}) => ({
  ladderMatchId: "m1",
  matchStatus: "accepted",
  participants: ["u1", "u2"],
  createdBy: "u1",
  games: [shell],
  court: { courtName: "Court" },
  ...overrides,
});

const renderMenu = (
  match: Record<string, unknown>,
  { userId = "u1", deadline = null as Date | null } = {},
) => {
  mockParams = { ladderId: "L1", matchId: "m1", match };
  return render(
    <UserContext.Provider value={{ currentUser: { userId } }}>
      <PopupContext.Provider value={{ showBottomToast: jest.fn() }}>
        <LadderContext.Provider
          value={{ fetchLadderMatchDeadline: jest.fn(async () => deadline) }}
        >
          <MatchDetailsMenu />
        </LadderContext.Provider>
      </PopupContext.Provider>
    </UserContext.Provider>,
  );
};

const label = (utils: ReturnType<typeof render>, id: string) =>
  utils.getByTestId(`match-menu-${id}`);

beforeEach(() => {
  mockGoBack.mockClear();
  mockDispatch.mockClear();
  mockStartCancellation.mockClear();
  mockExtendMatch.mockClear();
});

describe("MatchDetailsMenu changes", () => {
  it("offers Reschedule before any game, through the info modal", async () => {
    const utils = renderMenu(baseMatch());
    expect(utils.getByText("Reschedule Match")).toBeTruthy();
    expect(utils.queryByTestId("match-menu-Extension")).toBeNull();
    fireEvent.press(label(utils, "RescheduleMatch"));
    fireEvent.press(utils.getByTestId("reschedule-info-modal-cta"));
    await waitFor(() =>
      expect(utils.getByTestId("reschedule-match")).toBeTruthy(),
    );
  });

  it("shows a pending reschedule as requested on the requester's side", () => {
    const utils = renderMenu(
      baseMatch({ rescheduleRequest: { requestedBy: "u1" } }),
    );
    expect(utils.getByText("Reschedule requested")).toBeTruthy();
    fireEvent.press(label(utils, "RescheduleMatch"));
    expect(utils.queryByTestId("reschedule-info-modal")).toBeNull();
  });

  it("asks the other side to respond to a reschedule", () => {
    const utils = renderMenu(
      baseMatch({ rescheduleRequest: { requestedBy: "u1" } }),
      {
        userId: "u2",
      },
    );
    expect(utils.getByText("Respond to reschedule")).toBeTruthy();
  });

  it("offers an extension once a game is reported", async () => {
    const utils = renderMenu(baseMatch({ games: [reported, shell] }));
    expect(utils.queryByTestId("match-menu-RescheduleMatch")).toBeNull();
    fireEvent.press(label(utils, "Extension"));
    fireEvent.press(utils.getByTestId("extension-info-modal-cta"));
    await waitFor(() => expect(mockExtendMatch).toHaveBeenCalled());
    expect(mockGoBack).toHaveBeenCalled();
  });

  it("names the playoff deadline in the extension modal", async () => {
    const utils = renderMenu(
      baseMatch({ games: [reported, shell], playoffTieId: "r1-s0" }),
      { deadline: new Date(2026, 9, 20, 12) },
    );
    fireEvent.press(label(utils, "Extension"));
    await waitFor(() =>
      expect(
        utils.getByTestId("extension-info-modal-description").props.children,
      ).toMatch(/This tie must be finished by Tue 20 Oct\.$/),
    );
  });

  it("greys out an extension already used", () => {
    const utils = renderMenu(
      baseMatch({ games: [reported], extension: { expiresAt: new Date() } }),
    );
    expect(utils.getByText("Already extended")).toBeTruthy();
    fireEvent.press(label(utils, "Extension"));
    expect(utils.queryByTestId("extension-info-modal")).toBeNull();
  });

  it("hides both for a posted match and for viewers", () => {
    expect(
      renderMenu(baseMatch({ matchStatus: "posted" })).queryByTestId(
        "match-menu-RescheduleMatch",
      ),
    ).toBeNull();
    const viewer = renderMenu(baseMatch({ games: [reported] }), {
      userId: "x",
    });
    expect(viewer.queryByTestId("match-menu-Extension")).toBeNull();
  });

  it("goes straight back to the tie screen after cancelling a posted playoff match", () => {
    const utils = renderMenu(
      baseMatch({ matchStatus: "posted", playoffTieId: "r1-s0" }),
    );
    fireEvent.press(label(utils, "CancelMatch"));
    mockStartCancellation.mock.calls[0][0].onDone();
    expect(mockDispatch).toHaveBeenCalledWith({
      type: "POP_TO",
      name: "PlayoffMatchDetails",
      params: { ladderId: "L1", tieId: "r1-s0" },
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it("goes back to the match after asking to cancel an accepted playoff match", () => {
    const utils = renderMenu(baseMatch({ playoffTieId: "r1-s0" }));
    fireEvent.press(label(utils, "CancelMatch"));
    mockStartCancellation.mock.calls[0][0].onDone();
    expect(mockGoBack).toHaveBeenCalled();
  });
});
