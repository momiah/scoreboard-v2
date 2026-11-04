// In-memory stand-in for the firebase/firestore functions the helpers use.
// Use: jest.mock("firebase/firestore", () => require("<path>/fakeFirestore").firestoreMock);
const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

const store = new Map();
const writes = [];

const INC = "__fakeIncrement";
const UNION = "__fakeArrayUnion";

const applyField = (current, value) => {
  if (value && value[INC] !== undefined) return (current || 0) + value[INC];
  if (value && value[UNION]) {
    const list = [...(current || [])];
    value[UNION].forEach((item) => {
      if (!list.some((x) => JSON.stringify(x) === JSON.stringify(item))) list.push(item);
    });
    return list;
  }
  return clone(value);
};

const setPath = (obj, dotted, value) => {
  const keys = dotted.split(".");
  let target = obj;
  keys.slice(0, -1).forEach((k) => {
    target[k] = target[k] && typeof target[k] === "object" ? target[k] : {};
    target = target[k];
  });
  const last = keys[keys.length - 1];
  target[last] = applyField(target[last], value);
};

const snapshot = (ref) => {
  const data = store.get(ref.path);
  return { id: ref.id, ref, exists: () => data !== undefined, data: () => clone(data) };
};

const update = (ref, data) => {
  if (!store.has(ref.path)) throw new Error(`No document to update: ${ref.path}`);
  const next = clone(store.get(ref.path));
  Object.entries(data).forEach(([k, v]) => setPath(next, k, v));
  store.set(ref.path, next);
  writes.push({ type: "update", path: ref.path, data });
};

const set = (ref, data) => {
  const next = {};
  Object.entries(data).forEach(([k, v]) => setPath(next, k, v));
  store.set(ref.path, next);
  writes.push({ type: "set", path: ref.path, data });
};

const firestoreMock = {
  doc: (_db, ...path) => {
    const full = path.join("/");
    return { path: full, id: full.split("/").pop() };
  },
  collection: (_db, ...path) => ({ path: path.join("/") }),
  getDoc: async (ref) => snapshot(ref),
  updateDoc: async (ref, data) => update(ref, data),
  setDoc: async (ref, data) => set(ref, data),
  addDoc: async (colRef, data) => {
    const ref = { path: `${colRef.path}/auto-${writes.length}`, id: `auto-${writes.length}` };
    set(ref, data);
    return ref;
  },
  increment: (n) => ({ [INC]: n }),
  arrayUnion: (...items) => ({ [UNION]: items }),
  runTransaction: async (_db, fn) => {
    const staged = [];
    const tx = {
      get: async (ref) => snapshot(ref),
      update: (ref, data) => {
        staged.push(() => update(ref, data));
        return tx;
      },
      set: (ref, data) => {
        staged.push(() => set(ref, data));
        return tx;
      },
    };
    const result = await fn(tx);
    staged.forEach((apply) => apply());
    return result;
  },
};

const fakeDb = {
  reset: () => {
    store.clear();
    writes.length = 0;
  },
  seed: (path, data) => store.set(path, clone(data)),
  read: (path) => clone(store.get(path)),
  writes,
};

module.exports = { firestoreMock, fakeDb };
