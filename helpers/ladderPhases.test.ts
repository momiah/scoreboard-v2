import { LADDER_STATUS, deriveLadderDates } from "@shared";
import type { Ladder } from "@shared/types";
import { getLadderPhases } from "./ladderPhases";

const registrationOpensAt = new Date(2026, 10, 1, 9, 0);
const dates = deriveLadderDates(registrationOpensAt);
const ladder = { registrationOpensAt, ...dates } as unknown as Ladder;

const windowFor = (target: Ladder, status: string) => {
  const phase = getLadderPhases(target).find((p) => p.status === status);
  return [phase?.start?.toDate() ?? null, phase?.end?.toDate() ?? null];
};

describe("getLadderPhases", () => {
  it("keeps registration open until registration closes", () => {
    expect(windowFor(ladder, LADDER_STATUS.REGISTRATION_OPEN)).toEqual([
      registrationOpensAt,
      dates.registrationClosesAt,
    ]);
  });

  it("runs registration closed from registration close to playoffs", () => {
    expect(windowFor(ladder, LADDER_STATUS.REGISTRATION_CLOSED)).toEqual([
      dates.registrationClosesAt,
      dates.playoffStartsAt,
    ]);
  });

  it("leaves the playoffs open-ended until they complete", () => {
    expect(windowFor(ladder, LADDER_STATUS.PLAYOFFS)).toEqual([
      dates.playoffStartsAt,
      null,
    ]);
    expect(windowFor(ladder, LADDER_STATUS.COMPLETED)).toEqual([null, null]);
  });

  it("ends the playoffs when they complete", () => {
    const playoffsCompletedAt = new Date(2027, 2, 20);
    const completed = { ...ladder, playoffsCompletedAt } as Ladder;
    expect(windowFor(completed, LADDER_STATUS.PLAYOFFS)).toEqual([
      dates.playoffStartsAt,
      playoffsCompletedAt,
    ]);
    expect(windowFor(completed, LADDER_STATUS.COMPLETED)).toEqual([
      playoffsCompletedAt,
      null,
    ]);
  });
});
