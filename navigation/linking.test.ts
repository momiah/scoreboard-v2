import { getStateFromPath } from "@react-navigation/native";
import { linking } from "./linking";

type Route = { name: string; params?: Record<string, unknown>; state?: State };
type State = { routes: Route[] };

const homeRoutes = (path: string) => {
  const state = getStateFromPath(path, linking.config) as State | undefined;
  const tabs = state?.routes[0];
  const home = tabs?.state?.routes[0];
  return { tabs, home, stack: home?.state?.routes ?? [] };
};

describe("linking", () => {
  it("opens a shared join link on the pre-registration screen, above Home", () => {
    const { tabs, home, stack } = homeRoutes(
      "/join/ladder-pre-registration/launch-cash-mens-doubles",
    );
    expect(tabs?.name).toBe("Tabs");
    expect(home?.name).toBe("Home");
    expect(stack.map((route) => route.name)).toEqual([
      "HomeMain",
      "LadderPreRegistrationSignup",
    ]);
    expect(stack[1].params).toEqual({
      preRegistrationId: "launch-cash-mens-doubles",
    });
  });

  it("treats the preview link the same", () => {
    const { stack } = homeRoutes(
      "/preview/ladder-pre-registration/launch-community-singles",
    );
    expect(stack[stack.length - 1]).toMatchObject({
      name: "LadderPreRegistrationSignup",
      params: { preRegistrationId: "launch-community-singles" },
    });
  });

  it.each([
    ["/preview/club/club-1", "Club", { clubId: "club-1" }],
    ["/join/club/club-1", "Club", { clubId: "club-1" }],
    ["/join/league/league-1", "League", { leagueId: "league-1" }],
    ["/preview/league/league-1", "League", { leagueId: "league-1" }],
    ["/join/tournament/t-1", "Tournament", { tournamentId: "t-1" }],
    ["/preview/tournament/t-1", "Tournament", { tournamentId: "t-1" }],
  ])("opens %s on the %s screen, above Home", (path, name, params) => {
    const { stack } = homeRoutes(path);
    expect(stack.map((route) => route.name)).toEqual(["HomeMain", name]);
    expect(stack[1].params).toEqual(params);
  });

  it("leaves unknown paths to Home", () => {
    const { stack } = homeRoutes("/preview/video/v-1");
    expect(stack.map((route) => route.name)).not.toContain("Club");
  });

  it("covers both the site and the app scheme", () => {
    expect(linking.prefixes).toEqual([
      "https://courtchamps.com",
      "courtchamps://",
    ]);
  });
});
