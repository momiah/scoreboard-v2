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
    const games: Game[] = competitionSnap.data()?.games ?? [];

    // ── Check if this user already has a video for this game ─────────────
    const docId = `${gameId}_${postedBy.userId}`;
    const existingDoc = await db
      .collection(COLLECTION_NAMES.gameVideos)
      .doc(docId)
      .get();

    const isReplacing = existingDoc.exists;
    const oldVideoUrl = existingDoc.data()?.videoUrl as string | undefined;

    // ── Delete old R2 file if replacing ───────────────────────────────────
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
        await r2Client.send(
          new DeleteObjectCommand({
            Bucket: R2_BUCKET_NAME.value(),
            Key: oldKey,
          }),
        );
      } catch (error) {
        console.error("[videoFunctions] Failed to delete old R2 file:", error);
        // Non-critical — proceed with update regardless
      }
    }

    // ── Update game document ──────────────────────────────────────────────
    const updatedGames = games.map((game) =>
      game.gameId === gameId
        ? {
            ...game,
            videoUrl,
            videoApproved: true,
            videoCount: isReplacing
              ? (game.videoCount ?? 1)
              : (game.videoCount ?? 0) + 1,
          }
        : game,
    );

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
    };

    await Promise.all([
      competitionRef.update({ games: updatedGames }),
      db
        .collection(COLLECTION_NAMES.gameVideos)
        .doc(docId)
        .set(gameVideoRecord),
    ]);
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
