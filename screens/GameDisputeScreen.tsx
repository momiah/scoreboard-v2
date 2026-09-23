import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  ScrollView,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import styled from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";

import {
  LADDER_TYPE,
  COMPETITION_TYPES,
  notificationSchema,
  notificationTypes,
} from "@shared";
import {
  DISPUTE_STAGE,
  DISPUTE_STAGE_LABELS,
  DISPUTE_RESOLUTION,
  hasCourtPositions,
} from "@shared/types";
import type {
  Dispute,
  DisputeEvidence,
  DisputeStage,
  Game,
  GameTeam,
  GameVideo,
  LadderType,
  Player,
  SelectedPlayers,
  Teams,
} from "@shared/types";

import { UserContext } from "../context/UserContext";
import { PopupContext } from "../context/PopupContext";
import { usePendingUpload } from "../hooks/usePendingUpload";
import { TeamColumn, ScoreDisplay } from "../components/scoreboard/ScoreboardAtoms";
import AddTournamentGameModal from "../components/Modals/AddTournamentGameModal";
import CourtPositionModal from "../components/Modals/CourtPositionModal";
import VideoUploadModal from "../components/Modals/VideoUploadModal";
import ActionPlaceholder from "../components/ActionPlaceholder";
import { formatDisplayName } from "../helpers/formatDisplayName";
import {
  createDispute,
  fetchDisputeById,
  addDisputeEvidence,
} from "../services/disputes";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type GameDisputeParams = {
  GameDisputeScreen: {
    disputeId?: string;
    ladderId: string;
    ladderName?: string;
    ladderType?: LadderType;
    matchId?: string;
    gameId?: string;
    /** The original (disputed) game, passed from the reject flow. */
    game?: Game;
    participantIds?: string[];
    matchDate?: string;
    matchTime?: string;
    courtName?: string;
  };
};

const shellFrom = (game: Game): Game => ({
  ...game,
  gamescore: "",
  result: null,
  team1: { ...game.team1, score: null },
  team2: { ...game.team2, score: null },
});

const playersOf = (game: Game): Player[] =>
  [
    game.team1?.player1,
    game.team1?.player2,
    game.team2?.player1,
    game.team2?.player2,
  ].filter((p): p is Player => Boolean(p));

const teamsOf = (game: Game): Teams => ({
  team1: {
    player1: game.team1?.player1 as Player,
    ...(game.team1?.player2 && { player2: game.team1.player2 }),
  },
  team2: {
    player1: game.team2?.player1 as Player,
    ...(game.team2?.player2 && { player2: game.team2.player2 }),
  },
});

// CourtPositionModal is built around a GameVideo; a dispute captures the
// positions on its own doc, so hand the modal a minimal stand-in.
const courtPositionVideo = (
  game: Game,
  positions: SelectedPlayers | null,
): GameVideo =>
  ({
    teams: teamsOf(game),
    courtPositions: positions ?? undefined,
  }) as unknown as GameVideo;

const teamWithNames = (team?: GameTeam | null) => ({
  player1: team?.player1
    ? {
        ...team.player1,
        displayName: team.player1.displayName || formatDisplayName(team.player1),
      }
    : null,
  player2: team?.player2
    ? {
        ...team.player2,
        displayName: team.player2.displayName || formatDisplayName(team.player2),
      }
    : null,
});

// The same spacious score card GameScreen uses (ScoreboardAtoms). The dispute
// screen shows results for context, so the "Pending Approval" pill is
// suppressed; pass onPress to make the card tappable (to enter corrected scores).
const DisputeScoreCard = ({
  game,
  leagueType,
  onPress,
}: {
  game: Game;
  leagueType: string;
  onPress?: () => void;
}) => {
  const item = { ...game, approvalStatus: "" };
  const card = (
    <ScoreCard>
      <TeamColumn
        team="left"
        players={teamWithNames(game.team1)}
        leagueType={leagueType}
      />
      <ScoreDisplay
        date={game.date || ""}
        team1={game.team1?.score ?? "-"}
        team2={game.team2?.score ?? "-"}
        item={item}
      />
      <TeamColumn
        team="right"
        players={teamWithNames(game.team2)}
        leagueType={leagueType}
      />
    </ScoreCard>
  );
  return onPress ? (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      {card}
    </TouchableOpacity>
  ) : (
    card
  );
};

const GameDisputeScreen = () => {
  const route = useRoute<RouteProp<GameDisputeParams, "GameDisputeScreen">>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { currentUser, sendNotification } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);

  const {
    disputeId: routeDisputeId,
    ladderId,
    ladderName,
    ladderType,
    matchId,
    gameId,
    game: routeGame,
    participantIds = [],
    matchDate,
    matchTime,
    courtName,
  } = route.params;

  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [loading, setLoading] = useState(Boolean(routeDisputeId));

  // Compose state (before the dispute exists).
  const [correctedGame, setCorrectedGame] = useState<Game | null>(null);
  const [notes, setNotes] = useState("");
  const [courtPositions, setCourtPositions] = useState<SelectedPlayers | null>(
    null,
  );
  const [entryVisible, setEntryVisible] = useState(false);
  const [courtVisible, setCourtVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // More-evidence state (view mode, when the admin asked for more).
  const [moreNotes, setMoreNotes] = useState("");
  const [moreCourtPositions, setMoreCourtPositions] =
    useState<SelectedPlayers | null>(null);
  const [moreCourtVisible, setMoreCourtVisible] = useState(false);
  const [moreUploadVisible, setMoreUploadVisible] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const { pendingUploads } = usePendingUpload(currentUser?.userId);

  const loadDispute = useCallback(async (id: string) => {
    setLoading(true);
    const loaded = await fetchDisputeById(id);
    setDispute(loaded);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (routeDisputeId) loadDispute(routeDisputeId);
  }, [routeDisputeId, loadDispute]);

  const originalGame = dispute?.originalGame ?? routeGame ?? null;
  const effectiveGameId = dispute?.gameId ?? gameId ?? originalGame?.gameId ?? "";
  const effectiveType = dispute?.ladderType ?? ladderType ?? LADDER_TYPE.SINGLES;
  const isComposing = !dispute;

  // A video attaches through the normal pipeline (VideoUploadModal → gameVideos),
  // so its presence is read off the in-flight upload for this game.
  const videoAttached = pendingUploads.some(
    (upload) => upload.gameId === effectiveGameId,
  );

  const canSubmit =
    !!correctedGame && !(videoAttached && !hasCourtPositions(courtPositions ?? undefined));

  const notifyParticipants = useCallback(
    async (disputeId: string, message: string) => {
      const recipients = (participantIds.length
        ? participantIds
        : dispute?.participantIds ?? []
      ).filter((id) => id && id !== currentUser?.userId);
      await Promise.all(
        recipients.map((recipientId) =>
          sendNotification({
            ...notificationSchema,
            createdAt: new Date(),
            recipientId,
            senderId: currentUser?.userId,
            message,
            type: notificationTypes.INFORMATION.LADDER_DISPUTE.TYPE,
            data: { disputeId, ladderId },
          }),
        ),
      );
    },
    [participantIds, dispute, currentUser, sendNotification, ladderId],
  );

  const handleSubmit = useCallback(async () => {
    if (!currentUser?.userId || !originalGame || !correctedGame || !matchId) {
      return;
    }
    setSubmitting(true);
    const evidence: DisputeEvidence = {
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      ...(courtPositions ? { courtPositions } : {}),
      submittedBy: currentUser.userId,
      submittedAt: new Date(),
    };
    const outcome = await createDispute({
      ladderId,
      ladderName,
      ladderType: effectiveType,
      ladderMatchId: matchId,
      gameId: effectiveGameId,
      originalGame,
      disputedGame: correctedGame,
      openedBy: currentUser.userId,
      participantIds,
      evidence,
      matchDate,
      matchTime,
      courtName,
    });
    setSubmitting(false);

    if (!outcome.success) {
      showBottomToast(
        outcome.reason === "exists"
          ? "This game is already under dispute."
          : "Could not open the dispute. Please try again.",
        "error",
      );
      return;
    }

    await notifyParticipants(
      outcome.disputeId!,
      `${formatDisplayName(currentUser)} disputed a game in ${
        ladderName ?? "the ladder"
      }`,
    );
    showBottomToast("Dispute submitted for review", "success");
    await loadDispute(outcome.disputeId!);
  }, [
    currentUser,
    originalGame,
    correctedGame,
    matchId,
    notes,
    courtPositions,
    ladderId,
    ladderName,
    effectiveType,
    effectiveGameId,
    participantIds,
    matchDate,
    matchTime,
    courtName,
    notifyParticipants,
    showBottomToast,
    loadDispute,
  ]);

  const handleSubmitMoreEvidence = useCallback(async () => {
    if (!dispute || !currentUser?.userId) return;
    if (videoAttached && !hasCourtPositions(moreCourtPositions ?? undefined)) {
      showBottomToast("Add court positions for the uploaded video", "error");
      return;
    }
    setSubmitting(true);
    const evidence: DisputeEvidence = {
      ...(moreNotes.trim() ? { notes: moreNotes.trim() } : {}),
      ...(moreCourtPositions ? { courtPositions: moreCourtPositions } : {}),
      submittedBy: currentUser.userId,
      submittedAt: new Date(),
    };
    const ok = await addDisputeEvidence(dispute.disputeId, evidence);
    setSubmitting(false);
    if (!ok) {
      showBottomToast("Could not submit evidence. Please try again.", "error");
      return;
    }
    setMoreNotes("");
    setMoreCourtPositions(null);
    showBottomToast("Evidence submitted", "success");
    await loadDispute(dispute.disputeId);
  }, [
    dispute,
    currentUser,
    videoAttached,
    moreNotes,
    moreCourtPositions,
    showBottomToast,
    loadDispute,
  ]);

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const finalGame = dispute?.finalGame ?? dispute?.disputedGame ?? null;

  if (loading) {
    return (
      <Screen>
        <Centered>
          <ActivityIndicator size="large" color="#00A2FF" />
        </Centered>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header>
        <BackButton onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </BackButton>
        <HeaderTitle>Game Dispute</HeaderTitle>
      </Header>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        {originalGame && (
          <Block>
            <BlockTitle>Original result</BlockTitle>
            <DisputeScoreCard game={originalGame} leagueType={effectiveType} />
          </Block>
        )}

        <Block>
          <BlockTitle>
            {isComposing ? "Corrected result" : "Disputed result"}
          </BlockTitle>
          {isComposing ? (
            correctedGame ? (
              <DisputeScoreCard
                game={correctedGame}
                leagueType={effectiveType}
                onPress={() => setEntryVisible(true)}
              />
            ) : originalGame ? (
              <DisputeScoreCard
                game={shellFrom(originalGame)}
                leagueType={effectiveType}
                onPress={() => setEntryVisible(true)}
              />
            ) : null
          ) : finalGame ? (
            <DisputeScoreCard game={finalGame} leagueType={effectiveType} />
          ) : null}
        </Block>

        {isComposing && (
          <>
            <Block>
              <BlockTitle>Video evidence (optional)</BlockTitle>
              {videoAttached ? (
                <EvidenceRow>
                  <Ionicons name="videocam" size={18} color="#00A2FF" />
                  <EvidenceText>Video uploading…</EvidenceText>
                </EvidenceRow>
              ) : (
                <ActionPlaceholder
                  message="Upload video evidence"
                  icon="videocam-outline"
                  onPress={() => setUploadVisible(true)}
                />
              )}
              <NotesLabel>Notes to admin</NotesLabel>
              <NotesInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Explain what the correct result should be…"
                placeholderTextColor="#5b7186"
                multiline
              />
            </Block>

            <Block>
              <BlockTitle>Court positions</BlockTitle>
              <SecondaryButton onPress={() => setCourtVisible(true)}>
                <Ionicons name="grid-outline" size={16} color="#00A2FF" />
                <SecondaryText>
                  {hasCourtPositions(courtPositions ?? undefined)
                    ? "Edit court positions"
                    : "Add court positions"}
                </SecondaryText>
              </SecondaryButton>
              {videoAttached && !hasCourtPositions(courtPositions ?? undefined) && (
                <HintText>
                  Court positions are required when a video is attached.
                </HintText>
              )}
            </Block>

            <SubmitButton
              disabled={!canSubmit || submitting}
              onPress={handleSubmit}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <SubmitText>Submit dispute</SubmitText>
              )}
            </SubmitButton>
          </>
        )}

        {dispute && (
          <Block>
            <BlockTitle>Dispute progress</BlockTitle>
            {dispute.events.map((event, index) => (
              <AccordionCard key={`${event.stage}-${index}`}>
                <AccordionHeader activeOpacity={0.8} onPress={() => toggle(index)}>
                  <StageDot stage={event.stage} />
                  <AccordionTitle>
                    {DISPUTE_STAGE_LABELS[event.stage]}
                  </AccordionTitle>
                  <Ionicons
                    name={expanded[index] ? "chevron-up" : "chevron-down"}
                    size={18}
                    color="#9fb8c8"
                  />
                </AccordionHeader>
                {expanded[index] && (
                  <AccordionBody>
                    <StageDetail
                      dispute={dispute}
                      stage={event.stage}
                      note={event.note}
                      finalGame={finalGame}
                      effectiveType={effectiveType}
                    />
                    {event.stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED &&
                      dispute.stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED &&
                      currentUser?.userId === dispute.openedBy && (
                        <MoreEvidence>
                          {videoAttached ? (
                            <EvidenceRow>
                              <Ionicons name="videocam" size={18} color="#00A2FF" />
                              <EvidenceText>Video uploading…</EvidenceText>
                            </EvidenceRow>
                          ) : (
                            <ActionPlaceholder
                              message="Upload video evidence"
                              icon="videocam-outline"
                              onPress={() => setMoreUploadVisible(true)}
                            />
                          )}
                          <SecondaryButton
                            onPress={() => setMoreCourtVisible(true)}
                          >
                            <Ionicons
                              name="grid-outline"
                              size={16}
                              color="#00A2FF"
                            />
                            <SecondaryText>
                              {hasCourtPositions(moreCourtPositions ?? undefined)
                                ? "Edit court positions"
                                : "Add court positions"}
                            </SecondaryText>
                          </SecondaryButton>
                          <NotesLabel>Notes to admin</NotesLabel>
                          <NotesInput
                            value={moreNotes}
                            onChangeText={setMoreNotes}
                            placeholder="Add anything else the admin asked for…"
                            placeholderTextColor="#5b7186"
                            multiline
                          />
                          <SubmitButton
                            disabled={submitting}
                            onPress={handleSubmitMoreEvidence}
                          >
                            {submitting ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <SubmitText>Submit evidence</SubmitText>
                            )}
                          </SubmitButton>
                        </MoreEvidence>
                      )}
                  </AccordionBody>
                )}
              </AccordionCard>
            ))}
          </Block>
        )}
      </ScrollView>

      {originalGame && (
        <AddTournamentGameModal
          visible={entryVisible}
          game={shellFrom(originalGame)}
          tournamentType={effectiveType}
          onClose={() => setEntryVisible(false)}
          currentUser={currentUser ?? null}
          tournamentName={ladderName ?? "Ladder match"}
          tournamentId=""
          onCapture={(captured) => setCorrectedGame(captured)}
        />
      )}

      {originalGame && uploadVisible && currentUser && (
        <VideoUploadModal
          visible={uploadVisible}
          onClose={() => setUploadVisible(false)}
          gameId={effectiveGameId}
          competitionId={ladderId}
          competitionName={ladderName ?? "Ladder match"}
          competitionType={COMPETITION_TYPES.LADDER}
          matchId={matchId}
          gamescore={originalGame.gamescore ?? ""}
          date={originalGame.date ?? ""}
          teams={teamsOf(originalGame)}
          currentUser={currentUser}
          title="Upload dispute evidence"
          subtitle="Upload the full game video so an admin can review the disputed result."
          icon="videocam-outline"
          showAddLaterHint={false}
        />
      )}

      {originalGame && moreUploadVisible && currentUser && (
        <VideoUploadModal
          visible={moreUploadVisible}
          onClose={() => setMoreUploadVisible(false)}
          gameId={effectiveGameId}
          competitionId={ladderId}
          competitionName={ladderName ?? "Ladder match"}
          competitionType={COMPETITION_TYPES.LADDER}
          matchId={matchId}
          gamescore={originalGame.gamescore ?? ""}
          date={originalGame.date ?? ""}
          teams={teamsOf(originalGame)}
          currentUser={currentUser}
          title="Upload dispute evidence"
          subtitle="Upload the full game video so an admin can review the disputed result."
          icon="videocam-outline"
          showAddLaterHint={false}
        />
      )}

      {originalGame && courtVisible && (
        <CourtPositionModal
          visible={courtVisible}
          onClose={() => setCourtVisible(false)}
          video={courtPositionVideo(originalGame, courtPositions)}
          isUploader
          playerArray={playersOf(originalGame)}
          onSave={async (positions) => {
            setCourtPositions(positions);
          }}
        />
      )}

      {originalGame && moreCourtVisible && (
        <CourtPositionModal
          visible={moreCourtVisible}
          onClose={() => setMoreCourtVisible(false)}
          video={courtPositionVideo(originalGame, moreCourtPositions)}
          isUploader
          playerArray={playersOf(originalGame)}
          onSave={async (positions) => {
            setMoreCourtPositions(positions);
          }}
        />
      )}
    </Screen>
  );
};

const StageDetail = ({
  dispute,
  stage,
  note,
  finalGame,
  effectiveType,
}: {
  dispute: Dispute;
  stage: DisputeStage;
  note?: string;
  finalGame: Game | null;
  effectiveType: LadderType;
}) => {
  if (stage === DISPUTE_STAGE.RESOLVED) {
    const upheld = dispute.resolution === DISPUTE_RESOLUTION.UPHELD;
    return (
      <>
        <DetailText>
          {upheld
            ? "The disputed result was upheld and applied."
            : "The original result stands."}
        </DetailText>
        {finalGame && (
          <DisputeScoreCard game={finalGame} leagueType={effectiveType} />
        )}
        {dispute.adminNotes ? (
          <DetailText>Admin notes: {dispute.adminNotes}</DetailText>
        ) : null}
      </>
    );
  }
  if (stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED) {
    return (
      <DetailText>
        {note || "The admin has requested more evidence for this dispute."}
      </DetailText>
    );
  }
  return (
    <DetailText>
      {note || "Your dispute is under review by an admin."}
    </DetailText>
  );
};

const Screen = styled(SafeAreaView)({
  flex: 1,
  backgroundColor: "#020D18",
});

const Centered = styled.View({
  flex: 1,
  justifyContent: "center",
  alignItems: "center",
});

const Header = styled.View({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
  paddingVertical: 12,
  gap: 8,
});

const BackButton = styled.TouchableOpacity({ padding: 4 });

const HeaderTitle = styled.Text({
  color: "#fff",
  fontSize: 18,
  fontWeight: "bold",
});

const Block = styled.View({ marginBottom: 20 });

const ScoreCard = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#001123",
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  borderRadius: 12,
  paddingVertical: 16,
  paddingHorizontal: 12,
});

const BlockTitle = styled.Text({
  color: "#9fb8c8",
  fontSize: 13,
  fontWeight: "bold",
  textTransform: "uppercase",
  marginBottom: 10,
});

const EvidenceRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  backgroundColor: "#001123",
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  padding: 12,
});

const EvidenceText = styled.Text({ color: "#fff", fontSize: 14, flex: 1 });

const NotesLabel = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
  marginTop: 12,
  marginBottom: 6,
});

const NotesInput = styled.TextInput({
  backgroundColor: "#001123",
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  color: "#fff",
  padding: 12,
  minHeight: 72,
  textAlignVertical: "top",
});

const SecondaryButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderWidth: 1,
  borderColor: "#00A2FF",
  borderRadius: 8,
  paddingVertical: 12,
});

const SecondaryText = styled.Text({
  color: "#00A2FF",
  fontWeight: "bold",
  fontSize: 14,
});

const HintText = styled.Text({
  color: "#ffb86b",
  fontSize: 12,
  marginTop: 8,
});

const SubmitButton = styled.TouchableOpacity<{ disabled?: boolean }>(
  ({ disabled }: { disabled?: boolean }) => ({
    backgroundColor: disabled ? "#20364a" : "#00A2FF",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
    opacity: disabled ? 0.7 : 1,
  }),
);

const SubmitText = styled.Text({ color: "#fff", fontWeight: "bold", fontSize: 15 });

const AccordionCard = styled.View({
  backgroundColor: "#001123",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  marginBottom: 10,
  overflow: "hidden",
});

const AccordionHeader = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  padding: 14,
});

const AccordionTitle = styled.Text({
  color: "#fff",
  fontSize: 14,
  fontWeight: "bold",
  flex: 1,
});

const StageDot = styled.View<{ stage: DisputeStage }>(
  ({ stage }: { stage: DisputeStage }) => ({
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor:
      stage === DISPUTE_STAGE.RESOLVED
        ? "#3ddc84"
        : stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED
          ? "#ffb86b"
          : "#00A2FF",
  }),
);

const AccordionBody = styled.View({
  paddingHorizontal: 14,
  paddingBottom: 14,
  gap: 10,
});

const DetailText = styled.Text({ color: "#c7d6e5", fontSize: 13, lineHeight: 19 });

const MoreEvidence = styled.View({ gap: 10, marginTop: 4 });

export default GameDisputeScreen;
