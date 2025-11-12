import moment from "moment";

export const calculateCompetitionStatus = (details, type = "league") => {
  const leagueParticipants = details?.[`${type}Participants`];
  const privacy = details?.privacy;
  const endDate = details?.endDate;
  const maxPlayers = details?.maxPlayers;
  const currentParticipants = leagueParticipants?.length || 0;
  const today = moment();
  const end = moment(endDate, "DD-MM-YYYY");

  if (privacy === "Private") {
    return {
      status: "Private",
      color: "#FF4757",
    };
  }

  if (today.isSameOrAfter(end)) {
    return {
      status: "ENDED",
      color: "#FF4757",
    };
  }

  // Check if only 1 space remaining
  if (currentParticipants === maxPlayers - 1) {
    return {
      status: "1 MORE SPACE",
      color: "#34C759", // Green
    };
  }

  // Check if not full yet
  if (currentParticipants < maxPlayers) {
    return {
      status: "ENLISTING", // Fixed typo from "ELISTING"
      color: "#FAB234",
    };
  }

  // Full
  return {
    status: "FULL",
    color: "#286EFA",
  };
};
