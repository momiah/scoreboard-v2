import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../services/firebase.config";
import { deleteFixtureUsers } from "../../fixtures/fixtureUsers";
import { MAESTRO_SIGNUP_EMAIL_PREFIX } from "../../fixtures/signupFixtures";

/** Removes the profile docs every sign-up flow run created (maestro-signup*@example.com). */
export const cleanupSignupProfiles = async () => {
  const snap = await getDocs(
    query(
      collection(db, "users"),
      where("email", ">=", MAESTRO_SIGNUP_EMAIL_PREFIX),
      where("email", "<", `${MAESTRO_SIGNUP_EMAIL_PREFIX}`),
    ),
  );
  const ids = snap.docs
    .filter((d) => String(d.data().email).endsWith("@example.com"))
    .map(({ id }) => id);
  if (ids.length > 0) await deleteFixtureUsers(ids);
  return { profiles: ids.length };
};
