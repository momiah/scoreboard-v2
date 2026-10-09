import React, { useState } from "react";
import {
  Alert,
  Pressable,
  Text as RNText,
  TouchableOpacity,
  View,
} from "react-native";
import type { UserProfile } from "@shared/types";
import { LADDER_STATUS } from "@shared";
import {
  seedRejectGameFlow,
  MAESTRO_LADDER_ID,
  MAESTRO_MATCH_ID,
  MAESTRO_GAME_ID,
} from "./seeds/seedRejectGameFlow";
import {
  seedDoublesRejectGameFlow,
  MAESTRO_D_LADDER_ID,
  MAESTRO_D_MATCH_ID,
  MAESTRO_D_GAME_ID,
} from "./seeds/seedRejectGameFlowDoubles";
import { mockResolveDispute } from "./seeds/mockResolveDispute";
import { mockRequestMoreEvidence } from "./seeds/mockRequestMoreEvidence";
import { cleanupLadderTestData } from "./seeds/cleanupLadderTestData";
import { seedAddApproveGameFlow } from "./seeds/seedAddApproveGameFlow";
import { seedAddApproveGameFlowDoubles } from "./seeds/seedAddApproveGameFlowDoubles";
import { seedHomeCourtFlow } from "./seeds/seedHomeCourtFlow";
import {
  CANCEL_VARIANT,
  MAESTRO_CANCEL_LADDER_ID,
  MAESTRO_CANCEL_MATCH_ID,
  MAESTRO_CANCEL_OPPONENT_ID,
  seedMatchCancellationFlow,
} from "./seeds/seedMatchCancellationFlow";
import {
  MAESTRO_CREATED_TEAM_NAME,
  MAESTRO_TEAM_INVITEE_ID,
  TEAM_VARIANT,
  seedTeamFlow,
} from "./seeds/seedTeamFlow";
import { assertReportFiled } from "./seeds/assertReportFiled";
import { assertChatMessageDelivered } from "./seeds/assertChatMessageDelivered";
import { assertTeamInviteSent } from "./seeds/assertTeamInviteSent";
import { mockOpponentCancellationResponse } from "./seeds/mockOpponentCancellationResponse";
import { assertCancellationNotification } from "./seeds/assertCancellationNotification";
import {
  DISBAND_VARIANT,
  MAESTRO_DISBAND_LADDER_ID,
  MAESTRO_DISBAND_MATCH_ID,
  MAESTRO_DISBAND_OPP1_ID,
  MAESTRO_DISBAND_OPP2_ID,
  seedTeamDisbandFlow,
} from "./seeds/seedTeamDisbandFlow";
import {
  JOIN_VARIANT,
  seedLadderJoinFlowDoubles,
  seedLadderJoinFlowSingles,
} from "./seeds/seedLadderJoinFlow";
import { seedHomeCourtFlowDoubles } from "./seeds/seedHomeCourtFlowDoubles";
import {
  findOwnPendingCourtId,
  mockApproveCourtSubmission,
  mockRejectCourtSubmission,
} from "./seeds/mockCourtSubmissionReview";
import { mockPartnerSetHomeCourt } from "./seeds/mockPartnerSetHomeCourt";
import {
  MAESTRO_PO_CANCELLED_SIZE,
  PLAYOFF_VARIANT,
  seedLadderPlayoffs,
  seedLadderPlayoffsDoubles,
} from "./seeds/seedLadderPlayoffs";
import {
  HOME_COURT_VARIANT,
  MAESTRO_HC_COURT_A_SINGLES_ID,
  MAESTRO_HC_COURT_B_ID,
  MAESTRO_HC_COURT_D_ID,
  MAESTRO_HC_DOUBLES_LADDER_ID,
  MAESTRO_HC_EXTRA_COURT_COUNT,
  MAESTRO_HC_LADDER_ID,
  MAESTRO_HC_NEW_SUBMISSION_NAME,
} from "./seeds/homeCourtFixtures";

const UNLOCK_TAPS = 5;

const HarnessButton = (
  props: React.ComponentProps<typeof TouchableOpacity>,
) => (
  <TouchableOpacity
    {...props}
    style={[{ width: "25%", paddingVertical: 1 }, props.style]}
  />
);

const Text = (props: React.ComponentProps<typeof RNText>) => (
  <RNText numberOfLines={1} {...props} style={[{ fontSize: 7 }, props.style]} />
);
const PLAYOFF_SIZES = [2048, 1024, 512, 256, 128, 255, 511, 1023];

const HarnessButtons = ({ currentUser }: { currentUser: UserProfile }) => (
  <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
    <HarnessButton
      testID="maestro-cleanup-ladder-test-data"
      onPress={async () => {
        try {
          const outcome = await cleanupLadderTestData({
            testUser: currentUser as never,
          });
          Alert.alert("Cleaned up", JSON.stringify(outcome));
        } catch (error) {
          Alert.alert("Cleanup failed", String(error));
        }
      }}
    >
      <Text style={{ color: "white" }}>Delete Ladder Test Data</Text>
    </HarnessButton>

    {[
      {
        id: "maestro-seed-ladder-playoffs",
        label: "Seed Ladder Playoffs 2048 (Awaiting Function)",
        run: () => seedLadderPlayoffs({ testUser: currentUser }),
      },
      ...PLAYOFF_SIZES.map((size) => ({
        id:
          size === 2048
            ? "maestro-seed-ladder-playoffs-generated"
            : `maestro-seed-ladder-playoffs-generated-${size}`,
        label: `Seed Ladder Playoffs ${size} (Generated)`,
        run: () =>
          seedLadderPlayoffs({ testUser: currentUser, generate: true, size }),
      })),
      {
        id: "maestro-seed-ladder-playoffs-not-qualified",
        label: "Seed Ladder Playoffs 256 (Not Qualified)",
        run: () =>
          seedLadderPlayoffs({
            testUser: currentUser,
            generate: true,
            size: 256,
            variant: PLAYOFF_VARIANT.NOT_QUALIFIED,
          }),
      },
      {
        id: "maestro-seed-ladder-playoffs-upcoming",
        label: "Seed Ladder Playoffs 256 (Upcoming)",
        run: () =>
          seedLadderPlayoffs({
            testUser: currentUser,
            size: 256,
            variant: PLAYOFF_VARIANT.UPCOMING,
          }),
      },
      {
        id: "maestro-seed-ladder-playoffs-cancelled",
        label: "Seed Ladder Playoffs 127 (Cancelled)",
        run: () =>
          seedLadderPlayoffs({
            testUser: currentUser,
            size: MAESTRO_PO_CANCELLED_SIZE,
            variant: PLAYOFF_VARIANT.CANCELLED,
          }),
      },
      {
        id: "maestro-seed-ladder-playoffs-doubles",
        label: "Seed Ladder Playoffs Doubles 256 (Awaiting Function)",
        run: () => seedLadderPlayoffsDoubles({ testUser: currentUser }),
      },
      {
        id: "maestro-seed-ladder-playoffs-doubles-generated",
        label: "Seed Ladder Playoffs Doubles 256 (Generated)",
        run: () =>
          seedLadderPlayoffsDoubles({ testUser: currentUser, generate: true }),
      },
      {
        id: "maestro-seed-ladder-playoffs-doubles-generated-128",
        label: "Seed Ladder Playoffs Doubles 128 (Generated)",
        run: () =>
          seedLadderPlayoffsDoubles({
            testUser: currentUser,
            generate: true,
            teams: 128,
          }),
      },
    ].map(({ id, label, run }) => (
      <HarnessButton
        key={id}
        testID={id}
        onPress={async () => {
          try {
            const outcome = await run();
            Alert.alert("Seeded", JSON.stringify(outcome));
          } catch (error) {
            Alert.alert("Seed failed", String(error));
          }
        }}
      >
        <Text style={{ color: "white" }}>{label}</Text>
      </HarnessButton>
    ))}

    <HarnessButton
      testID="maestro-seed-reject-game-flow"
      onPress={async () => {
        try {
          const outcome = await seedRejectGameFlow({
            testUser: currentUser,
          });
          Alert.alert("Seeded", JSON.stringify(outcome));
        } catch (error) {
          Alert.alert("Seed failed", String(error));
        }
      }}
    >
      <Text style={{ color: "white" }}>Seed Reject-Game Flow</Text>
    </HarnessButton>

    <HarnessButton
      testID="maestro-seed-active-dispute"
      onPress={async () => {
        try {
          const outcome = await seedRejectGameFlow({
            testUser: currentUser,
            withActiveDispute: true,
          });
          Alert.alert("Seeded", JSON.stringify(outcome));
        } catch (error) {
          Alert.alert("Seed failed", String(error));
        }
      }}
    >
      <Text style={{ color: "white" }}>
        Seed Reject-Game Flow (Active Dispute)
      </Text>
    </HarnessButton>

    <HarnessButton
      testID="maestro-seed-doubles-reject-game-flow"
      onPress={async () => {
        try {
          const outcome = await seedDoublesRejectGameFlow({
            testUser: currentUser,
          });
          Alert.alert("Seeded", JSON.stringify(outcome));
        } catch (error) {
          Alert.alert("Seed failed", String(error));
        }
      }}
    >
      <Text style={{ color: "white" }}>Seed Doubles Reject-Game Flow</Text>
    </HarnessButton>

    <HarnessButton
      testID="maestro-seed-doubles-active-dispute"
      onPress={async () => {
        try {
          const outcome = await seedDoublesRejectGameFlow({
            testUser: currentUser,
            withActiveDispute: true,
          });
          Alert.alert("Seeded", JSON.stringify(outcome));
        } catch (error) {
          Alert.alert("Seed failed", String(error));
        }
      }}
    >
      <Text style={{ color: "white" }}>
        Seed Doubles Reject-Game Flow (Active Dispute)
      </Text>
    </HarnessButton>

    {(["upheld", "rejected", "void"] as const).map((resolution) => (
      <HarnessButton
        key={resolution}
        testID={`maestro-mock-resolve-${resolution}`}
        onPress={async () => {
          try {
            const outcome = await mockResolveDispute({
              ladderId: MAESTRO_LADDER_ID,
              matchId: MAESTRO_MATCH_ID,
              gameId: MAESTRO_GAME_ID,
              resolution,
              actorId: currentUser.userId,
              note: `Maestro E2E mock: ${resolution}`,
            });
            Alert.alert("Resolved", JSON.stringify(outcome));
          } catch (error) {
            Alert.alert("Resolve failed", String(error));
          }
        }}
      >
        <Text style={{ color: "white" }}>
          Mock Resolve Dispute ({resolution})
        </Text>
      </HarnessButton>
    ))}

    <HarnessButton
      testID="maestro-mock-request-more-evidence"
      onPress={async () => {
        try {
          await mockRequestMoreEvidence({
            gameId: MAESTRO_GAME_ID,
            actorId: currentUser.userId,
            note: "Maestro E2E mock: please provide more detail.",
          });
          Alert.alert("Requested", "More evidence requested");
        } catch (error) {
          Alert.alert("Request failed", String(error));
        }
      }}
    >
      <Text style={{ color: "white" }}>Mock Request More Evidence</Text>
    </HarnessButton>

    {(["upheld", "rejected", "void"] as const).map((resolution) => (
      <HarnessButton
        key={resolution}
        testID={`maestro-mock-resolve-doubles-${resolution}`}
        onPress={async () => {
          try {
            const outcome = await mockResolveDispute({
              ladderId: MAESTRO_D_LADDER_ID,
              matchId: MAESTRO_D_MATCH_ID,
              gameId: MAESTRO_D_GAME_ID,
              resolution,
              actorId: currentUser.userId,
              note: `Maestro E2E mock: ${resolution}`,
            });
            Alert.alert("Resolved", JSON.stringify(outcome));
          } catch (error) {
            Alert.alert("Resolve failed", String(error));
          }
        }}
      >
        <Text style={{ color: "white" }}>
          Mock Resolve Doubles Dispute ({resolution})
        </Text>
      </HarnessButton>
    ))}

    <HarnessButton
      testID="maestro-mock-request-doubles-more-evidence"
      onPress={async () => {
        try {
          await mockRequestMoreEvidence({
            gameId: MAESTRO_D_GAME_ID,
            actorId: currentUser.userId,
            note: "Maestro E2E mock: please provide more detail.",
          });
          Alert.alert("Requested", "More evidence requested");
        } catch (error) {
          Alert.alert("Request failed", String(error));
        }
      }}
    >
      <Text style={{ color: "white" }}>
        Mock Request More Evidence (Doubles)
      </Text>
    </HarnessButton>

    <HarnessButton
      testID="maestro-seed-add-game-flow"
      onPress={async () => {
        try {
          const outcome = await seedAddApproveGameFlow({
            testUser: currentUser,
          });
          Alert.alert("Seeded", JSON.stringify(outcome));
        } catch (error) {
          Alert.alert("Seed failed", String(error));
        }
      }}
    >
      <Text style={{ color: "white" }}>Seed Add-Game Flow</Text>
    </HarnessButton>

    <HarnessButton
      testID="maestro-seed-add-game-flow-reported"
      onPress={async () => {
        try {
          const outcome = await seedAddApproveGameFlow({
            testUser: currentUser,
            withReportedGame: true,
          });
          Alert.alert("Seeded", JSON.stringify(outcome));
        } catch (error) {
          Alert.alert("Seed failed", String(error));
        }
      }}
    >
      <Text style={{ color: "white" }}>Seed Add-Game Flow (Reported)</Text>
    </HarnessButton>

    <HarnessButton
      testID="maestro-seed-add-game-flow-doubles"
      onPress={async () => {
        try {
          const outcome = await seedAddApproveGameFlowDoubles({
            testUser: currentUser,
          });
          Alert.alert("Seeded", JSON.stringify(outcome));
        } catch (error) {
          Alert.alert("Seed failed", String(error));
        }
      }}
    >
      <Text style={{ color: "white" }}>Seed Add-Game Flow (Doubles)</Text>
    </HarnessButton>

    <HarnessButton
      testID="maestro-seed-add-game-flow-doubles-reported"
      onPress={async () => {
        try {
          const outcome = await seedAddApproveGameFlowDoubles({
            testUser: currentUser,
            withReportedGame: true,
          });
          Alert.alert("Seeded", JSON.stringify(outcome));
        } catch (error) {
          Alert.alert("Seed failed", String(error));
        }
      }}
    >
      <Text style={{ color: "white" }}>
        Seed Add-Game Flow (Doubles, Reported)
      </Text>
    </HarnessButton>

    {[
      {
        id: "maestro-seed-add-game-flow-decider",
        label: "Seed Add-Game Flow (Decider Pending)",
        run: () =>
          seedAddApproveGameFlow({
            testUser: currentUser,
            withReportedGame: true,
            priorApprovedGames: 2,
          }),
      },
      {
        id: "maestro-seed-add-game-flow-playoffs-started",
        label: "Seed Add-Game Flow (Playoffs Started, Reported)",
        run: () =>
          seedAddApproveGameFlow({
            testUser: currentUser,
            withReportedGame: true,
            ladderStatus: LADDER_STATUS.PLAYOFFS,
          }),
      },
      ...[
        ["open", JOIN_VARIANT.OPEN],
        ["full", JOIN_VARIANT.FULL],
        ["window-closed", JOIN_VARIANT.WINDOW_CLOSED],
        ["status-closed", JOIN_VARIANT.STATUS_CLOSED],
      ].map(([key, variant]) => ({
        id: `maestro-seed-join-singles-${key}`,
        label: `Seed Join Singles (${key})`,
        run: () => seedLadderJoinFlowSingles({ testUser: currentUser, variant }),
      })),
      ...[
        ["open", JOIN_VARIANT.OPEN],
        ["full", JOIN_VARIANT.FULL],
        ["window-closed", JOIN_VARIANT.WINDOW_CLOSED],
        ["partner-in-ladder", JOIN_VARIANT.PARTNER_IN_LADDER],
        ["claim-race", JOIN_VARIANT.CLAIM_RACE],
      ].map(([key, variant]) => ({
        id: `maestro-seed-join-doubles-${key}`,
        label: `Seed Join Doubles (${key})`,
        run: () => seedLadderJoinFlowDoubles({ testUser: currentUser, variant }),
      })),
      {
        id: "maestro-seed-add-game-flow-checkin-court-coords",
        label: "Seed Add-Game Flow (Check-in, Court Coords)",
        run: () =>
          seedAddApproveGameFlow({
            testUser: currentUser,
            allCheckedIn: false,
            courtCoords: { latitude: 51.5074, longitude: -0.1278 },
          }),
      },
      ...[
        ["open", DISBAND_VARIANT.OPEN],
        ["open-with-spare-team", DISBAND_VARIANT.OPEN_WITH_SPARE_TEAM],
        ["posted-match", DISBAND_VARIANT.POSTED_MATCH],
        ["accepted-match", DISBAND_VARIANT.ACCEPTED_MATCH],
        ["approved-game", DISBAND_VARIANT.APPROVED_GAME],
        ["registration-closed", DISBAND_VARIANT.REGISTRATION_CLOSED],
        ["playoffs", DISBAND_VARIANT.PLAYOFFS],
        ["accepted-requested-by-user", DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_USER],
        ["accepted-requested-by-opponent", DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_OPPONENT],
        ["accepted-requested-by-partner", DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_PARTNER],
        ["accepted-game-reported", DISBAND_VARIANT.ACCEPTED_GAME_REPORTED],
        ["ladder-completed", DISBAND_VARIANT.LADDER_COMPLETED],
        ["other-ladder-completed", DISBAND_VARIANT.OTHER_LADDER_COMPLETED],
      ].map(([key, variant]) => ({
        id: `maestro-seed-disband-${key}`,
        label: `Seed Disband (${key})`,
        run: () => seedTeamDisbandFlow({ testUser: currentUser, variant }),
      })),
      ...[
        ["posted-own", CANCEL_VARIANT.POSTED_OWN],
        ["accepted", CANCEL_VARIANT.ACCEPTED],
        ["requested-by-opponent", CANCEL_VARIANT.REQUESTED_BY_OPPONENT],
        ["requested-by-user", CANCEL_VARIANT.REQUESTED_BY_USER],
        ["game-reported", CANCEL_VARIANT.GAME_REPORTED],
        ["user-disqualified", CANCEL_VARIANT.USER_DISQUALIFIED],
      ].map(([key, variant]) => ({
        id: `maestro-seed-cancel-${key}`,
        label: `Seed Cancel (${key})`,
        run: () => seedMatchCancellationFlow({ testUser: currentUser, variant }),
      })),
      ...[
        ["accept", true],
        ["decline", false],
      ].flatMap(([key, accept]) => [
        {
          id: `maestro-mock-cancel-opponent-${key}`,
          label: `Mock Cancel Opp ${key}`,
          run: () =>
            mockOpponentCancellationResponse({
              ladderId: MAESTRO_CANCEL_LADDER_ID,
              matchId: MAESTRO_CANCEL_MATCH_ID,
              accept: accept as boolean,
              responder: {
                userId: MAESTRO_CANCEL_OPPONENT_ID,
                firstName: "Maestro",
                lastName: "CancelOpponent",
                username: "maestro_cancel_opponent",
              },
              notifyUserId: currentUser.userId,
            }),
        },
        {
          id: `maestro-mock-disband-opponent-${key}`,
          label: `Mock Disband Opp ${key}`,
          run: () =>
            mockOpponentCancellationResponse({
              ladderId: MAESTRO_DISBAND_LADDER_ID,
              matchId: MAESTRO_DISBAND_MATCH_ID,
              accept: accept as boolean,
            }),
        },
      ]),
      ...(["request", "accept", "decline"] as const).flatMap((kind) => [
        {
          id: `maestro-assert-cancel-notified-${kind}`,
          label: `Assert Cancel Notified ${kind}`,
          run: () =>
            assertCancellationNotification({
              recipientIds: [MAESTRO_CANCEL_OPPONENT_ID],
              matchId: MAESTRO_CANCEL_MATCH_ID,
              kind,
            }),
        },
        {
          id: `maestro-assert-disband-notified-${kind}`,
          label: `Assert Disband Notified ${kind}`,
          run: () =>
            assertCancellationNotification({
              recipientIds: [MAESTRO_DISBAND_OPP1_ID, MAESTRO_DISBAND_OPP2_ID],
              matchId: MAESTRO_DISBAND_MATCH_ID,
              kind,
            }),
        },
      ]),
      ...[
        ["create", TEAM_VARIANT.CREATE],
        ["invited", TEAM_VARIANT.INVITED],
        ["request-out", TEAM_VARIANT.REQUEST_OUT],
        ["request-in", TEAM_VARIANT.REQUEST_IN],
      ].map(([key, variant]) => ({
        id: `maestro-seed-team-${key}`,
        label: `Seed Team (${key})`,
        run: () => seedTeamFlow({ testUser: currentUser, variant }),
      })),
      ...(
        [
          ["cheating", { reason: "cheating", targetType: "player" }],
          [
            "other",
            {
              reason: "other",
              targetType: "player",
              description: "Maestro: refused to play the agreed best of three",
            },
          ],
        ] as const
      ).map(([key, expected]) => ({
        id: `maestro-assert-report-filed-${key}`,
        label: `Assert Report ${key}`,
        run: () =>
          assertReportFiled({
            matchId: MAESTRO_CANCEL_MATCH_ID,
            targetUserIds: [MAESTRO_CANCEL_OPPONENT_ID],
            reportedBy: currentUser.userId,
            ...expected,
          }),
      })),
      ...(
        [
          ["team", { targetType: "team", targetUserIds: [MAESTRO_DISBAND_OPP1_ID, MAESTRO_DISBAND_OPP2_ID] }],
          ["player", { targetType: "player", targetUserIds: [MAESTRO_DISBAND_OPP1_ID] }],
        ] as const
      ).map(([key, expected]) => ({
        id: `maestro-assert-disband-report-filed-${key}`,
        label: `Assert Doubles Report ${key}`,
        run: () =>
          assertReportFiled({
            matchId: MAESTRO_DISBAND_MATCH_ID,
            reportedBy: currentUser.userId,
            reason: "abuse",
            ...expected,
          }),
      })),
      {
        id: "maestro-assert-cancel-chat-delivered",
        label: "Assert Chat Delivered",
        run: () =>
          assertChatMessageDelivered({
            ladderId: MAESTRO_CANCEL_LADDER_ID,
            matchId: MAESTRO_CANCEL_MATCH_ID,
            recipientId: MAESTRO_CANCEL_OPPONENT_ID,
            text: "On my way, bringing the shuttles",
          }),
      },
      {
        id: "maestro-assert-team-invite-sent",
        label: "Assert Team Invite Sent",
        run: () =>
          assertTeamInviteSent({
            recipientId: MAESTRO_TEAM_INVITEE_ID,
            teamName: MAESTRO_CREATED_TEAM_NAME,
          }),
      },
      {
        id: "maestro-seed-reject-playoffs-started",
        label: "Seed Active Dispute (Playoffs Started)",
        run: () =>
          seedRejectGameFlow({
            testUser: currentUser,
            withActiveDispute: true,
            ladderStatus: LADDER_STATUS.PLAYOFFS,
          }),
      },
      {
        id: "maestro-seed-add-game-flow-not-checked-in",
        label: "Seed Add-Game Flow (Not Checked In)",
        run: () =>
          seedAddApproveGameFlow({
            testUser: currentUser,
            allCheckedIn: false,
          }),
      },
      {
        id: "maestro-seed-add-game-flow-doubles-decider",
        label: "Seed Add-Game Flow (Doubles, Decider Pending)",
        run: () =>
          seedAddApproveGameFlowDoubles({
            testUser: currentUser,
            withReportedGame: true,
            priorApprovedGames: 2,
          }),
      },
      {
        id: "maestro-seed-add-game-flow-doubles-not-checked-in",
        label: "Seed Add-Game Flow (Doubles, Not Checked In)",
        run: () =>
          seedAddApproveGameFlowDoubles({
            testUser: currentUser,
            allCheckedIn: false,
          }),
      },
      {
        id: "maestro-seed-add-game-flow-two-reported",
        label: "Seed Add-Game Flow (Two Reported)",
        run: () =>
          seedAddApproveGameFlow({
            testUser: currentUser,
            withReportedGame: true,
            extraPendingGames: 1,
          }),
      },
      {
        id: "maestro-seed-add-game-flow-doubles-two-reported",
        label: "Seed Add-Game Flow (Doubles, Two Reported)",
        run: () =>
          seedAddApproveGameFlowDoubles({
            testUser: currentUser,
            withReportedGame: true,
            extraPendingGames: 1,
          }),
      },
      {
        id: "maestro-seed-add-game-flow-opponent-dispute",
        label: "Seed Add-Game Flow (Opponent Disputed My Report)",
        run: () =>
          seedAddApproveGameFlow({
            testUser: currentUser,
            withOpponentDispute: true,
          }),
      },
      {
        id: "maestro-seed-add-game-flow-doubles-opponent-dispute",
        label: "Seed Add-Game Flow (Doubles, Opponent Disputed Partner Report)",
        run: () =>
          seedAddApproveGameFlowDoubles({
            testUser: currentUser,
            withOpponentDispute: true,
          }),
      },
      {
        id: "maestro-seed-add-game-flow-doubles-my-team-reported",
        label: "Seed Add-Game Flow (Doubles, My Team Reported)",
        run: () =>
          seedAddApproveGameFlowDoubles({
            testUser: currentUser,
            reportedByMyTeam: true,
          }),
      },
      {
        id: "maestro-seed-add-game-flow-doubles-solo-team",
        label: "Seed Add-Game Flow (Doubles, With Solo Team)",
        run: () =>
          seedAddApproveGameFlowDoubles({
            testUser: currentUser,
            withSoloTeam: true,
          }),
      },
      {
        id: "maestro-seed-add-game-flow-doubles-lazy-participant",
        label: "Seed Add-Game Flow (Doubles, Missing Participants)",
        run: () =>
          seedAddApproveGameFlowDoubles({
            testUser: currentUser,
            withReportedGame: true,
            omitPartnerAndOpp2Participants: true,
          }),
      },
    ].map(({ id, label, run }) => (
      <HarnessButton
        key={id}
        testID={id}
        onPress={async () => {
          try {
            const outcome = await run();
            Alert.alert("Seeded", JSON.stringify(outcome));
          } catch (error) {
            Alert.alert("Seed failed", String(error));
          }
        }}
      >
        <Text style={{ color: "white" }}>{label}</Text>
      </HarnessButton>
    ))}

    {[
      {
        id: "maestro-seed-home-court-flow",
        label: "Seed Home Court Flow",
        title: "Seeded",
        run: () => seedHomeCourtFlow({ testUser: currentUser }),
      },
      {
        id: "maestro-seed-home-court-flow-set",
        label: "Seed Home Court Flow (Home Court Set)",
        title: "Seeded",
        run: () =>
          seedHomeCourtFlow({
            testUser: currentUser,
            homeCourt: HOME_COURT_VARIANT.SET,
          }),
      },
      {
        id: "maestro-seed-home-court-flow-change-used",
        label: "Seed Home Court Flow (Change Used)",
        title: "Seeded",
        run: () =>
          seedHomeCourtFlow({
            testUser: currentUser,
            homeCourt: HOME_COURT_VARIANT.CHANGE_USED,
          }),
      },
      {
        id: "maestro-seed-home-court-flow-playoffs-started",
        label: "Seed Home Court Flow (Playoffs Started)",
        title: "Seeded",
        run: () =>
          seedHomeCourtFlow({
            testUser: currentUser,
            homeCourt: HOME_COURT_VARIANT.SET,
            ladderStatus: LADDER_STATUS.PLAYOFFS,
          }),
      },
      {
        id: "maestro-seed-home-court-flow-large-ladder",
        label: "Seed Home Court Flow (80 Extra Ladder Courts)",
        title: "Seeded",
        run: () =>
          seedHomeCourtFlow({
            testUser: currentUser,
            extraLadderCourts: MAESTRO_HC_EXTRA_COURT_COUNT,
          }),
      },
      {
        id: "maestro-seed-home-court-flow-doubles",
        label: "Seed Home Court Flow (Doubles)",
        title: "Seeded",
        run: () => seedHomeCourtFlowDoubles({ testUser: currentUser }),
      },
      {
        id: "maestro-seed-home-court-flow-doubles-set",
        label: "Seed Home Court Flow (Doubles, Home Court Set)",
        title: "Seeded",
        run: () =>
          seedHomeCourtFlowDoubles({
            testUser: currentUser,
            homeCourt: HOME_COURT_VARIANT.SET,
          }),
      },
      {
        id: "maestro-seed-home-court-flow-doubles-change-used",
        label: "Seed Home Court Flow (Doubles, Change Used)",
        title: "Seeded",
        run: () =>
          seedHomeCourtFlowDoubles({
            testUser: currentUser,
            homeCourt: HOME_COURT_VARIANT.CHANGE_USED,
          }),
      },
      {
        id: "maestro-mock-approve-court-submission",
        label: "Mock Approve Court Submission",
        title: "Mocked",
        run: () =>
          mockApproveCourtSubmission({
            courtId: MAESTRO_HC_COURT_A_SINGLES_ID,
            actorUserId: currentUser.userId,
          }),
      },
      {
        id: "maestro-mock-reject-court-submission",
        label: "Mock Reject Court Submission",
        title: "Mocked",
        run: () =>
          mockRejectCourtSubmission({
            courtId: MAESTRO_HC_COURT_A_SINGLES_ID,
          }),
      },
      ...[
        { suffix: "", ladderId: MAESTRO_HC_LADDER_ID, label: "" },
        {
          suffix: "-doubles",
          ladderId: MAESTRO_HC_DOUBLES_LADDER_ID,
          label: " (Doubles)",
        },
      ].flatMap(({ suffix, ladderId, label }) => [
        {
          id: `maestro-mock-approve-new-submission${suffix}`,
          label: `Mock Approve My New Court Submission${label}`,
          title: "Mocked",
          run: async () =>
            mockApproveCourtSubmission({
              courtId: await findOwnPendingCourtId({
                userId: currentUser.userId,
                ladderId,
                courtName: MAESTRO_HC_NEW_SUBMISSION_NAME,
              }),
              actorUserId: currentUser.userId,
            }),
        },
        {
          id: `maestro-mock-reject-new-submission${suffix}`,
          label: `Mock Reject My New Court Submission${label}`,
          title: "Mocked",
          run: async () =>
            mockRejectCourtSubmission({
              courtId: await findOwnPendingCourtId({
                userId: currentUser.userId,
                ladderId,
                courtName: MAESTRO_HC_NEW_SUBMISSION_NAME,
              }),
            }),
        },
      ]),
      {
        id: "maestro-mock-partner-set-home-court-b",
        label: "Mock Partner Sets Home Court (B)",
        title: "Mocked",
        run: () =>
          mockPartnerSetHomeCourt({
            testUser: currentUser,
            courtId: MAESTRO_HC_COURT_B_ID,
          }),
      },
      {
        id: "maestro-mock-partner-set-home-court-d",
        label: "Mock Partner Sets Home Court (D)",
        title: "Mocked",
        run: () =>
          mockPartnerSetHomeCourt({
            testUser: currentUser,
            courtId: MAESTRO_HC_COURT_D_ID,
          }),
      },
    ].map(({ id, label, title, run }) => (
      <HarnessButton
        key={id}
        testID={id}
        onPress={async () => {
          try {
            const outcome = await run();
            Alert.alert(title, JSON.stringify(outcome));
          } catch (error) {
            Alert.alert(`${title} failed`, String(error));
          }
        }}
      >
        <Text style={{ color: "white" }}>{label}</Text>
      </HarnessButton>
    ))}
  </View>
);

const MaestroHarness = ({ currentUser }: { currentUser: UserProfile }) => {
  const [taps, setTaps] = useState(0);

  return (
    <>
      <Pressable
        testID="maestro-harness-unlock"
        accessibilityLabel="maestro-harness-unlock"
        style={{ height: 24 }}
        onPress={() => setTaps((count) => count + 1)}
      />
      {taps >= UNLOCK_TAPS ? (
        <HarnessButtons currentUser={currentUser} />
      ) : null}
    </>
  );
};

export default MaestroHarness;
