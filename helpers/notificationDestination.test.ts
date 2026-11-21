import { notificationTypes } from "@shared";
import {
  getNotificationDestination,
  openPushNotification,
} from "./notificationDestination";

const pushTarget = (data: Record<string, unknown>) => {
  const dispatch = jest.fn();
  openPushNotification({ dispatch }, data);
  return dispatch.mock.calls[0][0].payload;
};

describe("getNotificationDestination", () => {
  it("opens the club a club notice is about", () => {
    expect(
      getNotificationDestination(notificationTypes.INFORMATION.CLUB.TYPE, {
        clubId: "club-1",
      }),
    ).toEqual({ route: "Club", params: { clubId: "club-1" } });
  });

  it("opens a league on its scoreboard", () => {
    expect(
      getNotificationDestination(notificationTypes.INFORMATION.LEAGUE.TYPE, {
        leagueId: "league-1",
      }),
    ).toEqual({
      route: "League",
      params: { leagueId: "league-1", tab: "Scoreboard" },
    });
  });

  it("has no destination without the id it needs, or for an action", () => {
    expect(
      getNotificationDestination(notificationTypes.INFORMATION.CLUB.TYPE, {}),
    ).toBeNull();
    expect(
      getNotificationDestination(notificationTypes.ACTION.INVITE.CLUB, {
        clubId: "club-1",
      }),
    ).toBeNull();
  });
});

describe("openPushNotification", () => {
  it("opens a tournament from its push, above the Competitions list", () => {
    expect(
      pushTarget({
        type: notificationTypes.INFORMATION.TOURNAMENT.TYPE,
        tournamentId: "t-1",
      }),
    ).toEqual({
      name: "Competitions",
      params: {
        screen: "Tournament",
        params: { tournamentId: "t-1" },
        initial: false,
      },
    });
  });

  it("opens Notifications for an invite, a join request or a game to approve", () => {
    for (const type of [
      notificationTypes.ACTION.INVITE.CLUB,
      notificationTypes.ACTION.INVITE.LEAGUE,
      notificationTypes.ACTION.JOIN_REQUEST.CLUB,
      notificationTypes.ACTION.ADD_GAME.LEAGUE,
    ]) {
      expect(
        pushTarget({ type, clubId: "c", leagueId: "l" }).params.screen,
      ).toBe("Notifications");
    }
  });

  it("opens Notifications for an app notice or a screen that is not above Competitions", () => {
    expect(
      pushTarget({ type: notificationTypes.INFORMATION.APP.TYPE }).params
        .screen,
    ).toBe("Notifications");
    expect(
      pushTarget({
        type: notificationTypes.INFORMATION.LADDER.TYPE,
        ladderId: "x",
      }).params.screen,
    ).toBe("Notifications");
  });
});
