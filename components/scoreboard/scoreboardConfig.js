//

export const getButtonConfig = (
  userRole,
  leagueState,
  requestSend,
  handleRequestSend,
  handleAddGame,
  handleLogin
) => {
  const baseConfig = {
    hide: {
      not_started: {
        text: "Login to join league",
        disabled: false,
        action: () => handleLogin(),
      },
      started: {
        text: "Login to join league",
        disabled: false,
        action: () => handleLogin(),
      },
      ended: { text: "League has ended", disabled: true, action: null },
    },
    user: {
      not_started: {
        text: requestSend ? "Request sent successfully" : "Request To Join",
        disabled: requestSend,
        action: () => handleRequestSend(),
      },
      started: {
        text: requestSend ? "Request sent successfully" : "Request To Join",
        disabled: requestSend,
        action: () => handleRequestSend(),
      },
      ended: { text: "League has ended", disabled: true, action: null },
    },
    participant: {
      not_started: {
        text: "League not started",
        disabled: true,
        action: null,
      },
      started: { text: "Add Game", disabled: false, action: handleAddGame },
      ended: { text: "League has ended", disabled: true, action: null },
    },
    admin: {
      not_started: { text: "Add Game", disabled: true, action: null },
      started: { text: "Add Game", disabled: false, action: handleAddGame },
      ended: { text: "League has ended", disabled: true, action: null },
    },
    requestPending: {
      not_started: {
        text: "Request Pending",
        disabled: true,
        action: null,
      },
      started: {
        text: "Request Pending",
        disabled: true,
        action: null,
      },
      ended: {
        text: "League has ended",
        disabled: true,
        action: null,
      },
    },
    invitationPending: {
      not_started: {
        text: "Invitation Pending",
        disabled: true,
        action: null,
      },
      started: {
        text: "Invitation Pending",
        disabled: true,
        action: null,
      },
      ended: {
        text: "League has ended",
        disabled: true,
        action: null,
      },
    },
  };

  return baseConfig[userRole]?.[leagueState] || {};
};

export const getFallbackMessage = (leagueState, gamesExist, userRole) => {
  if (leagueState === "not_started") return "League has not started";
  if (leagueState === "ended")
    return gamesExist ? null : "No games were added to this league";
  if (!gamesExist) {
    return ["participant", "admin"].includes(userRole)
      ? "Add a game to see scores 🚀"
      : "No games have been added yet";
  }
  return null;
};
