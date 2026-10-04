import React, { useState } from "react";
import styled from "styled-components/native";
import Ionicons from "@expo/vector-icons/Ionicons";

import type { Ladder } from "@shared/types";
import { useLadderHomeCourt } from "../../hooks/useLadderHomeCourt";
import LadderHomeCourtSelector from "../ladder/LadderHomeCourtSelector";
import { SkeletonWrapper } from "../Skeletons/SkeletonComponents";

interface LadderHomeCourtSectionProps {
  ladder: Ladder;
}

const LadderHomeCourtSection: React.FC<LadderHomeCourtSectionProps> = ({
  ladder,
}) => {
  const { homeCourt, canChange, isEntrant, loading, saveHomeCourt } =
    useLadderHomeCourt(ladder);
  const [selectorVisible, setSelectorVisible] = useState(false);

  if (!loading && !isEntrant) return null;

  const location = homeCourt
    ? [homeCourt.location.address, homeCourt.location.city]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <Section testID="ladder-home-court">
      <HeaderRow>
        <SectionTitle>Home Court</SectionTitle>
        {!loading && homeCourt && canChange ? (
          <ChangeButton
            activeOpacity={0.7}
            onPress={() => setSelectorVisible(true)}
            testID="ladder-home-court-change"
          >
            <ChangeText>Change Court</ChangeText>
          </ChangeButton>
        ) : null}
      </HeaderRow>

      {loading ? (
        <SkeletonWrapper show height={56} width="100%" radius={12} />
      ) : homeCourt ? (
        <CourtDetails testID="ladder-home-court-card">
          <CourtName testID="ladder-home-court-name">
            {homeCourt.courtName}
          </CourtName>
          {!!location && <CourtLocation>{location}</CourtLocation>}
        </CourtDetails>
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
        <LadderHomeCourtSelector
          visible={selectorVisible}
          onClose={() => setSelectorVisible(false)}
          ladder={ladder}
          homeCourt={homeCourt}
          saveHomeCourt={saveHomeCourt}
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

const HeaderRow = styled.View({
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
});

const CourtDetails = styled.View({
  width: "100%",
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

const ChangeButton = styled.TouchableOpacity({});

const ChangeText = styled.Text({
  color: "white",
  fontSize: 11,
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
