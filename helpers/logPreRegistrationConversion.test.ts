import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppEventsLogger } from "react-native-fbsdk-next";
import { logPreRegistrationConversion } from "./logPreRegistrationConversion";

const mockedLogEvent = AppEventsLogger.logEvent as unknown as jest.Mock;

let nextUser = 0;
const newUserId = () => `user-${++nextUser}`;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe("logPreRegistrationConversion", () => {
  it("logs CompleteRegistration with the content name, ladder and sign-up method", async () => {
    await logPreRegistrationConversion({
      userId: newUserId(),
      preRegistrationId: "launch-cash-mens-singles",
      provider: "google",
    });

    expect(mockedLogEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogEvent).toHaveBeenCalledWith(
      "fb_mobile_complete_registration",
      {
        content_name: "north_london_ladder_prereg",
        fb_content_id: "launch-cash-mens-singles",
        fb_registration_method: "google",
      },
    );
  });

  it("names email sign-ups as the sign-up conversion does", async () => {
    await logPreRegistrationConversion({
      userId: newUserId(),
      preRegistrationId: "prereg",
      provider: "email_password",
    });

    expect(mockedLogEvent.mock.calls[0][1]).toMatchObject({
      fb_registration_method: "email",
    });
  });

  it("leaves the sign-up method out when the profile has none", async () => {
    await logPreRegistrationConversion({
      userId: newUserId(),
      preRegistrationId: "prereg",
      provider: undefined,
    });

    expect(mockedLogEvent.mock.calls[0][1]).not.toHaveProperty(
      "fb_registration_method",
    );
  });

  it("logs once per user across re-joins and other ladders", async () => {
    const event = { userId: newUserId(), provider: "apple" };
    await logPreRegistrationConversion({ ...event, preRegistrationId: "a" });
    await logPreRegistrationConversion({ ...event, preRegistrationId: "a" });
    await logPreRegistrationConversion({ ...event, preRegistrationId: "b" });

    expect(mockedLogEvent).toHaveBeenCalledTimes(1);
  });

  it("does not log again for a user logged on an earlier app run", async () => {
    const userId = newUserId();
    await AsyncStorage.setItem(
      `metaPreRegistrationConversionLogged:${userId}`,
      "2026-11-01T00:00:00.000Z",
    );

    await logPreRegistrationConversion({
      userId,
      preRegistrationId: "a",
      provider: "google",
    });

    expect(mockedLogEvent).not.toHaveBeenCalled();
  });

  it("logs for each user on a shared device", async () => {
    await logPreRegistrationConversion({
      userId: newUserId(),
      preRegistrationId: "a",
      provider: "google",
    });
    await logPreRegistrationConversion({
      userId: newUserId(),
      preRegistrationId: "a",
      provider: "google",
    });

    expect(mockedLogEvent).toHaveBeenCalledTimes(2);
  });

  it("never throws when storage fails", async () => {
    jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValueOnce(new Error("storage down"));
    jest.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(
      logPreRegistrationConversion({
        userId: newUserId(),
        preRegistrationId: "a",
        provider: "google",
      }),
    ).resolves.toBeUndefined();
    expect(mockedLogEvent).not.toHaveBeenCalled();
  });
});
