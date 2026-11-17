import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { defineSecret } from "firebase-functions/params";
import {
  getFirestore,
  FieldValue,
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
 */

export const MAIL_COLLECTION = "mail";

export const MAIL_FROM = "Court Champs <info@courtchamps.com>";

export const MAIL_DELIVERY_STATE = {
  PROCESSING: "PROCESSING",
  SUCCESS: "SUCCESS",
  ERROR: "ERROR",
} as const;

// The Namecheap Private Email mailbox password, also used by the website's
// account-deletion email. Lives only in Secret Manager.
const smtpPassword = defineSecret("SMTP_PASSWORD_COURTCHAMPS");

const SMTP_USER = "info@courtchamps.com";

const createTransporter = () =>
  nodemailer.createTransport({
    host: "mail.privateemail.com",
    port: 465,
    secure: true,
    auth: { user: SMTP_USER, pass: smtpPassword.value() },
  });

type Recipients = string | string[];

type MailDoc = {
  to?: Recipients;
  cc?: Recipients;
  bcc?: Recipients;
  replyTo?: string;
  message?: { subject?: string; text?: string; html?: string };
  delivery?: { state?: string };
};

const hasRecipients = (value?: Recipients) =>
  Array.isArray(value) ? value.length > 0 : !!value;

/**
 * Claims the mail doc in a transaction, then sends it once. A doc that already
 * has a delivery state is never sent again, so a retried or duplicated trigger
 * event cannot send the same email twice.
 */
export const deliverMail = async (
  ref: DocumentReference,
  transporter: Pick<nodemailer.Transporter, "sendMail"> = createTransporter(),
) => {
  const db = getFirestore();
  const mail = await db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return null;
    const data = snapshot.data() as MailDoc;
    if (data.delivery?.state) return null;
    tx.update(ref, {
      "delivery.state": MAIL_DELIVERY_STATE.PROCESSING,
      "delivery.attempts": FieldValue.increment(1),
      "delivery.startTime": FieldValue.serverTimestamp(),
      "delivery.endTime": null,
      "delivery.error": null,
    });
    return data;
  });

  if (!mail) return;

  try {
    const { to, cc, bcc, replyTo, message } = mail;
    if (!hasRecipients(to) && !hasRecipients(cc) && !hasRecipients(bcc)) {
      throw new Error("Mail doc has no recipients (to, cc or bcc)");
    }
    if (!message?.subject || (!message.text && !message.html)) {
      throw new Error("Mail doc needs message.subject and message.text or message.html");
    }

    const info = await transporter.sendMail({
      from: MAIL_FROM,
      to,
      cc,
      bcc,
      replyTo,
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
    console.error(`Failed to send mail ${ref.id}`, error);
    await ref.update({
      "delivery.state": MAIL_DELIVERY_STATE.ERROR,
      "delivery.endTime": FieldValue.serverTimestamp(),
      "delivery.error": error instanceof Error ? error.message : String(error),
    });
  }
};

// No region set: Firestore is eur3, so the CLI deploys this to europe-west1.
export const sendMail = onDocumentCreated(
  { document: `${MAIL_COLLECTION}/{mailId}`, secrets: [smtpPassword] },
  async (event) => {
    if (!event.data) return;
    await deliverMail(event.data.ref);
  },
);
