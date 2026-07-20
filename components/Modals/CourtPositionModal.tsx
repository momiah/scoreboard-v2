import React, { memo, useState, useMemo, useCallback } from "react";
import {
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import styled from "styled-components/native";
import { BlurView } from "expo-blur";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { Player, GameVideo, SelectedPlayers } from "@shared/types";
import SelectPlayerModal from "./SelectPlayerModal";

// ─── Types ────────────────────────────────────────────────────────────────

type TeamKey = "team1" | "team2";

interface PositionSlot {
  teamKey: TeamKey;
  index: number;
}

interface CourtPositionsModalProps {
  visible: boolean;
  onClose: () => void;
  video: GameVideo;
  isUploader: boolean;
  playerArray: Player[];
  onSave: (positions: SelectedPlayers) => Promise<void>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const buildInitialPositions = ({
  video,
  isDoubles,
}: {
  video: GameVideo;
  isDoubles: boolean;
}): SelectedPlayers => {
  const slotsPerTeam = isDoubles ? 2 : 1;
  const existing = video.courtPositions;

  const fill = (teamKey: TeamKey) =>
    Array.from(
      { length: slotsPerTeam },
      (_, index) => existing?.[teamKey]?.[index] ?? null,
    );

  return {
    team1: fill("team1"),
    team2: fill("team2"),
  };
};

const hasAssignedPositions = (positions?: SelectedPlayers): boolean =>
  Boolean(
    positions &&
    [...positions.team1, ...positions.team2].some((player) => player != null),
  );

const arePositionsEqual = (a: SelectedPlayers, b: SelectedPlayers): boolean => {
  const sameTeam = (left: (Player | null)[], right: (Player | null)[]) =>
    left.length === right.length &&
    left.every((player, index) => player?.userId === right[index]?.userId);

  return sameTeam(a.team1, b.team1) && sameTeam(a.team2, b.team2);
};

// ─── Component ────────────────────────────────────────────────────────────────

const CourtPositionsModal = memo<CourtPositionsModalProps>(
  ({ visible, onClose, video, isUploader, playerArray, onSave }) => {
    const isDoubles = Boolean(
      video.teams.team1?.player2 || video.teams.team2?.player2,
    );

    const initial = useMemo(
      () => buildInitialPositions({ video, isDoubles }),
      [video, isDoubles],
    );

    const [positions, setPositions] = useState<SelectedPlayers>(initial);
    const [baseline, setBaseline] = useState<SelectedPlayers>(initial);
    const [activeSlot, setActiveSlot] = useState<PositionSlot | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const isDirty = useMemo(
      () => !arePositionsEqual(positions, baseline),
      [positions, baseline],
    );

    const selectedPlayer = useMemo(
      () =>
        activeSlot ? positions[activeSlot.teamKey][activeSlot.index] : null,
      [activeSlot, positions],
    );

    const openSlot = useCallback(
      (teamKey: TeamKey, index: number) => {
        if (!isUploader) return;
        setActiveSlot({ teamKey, index });
      },
      [isUploader],
    );

    const handleSelectPlayer = useCallback(
      (player: Player) => {
        if (!activeSlot) return;
        setPositions((prev) => {
          const next: SelectedPlayers = {
            team1: [...prev.team1],
            team2: [...prev.team2],
          };
          // Toggle off if the same player is reselected, otherwise assign
          const current = next[activeSlot.teamKey][activeSlot.index];
          next[activeSlot.teamKey][activeSlot.index] =
            current?.userId === player.userId ? null : player;
          return next;
        });
        setActiveSlot(null);
      },
      [activeSlot],
    );

    const handleSave = useCallback(async () => {
      if (isSaving || !isDirty) return;
      setIsSaving(true);
      try {
        await onSave(positions);
        setBaseline(positions);
        onClose();
      } catch (error) {
        console.error("[CourtPositionsModal] Failed to save positions:", error);
      } finally {
        setIsSaving(false);
      }
    }, [isSaving, isDirty, onSave, positions, onClose]);

    const renderSlot = (teamKey: TeamKey, index: number) => {
      const player = positions[teamKey][index];
      const isEditable = isUploader;

      return (
        <PositionSlotContainer
          activeOpacity={isEditable ? 0.7 : 1}
          isEditable={isEditable}
          isFilled={Boolean(player)}
          onPress={() => openSlot(teamKey, index)}
          disabled={!isEditable}
        >
          {player ? (
            <SlotName numberOfLines={1}>{player.displayName}</SlotName>
          ) : (
            <SlotPlaceholder>{isEditable ? "+ Add" : "Empty"}</SlotPlaceholder>
          )}
        </PositionSlotContainer>
      );
    };

    return (
      <Modal
        animationType="slide"
        transparent
        visible={visible}
        onRequestClose={onClose}
      >
        <MenuOverlay>
          <MenuContent>
            <MenuHeader>
              <MenuTitle>Court Positions</MenuTitle>
              <TouchableOpacity onPress={onClose}>
                <AntDesign name="close-circle" size={26} color="red" />
              </TouchableOpacity>
            </MenuHeader>

            <ModalDescription>
              {isUploader
                ? "Tap a position to set which side each player started on. This helps viewers recognize each player."
                : "Where each player started on the court."}
              {!isUploader && !hasAssignedPositions(positions) && (
                <UnassignedNote>
                  {" "}
                  (Uploader has not assigned court positions yet)
                </UnassignedNote>
              )}
            </ModalDescription>

            <CourtWrapper>
              <Court>
                {/* ── Team 1 half (top) ── */}
                <CourtHalf>
                  <CenterLine />
                  <SlotRow>
                    {renderSlot("team1", 0)}
                    {isDoubles && renderSlot("team1", 1)}
                  </SlotRow>
                </CourtHalf>

                {/* ── Net ── */}
                <Net>
                  <NetDashes>
                    {Array.from({ length: 30 }).map((_, index) => (
                      <NetDash key={index} />
                    ))}
                  </NetDashes>
                  <NetLabel>NET</NetLabel>
                </Net>

                {/* ── Team 2 half (bottom) ── */}
                <CourtHalf>
                  <CenterLine />
                  <SlotRow>
                    {renderSlot("team2", 0)}
                    {isDoubles && renderSlot("team2", 1)}
                  </SlotRow>
                </CourtHalf>
              </Court>
            </CourtWrapper>

            {isUploader && (
              <SaveButton
                onPress={handleSave}
                disabled={isSaving || !isDirty}
                isDisabled={isSaving || !isDirty}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={20} color="#fff" />
                    <SaveButtonText>Save Positions</SaveButtonText>
                  </>
                )}
              </SaveButton>
            )}
          </MenuContent>
        </MenuOverlay>

        {isUploader && (
          <SelectPlayerModal
            dropdownVisible={Boolean(activeSlot)}
            closeDropdown={() => setActiveSlot(null)}
            playerArray={playerArray}
            handleSelect={handleSelectPlayer}
            selectedPlayers={positions}
            selected={selectedPlayer}
          />
        )}
      </Modal>
    );
  },
);

CourtPositionsModal.displayName = "CourtPositionsModal";

// ─── Styled Components ────────────────────────────────────────────────────────

const screenWidth = Dimensions.get("window").width;

const MenuOverlay = styled(BlurView).attrs({
  intensity: 50,
  tint: "dark",
})({
  flex: 1,
  justifyContent: "flex-end",
});

const MenuContent = styled.View({
  backgroundColor: "rgba(2, 13, 24, 1)",
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  paddingBottom: 40,
});

const ModalDescription = styled.Text({
  color: "#aaa",
  fontSize: 14,
  marginHorizontal: 20,
  paddingVertical: 12,
  //   textAlign: "center",
  //   marginBottom: 12,
});

const UnassignedNote = styled.Text({
  color: "#aaa",
  fontSize: 14,
  fontStyle: "italic",
});

// ── Header
const MenuHeader = styled.View({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: 20,
  borderBottomWidth: 1,
  borderBottomColor: "#1a2b3d",
});

const MenuTitle = styled.Text({
  fontSize: 18,
  fontWeight: "bold",
  color: "white",
});

// ── Court
const CourtWrapper = styled.View({
  padding: 20,
  alignItems: "center",
});

const Court = styled.View({
  width: "100%",
  backgroundColor: "#07111f",
  borderRadius: 12,
  borderWidth: 2,
  borderColor: "rgba(0, 162, 255, 0.55)",
  paddingVertical: 8,
  overflow: "hidden",
});

const CourtHalf = styled.View({
  position: "relative",
  paddingVertical: 28,
  justifyContent: "center",
});

const SlotRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 16,
});

const Net = styled.View({
  height: 20,
  justifyContent: "center",
  alignItems: "center",
});

const NetDashes = styled.View({
  position: "absolute",
  left: 16,
  right: 16,
  flexDirection: "row",
  justifyContent: "space-between",
});

const NetDash = styled.View({
  width: 8,
  height: 2,
  backgroundColor: "#fff",
});

const NetLabel = styled.Text({
  backgroundColor: "#07111f",
  color: "#fff",
  fontSize: 10,
  fontWeight: "700",
  letterSpacing: 2,
  paddingHorizontal: 8,
});

const CenterLine = styled.View({
  position: "absolute",
  top: 12,
  bottom: 12,
  left: "50%",
  marginLeft: -0.5,
  width: 1,
  backgroundColor: "rgba(0, 162, 255, 0.25)",
});

const PositionSlotContainer = styled.TouchableOpacity<{
  isEditable: boolean;
  isFilled: boolean;
}>(({ isFilled }: { isEditable: boolean; isFilled: boolean }) => ({
  flex: 1,
  minHeight: 64,
  marginHorizontal: 12,
  borderRadius: 10,
  borderWidth: 2,
  borderStyle: isFilled ? "solid" : "dashed",
  borderColor: isFilled ? "#00A2FF" : "rgba(255, 255, 255, 0.35)",
  backgroundColor: isFilled
    ? "rgba(0, 162, 255, 0.18)"
    : "rgba(10, 25, 41, 0.8)",
  justifyContent: "center",
  alignItems: "center",
  paddingHorizontal: 8,
}));

const SlotName = styled.Text({
  color: "#fff",
  fontSize: screenWidth <= 400 ? 12 : 14,
  fontWeight: "600",
  textAlign: "center",
});

const SlotPlaceholder = styled.Text({
  color: "rgba(255, 255, 255, 0.6)",
  fontSize: 13,
  fontWeight: "500",
});

// ── Footer
const SaveButton = styled.TouchableOpacity<{ isDisabled: boolean }>(
  ({ isDisabled }: { isDisabled: boolean }) => ({
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 4,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: isDisabled ? "#1a2b3d" : "#0099f0",
    opacity: isDisabled ? 0.6 : 1,
  }),
);

const SaveButtonText = styled.Text({
  color: "#fff",
  fontSize: 16,
  fontWeight: "600",
});

export default CourtPositionsModal;
