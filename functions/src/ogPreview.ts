import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const DEFAULT_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/scoreboard-app-29148.firebasestorage.app/o/court-champ-logo-icon.png?alt=media&token=226598e8-39ad-441b-a139-b7c56fcfdf6f";

export const ogPreview = functions.https.onRequest(async (req, res) => {
  const parts = req.path.split("/").filter(Boolean);

  // ── Video preview ─────────────────────────────────────────────────────────
  if (parts[0] === "og" && parts[1] === "videos") {
    const docId = req.query.v as string;

    if (!docId) {
      res.redirect("https://courtchamps.com");
      return;
    }

    try {
      const videoDoc = await admin
        .firestore()
        .collection("gameVideos")
        .doc(docId)
        .get();
      const data = videoDoc.data();

      const team1 = data?.teams?.team1;
      const team2 = data?.teams?.team2;

      const formatTeam = (team: any) => {
        const players = [team?.player1, team?.player2]
          .filter(Boolean)
          .map((p: any) => `${p.firstName} ${p.lastName[0]}`)
          .join(" · ");
        return players;
      };

      const title = `${formatTeam(team1)} vs ${formatTeam(team2)} · ${data?.competitionName ?? "Court Champs"}`;
      const description = `Watch this game on Court Champs 🏸`;
      const image = data?.thumbnailUrl || DEFAULT_IMAGE;
      const url = `https://courtchamps.com/videos?v=${docId}`;

      res.set("Cache-Control", "public, max-age=300, s-maxage=600");
      res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="video.other" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta http-equiv="refresh" content="0;url=${url}" />
  </head>
  <body style="background-color:rgb(3, 16, 31);margin:0;"></body>
</html>`);
    } catch (error) {
      console.error("[ogPreview] Video error:", error);
      res.redirect(`https://courtchamps.com/videos?v=${docId}`);
    }
    return;
  }

  // ── Competition preview ───────────────────────────────────────────────────
  const type = parts[1];
  const id = parts[2];

  if (!type || !id) {
    res.redirect("https://courtchamps.com");
    return;
  }

  const collectionName = type === "league" ? "leagues" : "tournaments";
  const nameField = type === "league" ? "leagueName" : "tournamentName";
  const imageField = type === "league" ? "leagueImage" : "tournamentImage";
  const descField =
    type === "league" ? "leagueDescription" : "tournamentDescription";

  try {
    const doc = await admin
      .firestore()
      .collection(collectionName)
      .doc(id)
      .get();
    const data = doc.data();

    const name = data?.[nameField] || "Court Champs Competition";
    const image = data?.[imageField] || DEFAULT_IMAGE;
    const description =
      data?.[descField] || "Join this competition on Court Champs 🏸";
    const url = `https://courtchamps.com/join/${type}/${id}`;

    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
    res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="${name}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${url}" />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${name}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    <meta http-equiv="refresh" content="0;url=${url}" />
  </head>
<body style="background-color:rgb(3, 16, 31);margin:0;">
  </body>
</html>`);
  } catch (error) {
    console.error("ogPreview error:", error);
    res.redirect(`https://courtchamps.com/join/${type}/${id}`);
  }
});
