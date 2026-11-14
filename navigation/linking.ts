import type {
  LinkingOptions,
  NavigatorScreenParams,
  PathConfig,
} from "@react-navigation/native";

type HomeStackParams = {
  HomeMain: undefined;
  LadderPreRegistrationSignup: { preRegistrationId: string };
  Club: { clubId: string };
  League: { leagueId: string };
  Tournament: { tournamentId: string };
};

type TabParams = { Home: NavigatorScreenParams<HomeStackParams> };

type RootParams = { Tabs: NavigatorScreenParams<TabParams> };

const homeStack: PathConfig<HomeStackParams> = {
  initialRouteName: "HomeMain",
  screens: {
    LadderPreRegistrationSignup: {
      path: "join/ladder-pre-registration/:preRegistrationId",
      alias: ["preview/ladder-pre-registration/:preRegistrationId"],
    },
    Club: {
      path: "preview/club/:clubId",
      alias: ["join/club/:clubId"],
    },
    League: {
      path: "join/league/:leagueId",
      alias: ["preview/league/:leagueId"],
    },
    Tournament: {
      path: "join/tournament/:tournamentId",
      alias: ["preview/tournament/:tournamentId"],
    },
  },
};

/**
 * Links the app opens: the shared pre-registration, club, league and
 * tournament links on courtchamps.com (Universal Links, limited by the site's
 * apple-app-site-association; Android's intent filters in app.json) and the
 * same paths on the courtchamps:// scheme. Back from a linked screen goes to Home.
 */
export const linking: LinkingOptions<RootParams> = {
  prefixes: ["https://courtchamps.com", "courtchamps://"],
  config: {
    screens: {
      Tabs: {
        screens: {
          Home: homeStack,
        },
      },
    },
  },
};
