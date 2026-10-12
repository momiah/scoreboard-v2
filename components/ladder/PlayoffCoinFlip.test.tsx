import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import PlayoffCoinFlip from "./PlayoffCoinFlip";

const onFlip = jest.fn(async () => true);
const props = {
  canFlip: true,
  onFlip,
  resultText: null,
  face: null,
  call: null,
};

beforeEach(() => onFlip.mockClear());

describe("PlayoffCoinFlip", () => {
  it("asks the player to call heads or tails", () => {
    const { getByText, getByTestId } = render(<PlayoffCoinFlip {...props} />);
    expect(
      getByText("Flip the coin to see who starts at home first"),
    ).toBeTruthy();
    expect(getByTestId("playoff-coin-call-heads")).toHaveTextContent("Heads");
    expect(getByTestId("playoff-coin-call-tails")).toHaveTextContent("Tails");
  });

  it("keeps both coins with the call glowing, then shows where the coin landed", () => {
    jest.useFakeTimers();
    const view = render(<PlayoffCoinFlip {...props} />);
    fireEvent.press(view.getByTestId("playoff-coin-call-tails"));
    expect(onFlip).toHaveBeenCalledWith("trophy");
    expect(view.getByTestId("playoff-coin-call-heads")).toBeTruthy();
    expect(view.getByTestId("playoff-coin-called-tails")).toBeTruthy();
    expect(view.queryByTestId("playoff-coin-called-heads")).toBeNull();

    const result = "You're away first";
    view.rerender(
      <PlayoffCoinFlip
        {...props}
        face="trophy"
        call="trophy"
        resultText={result}
      />,
    );
    expect(view.queryByText(result)).toBeNull();
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(view.getByText(result)).toBeTruthy();
    jest.useRealTimers();
  });

  it("shows the opponent which coin was called, glowing, and where they play", () => {
    const { getByTestId, getByText } = render(
      <PlayoffCoinFlip
        {...props}
        face="logo"
        call="logo"
        resultText="You're away first"
      />,
    );
    expect(getByTestId("playoff-coin-called-heads")).toBeTruthy();
    expect(getByText("You're away first")).toBeTruthy();
  });

  it("makes onlookers wait", () => {
    const { getByTestId } = render(
      <PlayoffCoinFlip {...props} canFlip={false} />,
    );
    expect(getByTestId("playoff-coin-waiting")).toHaveTextContent(
      /Waiting for a player to flip the coin/,
    );
  });
});
