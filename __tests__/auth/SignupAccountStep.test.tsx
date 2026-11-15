import React from "react";
import { act, fireEvent } from "@testing-library/react-native";

import SignupAccountStep from "../../components/signup/SignupAccountStep";
import { checkEmailExists } from "../../screens/Authentication/createAccount";
import { signInWithGoogle } from "../../screens/Authentication/socialAuth";
import { deferred, m, renderWithContexts } from "./testUtils";

jest.mock("../../screens/Authentication/createAccount", () => ({
  ...jest.requireActual("../../screens/Authentication/createAccount"),
  checkEmailExists: jest.fn(),
}));

jest.mock("../../screens/Authentication/socialAuth", () => ({
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

const setup = () => {
  const props = {
    getUserById: jest.fn(),
    onBack: jest.fn(),
    onLogin: jest.fn(),
    onEmailAccepted: jest.fn(),
    onSocialExisting: jest.fn(),
    onSocialNeedsSignup: jest.fn(),
  };
  const utils = renderWithContexts(<SignupAccountStep {...props} />);
  const fill = (email: string, password: string, confirm = password) => {
    fireEvent.changeText(utils.getByTestId("signup-account-email"), email);
    fireEvent.changeText(utils.getByTestId("signup-account-password"), password);
    fireEvent.changeText(utils.getByTestId("signup-account-confirm"), confirm);
  };
  const create = () =>
    act(async () => {
      fireEvent.press(utils.getByTestId("signup-account-create"));
    });
  return { ...utils, props, fill, create };
};

const isDisabled = (utils: ReturnType<typeof setup>) =>
  utils.getByTestId("signup-account-create").props.accessibilityState
    ?.disabled === true;

beforeEach(() => {
  jest.clearAllMocks();
  m(checkEmailExists).mockResolvedValue(false);
});

it("disables Create account until the confirm password is filled", () => {
  const utils = setup();
  expect(isDisabled(utils)).toBe(true);
  utils.fill("mo@example.com", "secret1");
  expect(isDisabled(utils)).toBe(false);
});

it("disables Create account and shows an error on a mismatch", () => {
  const utils = setup();
  utils.fill("mo@example.com", "secret1", "secret2");
  expect(isDisabled(utils)).toBe(true);
  expect(utils.getByText("Passwords don't match")).toBeTruthy();
});

it("hides the mismatch error while the confirm is still being typed", () => {
  const utils = setup();
  utils.fill("mo@example.com", "secret1", "sec");
  expect(utils.queryByText("Passwords don't match")).toBeNull();
  fireEvent(utils.getByTestId("signup-account-confirm"), "blur");
  expect(utils.getByText("Passwords don't match")).toBeTruthy();
});

it("shows email and password errors and does not continue", async () => {
  const utils = setup();
  utils.fill("bad-email", "123");
  await utils.create();
  expect(utils.getByText("Invalid email format")).toBeTruthy();
  expect(
    utils.getByText("Password must be at least 6 characters"),
  ).toBeTruthy();
  expect(checkEmailExists).not.toHaveBeenCalled();
  expect(utils.props.onEmailAccepted).not.toHaveBeenCalled();
});

it("stops on a registered email", async () => {
  m(checkEmailExists).mockResolvedValueOnce(true);
  const utils = setup();
  utils.fill("taken@example.com", "secret1");
  await utils.create();
  expect(checkEmailExists).toHaveBeenCalledWith("taken@example.com");
  expect(utils.getByText("Email already registered")).toBeTruthy();
  expect(utils.props.onEmailAccepted).not.toHaveBeenCalled();
});

it("passes the normalised email on for a new email", async () => {
  const utils = setup();
  utils.fill("  New@Example.COM ", "secret1");
  await utils.create();
  expect(utils.props.onEmailAccepted).toHaveBeenCalledWith(
    "new@example.com",
    "secret1",
  );
  expect(utils.queryByText("Email already registered")).toBeNull();
});

it("shows a spinner and ignores taps while checking the email", async () => {
  const pending = deferred<boolean>();
  m(checkEmailExists).mockReturnValueOnce(pending.promise);
  const utils = setup();
  utils.fill("new@example.com", "secret1");
  await utils.create();
  expect(utils.queryByText("Create account")).toBeNull();
  expect(isDisabled(utils)).toBe(true);
  await utils.create();
  expect(checkEmailExists).toHaveBeenCalledTimes(1);
  await act(async () => {
    pending.resolve(false);
  });
  expect(utils.props.onEmailAccepted).toHaveBeenCalledTimes(1);
  expect(utils.getByText("Create account")).toBeTruthy();
});

it("stays on the page with an error toast when the email check fails", async () => {
  m(checkEmailExists).mockRejectedValueOnce(
    Object.assign(new Error("x"), { code: "signup/email-check-failed" }),
  );
  const utils = setup();
  utils.fill("new@example.com", "secret1");
  await utils.create();
  expect(utils.showBottomToast).toHaveBeenCalledWith(
    "Couldn't check your email. Please try again.",
    "error",
  );
  expect(utils.props.onEmailAccepted).not.toHaveBeenCalled();
  expect(utils.getByText("Create account")).toBeTruthy();
  expect(isDisabled(utils)).toBe(false);
});

it("rejects an email over 254 characters and caps the input", async () => {
  const utils = setup();
  expect(utils.getByTestId("signup-account-email").props.maxLength).toBe(254);
  utils.fill(`${"a".repeat(250)}@b.co`, "secret1");
  await utils.create();
  expect(
    utils.getByText("Email must be 254 characters or fewer"),
  ).toBeTruthy();
  expect(checkEmailExists).not.toHaveBeenCalled();
});

it("sets email keyboard and no autocorrect or capitalisation", () => {
  const { props } = setup().getByTestId("signup-account-email");
  expect(props.keyboardType).toBe("email-address");
  expect(props.autoCapitalize).toBe("none");
  expect(props.autoCorrect).toBe(false);
});

it("runs Google sign-in and the Log in link", async () => {
  m(signInWithGoogle).mockResolvedValueOnce({ status: "cancelled" });
  const utils = setup();
  await act(async () => {
    fireEvent.press(utils.getByTestId("signup-account-google"));
  });
  expect(signInWithGoogle).toHaveBeenCalledWith(utils.props.getUserById);
  fireEvent.press(utils.getByTestId("signup-account-login"));
  expect(utils.props.onLogin).toHaveBeenCalled();
});
