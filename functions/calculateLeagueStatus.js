import moment from "moment";

export const calculateLeagueStatus = (leagueDetails) => {
  const leagueParticipants = leagueDetails?.leagueParticipants;
  const privacy = leagueDetails?.privacy;
  const endDate = leagueDetails?.endDate;
  const maxPlayers = leagueDetails?.maxPlayers;
  const today = moment(); // current date as moment object
  const end = moment(endDate, "DD-MM-YYYY"); // parse endDate as moment

  console.log("endDate", end.format("DD-MM-YYYY"));
  console.log("todaysDate", today.format("DD-MM-YYYY"));

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

// console.log("todaysDate >= endDate", todaysDate >= endDate);
