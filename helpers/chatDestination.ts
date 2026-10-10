export type ChatCompetitionType = "league" | "tournament" | "ladder";

export interface ChatSummary {
  id?: string;
  competitionId?: string;
  competitionName?: string;
  competitionType?: string;
  ladderId?: string;
  leagueId?: string;
  leagueName?: string;
}

export type ChatDestination =
  | { route: "League"; params: { leagueId: string; tab: "Chat Room" } }
  | {
      route: "Tournament";
      params: { tournamentId: string; tab: "Chat Room" };
    }
  | {
      route: "MatchDetails";
      params: { ladderId: string; matchId: string; tab: "Chat Room" };
    };

export const getChatCompetitionId = (chat: ChatSummary): string =>
  chat.competitionId ?? chat.leagueId ?? chat.id ?? "";

export const getChatName = (chat: ChatSummary): string =>
  chat.competitionName ?? chat.leagueName ?? "Chat";

export const getChatDestination = (
  chat: ChatSummary,
): ChatDestination | null => {
  const competitionId = getChatCompetitionId(chat);
  if (!competitionId) return null;
  if (chat.competitionType === "league") {
    return {
      route: "League",
      params: { leagueId: competitionId, tab: "Chat Room" },
    };
  }
  if (chat.competitionType === "tournament") {
    return {
      route: "Tournament",
      params: { tournamentId: competitionId, tab: "Chat Room" },
    };
  }
  if (chat.competitionType === "ladder" && chat.ladderId) {
    return {
      route: "MatchDetails",
      params: {
        ladderId: chat.ladderId,
        matchId: competitionId,
        tab: "Chat Room",
      },
    };
  }
  return null;
};

export const legacyChatDestination = (
  competitionId: string,
  existsIn: { league: boolean; tournament: boolean },
): ChatDestination | null => {
  if (existsIn.league) {
    return {
      route: "League",
      params: { leagueId: competitionId, tab: "Chat Room" },
    };
  }
  if (existsIn.tournament) {
    return {
      route: "Tournament",
      params: { tournamentId: competitionId, tab: "Chat Room" },
    };
  }
  return null;
};
