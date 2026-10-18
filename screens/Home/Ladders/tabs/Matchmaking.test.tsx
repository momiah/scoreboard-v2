import React from "react";
import { render, fireEvent, act } from "@testing-library/react-native";
import moment from "moment";
import { LADDER_STATUS, LADDER_TYPE, LADDER_MATCH_STATUS } from "@shared";
import type { Ladder } from "@shared/types";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (callback: () => void | (() => void)) =>
    require("react").useEffect(callback, [callback]),
}));

const mockUseLadderJoin = jest.fn();
jest.mock("../../../../hooks/useLadderJoin", () => ({
  useLadderJoin: (...args: unknown[]) => mockUseLadderJoin(...args),
}));

const mockUseLadderHomeCourt = jest.fn();
jest.mock("../../../../hooks/useLadderHomeCourt", () => ({
  useLadderHomeCourt: (...args: unknown[]) => mockUseLadderHomeCourt(...args),
}));

jest.mock("../../../../hooks/useLadderCourts", () => ({
  useLadderCourts: () => ({
    courtsList: [],
    courtsLoading: false,
    findSelectableCourt: jest.fn(),
    submitCourt: jest.fn(),
    applyCourts: jest.fn(),
    getCourts: jest.fn(),
  }),
}));

const mockSubscribeToLadderMatches = jest.fn();
jest.mock("../../../../context/LadderContext", () => ({
  LadderContext: require("react").createContext({}),
}));
jest.mock("../../../../context/PopupContext", () => ({
  PopupContext: require("react").createContext({}),
}));

jest.mock("expo-blur", () => ({ BlurView: require("react-native").View }));
jest.mock("../../../../components/LineTabs", () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock("../../../../components/Skeletons/SkeletonComponents", () => ({
  SkeletonWrapper: () => null,
}));
jest.mock("../../../../components/ladder/MatchCard", () => ({
  __esModule: true,
  default: ({
    match,
    onPress,
    testID,
  }: {
    match: { ladderMatchId: string };
    onPress: jest.Mock;
    testID: string;
  }) =>
    require("react").createElement(
      require("react-native").TouchableOpacity,
      { testID, onPress: () => onPress(match) },
      require("react").createElement(
        require("react-native").Text,
        null,
        "match card",
      ),
    ),
}));
jest.mock("../../../../components/Modals/AddLadderMatchModal", () => ({
  __esModule: true,
  default: ({ modalVisible }: { modalVisible: boolean }) =>
    modalVisible
      ? require("react").createElement(
          require("react-native").Text,
          { testID: "mock-post-modal" },
          "post modal",
        )
      : null,
}));
jest.mock("../../../../components/Modals/AcceptLadderMatchModal", () => ({
  __esModule: true,
  default: ({ modalVisible }: { modalVisible: boolean }) =>
    modalVisible
      ? require("react").createElement(
          require("react-native").Text,
          { testID: "mock-accept-modal" },
          "accept modal",
        )
      : null,
}));
jest.mock("../../../../components/Modals/SearchLocationModal", () => ({
  __esModule: true,
  default: ({
    visible,
    onSelectCourt,
  }: {
    visible: boolean;
    onSelectCourt: jest.Mock;
  }) =>
    visible
      ? require("react").createElement(
          require("react-native").TouchableOpacity,
          {
            testID: "mock-court-picker",
            onPress: () => onSelectCourt("Court B"),
          },
          require("react").createElement(
            require("react-native").Text,
            null,
            "court picker",
          ),
        )
      : null,
}));

import { LadderContext } from "../../../../context/LadderContext";
import { PopupContext } from "../../../../context/PopupContext";
import Matchmaking from "./Matchmaking";

const ladder = {
  ladderId: "L1",
  name: "Test Ladder",
  ladderType: LADDER_TYPE.SINGLES,
  status: LADDER_STATUS.REGISTRATION_OPEN,
  courtIds: ["courtB"],
  registrationOpensAt: moment().subtract(1, "days").toDate(),
  seasonStartsAt: moment().subtract(1, "days").toDate(),
  seasonEndsAt: moment().add(40, "days").toDate(),
  playoffStartsAt: moment().add(30, "days").toDate(),
  playoffEndsAt: moment().add(40, "days").toDate(),
} as unknown as Ladder;

const postedMatch = {
  ladderMatchId: "m1",
  matchStatus: LADDER_MATCH_STATUS.POSTED,
  matchDate: moment().add(1, "days").format("DD-MM-YYYY"),
  matchTime: { start: "18:00" },
  participants: ["opp"],
};

const join = (overrides = {}) => ({
  isSignedIn: true,
  isParticipant: true,
  membershipChecking: false,
  ...overrides,
});

const homeCourtState = (overrides = {}) => ({
  homeCourt: null,
  hasHomeCourt: false,
  loading: false,
  confirmHomeCourt: jest.fn(),
  ...overrides,
});

const renderMatchmaking = () => {
  mockSubscribeToLadderMatches.mockImplementation((_id, onNext) => {
    onNext([postedMatch]);
    return jest.fn();
  });
  return render(
    <LadderContext.Provider
      value={
        { subscribeToLadderMatches: mockSubscribeToLadderMatches } as never
      }
    >
      <PopupContext.Provider value={{ showBottomToast: jest.fn() } as never}>
        <Matchmaking ladder={ladder} />
      </PopupContext.Provider>
    </LadderContext.Provider>,
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseLadderJoin.mockReturnValue(join());
  mockUseLadderHomeCourt.mockReturnValue(homeCourtState());
});

describe("Matchmaking home court gate", () => {
  it("asks for a home court before opening the post modal", () => {
    const utils = renderMatchmaking();

    fireEvent.press(utils.getByTestId("matchmaking-post-match"));

    expect(utils.getByTestId("home-court-required-modal")).toBeTruthy();
    expect(utils.queryByTestId("mock-post-modal")).toBeNull();
  });

  it("opens the post modal directly when a home court is set", () => {
    mockUseLadderHomeCourt.mockReturnValue(
      homeCourtState({ hasHomeCourt: true }),
    );
    const utils = renderMatchmaking();

    fireEvent.press(utils.getByTestId("matchmaking-post-match"));

    expect(utils.getByTestId("mock-post-modal")).toBeTruthy();
    expect(utils.queryByTestId("home-court-required-modal")).toBeNull();
  });

  it("asks for a home court before opening the accept modal", () => {
    const utils = renderMatchmaking();

    fireEvent.press(utils.getByTestId("matchmaking-card-m1"));

    expect(utils.getByTestId("home-court-required-modal")).toBeTruthy();
    expect(utils.queryByTestId("mock-accept-modal")).toBeNull();
  });

  it("opens the accept modal directly when a home court is set", () => {
    mockUseLadderHomeCourt.mockReturnValue(
      homeCourtState({ hasHomeCourt: true }),
    );
    const utils = renderMatchmaking();

    fireEvent.press(utils.getByTestId("matchmaking-card-m1"));

    expect(utils.getByTestId("mock-accept-modal")).toBeTruthy();
  });

  it("hands off from the info modal to the court picker", () => {
    jest.useFakeTimers();
    const utils = renderMatchmaking();

    fireEvent.press(utils.getByTestId("matchmaking-post-match"));
    fireEvent.press(utils.getByTestId("home-court-required-modal-cta"));
    act(() => jest.advanceTimersByTime(400));

    expect(utils.getByTestId("mock-court-picker")).toBeTruthy();
    jest.useRealTimers();
  });

  it("continues to the post modal once the home court is saved", () => {
    jest.useFakeTimers();
    const confirmHomeCourt = jest.fn((_court, onSaved) => onSaved?.());
    mockUseLadderHomeCourt.mockReturnValue(
      homeCourtState({ confirmHomeCourt }),
    );
    const utils = renderMatchmaking();

    fireEvent.press(utils.getByTestId("matchmaking-post-match"));
    fireEvent.press(utils.getByTestId("home-court-required-modal-cta"));
    act(() => jest.advanceTimersByTime(400));
    fireEvent.press(utils.getByTestId("mock-court-picker"));
    act(() => jest.advanceTimersByTime(400));

    expect(confirmHomeCourt).toHaveBeenCalled();
    expect(utils.getByTestId("mock-post-modal")).toBeTruthy();
    expect(utils.queryByTestId("mock-court-picker")).toBeNull();
    jest.useRealTimers();
  });

  it("drops the pending action when the info modal is closed", () => {
    const utils = renderMatchmaking();

    fireEvent.press(utils.getByTestId("matchmaking-post-match"));
    fireEvent.press(utils.getByTestId("home-court-required-modal-close"));

    expect(utils.queryByTestId("mock-post-modal")).toBeNull();
    expect(utils.queryByTestId("mock-court-picker")).toBeNull();
  });
});
