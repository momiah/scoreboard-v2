import type { ComponentType } from "react";
import type { UserProfile } from "@shared/types";

export type HarnessSectionProps = { currentUser: UserProfile };

export type HarnessSection = {
  id: string;
  Buttons: ComponentType<HarnessSectionProps>;
  cleanup?: (args: { testUser: UserProfile }) => Promise<unknown>;
};
