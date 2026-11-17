import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { FieldValue } from "firebase-admin/firestore";

/**
 * The 3.0.x sign-up screen strips `password` from the form but saves the rest,
 * so every email sign-up from those builds writes the typed password into
 * `users/{uid}.confirmPassword`, where anyone can read it. 3.1.0 no longer
 * does this, but 3.0.x stays in players' hands until they update.
 *
 * Remove the field as soon as any profile write contains it.
 */
export const stripConfirmPassword = onDocumentWritten(
  "users/{userId}",
  async (event) => {
    const after = event.data?.after;
    if (!after?.exists) return;
    if (!Object.prototype.hasOwnProperty.call(after.data() ?? {}, "confirmPassword")) {
      return;
    }
    await after.ref.update({ confirmPassword: FieldValue.delete() });
  },
);
