import React from "react";

import { LADDER_TERMS, LADDER_TERMS_INTRO } from "@shared";

import LegalSections from "../legal/LegalSections";

const LadderTermsList: React.FC = () => (
  <LegalSections
    intro={LADDER_TERMS_INTRO}
    sections={LADDER_TERMS}
    testIDPrefix="ladder-terms"
  />
);

export default LadderTermsList;
