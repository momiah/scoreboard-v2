import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { notificationTypes } from "@shared";

const mockNavigate = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
const mockReadNotification = jest.fn();
jest.mock("../../context/UserContext", () => {
  const React = require("react");
  return {
    UserContext: React.createContext({
      readNotification: (...args) => mockReadNotification(...args),
    }),
  };
});

import NotificationRow from "./NotificationRow";

const ladderNotification = (data) => ({
  id: "n1",
  type: notificationTypes.INFORMATION.LADDER.TYPE,
  message: "Something happened",
  createdAt: new Date(),
  data,
});

const press = (item) => {
  const view = render(
    <NotificationRow
      item={item}
      isRead={false}
      currentUser={{ userId: "u1" }}
    />,
  );
  fireEvent.press(view.getByText("Something happened"));
};

beforeEach(() => {
  mockNavigate.mockClear();
  mockReadNotification.mockClear();
});

describe("NotificationRow", () => {
  it("opens the tie screen for a notification about a playoff tie", () => {
    press(
      ladderNotification({ ladderId: "L1", tieId: "r1-s1", tab: "Playoffs" }),
    );
    expect(mockNavigate).toHaveBeenCalledWith("PlayoffMatchDetails", {
      ladderId: "L1",
      tieId: "r1-s1",
    });
    expect(mockReadNotification).toHaveBeenCalledWith("n1", "u1");
  });

  it("keeps a placing on the Summary tab even though it is about a tie", () => {
    press(
      ladderNotification({ ladderId: "L1", tieId: "r4-s0", tab: "Summary" }),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      "Ladder",
      expect.objectContaining({ ladderId: "L1", tab: "Summary" }),
    );
  });

  it("still opens the ladder tab for one that isn't about a tie", () => {
    press(ladderNotification({ ladderId: "L1", tab: "Playoffs" }));
    expect(mockNavigate).toHaveBeenCalledWith(
      "Ladder",
      expect.objectContaining({ ladderId: "L1", tab: "Playoffs" }),
    );
  });
});
