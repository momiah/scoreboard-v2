import React from "react";
import { Alert } from "react-native";
import { renderHook, act } from "@testing-library/react-native";
import { LADDER_TYPE } from "@shared";
import type { Court } from "@shared/types";

jest.mock("../context/UserContext", () => ({
  UserContext: require("react").createContext({}),
}));
jest.mock("../context/LadderContext", () => ({
  LadderContext: require("react").createContext({}),
}));
jest.mock("../context/PopupContext", () => ({
  PopupContext: require("react").createContext({}),
}));

import { UserContext } from "../context/UserContext";
import { LadderContext } from "../context/LadderContext";
import { PopupContext } from "../context/PopupContext";
import { useLadderHomeCourt } from "./useLadderHomeCourt";

const ladder = { ladderId: "L1", ladderType: LADDER_TYPE.SINGLES } as never;

const court = (courtId: string, courtName: string) =>
  ({ courtId, courtName: ` ${courtName} ` }) as unknown as Court;

const courtB = court("b", "Court B");
const courtD = court("d", "Court D");

const showBottomToast = jest.fn();
const setLadderHomeCourt = jest.fn();
let emit: jest.Mock = jest.fn();
const subscribeToLadderHomeCourt = jest.fn((...args: unknown[]) => {
  emit = args[2] as jest.Mock;
  return jest.fn();
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserContext.Provider value={{ currentUser: { userId: "me" } } as never}>
    <LadderContext.Provider
      value={{ subscribeToLadderHomeCourt, setLadderHomeCourt } as never}
    >
      <PopupContext.Provider value={{ showBottomToast } as never}>
        {children}
      </PopupContext.Provider>
    </LadderContext.Provider>
  </UserContext.Provider>
);

const renderHome = () =>
  renderHook(() => useLadderHomeCourt(ladder), { wrapper });

const pressAlertButton = (label: string) => {
  const buttons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as {
    text: string;
    onPress?: () => void;
  }[];
  return act(async () => {
    buttons.find((button) => button.text === label)?.onPress?.();
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

describe("useLadderHomeCourt state", () => {
  it("is loading until the first snapshot arrives", () => {
    const { result } = renderHome();
    expect(result.current.loading).toBe(true);

    act(() => emit({ homeCourt: null, homeCourtChanges: 0 }));

    expect(result.current.loading).toBe(false);
    expect(result.current.isEntrant).toBe(true);
  });

  it("is not an entrant when the entrant document does not exist", () => {
    const { result } = renderHome();

    act(() => emit(null));

    expect(result.current.loading).toBe(false);
    expect(result.current.isEntrant).toBe(false);
    expect(result.current.canChange).toBe(false);
  });

  it("offers Add when there is no home court and Change once after one is set", () => {
    const { result } = renderHome();

    act(() => emit({ homeCourt: null, homeCourtChanges: 0 }));
    expect(result.current.hasHomeCourt).toBe(false);
    expect(result.current.canChange).toBe(true);

    act(() => emit({ homeCourt: { courtId: "b" }, homeCourtChanges: 0 }));
    expect(result.current.hasHomeCourt).toBe(true);
    expect(result.current.canChange).toBe(true);

    act(() => emit({ homeCourt: { courtId: "d" }, homeCourtChanges: 1 }));
    expect(result.current.canChange).toBe(false);
  });

  it("stops loading and clears the state when the subscription errors", () => {
    subscribeToLadderHomeCourt.mockImplementationOnce((...args: unknown[]) => {
      (args[3] as () => void)();
      return jest.fn();
    });
    const { result } = renderHome();

    expect(result.current.loading).toBe(false);
    expect(result.current.isEntrant).toBe(false);
  });
});

describe("useLadderHomeCourt confirmHomeCourt", () => {
  it("asks to set the first home court with the trimmed name", () => {
    const { result } = renderHome();
    act(() => emit({ homeCourt: null, homeCourtChanges: 0 }));

    act(() => result.current.confirmHomeCourt(courtB));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Set home court?",
      "Set Court B as your home court? You can change it once for this ladder.",
      expect.any(Array),
    );
  });

  it("warns that a change is the only one", () => {
    const { result } = renderHome();
    act(() =>
      emit({
        homeCourt: { courtId: "b", courtName: "Court B" },
        homeCourtChanges: 0,
      }),
    );

    act(() => result.current.confirmHomeCourt(courtD));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Change home court?",
      "Change your home court to Court D? This is your only change for this ladder.",
      expect.any(Array),
    );
  });

  it("does nothing for no court or the current home court", () => {
    const { result } = renderHome();
    act(() =>
      emit({
        homeCourt: { courtId: "b", courtName: "Court B" },
        homeCourtChanges: 0,
      }),
    );

    act(() => result.current.confirmHomeCourt(null));
    act(() => result.current.confirmHomeCourt(courtB));

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("saves on Confirm, shows the toast and calls onSaved", async () => {
    setLadderHomeCourt.mockResolvedValue({ success: true });
    const onSaved = jest.fn();
    const { result } = renderHome();
    act(() => emit({ homeCourt: null, homeCourtChanges: 0 }));

    act(() => result.current.confirmHomeCourt(courtB, onSaved));
    await pressAlertButton("Confirm");

    expect(setLadderHomeCourt).toHaveBeenCalledWith({
      ladder: { ladderId: "L1", ladderType: LADDER_TYPE.SINGLES },
      userId: "me",
      court: courtB,
    });
    expect(showBottomToast).toHaveBeenCalledWith("Home court saved", "success");
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("saves nothing when the alert is cancelled", async () => {
    const { result } = renderHome();
    act(() => emit({ homeCourt: null, homeCourtChanges: 0 }));

    act(() => result.current.confirmHomeCourt(courtB));
    await pressAlertButton("Cancel");

    expect(setLadderHomeCourt).not.toHaveBeenCalled();
  });

  it.each([
    ["not_participant", "Join the ladder before choosing a home court."],
    [
      "change_limit",
      "You have already changed your home court for this ladder.",
    ],
    ["invalid_court", "That court is not available in this ladder yet."],
    ["error", "Something went wrong saving your home court."],
  ])("shows the %s message and skips onSaved", async (reason, message) => {
    setLadderHomeCourt.mockResolvedValue({ success: false, reason });
    const onSaved = jest.fn();
    const { result } = renderHome();
    act(() => emit({ homeCourt: null, homeCourtChanges: 0 }));

    act(() => result.current.confirmHomeCourt(courtB, onSaved));
    await pressAlertButton("Confirm");

    expect(showBottomToast).toHaveBeenCalledWith(message, "error");
    expect(onSaved).not.toHaveBeenCalled();
  });
});
