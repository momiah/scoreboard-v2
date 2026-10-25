import { deleteDoc, deleteField, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { PRO_LEVEL_MAX, PRO_LEVEL_THRESHOLDS } from "@shared/helpers";
import { db } from "../../services/firebase.config";

export const MAESTRO_PRO_LEVEL_BACKUP_COLLECTION = "maestroBackups";
export const PRO_LEVEL_SEED_LEVELS = Array.from({ length: PRO_LEVEL_MAX + 1 }, (_, level) => level);

const backupRef = (userId) => doc(db, MAESTRO_PRO_LEVEL_BACKUP_COLLECTION, `prolevel-${userId}`);

export const proLevelSeedCash = (level) =>
  level === 0 ? null : PRO_LEVEL_THRESHOLDS[level - 1] + 1;

/**
 * Gives the test user the lifetime cash won of a player just past the level's
 * threshold (none for level 0, as on an account that has never won cash),
 * with the ladder wins that would have earned it. The original values are
 * backed up once so the cleanup puts the profile back.
 */
export const seedProLevel = async ({ testUser, level }) => {
  const userRef = doc(db, "users", testUser.userId);
  const backup = await getDoc(backupRef(testUser.userId));
  if (!backup.exists()) {
    const detail = (await getDoc(userRef)).data()?.profileDetail ?? {};
    await setDoc(backupRef(testUser.userId), {
      userId: testUser.userId,
      cashWon: detail.cashWon ?? null,
      ladderStats: detail.ladderStats ?? null,
    });
  }
  const cashWon = proLevelSeedCash(level);
  await updateDoc(userRef, {
    "profileDetail.cashWon": cashWon === null ? deleteField() : cashWon,
    "profileDetail.ladderStats": { first: level, second: level > 2 ? 2 : level > 0 ? 1 : 0, third: 0, fourth: 0 },
  });
  return { level, cashWon };
};

export const cleanupProLevel = async (testUser) => {
  if (!testUser?.userId) return { restored: false };
  const backup = await getDoc(backupRef(testUser.userId));
  if (!backup.exists()) return { restored: false };
  const { cashWon, ladderStats } = backup.data();
  await updateDoc(doc(db, "users", testUser.userId), {
    "profileDetail.cashWon": cashWon === null ? deleteField() : cashWon,
    "profileDetail.ladderStats": ladderStats === null ? deleteField() : ladderStats,
  });
  await deleteDoc(backupRef(testUser.userId));
  return { restored: true };
};
