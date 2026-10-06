import React, { useState } from "react";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import type { Court, Ladder } from "@shared/types";
import type { LadderHomeCourt } from "../../helpers/ladderHomeCourt";
import SearchCourt from "../Modals/SearchLocationModal";
import {
  COURT_SUBMITTED_MESSAGE,
  useLadderCourts,
} from "../../hooks/useLadderCourts";

export const NO_COURTS_MESSAGE =
  "No verified courts in this ladder yet. Add your court below and it will appear here once approved.";

interface LadderHomeCourtSectionProps {
  ladder: Ladder;
  homeCourt: LadderHomeCourt | null;
  canChange: boolean;
  isEntrant: boolean;
  confirmHomeCourt: (court: Court | null, onSaved?: () => void) => void;
}

const LadderHomeCourtSection: React.FC<LadderHomeCourtSectionProps> = ({
  ladder,
  homeCourt,
  canChange,
  isEntrant,
  confirmHomeCourt,
}) => {
  const [selectorVisible, setSelectorVisible] = useState(false);
  const {
    courtsList,
    courtsLoading,
    findSelectableCourt,
    submitCourt,
    applyCourts,
    getCourts,
  } = useLadderCourts(ladder, selectorVisible);

  if (!isEntrant) return null;

  const location = homeCourt
    ? [homeCourt.location.address, homeCourt.location.city]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <Section testID="ladder-home-court">
      <SectionTitle>Home Court</SectionTitle>

      {homeCourt ? (
        <CourtCard testID="ladder-home-court-card">
          <Ionicons name="location" size={22} color="#00A2FF" />
          <CourtText>
            <CourtName testID="ladder-home-court-name">
              {homeCourt.courtName}
            </CourtName>
            {!!location && <CourtLocation>{location}</CourtLocation>}
          </CourtText>
          {canChange ? (
            <ChangeButton
              activeOpacity={0.8}
              onPress={() => setSelectorVisible(true)}
              testID="ladder-home-court-change"
            >
              <ChangeText>Change</ChangeText>
            </ChangeButton>
          ) : null}
        </CourtCard>
      ) : (
        <AddButton
          activeOpacity={0.85}
          onPress={() => setSelectorVisible(true)}
          testID="ladder-home-court-add"
        >
          <Ionicons name="add-circle-outline" size={20} color="#00A2FF" />
          <AddText>Add Home Court</AddText>
        </AddButton>
      )}

      {selectorVisible && (
        <SearchCourt
          visible={selectorVisible}
          onClose={() => setSelectorVisible(false)}
          courts={courtsList}
          selectedCourtKey={homeCourt?.courtId}
          onSelectCourt={(value) => confirmHomeCourt(findSelectableCourt(value))}
          getCourts={getCourts}
          addCourt={submitCourt}
          onCourtsRefreshed={applyCourts}
          showCountryIcon={false}
          selectAddedCourt={false}
          addCourtSuccessMessage={COURT_SUBMITTED_MESSAGE}
          loading={courtsLoading}
          emptyListMessage={NO_COURTS_MESSAGE}
        />
      )}
    </Section>
  );
};

export default LadderHomeCourtSection;

const Section = styled.View({
  gap: 10,
  marginBottom: 20,
});

const SectionTitle = styled.Text({
  fontSize: 16,
  fontWeight: "bold",
  color: "#ffffff",
});

const CourtCard = styled.View({
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  padding: 14,
  borderRadius: 12,
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  borderWidth: 1,
  borderColor: "rgba(0, 162, 255, 0.35)",
});

const CourtText = styled.View({
  flex: 1,
  gap: 2,
});

const CourtName = styled.Text({
  color: "#ffffff",
  fontSize: 15,
  fontWeight: "600",
});

const CourtLocation = styled.Text({
  color: "#9fb8c8",
  fontSize: 12,
});

const ChangeButton = styled.TouchableOpacity({
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#00A2FF",
});

const ChangeText = styled.Text({
  color: "#00A2FF",
  fontSize: 13,
  fontWeight: "600",
});

const AddButton = styled.TouchableOpacity({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: 14,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: "#00A2FF",
  borderStyle: "dashed",
  backgroundColor: "rgba(0, 162, 255, 0.08)",
});

const AddText = styled.Text({
  color: "#00A2FF",
  fontSize: 15,
  fontWeight: "600",
});
