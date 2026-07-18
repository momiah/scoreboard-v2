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
import { Video } from "react-native-compressor";
import { PopupContext } from "../context/PopupContext";

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

interface CompressVideoOptions {
  // Real 0..1 progress straight from the native compressor.
  onProgress?: (progress: number) => void;
  // Receives the id used to cancel this compression via Video.cancelCompression.
  getCancellationId?: (cancellationId: string) => void;
}

interface RecordCompressionFailureParams {
  gameId: string;
  userId: string;
  errorMessage: string;
  lastProgress?: number;
}

interface UseVideoUploadReturn {
  pickVideo: () => Promise<PickedVideo | null>;
  compressVideo: (
    uri: string,
    options?: CompressVideoOptions,
  ) => Promise<string>;
  cancelCompression: (cancellationId: string) => void;
  recordCompressionFailure: (
    params: RecordCompressionFailureParams,
  ) => Promise<void>;
  startBackgroundUpload: (params: StartBackgroundUploadParams) => Promise<void>;
}

export const useVideoUpload = ({
  competitionId,
}: UseVideoUploadOptions): UseVideoUploadReturn => {
  const { showBottomToast } = useContext(PopupContext);

  const pickVideo = useCallback(async (): Promise<PickedVideo | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your media library to upload a video.",
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      return {
        uri: asset.uri,
        duration: asset.duration ?? null,
        fileSize: asset.fileSize ?? null,
      };
    }

    return null;
  }, []);

  // ── Compress the picked original on-device before upload ───────────────────
  // Runs in the foreground (shown in VideoUploadModal). Returns the compressed
  // file URI. Rejects if the compression fails OR is cancelled — the caller
  // distinguishes the two (see VideoUploadModal's cancelledRef).
  const compressVideo = useCallback(
    async (uri: string, options?: CompressVideoOptions): Promise<string> => {
      const compressedUri = await Video.compress(
        uri,
        {
          // Quality is irrelevant — transcodeVideo re-encodes server-side. We
          // only need the file small enough to reliably arrive. maxSize caps
          // the longest edge (~720p); bitrate keeps output predictably small.
          compressionMethod: "manual",
          maxSize: 1280,
          bitrate: 2_500_000,
          minimumFileSizeForCompress: 0,
          getCancellationId: options?.getCancellationId,
        },
        (progress) => {
          options?.onProgress?.(progress);
        },
      );
      return compressedUri;
    },
    [],
  );

  // ── Stop an in-flight compression (id from compressVideo's getCancellationId).
  const cancelCompression = useCallback((cancellationId: string) => {
    Video.cancelCompression(cancellationId);
  }, []);

  // ── Record a compression failure for diagnostics ───────────────────────────
  // Mirrors the upload failure pattern (failedVideoUploads), but does NOT touch
  // pendingVideoUploads: compression happens before any pending doc is written.
  const recordCompressionFailure = useCallback(
    async ({
      gameId,
      userId,
      errorMessage,
      lastProgress = 0,
    }: RecordCompressionFailureParams) => {
      try {
        const db = getFirestore();
        const failedDocRef = doc(
          db,
          COLLECTION_NAMES.failedVideoUploads,
          `${gameId}_${Date.now()}`,
        );
        await setDoc(failedDocRef, {
          gameId,
          competitionId,
          userId,
          errorMessage: errorMessage || "compression failed",
          lastProgress,
          platform: Platform.OS,
          failedAt: new Date(),
        });
      } catch {
        // Non-critical — diagnostics are best-effort
      }
    },
    [competitionId],
  );

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
        try {
          const failedDocRef = doc(
            db,
            COLLECTION_NAMES.failedVideoUploads,
            `${gameId}_${Date.now()}`,
          );
          await setDoc(failedDocRef, {
            gameId,
            competitionId,
            userId: postedBy.userId,
            errorMessage: errorMessage || "unknown",
            lastProgress: progress,
            platform: Platform.OS,
            failedAt: new Date(),
          });
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

        try {
          const functions = getFunctions();

          const generateR2UploadUrl = httpsCallable<
            GenerateUrlParams,
            R2UploadUrlResponse
          >(functions, "generateR2UploadUrl");

          const { data } = await generateR2UploadUrl({
            competitionId,
            gameId,
            fileType: "video/mp4",
          });

          // react-native-background-upload on Android needs a bare filesystem
          // path (no file:// scheme); iOS expects the URI untouched.
          const uploadPath =
            Platform.OS === "android" && videoUri.startsWith("file://")
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

          // ── Progress — throttled to every 10% ─────────────────────────────
          Upload.addListener("progress", uploadId, async (progressData) => {
            const percentage = Math.round(progressData.progress);
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
            console.log(
              "[VideoUpload] Upload completed, responseCode:",
              completedData.responseCode,
            );

            if (
              completedData.responseCode >= 200 &&
              completedData.responseCode < 300
            ) {
              const patchGameVideoUrl = httpsCallable<
                GameVideoUploadPayload,
                void
              >(functions, "updateGameVideoUrl");

              await patchGameVideoUrl({
                gameId,
                competitionId,
                competitionName,
                competitionType,
                videoUrl: data.publicUrl,
                gamescore,
                date,
                postedBy,
                teams,
                videoLength,
              });

              await deleteDoc(pendingDocRef);
              console.log("[VideoUpload] Complete — pending record cleared");
            } else {
              console.error(
                "[VideoUpload] Upload returned non-2xx status:",
                completedData.responseCode,
              );
              await recordFailure(
                `non-2xx: ${completedData.responseCode}`,
                lastReportedProgress,
              );
              showBottomToast(
                "Video upload failed. Please try again.",
                "error",
              );
            }
          });

          // ── Error ─────────────────────────────────────────────────────────
          Upload.addListener("error", uploadId, async (errorData) => {
            console.error("[VideoUpload] Upload error:", errorData.error);
            await recordFailure(
              errorData.error ?? "unknown",
              lastReportedProgress,
            );
            showBottomToast("Video upload failed. Please try again.", "error");
          });

          // ── Cancelled ─────────────────────────────────────────────────────
          Upload.addListener("cancelled", uploadId, async () => {
            console.warn("[VideoUpload] Upload cancelled:", gameId);
            await deleteDoc(pendingDocRef);
          });
        } catch (error) {
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
    [competitionId, showBottomToast],
  );

  return {
    pickVideo,
    compressVideo,
    cancelCompression,
    recordCompressionFailure,
    startBackgroundUpload,
  };
};
