import { decideLadderPlayoffTie } from "@shared";

const DAY_MS = 24 * 60 * 60 * 1000;

const startMs = (match) => {
  const [day, month, year] = match.matchDate.split("-").map(Number);
  const [hours, minutes] = match.matchTime.start.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes).getTime();
};

/**
 * What production data always satisfies, so a seed that breaks one is a test
 * that proves nothing: matches are played inside their tie's window, a settled
 * tie really was decided by its matches and finished when the last one did,
 * and a tie that has started has its matches.
 */
export const realWorldProblems = ({ ties, matches }) => {
  const problems = [];
  const legsOf = (tie) =>
    matches
      .filter((match) => match.playoffTieId === tie.tieId)
      .sort((a, b) => a.playoffLeg - b.playoffLeg);

  ties.forEach((tie) => {
    const legs = legsOf(tie);
    legs.forEach((leg) => {
      if (
        tie.scheduledAt &&
        startMs(leg) < tie.scheduledAt.getTime() - DAY_MS
      ) {
        problems.push(
          `${leg.ladderMatchId} is played before ${tie.tieId} started`,
        );
      }
      if (tie.deadlineAt && startMs(leg) > tie.deadlineAt.getTime()) {
        problems.push(
          `${leg.ladderMatchId} is played after ${tie.tieId}'s deadline`,
        );
      }
    });
    if (tie.status === "completed" && tie.outcome === "played") {
      const completed = legs.filter((leg) => leg.matchStatus === "completed");
      if (completed.length < 2) {
        problems.push(
          `${tie.tieId} has a winner but fewer than two completed matches`,
        );
        return;
      }
      const decision = decideLadderPlayoffTie(tie, legs);
      if (!decision.decided || decision.winner !== tie.winner) {
        problems.push(`${tie.tieId}'s matches don't decide ${tie.winner}`);
      }
      const lastCompletedAt = Math.max(
        ...completed.map((leg) => leg.completedAt.getTime()),
      );
      if (Math.abs(tie.completedAt.getTime() - lastCompletedAt) > 60 * 1000) {
        problems.push(
          `${tie.tieId} finished at a different time from its last match`,
        );
      }
    }
    if (tie.status === "scheduled" && legs.length) {
      const decision = decideLadderPlayoffTie(tie, legs);
      if (decision.decided) {
        problems.push(
          `${tie.tieId} is scheduled but its matches already decide it`,
        );
      }
    }
  });

  ties
    .filter((tie) => tie.status === "scheduled" && tie.round > 1)
    .forEach((tie) => {
      const feeders = ties.filter((feeder) =>
        !tie.isThirdPlacePlayoff
          ? feeder.round === tie.round - 1 &&
            !feeder.isThirdPlacePlayoff &&
            Math.floor(feeder.slot / 2) === tie.slot
          : feeder.round === tie.round - 1 && !feeder.isThirdPlacePlayoff,
      );
      const finished = Math.max(
        ...feeders.map((feeder) => feeder.completedAt?.getTime() ?? 0),
      );
      if (Math.abs(tie.scheduledAt.getTime() - finished) > 60 * 1000) {
        problems.push(
          `${tie.tieId} started at a different time from its feeders finishing`,
        );
      }
    });
  return problems;
};
