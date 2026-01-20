/**
 * Competition Data Helper for Gradual Migration
 *
 * Normalizes competition data from old schema (league/tournament prefixes)
 * to standardized format. Supports gradual migration by checking new schema first,
 * then falling back to old prefixed schema.
 *
 * @param {Object} rawData - Raw competition data from database
 * @param {string} competitionType - Either 'league' or 'tournament'
 * @returns {Object} Normalized competition data object
 */

export const normalizeCompetitionData = ({ rawData, competitionType }) => {
  if (!rawData) return null;
  return {
    // Participants & Teams
    participants:
      rawData?.participants ||
      rawData?.[`${competitionType}Participants`] ||
      [],
    teams: rawData?.teams || rawData?.[`${competitionType}Teams`] || [],

    // Administration
    admins: rawData?.admins || rawData?.[`${competitionType}Admins`] || [],
    owner: rawData?.owner || rawData?.[`${competitionType}Owner`] || {},

    // Basic Info
    name: rawData?.name || rawData?.[`${competitionType}Name`] || "",
    description:
      rawData?.description || rawData?.[`${competitionType}Description`] || "",
    image: rawData?.image || rawData?.[`${competitionType}Image`] || "",

    // Competition Type & Mode
    type: rawData?.type || rawData?.[`${competitionType}Type`] || "",
    mode: rawData?.mode || rawData?.[`${competitionType}Mode`] || "", // Only tournaments

    // Timing
    lengthInMonths:
      rawData?.lengthInMonths ||
      rawData?.[`${competitionType}LengthInMonths`] ||
      "",
    startDate: rawData?.startDate || "",
    endDate: rawData?.endDate || "",

    // Prize & Entry
    prizeType: rawData?.prizeType || "",
    entryFee: rawData?.entryFee || 0,
    currencyType: rawData?.currencyType || "",
    prizesDistributed: rawData?.prizesDistributed || false,
    prizeDistributionDate: rawData?.prizeDistributionDate || null,

    // Competition Setup
    maxPlayers: rawData?.maxPlayers || 0,
    privacy: rawData?.privacy || "",
    playingTime: rawData?.playingTime || [],
    approvalLimit: rawData?.approvalLimit || 1,

    // Location & Games
    location: rawData?.location || {},
    countryCode: rawData?.countryCode || "",
    games: rawData?.games || [],

    // Invites & Requests
    pendingInvites: rawData?.pendingInvites || [],
    pendingRequests: rawData?.pendingRequests || [],

    // Fixtures (Tournaments)
    ...(rawData?.fixtures && { fixtures: rawData.fixtures }),

    // Metadata
    createdAt: rawData?.createdAt || new Date(),
    id: rawData?.id || rawData?.[`${competitionType}Id`] || "",
  };
};
