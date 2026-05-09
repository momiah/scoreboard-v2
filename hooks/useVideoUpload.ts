import { useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
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
}

interface UseVideoUploadReturn {
  pickVideo: () => Promise<PickedVideo | null>;
  startBackgroundUpload: (params: StartBackgroundUploadParams) => Promise<void>;
}

export const useVideoUpload = ({
  competitionId,
}: UseVideoUploadOptions): UseVideoUploadReturn => {
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
      quality: 1,
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
    }: StartBackgroundUploadParams) => {
      const db = getFirestore();
      const pendingDocRef = doc(
        db,
        COLLECTION_NAMES.pendingVideoUploads,
        gameId,
      );

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
          startedAt: new Date(),
        });
        console.log("[VideoUpload] Pending record written:", gameId);
      } catch (error) {
        console.error("[VideoUpload] Failed to write pending record:", error);
        return;
      }

      const run = async () => {
        console.log("[VideoUpload] run() started:", { gameId, competitionId });
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

          let lastReportedProgress = 0;

          const uploadId = await Upload.startUpload({
            url: data.uploadUrl,
            path: videoUri,
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
              });

              await deleteDoc(pendingDocRef);
              console.log("[VideoUpload] Complete — pending record cleared");
            } else {
              console.error(
                "[VideoUpload] Upload returned non-2xx status:",
                completedData.responseCode,
              );
            }
          });

          // ── Error ─────────────────────────────────────────────────────────
          Upload.addListener("error", uploadId, (errorData) => {
            console.error("[VideoUpload] Upload error:", errorData.error);
          });

          // ── Cancelled ─────────────────────────────────────────────────────
          // ── Cancelled ─────────────────────────────────────────────────────────────
          Upload.addListener("cancelled", uploadId, async () => {
            console.warn("[VideoUpload] Upload cancelled:", gameId);
            await deleteDoc(pendingDocRef);
          });
        } catch (error) {
          console.error("[VideoUpload] Background upload failed:", error);
        }
      };

      run();
    },
    [competitionId],
  );

  return { pickVideo, startBackgroundUpload };
};
