import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { defineSecret } from "firebase-functions/params";
import { COLLECTION_NAMES } from "@shared";

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

interface TranscodeVideoData {
  docId: string;
  rawVideoUrl: string;
  rawKey: string;
}

// ── Set FFmpeg binary path ────────────────────────────────────────────────────
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export const transcodeVideo = onRequest(
  {
    secrets: R2_SECRETS,
    memory: "16GiB",
    cpu: 4,
    timeoutSeconds: 3600,
  },
  async (req, res) => {
    const { docId, rawVideoUrl, rawKey } = req.body.data as TranscodeVideoData;

    if (!docId || !rawVideoUrl || !rawKey) {
      res
        .status(400)
        .json({ error: "Missing required fields: docId, rawVideoUrl, rawKey" });
      return;
    }

    const r2Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID.value()}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID.value(),
        secretAccessKey: R2_SECRET_ACCESS_KEY.value(),
      },
    });

    const rawTmpPath = path.join(os.tmpdir(), `${docId}_raw.mp4`);
    const transcodedTmpPath = path.join(os.tmpdir(), `${docId}_compressed.mp4`);

    try {
      // ── 1. Generate presigned download URL for raw video ────────────────
      const getCommand = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME.value(),
        Key: rawKey,
      });
      const presignedDownloadUrl = await getSignedUrl(r2Client, getCommand, {
        expiresIn: 3600,
      });

      // ── 2. Download raw video to /tmp ───────────────────────────────────
      console.log("[transcodeVideo] Downloading raw video...");
      const response = await fetch(presignedDownloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download raw video: ${response.statusText}`);
      }
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(rawTmpPath, Buffer.from(buffer));
      console.log("[transcodeVideo] Raw video downloaded");

      // ── 3. Compress video — original resolution and orientation preserved
      console.log("[transcodeVideo] Compressing video...");
      await new Promise<void>((resolve, reject) => {
        ffmpeg(rawTmpPath)
          .outputOptions([
            "-c:v libx264",
            "-crf 23",
            "-preset fast",
            "-c:a aac",
            "-b:a 128k",
            "-movflags +faststart",
          ])
          .output(transcodedTmpPath)
          .on("progress", (progress) =>
            console.log(
              "[transcodeVideo] Progress:",
              progress.percent?.toFixed(1),
              "%",
            ),
          )
          .on("end", () => {
            console.log("[transcodeVideo] Compression complete");
            resolve();
          })
          .on("error", (err) => {
            console.error("[transcodeVideo] FFmpeg error:", err);
            reject(err);
          })
          .run();
      });

      // ── 4. Upload compressed video to R2 ─────────────────────────────────
      const compressedKey = rawKey.replace(".mp4", "_compressed.mp4");
      const compressedBuffer = fs.readFileSync(transcodedTmpPath);

      console.log("[transcodeVideo] Uploading compressed video to R2...");
      await r2Client.send(
        new PutObjectCommand({
          Bucket: R2_BUCKET_NAME.value(),
          Key: compressedKey,
          Body: compressedBuffer,
          ContentType: "video/mp4",
        }),
      );

      const compressedUrl = `${R2_PUBLIC_URL.value()}/${compressedKey}`;
      console.log("[transcodeVideo] Uploaded:", compressedUrl);

      // ── 5. Update Firestore with compressed URL ───────────────────────────
      const db = admin.firestore();
      await db.collection(COLLECTION_NAMES.gameVideos).doc(docId).update({
        videoUrl: compressedUrl,
        transcoded: true,
      });
      console.log("[transcodeVideo] Firestore updated");

      // ── 6. Delete raw video from R2 ───────────────────────────────────────
      await r2Client.send(
        new DeleteObjectCommand({
          Bucket: R2_BUCKET_NAME.value(),
          Key: rawKey,
        }),
      );
      console.log("[transcodeVideo] Raw video deleted from R2");

      res.json({ success: true, compressedUrl });
    } catch (error) {
      console.error("[transcodeVideo] Error:", error);
      res.status(500).json({ error: "Transcoding failed" });
    } finally {
      // ── 7. Always clean up /tmp files ─────────────────────────────────────
      if (fs.existsSync(rawTmpPath)) fs.unlinkSync(rawTmpPath);
      if (fs.existsSync(transcodedTmpPath)) fs.unlinkSync(transcodedTmpPath);
      console.log("[transcodeVideo] Temp files cleaned up");
    }
  },
);
