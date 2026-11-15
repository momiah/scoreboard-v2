import React from "react";
import { act, fireEvent } from "@testing-library/react-native";
import { sendEmailVerification } from "firebase/auth";

import AccountCreatedStep from "../../components/signup/AccountCreatedStep";
import { auth } from "../../services/firebase.config";
import { m, renderWithContexts } from "./testUtils";

const mockAuth = auth as unknown as { currentUser: unknown };
const VERIFY_LINE = "Check your email and verify your account, then log in.";

const setup = (requiresEmailVerification: boolean) => {
  const props = {
    firstName: "Mo",
    requiresEmailVerification,
    onExplore: jest.fn(),
    onCreateLeague: jest.fn(),
  };
  const utils = renderWithContexts(<AccountCreatedStep {...props} />);
  const button = () => utils.getByTestId("signup-welcome-resend");
  const isDisabled = () => button().props.accessibilityState?.disabled === true;
  // One act per second: each tick schedules the next timer in an effect.
  const tick = (seconds: number) => {
    for (let i = 0; i < seconds; i += 1) {
      act(() => {
        jest.advanceTimersByTime(1000);
      });
    }
  };
  const press = () =>
    act(async () => {
      fireEvent.press(button());
    });
  return { ...utils, props, button, isDisabled, tick, press };
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  mockAuth.currentUser = { uid: "uid-1" };
});

afterEach(() => {
  jest.useRealTimers();
});

it("hides the verify line and resend button for social sign-ups", () => {
  const utils = setup(false);
  expect(utils.queryByText(VERIFY_LINE)).toBeNull();
  expect(utils.queryByTestId("signup-welcome-resend")).toBeNull();
  expect(utils.getByText("WELCOME, MO")).toBeTruthy();
});

it("shows the verify line and a faded countdown for email sign-ups", () => {
  const utils = setup(true);
  expect(utils.getByText(VERIFY_LINE)).toBeTruthy();
  expect(utils.getByText("Resend verification email (3:00)")).toBeTruthy();
  expect(utils.isDisabled()).toBe(true);
  utils.tick(1);
  expect(utils.getByText("Resend verification email (2:59)")).toBeTruthy();
  utils.tick(118);
  expect(utils.getByText("Resend verification email (1:01)")).toBeTruthy();
});

it("ignores taps during the cooldown", async () => {
  const utils = setup(true);
  await utils.press();
  expect(sendEmailVerification).not.toHaveBeenCalled();
  expect(utils.showBottomToast).not.toHaveBeenCalled();
});

it("enables after 3 minutes, resends and restarts the cooldown", async () => {
  m(sendEmailVerification).mockResolvedValueOnce(undefined);
  const utils = setup(true);
  utils.tick(179);
  expect(utils.isDisabled()).toBe(true);
  utils.tick(1);
  expect(utils.getByText("Resend verification email")).toBeTruthy();
  expect(utils.isDisabled()).toBe(false);

  await utils.press();
  expect(sendEmailVerification).toHaveBeenCalledWith(mockAuth.currentUser);
  expect(utils.showBottomToast).toHaveBeenCalledWith(
    "Verification email sent. Check your inbox.",
    "success",
  );
  expect(utils.getByText("Resend verification email (3:00)")).toBeTruthy();
  expect(utils.isDisabled()).toBe(true);
});

it("shows an error toast when the resend fails and stays enabled", async () => {
  m(sendEmailVerification).mockRejectedValueOnce({
    code: "auth/too-many-requests",
  });
  const utils = setup(true);
  utils.tick(180);
  await utils.press();
  expect(utils.showBottomToast).toHaveBeenCalledWith(
    "Couldn't send the email right now. Please try again shortly.",
    "error",
  );
  expect(utils.getByText("Resend verification email")).toBeTruthy();
  expect(utils.isDisabled()).toBe(false);
});

it("asks to log in when no user is signed in", async () => {
  mockAuth.currentUser = null;
  const utils = setup(true);
  utils.tick(180);
  await utils.press();
  expect(sendEmailVerification).not.toHaveBeenCalled();
  expect(utils.showBottomToast).toHaveBeenCalledWith(
    "Log in with your email and we'll send you a new link.",
    "info",
  );
});

it("wires the Explore and Create a league buttons", () => {
  const utils = setup(false);
  fireEvent.press(utils.getByTestId("signup-welcome-explore"));
  fireEvent.press(utils.getByTestId("signup-welcome-league"));
  expect(utils.props.onExplore).toHaveBeenCalled();
  expect(utils.props.onCreateLeague).toHaveBeenCalled();
});
