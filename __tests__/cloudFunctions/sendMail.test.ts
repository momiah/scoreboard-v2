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

const mockDb = {
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
}), { virtual: true });
jest.mock("firebase-functions/params", () => ({
  defineSecret: () => ({ value: () => "test-password" }),
}), { virtual: true });
jest.mock("firebase-functions/v2/firestore", () => ({
  onDocumentCreated: (_: unknown, handler: unknown) => handler,
}), { virtual: true });

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));
jest.mock("nodemailer", () => ({
  createTransport: (...args: unknown[]) => mockCreateTransport(...(args as [])),
}), { virtual: true });

import {
  deliverMail,
  sendMail,
  MAIL_FROM,
  MAIL_DELIVERY_STATE,
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
  it("sends through Private Email as Court Champs and marks the doc SUCCESS", async () => {
    store.set(PATH, queued());

    await fire();

    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: "mail.privateemail.com",
      port: 465,
      secure: true,
      auth: { user: "info@courtchamps.com", pass: "test-password" },
    });
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledWith(expect.objectContaining({
      from: MAIL_FROM,
      to: "player@example.com",
      subject: "Your ladder is open",
      text: "Join now",
      html: "<p>Join now</p>",
    }));
    expect(MAIL_FROM).toBe("Court Champs <info@courtchamps.com>");
    expect(delivery()).toEqual({
      state: MAIL_DELIVERY_STATE.SUCCESS,
      attempts: 1,
      startTime: SERVER_TIME,
      endTime: SERVER_TIME,
      error: null,
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

  it("records the SMTP error and does not retry the send", async () => {
    store.set(PATH, queued());
    mockSendMail.mockRejectedValueOnce(new Error("535 Authentication failed"));
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
});
