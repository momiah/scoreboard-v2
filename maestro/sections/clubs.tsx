import React, { useContext } from "react";
import { LeagueContext } from "../../context/LeagueContext";
import { UserContext } from "../../context/UserContext";
import { SeedButton } from "../harness/HarnessButton";
import {
  CLUB_FIXTURE_IDS,
  cleanupClubTestData,
  countRemovalNotices,
  findTestUserClubId,
  fixtureOwnerAcceptsRequest,
  fixtureRequestToJoin,
  fixtureRespondToInvite,
  seedClubFixtureUsers,
  seedFixtureOwnedClub,
  seedOwnedClub,
  type ClubFixtureUserId,
  type ClubServices,
} from "../seeds/clubs/seedClubs";
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

const useClubServices = (): ClubServices => {
  const league = useContext(LeagueContext);
  const { sendNotification } = useContext(UserContext);
  return {
    addClub: league.addClub,
    acceptClubInvite: league.acceptClubInvite,
    declineClubInvite: league.declineClubInvite,
    requestToJoinClub: league.requestToJoinClub,
    acceptClubJoinRequest: league.acceptClubJoinRequest,
    sendNotification,
  };
};

const ClubButtons = ({ currentUser }: HarnessSectionProps) => {
  const services = useClubServices();
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
