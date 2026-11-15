/* eslint-disable @typescript-eslint/no-require-imports */
import React from "react";
import { useRoute } from "@react-navigation/native";

import SignupIntroScreen from "../../screens/Authentication/SignupIntroScreen";
import { m, renderWithContexts } from "./testUtils";

// Stand-in steps that show which step is open and the props it received.
jest.mock("../../components/signup/SignupProfileStep", () => {
  const { Text: MockText } = require("react-native");
  return function MockProfileStep(props: Record<string, unknown>) {
    const { setCurrentUser, onBack, onCreated, ...shown } = props;
    void setCurrentUser;
    void onBack;
    void onCreated;
    return <MockText testID="profile-step">{JSON.stringify(shown)}</MockText>;
  };
});

jest.mock("../../components/signup/SignupAccountStep", () => {
  const { Text: MockText } = require("react-native");
  return function MockAccountStep() {
    return <MockText testID="account-step">account</MockText>;
  };
});

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  const navigation = {
    navigate: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => false),
    getParent: jest.fn(),
  };
  return {
    ...actual,
    useNavigation: () => navigation,
    useRoute: jest.fn(() => ({ params: undefined })),
    useFocusEffect: jest.fn(),
  };
});

const shownProps = (node: { props: { children: unknown } }) =>
  JSON.parse(String(node.props.children)) as Record<string, unknown>;

it("opens straight at the profile step with the social params", () => {
  const socialSignup = {
    userName: "Mo",
    userLastName: "Mia",
    userEmail: "mo@gmail.com",
    userId: "g-uid",
    provider: "google",
    isNewUser: true,
  };
  m(useRoute).mockReturnValue({ params: { socialSignup } });
  const utils = renderWithContexts(<SignupIntroScreen />);
  expect(utils.queryByTestId("account-step")).toBeNull();
  expect(shownProps(utils.getByTestId("profile-step"))).toEqual({
    email: "mo@gmail.com",
    password: "",
    socialId: "g-uid",
    socialProvider: "google",
    socialIsNewUser: true,
    initialFirstName: "Mo",
    initialLastName: "Mia",
  });
});
