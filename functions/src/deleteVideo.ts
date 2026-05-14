import * as functions from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { COLLECTION_NAMES, COMPETITION_TYPES } from "@shared";
import { Game } from "@shared/types";

const R2_ACCOUNT_ID = defineSecret("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = defineSecret("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = defineSecret("R2_SECRET_ACCESS_KEY");
const R2_BUCKET_NAME = defineSecret("R2_BUCKET_NAME");
const R2_PUBLIC_URL = defineSecret("R2_PUBLIC_URL");

const R2_SECRETS = [
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET_NAME,
  R2_PUBLIC_URL,
];

interface DeleteVideoData {
  docId: string;
  videoUrl: string;
  gameId: string;
  competitionId: string;
  competitionType: string;
  requestingUserId: string;
}

export const deleteVideo = functions.https.onCall(
  { secrets: R2_SECRETS },
  async (request: functions.https.CallableRequest<DeleteVideoData>) => {
    const {
      docId,
      videoUrl,
      gameId,
      competitionId,
      competitionType,
      requestingUserId,
    } = request.data;

    if (!docId || !videoUrl || !gameId || !competitionId || !requestingUserId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields.",
      );
    }

    const db = admin.firestore();

    // ── Verify requesting user owns this video ────────────────────────────
    const videoDoc = await db
      .collection(COLLECTION_NAMES.gameVideos)
      .doc(docId)
      .get();

    if (!videoDoc.exists) {
      throw new functions.https.HttpsError("not-found", "Video not found.");
    }

    const videoData = videoDoc.data();
    if (videoData?.postedBy?.userId !== requestingUserId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You can only delete your own videos.",
      );
    }

    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID.value()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID.value(),
        secretAccessKey: R2_SECRET_ACCESS_KEY.value(),
      },
    });

    // ── 1. Delete R2 files (raw + compressed) ─────────────────────────────
    try {
      const videoKey = videoUrl.replace(`${R2_PUBLIC_URL.value()}/`, "");
      const rawKey = videoKey
        .replace("_compressed.mp4", ".mp4")
        .replace("_720p.mp4", ".mp4");
      const compressedKey =
        videoKey.includes("_compressed") || videoKey.includes("_720p")
          ? videoKey
          : null;

      await Promise.allSettled([
        r2Client.send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME.value(),
            Key: rawKey,
          }),
        ),
        compressedKey
          ? r2Client.send(
              new DeleteObjectCommand({
                Bucket: R2_BUCKET_NAME.value(),
                Key: compressedKey,
              }),
            )
          : Promise.resolve(),
      ]);
      console.log("[deleteVideo] R2 files deleted");
    } catch (error) {
      console.error("[deleteVideo] Failed to delete R2 files:", error);
    }

    // ── 2. Delete gameVideos doc ───────────────────────────────────────────
    await db.collection(COLLECTION_NAMES.gameVideos).doc(docId).delete();
    console.log("[deleteVideo] gameVideos doc deleted");

    // ── 3. Delete savedVideos docs referencing this video ─────────────────
    const savedSnap = await db
      .collection(COLLECTION_NAMES.savedVideos)
      .where("videoId", "==", docId)
      .get();

    await Promise.all(savedSnap.docs.map((doc) => doc.ref.delete()));
    console.log("[deleteVideo] savedVideos docs deleted:", savedSnap.size);

    // ── 4. Update competition document — decrement videoCount ─────────────
    const collectionName =
      competitionType === COMPETITION_TYPES.TOURNAMENT
        ? COLLECTION_NAMES.tournaments
        : COLLECTION_NAMES.leagues;

    const competitionRef = db.collection(collectionName).doc(competitionId);
    const competitionSnap = await competitionRef.get();

    if (competitionType === COMPETITION_TYPES.TOURNAMENT) {
      const fixtures = competitionSnap.data()?.fixtures ?? [];
      const updatedFixtures = fixtures.map(
        (round: { round: number; games: Game[] }) => ({
          ...round,
          games: round.games.map((game: Game) => {
            if (game.gameId !== gameId) return game;
            const newVideoCount = Math.max((game.videoCount ?? 1) - 1, 0);
            return {
              ...game,
              videoCount: newVideoCount,
            };
          }),
        }),
      );
      await competitionRef.update({ fixtures: updatedFixtures });
    } else {
      const games: Game[] = competitionSnap.data()?.games ?? [];
      const updatedGames = games.map((game) => {
        if (game.gameId !== gameId) return game;
        const newVideoCount = Math.max((game.videoCount ?? 1) - 1, 0);
        return {
          ...game,
          videoCount: newVideoCount,
          videoUrl: newVideoCount === 0 ? null : game.videoUrl,
          videoApproved: newVideoCount === 0 ? null : game.videoApproved,
        };
      });
      await competitionRef.update({ games: updatedGames });
    }

    console.log("[deleteVideo] Competition document updated");
    return { success: true };
  },
);
