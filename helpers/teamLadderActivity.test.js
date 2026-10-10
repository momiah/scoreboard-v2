import { LADDER_MATCH_STATUS, LADDER_STATUS } from "@shared/types";
import {
  isLadderFinished,
  isTeamLockedInLadder,
  teamHasCompletedLadderGame,
  teamHasOpenLadderMatch,
} from "./teamLadderActivity";

describe("teamHasCompletedLadderGame", () => {
  const teamIds = ["u1", "u2"];
  const game = (approvalStatus) => ({ approvalStatus });
  const match = (participants, games = []) => ({ participants, games });

  it("is false with no matches", () => {
    expect(teamHasCompletedLadderGame([], teamIds)).toBe(false);
  });

  it("is false for posted or accepted matches with no approved game", () => {
    expect(
      teamHasCompletedLadderGame(
        [
          match(["u1", "u2", "u3", "u4"]),
          match(["u1", "u2", "u3", "u4"], [game("Pending"), game("Scheduled")]),
        ],
        teamIds,
      ),
    ).toBe(false);
  });

  it("is true once one of the team's matches has an approved game", () => {
    expect(
      teamHasCompletedLadderGame(
        [match(["u2", "u5", "u3", "u4"], [game("approved")])],
        teamIds,
      ),
    ).toBe(true);
  });

  it("ignores approved games in other teams' matches", () => {
    expect(
      teamHasCompletedLadderGame(
        [match(["u5", "u6", "u7", "u8"], [game("approved")])],
        teamIds,
      ),
    ).toBe(false);
  });

  it("is false with no members", () => {
    expect(
      teamHasCompletedLadderGame([match(["u1"], [game("approved")])], []),
    ).toBe(false);
  });
});

describe("isLadderFinished", () => {
  it("is true only for completed or cancelled ladders", () => {
    expect(isLadderFinished({ status: LADDER_STATUS.COMPLETED })).toBe(true);
    expect(isLadderFinished({ status: LADDER_STATUS.CANCELLED })).toBe(true);
    expect(isLadderFinished({ status: LADDER_STATUS.REGISTRATION_OPEN })).toBe(
      false,
    );
    expect(isLadderFinished({ status: LADDER_STATUS.PLAYOFFS })).toBe(false);
  });
});

describe("isTeamLockedInLadder", () => {
  const ladder = (status) => ({ status });

  it("lets a team leave while registration is open", () => {
    expect(isTeamLockedInLadder([ladder(LADDER_STATUS.REGISTRATION_OPEN)])).toBe(
      false,
    );
  });

  it("locks a team once registration has closed or playoffs are on", () => {
    expect(
      isTeamLockedInLadder([ladder(LADDER_STATUS.REGISTRATION_CLOSED)]),
    ).toBe(true);
    expect(isTeamLockedInLadder([ladder(LADDER_STATUS.PLAYOFFS)])).toBe(true);
  });

  it("frees a team once the ladder is completed or cancelled", () => {
    expect(
      isTeamLockedInLadder([
        ladder(LADDER_STATUS.COMPLETED),
        ladder(LADDER_STATUS.CANCELLED),
      ]),
    ).toBe(false);
  });

  it("locks when any of the team's ladders has closed", () => {
    expect(
      isTeamLockedInLadder([
        ladder(LADDER_STATUS.REGISTRATION_OPEN),
        ladder(LADDER_STATUS.REGISTRATION_CLOSED),
      ]),
    ).toBe(true);
    expect(isTeamLockedInLadder([])).toBe(false);
  });
});

describe("teamHasOpenLadderMatch", () => {
  const teamIds = ["u1", "u2"];
  const match = (matchStatus, participants) => ({ matchStatus, participants });

  it("is true for a posted match the team is in", () => {
    expect(
      teamHasOpenLadderMatch(
        [match(LADDER_MATCH_STATUS.POSTED, ["u1", "u2"])],
        teamIds,
      ),
    ).toBe(true);
  });

  it("is true for an accepted match the team is in", () => {
    expect(
      teamHasOpenLadderMatch(
        [match(LADDER_MATCH_STATUS.ACCEPTED, ["u3", "u4", "u2", "u1"])],
        teamIds,
      ),
    ).toBe(true);
  });

  it("ignores cancelled, expired and completed matches", () => {
    expect(
      teamHasOpenLadderMatch(
        [
          match(LADDER_MATCH_STATUS.CANCELLED, ["u1", "u2"]),
          match(LADDER_MATCH_STATUS.EXPIRED, ["u1", "u2"]),
          match(LADDER_MATCH_STATUS.COMPLETED, ["u1", "u2"]),
        ],
        teamIds,
      ),
    ).toBe(false);
  });

  it("ignores other teams' open matches", () => {
    expect(
      teamHasOpenLadderMatch(
        [match(LADDER_MATCH_STATUS.POSTED, ["u5", "u6"])],
        teamIds,
      ),
    ).toBe(false);
  });
});
