import React from "react";
import { act, renderHook } from "@testing-library/react-native";
import {
  deleteDoc,
  getCountFromServer,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import { AppEventsLogger } from "react-native-fbsdk-next";
import { UserContext } from "../context/UserContext";
import {
  useLadderPreRegistrants,
  useLadderPreRegistrations,
} from "./useLadderPreRegistrations";

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((...path) => ({ path: path.slice(1).join("/") })),
  doc: jest.fn((parent, id) => ({ path: `${parent?.path}/${id}` })),
  query: jest.fn((ref) => ref),
  orderBy: jest.fn(),
  limit: jest.fn(),
  where: jest.fn(),
  setDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(),
  onSnapshot: jest.fn(),
  getCountFromServer: jest.fn(),
}));

const mockedOnSnapshot = onSnapshot as unknown as jest.Mock;
const mockedCount = getCountFromServer as unknown as jest.Mock;
const mockedDelete = deleteDoc as unknown as jest.Mock;
const mockedSet = setDoc as unknown as jest.Mock;
const mockedLogEvent = AppEventsLogger.logEvent as unknown as jest.Mock;

const counted = (count: number) => ({ data: () => ({ count }) });
const deferred = <T,>() => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

let emitRegistrants: (ids: string[]) => void = () => undefined;

const userWrapper =
  (userId: string) =>
  ({ children }: { children: React.ReactNode }) => (
    <UserContext.Provider
      value={{
        currentUser: {
          userId,
          username: userId,
          profileImage: "",
          provider: "google",
        },
      }}
    >
      {children}
    </UserContext.Provider>
  );
const wrapper = userWrapper("me");

beforeEach(() => {
  jest.clearAllMocks();
  mockedOnSnapshot.mockImplementation((ref, next) => {
    if (
      String(ref?.path ?? "").endsWith("/registrants") &&
      typeof next === "function"
    ) {
      emitRegistrants = (ids) =>
        next({ docs: ids.map((userId) => ({ data: () => ({ userId }) })) });
    }
    return () => undefined;
  });
});

const renderBoth = (userWrapperFor = wrapper) =>
  renderHook(
    () => ({
      list: useLadderPreRegistrations(),
      registrants: useLadderPreRegistrants("prereg", 10),
    }),
    { wrapper: userWrapperFor },
  );

describe("useLadderPreRegistrants", () => {
  it("recounts once the user's own leave reaches the server, not before", async () => {
    const write = deferred<void>();
    mockedDelete.mockReturnValue(write.promise);
    mockedCount
      .mockResolvedValueOnce(counted(6))
      .mockResolvedValueOnce(counted(6))
      .mockResolvedValueOnce(counted(5));
    const { result } = renderBoth();

    await act(async () => emitRegistrants(["a", "b", "c", "d", "e", "me"]));
    expect(result.current.registrants.total).toBe(6);

    let leaving: Promise<void> = Promise.resolve();
    await act(async () => {
      leaving = result.current.list.leave("prereg");
    });
    await act(async () => emitRegistrants(["a", "b", "c", "d", "e"]));
    expect(result.current.registrants.total).toBe(6);

    await act(async () => {
      write.resolve();
      await leaving;
    });
    expect(result.current.registrants.total).toBe(5);
  });

  it("recounts once the user's own pre-registration reaches the server", async () => {
    mockedSet.mockResolvedValue(undefined);
    mockedCount.mockResolvedValueOnce(counted(5)).mockResolvedValue(counted(6));
    const { result } = renderBoth();

    await act(async () => emitRegistrants(["a", "b", "c", "d", "e"]));
    await act(async () => result.current.list.preRegister("prereg"));
    expect(result.current.registrants.total).toBe(6);
  });

  it("keeps the newest count when an older request answers last", async () => {
    const first = deferred<ReturnType<typeof counted>>();
    const second = deferred<ReturnType<typeof counted>>();
    mockedCount
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    const { result } = renderHook(() => useLadderPreRegistrants("prereg", 10));

    await act(async () => emitRegistrants(["a", "b", "c", "d", "e", "f"]));
    await act(async () => emitRegistrants(["a", "b", "c", "d", "e"]));
    await act(async () => second.resolve(counted(5)));
    await act(async () => first.resolve(counted(6)));

    expect(result.current.total).toBe(5);
  });
});

describe("useLadderPreRegistrations pre-registration conversion", () => {
  it("logs CompleteRegistration only once the server has saved the pre-registration", async () => {
    const write = deferred<void>();
    mockedSet.mockReturnValueOnce(write.promise);
    mockedCount.mockResolvedValue(counted(1));
    const { result } = renderBoth(userWrapper("first-time-user"));

    let registering: Promise<void> = Promise.resolve();
    await act(async () => {
      registering = result.current.list.preRegister("prereg");
    });
    expect(mockedLogEvent).not.toHaveBeenCalled();

    await act(async () => {
      write.resolve();
      await registering;
    });
    expect(mockedLogEvent).toHaveBeenCalledWith(
      "fb_mobile_complete_registration",
      {
        content_name: "north_london_ladder_prereg",
        fb_content_id: "prereg",
        fb_registration_method: "google",
      },
    );
  });

  it("does not log when the write fails", async () => {
    mockedSet.mockRejectedValueOnce(new Error("offline"));
    const { result } = renderBoth(userWrapper("offline-user"));

    await act(async () => {
      await expect(result.current.list.preRegister("prereg")).rejects.toThrow(
        "offline",
      );
    });
    expect(mockedLogEvent).not.toHaveBeenCalled();
  });
});
