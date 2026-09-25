import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  DISPUTE_RESOLUTION,
  DISPUTE_EVENT_TYPE,
  DISPUTE_EVENT_LABELS,
  DISPUTE_EVIDENCE_BLOCKER_MESSAGES,
  DISPUTE_EVIDENCE_WINDOW_HOURS,
  DISPUTE_SYSTEM_ACTOR,
  gameVideoDocId,
  getDisputeEvidenceBlocker,
  hasCourtPositions,
} from "@shared/types";
import type {
  Dispute,
  DisputeEvent,
  DisputeEvidence,
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
  subscribeToDispute,
  subscribeToDisputeGameVideos,
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

type Role = "You" | "Teammate" | "Opponent" | "Admin";

const shellFrom = (game: Game): Game => ({
  ...game,
  gamescore: "",
  result: null,
  approvalStatus: "",
  team1: { ...game.team1, score: null },
  team2: { ...game.team2, score: null },
});

const toDate = (value: unknown): Date =>
  value && typeof (value as { toDate?: () => Date }).toDate === "function"
    ? (value as { toDate: () => Date }).toDate()
    : new Date(value as string | number | Date);

const formatEventDate = (value: unknown): string => {
  const date = toDate(value);
  return Number.isNaN(date.getTime())
    ? ""
    : moment(date).format("D MMM, h:mma");
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
  positions: SelectedPlayers | null | undefined,
): GameVideo =>
  ({
    teams: teamsOf(game),
    courtPositions: positions ?? undefined,
  }) as unknown as GameVideo;

const teamIdsOf = (game: Game | null, side: "team1" | "team2"): string[] =>
  [game?.[side]?.player1?.userId, game?.[side]?.player2?.userId].filter(
    (id): id is string => Boolean(id),
  );

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

interface EvidenceFormProps {
  title: string;
  subtitle?: string;
  videoAttached: boolean;
  onUploadVideo: () => void;
  courtPositions: SelectedPlayers | null;
  onEditCourtPositions: () => void;
  note: string;
  onChangeNote: (note: string) => void;
  notePlaceholder: string;
  submitLabel: string;
  submitting: boolean;
  onSubmit: () => void;
  /** Extra condition on top of the evidence rule (e.g. corrected score entered). */
  blockedMessage?: string | null;
}

const EvidenceForm = ({
  title,
  subtitle,
  videoAttached,
  onUploadVideo,
  courtPositions,
  onEditCourtPositions,
  note,
  onChangeNote,
  notePlaceholder,
  submitLabel,
  submitting,
  onSubmit,
  blockedMessage,
}: EvidenceFormProps) => {
  const blocker = getDisputeEvidenceBlocker({
    note,
    hasVideo: videoAttached,
    courtPositions,
  });
  const message =
    blockedMessage ??
    (blocker ? DISPUTE_EVIDENCE_BLOCKER_MESSAGES[blocker] : null);
  const positionsSet = hasCourtPositions(courtPositions);

  return (
    <AddEvidenceCard>
      <AddEvidenceTitle>{title}</AddEvidenceTitle>
      {subtitle ? <DetailText>{subtitle}</DetailText> : null}
      {videoAttached ? (
        <EvidenceRow>
          <Ionicons name="videocam" size={18} color="#00A2FF" />
          <EvidenceText>Video attached</EvidenceText>
          <Ionicons name="checkmark-circle" size={18} color="#2FD27A" />
        </EvidenceRow>
      ) : (
        <ActionPlaceholder
          message="Upload video evidence"
          icon="videocam-outline"
          onPress={onUploadVideo}
        />
      )}
      <SecondaryButton
        disabled={!videoAttached}
        muted={!videoAttached}
        onPress={onEditCourtPositions}
      >
        <Ionicons
          name="grid-outline"
          size={16}
          color={videoAttached ? "#00A2FF" : "#5b7186"}
        />
        <SecondaryText muted={!videoAttached}>
          {positionsSet ? "Edit court positions" : "Add court positions"}
        </SecondaryText>
      </SecondaryButton>
      {!videoAttached && (
        <MutedHint>Upload a video first to set court positions.</MutedHint>
      )}
      <NotesLabel>Notes to admin</NotesLabel>
      <NotesInput
        value={note}
        onChangeText={onChangeNote}
        placeholder={notePlaceholder}
        placeholderTextColor="#5b7186"
        multiline
      />
      <SubmitButton
        disabled={Boolean(message) || submitting}
        onPress={onSubmit}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <SubmitText>{submitLabel}</SubmitText>
        )}
      </SubmitButton>
      {message ? <HintText>{message}</HintText> : null}
    </AddEvidenceCard>
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

  const [disputeId, setDisputeId] = useState(routeDisputeId);
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [videos, setVideos] = useState<GameVideo[]>([]);
  const [loading, setLoading] = useState(Boolean(routeDisputeId));

  const [correctedGame, setCorrectedGame] = useState<Game | null>(null);
  const [note, setNote] = useState("");
  const [courtPositions, setCourtPositions] = useState<SelectedPlayers | null>(
    null,
  );
  const [videoAttached, setVideoAttached] = useState(false);
  const [entryVisible, setEntryVisible] = useState(false);
  const [courtVisible, setCourtVisible] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewingPositions, setViewingPositions] =
    useState<SelectedPlayers | null>(null);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const { pendingUploads } = usePendingUpload(currentUser?.userId);

  useEffect(() => {
    if (!disputeId) return;
    setLoading(true);
    return subscribeToDispute(disputeId, (next) => {
      setDispute(next);
      setLoading(false);
    });
  }, [disputeId]);

  const originalGame = dispute?.originalGame ?? routeGame ?? null;
  const effectiveGameId =
    dispute?.gameId ?? gameId ?? originalGame?.gameId ?? "";
  const effectiveType =
    dispute?.ladderType ?? ladderType ?? LADDER_TYPE.SINGLES;
  const isComposing = !dispute;
  const isResolved = dispute?.stage === DISPUTE_STAGE.RESOLVED;
  const userId = currentUser?.userId;

  useEffect(() => {
    if (!dispute?.gameId) return;
    return subscribeToDisputeGameVideos(dispute.gameId, setVideos);
  }, [dispute?.gameId]);

  // A video attaches through the normal pipeline (VideoUploadModal →
  // gameVideos). The upload shows up as a pending upload for this game; keep
  // the flag once seen so a fast upload that already finished still counts.
  useEffect(() => {
    if (pendingUploads.some((upload) => upload.gameId === effectiveGameId)) {
      setVideoAttached(true);
    }
  }, [pendingUploads, effectiveGameId]);

  const videosById = useMemo(() => {
    const map: Record<string, GameVideo> = {};
    videos.forEach((video) => {
      if (video.gameId && video.postedBy?.userId) {
        map[gameVideoDocId(video.gameId, video.postedBy.userId)] = video;
      }
    });
    return map;
  }, [videos]);

  const team1Ids = teamIdsOf(originalGame, "team1");
  const team2Ids = teamIdsOf(originalGame, "team2");
  const allParticipantIds = dispute?.participantIds?.length
    ? dispute.participantIds
    : participantIds;
  const canContribute =
    !!userId &&
    (allParticipantIds.includes(userId) ||
      team1Ids.includes(userId) ||
      team2Ids.includes(userId));

  const roleOf = (actorId: string): Role => {
    if (actorId === userId) return "You";
    const userTeam = userId && team1Ids.includes(userId) ? team1Ids : team2Ids;
    if (userTeam.includes(actorId)) return "Teammate";
    if (team1Ids.includes(actorId) || team2Ids.includes(actorId)) {
      return "Opponent";
    }
    return "Admin";
  };

  const nameOf = (actorId: string): string => {
    if (actorId === DISPUTE_SYSTEM_ACTOR) return "CourtChamps";
    const player = originalGame
      ? playersOf(originalGame).find((p) => p.userId === actorId)
      : undefined;
    if (player) return player.displayName || formatDisplayName(player);
    return "CourtChamps admin";
  };

  const buildEvidence = (): DisputeEvidence | null => {
    if (!userId) return null;
    return {
      ...(note.trim() ? { note: note.trim() } : {}),
      ...(videoAttached
        ? {
            videoId: gameVideoDocId(effectiveGameId, userId),
            ...(courtPositions ? { courtPositions } : {}),
          }
        : {}),
    };
  };

  const resetForm = () => {
    setNote("");
    setCourtPositions(null);
    setVideoAttached(false);
  };

  const notifyParticipants = useCallback(
    async (id: string, message: string) => {
      const recipients = allParticipantIds.filter(
        (recipientId) => recipientId && recipientId !== currentUser?.userId,
      );
      await Promise.all(
        recipients.map((recipientId) =>
          sendNotification({
            ...notificationSchema,
            createdAt: new Date(),
            recipientId,
            senderId: currentUser?.userId,
            message,
            type: notificationTypes.INFORMATION.LADDER_DISPUTE.TYPE,
            data: { disputeId: id, ladderId },
          }),
        ),
      );
    },
    [allParticipantIds, currentUser, sendNotification, ladderId],
  );

  const handleOpenDispute = async () => {
    const evidence = buildEvidence();
    if (!currentUser?.userId || !originalGame || !correctedGame || !matchId) {
      return;
    }
    if (!evidence) return;
    setSubmitting(true);
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
    resetForm();
    setDisputeId(outcome.disputeId);
  };

  const handleSubmitEvidence = async () => {
    const evidence = buildEvidence();
    if (!dispute || !currentUser?.userId || !evidence) return;
    setSubmitting(true);
    const outcome = await addDisputeEvidence(
      dispute.disputeId,
      currentUser.userId,
      evidence,
    );
    setSubmitting(false);
    if (!outcome.success) {
      showBottomToast(
        outcome.reason === "resolved"
          ? "This dispute has already been resolved."
          : "Could not submit evidence. Please try again.",
        "error",
      );
      return;
    }
    await notifyParticipants(
      dispute.disputeId,
      `${formatDisplayName(currentUser)} added evidence to a disputed game in ${
        dispute.ladderName ?? "the ladder"
      }`,
    );
    resetForm();
    setExpanded({});
    showBottomToast("Evidence submitted", "success");
  };

  const events = dispute?.events ?? [];
  const lastIndex = events.length - 1;
  const isOpen = (index: number) => expanded[index] ?? index === lastIndex;

  const toggle = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((prev) => ({ ...prev, [index]: !isOpen(index) }));
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
          ) : dispute?.disputedGame ? (
            <DisputeScoreCard
              game={dispute.disputedGame}
              leagueType={effectiveType}
            />
          ) : null}
        </Block>

        {isComposing && (
          <EvidenceForm
            title="Evidence"
            subtitle="Add a note or a video so an admin can review the result."
            videoAttached={videoAttached}
            onUploadVideo={() => setUploadVisible(true)}
            courtPositions={courtPositions}
            onEditCourtPositions={() => setCourtVisible(true)}
            note={note}
            onChangeNote={setNote}
            notePlaceholder="Explain what the correct result should be…"
            submitLabel="Submit dispute"
            submitting={submitting}
            onSubmit={handleOpenDispute}
            blockedMessage={
              correctedGame
                ? null
                : "Tap the card above to enter the corrected score."
            }
          />
        )}

        {dispute && (
          <Block>
            <TimelineHeader>Dispute timeline</TimelineHeader>
            {events.map((event, index) => {
              const open = isOpen(index);
              const isFirst = index === 0;
              const isLast = index === lastIndex;
              return (
                <TimelineRow key={`${event.type ?? event.stage}-${index}`}>
                  <Gutter>
                    {!isFirst && <LineTop />}
                    {!isLast && <LineBottom />}
                    <Dot state={isLast ? "active" : "completed"} />
                  </Gutter>
                  <TimelineContent last={isLast}>
                    <PhaseCard open={open}>
                      <StageHeader
                        activeOpacity={0.8}
                        onPress={() => toggle(index)}
                      >
                        <PhaseTitle>
                          <PhaseTitleRow>
                            <StageLabel>{eventLabel(event)}</StageLabel>
                            {event.createdBy !== DISPUTE_SYSTEM_ACTOR && (
                              <RoleTag>
                                <RoleText>{roleOf(event.createdBy)}</RoleText>
                              </RoleTag>
                            )}
                          </PhaseTitleRow>
                          <StageWhen>
                            {nameOf(event.createdBy)} ·{" "}
                            {formatEventDate(event.createdAt)}
                          </StageWhen>
                        </PhaseTitle>
                        <Ionicons
                          name={open ? "chevron-up" : "chevron-down"}
                          size={18}
                          color="#9fb8c8"
                        />
                      </StageHeader>
                      {!open && <EventChips event={event} />}
                      {open && (
                        <StageBody>
                          <PhaseDetail
                            dispute={dispute}
                            event={event}
                            video={
                              event.videoId
                                ? videosById[event.videoId]
                                : undefined
                            }
                            finalGame={finalGame}
                            effectiveType={effectiveType}
                            onViewCourtPositions={() =>
                              setViewingPositions(event.courtPositions ?? null)
                            }
                          />
                        </StageBody>
                      )}
                    </PhaseCard>
                  </TimelineContent>
                </TimelineRow>
              );
            })}

            {!isResolved && canContribute && (
              <EvidenceForm
                title={
                  dispute.stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED
                    ? "The admin has requested more evidence"
                    : "Add your evidence"
                }
                subtitle="Any player in this game can add a video or a note."
                videoAttached={videoAttached}
                onUploadVideo={() => setUploadVisible(true)}
                courtPositions={courtPositions}
                onEditCourtPositions={() => setCourtVisible(true)}
                note={note}
                onChangeNote={setNote}
                notePlaceholder="Add anything else the admin should see…"
                submitLabel="Submit evidence"
                submitting={submitting}
                onSubmit={handleSubmitEvidence}
              />
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
          competitionId={dispute?.ladderId ?? ladderId}
          competitionName={dispute?.ladderName ?? ladderName ?? "Ladder match"}
          competitionType={COMPETITION_TYPES.LADDER}
          matchId={dispute?.ladderMatchId ?? matchId}
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

      {originalGame && viewingPositions && (
        <CourtPositionModal
          visible
          onClose={() => setViewingPositions(null)}
          video={courtPositionVideo(originalGame, viewingPositions)}
          isUploader={false}
          playerArray={playersOf(originalGame)}
          onSave={async () => {}}
        />
      )}
    </Screen>
  );
};

const eventLabel = (event: DisputeEvent): string =>
  event.type
    ? DISPUTE_EVENT_LABELS[event.type]
    : event.stage === DISPUTE_STAGE.RESOLVED
      ? DISPUTE_EVENT_LABELS.resolved
      : event.stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED
        ? DISPUTE_EVENT_LABELS.evidence_requested
        : DISPUTE_EVENT_LABELS.evidence_submitted;

const EventChips = ({ event }: { event: DisputeEvent }) => {
  const chips = [
    event.videoId && "Video",
    event.courtPositions &&
      hasCourtPositions(event.courtPositions) &&
      "Court positions",
    event.note && "Note",
  ].filter((chip): chip is string => Boolean(chip));
  if (!chips.length) return null;
  return (
    <ChipRow>
      {chips.map((chip) => (
        <Chip key={chip}>
          <ChipText>{chip}</ChipText>
        </Chip>
      ))}
    </ChipRow>
  );
};

const PhaseDetail = ({
  dispute,
  event,
  video,
  finalGame,
  effectiveType,
  onViewCourtPositions,
}: {
  dispute: Dispute;
  event: DisputeEvent;
  video?: GameVideo;
  finalGame: Game | null;
  effectiveType: LadderType;
  onViewCourtPositions: () => void;
}) => {
  if (event.type === DISPUTE_EVENT_TYPE.VOIDED) {
    return (
      <DetailText>
        {event.note ||
          `No evidence was submitted within ${DISPUTE_EVIDENCE_WINDOW_HOURS} hours of the admin's request. The original score stands.`}
      </DetailText>
    );
  }
  if (
    event.type === DISPUTE_EVENT_TYPE.RESOLVED ||
    (!event.type && event.stage === DISPUTE_STAGE.RESOLVED)
  ) {
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
          <AdminNote>
            <NoteLabel>From the admin</NoteLabel>
            <DetailText>{dispute.adminNotes}</DetailText>
          </AdminNote>
        ) : null}
      </>
    );
  }
  if (
    event.type === DISPUTE_EVENT_TYPE.EVIDENCE_REQUESTED ||
    (!event.type && event.stage === DISPUTE_STAGE.MORE_EVIDENCE_REQUESTED)
  ) {
    return (
      <>
        <AdminNote>
          <NoteLabel>From the admin</NoteLabel>
          <DetailText>
            {event.note ||
              "The admin has requested more evidence for this dispute."}
          </DetailText>
        </AdminNote>
        {event.evidenceDueAt ? (
          <>
            <DueText>
              Due {formatEventDate(event.evidenceDueAt)} (
              {moment(toDate(event.evidenceDueAt)).fromNow(true)} left)
            </DueText>
            <DetailText>
              If nobody adds evidence by then, the dispute is voided and the
              original score stands.
            </DetailText>
          </>
        ) : null}
      </>
    );
  }

  const hasEvidence = Boolean(event.videoId || event.note);
  return (
    <>
      {event.videoId ? (
        video?.videoUrl ? (
          <DisputeVideoPlayer url={video.videoUrl} />
        ) : (
          <EvidenceRow>
            <ActivityIndicator size="small" color="#00A2FF" />
            <EvidenceText>Video processing…</EvidenceText>
          </EvidenceRow>
        )
      ) : null}
      {event.videoId && hasCourtPositions(event.courtPositions) ? (
        <SecondaryButton onPress={onViewCourtPositions}>
          <Ionicons name="grid-outline" size={16} color="#00A2FF" />
          <SecondaryText>View court positions</SecondaryText>
        </SecondaryButton>
      ) : null}
      {event.note ? (
        <NoteBox>
          <NoteLabel>Note</NoteLabel>
          <DetailText>{event.note}</DetailText>
        </NoteBox>
      ) : null}
      {!hasEvidence ? (
        <DetailText>No evidence was added with this action.</DetailText>
      ) : null}
    </>
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

const SecondaryButton = styled.TouchableOpacity<{ muted?: boolean }>(
  ({ muted }: { muted?: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: muted ? "rgba(255,255,255,0.12)" : "#00A2FF",
    borderRadius: 8,
    paddingVertical: 12,
  }),
);

const SecondaryText = styled.Text<{ muted?: boolean }>(
  ({ muted }: { muted?: boolean }) => ({
    color: muted ? "#5b7186" : "#00A2FF",
    fontWeight: "bold",
    fontSize: 14,
  }),
);

const MutedHint = styled.Text({
  color: "#5b7186",
  fontSize: 12,
  marginTop: -4,
});

const HintText = styled.Text({
  color: "#ffb86b",
  fontSize: 12,
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
    paddingBottom: last ? 0 : 12,
  }),
);

const PhaseCard = styled.View<{ open: boolean }>(
  ({ open }: { open: boolean }) => ({
    borderBottomWidth: 1,
    borderColor: open ? "#16406a" : "rgb(9, 33, 62)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  }),
);

const StageHeader = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
});

const PhaseTitle = styled.View({ flex: 1 });

const PhaseTitleRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 6,
});

const RoleTag = styled.View({
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.12)",
  borderRadius: 4,
  paddingHorizontal: 5,
  paddingVertical: 1,
});

const RoleText = styled.Text({
  color: "#9fb8c8",
  fontSize: 10,
  fontWeight: "600",
});

const ChipRow = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 4,
  marginTop: 8,
});

const Chip = styled.View({
  borderWidth: 1,
  borderColor: "rgba(255,255,255,0.08)",
  borderRadius: 4,
  paddingHorizontal: 6,
  paddingVertical: 1,
});

const ChipText = styled.Text({ color: "#9fb8c8", fontSize: 11 });

const NoteBox = styled.View({
  backgroundColor: "#0a1929",
  borderRadius: 8,
  padding: 10,
  gap: 2,
});

const AdminNote = styled.View({
  backgroundColor: "rgba(197,139,255,0.1)",
  borderRadius: 8,
  padding: 10,
  gap: 2,
});

const NoteLabel = styled.Text({
  color: "#5b7186",
  fontSize: 10,
  fontWeight: "600",
  letterSpacing: 1,
  textTransform: "uppercase",
});

const DueText = styled.Text({
  color: "#FFB020",
  fontSize: 13,
  fontWeight: "bold",
});

const StageLabel = styled.Text({
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "bold",
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

const DisputeVideo = styled(VideoView)({
  width: "100%",
  height: 200,
  borderRadius: 8,
  backgroundColor: "#000",
});

export default GameDisputeScreen;
