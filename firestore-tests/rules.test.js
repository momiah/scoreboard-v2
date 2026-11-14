import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  arrayUnion,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const ZERO = { first: 0, second: 0, third: 0, fourth: 0 };

// profileDetail as 3.0.x sign-up writes it (no ladderStats / cashWon).
const legacyProfileDetail = { XP: 20, numberOfWins: 0, leagueStats: ZERO, tournamentStats: ZERO };
// profileDetail as 3.1.0 sign-up writes it.
const currentProfileDetail = { ...legacyProfileDetail, ladderStats: ZERO, cashWon: 0 };

const profile = (userId, extra = {}) => ({
  userId,
  username: userId,
  usernameLower: userId,
  email: `${userId}@example.com`,
  profileImage: `https://img/${userId}.png`,
  location: { country: "United Kingdom", city: "London", countryCode: "GB" },
  profileDetail: { ...currentProfileDetail, cashWon: 25, ladderStats: { ...ZERO, first: 1 } },
  ...extra,
});

let env;

const as = (uid) => env.authenticatedContext(uid).firestore();
const guest = () => env.unauthenticatedContext().firestore();
const seed = (fn) => env.withSecurityRulesDisabled((ctx) => fn(ctx.firestore()));

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-courtchamps-rules",
    firestore: {
      rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8"),
      host: "127.0.0.1",
      port: 8188,
    },
  });
});

after(() => env.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await seed(async (db) => {
    await setDoc(doc(db, "users/alice"), profile("alice"));
    await setDoc(doc(db, "users/bob"), profile("bob"));
    await setDoc(doc(db, "users/dana"), profile("dana", {
      location: { country: "Ireland", city: "Dublin", countryCode: "IE" },
    }));
    await setDoc(doc(db, "userRoles/staff"), { role: "admin", email: "staff@example.com" });
    await setDoc(doc(db, "users/alice/notifications/n1"), { isRead: false, recipientId: "alice" });
    await setDoc(doc(db, "users/alice/chats/league1"), { isRead: false, messageCount: 1 });
    await setDoc(doc(db, "leagues/league1"), {
      leagueName: "Highbury",
      leagueOwner: { userId: "alice", username: "alice" },
      leagueAdmins: [],
      pendingRequests: [],
      games: [],
    });
    await setDoc(doc(db, "tournaments/t1"), {
      tournamentOwner: { userId: "alice", username: "alice" },
      fixtures: [],
    });
    await setDoc(doc(db, "clubs/club1"), {
      clubOwner: { userId: "alice" },
      clubAdmins: [],
      pendingRequests: [],
    });
    await setDoc(doc(db, "clubs/club1/participants/alice"), { userId: "alice" });
    await setDoc(doc(db, "clubs/club1/participants/bob"), { userId: "bob" });
    await setDoc(doc(db, "clubs/club1/feed/e1"), { type: "created" });
    await setDoc(doc(db, "courts/verified1"), { courtName: "Highbury Fields", verified: true });
    await setDoc(doc(db, "courts/open1"), { courtName: "Barnet" });
    await setDoc(doc(db, "gameVideos/g1"), {
      videoUrl: "https://v/g1.mp4",
      postedBy: { userId: "bob" },
      likes: 0,
      likedBy: [],
      commentCount: 0,
      videoApproved: true,
    });
    await setDoc(doc(db, "gameVideos/archived"), { videoUrl: "https://v/a.mp4", videoApproved: false });
    await setDoc(doc(db, "ladderPreRegistrations/pr-open"), { status: "open", countryCode: "GB" });
    await setDoc(doc(db, "ladderPreRegistrations/pr-closed"), { status: "closed", countryCode: "GB" });
    await setDoc(doc(db, "ladders/paid"), {
      status: "registrationOpen", entryFee: 10, maxPlayers: 16, participantCount: 0,
    });
    await setDoc(doc(db, "ladders/free"), {
      status: "registrationOpen", entryFee: 0, maxPlayers: 16, participantCount: 0,
    });
    await setDoc(doc(db, "ladders/full"), {
      status: "registrationOpen", entryFee: 10, maxPlayers: 2, participantCount: 2,
    });
    await setDoc(doc(db, "ladders/playoffs"), {
      status: "playoffs", entryFee: 10, maxPlayers: 16, participantCount: 4,
    });
    await setDoc(doc(db, "ladders/paid/ladderParticipants/bob"), {
      userId: "bob", XP: 100, joinedAt: new Date("2026-10-01"), homeCourtChanges: 0,
    });
    await setDoc(doc(db, "ladders/paid/prizePayouts/p1"), { userId: "alice", status: "held" });
    await setDoc(doc(db, "ladderEligibility/free_alice"), { userId: "alice", ladderId: "free" });
  });
});

const joinLadder = (db, ladderId, uid) =>
  runTransaction(db, async (tx) => {
    tx.set(doc(db, `ladders/${ladderId}/ladderParticipants/${uid}`), {
      userId: uid,
      XP: 0,
      joinedAt: serverTimestamp(),
    });
    tx.update(doc(db, `ladders/${ladderId}`), { participantCount: increment(1) });
  });

describe("signed-out guests (all builds)", () => {
  test("read the browse data Home shows", async () => {
    const db = guest();
    await assertSucceeds(getDocs(collection(db, "users")));
    await assertSucceeds(getDocs(query(collection(db, "users"), where("usernameLower", "==", "alice"))));
    await assertSucceeds(getDocs(collection(db, "leagues")));
    await assertSucceeds(getDocs(collection(db, "tournaments")));
    await assertSucceeds(getDocs(collection(db, "clubs")));
    await assertSucceeds(getDocs(query(collectionGroup(db, "participants"), where("userId", "==", "alice"))));
    await assertSucceeds(getDocs(collection(db, "gameVideos")));
    await assertSucceeds(getDocs(query(collection(db, "ladderPreRegistrations"), where("status", "==", "open"))));
    await assertSucceeds(getDocs(collection(db, "ladderPreRegistrations/pr-open/registrants")));
    await assertSucceeds(getDocs(collection(db, "ladders")));
    await assertSucceeds(getDoc(doc(db, "courts/verified1")));
  });

  test("cannot write or read private data", async () => {
    const db = guest();
    await assertFails(setDoc(doc(db, "leagues/new"), { leagueOwner: { userId: "x" } }));
    await assertFails(updateDoc(doc(db, "users/alice"), { profileViews: 1 }));
    await assertFails(setDoc(doc(db, "users/x"), { userId: "x" }));
    await assertFails(getDoc(doc(db, "users/alice/notifications/n1")));
    await assertFails(getDoc(doc(db, "users/alice/chats/league1")));
    await assertFails(setDoc(doc(db, "feedback/f"), { text: "hi" }));
    await assertFails(setDoc(doc(db, "mail/m"), { to: "a@b.c" }));
  });
});

describe("users", () => {
  test("sign-up creates own profile and welcome notification (3.0.x and 3.1.0)", async () => {
    const legacy = as("new1");
    await assertSucceeds(setDoc(doc(legacy, "users/new1"), {
      userId: "new1", username: "new1", profileDetail: legacyProfileDetail,
    }));
    await assertSucceeds(setDoc(doc(collection(legacy, "users/new1/notifications")), { type: "welcome" }));
    const current = as("new2");
    await assertSucceeds(setDoc(doc(current, "users/new2"), {
      userId: "new2", username: "new2", profileDetail: currentProfileDetail,
    }));
  });

  test("sign-up cannot create someone else or start with winnings", async () => {
    const db = as("new1");
    await assertFails(setDoc(doc(db, "users/other"), { userId: "other", profileDetail: currentProfileDetail }));
    await assertFails(setDoc(doc(db, "users/new1"), {
      userId: "new1", profileDetail: { ...currentProfileDetail, cashWon: 500 },
    }));
    await assertFails(setDoc(doc(db, "users/new1"), {
      userId: "new1", profileDetail: { ...currentProfileDetail, leagueStats: { ...ZERO, first: 3 } },
    }));
  });

  test("an opponent approving a game rewrites profileDetail with stats kept", async () => {
    const db = as("bob");
    const fresh = (await getDoc(doc(db, "users/alice"))).data().profileDetail;
    await assertSucceeds(runTransaction(db, async (tx) => {
      tx.update(doc(db, "users/alice"), { profileDetail: { ...fresh, XP: fresh.XP + 15, numberOfWins: 1 } });
      tx.update(doc(db, "users/bob"), { profileDetail: { ...currentProfileDetail, cashWon: 25, ladderStats: { ...ZERO, first: 1 }, XP: 5 } });
    }));
  });

  test("nobody can change cash won or placings from the client", async () => {
    const fresh = profile("alice").profileDetail;
    await assertFails(updateDoc(doc(as("bob"), "users/alice"), { profileDetail: { ...fresh, cashWon: 999 } }));
    await assertFails(updateDoc(doc(as("alice"), "users/alice"), { profileDetail: { ...fresh, cashWon: 999 } }));
    await assertFails(updateDoc(doc(as("alice"), "users/alice"), {
      profileDetail: { ...fresh, tournamentStats: { ...ZERO, first: 9 } },
    }));
  });

  test("other players only touch profileDetail and profileViews +1", async () => {
    const db = as("bob");
    await assertSucceeds(updateDoc(doc(db, "users/alice"), { profileViews: 1 }));
    await assertFails(updateDoc(doc(db, "users/alice"), { profileViews: 50 }));
    await assertFails(updateDoc(doc(db, "users/alice"), { email: "stolen@example.com" }));
    await assertFails(updateDoc(doc(db, "users/alice"), { pushTokens: arrayUnion("ExponentPushToken[x]") }));
    await assertFails(deleteDoc(doc(db, "users/alice")));
  });

  test("owners edit their own profile and push tokens, and delete their account", async () => {
    const db = as("alice");
    await assertSucceeds(updateDoc(doc(db, "users/alice"), { firstName: "Al", bio: "hi" }));
    await assertSucceeds(updateDoc(doc(db, "users/alice"), { pushTokens: arrayUnion("ExponentPushToken[a]") }));
    await assertSucceeds(getDocs(collection(db, "users/alice/notifications")));
    await assertSucceeds(deleteDoc(doc(db, "users/alice/notifications/n1")));
    await assertSucceeds(deleteDoc(doc(db, "users/alice/chats/league1")));
    await assertSucceeds(deleteDoc(doc(db, "users/alice")));
  });

  test("notifications: anyone signed in sends one, only the owner reads and updates", async () => {
    await assertSucceeds(setDoc(doc(collection(as("bob"), "users/alice/notifications")), { type: "invite" }));
    await assertFails(getDoc(doc(as("bob"), "users/alice/notifications/n1")));
    await assertFails(updateDoc(doc(as("bob"), "users/alice/notifications/n1"), { isRead: true }));
    await assertSucceeds(updateDoc(doc(as("alice"), "users/alice/notifications/n1"), { isRead: true, response: "accept" }));
  });

  test("chat entries: senders read and bump the recipient's entry", async () => {
    const db = as("bob");
    await assertSucceeds(getDoc(doc(db, "users/alice/chats/league1")));
    await assertSucceeds(setDoc(doc(db, "users/alice/chats/league1"), { isRead: false, messageCount: 2 }, { merge: true }));
    await assertSucceeds(setDoc(doc(db, "users/alice/chats/t1"), { type: "chat", messageCount: 1 }));
    await assertFails(deleteDoc(doc(db, "users/alice/chats/league1")));
  });

  test("players cannot grant themselves a role", async () => {
    await assertFails(setDoc(doc(as("alice"), "userRoles/alice"), { role: "admin" }));
    await assertFails(getDoc(doc(as("alice"), "userRoles/staff")));
  });
});

describe("leagues, tournaments, clubs", () => {
  test("create with yourself as owner only", async () => {
    await assertSucceeds(setDoc(doc(as("bob"), "leagues/l2"), { leagueOwner: { userId: "bob" } }));
    await assertFails(setDoc(doc(as("bob"), "leagues/l3"), { leagueOwner: { userId: "alice" } }));
    await assertSucceeds(setDoc(doc(as("bob"), "tournaments/t2"), { tournamentOwner: { userId: "bob" } }));
    const bob = as("bob");
    const batch = writeBatch(bob);
    batch.set(doc(bob, "clubs/c2"), { clubOwner: { userId: "bob" } });
    batch.set(doc(bob, "clubs/c2/participants/bob"), { userId: "bob" });
    await assertSucceeds(batch.commit());
  });

  test("participants update the competition, but cannot take ownership or delete it", async () => {
    const db = as("bob");
    await assertSucceeds(updateDoc(doc(db, "leagues/league1"), { pendingRequests: [{ userId: "bob" }] }));
    await assertSucceeds(updateDoc(doc(db, "tournaments/t1"), { fixtures: [{ round: 1 }], gamesCompleted: increment(1) }));
    await assertFails(updateDoc(doc(db, "leagues/league1"), { leagueOwner: { userId: "bob" } }));
    await assertFails(deleteDoc(doc(db, "leagues/league1")));
    await assertFails(deleteDoc(doc(db, "tournaments/t1")));
    await assertFails(deleteDoc(doc(db, "clubs/club1")));
    await assertSucceeds(setDoc(doc(db, "leagues/league1/chat/m1"), { text: "gg", createdAt: new Date() }));
  });

  test("owners delete their competition and club", async () => {
    const db = as("alice");
    await assertSucceeds(deleteDoc(doc(db, "leagues/league1")));
    await assertSucceeds(deleteDoc(doc(db, "tournaments/t1")));
    await assertSucceeds(deleteDoc(doc(db, "clubs/club1/feed/e1")));
    await assertSucceeds(deleteDoc(doc(db, "clubs/club1/participants/bob")));
    await assertSucceeds(deleteDoc(doc(db, "clubs/club1")));
  });

  test("members leave a club", async () => {
    await assertSucceeds(deleteDoc(doc(as("bob"), "clubs/club1/participants/bob")));
    await assertFails(deleteDoc(doc(as("bob"), "clubs/club1/feed/e1")));
  });
});

describe("courts", () => {
  test("players add unverified courts and re-add unverified ones", async () => {
    const db = as("bob");
    await assertSucceeds(setDoc(doc(db, "courts/new1"), { courtName: "Finsbury", location: { city: "London" } }));
    await assertSucceeds(setDoc(doc(db, "courts/open1"), { courtName: "Barnet", location: { city: "London" } }));
    await assertSucceeds(setDoc(doc(db, "courts/ladder1"), {
      courtName: "Harrow", verified: false, submittedBy: "bob", submittedVia: "ladder",
      submission: { status: "pending", submittedBy: "bob", ladderId: "paid", reviewedBy: null, reviewedAt: null },
    }));
  });

  test("players cannot verify or overwrite a verified court", async () => {
    const db = as("bob");
    await assertFails(setDoc(doc(db, "courts/new2"), { courtName: "X", verified: true }));
    await assertFails(setDoc(doc(db, "courts/verified1"), { courtName: "Highbury Fields" }));
    await assertFails(updateDoc(doc(db, "courts/open1"), { verified: true }));
    await assertFails(deleteDoc(doc(db, "courts/open1")));
  });
});

describe("videos", () => {
  test("likes, comments, replies and court positions", async () => {
    const db = as("alice");
    await assertSucceeds(updateDoc(doc(db, "gameVideos/g1"), { likedBy: arrayUnion("alice"), likes: increment(1) }));
    await assertSucceeds(updateDoc(doc(db, "gameVideos/g1"), { commentCount: increment(1) }));
    await assertSucceeds(updateDoc(doc(db, "gameVideos/g1"), { courtPositions: { alice: "left" }, courtPositionsSetBy: "alice" }));
    await assertSucceeds(updateDoc(doc(db, "gameVideos/g1"), { videoApproved: false }));
    await assertSucceeds(setDoc(doc(db, "gameVideos/g1/comments/c1"), { text: "nice", likes: 0, likedBy: [] }));
    await assertSucceeds(updateDoc(doc(db, "gameVideos/g1/comments/c1"), { commentId: "c1", replyCount: increment(1) }));
    await assertSucceeds(setDoc(doc(db, "gameVideos/g1/comments/c1/replies/r1"), { text: "ty" }));
  });

  test("players cannot repoint, approve, create or delete videos", async () => {
    const db = as("alice");
    await assertFails(updateDoc(doc(db, "gameVideos/g1"), { videoUrl: "https://evil" }));
    await assertFails(updateDoc(doc(db, "gameVideos/archived"), { videoApproved: true }));
    await assertFails(setDoc(doc(db, "gameVideos/g2"), { videoUrl: "x" }));
    await assertFails(deleteDoc(doc(db, "gameVideos/g1")));
  });

  test("saved videos and uploads belong to their user", async () => {
    const db = as("alice");
    await assertSucceeds(setDoc(doc(db, "savedVideos/g1_bob_alice"), { videoId: "g1_bob", savedBy: { userId: "alice" } }));
    await assertFails(setDoc(doc(db, "savedVideos/g1_bob_bob"), { videoId: "g1_bob", savedBy: { userId: "bob" } }));
    await assertSucceeds(deleteDoc(doc(db, "savedVideos/g1_bob_alice")));
    await assertSucceeds(setDoc(doc(db, "pendingVideoUploads/u1"), { postedBy: { userId: "alice" }, progress: 0 }));
    await assertSucceeds(updateDoc(doc(db, "pendingVideoUploads/u1"), { progress: 40 }));
    await assertSucceeds(getDocs(query(collection(db, "pendingVideoUploads"), where("postedBy.userId", "==", "alice"))));
    await assertFails(updateDoc(doc(as("bob"), "pendingVideoUploads/u1"), { progress: 99 }));
    await assertSucceeds(deleteDoc(doc(db, "pendingVideoUploads/u1")));
    await assertSucceeds(setDoc(doc(db, "failedVideoUploads/g1_1"), { userId: "alice", errorMessage: "x" }));
  });

  test("reports and appeals", async () => {
    const db = as("alice");
    await assertSucceeds(setDoc(doc(db, "reportedVideos/r1"), { videoId: "g1_bob", reportedBy: { userId: "alice" }, status: "pending" }));
    await assertFails(setDoc(doc(db, "reportedVideos/r2"), { videoId: "g1_bob", reportedBy: { userId: "bob" }, status: "pending" }));
    await assertSucceeds(getDocs(query(collection(as("bob"), "reportedVideos"), where("videoId", "==", "g1_bob"))));
    await assertSucceeds(setDoc(doc(as("bob"), "videoReportAppeals/a1"), { videoId: "g1_bob", appealedBy: { userId: "bob" }, status: "pending" }));
    await assertSucceeds(getDocs(query(collection(as("bob"), "videoReportAppeals"), where("videoId", "==", "g1_bob"), where("appealedBy.userId", "==", "bob"))));
    await assertFails(getDoc(doc(db, "videoReportAppeals/a1")));
  });

  test("feedback and account support need sign-in", async () => {
    await assertSucceeds(setDoc(doc(as("alice"), "feedback/f1"), { text: "great" }));
    await assertSucceeds(setDoc(doc(as("alice"), "account-support/s1"), { text: "help" }));
    await assertFails(getDoc(doc(as("alice"), "feedback/f1")));
  });
});

describe("ladder pre-registration", () => {
  const registrant = (uid, extra = {}) => ({
    userId: uid,
    username: uid,
    profileImage: `https://img/${uid}.png`,
    createdAt: serverTimestamp(),
    notifiedAt: null,
    ...extra,
  });

  test("a player pre-registers for an open list in their country and leaves", async () => {
    const db = as("alice");
    await assertSucceeds(setDoc(doc(db, "ladderPreRegistrations/pr-open/registrants/alice"), registrant("alice")));
    await assertSucceeds(deleteDoc(doc(db, "ladderPreRegistrations/pr-open/registrants/alice")));
  });

  test("blocks closed lists, other countries, other players and server fields", async () => {
    await assertFails(setDoc(doc(as("alice"), "ladderPreRegistrations/pr-closed/registrants/alice"), registrant("alice")));
    await assertFails(setDoc(doc(as("dana"), "ladderPreRegistrations/pr-open/registrants/dana"), registrant("dana")));
    await assertFails(setDoc(doc(as("alice"), "ladderPreRegistrations/pr-open/registrants/bob"), registrant("bob")));
    await assertFails(setDoc(doc(as("alice"), "ladderPreRegistrations/pr-open/registrants/alice"), registrant("alice", { notifiedAt: new Date() })));
    await assertFails(setDoc(doc(as("alice"), "ladderPreRegistrations/pr-open/registrants/alice"), registrant("alice", { email: "a@b.c" })));
    await assertFails(setDoc(doc(as("alice"), "ladderPreRegistrations/pr-open/registrants/alice"), registrant("alice", { username: "someoneelse" })));
    await assertFails(updateDoc(doc(as("alice"), "ladderPreRegistrations/pr-open"), { status: "launched" }));
  });
});

describe("ladders", () => {
  test("joining a paid ladder bumps participantCount in the same transaction", async () => {
    await assertSucceeds(joinLadder(as("alice"), "paid", "alice"));
  });

  test("free ladders need a ladderEligibility doc", async () => {
    await assertSucceeds(joinLadder(as("alice"), "free", "alice"));
    await assertFails(joinLadder(as("bob"), "free", "bob"));
  });

  test("cannot join a full or closed ladder, or someone else", async () => {
    await assertFails(joinLadder(as("alice"), "full", "alice"));
    await assertFails(joinLadder(as("alice"), "playoffs", "alice"));
    await assertFails(joinLadder(as("alice"), "paid", "dana"));
  });

  test("players cannot change ladder status, prizes or courts", async () => {
    const db = as("alice");
    await assertFails(updateDoc(doc(db, "ladders/paid"), { status: "completed" }));
    await assertFails(updateDoc(doc(db, "ladders/paid"), { prizesDistributed: true }));
    await assertFails(updateDoc(doc(db, "ladders/paid"), { courtIds: arrayUnion("open1") }));
    await assertFails(updateDoc(doc(db, "ladders/paid"), { participantCount: 50 }));
  });

  test("opponents update ranking stats but not joinedAt or someone's home court", async () => {
    const db = as("alice");
    await assertSucceeds(updateDoc(doc(db, "ladders/paid/ladderParticipants/bob"), { XP: 120, numberOfWins: 1 }));
    await assertFails(updateDoc(doc(db, "ladders/paid/ladderParticipants/bob"), { joinedAt: new Date("2026-01-01") }));
    await assertFails(updateDoc(doc(db, "ladders/paid/ladderParticipants/bob"), {
      homeCourt: { courtId: "open1" }, homeCourtChanges: 1, homeCourtUpdatedBy: "alice",
    }));
  });

  test("a player changes their own home court once", async () => {
    const db = as("bob");
    const ref = doc(db, "ladders/paid/ladderParticipants/bob");
    await assertSucceeds(updateDoc(ref, {
      homeCourt: { courtId: "verified1" }, homeCourtChanges: 1, homeCourtUpdatedAt: new Date(), homeCourtUpdatedBy: "bob",
    }));
    await assertFails(updateDoc(ref, {
      homeCourt: { courtId: "open1" }, homeCourtChanges: 2, homeCourtUpdatedAt: new Date(), homeCourtUpdatedBy: "bob",
    }));
  });

  test("a doubles team joins with both member claims", async () => {
    const db = as("alice");
    await assertSucceeds(runTransaction(db, async (tx) => {
      ["alice", "bob"].forEach((uid) =>
        tx.set(doc(db, `ladders/paid/ladderMembers/${uid}`), { userId: uid, teamKey: "alice-bob", joinedAt: serverTimestamp() }));
      tx.set(doc(db, "ladders/paid/ladderTeams/alice-bob"), { teamKey: "alice-bob", playerIds: ["alice", "bob"], joinedAt: serverTimestamp() });
      tx.update(doc(db, "ladders/paid"), { participantCount: increment(1) });
    }));
    await assertFails(setDoc(doc(as("dana"), "ladders/paid/ladderMembers/dana"), { userId: "dana", teamKey: "alice-bob" }));
  });

  test("server-only ladder data", async () => {
    const db = as("alice");
    await assertFails(setDoc(doc(db, "ladderEligibility/paid_alice"), { userId: "alice", ladderId: "paid" }));
    await assertSucceeds(getDoc(doc(db, "ladderEligibility/free_alice")));
    await assertSucceeds(deleteDoc(doc(db, "ladderEligibility/free_alice")));
    await assertFails(setDoc(doc(db, "ladders/paid/playoffTies/tie1"), { status: "scheduled" }));
    await assertFails(setDoc(doc(db, "ladders/paid/ladderMatches/tie1-leg3"), { playoffLeg: 3 }));
    await assertSucceeds(setDoc(doc(db, "ladders/paid/ladderMatches/tie1-leg1"), { playoffLeg: 1, playerIds: ["alice"] }));
    await assertSucceeds(getDocs(query(collection(db, "ladders/paid/prizePayouts"), where("userId", "==", "alice"), where("status", "==", "held"))));
    await assertFails(getDocs(collection(as("bob"), "ladders/paid/prizePayouts")));
    await assertFails(updateDoc(doc(db, "ladders/paid/prizePayouts/p1"), { status: "paid" }));
    await assertFails(setDoc(doc(db, "signupRateLimits/x"), { count: 0 }));
  });
});

describe("staff", () => {
  test("staff read and write anything", async () => {
    const db = as("staff");
    await assertSucceeds(setDoc(doc(db, "ladderPreRegistrations/pr-new"), { status: "open" }));
    await assertSucceeds(updateDoc(doc(db, "courts/verified1"), { verified: true, verifiedBy: "staff" }));
    await assertSucceeds(updateDoc(doc(db, "ladders/paid"), { courtIds: arrayUnion("open1"), status: "registrationClosed" }));
    await assertSucceeds(updateDoc(doc(db, "ladders/paid/prizePayouts/p1"), { review: { decision: "pay" } }));
    await assertSucceeds(setDoc(doc(db, "users/fixture1"), profile("fixture1")));
    await assertSucceeds(getDoc(doc(db, "users/alice/notifications/n1")));
  });
});
