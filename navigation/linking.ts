import type {
  LinkingOptions,
  NavigatorScreenParams,
  PathConfig,
} from "@react-navigation/native";

type HomeStackParams = {
  HomeMain: undefined;
  LadderPreRegistrationSignup: { preRegistrationId: string };
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
  },
};

/**
 * Links the app opens: the shared pre-registration links on courtchamps.com
 * (Universal Links, limited by the site's apple-app-site-association) and the
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
