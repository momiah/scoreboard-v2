import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("../../context/LadderContext", () => ({
  LadderContext: require("react").createContext({
    createLadderMatch: jest.fn(),
    fetchUserTeams: jest.fn(async () => []),
  }),
}));
jest.mock("../../context/UserContext", () => ({
  UserContext: require("react").createContext({
    currentUser: { userId: "u1" },
  }),
}));
jest.mock("../../context/PopupContext", () => ({
  PopupContext: require("react").createContext({ showBottomToast: jest.fn() }),
}));
jest.mock("../../hooks/useLadderCourts", () => ({
  COURT_SUBMITTED_MESSAGE: "",
  useLadderCourts: () => ({
    courtsList: [],
    courtsLoading: false,
    findSelectableCourt: jest.fn(),
    submitCourt: jest.fn(),
    applyCourts: jest.fn(),
    getCourts: jest.fn(),
  }),
}));
jest.mock("../../helpers/useLadderDisqualification", () => ({
  useLadderDisqualification: () => ({ disqualified: false, disclaimer: null }),
}));
jest.mock("./SearchLocationModal", () => () => null);
jest.mock("./LadderTermsModal", () => () => null);
jest.mock("../ladder/MatchDateTimeFields", () => {
  const { TouchableOpacity, Text } = require("react-native");
  return ({ setValue }: { setValue: (k: string, v: string) => void }) => (
    <TouchableOpacity
      testID="pick-date"
      onPress={() => setValue("startDate", "20-10-2030")}
    >
      <Text>date</Text>
    </TouchableOpacity>
  );
});

import AddLadderMatchModal from "./AddLadderMatchModal";

const ladder = {
  ladderId: "L1",
  name: "Test Ladder",
  ladderType: "Singles",
  currencyType: "GBP",
} as never;

describe("AddLadderMatchModal in playoff mode", () => {
  it("preselects the home court and best of, hides the fee, and sends the match", async () => {
    const onSubmit = jest.fn(async () => null);
    const { getByText, queryByTestId, getByTestId } = render(
      <AddLadderMatchModal
        modalVisible
        setModalVisible={jest.fn()}
        ladder={ladder}
        playoff={{
          title: "Arrange match 1",
          bestOf: 7,
          deadline: new Date(2030, 11, 1),
          defaultCourt: {
            courtId: "c1",
            courtName: "Home Court",
            verified: true,
          } as never,
          onSubmit,
        }}
      />,
    );
    expect(getByText("Arrange match 1")).toBeTruthy();
    expect(getByText("Home Court")).toBeTruthy();
    expect(getByText("7")).toBeTruthy();
    expect(queryByTestId("add-ladder-match-fee")).toBeNull();
    expect(getByTestId("add-ladder-match-no-fee")).toBeTruthy();

    fireEvent.press(getByTestId("pick-date"));
    fireEvent.press(getByTestId("add-ladder-match-terms"));
    fireEvent.press(getByText("Send to opponent"));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        court: expect.objectContaining({ courtId: "c1" }),
        matchDate: "20-10-2030",
        matchTime: { start: "18:00" },
        currencyType: "GBP",
        shuttleType: "Feather",
      }),
    );
  });
});
