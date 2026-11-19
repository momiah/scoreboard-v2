import { Share } from "react-native";
import { COURT_CHAMPS_SITE_URL } from "@shared/helpers";

export const getClubShareUrl = (clubId: string) =>
  `${COURT_CHAMPS_SITE_URL}/preview/club/${encodeURIComponent(clubId)}`;

export const getCompetitionShareUrl = (
  type: "league" | "tournament",
  competitionId: string,
) =>
  `${COURT_CHAMPS_SITE_URL}/preview/${type}/${encodeURIComponent(competitionId)}`;

export const getVideoShareUrl = (videoDocId: string) =>
  `${COURT_CHAMPS_SITE_URL}/og/videos?v=${encodeURIComponent(videoDocId)}`;

export const buildSharePayload = (text: string, url: string) => ({
  message: `${text}\n\n${url}`,
});

export const shareLink = async (text: string, url: string) => {
  try {
    await Share.share(buildSharePayload(text, url));
  } catch (error) {
    console.error("Error sharing:", error);
  }
};
