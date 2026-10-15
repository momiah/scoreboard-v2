import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockStore: Record<string, string> = {};
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key: string) => mockStore[key] ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockStore[key] = value;
  }),
}));

import HowToPlayButton from "./HowToPlayButton";

beforeEach(() => {
  Object.keys(mockStore).forEach((key) => delete mockStore[key]);
});

describe("HowToPlayButton", () => {
  it("is the regular How to Play outside the playoffs", () => {
    const { getByText, queryByTestId } = render(
      <HowToPlayButton ladderId="L1" isPlayoffs={false} onPress={jest.fn()} />,
    );
    expect(getByText("HOW TO PLAY")).toBeTruthy();
    expect(queryByTestId("ladder-playoff-guide-new")).toBeNull();
  });

  it("pulses until the playoff guide is opened once, then stays gold and still", async () => {
    const onPress = jest.fn();
    const first = render(
      <HowToPlayButton ladderId="L1" isPlayoffs onPress={onPress} />,
    );
    expect(first.getByText("HOW TO PLAY PLAYOFFS")).toBeTruthy();
    await waitFor(() =>
      expect(first.getByTestId("ladder-playoff-guide-new")).toBeTruthy(),
    );
    fireEvent.press(first.getByTestId("ladder-how-to-play"));
    expect(onPress).toHaveBeenCalled();
    expect(first.getByTestId("ladder-playoff-guide-seen")).toBeTruthy();

    const again = render(
      <HowToPlayButton ladderId="L1" isPlayoffs onPress={onPress} />,
    );
    await waitFor(() =>
      expect(again.getByTestId("ladder-playoff-guide-seen")).toBeTruthy(),
    );
  });
});
