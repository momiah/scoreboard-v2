import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";

import PlayoffCoinFlip from "./PlayoffCoinFlip";

const onFlip = jest.fn(
  async (_call: string): Promise<"logo" | "trophy" | null> => "trophy",
);
const props = {
  canFlip: true,
  onFlip,
  callerName: "Mo",
  face: null,
  call: null,
};

beforeEach(() => {
  onFlip.mockClear();
  onFlip.mockImplementation(async () => "trophy");
});

describe("PlayoffCoinFlip", () => {
  it("asks the player to call heads or tails", () => {
    const { getByText, getByTestId } = render(<PlayoffCoinFlip {...props} />);
    expect(
      getByText("Flip the coin to see who starts at home first"),
    ).toBeTruthy();
    expect(getByTestId("playoff-coin-call-heads")).toHaveTextContent("Heads");
    expect(getByTestId("playoff-coin-call-tails")).toHaveTextContent("Tails");
  });

  it("keeps both coins with the call glowing and the caller named, then lands", () => {
    jest.useFakeTimers();
    const view = render(<PlayoffCoinFlip {...props} />);
    fireEvent.press(view.getByTestId("playoff-coin-call-tails"));
    expect(onFlip).toHaveBeenCalledWith("trophy");
    expect(view.getByTestId("playoff-coin-call-heads")).toBeTruthy();
    expect(view.getByTestId("playoff-coin-called-tails")).toBeTruthy();
    expect(view.queryByTestId("playoff-coin-called-heads")).toBeNull();
    expect(view.getByTestId("playoff-coin-caller")).toHaveTextContent("Mo");

    view.rerender(<PlayoffCoinFlip {...props} face="trophy" call="trophy" />);
    expect(view.queryByTestId("playoff-coin-result")).toBeNull();
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(view.getByTestId("playoff-coin-result")).toBeTruthy();
    expect(view.queryByText(/home first|away first/)).toBeNull();
    jest.useRealTimers();
  });

  it("shows everyone which coin was called and who called it", () => {
    const { getByTestId } = render(
      <PlayoffCoinFlip
        {...props}
        face="logo"
        call="logo"
        callerName="Sam"
        canFlip={false}
      />,
    );
    expect(getByTestId("playoff-coin-called-heads")).toBeTruthy();
    expect(getByTestId("playoff-coin-caller")).toHaveTextContent("Sam");
  });

  it("makes onlookers wait", () => {
    const { getByTestId } = render(
      <PlayoffCoinFlip {...props} canFlip={false} />,
    );
    expect(getByTestId("playoff-coin-waiting")).toHaveTextContent(
      /Waiting for a player to flip the coin/,
    );
  });

  it("lands on the server's answer without waiting for the game to update", async () => {
    jest.useFakeTimers();
    const view = render(<PlayoffCoinFlip {...props} />);
    fireEvent.press(view.getByTestId("playoff-coin-call-heads"));
    await act(async () => {
      jest.advanceTimersByTime(700);
    });
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });
    expect(view.getByTestId("playoff-coin-result")).toBeTruthy();
    jest.useRealTimers();
  });

  it("stops and lets the player try again if the flip fails", async () => {
    jest.useFakeTimers();
    onFlip.mockImplementation(async () => null);
    const view = render(<PlayoffCoinFlip {...props} />);
    fireEvent.press(view.getByTestId("playoff-coin-call-heads"));
    await act(async () => {
      jest.advanceTimersByTime(700);
    });
    expect(view.getByTestId("playoff-coin-error")).toHaveTextContent(
      "Couldn't flip the coin. Try again.",
    );
    expect(view.queryByTestId("playoff-coin-called-heads")).toBeNull();
    fireEvent.press(view.getByTestId("playoff-coin-call-heads"));
    expect(onFlip).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
