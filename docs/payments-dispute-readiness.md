# Payments: chargeback and dispute readiness

Payments are not built yet. This is the checklist the payments work must meet so
Court Champs can win chargebacks and enforce section 10 of the ladder terms
(`components/ladder/LadderTermsContent.tsx`, "Chargebacks & payment disputes").

## 1. Evidence captured at payment time

A card network decides a dispute on the evidence the merchant submits. Store all
of this on the entry (or court-fee) record when the payment succeeds, written by
a Cloud Function, never the client:

| Field | Why |
| --- | --- |
| `userId`, `ladderId`, `entryId` | Ties the charge to the account and the service |
| `paymentIntentId`, `chargeId` | Matches the dispute webhook to the record |
| `amount`, `currency`, `platformFee` | Shows the customer saw and paid the stated price |
| `termsVersion`, `termsAcceptedAt` | Proof the customer agreed to the refund and chargeback terms |
| `paidAt`, device platform, app version | Shows the payment came from the customer's own signed-in app |

- The join screen must show an unticked "I agree to the Terms & Conditions"
  checkbox with a link to the terms, and joining stays disabled until it is
  ticked. A link alone is weak evidence.
- Give the terms a version. Bump it on every wording change and keep each past
  version's text, so the evidence submitted matches what the customer agreed to.
  Keep the version in `courtchamps-shared` so the app and functions read one value.
- Matches played, check-ins and results already exist in Firestore. The dispute
  pack reads them from there.

## 2. Processor setup (Stripe assumed)

- Statement descriptor: `COURTCHAMPS` with a dynamic suffix such as `LADDER` or
  `COURT FEE`, so the charge is recognisable on a bank statement.
- Email a receipt for every payment: ladder name, amount, platform fee, link to
  the terms.
- Turn on Radar and early fraud warnings. On an early fraud warning for an entry
  with no match played, refund at once: a refund does not count towards the
  dispute rate, a chargeback does.
- Keep the dispute rate below 0.75%. Above that Visa and Mastercard monitoring
  programmes apply and the processor can close the account.

## 3. Webhooks (Cloud Functions, europe-west1)

| Event | Action |
| --- | --- |
| `charge.dispute.created` | Mark the entry `disputed`. Suspend the player on that ladder (no posting or accepting matches), hold any prize, block joining paid ladders. Notify the player and admins. |
| `charge.dispute.updated` | Track the evidence deadline and alert admins before it is due. |
| `charge.dispute.closed` (`won`) | Lift the suspension and prize hold. Matches that expired meanwhile stay expired. |
| `charge.dispute.closed` (`lost`) | Remove the player from the ladder, forfeit any prize to Court Champs, set `paidCompetitionsBlocked` on the user. Rework prize pool totals from the remaining entries. |
| `radar.early_fraud_warning.created` | Refund when no match has been played; otherwise flag for admin review. |

- Verify the webhook signature and make every handler idempotent (store the
  event id), since Stripe retries.
- Suspension, prize hold and removal go through the existing ladder logic in
  `courtchamps-shared` (as disqualification does), not a second implementation.
- Prize payouts must check that no dispute is open on the winner's entry before
  paying.

## 4. Dispute response

- An admin screen lists open disputes with their deadline.
- Build the evidence pack automatically from the fields above: terms text at the
  accepted version, the acceptance timestamp, the receipt, and the matches,
  check-ins and results the player took part in.
- Submit it through the Stripe API before the deadline. An unanswered dispute is
  lost by default.

## 5. Before launch

- Have a solicitor review sections 9 and 10 of the ladder terms against UK
  consumer law (Consumer Rights Act 2015 and the Consumer Contracts Regulations
  14-day cancellation right for services).
- Any new client write the payments flow adds needs a row in
  `docs/firestore-access-requirements.md` in the same change.
- Maestro coverage for the checkbox, the suspended state, the prize hold and the
  blocked join, with seeds and cleanups, ships with the feature.
