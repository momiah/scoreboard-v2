import React, { useContext } from "react";
import { useNavigation } from "@react-navigation/native";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { SeedButton } from "../harness/HarnessButton";
import {
  CLUB_FIXTURE_IDS,
  CLUB_TOURNAMENT_SCENARIO,
  cleanupClubTestData,
  clubWinnerMessage,
  countCompetitionNotices,
  countLeftNotices,
  countRemovalNotices,
  countRequestReplies,
  findTestUserClubId,
  fixtureOwnerAcceptsRequest,
  fixtureOwnerCreatesClubLeague,
  fixtureOwnerInvitesTestUser,
  fixtureRequestToJoin,
  fixtureRespondToInvite,
  newestNotificationData,
  seedClubFixtureUsers,
  seedCompetitionClub,
  seedFixtureOwnedClub,
  seedClubTournament,
  seedOwnedClub,
  type ClubFixtureUserId,
  type ClubServices,
} from "../seeds/clubs/seedClubs";
import { useFixtureCompetitionActions } from "../seeds/competitions/fixtureActions";
import { openPushNotification } from "../../helpers/notificationDestination";
import {
  RR_SCENARIOS,
  playToCompletion,
  seedScenario,
} from "../seeds/tournaments/roundRobin";
import { useRoundRobinSeedActions } from "./tournaments";
import type { HarnessSection, HarnessSectionProps } from "./types";

const INVITE_RESPONSES: {
  id: string;
  userId: ClubFixtureUserId;
  accept: boolean;
}[] = [
  { id: "ada-accepts-invite", userId: "maestroClubMember1", accept: true },
  { id: "dan-declines-invite", userId: "maestroClubMember2", accept: false },
];

const JOIN_REQUESTS: { id: string; userId: ClubFixtureUserId }[] = [
  { id: "rae-requests-join", userId: "maestroClubMember3" },
  { id: "nia-requests-join", userId: "maestroClubMember4" },
];

export const useClubServices = (): ClubServices => {
  const league = useContext(LeagueContext);
  const { sendNotification } = useContext(UserContext);
  return {
    addClub: league.addClub,
    acceptClubInvite: league.acceptClubInvite,
    declineClubInvite: league.declineClubInvite,
    requestToJoinClub: league.requestToJoinClub,
    acceptClubJoinRequest: league.acceptClubJoinRequest,
    declineClubJoinRequest: league.declineClubJoinRequest,
    addCompetition: league.addCompetition,
    getCourts: league.getCourts,
    sendNotification,
  };
};

const ClubButtons = ({ currentUser }: HarnessSectionProps) => {
  const services = useClubServices();
  const tournamentActions = useRoundRobinSeedActions();
  const fixtureActions = useFixtureCompetitionActions();
  const navigation = useNavigation();
  return (
    <>
      <SeedButton
        id="maestro-clubs-cleanup"
        label="Clean Club Data"
        success="Cleaned up"
        failure="Cleanup failed"
        run={() => cleanupClubTestData({ testUser: currentUser })}
      />
      <SeedButton
        id="maestro-clubs-reset"
        label="Reset Club Data"
        run={async () => {
          await cleanupClubTestData({ testUser: currentUser });
          return seedClubFixtureUsers();
        }}
      />
      <SeedButton
        id="maestro-clubs-seed-owned-empty"
        label="Seed Own Club (empty)"
        run={() =>
          seedOwnedClub({ services, testUser: currentUser, withMembers: [] })
        }
      />
      <SeedButton
        id="maestro-clubs-seed-owned-members"
        label="Seed Own Club (members)"
        run={() =>
          seedOwnedClub({
            services,
            testUser: currentUser,
            withMembers: [
              "maestroClubMember1",
              "maestroClubMember4",
              "maestroClubMember5",
            ],
          })
        }
      />
      <SeedButton
        id="maestro-clubs-seed-fixture-club"
        label="Seed Olive's Club"
        run={() =>
          seedFixtureOwnedClub({
            services,
            withMembers: ["maestroClubMember1"],
          })
        }
      />
      {INVITE_RESPONSES.map(({ id, userId, accept }) => (
        <SeedButton
          key={id}
          id={`maestro-clubs-${id}`}
          label={id}
          success="Resolved"
          run={async () =>
            fixtureRespondToInvite({
              services,
              clubId: await findTestUserClubId(currentUser),
              userId,
              accept,
            })
          }
        />
      ))}
      {JOIN_REQUESTS.map(({ id, userId }) => (
        <SeedButton
          key={id}
          id={`maestro-clubs-${id}`}
          label={id}
          success="Requested"
          run={async () =>
            fixtureRequestToJoin({
              services,
              clubId: await findTestUserClubId(currentUser),
              userId,
            })
          }
        />
      ))}
      <SeedButton
        id="maestro-clubs-respond-and-request"
        label="Ada+Dan respond, Rae+Nia request"
        success="Resolved"
        run={async () => {
          const clubId = await findTestUserClubId(currentUser);
          for (const { userId, accept } of INVITE_RESPONSES) {
            await fixtureRespondToInvite({ services, clubId, userId, accept });
          }
          let outcome = {};
          for (const { userId } of JOIN_REQUESTS) {
            outcome = await fixtureRequestToJoin({ services, clubId, userId });
          }
          return outcome;
        }}
      />
      <SeedButton
        id="maestro-clubs-count-nia-removal-notices"
        label="Count Nia removal notices"
        success="Checked"
        failure="Check failed"
        run={() => countRemovalNotices("maestroClubMember4")}
      />
      <SeedButton
        id="maestro-clubs-seed-tournament"
        label="Seed club tournament"
        run={() =>
          seedClubTournament({
            services,
            testUser: currentUser,
            seedTournament: (clubId) =>
              seedScenario({
                key: CLUB_TOURNAMENT_SCENARIO,
                testUser: currentUser,
                actions: tournamentActions,
                fixtureActions,
                clubId,
              }),
          })
        }
      />
      <SeedButton
        id="maestro-clubs-play-tournament"
        label="Play club tournament"
        run={async () => {
          const { winners } = await playToCompletion({
            testUser: currentUser,
            fixtureActions,
          });
          const firstPlace = winners.filter(
            (winner: { place: string }) => winner.place === winners[0].place,
          );
          return {
            winners,
            expected: {
              clubWinnerMessage: await clubWinnerMessage({
                winnerIds: firstPlace.map(
                  (winner: { userId: string }) => winner.userId,
                ),
                tournamentName: RR_SCENARIOS[CLUB_TOURNAMENT_SCENARIO].name,
              }),
            },
          };
        }}
      />
      <SeedButton
        id="maestro-clubs-count-request-replies"
        label="Count Rae/Nia request replies"
        success="Checked"
        failure="Check failed"
        run={countRequestReplies}
      />
      <SeedButton
        id="maestro-clubs-count-left-notices"
        label="Count Olive's left notices"
        success="Checked"
        failure="Check failed"
        run={() => countLeftNotices(currentUser)}
      />
      <SeedButton
        id="maestro-clubs-seed-competition-club"
        label="Seed Own Club for a competition"
        run={() => seedCompetitionClub({ services, testUser: currentUser })}
      />
      <SeedButton
        id="maestro-clubs-count-competition-notices"
        label="Count club competition notices"
        success="Checked"
        failure="Check failed"
        run={() => countCompetitionNotices(currentUser)}
      />
      <SeedButton
        id="maestro-clubs-olive-creates-league"
        label="Olive creates a club league"
        run={() => fixtureOwnerCreatesClubLeague(services)}
      />
      <SeedButton
        id="maestro-clubs-olive-invites-test-user"
        label="Olive invites test user"
        run={() =>
          fixtureOwnerInvitesTestUser({ services, testUser: currentUser })
        }
      />
      <SeedButton
        id="maestro-clubs-open-newest-push"
        label="Tap newest notification's push"
        success="Resolved"
        run={async () => {
          const data = await newestNotificationData(currentUser);
          openPushNotification(navigation, data);
          return { data };
        }}
      />
      <SeedButton
        id="maestro-clubs-olive-accepts-test-user"
        label="Olive accepts test user"
        success="Resolved"
        run={() =>
          fixtureOwnerAcceptsRequest({ services, requester: currentUser })
        }
      />
    </>
  );
};

const clubs: HarnessSection = {
  id: "clubs",
  Buttons: ClubButtons,
  cleanup: ({ testUser }) => cleanupClubTestData({ testUser }),
};

export default clubs;
