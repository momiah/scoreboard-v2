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
import moment from "moment";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
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
import {
  TeamColumn,
  ScoreDisplay,
} from "../components/scoreboard/ScoreboardAtoms";
import AddTournamentGameModal from "../components/Modals/AddTournamentGameModal";
import CourtPositionModal from "../components/Modals/CourtPositionModal";
import VideoUploadModal from "../components/Modals/VideoUploadModal";
import ActionPlaceholder from "../components/ActionPlaceholder";
import { formatDisplayName } from "../helpers/formatDisplayName";
import {
  createDispute,
  fetchDisputeById,
  fetchDisputeGameVideos,
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
  approvalStatus: "",
  team1: { ...game.team1, score: null },
  team2: { ...game.team2, score: null },
});

const formatEventDate = (value: unknown): string => {
  const date =
    value && typeof (value as { toDate?: () => Date }).toDate === "function"
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? "" : moment(date).format("D MMM, h:mma");
};

const uploaderName = (video: GameVideo): string => {
  const by = video.postedBy;
  if (!by) return "Unknown";
  return (
    by.username?.trim() ||
    `${by.firstName ?? ""} ${by.lastName ?? ""}`.trim() ||
    "Unknown"
  );
};

const DisputeVideoPlayer = ({ url }: { url: string }) => {
  const player = useVideoPlayer(url);
  return <DisputeVideo player={player} nativeControls contentFit="contain" />;
};

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
        displayName:
          team.player1.displayName || formatDisplayName(team.player1),
      }
    : null,
  player2: team?.player2
    ? {
        ...team.player2,
        displayName:
          team.player2.displayName || formatDisplayName(team.player2),
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
        team1={game.team1?.score ?? ""}
        team2={game.team2?.score ?? ""}
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
  const [videos, setVideos] = useState<GameVideo[]>([]);
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
    if (loaded) setVideos(await fetchDisputeGameVideos(loaded.gameId));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (routeDisputeId) loadDispute(routeDisputeId);
  }, [routeDisputeId, loadDispute]);

  const originalGame = dispute?.originalGame ?? routeGame ?? null;
  const effectiveGameId =
    dispute?.gameId ?? gameId ?? originalGame?.gameId ?? "";
  const effectiveType =
    dispute?.ladderType ?? ladderType ?? LADDER_TYPE.SINGLES;
  const isComposing = !dispute;
  const isResolved = dispute?.stage === DISPUTE_STAGE.RESOLVED;

  // The disputing side is the game team the opener plays on — either of its
  // players (doubles) may add evidence, not just the opener.
  const opener = dispute?.openedBy ?? currentUser?.userId;
  const teamIdsOf = (game: Game | null, side: "team1" | "team2"): string[] =>
    [game?.[side]?.player1?.userId, game?.[side]?.player2?.userId].filter(
      (id): id is string => Boolean(id),
    );
  const team1Ids = teamIdsOf(originalGame, "team1");
  const team2Ids = teamIdsOf(originalGame, "team2");
  const disputingTeamIds = opener && team1Ids.includes(opener)
    ? team1Ids
    : opener && team2Ids.includes(opener)
      ? team2Ids
      : [];
  const canContribute =
    !!currentUser?.userId && disputingTeamIds.includes(currentUser.userId);

  // A video attaches through the normal pipeline (VideoUploadModal → gameVideos),
  // so its presence is read off the in-flight upload for this game.
  const videoAttached = pendingUploads.some(
    (upload) => upload.gameId === effectiveGameId,
  );

  const canSubmit =
    !!correctedGame &&
    !(videoAttached && !hasCourtPositions(courtPositions ?? undefined));

  // Require at least one piece of evidence before a more-evidence submission,
  // and court positions whenever a video is attached.
  const hasMoreEvidence =
    videoAttached ||
    moreNotes.trim().length > 0 ||
    hasCourtPositions(moreCourtPositions ?? undefined);
  const canSubmitMore =
    hasMoreEvidence &&
    !(videoAttached && !hasCourtPositions(moreCourtPositions ?? undefined));

  const notifyParticipants = useCallback(
    async (disputeId: string, message: string) => {
      const recipients = (
        participantIds.length ? participantIds : (dispute?.participantIds ?? [])
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
              {videoAttached &&
                !hasCourtPositions(courtPositions ?? undefined) && (
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
            <TimelineHeader>Dispute progress</TimelineHeader>
            {dispute.events.map((event, index) => {
              const isFirst = index === 0;
              const isLast = index === dispute.events.length - 1;
              const state = isLast ? "active" : "completed";
              const open = expanded[index];
              return (
                <TimelineRow key={`${event.stage}-${index}`}>
                  <Gutter>
                    {!isFirst && <LineTop />}
                    {!isLast && <LineBottom />}
                    <Dot state={state} />
                  </Gutter>
                  <TimelineContent last={isLast}>
                    <StageHeader activeOpacity={0.8} onPress={() => toggle(index)}>
                      <StageLabel>{DISPUTE_STAGE_LABELS[event.stage]}</StageLabel>
                      <Ionicons
                        name={open ? "chevron-up" : "chevron-down"}
                        size={18}
                        color="#9fb8c8"
                      />
                    </StageHeader>
                    <StageWhen>{formatEventDate(event.createdAt)}</StageWhen>
                    {open && (
                      <StageBody>
                        <StageDetail
                          dispute={dispute}
                          stage={event.stage}
                          note={event.note}
                          finalGame={finalGame}
                          effectiveType={effectiveType}
                        />
                      </StageBody>
                    )}
                  </TimelineContent>
                </TimelineRow>
              );
            })}

            {expanded[dispute.events.length - 1] &&
              videos.some((v) => v.videoUrl) && (
                <VideoEvidence>
                  <AddEvidenceTitle>Video evidence</AddEvidenceTitle>
                  {videos
                    .filter((video) => video.videoUrl)
                    .map((video, i) => (
                      <VideoItem key={i}>
                        <Uploader>Uploaded by {uploaderName(video)}</Uploader>
                        <DisputeVideoPlayer url={video.videoUrl} />
                      </VideoItem>
                    ))}
                </VideoEvidence>
              )}

            {!isResolved &&
              canContribute &&
              expanded[dispute.events.length - 1] && (
                <AddEvidenceCard>
                  <AddEvidenceTitle>
                    {dispute.stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED
                      ? "The admin has requested more evidence"
                      : "Add evidence"}
                  </AddEvidenceTitle>
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
                  <SecondaryButton onPress={() => setMoreCourtVisible(true)}>
                    <Ionicons name="grid-outline" size={16} color="#00A2FF" />
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
                    placeholder="Add anything else the admin should see…"
                    placeholderTextColor="#5b7186"
                    multiline
                  />
                  <SubmitButton
                    disabled={!canSubmitMore || submitting}
                    onPress={handleSubmitMoreEvidence}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <SubmitText>Submit evidence</SubmitText>
                    )}
                  </SubmitButton>
                </AddEvidenceCard>
              )}
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
          validateScores={(team1Score, team2Score) =>
            originalGame &&
            team1Score === originalGame.team1?.score &&
            team2Score === originalGame.team2?.score
              ? "The corrected score must differ from the original."
              : null
          }
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

const SubmitText = styled.Text({
  color: "#fff",
  fontWeight: "bold",
  fontSize: 15,
});

const GUTTER_WIDTH = 24;
const DOT_SIZE = 14;
const DOT_TOP = 6;
const DOT_CENTER_Y = DOT_TOP + DOT_SIZE / 2;
const LINE_LEFT = GUTTER_WIDTH / 2 - 1;
const LINE_FILLED = "#D4AF37";

const TimelineHeader = styled.Text({
  color: "#6b8199",
  fontSize: 12,
  fontWeight: "600",
  letterSpacing: 1.5,
  textTransform: "uppercase",
  marginBottom: 18,
});

const TimelineRow = styled.View({ flexDirection: "row" });

const Gutter = styled.View({ width: GUTTER_WIDTH, position: "relative" });

const LineTop = styled.View({
  position: "absolute",
  top: 0,
  left: LINE_LEFT,
  width: 2,
  height: DOT_CENTER_Y,
  backgroundColor: LINE_FILLED,
});

const LineBottom = styled.View({
  position: "absolute",
  top: DOT_CENTER_Y,
  bottom: 0,
  left: LINE_LEFT,
  width: 2,
  backgroundColor: LINE_FILLED,
});

const Dot = styled.View<{ state: "active" | "completed" }>(
  ({ state }: { state: "active" | "completed" }) => ({
    position: "absolute",
    top: DOT_TOP,
    left: GUTTER_WIDTH / 2 - DOT_SIZE / 2,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    zIndex: 1,
    backgroundColor: state === "active" ? "#FFD700" : "#D4AF37",
    ...(state === "active"
      ? {
          shadowColor: "#ffb700ff",
          shadowOpacity: 0.9,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
          elevation: 8,
        }
      : {}),
  }),
);

const TimelineContent = styled.View<{ last: boolean }>(
  ({ last }: { last: boolean }) => ({
    flex: 1,
    paddingLeft: 8,
    paddingBottom: last ? 0 : 24,
  }),
);

const StageHeader = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
});

const StageLabel = styled.Text({
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "bold",
  flex: 1,
});

const StageWhen = styled.Text({
  color: "#5f7d99",
  fontSize: 12,
  marginTop: 3,
});

const StageBody = styled.View({ marginTop: 8, gap: 10 });

const DetailText = styled.Text({
  color: "#c7d6e5",
  fontSize: 13,
  lineHeight: 19,
});

const AddEvidenceCard = styled.View({
  marginTop: 12,
  gap: 10,
  backgroundColor: "#001123",
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  borderRadius: 10,
  padding: 14,
});

const AddEvidenceTitle = styled.Text({
  color: "#fff",
  fontSize: 14,
  fontWeight: "bold",
});

const VideoEvidence = styled.View({
  marginTop: 12,
  gap: 12,
  backgroundColor: "#001123",
  borderWidth: 1,
  borderColor: "rgb(9, 33, 62)",
  borderRadius: 10,
  padding: 14,
});

const VideoItem = styled.View({ gap: 6 });

const Uploader = styled.Text({ color: "#9fb8c8", fontSize: 12 });

const DisputeVideo = styled(VideoView)({
  width: "100%",
  height: 200,
  borderRadius: 8,
  backgroundColor: "#000",
});

export default GameDisputeScreen;
