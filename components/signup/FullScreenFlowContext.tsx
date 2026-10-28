import { createContext, useContext, useEffect } from "react";

const noop = (_value: boolean) => {};

/** Lets the sign-in flow ask the tab bar to get out of the way while it is full screen. */
export const FullScreenFlowContext =
  createContext<(value: boolean) => void>(noop);

export function useFullScreenFlow(active: boolean) {
  const setFullScreen = useContext(FullScreenFlowContext);
  useEffect(() => {
    setFullScreen(active);
    return () => setFullScreen(false);
  }, [active, setFullScreen]);
}
