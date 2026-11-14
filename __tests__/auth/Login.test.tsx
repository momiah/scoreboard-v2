import React from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, waitFor } from "@testing-library/react-native";
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";

import Login from "../../screens/Authentication/Login";
import { auth } from "../../services/firebase.config";
import { registerForPushNotificationsAsync } from "../../services/pushNotifications";
import {
  signInWithApple,
  signInWithGoogle,
} from "../../screens/Authentication/socialAuth";
import { deferred, m, mockNavigation, renderWithContexts } from "./testUtils";

jest.mock("../../screens/Authentication/socialAuth", () => ({
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

const verifiedUser = {
  uid: "uid-1",
  emailVerified: true,
  getIdToken: jest.fn(() => Promise.resolve("token-1")),
};

const fill = (
  utils: ReturnType<typeof renderWithContexts>,
  email: string,
  password: string,
) => {
  fireEvent.changeText(utils.getByTestId("login-email"), email);
  fireEvent.changeText(utils.getByTestId("login-password"), password);
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
});

describe("Login validation", () => {
  it("blocks an empty submit with field errors", async () => {
    const utils = renderWithContexts(<Login />);
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-submit"));
    });
    expect(utils.getByText("Email is required.")).toBeTruthy();
    expect(utils.getByText("Password is required.")).toBeTruthy();
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("blocks a bad email and a short password", async () => {
    const utils = renderWithContexts(<Login />);
    fill(utils, "nope", "123");
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-submit"));
    });
    expect(utils.getByText("Enter a valid email address.")).toBeTruthy();
    expect(
      utils.getByText("Password must be at least 6 characters."),
    ).toBeTruthy();
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("blocks an email over 254 characters and caps the input", async () => {
    const utils = renderWithContexts(<Login />);
    const input = utils.getByTestId("login-email");
    expect(input.props.maxLength).toBe(254);
    expect(input.props.keyboardType).toBe("email-address");
    expect(input.props.autoCapitalize).toBe("none");
    expect(input.props.autoCorrect).toBe(false);
    fill(utils, `${"a".repeat(250)}@b.co`, "secret1");
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-submit"));
    });
    expect(
      utils.getByText("Email must be 254 characters or fewer."),
    ).toBeTruthy();
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it("shows field errors on blur", () => {
    const utils = renderWithContexts(<Login />);
    fireEvent(utils.getByTestId("login-email"), "blur");
    fireEvent(utils.getByTestId("login-password"), "blur");
    expect(utils.getByText("Email is required.")).toBeTruthy();
    expect(utils.getByText("Password is required.")).toBeTruthy();
  });
});

describe("Login submit", () => {
  it.each([
    "auth/invalid-credential",
    "auth/user-not-found",
    "auth/wrong-password",
  ])("shows the generic message for %s", async (code) => {
    m(signInWithEmailAndPassword).mockRejectedValueOnce({ code });
    const utils = renderWithContexts(<Login />);
    fill(utils, "mo@example.com", "secret1");
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-submit"));
    });
    expect(utils.showBottomToast).toHaveBeenCalledWith(
      "Incorrect email or password.",
      "error",
    );
  });

  it.each([
    ["auth/user-disabled", "User account is disabled"],
    [
      "auth/too-many-requests",
      "Too many attempts. Please wait a moment and try again.",
    ],
    [
      "auth/network-request-failed",
      "Network error. Check your connection and try again.",
    ],
    ["auth/something-else", "Login failed."],
  ])("maps %s", async (code, message) => {
    m(signInWithEmailAndPassword).mockRejectedValueOnce({ code });
    const utils = renderWithContexts(<Login />);
    fill(utils, "mo@example.com", "secret1");
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-submit"));
    });
    expect(utils.showBottomToast).toHaveBeenCalledWith(message, "error");
  });

  it("trims and lowercases the email before signing in", async () => {
    m(signInWithEmailAndPassword).mockRejectedValueOnce({
      code: "auth/invalid-credential",
    });
    const utils = renderWithContexts(<Login />);
    fill(utils, "  Mo@Example.COM ", "secret1");
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-submit"));
    });
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      auth,
      "mo@example.com",
      "secret1",
    );
  });

  it("signs out an unverified user and resends the link", async () => {
    const user = { ...verifiedUser, emailVerified: false };
    m(signInWithEmailAndPassword).mockResolvedValueOnce({ user });
    m(sendEmailVerification).mockResolvedValueOnce(undefined);
    const utils = renderWithContexts(<Login />);
    fill(utils, "mo@example.com", "secret1");
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-submit"));
    });
    expect(sendEmailVerification).toHaveBeenCalledWith(user);
    expect(auth.signOut).toHaveBeenCalled();
    expect(utils.showBottomToast).toHaveBeenCalledWith(
      "Please verify your email first. We've sent a new link to your inbox.",
      "info",
    );
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(mockNavigation().reset).not.toHaveBeenCalled();
  });

  it("still signs out with the fallback message when the resend fails", async () => {
    const user = { ...verifiedUser, emailVerified: false };
    m(signInWithEmailAndPassword).mockResolvedValueOnce({ user });
    m(sendEmailVerification).mockRejectedValueOnce({
      code: "auth/too-many-requests",
    });
    const utils = renderWithContexts(<Login />);
    fill(utils, "mo@example.com", "secret1");
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-submit"));
    });
    expect(auth.signOut).toHaveBeenCalled();
    expect(utils.showBottomToast).toHaveBeenCalledWith(
      "Please verify your email address before logging in.",
      "info",
    );
    expect(mockNavigation().reset).not.toHaveBeenCalled();
  });

  it("stores the session, loads the profile and goes Home when verified", async () => {
    m(signInWithEmailAndPassword).mockResolvedValueOnce({ user: verifiedUser });
    const profile = { userId: "uid-1" };
    const getUserById = jest.fn(() => Promise.resolve(profile));
    const utils = renderWithContexts(<Login />, { user: { getUserById } });
    fill(utils, "mo@example.com", "secret1");
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-submit"));
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("userToken", "token-1");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("userId", "uid-1");
    expect(registerForPushNotificationsAsync).toHaveBeenCalledWith("uid-1");
    expect(getUserById).toHaveBeenCalledWith("uid-1");
    expect(utils.userValue.setCurrentUser).toHaveBeenCalledWith(profile);
    expect(mockNavigation().reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: "Home" }],
    });
    expect(utils.showBottomToast).not.toHaveBeenCalled();
  });

  it("ignores a second tap while signing in", async () => {
    const pending = deferred<unknown>();
    m(signInWithEmailAndPassword).mockReturnValueOnce(pending.promise);
    const utils = renderWithContexts(<Login />);
    fill(utils, "mo@example.com", "secret1");
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-submit"));
    });
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-submit"));
    });
    expect(signInWithEmailAndPassword).toHaveBeenCalledTimes(1);
    await act(async () => {
      pending.resolve({ user: verifiedUser });
    });
    await waitFor(() => expect(mockNavigation().reset).toHaveBeenCalled());
  });
});

describe("Forgot password", () => {
  it("asks for an email first", async () => {
    const utils = renderWithContexts(<Login />);
    await act(async () => {
      fireEvent.press(utils.getByText("Forgot password?"));
    });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    expect(utils.showBottomToast).toHaveBeenCalledWith(
      "Please enter your email address first.",
      "info",
    );
  });

  const neutral =
    "If an account exists for that email, a password reset link is on its way.";

  it("sends to the normalised email with a neutral message", async () => {
    m(sendPasswordResetEmail).mockResolvedValueOnce(undefined);
    const utils = renderWithContexts(<Login />);
    fireEvent.changeText(utils.getByTestId("login-email"), " Mo@Example.com ");
    await act(async () => {
      fireEvent.press(utils.getByText("Forgot password?"));
    });
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(auth, "mo@example.com");
    expect(utils.showBottomToast).toHaveBeenCalledWith(neutral, "success");
  });

  it("gives the same message for an unknown email", async () => {
    m(sendPasswordResetEmail).mockRejectedValueOnce({
      code: "auth/user-not-found",
    });
    const utils = renderWithContexts(<Login />);
    fireEvent.changeText(utils.getByTestId("login-email"), "who@example.com");
    await act(async () => {
      fireEvent.press(utils.getByText("Forgot password?"));
    });
    expect(utils.showBottomToast).toHaveBeenCalledTimes(1);
    expect(utils.showBottomToast).toHaveBeenCalledWith(neutral, "success");
  });

  it("shows an error for other failures", async () => {
    m(sendPasswordResetEmail).mockRejectedValueOnce({
      code: "auth/network-request-failed",
    });
    const utils = renderWithContexts(<Login />);
    fireEvent.changeText(utils.getByTestId("login-email"), "mo@example.com");
    await act(async () => {
      fireEvent.press(utils.getByText("Forgot password?"));
    });
    expect(utils.showBottomToast).toHaveBeenCalledWith(
      "Network error. Check your connection and try again.",
      "error",
    );
    expect(utils.showBottomToast).not.toHaveBeenCalledWith(
      neutral,
      "success",
    );
  });
});

it("Create account link opens the sign-up intro", () => {
  const utils = renderWithContexts(<Login />);
  fireEvent.press(utils.getByTestId("login-register"));
  expect(mockNavigation().navigate).toHaveBeenCalledWith("SignupIntro");
});

describe("Login social sign-in", () => {
  const params = {
    userName: "Mo",
    userLastName: "Mia",
    userEmail: "mo@gmail.com",
    userId: "g-uid",
    provider: "google" as const,
    isNewUser: true,
  };

  it("sends a new Google player to the new flow's profile step", async () => {
    m(signInWithGoogle).mockResolvedValueOnce({
      status: "needs-signup",
      method: "google",
      params,
    });
    const utils = renderWithContexts(<Login />);
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-google"));
    });
    expect(signInWithGoogle).toHaveBeenCalledWith(utils.userValue.getUserById);
    expect(mockNavigation().reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: "SignupIntro", params: { socialSignup: params } }],
    });
    expect(mockNavigation().reset).not.toHaveBeenCalledWith(
      expect.objectContaining({
        routes: [expect.objectContaining({ name: "Signup" })],
      }),
    );
  });

  it("sends a new Apple player to the new flow with the new-user flag", async () => {
    const appleParams = { ...params, provider: "apple" as const };
    m(signInWithApple).mockResolvedValueOnce({
      status: "needs-signup",
      method: "apple",
      params: appleParams,
    });
    const utils = renderWithContexts(<Login />);
    await act(async () => {
      // jest-expo runs as iOS, where the Apple button shows.
      fireEvent.press(utils.getByTestId("login-apple"));
    });
    expect(mockNavigation().reset).toHaveBeenCalledWith({
      index: 0,
      routes: [
        { name: "SignupIntro", params: { socialSignup: appleParams } },
      ],
    });
  });

  it("signs an existing player in and goes Home", async () => {
    const profile = { userId: "g-uid" };
    m(signInWithGoogle).mockResolvedValueOnce({
      status: "existing",
      method: "google",
      profile,
    });
    const utils = renderWithContexts(<Login />);
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-google"));
    });
    expect(utils.userValue.setCurrentUser).toHaveBeenCalledWith(profile);
    expect(mockNavigation().reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: "Home" }],
    });
  });

  it("shows the error toast and stays put on failure", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    m(signInWithGoogle).mockResolvedValueOnce({
      status: "error",
      title: "Error",
      message: "Google sign-in failed. Please try again.",
      logLabel: "Google Login Error:",
      logMessage: "boom",
    });
    const utils = renderWithContexts(<Login />);
    await act(async () => {
      fireEvent.press(utils.getByTestId("login-google"));
    });
    expect(utils.showBottomToast).toHaveBeenCalledWith(
      "Google sign-in failed. Please try again.",
      "error",
    );
    expect(mockNavigation().reset).not.toHaveBeenCalled();
  });
});
