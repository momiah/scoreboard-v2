/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import { AppEventsLogger } from "react-native-fbsdk-next";

import SignupProfileStep from "../../components/signup/SignupProfileStep";
import {
  createCourtChampsAccount,
  validateUsername,
} from "../../screens/Authentication/createAccount";
import { deferred, m, renderWithContexts } from "./testUtils";

jest.mock("../../screens/Authentication/createAccount", () => ({
  ...jest.requireActual("../../screens/Authentication/createAccount"),
  createCourtChampsAccount: jest.fn(),
  validateUsername: jest.fn(),
}));

type MockPickerProps = {
  visible: boolean;
  onSelect: (...args: unknown[]) => void;
  children?: unknown;
};

// Stand-in pickers: one tap selects United Kingdom, then London.
jest.mock("../../components/Modals/CountryCitySelectionModal", () => {
  const { Text, TouchableOpacity, View } = require("react-native");
  const React = require("react");
  return {
    CountrySelector: ({ visible, onSelect, children }: MockPickerProps) =>
      visible ? (
        <View>
          <TouchableOpacity
            testID="mock-country"
            onPress={() => onSelect({ key: "GB", value: "United Kingdom" })}
          >
            <Text>pick country</Text>
          </TouchableOpacity>
          {children as React.ReactNode}
        </View>
      ) : null,
    CitySelector: ({ visible, onSelect }: MockPickerProps) =>
      visible ? (
        <TouchableOpacity
          testID="mock-city"
          onPress={() => onSelect({ key: "London", value: "London" })}
        >
          <Text>pick city</Text>
        </TouchableOpacity>
      ) : (
        React.createElement(View)
      ),
  };
});

type Props = Partial<React.ComponentProps<typeof SignupProfileStep>>;

const setup = (overrides: Props = {}) => {
  const props = {
    email: "mo@example.com",
    password: "secret1",
    onBack: jest.fn(),
    onCreated: jest.fn(),
    setCurrentUser: jest.fn(),
    ...overrides,
  };
  const utils = renderWithContexts(<SignupProfileStep {...props} />);
  const fillName = (name: string) =>
    fireEvent.changeText(utils.getByTestId("signup-profile-name"), name);
  const fillUsername = (name: string) =>
    fireEvent.changeText(utils.getByTestId("signup-profile-username"), name);
  const pickLocation = () => {
    fireEvent.press(utils.getByTestId("signup-profile-location"));
    fireEvent.press(utils.getByTestId("mock-country"));
    fireEvent.press(utils.getByTestId("mock-city"));
  };
  const finish = () =>
    act(async () => {
      fireEvent.press(utils.getByTestId("signup-profile-continue"));
    });
  const fillAll = () => {
    fillName("Mo Mia");
    fillUsername("@momia");
    pickLocation();
  };
  return { ...utils, props, fillName, fillUsername, pickLocation, finish, fillAll };
};

beforeEach(() => {
  jest.clearAllMocks();
  m(validateUsername).mockResolvedValue(true);
  m(createCourtChampsAccount).mockResolvedValue({
    profile: {},
    isSocialSignup: false,
  });
});

it("requires a full name", async () => {
  const utils = setup();
  await utils.finish();
  expect(utils.getByText("Full name is required")).toBeTruthy();
  utils.fillName("Mo");
  await utils.finish();
  expect(utils.getByText("Enter your first and last name")).toBeTruthy();
  expect(createCourtChampsAccount).not.toHaveBeenCalled();
});

it("requires a location", async () => {
  const utils = setup();
  utils.fillName("Mo Mia");
  await utils.finish();
  expect(utils.getByText("Country and city are required")).toBeTruthy();
  expect(createCourtChampsAccount).not.toHaveBeenCalled();
});

it("rejects disallowed name characters", async () => {
  const utils = setup();
  utils.fillName("Mo M1a");
  await utils.finish();
  expect(
    utils.getByText(
      "Names can only use letters, spaces, hyphens, apostrophes and full stops, and each word must start with a letter",
    ),
  ).toBeTruthy();
  expect(createCourtChampsAccount).not.toHaveBeenCalled();
});

it("splits a multi-word, accented name without changing capitalisation", async () => {
  const utils = setup();
  utils.fillName("  josé   María O’Brien-Smith ");
  utils.fillUsername("momia");
  utils.pickLocation();
  await utils.finish();
  expect(createCourtChampsAccount).toHaveBeenCalledWith(
    expect.objectContaining({
      firstName: "josé",
      lastName: "María O’Brien-Smith",
    }),
  );
  expect(utils.props.onCreated).toHaveBeenCalledWith(true, "josé");
});

it("caps the name and username inputs", () => {
  const utils = setup();
  expect(utils.getByTestId("signup-profile-name").props.maxLength).toBe(50);
  const username = utils.getByTestId("signup-profile-username");
  expect(username.props.maxLength).toBe(10);
  expect(username.props.autoCapitalize).toBe("none");
  expect(username.props.autoCorrect).toBe(false);
});

it("blocks on an invalid or taken username", async () => {
  m(validateUsername).mockResolvedValue("Username already exists");
  const utils = setup();
  utils.fillAll();
  await utils.finish();
  expect(validateUsername).toHaveBeenCalledWith("momia");
  expect(utils.getAllByText("Username already exists").length).toBeGreaterThan(
    0,
  );
  expect(createCourtChampsAccount).not.toHaveBeenCalled();
});

it("shows the live username check result", async () => {
  m(validateUsername).mockResolvedValue("Username must be at least 4 characters");
  const utils = setup();
  utils.fillUsername("abc");
  await waitFor(() =>
    expect(
      utils.getByText("Username must be at least 4 characters"),
    ).toBeTruthy(),
  );
});

it("creates the account with the form values (email path)", async () => {
  const utils = setup();
  utils.fillAll();
  await utils.finish();
  expect(createCourtChampsAccount).toHaveBeenCalledWith(
    expect.objectContaining({
      email: "mo@example.com",
      password: "secret1",
      firstName: "Mo",
      lastName: "Mia",
      username: "momia",
      country: "United Kingdom",
      city: "London",
      countryCode: "GB",
      handPreference: "Right",
      photoUri: null,
      socialId: undefined,
      setCurrentUser: utils.props.setCurrentUser,
    }),
  );
  expect(utils.props.onCreated).toHaveBeenCalledWith(true, "Mo");
});

it("stores Both as Ambidextrous", async () => {
  const utils = setup();
  utils.fillAll();
  fireEvent.press(utils.getByTestId("signup-profile-hand-both"));
  await utils.finish();
  expect(createCourtChampsAccount).toHaveBeenCalledWith(
    expect.objectContaining({ handPreference: "Ambidextrous" }),
  );
});

it("stores Left as Left", async () => {
  const utils = setup();
  utils.fillAll();
  fireEvent.press(utils.getByTestId("signup-profile-hand-left"));
  await utils.finish();
  expect(createCourtChampsAccount).toHaveBeenCalledWith(
    expect.objectContaining({ handPreference: "Left" }),
  );
});

it("social sign-up pre-fills the name and reports no verification needed", async () => {
  m(createCourtChampsAccount).mockResolvedValueOnce({
    profile: {},
    isSocialSignup: true,
  });
  const utils = setup({
    email: "mo@gmail.com",
    password: "",
    socialId: "g-1",
    socialProvider: "google",
    socialIsNewUser: true,
    initialFirstName: "Mo",
    initialLastName: "Mia",
  });
  utils.fillUsername("momia");
  utils.pickLocation();
  await utils.finish();
  expect(createCourtChampsAccount).toHaveBeenCalledWith(
    expect.objectContaining({
      firstName: "Mo",
      lastName: "Mia",
      socialId: "g-1",
      socialProvider: "google",
      socialIsNewUser: true,
    }),
  );
  expect(utils.props.onCreated).toHaveBeenCalledWith(false, "Mo");
});

it("shows an error toast and logs when creation fails", async () => {
  m(createCourtChampsAccount).mockRejectedValueOnce({
    code: "auth/email-already-in-use",
  });
  const utils = setup();
  utils.fillAll();
  await utils.finish();
  expect(utils.showBottomToast).toHaveBeenCalledWith(
    "Could not create account: Email already registered",
    "error",
  );
  expect(AppEventsLogger.logEvent).toHaveBeenCalledWith("RegistrationFailed", {
    reason: "auth/email-already-in-use",
  });
  expect(utils.props.onCreated).not.toHaveBeenCalled();
});

it("ignores a second Finish tap while creating", async () => {
  const pending = deferred<unknown>();
  m(createCourtChampsAccount).mockReturnValueOnce(pending.promise);
  const utils = setup();
  utils.fillAll();
  await act(async () => {
    fireEvent.press(utils.getByTestId("signup-profile-continue"));
    fireEvent.press(utils.getByTestId("signup-profile-continue"));
  });
  await utils.finish();
  expect(createCourtChampsAccount).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.resolve({ profile: {}, isSocialSignup: false });
  });
  expect(utils.props.onCreated).toHaveBeenCalledTimes(1);
});
