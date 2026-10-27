import React, { useEffect, useState } from "react";

import { LADDER_MATCH_STATUS } from "@shared";
import type { LadderMatch } from "@shared/types";

import type { LadderSeasonClose } from "../../hooks/useLadderSeasonClose";
import MatchRequestBanner from "./MatchRequestBanner";

const MINUTE_MS = 60 * 1000;

export const formatTimeUntil = (ms: number): string => {
  const minutes = Math.max(1, Math.ceil(ms / MINUTE_MS));
  const days = Math.floor(minutes / (24 * 60));
  const hours = Math.floor((minutes % (24 * 60)) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
};

interface ResultsCloseBannerProps {
  match: LadderMatch;
  seasonClose: LadderSeasonClose;
}

const ResultsCloseBanner: React.FC<ResultsCloseBannerProps> = ({
  match,
  seasonClose,
}) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(timer);
  }, []);

  const { postingDeadline, resultsDeadline } = seasonClose;
  if (
    match.playoffTieId ||
    match.matchStatus !== LADDER_MATCH_STATUS.ACCEPTED ||
    !postingDeadline ||
    !resultsDeadline ||
    now < postingDeadline.getTime()
  ) {
    return null;
  }

  const message =
    now < resultsDeadline.getTime()
      ? `Ladder results close in ${formatTimeUntil(resultsDeadline.getTime() - now)}. Finish and report your games before then.`
      : "Ladder results have closed for the playoffs. Games already reported can still be approved.";

  return (
    <MatchRequestBanner testID="results-close" message={message} awaiting />
  );
};

export default ResultsCloseBanner;
