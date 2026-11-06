import { doc, getDoc, setDoc } from "firebase/firestore";
import { COMPETITION_TYPES, COLLECTION_NAMES } from "@shared";
import { db } from "../services/firebase.config";

export interface ChatSummary {
  id: string;
  competitionId?: string;
  competitionName?: string;
  competitionType?: string;
  leagueId?: string;
  leagueName?: string;
}

export const updateChatSummaries = async ({
  recipientIds,
  competitionId,
  competitionName,
  competitionType,
  lastMessage,
}: {
  recipientIds: string[];
  competitionId: string;
  competitionName: string;
  competitionType: string;
  lastMessage: string;
}) => {
  for (const recipientId of recipientIds) {
    const chatRef = doc(db, "users", recipientId, "chats", competitionId);
    const existing = await getDoc(chatRef);
    const summary = {
      isRead: false,
      lastMessage,
      createdAt: new Date(),
      competitionName,
      competitionType,
    };

    if (existing.exists()) {
      await setDoc(
        chatRef,
        { ...summary, messageCount: (existing.data().messageCount || 0) + 1 },
        { merge: true },
      );
    } else {
      await setDoc(chatRef, {
        ...summary,
        type: "chat",
        messageCount: 1,
        competitionId,
      });
    }
  }
};

export const chatCompetitionId = (chat: ChatSummary) =>
  chat.competitionId || chat.leagueId || chat.id;

export const chatCompetitionName = (chat: ChatSummary) =>
  chat.competitionName || chat.leagueName || "Chat";

export const chatCompetitionType = async (chat: ChatSummary) => {
  if (chat.competitionType) return chat.competitionType;
  if (chat.leagueId) return COMPETITION_TYPES.LEAGUE;
  const tournament = await getDoc(
    doc(db, COLLECTION_NAMES.tournaments, chatCompetitionId(chat)),
  );
  return tournament.exists()
    ? COMPETITION_TYPES.TOURNAMENT
    : COMPETITION_TYPES.LEAGUE;
};
