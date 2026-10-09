import {
  getChatCompetitionId,
  getChatDestination,
  getChatName,
  legacyChatDestination,
} from "./chatDestination";

describe("getChatDestination", () => {
  it("opens a league chat on the league's Chat Room", () => {
    expect(
      getChatDestination({ competitionId: "L1", competitionType: "league" }),
    ).toEqual({ route: "League", params: { leagueId: "L1", tab: "Chat Room" } });
  });

  it("opens a tournament chat on the tournament, not the league screen", () => {
    expect(
      getChatDestination({ competitionId: "T1", competitionType: "tournament" }),
    ).toEqual({
      route: "Tournament",
      params: { tournamentId: "T1", tab: "Chat Room" },
    });
  });

  it("opens a ladder match chat on the match's Chat Room", () => {
    expect(
      getChatDestination({
        competitionId: "M1",
        competitionType: "ladder",
        ladderId: "LAD",
      }),
    ).toEqual({
      route: "MatchDetails",
      params: { ladderId: "LAD", matchId: "M1", tab: "Chat Room" },
    });
  });

  it("cannot route a ladder chat that does not know its ladder, or an untyped chat", () => {
    expect(
      getChatDestination({ competitionId: "M1", competitionType: "ladder" }),
    ).toBeNull();
    expect(getChatDestination({ competitionId: "X" })).toBeNull();
    expect(getChatDestination({})).toBeNull();
  });

  it("reads old chat entries that only have leagueId and leagueName", () => {
    const legacy = { id: "L9", leagueId: "L9", leagueName: "Old League" };
    expect(getChatCompetitionId(legacy)).toBe("L9");
    expect(getChatName(legacy)).toBe("Old League");
  });

  it("prefers the new fields and falls back to the document id", () => {
    expect(
      getChatCompetitionId({ id: "doc", competitionId: "C", leagueId: "L" }),
    ).toBe("C");
    expect(getChatCompetitionId({ id: "doc" })).toBe("doc");
    expect(getChatName({})).toBe("Chat");
  });
});

describe("legacyChatDestination", () => {
  it("resolves an untyped chat by which competition exists", () => {
    expect(legacyChatDestination("X", { league: true, tournament: false })).toEqual({
      route: "League",
      params: { leagueId: "X", tab: "Chat Room" },
    });
    expect(legacyChatDestination("X", { league: false, tournament: true })).toEqual({
      route: "Tournament",
      params: { tournamentId: "X", tab: "Chat Room" },
    });
    expect(legacyChatDestination("X", { league: false, tournament: false })).toBeNull();
  });
});
