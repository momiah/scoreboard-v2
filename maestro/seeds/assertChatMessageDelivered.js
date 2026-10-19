import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../services/firebase.config";

export const assertChatMessageDelivered = async ({
  ladderId,
  matchId,
  recipientId,
  text,
}) => {
  const messages = await getDocs(
    collection(db, "ladders", ladderId, "ladderMatches", matchId, "chat"),
  );
  const sent = messages.docs
    .map((d) => d.data())
    .find((data) => data.text === text && data.user?._id !== recipientId);
  if (!sent) throw new Error(`Chat message "${text}" was not stored`);
  const chat = await getDoc(doc(db, "users", recipientId, "chats", matchId));
  if (!chat.exists()) throw new Error("Recipient has no chat entry");
  const { isRead, lastMessage, competitionType, ladderId: storedLadderId } =
    chat.data();
  if (competitionType !== "ladder" || storedLadderId !== ladderId) {
    throw new Error(
      `Chat entry cannot be routed back to the match: ${JSON.stringify(chat.data())}`,
    );
  }
  if (isRead !== false || !String(lastMessage ?? "").includes(text)) {
    throw new Error(`Recipient chat entry is wrong: ${JSON.stringify(chat.data())}`);
  }
  return { delivered: true };
};
