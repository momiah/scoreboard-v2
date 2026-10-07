import React, { useState } from "react";
import { Alert, Pressable, Text, TouchableOpacity } from "react-native";
import type { UserProfile } from "@shared/types";
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
import { seedHomeCourtFlowDoubles } from "./seeds/seedHomeCourtFlowDoubles";
import {
  findOwnPendingCourtId,
  mockApproveCourtSubmission,
  mockRejectCourtSubmission,
} from "./seeds/mockCourtSubmissionReview";
import { mockPartnerSetHomeCourt } from "./seeds/mockPartnerSetHomeCourt";
import {
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

const HarnessButtons = ({ currentUser }: { currentUser: UserProfile }) => (
  <>
    <TouchableOpacity
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
    </TouchableOpacity>

    <TouchableOpacity
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
    </TouchableOpacity>

    <TouchableOpacity
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
    </TouchableOpacity>

    <TouchableOpacity
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
    </TouchableOpacity>

    <TouchableOpacity
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
    </TouchableOpacity>

    {(["upheld", "rejected", "void"] as const).map((resolution) => (
      <TouchableOpacity
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
      </TouchableOpacity>
    ))}

    <TouchableOpacity
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
    </TouchableOpacity>

    {(["upheld", "rejected", "void"] as const).map((resolution) => (
      <TouchableOpacity
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
      </TouchableOpacity>
    ))}

    <TouchableOpacity
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
    </TouchableOpacity>

    <TouchableOpacity
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
    </TouchableOpacity>

    <TouchableOpacity
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
    </TouchableOpacity>

    <TouchableOpacity
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
    </TouchableOpacity>

    <TouchableOpacity
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
    </TouchableOpacity>

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
      <TouchableOpacity
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
      </TouchableOpacity>
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
      {
        id: "maestro-seed-ladder-playoffs",
        label: "Seed Ladder Playoffs 2048 (Awaiting Function)",
        title: "Seeded",
        run: () => seedLadderPlayoffs({ testUser: currentUser }),
      },
      {
        id: "maestro-seed-ladder-playoffs-generated",
        label: "Seed Ladder Playoffs 2048 (Generated)",
        title: "Seeded",
        run: () => seedLadderPlayoffs({ testUser: currentUser, generate: true }),
      },
      {
        id: "maestro-seed-ladder-playoffs-doubles",
        label: "Seed Ladder Playoffs Doubles 256 (Awaiting Function)",
        title: "Seeded",
        run: () => seedLadderPlayoffsDoubles({ testUser: currentUser }),
      },
      {
        id: "maestro-seed-ladder-playoffs-doubles-generated",
        label: "Seed Ladder Playoffs Doubles 256 (Generated)",
        title: "Seeded",
        run: () =>
          seedLadderPlayoffsDoubles({ testUser: currentUser, generate: true }),
      },
    ].map(({ id, label, title, run }) => (
      <TouchableOpacity
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
      </TouchableOpacity>
    ))}
  </>
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
