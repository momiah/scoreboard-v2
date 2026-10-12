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
  callerName: null,
};

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

  it("keeps both coins with the call glowing, then shows where the coin landed", () => {
    jest.useFakeTimers();
    const view = render(<PlayoffCoinFlip {...props} />);
    fireEvent.press(view.getByTestId("playoff-coin-call-away"));
    expect(onFlip).toHaveBeenCalledWith("away");
    expect(view.getByTestId("playoff-coin-call-line")).toHaveTextContent(
      "You called Away…",
    );
    expect(view.getByTestId("playoff-coin-call-home")).toBeTruthy();
    expect(view.getByTestId("playoff-coin-called-away")).toBeTruthy();
    expect(view.queryByTestId("playoff-coin-called-home")).toBeNull();

    const result = "It landed on Away, so you play the first match away.";
    view.rerender(
      <PlayoffCoinFlip
        {...props}
        face="trophy"
        call="away"
        callerName="You"
        resultText={result}
      />,
    );
    expect(view.queryByText(result)).toBeNull();
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(view.getByTestId("playoff-coin-call-line")).toHaveTextContent(
      "You called Away.",
    );
    expect(view.getByText(result)).toBeTruthy();
    jest.useRealTimers();
  });

  it("shows the opponent who called what, with that coin glowing", () => {
    const { getByTestId, getByText } = render(
      <PlayoffCoinFlip
        {...props}
        face="logo"
        call="home"
        callerName="Sam"
        resultText="It landed on Home, so Sam is at home and you're away for the first match."
      />,
    );
    expect(getByTestId("playoff-coin-call-line")).toHaveTextContent(
      "Sam called Home.",
    );
    expect(getByTestId("playoff-coin-called-home")).toBeTruthy();
    expect(
      getByText(
        "It landed on Home, so Sam is at home and you're away for the first match.",
      ),
    ).toBeTruthy();
  });

  it("makes onlookers wait", () => {
    const { getByTestId } = render(
      <PlayoffCoinFlip {...props} canFlip={false} />,
    );
    expect(getByTestId("playoff-coin-waiting")).toHaveTextContent(
      /Waiting for the coin toss/,
    );
  });
});
