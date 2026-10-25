import React, {
  createContext,
  memo,
  useContext,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Pressable,
  Text as RNText,
  TextInput,
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
import { PRO_LEVEL_SEED_LEVELS, seedProLevel } from "./seeds/seedProLevel";
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
import { CHAT_VARIANT, seedChatsTab } from "./seeds/seedChatsTab";
import { mockOpponentCheckIn } from "./seeds/mockOpponentCheckIn";
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
  MAESTRO_PO_DOUBLES_LADDER_ID,
  MAESTRO_PO_LADDER_ID,
  MAESTRO_PO_PAID_LADDER_ID,
  PLAYOFF_VARIANT,
  seedLadderPlayoffs,
  seedLadderPlayoffsDoubles,
} from "./seeds/seedLadderPlayoffs";
import {
  PLAYOFF_MATCH_STAGE,
  seedLadderPlayoffMatches,
} from "./seeds/seedLadderPlayoffMatches";
import {
  JOURNEY_OUTCOME,
  JOURNEY_ROUND,
  JOURNEY_STAGE,
  assertLadderCompleted,
  assertPlayoffNotification,
  mockFinishCompanionTie,
  seedLadderPlayoffJourney,
} from "./seeds/seedLadderPlayoffJourney";
import {
  assertTieChatDelivered,
  mockOpponentArrangesLeg,
  mockPartnerArrangesLeg,
  mockPartnerRespondsToLeg,
  mockOpponentTieChat,
  mockPlayoffNotification,
  PLAYOFF_NOTIFICATION_KINDS,
  mockOpponentOffersPlayHere,
  mockOpponentRespondsToLeg,
} from "./seeds/mockPlayoffOpponent";
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
const PLAYOFF_PAID_ENTRY_FEE = 20;

const HarnessFilterContext = createContext("");

const HarnessButton = (
  props: React.ComponentProps<typeof TouchableOpacity>,
) => {
  const filter = useContext(HarnessFilterContext);
  if (filter && !String(props.testID ?? "").includes(filter)) return null;
  return (
    <TouchableOpacity
      {...props}
      style={[{ width: "25%", paddingVertical: 1 }, props.style]}
    />
  );
};

const Text = (props: React.ComponentProps<typeof RNText>) => (
  <RNText numberOfLines={1} {...props} style={[{ fontSize: 7 }, props.style]} />
);
const PLAYOFF_LADDER_VARIANTS = [
  { suffix: "", ladderId: MAESTRO_PO_LADDER_ID, entryFee: 0, doubles: false },
  {
    suffix: "-paid",
    ladderId: MAESTRO_PO_PAID_LADDER_ID,
    entryFee: PLAYOFF_PAID_ENTRY_FEE,
    doubles: false,
  },
  {
    suffix: "-doubles",
    ladderId: MAESTRO_PO_DOUBLES_LADDER_ID,
    entryFee: 0,
    doubles: true,
  },
];

const PLAYOFF_SIZES = [2048, 1024, 512, 256, 128, 255, 511, 1023];

const PlayoffVariantButtons = ({
  currentUser,
  variants,
}: {
  currentUser: UserProfile;
  variants: typeof PLAYOFF_LADDER_VARIANTS;
}) => (
  <>
    {variants
      .flatMap(({ suffix, ladderId, entryFee, doubles }) => [
        ...[
          ["r16-started", JOURNEY_ROUND.R16, JOURNEY_STAGE.STARTED],
          [
            "r16-leg1-finishing",
            JOURNEY_ROUND.R16,
            JOURNEY_STAGE.LEG1_FINISHING,
          ],
          [
            "r16-leg2-win",
            JOURNEY_ROUND.R16,
            JOURNEY_STAGE.LEG2_FINISHING,
            JOURNEY_OUTCOME.WIN,
          ],
          [
            "r16-leg2-loss",
            JOURNEY_ROUND.R16,
            JOURNEY_STAGE.LEG2_FINISHING,
            JOURNEY_OUTCOME.LOSS,
          ],
          [
            "r16-leg2-level",
            JOURNEY_ROUND.R16,
            JOURNEY_STAGE.LEG2_FINISHING,
            JOURNEY_OUTCOME.LEVEL,
          ],
          [
            "r16-decider-win",
            JOURNEY_ROUND.R16,
            JOURNEY_STAGE.DECIDER_FINISHING,
            JOURNEY_OUTCOME.WIN,
          ],
          [
            "r16-decider-loss",
            JOURNEY_ROUND.R16,
            JOURNEY_STAGE.DECIDER_FINISHING,
            JOURNEY_OUTCOME.LOSS,
          ],
          [
            "qf-leg2-win",
            JOURNEY_ROUND.QUARTER,
            JOURNEY_STAGE.LEG2_FINISHING,
            JOURNEY_OUTCOME.WIN,
          ],
          [
            "qf-leg2-loss",
            JOURNEY_ROUND.QUARTER,
            JOURNEY_STAGE.LEG2_FINISHING,
            JOURNEY_OUTCOME.LOSS,
          ],
          [
            "sf-leg2-win",
            JOURNEY_ROUND.SEMI,
            JOURNEY_STAGE.LEG2_FINISHING,
            JOURNEY_OUTCOME.WIN,
          ],
          [
            "sf-leg2-loss",
            JOURNEY_ROUND.SEMI,
            JOURNEY_STAGE.LEG2_FINISHING,
            JOURNEY_OUTCOME.LOSS,
          ],
          [
            "final-leg2-win",
            JOURNEY_ROUND.FINAL,
            JOURNEY_STAGE.LEG2_FINISHING,
            JOURNEY_OUTCOME.WIN,
          ],
          [
            "final-leg2-loss",
            JOURNEY_ROUND.FINAL,
            JOURNEY_STAGE.LEG2_FINISHING,
            JOURNEY_OUTCOME.LOSS,
          ],
          [
            "third-leg2-win",
            JOURNEY_ROUND.THIRD_PLACE,
            JOURNEY_STAGE.LEG2_FINISHING,
            JOURNEY_OUTCOME.WIN,
          ],
          [
            "third-leg2-loss",
            JOURNEY_ROUND.THIRD_PLACE,
            JOURNEY_STAGE.LEG2_FINISHING,
            JOURNEY_OUTCOME.LOSS,
          ],
        ].map(([key, round, stage, outcome]) => ({
          id: `maestro-seed-journey${suffix}-${key}`,
          label: `Seed Journey${suffix} ${key}`,
          run: () =>
            seedLadderPlayoffJourney({
              testUser: currentUser,
              round: round as never,
              stage: stage as never,
              outcome: outcome as never,
              doubles,
              ladderId,
              entryFee,
            }),
        })),
        ...(doubles
          ? [
              {
                id: `maestro-seed-journey${suffix}-r16-leg1-partner-reported`,
                label: `Seed Journey${suffix} partner reported`,
                run: () =>
                  seedLadderPlayoffJourney({
                    testUser: currentUser,
                    stage: JOURNEY_STAGE.PARTNER_REPORTED as never,
                    doubles,
                    ladderId,
                  }),
              },
              ...[1, 2].map((leg) => ({
                id: `maestro-mock-po${suffix}-partner-arranges-leg${leg}`,
                label: `Mock Partner Arranges Match ${leg}`,
                run: () =>
                  mockPartnerArrangesLeg({
                    testUser: currentUser,
                    ladderId,
                    leg,
                  }),
              })),
              ...[1, 2].flatMap((leg) =>
                (["accept", "decline"] as const).map((reply) => ({
                  id: `maestro-mock-po${suffix}-partner-${reply}-leg${leg}`,
                  label: `Mock Partner ${reply} Match ${leg}`,
                  run: () =>
                    mockPartnerRespondsToLeg({
                      testUser: currentUser,
                      ladderId,
                      leg,
                      accept: reply === "accept",
                    }),
                })),
              ),
            ]
          : []),
        ...(doubles ? [] : Object.values(PLAYOFF_MATCH_STAGE)).map((stage) => ({
          id: `maestro-seed-playoff-match${suffix}-${stage}`,
          label: `Seed Playoff Match${suffix} (${stage})`,
          run: () =>
            seedLadderPlayoffMatches({
              testUser: currentUser,
              stage,
              ladderId,
              entryFee,
            }),
        })),
        ...[1, 2].map((leg) => ({
          id: `maestro-mock-po${suffix}-opponent-arranges-leg${leg}`,
          label: `Mock Opp Arranges Match ${leg}${suffix}`,
          run: () =>
            mockOpponentArrangesLeg({ testUser: currentUser, ladderId, leg }),
        })),
        ...[1, 2].flatMap((leg) =>
          (["accept", "decline"] as const).map((reply) => ({
            id: `maestro-mock-po${suffix}-opponent-${reply}-leg${leg}`,
            label: `Mock Opp ${reply} Match ${leg}${suffix}`,
            run: () =>
              mockOpponentRespondsToLeg({
                testUser: currentUser,
                ladderId,
                leg,
                accept: reply === "accept",
              }),
          })),
        ),
        {
          id: `maestro-mock-po${suffix}-opponent-offers-play-here`,
          label: `Mock Opp Offers Play Here${suffix}`,
          run: () =>
            mockOpponentOffersPlayHere({ testUser: currentUser, ladderId }),
        },
        ...(
          [
            [
              "opponent-arranged-leg2",
              {
                tie: "user",
                who: "opponent",
                includes: "arranged playoff match 2",
              },
            ],
            [
              "opponent-accepted-leg1",
              {
                tie: "user",
                who: "opponent",
                includes: "accepted playoff match 1",
              },
            ],
            [
              "opponent-accepted-leg2",
              {
                tie: "user",
                who: "opponent",
                includes: "accepted playoff match 2",
              },
            ],
            [
              "opponent-declined-leg1",
              {
                tie: "user",
                who: "opponent",
                includes: "can't make playoff match 1",
              },
            ],
            [
              "opponent-arranged-leg1",
              {
                tie: "user",
                who: "opponent",
                includes: "arranged playoff match 1",
              },
            ],
            [
              "companion-winner-through",
              {
                tie: "companion",
                who: "winner",
                includes: "You've made it to the",
              },
            ],
            [
              "companion-loser-third-place",
              {
                tie: "companion",
                who: "loser",
                includes: "you'll play for 3rd place against",
              },
            ],
            [
              "opponent-auto-accept-host",
              {
                tie: "user",
                who: "opponent",
                includes: "didn't reply within 24 hours",
              },
            ],
            [
              "opponent-host-overdue",
              {
                tie: "user",
                who: "opponent",
                includes: "You haven't arranged match 1",
              },
            ],
            [
              "opponent-out-inactive",
              {
                tie: "user",
                who: "opponent",
                includes:
                  "because you didn't arrange or play a match before the deadline",
              },
            ],
            [
              "opponent-out-disqualified",
              {
                tie: "user",
                who: "opponent",
                includes: "because you've been disqualified from the ladder",
              },
            ],
            [
              "partner-arranged-leg1",
              { tie: "user", who: "partner", includes: "Your partner" },
            ],
            [
              "partner-arranged-leg2",
              {
                tie: "user",
                who: "partner",
                includes: "arranged playoff match 2",
              },
            ],
            [
              "partner-accepted-leg1",
              {
                tie: "user",
                who: "partner",
                includes: "accepted playoff match 1",
              },
            ],
            [
              "partner-accepted-leg2",
              {
                tie: "user",
                who: "partner",
                includes: "accepted playoff match 2",
              },
            ],
            [
              "partner-declined-leg1",
              {
                tie: "user",
                who: "partner",
                includes: "declined playoff match 1",
              },
            ],
            [
              "partner-offered-play-here",
              {
                tie: "user",
                who: "partner",
                includes: "offered to play match 2 now",
              },
            ],
            [
              "partner-placed-1st",
              { tie: "user", who: "partner", includes: "you have placed 1st" },
            ],
            [
              "partner-through-to-the-quarter-final",
              {
                tie: "user",
                who: "partner",
                includes: "through to the Quarter-Final",
              },
            ],
            [
              "partner-knocked-out-r16",
              {
                tie: "user",
                who: "partner",
                includes: "knocked out in the Round of 16",
              },
            ],
            [
              "partner-decider",
              {
                tie: "user",
                who: "partner",
                includes: "deciding game left to play",
              },
            ],
            [
              "opponent-placed-1st",
              { tie: "user", who: "opponent", includes: "you have placed 1st" },
            ],
            [
              "opponent-placed-2nd",
              { tie: "user", who: "opponent", includes: "you have placed 2nd" },
            ],
            [
              "opponent-placed-3rd",
              { tie: "user", who: "opponent", includes: "you have placed 3rd" },
            ],
            [
              "opponent-placed-4th",
              { tie: "user", who: "opponent", includes: "you have placed 4th" },
            ],
            [
              "opponent-asked-reschedule",
              {
                tie: "user",
                who: "opponent",
                includes: "asked to move your ladder match",
              },
            ],
            [
              "companion-winner-placed-1st",
              {
                tie: "companion",
                who: "winner",
                includes: "you have placed 1st",
              },
            ],
            [
              "companion-loser-placed-2nd",
              {
                tie: "companion",
                who: "loser",
                includes: "you have placed 2nd",
              },
            ],
            [
              "companion-winner-placed-3rd",
              {
                tie: "companion",
                who: "winner",
                includes: "you have placed 3rd",
              },
            ],
            [
              "companion-loser-placed-4th",
              {
                tie: "companion",
                who: "loser",
                includes: "you have placed 4th",
              },
            ],
            [
              "opponent-offered-play-here",
              {
                tie: "user",
                who: "opponent",
                includes: "wants to play match 2 now",
              },
            ],
          ] as const
        ).map(([key, expected]) => ({
          id: `maestro-assert-po${suffix}-${key}`,
          label: `Assert PO${suffix} ${key}`,
          run: () =>
            assertPlayoffNotification({
              testUser: currentUser,
              ladderId,
              ...expected,
            }),
        })),
        ...PLAYOFF_NOTIFICATION_KINDS.map((kind) => ({
          id: `maestro-mock-po${suffix}-notify-${kind}`,
          label: `Mock PO Notify ${kind}${suffix}`,
          run: () =>
            mockPlayoffNotification({ testUser: currentUser, ladderId, kind }),
        })),
        {
          id: `maestro-mock-po${suffix}-opponent-chat`,
          label: `Mock Opp Tie Chat${suffix}`,
          run: () =>
            mockOpponentTieChat({
              testUser: currentUser,
              ladderId,
              text: "See you at the court",
            }),
        },
        {
          id: `maestro-assert-po${suffix}-tie-chat-delivered`,
          label: `Assert Tie Chat Delivered${suffix}`,
          run: () =>
            assertTieChatDelivered({
              testUser: currentUser,
              ladderId,
              text: "On my way, bringing the shuttles",
            }),
        },
        ...(["accept", "decline"] as const).map((reply) => ({
          id: `maestro-mock-po${suffix}-cancel-${reply}`,
          label: `Mock Opp Cancel ${reply}${suffix}`,
          run: () =>
            mockOpponentCancellationResponse({
              ladderId,
              matchId: "r1-s1-leg2",
              accept: reply === "accept",
            }),
        })),
        {
          id: `maestro-assert-po${suffix}-ladder-completed`,
          label: `Assert Ladder Completed${suffix}`,
          run: () => assertLadderCompleted({ ladderId }),
        },
        {
          id: `maestro-mock-po${suffix}-finish-companion-tie`,
          label: `Mock Finish Companion Tie${suffix}`,
          run: () =>
            mockFinishCompanionTie({ testUser: currentUser, ladderId }),
        },
      ])
      .map(({ id, label, run }) => (
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
  </>
);

const HarnessButtons = memo(({ currentUser }: { currentUser: UserProfile }) => (
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

    {PRO_LEVEL_SEED_LEVELS.map((level) => (
      <HarnessButton
        key={`prolevel-${level}`}
        testID={`maestro-seed-prolevel-${level}`}
        onPress={async () => {
          try {
            const outcome = await seedProLevel({ testUser: currentUser, level });
            Alert.alert("Seeded", JSON.stringify(outcome));
          } catch (error) {
            Alert.alert("Seed failed", String(error));
          }
        }}
      >
        <Text style={{ color: "white" }}>Seed PROLevel {level}</Text>
      </HarnessButton>
    ))}

    <PlayoffVariantButtons
      currentUser={currentUser}
      variants={PLAYOFF_LADDER_VARIANTS.filter(({ doubles }) => !doubles)}
    />

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
      ...Object.values(PLAYOFF_MATCH_STAGE).map((stage) => ({
        id: `maestro-seed-playoff-match-${stage}`,
        label: `Seed Playoff Match (${stage})`,
        run: () => seedLadderPlayoffMatches({ testUser: currentUser, stage }),
      })),
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
      ...[6, 4].map((days) => ({
        id: `maestro-seed-add-game-flow-playoffs-in-${days}-days`,
        label: `Seed Add-Game Flow (Playoffs in ${days} days)`,
        run: () =>
          seedAddApproveGameFlow({
            testUser: currentUser,
            withReportedGame: true,
            playoffStartsInDays: days,
          }),
      })),
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
        ["paid", JOIN_VARIANT.PAID],
      ].map(([key, variant]) => ({
        id: `maestro-seed-join-singles-${key}`,
        label: `Seed Join Singles (${key})`,
        run: () =>
          seedLadderJoinFlowSingles({ testUser: currentUser, variant }),
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
        run: () =>
          seedLadderJoinFlowDoubles({ testUser: currentUser, variant }),
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
        [
          "accepted-requested-by-user",
          DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_USER,
        ],
        [
          "accepted-requested-by-opponent",
          DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_OPPONENT,
        ],
        [
          "accepted-requested-by-partner",
          DISBAND_VARIANT.ACCEPTED_REQUESTED_BY_PARTNER,
        ],
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
        ["accepted-opponent-posted", CANCEL_VARIANT.ACCEPTED_OPPONENT_POSTED],
        ["overdue-opponent-posted", CANCEL_VARIANT.OVERDUE_OPPONENT_POSTED],
        ["overdue-user-posted", CANCEL_VARIANT.OVERDUE_USER_POSTED],
        ["overdue-opponent-arrived", CANCEL_VARIANT.OVERDUE_OPPONENT_ARRIVED],
        [
          "started-recently-opponent-posted",
          CANCEL_VARIANT.STARTED_RECENTLY_OPPONENT_POSTED,
        ],
      ].map(([key, variant]) => ({
        id: `maestro-seed-cancel-${key}`,
        label: `Seed Cancel (${key})`,
        run: () =>
          seedMatchCancellationFlow({ testUser: currentUser, variant }),
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
          [
            "team",
            {
              targetType: "team",
              targetUserIds: [MAESTRO_DISBAND_OPP1_ID, MAESTRO_DISBAND_OPP2_ID],
            },
          ],
          [
            "player",
            { targetType: "player", targetUserIds: [MAESTRO_DISBAND_OPP1_ID] },
          ],
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
        id: "maestro-mock-checkin-opponent-scans-user-delayed",
        label: "Mock Opp Scans User (20s)",
        run: async () => {
          setTimeout(() => {
            void mockOpponentCheckIn({
              ladderId: MAESTRO_CANCEL_LADDER_ID,
              matchId: MAESTRO_CANCEL_MATCH_ID,
              userIds: [MAESTRO_CANCEL_OPPONENT_ID, currentUser.userId],
            });
          }, 20000);
          return { scheduledInSeconds: 20 };
        },
      },
      {
        id: "maestro-mock-checkin-poster-checks-in-delayed",
        label: "Mock Poster Checks In (60s)",
        run: async () => {
          setTimeout(() => {
            void mockOpponentCheckIn({
              ladderId: MAESTRO_CANCEL_LADDER_ID,
              matchId: MAESTRO_CANCEL_MATCH_ID,
              userIds: [MAESTRO_CANCEL_OPPONENT_ID],
            });
          }, 60000);
          return { scheduledInSeconds: 60 };
        },
      },
      ...[
        ["typed", CHAT_VARIANT.TYPED],
        ["legacy", CHAT_VARIANT.LEGACY],
        ["empty", CHAT_VARIANT.EMPTY],
      ].map(([key, variant]) => ({
        id: `maestro-seed-chats-${key}`,
        label: `Seed Chats (${key})`,
        run: () => seedChatsTab({ testUser: currentUser, variant }),
      })),
      {
        id: "maestro-assert-no-show-filed",
        label: "Assert No-Show Filed",
        run: () =>
          assertReportFiled({
            matchId: MAESTRO_CANCEL_MATCH_ID,
            reason: "no_show",
            reportedBy: currentUser.userId,
            targetUserIds: [MAESTRO_CANCEL_OPPONENT_ID],
          }),
      },
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

    <PlayoffVariantButtons
      currentUser={currentUser}
      variants={PLAYOFF_LADDER_VARIANTS.filter(({ doubles }) => doubles)}
    />
  </View>
));
HarnessButtons.displayName = "HarnessButtons";

const MaestroHarness = ({ currentUser }: { currentUser: UserProfile }) => {
  const [taps, setTaps] = useState(0);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChangeFilter = (text: string) => {
    setDraft(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setFilter(text), 500);
  };

  return (
    <>
      <Pressable
        testID="maestro-harness-unlock"
        accessibilityLabel="maestro-harness-unlock"
        style={{ height: 24 }}
        onPress={() => setTaps((count) => count + 1)}
      />
      {taps >= UNLOCK_TAPS ? (
        <HarnessFilterContext.Provider value={filter}>
          <TextInput
            testID="maestro-harness-filter"
            accessibilityLabel="maestro-harness-filter"
            value={draft}
            onChangeText={onChangeFilter}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="filter"
            placeholderTextColor="#888"
            style={{ color: "white", fontSize: 12, height: 28, padding: 2 }}
          />
          <RNText
            testID="maestro-harness-filter-applied"
            accessibilityLabel={filter}
            style={{ color: "#888", fontSize: 8 }}
          >
            {filter}
          </RNText>
          <HarnessButtons currentUser={currentUser} />
        </HarnessFilterContext.Provider>
      ) : null}
    </>
  );
};

export default MaestroHarness;
