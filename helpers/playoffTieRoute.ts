interface NotificationData {
  ladderId?: string;
  tieId?: string;
  tab?: string;
}

export interface PlayoffTieRoute {
  name: "PlayoffMatchDetails";
  params: { ladderId: string; tieId: string };
}

/**
 * Where a notification about one playoff tie opens: the tie screen itself.
 * One that is about the tie but belongs on another tab (a placing opens
 * Summary) keeps its tab.
 */
export const getPlayoffTieRoute = (
  data: NotificationData | null | undefined,
): PlayoffTieRoute | null =>
  data?.ladderId && data?.tieId && data?.tab === "Playoffs"
    ? {
        name: "PlayoffMatchDetails",
        params: { ladderId: data.ladderId, tieId: data.tieId },
      }
    : null;
