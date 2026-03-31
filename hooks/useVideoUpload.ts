import { useCallback } from "react";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirestore, doc, setDoc, deleteDoc } from "firebase/firestore";
import { COLLECTION_NAMES } from "@shared";
import { GameVideoUploadPayload } from "@shared/types";

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
  pickVideo: () => Promise<string | null>;
  startBackgroundUpload: (params: StartBackgroundUploadParams) => Promise<void>;
}

export const useVideoUpload = ({
  competitionId,
}: UseVideoUploadOptions): UseVideoUploadReturn => {
  const pickVideo = useCallback(async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Please allow access to your media library to upload a video.",
      );
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 1,
      videoMaxDuration: 300,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 500 * 1024 * 1024) {
        Alert.alert("Video Too Large", "Please select a video under 500MB.");
        return null;
      }
      return asset.uri;
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

      try {
        await setDoc(doc(db, COLLECTION_NAMES.pendingVideoUploads, gameId), {
          gameId,
          competitionId,
          competitionName,
          competitionType,
          gamescore,
          date,
          postedBy,
          teams,
          status: "uploading",
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

          console.log("[VideoUpload] Calling generateR2UploadUrl...");
          const { data } = await generateR2UploadUrl({
            competitionId,
            gameId,
            fileType: "video/mp4",
          });
          console.log("[VideoUpload] Presigned URL received:", data.uploadUrl);

          const uploadTask = FileSystem.createUploadTask(
            data.uploadUrl,
            videoUri,
            {
              httpMethod: "PUT",
              headers: { "Content-Type": "video/mp4" },
              uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
            },
          );

          console.log("[VideoUpload] Starting native upload...");
          const result = await uploadTask.uploadAsync();
          console.log("[VideoUpload] Upload result:", result?.status);

          if (result?.status && result.status >= 200 && result.status < 300) {
            console.log(
              "[VideoUpload] Upload succeeded, patching Firestore...",
            );

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

            await deleteDoc(
              doc(db, COLLECTION_NAMES.pendingVideoUploads, gameId),
            );
            console.log("[VideoUpload] Complete — pending record cleared");
          } else {
            console.error(
              "[VideoUpload] Upload returned non-2xx status:",
              result?.status,
            );
          }
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
