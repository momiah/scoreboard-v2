import React, { useContext } from "react";
import { UserContext } from "../../context/UserContext";
import { SeedButton } from "../harness/HarnessButton";
import type { HarnessSection } from "./types";

const CoreButtons = () => {
  const { Logout } = useContext(UserContext);
  return (
    <SeedButton
      id="maestro-sign-out"
      label="Sign Out"
      success="Signed out"
      failure="Sign out failed"
      run={async () => {
        if (!(await Logout())) throw new Error("Logout returned false");
        return {};
      }}
    />
  );
};

const core: HarnessSection = { id: "core", Buttons: CoreButtons };

export default core;
