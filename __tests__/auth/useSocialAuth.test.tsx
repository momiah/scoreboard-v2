import React from "react";
import { act, renderHook } from "@testing-library/react-native";

import { PopupContext } from "../../context/PopupContext";
import { useSocialAuth } from "../../components/signup/useSocialAuth";
import {
  signInWithApple,
  signInWithGoogle,
} from "../../screens/Authentication/socialAuth";
import { deferred } from "./testUtils";

jest.mock("../../screens/Authentication/socialAuth", () => ({
  signInWithApple: jest.fn(),
  signInWithGoogle: jest.fn(),
}));

const m = (fn: unknown) => fn as jest.Mock;

const setup = () => {
  const showBottomToast = jest.fn();
  const onExisting = jest.fn();
  const onNeedsSignup = jest.fn();
  const getUserById = jest.fn();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <PopupContext.Provider value={{ showBottomToast }}>
      {children}
    </PopupContext.Provider>
  );
  const hook = renderHook(
    () => useSocialAuth({ getUserById, onExisting, onNeedsSignup }),
    { wrapper },
  );
  return { hook, showBottomToast, onExisting, onNeedsSignup, getUserById };
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
});

it("routes an existing profile to onExisting", async () => {
  const profile = { userId: "u" };
  m(signInWithGoogle).mockResolvedValueOnce({
    status: "existing",
    method: "google",
    profile,
  });
  const { hook, onExisting, getUserById } = setup();
  await act(() => hook.result.current.run("google"));
  expect(signInWithGoogle).toHaveBeenCalledWith(getUserById);
  expect(onExisting).toHaveBeenCalledWith(profile, "google");
  expect(hook.result.current.busy).toBeNull();
});

it("routes a new user to onNeedsSignup", async () => {
  const params = { userId: "u", provider: "apple" };
  m(signInWithApple).mockResolvedValueOnce({
    status: "needs-signup",
    method: "apple",
    params,
  });
  const { hook, onNeedsSignup } = setup();
  await act(() => hook.result.current.run("apple"));
  expect(onNeedsSignup).toHaveBeenCalledWith(params);
});

it("shows an error toast for errors and nothing for cancel", async () => {
  const { hook, showBottomToast, onExisting, onNeedsSignup } = setup();
  m(signInWithGoogle).mockResolvedValueOnce({ status: "cancelled" });
  await act(() => hook.result.current.run("google"));
  expect(showBottomToast).not.toHaveBeenCalled();

  m(signInWithGoogle).mockResolvedValueOnce({
    status: "error",
    title: "Error",
    message: "Google sign-in failed. Please try again.",
    logLabel: "x",
    logMessage: "y",
  });
  await act(() => hook.result.current.run("google"));
  expect(showBottomToast).toHaveBeenCalledWith(
    "Google sign-in failed. Please try again.",
    "error",
  );
  expect(onExisting).not.toHaveBeenCalled();
  expect(onNeedsSignup).not.toHaveBeenCalled();
});

it("sets busy to the provider while running", async () => {
  const signIn = deferred<unknown>();
  m(signInWithApple).mockReturnValueOnce(signIn.promise);
  const { hook } = setup();
  let pending: Promise<void> = Promise.resolve();
  act(() => {
    pending = hook.result.current.run("apple");
  });
  expect(hook.result.current.busy).toBe("apple");
  await act(async () => {
    signIn.resolve({ status: "cancelled" });
    await pending;
  });
  expect(hook.result.current.busy).toBeNull();
});
