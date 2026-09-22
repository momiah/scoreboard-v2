import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../services/firebase.config";
import { fetchImageBlob } from "./UploadLeagueImageToFirebase";

/** Firebase Storage object names cannot contain # [ ] * ? etc. */
function storageSafeSegment(id: string): string {
  return id.replace(/[/#[\]*?]/g, "_");
}

/**
 * Upload a dispute's video evidence to a private `DisputeVideos/` path (not the
 * public feed) and return its download URL. Evidence clips are short, so a plain
 * `uploadBytes` — the same path the image uploads use — is enough.
 */
export const uploadDisputeVideo = async (
  uri: string,
  gameId: string,
): Promise<string | null> => {
  try {
    const blob = await fetchImageBlob(uri);
    const filePath = `DisputeVideos/${storageSafeSegment(gameId)}_${Date.now()}.mp4`;
    const storageRef = ref(storage, filePath);
    const uploadTask = await uploadBytes(storageRef, blob);
    return await getDownloadURL(uploadTask.ref);
  } catch (error) {
    console.error("Dispute video upload error:", error);
    return null;
  }
};
