import React from "react";
import { render } from "@testing-library/react-native";

import ProLevel from "./ProLevel";

const barsOf = (view: ReturnType<typeof render>) =>
  [1, 2, 3, 4, 5].map((bar) => (view.queryByTestId(`profile-prolevel-bar-${bar}-on`) ? "on" : "off"));

describe("ProLevel", () => {
  it.each([
    [undefined, 0],
    [0, 0],
    [1000, 0],
    [1001, 1],
    [5001, 2],
    [10001, 3],
    [25001, 4],
    [50001, 5],
  ])("shows %s cash won as level %i", (cashWon, level) => {
    const view = render(<ProLevel cashWon={cashWon} width={80} />);
    if (level === 0) {
      expect(view.queryByText("PROLevel")).toBeNull();
      return;
    }
    expect(view.getByTestId(`profile-prolevel-level-${level}`)).toBeTruthy();
    expect(view.getByText("PROLevel")).toBeTruthy();
    expect(barsOf(view)).toEqual([1, 2, 3, 4, 5].map((bar) => (bar <= level ? "on" : "off")));
  });
});
