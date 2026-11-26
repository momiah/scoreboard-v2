import React from "react";
import styled from "styled-components/native";

import { TERMS_VERSION_LINE } from "@shared";
import type { LegalSection } from "@shared";

import FormattedBlocks from "../ladder/FormattedBlocks";

interface LegalSectionsProps {
  sections: LegalSection[];
  testIDPrefix: string;
  intro?: string;
}

const LegalSections: React.FC<LegalSectionsProps> = ({
  sections,
  testIDPrefix,
  intro,
}) => (
  <>
    {intro ? <Intro>{intro}</Intro> : null}
    <Version testID={`${testIDPrefix}-version`}>{TERMS_VERSION_LINE}</Version>
    {sections.map((section) => (
      <SectionCard
        key={section.id}
        testID={`${testIDPrefix}-section-${section.id}`}
      >
        <SectionTitle>{section.title}</SectionTitle>
        <FormattedBlocks blocks={section.body} />
      </SectionCard>
    ))}
  </>
);

export default LegalSections;

const Intro = styled.Text({
  color: "#9fb8c8",
  fontSize: 14,
  lineHeight: "20px",
});

const Version = styled.Text({
  color: "#6f8597",
  fontSize: 12,
});

const SectionCard = styled.View({
  padding: 16,
  borderRadius: 12,
  backgroundColor: "rgba(255, 255, 255, 0.04)",
  borderWidth: 1,
  borderColor: "#192336",
  gap: 8,
});

const SectionTitle = styled.Text({
  color: "#00A2FF",
  fontSize: 15,
  fontWeight: "bold",
});
