import React, { useContext, useEffect, useMemo, useState } from "react";
import { Modal, ActivityIndicator } from "react-native";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import {
  LADDER_TYPE,
  REPORT_REASONS,
  REPORT_REASON_LABELS,
  CONDUCT_REPORT_REASONS,
  reportNeedsDescription,
} from "@shared";
import type { LadderMatch, ReportReason, ReportTarget } from "@shared/types";

import { LadderContext } from "../../context/LadderContext";
import { UserContext } from "../../context/UserContext";
import { PopupContext } from "../../context/PopupContext";
import { formatDisplayName } from "../../helpers/formatDisplayName";

interface TargetOption {
  key: string;
  label: string;
  target: ReportTarget;
}

interface ReportPlayerModalProps {
  visible: boolean;
  onClose: () => void;
  ladderId: string;
  ladderName?: string;
  match: LadderMatch;
  currentUserId?: string;
}

const ReportPlayerModal: React.FC<ReportPlayerModalProps> = ({
  visible,
  onClose,
  ladderId,
  ladderName,
  match,
  currentUserId,
}) => {
  const { submitReport, fetchLadderTeams } = useContext(LadderContext);
  const { getUserById } = useContext(UserContext);
  const { showBottomToast } = useContext(PopupContext);

  const [options, setOptions] = useState<TargetOption[]>([]);
  const [resolving, setResolving] = useState(false);
  const [targetKey, setTargetKey] = useState<string | null>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isDoubles =
    match.ladderType === LADDER_TYPE.DOUBLES ||
    (match.teams?.length ?? 0) === 2;

  useEffect(() => {
    if (!visible) {
      setTargetKey(null);
      setReason(null);
      setDescription("");
      return;
    }
    let active = true;
    setResolving(true);
    (async () => {
      try {
        const built: TargetOption[] = [];
        if (isDoubles) {
          const opponentTeam = (match.teams ?? []).find(
            (t) => !t.playerIds.includes(currentUserId ?? ""),
          );
          if (opponentTeam) {
            const teams = await fetchLadderTeams(ladderId);
            const teamDoc = teams.find((t) => t.teamKey === opponentTeam.teamKey);
            const teamName =
              teamDoc?.teamName?.trim() || (teamDoc?.team ?? []).join(" & ");
            built.push({
              key: "team",
              label: teamName ? `Whole team (${teamName})` : "Whole team",
              target: {
                type: "team",
                userIds: opponentTeam.playerIds,
                teamKey: opponentTeam.teamKey,
                teamId: opponentTeam.teamId,
                label: teamName || undefined,
              },
            });
            const profiles = await Promise.all(
              opponentTeam.playerIds.map((id) => getUserById(id)),
            );
            opponentTeam.playerIds.forEach((id, index) => {
              const name = profiles[index]
                ? formatDisplayName(profiles[index])
                : `Player ${index + 1}`;
              built.push({
                key: `player-${id}`,
                label: name,
                target: {
                  type: "player",
                  userIds: [id],
                  teamKey: opponentTeam.teamKey,
                  teamId: opponentTeam.teamId,
                  label: name,
                },
              });
            });
          }
        } else {
          const opponentId = match.participants.find(
            (id) => id !== currentUserId,
          );
          if (opponentId) {
            const profile = await getUserById(opponentId);
            const name = profile ? formatDisplayName(profile) : "Opponent";
            built.push({
              key: `player-${opponentId}`,
              label: name,
              target: { type: "player", userIds: [opponentId], label: name },
            });
          }
        }
        if (active) {
          setOptions(built);
          setTargetKey(built.length === 1 ? built[0].key : null);
        }
      } catch (error) {
        console.error("Error preparing report targets:", error);
        if (active) setOptions([]);
      } finally {
        if (active) setResolving(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    visible,
    isDoubles,
    ladderId,
    currentUserId,
    match.teams,
    match.participants,
    fetchLadderTeams,
    getUserById,
  ]);

  const needsDescription = reason ? reportNeedsDescription(reason) : false;
  const canSubmit = useMemo(
    () =>
      !!targetKey &&
      !!reason &&
      (!needsDescription || description.trim().length > 0) &&
      !submitting,
    [targetKey, reason, needsDescription, description, submitting],
  );

  const handleSubmit = async () => {
    const option = options.find((o) => o.key === targetKey);
    if (!option || !reason || !currentUserId) return;
    setSubmitting(true);
    try {
      const { success, reason: failure } = await submitReport({
        ladderId,
        ladderName,
        match,
        reportedBy: currentUserId,
        reason,
        target: option.target,
        description: needsDescription ? description.trim() : undefined,
      });
      if (success) {
        showBottomToast("Report submitted for review", "success");
        onClose();
      } else if (failure === "exists") {
        showBottomToast("You've already reported this", "info");
      } else {
        showBottomToast("Couldn't submit the report", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Backdrop activeOpacity={1} onPress={onClose}>
        <Sheet activeOpacity={1} onPress={() => {}} testID="report-player-modal">
          <Handle />
          <TitleRow>
            <Title>Report a player</Title>
            <CloseButton onPress={onClose} testID="report-close">
              <Ionicons name="close" size={22} color="#9fb8c8" />
            </CloseButton>
          </TitleRow>

          {resolving ? (
            <ActivityIndicator color="#00A2FF" style={{ marginVertical: 24 }} />
          ) : options.length === 0 ? (
            <Muted>No opponent to report on this match.</Muted>
          ) : (
            <>
              <SectionLabel>Who are you reporting?</SectionLabel>
              {options.map((option) => (
                <Choice
                  key={option.key}
                  selected={targetKey === option.key}
                  activeOpacity={0.85}
                  onPress={() => setTargetKey(option.key)}
                  testID={`report-target-${option.key}`}
                >
                  <ChoiceText selected={targetKey === option.key}>
                    {option.label}
                  </ChoiceText>
                  {targetKey === option.key && (
                    <Ionicons name="checkmark-circle" size={18} color="#00A2FF" />
                  )}
                </Choice>
              ))}

              <SectionLabel>Reason</SectionLabel>
              <ReasonRow>
                {CONDUCT_REPORT_REASONS.map((value) => (
                  <ReasonChip
                    key={value}
                    selected={reason === value}
                    activeOpacity={0.85}
                    onPress={() => setReason(value)}
                    testID={`report-reason-${value}`}
                  >
                    <ReasonChipText selected={reason === value}>
                      {REPORT_REASON_LABELS[value]}
                    </ReasonChipText>
                  </ReasonChip>
                ))}
              </ReasonRow>

              {needsDescription && (
                <DescriptionInput
                  placeholder="Add a description (required)"
                  placeholderTextColor="#5b7186"
                  multiline
                  value={description}
                  onChangeText={setDescription}
                  testID="report-description"
                />
              )}

              <SubmitButton
                disabled={!canSubmit}
                isDisabled={!canSubmit}
                activeOpacity={0.85}
                onPress={handleSubmit}
                testID="report-submit"
              >
                <SubmitText>
                  {submitting ? "Submitting…" : "Submit report"}
                </SubmitText>
              </SubmitButton>
            </>
          )}
        </Sheet>
      </Backdrop>
    </Modal>
  );
};

export default ReportPlayerModal;

const Backdrop = styled.TouchableOpacity({
  flex: 1,
  backgroundColor: "rgba(0, 0, 0, 0.6)",
  justifyContent: "flex-end",
});

const Sheet = styled.TouchableOpacity({
  backgroundColor: "rgb(6, 21, 38)",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  padding: 20,
  paddingBottom: 34,
});

const Handle = styled.View({
  alignSelf: "center",
  width: 40,
  height: 4,
  borderRadius: 2,
  backgroundColor: "rgba(255, 255, 255, 0.2)",
  marginBottom: 14,
});

const TitleRow = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
});

const Title = styled.Text({
  color: "#ffffff",
  fontSize: 18,
  fontWeight: "bold",
});

const CloseButton = styled.TouchableOpacity({ padding: 4 });

const Muted = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
  marginVertical: 20,
});

const SectionLabel = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
  fontWeight: "600",
  textTransform: "uppercase",
  marginTop: 16,
  marginBottom: 8,
});

const Choice = styled.TouchableOpacity<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: selected ? "#00A2FF" : "rgba(255, 255, 255, 0.12)",
    backgroundColor: selected ? "rgba(0, 162, 255, 0.1)" : "transparent",
  }),
);

const ChoiceText = styled.Text<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    color: selected ? "#ffffff" : "#cbd5e1",
    fontSize: 15,
    fontWeight: selected ? "600" : "400",
  }),
);

const ReasonRow = styled.View({
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 8,
});

const ReasonChip = styled.TouchableOpacity<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: selected ? "#00A2FF" : "rgba(255, 255, 255, 0.12)",
    backgroundColor: selected ? "rgba(0, 162, 255, 0.12)" : "transparent",
  }),
);

const ReasonChipText = styled.Text<{ selected: boolean }>(
  ({ selected }: { selected: boolean }) => ({
    color: selected ? "#4db8ff" : "#cbd5e1",
    fontSize: 13,
    fontWeight: "500",
  }),
);

const DescriptionInput = styled.TextInput({
  marginTop: 14,
  minHeight: 90,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "rgba(255, 255, 255, 0.12)",
  padding: 12,
  color: "#ffffff",
  fontSize: 14,
  textAlignVertical: "top",
});

const SubmitButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: isDisabled ? "rgba(255, 75, 110, 0.4)" : "#FF4B6E",
  }),
);

const SubmitText = styled.Text({
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "700",
});
