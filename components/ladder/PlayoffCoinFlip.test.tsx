import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import PlayoffCoinFlip from "./PlayoffCoinFlip";

const onFlip = jest.fn(async () => true);
const props = { canFlip: true, onFlip, resultText: null, face: null };

beforeEach(() => onFlip.mockClear());

describe("PlayoffCoinFlip", () => {
  it("asks the player to call Home or Away", () => {
    const { getByText, getByTestId } = render(<PlayoffCoinFlip {...props} />);
    expect(
      getByText("Choose where you want the first match to be played"),
    ).toBeTruthy();
    expect(getByTestId("playoff-coin-call-home")).toHaveTextContent("Home");
    expect(getByTestId("playoff-coin-call-away")).toHaveTextContent("Away");
  });

  it("tosses with the call, spins until the face lands, then shows the result", () => {
    jest.useFakeTimers();
    const view = render(<PlayoffCoinFlip {...props} />);
    fireEvent.press(view.getByTestId("playoff-coin-call-away"));
    expect(onFlip).toHaveBeenCalledWith("away");
    expect(view.getByText("You called Away…")).toBeTruthy();
    expect(view.queryByTestId("playoff-coin-call-home")).toBeNull();

    const result =
      "You called Away. It landed on the trophy, so you're away first.";
    view.rerender(
      <PlayoffCoinFlip {...props} face="trophy" resultText={result} />,
    );
    expect(view.queryByTestId("playoff-coin-result")).toBeNull();
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(view.getByTestId("playoff-coin-result")).toHaveTextContent(result);
    jest.useRealTimers();
  });

  it("shows a settled toss straight away, with no call buttons", () => {
    const { getByTestId, queryByTestId } = render(
      <PlayoffCoinFlip
        {...props}
        face="logo"
        resultText="Coin toss: Mo hosts the first match"
      />,
    );
    expect(getByTestId("playoff-coin-result")).toHaveTextContent(
      "Coin toss: Mo hosts the first match",
    );
    expect(queryByTestId("playoff-coin-call-home")).toBeNull();
  });

  it("makes onlookers wait without call buttons", () => {
    const { getByTestId, queryByTestId } = render(
      <PlayoffCoinFlip {...props} canFlip={false} />,
    );
    expect(getByTestId("playoff-coin-waiting")).toHaveTextContent(
      "Waiting for the coin toss",
    );
    expect(queryByTestId("playoff-coin-call-home")).toBeNull();
  });
});
