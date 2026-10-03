// STUB: ladder playoffs fixtures. Implement once the playoffs phase has landed.
// Expected contract, mirroring seedAddApproveGameFlow / cleanupLadderTestData:
//   - seedLadderPlayoffs({ testUser, size, doubles }) seeds a ladder whose
//     playoff start date has passed, with `size` ranked participants/teams
//     (see LADDER_PLAYOFF_SIZES in courtchamps-shared), the generated knockout
//     brackets, and the fixture users, all under the hardcoded MAESTRO_PO_*
//     ids exported below.
//   - cleanupLadderPlayoffsTestData() deletes exactly those docs (ladder
//     subtree, bracket/playoff match docs, fixture users, notifications) and
//     is called from cleanupLadderTestData.
//   - Expose both through buttons in maestro/MaestroHarness.tsx and add flows
//     under .maestro/flows.
export const MAESTRO_PO_LADDER_ID = "maestro-po-ladder";
export const MAESTRO_PO_DOUBLES_LADDER_ID = "maestro-po-doubles-ladder";

export const seedLadderPlayoffs = async () => {
  throw new Error("seedLadderPlayoffs is not implemented yet");
};

export const cleanupLadderPlayoffsTestData = async () => {
  throw new Error("cleanupLadderPlayoffsTestData is not implemented yet");
};
