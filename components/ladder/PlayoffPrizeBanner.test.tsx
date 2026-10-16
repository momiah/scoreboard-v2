import React from "react";
import { render } from "@testing-library/react-native";

import PlayoffPrizeBanner from "./PlayoffPrizeBanner";

const prizes = {
  roundName: "Round of 16",
  nextName: "Quarter-Final",
  secured: { cash: 0, cp: 0 },
  next: { cash: 288, cp: 800 },
};

describe("PlayoffPrizeBanner", () => {
  it("shows the game, the current payout and the next round's, with cash on a paid ladder", () => {
    const { getByTestId } = render(
      <PlayoffPrizeBanner
        title="Round of 16 · Tie 3"
        prizes={prizes}
        currencyType="GBP"
        isPaid
      />,
    );
    const banner = getByTestId("playoff-prize-banner");
    expect(banner).toHaveTextContent(
      /Round of 16 · Tie 3.*Current payout.*Quarter-Final payout/,
    );
    expect(getByTestId("playoff-prize-secured")).toHaveTextContent(/£0 · 0 CP/);
    expect(getByTestId("playoff-prize-next")).toHaveTextContent(
      /£288 · 800 CP/,
    );
    expect(banner).not.toHaveTextContent(/No prize yet|For reaching|\//);
  });

  it("shows only CP on a free ladder", () => {
    const { getByTestId } = render(
      <PlayoffPrizeBanner
        title="Final"
        prizes={{
          ...prizes,
          nextName: "Champion",
          secured: { cash: 0, cp: 3840 },
          next: { cash: 0, cp: 5120 },
        }}
        currencyType="GBP"
        isPaid={false}
      />,
    );
    expect(getByTestId("playoff-prize-secured")).toHaveTextContent("3,840 CP");
    expect(getByTestId("playoff-prize-next")).toHaveTextContent("5,120 CP");
    expect(getByTestId("playoff-prize-next")).not.toHaveTextContent(/£/);
  });
});
