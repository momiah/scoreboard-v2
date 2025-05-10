import { getPlayerRankInLeague } from "./getPlayerRankInLeague";

export const processLeagues = ({
  userLeagues,
  setRankData,
  setRankLoading,
  profile,
}) => {
  const processed = userLeagues.map((league) => {
    const rank = getPlayerRankInLeague(league, profile.userId);
    const participant = league.leagueParticipants?.find(
      (p) => p.userId === profile.userId
    );
    const wins = participant ? participant.numberOfWins : 0;
    return { ...league, userRank: rank, wins };
  });
  setRankData(processed);
  setRankLoading(false);
};
