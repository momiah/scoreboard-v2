import React, { useContext } from "react";
import type { UserProfile } from "@shared/types";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { SeedButton } from "../harness/HarnessButton";
import { useFixtureCompetitionActions } from "../seeds/competitions/fixtureActions";
import {
  LEAGUE_SCENARIOS,
  checkLeagueResults,
  cleanupLeagueTestData,
  expectedLeagueState,
  seedLeagueScenario,
} from "../seeds/leagues/bulkPublish";
import type { HarnessSection } from "./types";

const LeagueButtons = ({ currentUser }: { currentUser: UserProfile }) => {
  const league = useContext(LeagueContext);
  const { sendNotification } = useContext(UserContext);
  const fixtureActions = useFixtureCompetitionActions();
  const actions = {
    getCourts: league.getCourts,
    addCompetition: league.addCompetition,
    updatePendingInvites: league.updatePendingInvites,
    sendNotification,
  };

  return (
    <>
      {Object.keys(LEAGUE_SCENARIOS).map((key) => (
        <SeedButton
          key={key}
          id={`maestro-league-seed-${key}`}
          label={`League ${key}`}
          run={() =>
            seedLeagueScenario({
              key,
              testUser: currentUser,
              actions,
              fixtureActions,
            })
          }
        />
      ))}
      <SeedButton
        id="maestro-league-expect"
        label="League expect"
        run={() => expectedLeagueState({ testUser: currentUser })}
      />
      <SeedButton
        id="maestro-league-check-results"
        label="League check"
        run={() => checkLeagueResults({ testUser: currentUser })}
      />
    </>
  );
};

const leagues: HarnessSection = {
  id: "leagues",
  Buttons: LeagueButtons,
  cleanup: ({ testUser }) => cleanupLeagueTestData({ testUser }),
};

export default leagues;
