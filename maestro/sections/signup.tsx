import React from "react";
import { SeedButton } from "../harness/HarnessButton";
import { cleanupSignupProfiles } from "../seeds/signup/cleanupSignupProfiles";
import type { HarnessSection } from "./types";

const SignupButtons = () => (
  <SeedButton
    id="maestro-cleanup-signup-profiles"
    label="Remove Sign-up Profiles"
    success="Cleaned up"
    failure="Cleanup failed"
    run={cleanupSignupProfiles}
  />
);

const signup: HarnessSection = {
  id: "signup",
  Buttons: SignupButtons,
  cleanup: () => cleanupSignupProfiles(),
};

export default signup;
