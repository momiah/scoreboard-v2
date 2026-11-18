import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import {
  getFirestore,
  FieldValue,
  Timestamp,
  DocumentReference,
} from "firebase-admin/firestore";
import * as nodemailer from "nodemailer";

/**
 * Sends the emails queued in the `mail` collection. Replaces the Firebase
 * Trigger Email extension (firestore-send-email), which stops being
 * maintainable when Firebase Extensions shuts down on 2027-03-31.
 *
 * Reads the same document shape the extension read (`to`, `cc`, `bcc`,
 * `replyTo`, `message.subject`, `message.text`, `message.html`) and writes the
 * same `delivery` field back, so callers that queue mail need no change.
 * An optional `fromName` picks the sender name from MAIL_SENDER_NAMES.
 *
 * Mail goes out through Resend's SMTP relay, which has no hourly cap, so a
 * ladder launch can email every pre-registrant. The info@ mailbox itself
 * (Namecheap Private Email) only receives; it rejected sends after about 20 an
 * hour. Temporary failures (rate limits, timeouts, SMTP 4xx) are retried with
 * backoff by `retryMail` instead of being lost.
 */

export const MAIL_COLLECTION = "mail";

export const MAIL_FROM_ADDRESS = "info@courtchamps.com";

// Every email comes from the one address; the name inboxes show changes with
// the kind of email. Queue a doc with `fromName` set to one of these.
export const MAIL_SENDER_NAMES = {
  DEFAULT: "Court Champs",
  LADDERS: "Court Champs Ladders",
} as const;

const SENDER_NAMES: readonly string[] = Object.values(MAIL_SENDER_NAMES);

const senderName = (fromName?: string) =>
  fromName && SENDER_NAMES.includes(fromName) ? fromName : MAIL_SENDER_NAMES.DEFAULT;

export const MAIL_DELIVERY_STATE = {
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  // A temporary failure; `retryMail` sends it again after delivery.nextAttemptAt.
  RETRY: "RETRY",
  ERROR: "ERROR",
} as const;

// Total sends per doc, the first included, before a temporary failure becomes ERROR.
export const MAIL_MAX_ATTEMPTS = 6;

// Wait before attempt 2, 3, 4… Resend's limit is per second and the old
// mailbox's was per hour, so the waits grow from minutes to an hour.
export const MAIL_RETRY_DELAYS_MINUTES = [2, 10, 30, 60, 120];

// At most this many sends run at once (one per instance), which keeps a launch
// burst under Resend's default 10 requests a second. Events beyond that wait
// and are redelivered by Eventarc.
export const MAIL_MAX_INSTANCES = 5;

// The Resend API key. Lives only in Secret Manager.
const resendApiKey = defineSecret("RESEND_API_KEY");

const createTransporter = () =>
  nodemailer.createTransport({
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    auth: { user: "resend", pass: resendApiKey.value() },
  });

type Recipients = string | string[];

type MailDoc = {
  to?: Recipients;
  cc?: Recipients;
  bcc?: Recipients;
  replyTo?: string;
  fromName?: string;
  message?: { subject?: string; text?: string; html?: string };
  delivery?: { state?: string; attempts?: number; nextAttemptAt?: unknown };
};

const hasRecipients = (value?: Recipients) =>
  Array.isArray(value) ? value.length > 0 : !!value;

const toMillis = (value: unknown) => {
  const ts = value as { toMillis?: () => number; seconds?: number } | undefined;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  if (typeof ts?.seconds === "number") return ts.seconds * 1000;
  return 0;
};

const isDue = (delivery: MailDoc["delivery"], now: number) =>
  !delivery?.state ||
  (delivery.state === MAIL_DELIVERY_STATE.RETRY && toMillis(delivery.nextAttemptAt) <= now);

const TRANSIENT_CODES = new Set([
  "ECONNECTION",
  "ECONNRESET",
  "ETIMEDOUT",
  "ESOCKET",
  "EDNS",
  "EAI_AGAIN",
]);

/**
 * True for failures worth trying again: SMTP 4xx replies (temporary by
 * definition), connection problems, and rate limits however the server words
 * them (the old mailbox sent "554 … too many messages … in last 60 minutes").
 */
export const isTransientMailError = (error: unknown) => {
  const e = error as { responseCode?: number; code?: string; message?: string } | undefined;
  if (typeof e?.responseCode === "number" && e.responseCode >= 400 && e.responseCode < 500) {
    return true;
  }
  if (e?.code && TRANSIENT_CODES.has(e.code)) return true;
  return /too many|rate limit|try again later|temporar/i.test(e?.message ?? "");
};

/** Minutes to wait after a doc's `attempts`-th send failed. */
export const retryDelayMinutes = (attempts: number) =>
  MAIL_RETRY_DELAYS_MINUTES[Math.min(attempts, MAIL_RETRY_DELAYS_MINUTES.length) - 1];

/**
 * Claims the mail doc in a transaction, then sends it once. A doc that already
 * has a delivery state is never sent again, so a retried or duplicated trigger
 * event cannot send the same email twice. The one exception is a RETRY doc
 * whose wait is over, which `retryMail` hands back here.
 */
export const deliverMail = async (
  ref: DocumentReference,
  transporter: Pick<nodemailer.Transporter, "sendMail"> = createTransporter(),
) => {
  const db = getFirestore();
  const claimed = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data() as MailDoc;
    if (!isDue(data.delivery, Date.now())) return null;
    tx.update(ref, {
      "delivery.state": MAIL_DELIVERY_STATE.PROCESSING,
      "delivery.attempts": FieldValue.increment(1),
      "delivery.startTime": FieldValue.serverTimestamp(),
      "delivery.endTime": null,
      "delivery.error": null,
      "delivery.nextAttemptAt": null,
    });
    return { mail: data, attempts: (data.delivery?.attempts ?? 0) + 1 };
  });

  if (!claimed) return;
  const { mail, attempts } = claimed;

  try {
    const { to, cc, bcc, replyTo, fromName, message } = mail;
    if (!hasRecipients(to) && !hasRecipients(cc) && !hasRecipients(bcc)) {
      throw new Error("Mail doc has no recipients (to, cc or bcc)");
    }
    if (!message?.subject || (!message.text && !message.html)) {
      throw new Error("Mail doc needs message.subject and message.text or message.html");
    }

    const info = await transporter.sendMail({
      from: { name: senderName(fromName), address: MAIL_FROM_ADDRESS },
      to,
      cc,
      bcc,
      // Replies reach the info@ mailbox, which still receives as before.
      replyTo: replyTo ?? MAIL_FROM_ADDRESS,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    await ref.update({
      "delivery.state": MAIL_DELIVERY_STATE.SUCCESS,
      "delivery.endTime": FieldValue.serverTimestamp(),
      "delivery.info": {
        messageId: info.messageId ?? null,
        accepted: info.accepted ?? [],
        rejected: info.rejected ?? [],
        response: info.response ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const retry = isTransientMailError(error) && attempts < MAIL_MAX_ATTEMPTS;
    console.error(`Failed to send mail ${ref.id} (attempt ${attempts}${retry ? ", will retry" : ""})`, error);
    await ref.update({
      "delivery.state": retry ? MAIL_DELIVERY_STATE.RETRY : MAIL_DELIVERY_STATE.ERROR,
      "delivery.endTime": FieldValue.serverTimestamp(),
      "delivery.error": message,
      "delivery.nextAttemptAt": retry
        ? Timestamp.fromMillis(Date.now() + retryDelayMinutes(attempts) * 60_000)
        : null,
    });
  }
};

// No region set: Firestore is eur3, so the CLI deploys this to europe-west1.
export const sendMail = onDocumentCreated(
  {
    document: `${MAIL_COLLECTION}/{mailId}`,
    secrets: [resendApiKey],
    maxInstances: MAIL_MAX_INSTANCES,
  },
  async (event) => {
    if (!event.data) return;
    await deliverMail(event.data.ref);
  },
);

// Docs read per run; each is sent one after another, so a run stays well
// inside its timeout and under the send rate limit.
export const MAIL_RETRY_BATCH = 200;

/** Sends every RETRY doc whose wait is over, one at a time. */
export const retryDueMail = async (
  transporter: Pick<nodemailer.Transporter, "sendMail"> = createTransporter(),
) => {
  const now = Date.now();
  const waiting = await getFirestore()
    .collection(MAIL_COLLECTION)
    .where("delivery.state", "==", MAIL_DELIVERY_STATE.RETRY)
    .limit(MAIL_RETRY_BATCH)
    .get();
  const due = waiting.docs.filter((doc) => toMillis(doc.get("delivery.nextAttemptAt")) <= now);
  for (const doc of due) {
    await deliverMail(doc.ref, transporter);
  }
  return due.length;
};

export const retryMail = onSchedule(
  {
    schedule: "every 5 minutes",
    secrets: [resendApiKey],
    timeoutSeconds: 540,
    maxInstances: 1,
  },
  async () => {
    const sent = await retryDueMail();
    if (sent) console.log(`retryMail: retried ${sent} mail docs`);
  },
);
