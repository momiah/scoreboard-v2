const admin = require("firebase-admin");

// One-off: mark every existing gameVideos doc without a videoType as a "game"
// video, so feeds can filter on videoType == "game".
// Usage (from functions/): node scripts/backfillGameVideoType.js [--dry-run]
async function backfillGameVideoType() {
  const dryRun = process.argv.includes("--dry-run");

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: process.env.GCLOUD_PROJECT || "scoreboard-app-29148",
  });
  const db = admin.firestore();

  const snapshot = await db.collection("gameVideos").get();
  const missing = snapshot.docs.filter((d) => !d.data().videoType);

  console.log(
    `${snapshot.size} videos scanned, ${missing.length} missing videoType.`,
  );
  if (dryRun || missing.length === 0) return;

  for (let i = 0; i < missing.length; i += 400) {
    const batch = db.batch();
    missing
      .slice(i, i + 400)
      .forEach((d) => batch.update(d.ref, { videoType: "game" }));
    await batch.commit();
  }
  console.log(`Marked ${missing.length} videos as "game".`);
}

backfillGameVideoType().catch((error) => {
  console.error(error);
  process.exit(1);
});
