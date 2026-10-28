import { useState } from "react";
import { Alert } from "react-native";

import type {
  SocialSignInResult,
  SocialSignupParams,
} from "../../screens/Authentication/socialAuth";
import {
  signInWithApple,
  signInWithGoogle,
} from "../../screens/Authentication/socialAuth";
import type { SocialKind } from "./formParts";

export type ProfileLookup = (
  userId: string,
) => Promise<Record<string, unknown> | null | undefined>;

interface Options {
  getUserById: ProfileLookup;
  onExisting: (profile: Record<string, unknown>, method: string) => void;
  onNeedsSignup: (params: SocialSignupParams) => void;
}

/** Runs a provider sign-in and routes the result, so Login and Account share one path. */
export function useSocialAuth({
  getUserById,
  onExisting,
  onNeedsSignup,
}: Options) {
  const [busy, setBusy] = useState<SocialKind | null>(null);

  const handle = (result: SocialSignInResult) => {
    if (result.status === "cancelled") return;
    if (result.status === "error") {
      console.error(result.logLabel, result.logMessage);
      Alert.alert(result.title, result.message);
      return;
    }
    if (result.status === "existing") {
      onExisting(result.profile, result.method);
      return;
    }
    onNeedsSignup(result.params);
  };

  const run = async (kind: SocialKind) => {
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
