import { CommonActions } from "@react-navigation/native";
import { notificationTypes } from "@shared";

type NotificationData = Record<string, unknown> | undefined;

export type NotificationDestination = {
  route: string;
  params: Record<string, unknown>;
};

const routeParams = (
  route: string,
  data: NotificationData,
): Record<string, unknown> | null => {
  const value = (key: string) => data?.[key] as string | undefined;
  switch (route) {
    case "League": {
      const leagueId = value("leagueId") || value("competitionId");
      return leagueId ? { leagueId, tab: "Scoreboard" } : null;
    }
    case "Tournament": {
      const tournamentId = value("tournamentId") || value("competitionId");
      return tournamentId ? { tournamentId } : null;
    }
    case "Club": {
      const clubId = value("clubId");
      return clubId ? { clubId } : null;
    }
    case "UserProfile": {
      const userId = value("userId");
      return userId ? { userId, tab: value("tab") } : null;
    }
    case "GameScreen":
      return value("gameId")
        ? {
            gameId: data?.gameId,
            competitionId: data?.competitionId,
            competitionType: data?.competitionType,
            competitionName: data?.competitionName,
            gamescore: data?.gamescore,
            date: data?.date,
            team1: data?.team1,
            team2: data?.team2,
          }
        : null;
    default:
      return {};
  }
};

export const getNotificationDestination = (
  type: string | undefined,
  data: NotificationData,
): NotificationDestination | null => {
  const infoEntry = Object.values(notificationTypes.INFORMATION).find(
    (entry) => entry.TYPE === type,
  );
  if (!infoEntry) return null;
  const params = routeParams(infoEntry.ROUTE, data);
  return params ? { route: infoEntry.ROUTE, params } : null;
};

const PUSH_ROUTES = [
  "League",
  "Tournament",
  "Club",
  "UserProfile",
  "GameScreen",
];

type Dispatcher = {
  dispatch: (action: ReturnType<typeof CommonActions.navigate>) => void;
};

/**
 * Opens what a tapped push notification is about: an information
 * notification opens its competition, club, profile or game; anything that
 * needs an answer (invites, join requests, games to approve) opens the
 * Notifications screen. Both sit above the Competitions list.
 */
export const openPushNotification = (
  navigation: Dispatcher,
  data: NotificationData,
) => {
  const destination = getNotificationDestination(
    data?.type as string | undefined,
    data,
  );
  const screen =
    destination && PUSH_ROUTES.includes(destination.route)
      ? destination
      : { route: "Notifications", params: {} };

  navigation.dispatch(
    CommonActions.navigate("Competitions", {
      screen: screen.route,
      params: screen.params,
      initial: false,
    }),
  );
};
