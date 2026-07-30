import { useCallback, useContext } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { COLLECTION_NAMES } from "@shared";
import { GameVideoUploadPayload } from "@shared/types";
import Upload from "react-native-background-upload";
import { AppEventsLogger } from "react-native-fbsdk-next";
import { PopupContext } from "../context/PopupContext";
import { GameContext } from "../context/GameContext";

interface R2UploadUrlResponse {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

type GenerateUrlParams = {
  competitionId: string;
  gameId: string;
  fileType: string;
};

export interface PickedVideo {
  uri: string;
  duration: number | null;
  fileSize: number | null;
}

export type PickVideoResult =
  | { status: "picked"; video: PickedVideo }
  | { status: "cancelled" }
  | { status: "failed" };

interface UseVideoUploadOptions {
  competitionId: string;
}

interface StartBackgroundUploadParams extends Omit<
  GameVideoUploadPayload,
  "videoUrl" | "competitionId"
> {
  videoUri: string;
  videoLength: number | undefined;
}

interface UseVideoUploadReturn {
  pickVideo: () => Promise<PickVideoResult>;
  startBackgroundUpload: (params: StartBackgroundUploadParams) => Promise<void>;
}

type CheckR2VideoParams = { gameId: string; competitionId: string };
type CheckR2VideoResponse = { videoUrl: string | null };

// Android's react-native-background-upload `completed` event is unreliable — the
// bytes land on R2 but the event never drives the finalize step. Once progress
// reaches 100% we wait this long for `completed`; if it never finalizes we verify
// against R2 and finish the job ourselves.
const FINALIZE_FALLBACK_MS = 12000;

export const useVideoUpload = ({
  competitionId,
}: UseVideoUploadOptions): UseVideoUploadReturn => {
  const { showBottomToast } = useContext(PopupContext);
  const { recordVideoUploadFailure } = useContext(GameContext);

  const pickVideo = useCallback(async (): Promise<PickVideoResult> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your media library to upload a video.",
      );
      return { status: "cancelled" };
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
        videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
      });

      console.log("[VideoUpload] picker result:", {
        canceled: result.canceled,
        assetCount: result.canceled ? 0 : result.assets?.length,
        firstUri: result.canceled ? null : result.assets?.[0]?.uri,
      });

      if (result.canceled) return { status: "cancelled" };

      const asset = result.assets?.[0];
      if (!asset?.uri) return { status: "failed" };

      return {
        status: "picked",
        video: {
          uri: asset.uri,
          duration: asset.duration ?? null,
          fileSize: asset.fileSize ?? null,
        },
      };
    } catch (error) {
      console.error("[VideoUpload] pickVideo failed:", error);
      return { status: "failed" };
    }
  }, []);

  const startBackgroundUpload = useCallback(
    async ({
      gameId,
      videoUri,
      competitionName,
      competitionType,
      gamescore,
      date,
      postedBy,
      teams,
      videoLength,
    }: StartBackgroundUploadParams) => {
      const db = getFirestore();
      const pendingDocRef = doc(
        db,
        COLLECTION_NAMES.pendingVideoUploads,
        gameId,
      );

      // ── Helper: record a failed upload for diagnostics ──────────────────────
      const recordFailure = async (errorMessage: string, progress: number) => {
        await recordVideoUploadFailure({
          gameId,
          competitionId,
          userId: postedBy.userId,
          errorMessage,
          lastProgress: progress,
        });
        try {
          await deleteDoc(pendingDocRef);
        } catch {
          // Non-critical — diagnostics/cleanup are best-effort
        }
      };

      try {
        await setDoc(pendingDocRef, {
          gameId,
          competitionId,
          competitionName,
          competitionType,
          gamescore,
          date,
          postedBy,
          teams,
          videoLength: videoLength ?? null,
          status: "uploading",
          progress: 0,
          platform: Platform.OS,
          startedAt: new Date(),
        });
        console.log("[VideoUpload] Pending record written:", gameId);
      } catch (error) {
        console.error("[VideoUpload] Failed to write pending record:", error);
        return;
      }

      const run = async () => {
        console.log("[VideoUpload] run() started:", { gameId, competitionId });

        let lastReportedProgress = 0;

        // ── Finalize state ──────────────────────────────────────────────────
        // `finalized` — the game has been patched with the video URL.
        // `finalizing` — a finalize call is in flight (prevents double-run).
        // `settled` — a terminal failure/cancel was reached; don't finalize.
        let finalized = false;
        let finalizing = false;
        let settled = false;
        let fallbackScheduled = false;
        let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

        try {
          const functions = getFunctions();

          const generateR2UploadUrl = httpsCallable<
            GenerateUrlParams,
            R2UploadUrlResponse
          >(functions, "generateR2UploadUrl");

          const patchGameVideoUrl = httpsCallable<GameVideoUploadPayload, void>(
            functions,
            "updateGameVideoUrl",
          );

          const checkR2VideoExists = httpsCallable<
            CheckR2VideoParams,
            CheckR2VideoResponse
          >(functions, "checkR2VideoExists");

          const clearFallback = () => {
            if (fallbackTimer) {
              clearTimeout(fallbackTimer);
              fallbackTimer = null;
            }
          };

          // ── Attach the video to the game. Idempotent + guarded so the
          //    `completed` event and the R2 fallback can't double-run it.
          //    updateGameVideoUrl is keyed by `${gameId}_${userId}` and only
          //    bumps videoCount on first write, so a retry is safe. ──────────
          const finalizeUpload = async (videoUrl: string, via: string) => {
            if (finalized || finalizing || settled) return;
            finalizing = true;
            try {
              await patchGameVideoUrl({
                gameId,
                competitionId,
                competitionName,
                competitionType,
                videoUrl,
                gamescore,
                date,
                postedBy,
                teams,
                videoLength,
              });
              await deleteDoc(pendingDocRef);
              finalized = true;
              clearFallback();
              console.log(`[VideoUpload] Finalized via ${via}:`, gameId);
              AppEventsLogger.logEvent("UploadedGameVideo", {
                competition_type: competitionType,
                platform: Platform.OS,
              });
            } catch (err) {
              // Leave finalized=false so the fallback / launch-recovery retries.
              console.error("[VideoUpload] Finalize failed:", err);
            } finally {
              finalizing = false;
            }
          };

          // ── R2 is the source of truth. If the bytes are there, finish the
          //    job regardless of what the native upload event reported. ──────
          const finalizeFromR2IfPresent = async (via: string) => {
            if (finalized || settled) return false;
            try {
              const { data: r2 } = await checkR2VideoExists({
                gameId,
                competitionId,
              });
              if (r2.videoUrl) {
                await finalizeUpload(r2.videoUrl, via);
                return finalized;
              }
            } catch (err) {
              console.error("[VideoUpload] R2 check failed:", err);
            }
            return false;
          };

          const scheduleFinalizeFallback = () => {
            if (fallbackScheduled || finalized || settled) return;
            fallbackScheduled = true;
            fallbackTimer = setTimeout(() => {
              if (finalized || settled) return;
              console.warn(
                "[VideoUpload] No completion event — verifying R2:",
                gameId,
              );
              finalizeFromR2IfPresent("r2-fallback");
            }, FINALIZE_FALLBACK_MS);
          };

          const { data } = await generateR2UploadUrl({
            competitionId,
            gameId,
            fileType: "video/mp4",
          });

          // Android: react-native-background-upload needs a raw path
          // without the file:// scheme.
          const uploadPath =
            Platform.OS === "android"
              ? videoUri.replace("file://", "")
              : videoUri;

          const uploadId = await Upload.startUpload({
            url: data.uploadUrl,
            path: uploadPath,
            method: "PUT",
            type: "raw",
            headers: { "content-type": "video/mp4" },
            customUploadId: gameId,
            notification: {
              enabled: true,
              onProgressTitle: "Court Champs",
              onProgressMessage: "Uploading game video...",
              onCompleteTitle: "Court Champs",
              onCompleteMessage: "Video uploaded successfully!",
              onErrorTitle: "Court Champs",
              onErrorMessage: "Video upload failed.",
              onCancelledTitle: "Court Champs",
              onCancelledMessage: "Upload cancelled.",
              autoClear: true,
            },
          });

          // ── Store real uploadId for cancellation ──────────────────────────
          await updateDoc(pendingDocRef, { uploadId });
          console.log("[VideoUpload] Native upload started, id:", uploadId);

          // ── Progress — throttled to every 10%; arm fallback at 100% ───────
          Upload.addListener("progress", uploadId, async (progressData) => {
            const percentage = Math.round(progressData.progress);
            if (percentage >= 100) scheduleFinalizeFallback();
            if (percentage >= lastReportedProgress + 10) {
              lastReportedProgress = percentage;
              try {
                await updateDoc(pendingDocRef, { progress: percentage });
              } catch {
                // Non-critical — silently ignore
              }
            }
          });

          // ── Completed ─────────────────────────────────────────────────────
          Upload.addListener("completed", uploadId, async (completedData) => {
            const code = Number(completedData.responseCode);
            console.log(
              "[VideoUpload] Upload completed, responseCode:",
              completedData.responseCode,
            );

            if (code >= 200 && code < 300) {
              await finalizeUpload(data.publicUrl, "completed-event");
              return;
            }

            // Non-2xx per the native event — but the Android uploader sometimes
            // misreports a good upload, so confirm against R2 before failing.
            if (await finalizeFromR2IfPresent("completed-nonok-r2-present")) {
              return;
            }

            settled = true;
            clearFallback();
            console.error(
              "[VideoUpload] Upload returned non-2xx status:",
              completedData.responseCode,
            );
            await recordFailure(
              `non-2xx: ${completedData.responseCode}`,
              lastReportedProgress,
            );
            showBottomToast("Video upload failed. Please try again.", "error");
          });

          // ── Error ─────────────────────────────────────────────────────────
          Upload.addListener("error", uploadId, async (errorData) => {
            console.error("[VideoUpload] Upload error:", errorData.error);

            // Bytes may have reached R2 before the socket error — verify first.
            if (await finalizeFromR2IfPresent("error-r2-present")) return;

            settled = true;
            clearFallback();
            await recordFailure(
              errorData.error ?? "unknown",
              lastReportedProgress,
            );
            showBottomToast("Video upload failed. Please try again.", "error");
          });

          // ── Cancelled ─────────────────────────────────────────────────────
          Upload.addListener("cancelled", uploadId, async () => {
            settled = true;
            clearFallback();
            console.warn("[VideoUpload] Upload cancelled:", gameId);
            await deleteDoc(pendingDocRef);
          });
        } catch (error) {
          settled = true;
          if (fallbackTimer) clearTimeout(fallbackTimer);
          console.error("[VideoUpload] Background upload failed:", error);
          await recordFailure(
            error instanceof Error ? error.message : "setup failed",
            lastReportedProgress,
          );
          showBottomToast("Video upload failed. Please try again.", "error");
        }
      };

      run();
    },
    [competitionId, showBottomToast, recordVideoUploadFailure],
  );

  return { pickVideo, startBackgroundUpload };
};
