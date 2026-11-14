import { useContext, useState } from "react";

import { PopupContext } from "../../context/PopupContext";
import type {
  SocialSignInResult,
  SocialSignupParams,
} from "../../screens/Authentication/socialAuth";
import {
  signInWithApple,
  signInWithGoogle,
} from "../../screens/Authentication/socialAuth";

export type ProfileLookup = (
  userId: string,
) => Promise<Record<string, unknown> | null | undefined>;

interface Options {
  getUserById: ProfileLookup;
  onExisting: (profile: Record<string, unknown>, method: string) => void;
  onNeedsSignup: (params: SocialSignupParams) => void;
}

/** Runs a provider sign-in and routes the result, so Login and Account share one path. */
/** Sign up offers Apple and Google only. */
export type SignupSocialKind = "apple" | "google";

export function useSocialAuth({
  getUserById,
  onExisting,
  onNeedsSignup,
}: Options) {
  const [busy, setBusy] = useState<SignupSocialKind | null>(null);
  const { showBottomToast } = useContext(PopupContext);

  const handle = (result: SocialSignInResult) => {
    if (result.status === "cancelled") return;
    if (result.status === "error") {
      console.error(result.logLabel, result.logMessage);
      showBottomToast(result.message, "error");
      return;
    }
    if (result.status === "existing") {
      onExisting(result.profile, result.method);
      return;
    }
    onNeedsSignup(result.params);
  };

  const run = async (kind: SignupSocialKind) => {
    setBusy(kind);
    try {
      const signIn = kind === "apple" ? signInWithApple : signInWithGoogle;
      handle(await signIn(getUserById));
    } finally {
      setBusy(null);
    }
  };

  return { busy, run };
}
