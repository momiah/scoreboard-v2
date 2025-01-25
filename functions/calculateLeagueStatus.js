import moment from "moment";

export const calculateLeagueStatus = (leagueDetails) => {
  const leagueParticipants = leagueDetails?.leagueParticipants;
  const privacy = leagueDetails?.privacy;
  const endDate = leagueDetails?.endDate;
  const maxPlayers = leagueDetails?.maxPlayers;
  const todaysDate = moment().format("DD-MM-YYYY");

  if (privacy === "Private") {
    return {
      status: "Private",
      color: "#FF4757",
    };
  }

  if (todaysDate >= endDate) {
    return {
      status: "ENDED",
      color: "#FF4757",
    };
  }

  if (!leagueParticipants || leagueParticipants.length < maxPlayers) {
    return {
      status: "ELISTING",
      color: "#FAB234",
    };
  }

  return {
    status: "FULL",
    color: "#286EFA",
  };
};
