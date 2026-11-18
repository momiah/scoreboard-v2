type Doc = Record<string, unknown>;
const store = new Map<string, Doc>();

const SERVER_TIME = { __serverTimestamp: true };

// Applies dotted-path updates ("delivery.state") the way Firestore does.
const apply = (path: string, data: Doc) => {
  const current = JSON.parse(JSON.stringify(store.get(path) ?? {}));
  Object.entries(data).forEach(([key, value]) => {
    const parts = key.split(".");
    let target = current;
    parts.slice(0, -1).forEach((part) => {
      target[part] = target[part] ?? {};
      target = target[part];
    });
    const last = parts[parts.length - 1];
    const inc = (value as { __increment?: number })?.__increment;
    target[last] = inc !== undefined ? (target[last] ?? 0) + inc : value;
  });
  store.set(path, current);
};

const snap = (path: string) => {
  const data = store.get(path);
  return {
    exists: !!data,
    data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
  };
};

const ref = (path: string) => ({
  id: path.split("/").pop(),
  path,
  update: async (data: Doc) => apply(path, data),
});

const field = (data: Doc | undefined, path: string) =>
  path.split(".").reduce<unknown>((value, key) => (value as Doc | undefined)?.[key], data);

const mockDb = {
  collection: (name: string) => ({
    where: (path: string, _op: string, value: unknown) => ({
      limit: () => ({
        get: async () => ({
          docs: [...store.keys()]
            .filter((key) => key.startsWith(`${name}/`) && field(store.get(key), path) === value)
            .map((key) => ({ ref: ref(key), get: (p: string) => field(snap(key).data(), p) })),
        }),
      }),
    }),
  }),
  runTransaction: async (fn: (tx: unknown) => Promise<unknown>) => {
    const writes: [string, Doc][] = [];
    const tx = {
      get: async (r: { path: string }) => snap(r.path),
      update: (r: { path: string }, data: Doc) => writes.push([r.path, data]),
    };
    const result = await fn(tx);
    writes.forEach(([path, data]) => apply(path, data));
    return result;
  },
};

jest.mock("firebase-admin/firestore", () => ({
  getFirestore: () => mockDb,
  FieldValue: {
    increment: (n: number) => ({ __increment: n }),
    serverTimestamp: () => ({ __serverTimestamp: true }),
  },
  Timestamp: { fromMillis: (ms: number) => ({ seconds: ms / 1000 }) },
}), { virtual: true });
jest.mock("firebase-functions/params", () => ({
  defineSecret: () => ({ value: () => "test-password" }),
}), { virtual: true });
// Hands back the handler, with the trigger options attached for checking.
jest.mock("firebase-functions/v2/firestore", () => ({
  onDocumentCreated: (options: unknown, handler: object) =>
    Object.assign(handler, { options }),
}), { virtual: true });
jest.mock("firebase-functions/v2/scheduler", () => ({
  onSchedule: (_: unknown, handler: unknown) => handler,
}), { virtual: true });

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));
jest.mock("nodemailer", () => ({
  createTransport: (...args: unknown[]) => mockCreateTransport(...(args as [])),
}), { virtual: true });

import {
  deliverMail,
  sendMail,
  retryDueMail,
  isTransientMailError,
  retryDelayMinutes,
  MAIL_FROM_ADDRESS,
  MAIL_SENDER_NAMES,
  MAIL_DELIVERY_STATE,
  MAIL_MAX_ATTEMPTS,
  MAIL_MAX_INSTANCES,
} from "../../functions/src/sendMail";

const PATH = "mail/test-mail";

const queued = (overrides: Doc = {}) => ({
  to: "player@example.com",
  message: {
    subject: "Your ladder is open",
    text: "Join now",
    html: "<p>Join now</p>",
  },
  ...overrides,
});

const delivery = () => store.get(PATH)?.delivery as Doc;

// The trigger as deployed: onDocumentCreated is mocked to hand back the handler.
const trigger = sendMail as unknown as (event: unknown) => Promise<void>;
const fire = () => trigger({ data: { ref: ref(PATH) } });

beforeEach(() => {
  store.clear();
  jest.clearAllMocks();
  mockSendMail.mockResolvedValue({
    messageId: "<abc@courtchamps.com>",
    accepted: ["player@example.com"],
    rejected: [],
    response: "250 OK",
  });
});

describe("sendMail trigger", () => {
  it("sends through Resend as Court Champs and marks the doc SUCCESS", async () => {
    store.set(PATH, queued());

    await fire();

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: "smtp.resend.com",
      port: 465,
      secure: true,
      auth: { user: "resend", pass: "test-password" },
    });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: { name: "Court Champs", address: "info@courtchamps.com" },
      to: "player@example.com",
      subject: "Your ladder is open",
      text: "Join now",
      html: "<p>Join now</p>",
    }));
    expect(MAIL_FROM_ADDRESS).toBe("info@courtchamps.com");
    expect(delivery()).toEqual({
      state: MAIL_DELIVERY_STATE.SUCCESS,
      attempts: 1,
      startTime: SERVER_TIME,
      endTime: SERVER_TIME,
      error: null,
      nextAttemptAt: null,
      info: {
        messageId: "<abc@courtchamps.com>",
        accepted: ["player@example.com"],
        rejected: [],
        response: "250 OK",
      },
    });
  });

  it("never sends the same doc twice when the event is delivered again", async () => {
    store.set(PATH, queued());

    await fire();
    await fire();

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(delivery().attempts).toBe(1);
  });

  it("does not send a doc another invocation has already claimed", async () => {
    store.set(PATH, queued({ delivery: { state: MAIL_DELIVERY_STATE.PROCESSING, attempts: 1 } }));

    await fire();

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(delivery().state).toBe(MAIL_DELIVERY_STATE.PROCESSING);
  });

  it("does nothing when the doc was deleted before the trigger ran", async () => {
    await deliverMail(ref(PATH) as never, { sendMail: mockSendMail } as never);

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(store.has(PATH)).toBe(false);
  });

  it("records a permanent SMTP error and does not retry the send", async () => {
    store.set(PATH, queued());
    mockSendMail.mockRejectedValueOnce(
      Object.assign(new Error("535 Authentication failed"), { responseCode: 535 }),
    );
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    await fire();
    await fire();

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(delivery()).toEqual(expect.objectContaining({
      state: MAIL_DELIVERY_STATE.ERROR,
      attempts: 1,
      error: "535 Authentication failed",
      endTime: SERVER_TIME,
    }));
    consoleError.mockRestore();
  });

  it("marks a doc with no recipients as ERROR without sending", async () => {
    store.set(PATH, queued({ to: [] }));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    await fire();

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(delivery().state).toBe(MAIL_DELIVERY_STATE.ERROR);
    expect(delivery().error).toMatch(/no recipients/);
    consoleError.mockRestore();
  });

  it("marks a doc with no subject or body as ERROR without sending", async () => {
    store.set(PATH, queued({ message: { subject: "Hi" } }));
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

    await fire();

    expect(mockSendMail).not.toHaveBeenCalled();
    expect(delivery().state).toBe(MAIL_DELIVERY_STATE.ERROR);
    consoleError.mockRestore();
  });

  it("sets replies to go to the info@ mailbox when the doc names none", async () => {
    store.set(PATH, queued());

    await fire();

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      replyTo: "info@courtchamps.com",
    }));
  });

  it("runs on at most a few instances so a launch burst stays under the rate limit", () => {
    expect((sendMail as unknown as { options: Doc }).options).toEqual(expect.objectContaining({
      document: "mail/{mailId}",
      maxInstances: MAIL_MAX_INSTANCES,
    }));
  });

  it("passes cc, bcc and replyTo through like the extension did", async () => {
    store.set(PATH, queued({
      to: ["a@example.com", "b@example.com"],
      cc: "c@example.com",
      bcc: ["d@example.com"],
      replyTo: "support@courtchamps.com",
    }));

    await fire();

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: ["a@example.com", "b@example.com"],
      cc: "c@example.com",
      bcc: ["d@example.com"],
      replyTo: "support@courtchamps.com",
    }));
  });

  it("uses the sender name the doc asks for, from the same address", async () => {
    store.set(PATH, queued({ fromName: MAIL_SENDER_NAMES.LADDERS }));

    await fire();

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: { name: "Court Champs Ladders", address: "info@courtchamps.com" },
    }));
  });

  it("falls back to Court Champs for a sender name that isn't on the list", async () => {
    store.set(PATH, queued({ fromName: "Your Bank" }));

    await fire();

    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: { name: "Court Champs", address: "info@courtchamps.com" },
    }));
  });
});

describe("retries", () => {
  const NOW = Date.parse("2026-11-18T01:00:00Z");
  let now = NOW;
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    now = NOW;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const rateLimited = () =>
    Object.assign(
      new Error("Data command failed: 554 5.7.1 Reject: too many messages from sender in last 60 minutes"),
      { responseCode: 554 },
    );

  it("parks a rate-limited send as RETRY with a wait instead of failing it", async () => {
    store.set(PATH, queued());
    mockSendMail.mockRejectedValueOnce(rateLimited());

    await fire();

    expect(delivery()).toEqual(expect.objectContaining({
      state: MAIL_DELIVERY_STATE.RETRY,
      attempts: 1,
      error: expect.stringMatching(/too many messages/),
      nextAttemptAt: { seconds: (NOW + 2 * 60_000) / 1000 },
    }));
    expect(consoleError).toHaveBeenCalled();
  });

  it("does not resend a RETRY doc before its wait is over", async () => {
    store.set(PATH, queued());
    mockSendMail.mockRejectedValueOnce(rateLimited());
    await fire();

    now = NOW + 60_000;
    await fire();
    await retryDueMail({ sendMail: mockSendMail } as never);

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(delivery().state).toBe(MAIL_DELIVERY_STATE.RETRY);
  });

  it("sends due RETRY docs on the next run and marks them SUCCESS", async () => {
    store.set(PATH, queued());
    store.set("mail/later", queued({
      delivery: { state: MAIL_DELIVERY_STATE.RETRY, attempts: 1, nextAttemptAt: { seconds: (NOW + 3_600_000) / 1000 } },
    }));
    mockSendMail.mockRejectedValueOnce(Object.assign(new Error("Too many requests"), { responseCode: 429 }));
    await fire();

    now = NOW + 2 * 60_000;
    const sent = await retryDueMail({ sendMail: mockSendMail } as never);

    expect(sent).toBe(1);
    expect(mockSendMail).toHaveBeenCalledTimes(2);
    expect(delivery()).toEqual(expect.objectContaining({
      state: MAIL_DELIVERY_STATE.SUCCESS,
      attempts: 2,
      error: null,
      nextAttemptAt: null,
    }));
    expect((store.get("mail/later")?.delivery as Doc).state).toBe(MAIL_DELIVERY_STATE.RETRY);
  });

  it("waits longer after each failed attempt", () => {
    expect([1, 2, 3, 4, 5, 9].map(retryDelayMinutes)).toEqual([2, 10, 30, 60, 120, 120]);
  });

  it("gives up with ERROR after the last attempt", async () => {
    store.set(PATH, queued({
      delivery: { state: MAIL_DELIVERY_STATE.RETRY, attempts: MAIL_MAX_ATTEMPTS - 1, nextAttemptAt: { seconds: 0 } },
    }));
    mockSendMail.mockRejectedValueOnce(rateLimited());

    await retryDueMail({ sendMail: mockSendMail } as never);

    expect(delivery()).toEqual(expect.objectContaining({
      state: MAIL_DELIVERY_STATE.ERROR,
      attempts: MAIL_MAX_ATTEMPTS,
      nextAttemptAt: null,
    }));
  });

  it("tells temporary failures from permanent ones", () => {
    expect(isTransientMailError({ responseCode: 421, message: "Try again" })).toBe(true);
    expect(isTransientMailError({ responseCode: 450, message: "Mailbox busy" })).toBe(true);
    expect(isTransientMailError({ code: "ETIMEDOUT", message: "Timeout" })).toBe(true);
    expect(isTransientMailError(rateLimited())).toBe(true);
    expect(isTransientMailError(new Error("Rate limit exceeded"))).toBe(true);
    expect(isTransientMailError({ responseCode: 535, message: "Authentication failed" })).toBe(false);
    expect(isTransientMailError({ responseCode: 550, message: "Mailbox unavailable" })).toBe(false);
    expect(isTransientMailError(new Error("Mail doc has no recipients (to, cc or bcc)"))).toBe(false);
  });
});
