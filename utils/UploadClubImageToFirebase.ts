import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../services/firebase.config";
import { fetchImageBlob } from "./UploadLeagueImageToFirebase";

/** Firebase Storage object names cannot contain # [ ] * ? etc.; clubId may include user input. */
function storageSafeSegment(id: string): string {
  return id.replace(/[/#[\]*?]/g, "_");
}

export const uploadClubImage = async (
  uri: string,
  clubId: string,
): Promise<string | null> => {
  try {
    const blob = await fetchImageBlob(uri);
    const filePath = `ClubImages/${storageSafeSegment(clubId)}_${Date.now()}.jpg`;
    const storageRef = ref(storage, filePath);
    const uploadTask = await uploadBytes(storageRef, blob);
    return await getDownloadURL(uploadTask.ref);
  } catch (error) {
    console.error("Club image upload error:", error);
    return null;
  }
};
