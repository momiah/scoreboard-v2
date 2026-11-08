import core from "./core";
import clubs from "./clubs";
import preRegistration from "./preRegistration";
import signup from "./signup";
import tournaments from "./tournaments";
import notifications from "./notifications";
import type { HarnessSection } from "./types";

export const HARNESS_SECTIONS: HarnessSection[] = [
  core,
  tournaments,
  clubs,
  notifications,
  preRegistration,
  signup,
];
