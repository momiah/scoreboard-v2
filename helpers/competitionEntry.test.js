import moment from "moment";
import {
  competitionClosedMessage,
  getCompetitionClosedReason,
  getCompetitionDocClosedReason,
  hasCompetitionEnded,
} from "./competitionEntry";

const day = (offset) => moment().add(offset, "days").format("DD-MM-YYYY");

describe("competition entry", () => {
  it("an end date is open until the end of that day", () => {
    expect(hasCompetitionEnded(day(0))).toBe(false);
    expect(hasCompetitionEnded(day(-1))).toBe(true);
    expect(hasCompetitionEnded(undefined)).toBe(false);
  });

  it("is open with space and time left", () => {
    expect(getCompetitionClosedReason({ participantCount: 7, maxPlayers: 8, endDate: day(5) })).toBeNull();
  });

  it("is full at max players", () => {
    expect(getCompetitionClosedReason({ participantCount: 8, maxPlayers: 8, endDate: day(5) })).toBe("full");
  });

  it("ended wins over full, then fixtures", () => {
    expect(getCompetitionClosedReason({ participantCount: 8, maxPlayers: 8, endDate: day(-1) })).toBe("ended");
    expect(
      getCompetitionClosedReason({ participantCount: 2, maxPlayers: 8, endDate: day(5), fixturesGenerated: true }),
    ).toBe("fixtures");
  });

  it("reads league and tournament docs", () => {
    const people = (n) => Array.from({ length: n }, (_, i) => ({ userId: `u${i}` }));
    expect(getCompetitionDocClosedReason({ leagueParticipants: people(8), maxPlayers: 8, endDate: day(3) }, true)).toBe("full");
    expect(getCompetitionDocClosedReason({ tournamentParticipants: people(4), maxPlayers: 8, endDate: day(3) }, false)).toBeNull();
  });

  it("says why", () => {
    expect(competitionClosedMessage("full", "league")).toBe("This league is full");
    expect(competitionClosedMessage("ended", "tournament")).toBe("This tournament has ended");
  });
});
