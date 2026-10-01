import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const DEFAULT_IMAGE =
  "https://firebasestorage.googleapis.com/v0/b/scoreboard-app-29148.firebasestorage.app/o/court-champ-logo-icon.png?alt=media&token=226598e8-39ad-441b-a139-b7c56fcfdf6f";

const SITE_URL = "https://courtchamps.com";

// Firestore auto-IDs are alphanumeric; reject anything else before it reaches
// a query, a redirect or the HTML below.
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

const COMPETITION_TYPES: Record<
  string,
  { collection: string; nameField: string; imageField: string; descField: string }
> = {
  league: {
    collection: "leagues",
    nameField: "leagueName",
    imageField: "leagueImage",
    descField: "leagueDescription",
  },
  tournament: {
    collection: "tournaments",
    nameField: "tournamentName",
    imageField: "tournamentImage",
    descField: "tournamentDescription",
  },
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const safeImage = (value: unknown): string =>
  typeof value === "string" && value.startsWith("https://") ? value : DEFAULT_IMAGE;

const asText = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim() ? value : fallback;

const renderPreview = ({
  title,
  description,
  image,
  url,
  type,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;
}): string => {
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const i = escapeHtml(image);
  const u = escapeHtml(url);
  return `<!DOCTYPE html>
<html>
  <head>
    <meta property="og:title" content="${t}" />
    <meta property="og:description" content="${d}" />
    <meta property="og:image" content="${i}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${u}" />
    <meta property="og:type" content="${type}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${t}" />
    <meta name="twitter:description" content="${d}" />
    <meta name="twitter:image" content="${i}" />
    <meta http-equiv="refresh" content="0;url=${u}" />
  </head>
  <body style="background-color:rgb(3, 16, 31);margin:0;"></body>
</html>`;
};

export const ogPreview = functions.https.onRequest(async (req, res) => {
  const parts = req.path.split("/").filter(Boolean);

  // ── Video preview ─────────────────────────────────────────────────────────
  if (parts[0] === "og" && parts[1] === "videos") {
    const docId = req.query.v;

    if (typeof docId !== "string" || !ID_PATTERN.test(docId)) {
      res.redirect(SITE_URL);
      return;
    }

    const url = `${SITE_URL}/videos?v=${docId}`;

    try {
      const videoDoc = await admin
        .firestore()
        .collection("gameVideos")
        .doc(docId)
        .get();
      const data = videoDoc.data();

      const team1 = data?.teams?.team1;
      const team2 = data?.teams?.team2;

      const formatTeam = (team: Record<string, { firstName: string; lastName: string } | undefined>) => {
        const players = [team?.player1, team?.player2]
          .filter(Boolean)
          .map((p) => `${p!.firstName} ${p!.lastName[0]}`)
          .join(" · ");
        return players;
      };

      res.set("Cache-Control", "public, max-age=300, s-maxage=600");
      res.send(
        renderPreview({
          title: `${formatTeam(team1)} vs ${formatTeam(team2)} · ${asText(data?.competitionName, "Court Champs")}`,
          description: "Watch this game on Court Champs 🏸",
          image: safeImage(data?.thumbnailUrl),
          url,
          type: "video.other",
        })
      );
    } catch (error) {
      console.error("[ogPreview] Video error:", error);
      res.redirect(url);
    }
    return;
  }

  // ── Competition preview ───────────────────────────────────────────────────
  const type = parts[1];
  const id = parts[2];
  const config = COMPETITION_TYPES[type];

  if (!config || !id || !ID_PATTERN.test(id)) {
    res.redirect(SITE_URL);
    return;
  }

  const url = `${SITE_URL}/join/${type}/${id}`;

  try {
    const doc = await admin
      .firestore()
      .collection(config.collection)
      .doc(id)
      .get();
    const data = doc.data();

    res.set("Cache-Control", "public, max-age=300, s-maxage=600");
    res.send(
      renderPreview({
        title: asText(data?.[config.nameField], "Court Champs Competition"),
        description: asText(
          data?.[config.descField],
          "Join this competition on Court Champs 🏸"
        ),
        image: safeImage(data?.[config.imageField]),
        url,
        type: "website",
      })
    );
  } catch (error) {
    console.error("ogPreview error:", error);
    res.redirect(url);
  }
});
