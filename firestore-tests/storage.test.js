import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc } from "firebase/firestore";

// Storage rules read userRoles from Firestore, so both emulators run.
let env;

const PLAYER = "player1";
const OTHER = "player2";
const STAFF = "staff1";

const JPEG = { contentType: "image/jpeg" };
const bytes = (size = 1024) => new Uint8Array(size);

const as = (uid) => env.authenticatedContext(uid).storage();
const guest = () => env.unauthenticatedContext().storage();
const put = (storage, path, data = bytes(), metadata = JPEG) =>
  storage.ref(path).put(data, metadata);
const seedFile = (path, metadata = JPEG) =>
  env.withSecurityRulesDisabled((ctx) => put(ctx.storage(), path, bytes(), metadata));

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-courtchamps-rules",
    firestore: {
      rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
      host: "127.0.0.1",
      port: 8188,
    },
    storage: {
      rules: readFileSync(new URL("../storage.rules", import.meta.url), "utf8"),
      host: "127.0.0.1",
      port: 9198,
    },
  });
});

after(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearStorage();
  await env.clearFirestore();
  await env.withSecurityRulesDisabled((ctx) =>
    setDoc(doc(ctx.firestore(), "userRoles", STAFF), { role: "admin" }),
  );
});

describe("profile images", () => {
  test("a player uploads their own picture as the app names it", async () => {
    await assertSucceeds(put(as(PLAYER), `ProfileImages/${PLAYER}_1731600000000.jpg`));
  });

  test("a player cannot upload under someone else's id", async () => {
    await assertFails(put(as(PLAYER), `ProfileImages/${OTHER}_1731600000000.jpg`));
  });

  test("signed-out uploads are blocked", async () => {
    await assertFails(put(guest(), `ProfileImages/${PLAYER}_1731600000000.jpg`));
  });

  test("non-image files are blocked", async () => {
    await assertFails(
      put(as(PLAYER), `ProfileImages/${PLAYER}_1731600000000.jpg`, bytes(), {
        contentType: "text/html",
      }),
    );
  });

  test("files of 10 MB or more are blocked", async () => {
    await assertFails(
      put(as(PLAYER), `ProfileImages/${PLAYER}_1731600000000.jpg`, bytes(10 * 1024 * 1024)),
    );
  });

  test("a player cannot overwrite or delete an existing picture", async () => {
    const path = `ProfileImages/${PLAYER}_1731600000000.jpg`;
    await seedFile(path);
    await assertFails(put(as(PLAYER), path));
    await assertFails(as(PLAYER).ref(path).delete());
  });

  test("anyone can open a picture, nobody but staff can list them", async () => {
    const path = `ProfileImages/${PLAYER}_1731600000000.jpg`;
    await seedFile(path);
    await assertSucceeds(guest().ref(path).getDownloadURL());
    await assertSucceeds(as(OTHER).ref(path).getMetadata());
    await assertFails(as(PLAYER).ref("ProfileImages").listAll());
    await assertSucceeds(as(STAFF).ref("ProfileImages").listAll());
  });
});

describe("league, tournament and club images", () => {
  for (const folder of ["LeagueImages", "ClubImages"]) {
    test(`${folder}: signed-in players upload before the competition exists`, async () => {
      await assertSucceeds(put(as(PLAYER), `${folder}/Some-Name-16-11-2026-ABCDE_1731600000000.jpg`));
    });

    test(`${folder}: signed-out uploads are blocked`, async () => {
      await assertFails(put(guest(), `${folder}/x_1731600000000.jpg`));
    });

    test(`${folder}: non-images, overwrites and deletes are blocked`, async () => {
      const path = `${folder}/x_1731600000000.jpg`;
      await assertFails(put(as(PLAYER), `${folder}/page.html`, bytes(), { contentType: "text/html" }));
      await seedFile(path);
      await assertFails(put(as(PLAYER), path));
      await assertFails(as(PLAYER).ref(path).delete());
      await assertSucceeds(guest().ref(path).getDownloadURL());
    });
  }
});

describe("ladder images and other folders", () => {
  test("only staff upload ladder images", async () => {
    await assertFails(put(as(PLAYER), "LadderImages/1-abc-ladder.png", bytes(), { contentType: "image/png" }));
    await assertSucceeds(put(as(STAFF), "LadderImages/1-abc-ladder.png", bytes(), { contentType: "image/png" }));
    await assertSucceeds(guest().ref("LadderImages/1-abc-ladder.png").getDownloadURL());
  });

  test("players cannot write to the root or a new folder", async () => {
    await assertFails(put(as(PLAYER), "court-champ-logo-icon.png", bytes(), { contentType: "image/png" }));
    await assertFails(put(as(PLAYER), "Uploads/anything.jpg"));
  });

  test("anyone can open the shared root icons", async () => {
    await seedFile("court-champ-logo-icon.png", { contentType: "image/png" });
    await assertSucceeds(guest().ref("court-champ-logo-icon.png").getDownloadURL());
  });

  test("staff can delete any file", async () => {
    const path = `LeagueImages/x_1731600000000.jpg`;
    await seedFile(path);
    await assertSucceeds(as(STAFF).ref(path).delete());
  });
});
