import React from "react";
import CompetitionPerformance from "./CompetitionPerformance";
import { MOCK_LEAGUE_PERFORMANCE, USE_MOCK_DATA } from "../../mockClubData";

interface LeaguePerformanceProps {
  clubId: string;
}

const LeaguePerformance: React.FC<LeaguePerformanceProps> = ({ clubId }) => (
  <CompetitionPerformance
    clubId={clubId}
    type="league"
    mockData={USE_MOCK_DATA ? MOCK_LEAGUE_PERFORMANCE : undefined}
  />
);

export default LeaguePerformance;
