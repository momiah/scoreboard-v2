import React from "react";
import { SeedButton } from "../harness/HarnessButton";
import { cleanupClubTestData } from "../seeds/clubs/seedClubs";
import { seedNotificationInbox } from "../seeds/notifications/seedNotificationInbox";
import { useClubServices } from "./clubs";
import type { HarnessSection, HarnessSectionProps } from "./types";

const NotificationButtons = ({ currentUser }: HarnessSectionProps) => {
  const services = useClubServices();
  return (
    <>
      <SeedButton
        id="maestro-notifications-seed-inbox"
        label="Seed Full Inbox"
        run={() => seedNotificationInbox({ services, testUser: currentUser })}
      />
      <SeedButton
        id="maestro-notifications-cleanup"
        label="Clean Inbox Data"
        success="Cleaned up"
        failure="Cleanup failed"
        run={() => cleanupClubTestData({ testUser: currentUser })}
      />
    </>
  );
};

const notifications: HarnessSection = {
  id: "notifications",
  Buttons: NotificationButtons,
};

export default notifications;
