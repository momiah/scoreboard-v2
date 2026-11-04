import moment from "moment";

export type CompetitionClosedReason = "ended" | "full" | "fixtures";

type EntryState = {
  participantCount: number;
  maxPlayers?: number;
  endDate?: string;
  fixturesGenerated?: boolean;
};

export const hasCompetitionEnded = (endDate?: string): boolean =>
  !!endDate && moment(endDate, "DD-MM-YYYY").endOf("day").isBefore(moment());

// Why nobody new can join (by invite or request), or null while it is open.
export const getCompetitionClosedReason = ({
  participantCount,
  maxPlayers,
  endDate,
  fixturesGenerated,
}: EntryState): CompetitionClosedReason | null => {
  if (hasCompetitionEnded(endDate)) return "ended";
  if (fixturesGenerated) return "fixtures";
  if (maxPlayers !== undefined && participantCount >= maxPlayers) {
    return "full";
  }
  return null;
};

export const getCompetitionDocClosedReason = (
  data: Record<string, unknown>,
  isLeague: boolean,
): CompetitionClosedReason | null =>
  getCompetitionClosedReason({
    participantCount: (
      (data[isLeague ? "leagueParticipants" : "tournamentParticipants"] ||
        []) as unknown[]
    ).length,
    maxPlayers: data.maxPlayers as number | undefined,
    endDate: data.endDate as string | undefined,
    fixturesGenerated: data.fixturesGenerated as boolean | undefined,
  });

export const competitionClosedMessage = (
  reason: CompetitionClosedReason,
  competitionType: string,
): string =>
  ({
    ended: `This ${competitionType} has ended`,
    full: `This ${competitionType} is full`,
    fixtures: `This ${competitionType} has already started`,
  })[reason];
