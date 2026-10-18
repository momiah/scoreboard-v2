import { useContext, useEffect, useMemo, useState } from "react";

import { getDisqualification, disqualificationDisclaimer } from "@shared/helpers";

import { LadderContext } from "../context/LadderContext";

interface LadderDisqualificationState {
  loading: boolean;
  disqualified: boolean;
  disclaimer?: string;
}

export const useLadderDisqualification = (
  ladderId?: string,
  userIds: string[] = [],
): LadderDisqualificationState => {
  const { fetchLadderReportCounts } = useContext(LadderContext);
  const key = useMemo(
    () => Array.from(new Set(userIds.filter(Boolean))).sort().join(","),
    [userIds],
  );
  const [state, setState] = useState<LadderDisqualificationState>({
    loading: false,
    disqualified: false,
  });

  useEffect(() => {
    if (!ladderId || !key) {
      setState({ loading: false, disqualified: false });
      return;
    }
    let active = true;
    setState((prev) => ({ ...prev, loading: true }));
    (async () => {
      try {
        const counts = await fetchLadderReportCounts(ladderId, key.split(","));
        let disqualified = false;
        let reason;
        for (const strikes of Object.values(counts)) {
          const result = getDisqualification(strikes);
          if (result.disqualified) {
            disqualified = true;
            reason = reason ?? result.primaryReason;
          }
        }
        if (active) {
          setState({
            loading: false,
            disqualified,
            disclaimer: disqualified
              ? disqualificationDisclaimer(reason)
              : undefined,
          });
        }
      } catch (error) {
        console.error("Error deriving ladder disqualification:", error);
        if (active) setState({ loading: false, disqualified: false });
      }
    })();
    return () => {
      active = false;
    };
  }, [ladderId, key, fetchLadderReportCounts]);

  return state;
};
