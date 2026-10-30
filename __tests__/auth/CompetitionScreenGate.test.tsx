/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { useFocusEffect } from "@react-navigation/native";
import { onSnapshot } from "firebase/firestore";

import CompetitionsScreen from "../../screens/Competition/CompetitionScreen";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { m, mockNavigation } from "./testUtils";

jest.mock("../../components/Modals/AddCompetitionModal", () => {
  const { Text } = require("react-native");
  return function MockAddCompetitionModal() {
    return <Text testID="add-competition-modal">modal</Text>;
  };
});

const renderScreen = (currentUser: unknown) =>
  render(
    <UserContext.Provider
      value={{ currentUser, notifications: [], authInitializing: false }}
    >
      <LeagueContext.Provider
        value={{} as React.ContextType<typeof LeagueContext>}
      >
        <CompetitionsScreen />
      </LeagueContext.Provider>
    </UserContext.Provider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  // Run focus effects like a mounted, focused screen.
  m(useFocusEffect).mockImplementation((effect: () => void) =>
    React.useEffect(effect, [effect]),
  );
  // Every competitions listener reports an empty list straight away.
  m(onSnapshot).mockImplementation(
    (_query: unknown, onNext: (...args: unknown[]) => void) => {
      onNext({ docs: [] });
      return () => undefined;
    },
  );
});

it("sends signed-out users to Login from the add button", async () => {
  const utils = renderScreen(null);
  await act(async () => {
    fireEvent.press(utils.getByText("add"));
  });
  expect(mockNavigation().navigate).toHaveBeenCalledWith("Login");
  expect(utils.queryByTestId("add-competition-modal")).toBeNull();
});

it("opens the add competition modal for signed-in users", async () => {
  const utils = renderScreen({ userId: "uid-1" });
  await act(async () => {
    fireEvent.press(utils.getByText("add"));
  });
  expect(mockNavigation().navigate).not.toHaveBeenCalledWith("Login");
  expect(utils.getByTestId("add-competition-modal")).toBeTruthy();
});
