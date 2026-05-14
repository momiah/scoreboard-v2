import * as functions from "firebase-functions";
import { defineSecret } from "firebase-functions/params";
import * as admin from "firebase-admin";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Game, GameVideo, GameVideoUploadPayload } from "@shared/types";
import { COLLECTION_NAMES, COMPETITION_TYPES } from "@shared";
import { sendNotification } from "./helpers/sendNotification";

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

const PROJECT_ID = "scoreboard-app-29148";
const REGION = "us-central1";
const TRANSCODE_FUNCTION_URL = `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/transcodeVideo`;

// ─── Helper: trigger transcodeVideo fire-and-forget ───────────────────────────

const triggerTranscode = async (payload: {
  docId: string;
  rawVideoUrl: string;
  rawKey: string;
}) => {
  try {
    const { GoogleAuth } = require("google-auth-library");
    const auth = new GoogleAuth();
    const client = await auth.getIdTokenClient(TRANSCODE_FUNCTION_URL);
    await client.request({
      url: TRANSCODE_FUNCTION_URL,
      method: "POST",
      data: { data: payload },
      headers: { "Content-Type": "application/json" },
    });
    console.log("[videoFunctions] Transcoding triggered for:", payload.docId);
  } catch (error) {
    console.error("[videoFunctions] Failed to trigger transcoding:", error);
    // Non-critical — video still viewable in raw format
  }
};

// ─── 1. Generate a presigned URL for the device to upload directly to R2 ──────

type GenerateUrlData = {
  competitionId: string;
  gameId: string;
  fileType: string;
};

type GenerateUrlResponse = {
  uploadUrl: string;
  publicUrl: string;
  key: string;
};

export const generateR2UploadUrl = functions.https.onCall(
  { secrets: R2_SECRETS },
  async (
    request: functions.https.CallableRequest<GenerateUrlData>,
  ): Promise<GenerateUrlResponse> => {
    const { competitionId, gameId, fileType } = request.data;

    if (!competitionId || !gameId) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "competitionId and gameId are required.",
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

    const timestamp = Date.now();
    const key = `games/${competitionId}/${gameId}/${timestamp}.mp4`;

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME.value(),
      Key: key,
      ContentType: fileType || "video/mp4",
    });

    const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 900 });
    const publicUrl = `${R2_PUBLIC_URL.value()}/${key}`;

    return { uploadUrl, publicUrl, key };
  },
);

// ─── 2. Patch the game document with videoUrl and write to gameVideos ─────────

export const updateGameVideoUrl = functions.https.onCall(
  { secrets: R2_SECRETS },
  async (request: functions.https.CallableRequest<GameVideoUploadPayload>) => {
    const {
      gameId,
      competitionId,
      competitionName,
      competitionType,
      videoUrl,
      gamescore,
      date,
      postedBy,
      teams,
    } = request.data;

    const db = admin.firestore();

    const collectionName =
      competitionType === COMPETITION_TYPES.TOURNAMENT
        ? COLLECTION_NAMES.tournaments
        : COLLECTION_NAMES.leagues;

    const competitionRef = db.collection(collectionName).doc(competitionId);
    const competitionSnap = await competitionRef.get();

    // ── Check if this user already has a video for this game ─────────────
    const docId = `${gameId}_${postedBy.userId}`;
    const existingDoc = await db
      .collection(COLLECTION_NAMES.gameVideos)
      .doc(docId)
      .get();

    const isReplacing = existingDoc.exists;
    const oldVideoUrl = existingDoc.data()?.videoUrl as string | undefined;

    // ── Delete old raw + transcoded R2 files if replacing ─────────────────
    if (isReplacing && oldVideoUrl) {
      try {
        const r2Client = new S3Client({
          region: "auto",
          endpoint: `https://${R2_ACCOUNT_ID.value()}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: R2_ACCESS_KEY_ID.value(),
            secretAccessKey: R2_SECRET_ACCESS_KEY.value(),
          },
        });
        const oldKey = oldVideoUrl.replace(`${R2_PUBLIC_URL.value()}/`, "");
        const oldRawKey = oldKey
          .replace("_compressed.mp4", ".mp4")
          .replace("_720p.mp4", ".mp4");
        const oldTranscodedKey =
          oldKey.includes("_compressed") || oldKey.includes("_720p")
            ? oldKey
            : oldKey.replace(".mp4", "_compressed.mp4");

        await Promise.allSettled([
          r2Client.send(
            new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME.value(),
              Key: oldRawKey,
            }),
          ),
          r2Client.send(
            new DeleteObjectCommand({
              Bucket: R2_BUCKET_NAME.value(),
              Key: oldTranscodedKey,
            }),
          ),
        ]);
      } catch (error) {
        console.error("[videoFunctions] Failed to delete old R2 files:", error);
      }
    }

    // ── Build gameVideo record ────────────────────────────────────────────
    const gameVideoRecord: GameVideo = {
      gameId,
      videoUrl,
      competitionId,
      competitionName,
      competitionType,
      postedBy,
      gamescore,
      date,
      createdAt: new Date(),
      likes: 0,
      likedBy: [],
      views: 0,
      commentCount: 0,
      teams,
      videoApproved: true,
      transcoded: false,
      playerIds: [
        teams.team1?.player1?.userId,
        teams.team1?.player2?.userId,
        teams.team2?.player1?.userId,
        teams.team2?.player2?.userId,
      ].filter(Boolean) as string[],
    };

    // ── Update competition document ───────────────────────────────────────
    if (competitionType === COMPETITION_TYPES.TOURNAMENT) {
      const fixtures = competitionSnap.data()?.fixtures ?? [];
      const updatedFixtures = fixtures.map(
        (round: { round: number; games: Game[] }) => ({
          ...round,
          games: round.games.map((game: Game) =>
            game.gameId === gameId
              ? {
                  ...game,
                  videoCount: isReplacing
                    ? (game.videoCount ?? 1)
                    : (game.videoCount ?? 0) + 1,
                }
              : game,
          ),
        }),
      );

      await Promise.all([
        competitionRef.update({ fixtures: updatedFixtures }),
        db
          .collection(COLLECTION_NAMES.gameVideos)
          .doc(docId)
          .set(gameVideoRecord),
      ]);
    } else {
      const games: Game[] = competitionSnap.data()?.games ?? [];
      const updatedGames = games.map((game) =>
        game.gameId === gameId
          ? {
              ...game,
              videoCount: isReplacing
                ? (game.videoCount ?? 1)
                : (game.videoCount ?? 0) + 1,
            }
          : game,
      );

      await Promise.all([
        competitionRef.update({ games: updatedGames }),
        db
          .collection(COLLECTION_NAMES.gameVideos)
          .doc(docId)
          .set(gameVideoRecord),
      ]);
    }

    // ── Notify other players ──────────────────────────────────────────────
    const playerUserIds = [
      teams.team1?.player1?.userId,
      teams.team1?.player2?.userId,
      teams.team2?.player1?.userId,
      teams.team2?.player2?.userId,
    ].filter((uid): uid is string => !!uid && uid !== postedBy.userId);

    const notificationData = {
      gameId,
      competitionId,
      competitionType,
      competitionName,
      gamescore,
      date,
      team1: teams.team1,
      team2: teams.team2,
    };

    await Promise.all(
      playerUserIds.map((userId) =>
        sendNotification({
          createdAt: new Date(),
          type: "video",
          message: `${postedBy.firstName} uploaded a video for your game in ${competitionName}`,
          isRead: false,
          senderId: postedBy.userId,
          recipientId: userId,
          data: notificationData,
          response: "",
        }),
      ),
    );

    // ── Trigger transcoding fire-and-forget ───────────────────────────────
    const rawKey = videoUrl.replace(`${R2_PUBLIC_URL.value()}/`, "");
    triggerTranscode({ docId, rawVideoUrl: videoUrl, rawKey });
  },
);

// ─── 3. Check if R2 has the file — used by recovery on app launch ─────────────

type CheckR2VideoData = {
  gameId: string;
  competitionId: string;
};

type CheckR2VideoResponse = {
  videoUrl: string | null;
};

export const checkR2VideoExists = functions.https.onCall(
  { secrets: R2_SECRETS },
  async (
    request: functions.https.CallableRequest<CheckR2VideoData>,
  ): Promise<CheckR2VideoResponse> => {
    const { gameId, competitionId } = request.data;

    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID.value()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID.value(),
        secretAccessKey: R2_SECRET_ACCESS_KEY.value(),
      },
    });

    const prefix = `games/${competitionId}/${gameId}/`;

    try {
      const listResult = await r2Client.send(
        new ListObjectsV2Command({
          Bucket: R2_BUCKET_NAME.value(),
          Prefix: prefix,
          MaxKeys: 1,
        }),
      );

      const file = listResult.Contents?.[0];
      if (file?.Key) {
        return { videoUrl: `${R2_PUBLIC_URL.value()}/${file.Key}` };
      }

      return { videoUrl: null };
    } catch {
      return { videoUrl: null };
    }
  },
);
