import React, { useContext } from "react";
import type { CollectionName, Tournament, UserProfile } from "@shared/types";
import { COLLECTION_NAMES } from "@shared";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { extractPlayersWithXp } from "../../components/Modals/GenerateFixturesModal";
import { SeedButton } from "../harness/HarnessButton";
import { useFixtureCompetitionActions } from "../seeds/competitions/fixtureActions";
import {
  RR_SCENARIOS,
  approveUserReports,
  checkFixtureFairness,
  checkPrizeNotifications,
  checkReportNotifications,
  cleanupRoundRobinTestData,
  expectedState,
  findScenarioTournament,
  getActiveScenario,
  opponentReportsUserGame,
  opponentSendsChatMessage,
  playFixtureGames,
  playGamesInOrder,
  checkReplay,
  checkTeams,
  seedScenario,
} from "../seeds/tournaments/roundRobin";
import type { HarnessSection } from "./types";

const ROUNDS = [1, 2, 3];

export const useRoundRobinSeedActions = () => {
  const league = useContext(LeagueContext);
  const { sendNotification, getUserById } = useContext(UserContext);
  return {
    getCourts: league.getCourts,
    addCompetition: league.addCompetition,
    updatePendingInvites: league.updatePendingInvites,
    fetchTournamentParticipants: league.fetchTournamentParticipants,
    addTournamentFixtures: league.addTournamentFixtures,
    sendNotification,
    getUserById,
    extractPlayersWithXp,
    sendChatMessage: league.sendChatMessage,
  };
};

const RoundRobinButtons = ({ currentUser }: { currentUser: UserProfile }) => {
  const fixtureActions = useFixtureCompetitionActions();
  const actions = useRoundRobinSeedActions();
  const testUser = currentUser;

  return (
    <>
      {Object.keys(RR_SCENARIOS).map((key) => (
        <SeedButton
          key={key}
          id={`maestro-rr-seed-${key}`}
          label={`RR ${key}`}
          run={() => seedScenario({ key, testUser, actions, fixtureActions })}
        />
      ))}
      <SeedButton
        id="maestro-rr-accept-invites"
        label="RR accept invites"
        run={async () => {
          const { scenario } = await getActiveScenario();
          const tournament = (await findScenarioTournament(
            scenario,
            testUser,
          )) as unknown as Tournament;
          const invited = (tournament.pendingInvites ?? []).map(
            (i: { userId: string }) => i.userId,
          );
          for (const userId of invited) {
            await fixtureActions.acceptInvite({
              userId,
              competitionId: tournament.tournamentId ?? "",
              collectionName: COLLECTION_NAMES.tournaments as CollectionName,
            });
          }
          return { accepted: invited };
        }}
      />
      {ROUNDS.map((round) => (
        <SeedButton
          key={`play-${round}`}
          id={`maestro-rr-play-round-${round}`}
          label={`RR play r${round}`}
          run={() => playFixtureGames({ round, testUser, fixtureActions })}
        />
      ))}
      {ROUNDS.map((round) => (
        <SeedButton
          key={`opp-${round}`}
          id={`maestro-rr-opponent-reports-round-${round}`}
          label={`RR opp reports r${round}`}
          run={() =>
            opponentReportsUserGame({ round, testUser, fixtureActions })
          }
        />
      ))}
      <SeedButton
        id="maestro-rr-approve-user-reports"
        label="RR approve user"
        run={() => approveUserReports({ testUser, fixtureActions })}
      />
      <SeedButton
        id="maestro-rr-play-reverse"
        label="RR play reverse"
        run={async () => {
          const state = JSON.parse(
            (await expectedState({ testUser })).expected.state,
          );
          const gameNumbers = Array.from(
            { length: state.numberOfGames },
            (_, i) => state.numberOfGames - i,
          );
          return playGamesInOrder({ gameNumbers, testUser, fixtureActions });
        }}
      />
      <SeedButton
        id="maestro-rr-check-report-notifications"
        label="RR check notifs"
        run={() => checkReportNotifications({ testUser })}
      />
      <SeedButton
        id="maestro-rr-check-replay"
        label="RR replay"
        run={() => checkReplay({ testUser })}
      />
      <SeedButton
        id="maestro-rr-check-fairness"
        label="RR fairness"
        run={() => checkFixtureFairness({ testUser })}
      />
      {["Random", "Balanced", "Fixed"].map((generation) => (
        <SeedButton
          key={generation}
          id={`maestro-rr-check-teams-${generation}`}
          label={`RR teams ${generation}`}
          run={() => checkTeams({ testUser, generation })}
        />
      ))}
      <SeedButton
        id="maestro-rr-expect"
        label="RR expect"
        run={() => expectedState({ testUser })}
      />
      <SeedButton
        id="maestro-rr-opponent-sends-chat"
        label="RR opp chats"
        run={() => opponentSendsChatMessage({ testUser, actions })}
      />
      <SeedButton
        id="maestro-rr-check-prizes"
        label="RR prizes"
        run={() => checkPrizeNotifications({ testUser })}
      />
    </>
  );
};

const tournaments: HarnessSection = {
  id: "tournaments",
  Buttons: RoundRobinButtons,
  cleanup: ({ testUser }) => cleanupRoundRobinTestData({ testUser }),
};

export default tournaments;
