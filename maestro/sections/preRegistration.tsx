import React from "react";
import { SeedButton } from "../harness/HarnessButton";
import {
  PREREG_SCENARIO,
  assertPreRegistrationLaunchNotified,
  cleanupPreRegistrationTestData,
  restoreLivePreRegistrations,
  seedPreRegistration,
  seedPreRegistrationLaunch,
} from "../seeds/preRegistration/seedPreRegistration";
import type { HarnessSection, HarnessSectionProps } from "./types";

const SCENARIO_BUTTONS = [
  { suffix: "", scenario: PREREG_SCENARIO.ALL, registered: false },
  { suffix: "-only-fixtures", scenario: PREREG_SCENARIO.ONLY_FIXTURES, registered: false },
  { suffix: "-only-fixtures-registered", scenario: PREREG_SCENARIO.ONLY_FIXTURES, registered: true },
  { suffix: "-community-only", scenario: PREREG_SCENARIO.COMMUNITY_ONLY, registered: false },
  { suffix: "-none-open", scenario: PREREG_SCENARIO.NONE_OPEN, registered: false },
];

const PreRegistrationButtons = ({ currentUser }: HarnessSectionProps) => (
  <>
    {SCENARIO_BUTTONS.map(({ suffix, scenario, registered }) => (
      <SeedButton
        key={suffix || "all"}
        id={`maestro-seed-prereg${suffix}`}
        label={`Seed Pre-reg ${scenario}${registered ? " (registered)" : ""}`}
        run={() =>
          seedPreRegistration({ testUser: currentUser, scenario, registered })
        }
      />
    ))}
    <SeedButton
      id="maestro-restore-prereg-live"
      label="Restore Live Pre-regs"
      success="Restored"
      failure="Restore failed"
      run={restoreLivePreRegistrations}
    />
    <SeedButton
      id="maestro-seed-prereg-launch"
      label="Seed Pre-reg Launch"
      run={() => seedPreRegistrationLaunch({ testUser: currentUser })}
    />
    <SeedButton
      id="maestro-assert-prereg-launch-notified"
      label="Assert Launch Notified"
      success="Checked"
      failure="Check failed"
      run={() => assertPreRegistrationLaunchNotified({ testUser: currentUser })}
    />
  </>
);

const preRegistration: HarnessSection = {
  id: "preRegistration",
  Buttons: PreRegistrationButtons,
  cleanup: ({ testUser }) => cleanupPreRegistrationTestData({ testUser }),
};

export default preRegistration;
