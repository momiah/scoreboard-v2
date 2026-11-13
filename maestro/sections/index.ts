import core from "./core";
import clubs from "./clubs";
import preRegistration from "./preRegistration";
import signup from "./signup";
import tournaments from "./tournaments";
import leagues from "./leagues";
import notifications from "./notifications";
import type { HarnessSection } from "./types";

export const HARNESS_SECTIONS: HarnessSection[] = [
  core,
  tournaments,
  leagues,
  clubs,
  notifications,
  preRegistration,
  signup,
];
