import React from "react";
import { render } from "@testing-library/react-native";

import { PopupContext } from "../../context/PopupContext";
import { UserContext } from "../../context/UserContext";

export const m = (fn: unknown) => fn as jest.Mock;

export function renderWithContexts(
  ui: React.ReactElement,
  {
    user = {},
    popup = {},
  }: { user?: Record<string, unknown>; popup?: Record<string, unknown> } = {},
) {
  const showBottomToast = jest.fn();
  const userValue = {
    getUserById: jest.fn(),
    setCurrentUser: jest.fn(),
    currentUser: null,
    ...user,
  };
  const popupValue = { showBottomToast, ...popup };
  const utils = render(
    <UserContext.Provider value={userValue}>
      <PopupContext.Provider value={popupValue}>{ui}</PopupContext.Provider>
    </UserContext.Provider>,
  );
  return { ...utils, showBottomToast, userValue };
}

export const mockNavigation = () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@react-navigation/native").__mockNavigation as {
    navigate: jest.Mock;
    reset: jest.Mock;
    goBack: jest.Mock;
    canGoBack: jest.Mock;
  };

/** A promise the test resolves by hand, for checking in-flight states. */
export function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve: (value: T) => resolve(value) };
}
