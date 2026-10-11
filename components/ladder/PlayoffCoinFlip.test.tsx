import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import PlayoffCoinFlip from "./PlayoffCoinFlip";

const props = {
  team1Name: "Mo",
  team2Name: "Sam",
  canFlip: true,
  onFlip: jest.fn(async () => true),
};

describe("PlayoffCoinFlip", () => {
  it("says which side hosts on heads and tails before the toss", () => {
    const { getByText } = render(<PlayoffCoinFlip {...props} result={null} />);
    expect(getByText("Heads: Mo hosts first · Tails: Sam hosts first")).toBeTruthy();
  });

  it("spins until the result lands, then names the host", () => {
    jest.useFakeTimers();
    const view = render(<PlayoffCoinFlip {...props} result={null} />);
    fireEvent.press(view.getByTestId("playoff-coin-flip"));
    expect(props.onFlip).toHaveBeenCalled();
    expect(view.getByText("Flipping…")).toBeTruthy();

    view.rerender(<PlayoffCoinFlip {...props} result="team2" />);
    expect(view.queryByTestId("playoff-coin-result")).toBeNull();
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(view.getByText("Coin toss: Sam hosts the first match")).toBeTruthy();
    jest.useRealTimers();
  });

  it("shows a settled toss straight away", () => {
    const { getByTestId, getByText } = render(
      <PlayoffCoinFlip {...props} result="team1" />,
    );
    expect(getByTestId("playoff-coin-result")).toBeTruthy();
    expect(getByText("Coin toss: Mo hosts the first match")).toBeTruthy();
  });

  it("makes onlookers wait", () => {
    const { getByTestId, queryByTestId } = render(
      <PlayoffCoinFlip {...props} canFlip={false} result={null} />,
    );
    expect(getByTestId("playoff-coin-waiting")).toBeTruthy();
    expect(queryByTestId("playoff-coin-flip")).toBeNull();
  });
});
