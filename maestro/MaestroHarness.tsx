import React from "react";
import { Alert, Text, TouchableOpacity } from "react-native";
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

const MaestroHarness = ({ currentUser }: { currentUser: UserProfile }) => (
  <>
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
  </>
);

export default MaestroHarness;
