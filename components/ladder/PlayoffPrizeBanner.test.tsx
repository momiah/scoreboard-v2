import React from "react";
import { render } from "@testing-library/react-native";

import PlayoffPrizeBanner from "./PlayoffPrizeBanner";

const prizes = {
  roundName: "Round of 16",
  nextName: "Quarter-Final",
  secured: { cash: 0, cp: 0 },
  next: { cash: 288, cp: 0 },
};

describe("PlayoffPrizeBanner", () => {
  it("shows what is secured and what winning adds, with cash on a paid ladder", () => {
    const { getByTestId } = render(
      <PlayoffPrizeBanner prizes={prizes} currencyType="GBP" isPaid />,
    );
    expect(getByTestId("playoff-prize-secured")).toHaveTextContent(
      "No prize yet",
    );
    expect(getByTestId("playoff-prize-next")).toHaveTextContent(/£288/);
    expect(getByTestId("playoff-prize-banner")).toHaveTextContent(
      /For reaching the Round of 16.*Quarter-Final/,
    );
  });

  it("shows only CP on a free ladder", () => {
    const { getByTestId } = render(
      <PlayoffPrizeBanner
        prizes={{
          ...prizes,
          secured: { cash: 0, cp: 3840 },
          next: { cash: 0, cp: 5120 },
        }}
        currencyType="GBP"
        isPaid={false}
      />,
    );
    expect(getByTestId("playoff-prize-secured")).toHaveTextContent("3840 CP");
    expect(getByTestId("playoff-prize-next")).not.toHaveTextContent(/£/);
  });
});
