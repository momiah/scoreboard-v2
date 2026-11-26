import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppEventsLogger } from "react-native-fbsdk-next";

export const PRE_REGISTRATION_CONTENT_NAME = "north_london_ladder_prereg";

const loggedKey = (userId: string) =>
  `metaPreRegistrationConversionLogged:${userId}`;
const loggedThisSession = new Set<string>();

/** The method the user signed up with, named as the sign-up conversion names it. */
export const getRegistrationMethod = (
  provider: string | undefined,
): string | undefined => {
  if (!provider) return undefined;
  return provider === "email_password" ? "email" : provider;
};

/**
 * Logs Meta's CompleteRegistration for a pre-registration the server has
 * saved, at most once per user on this device: leaving and re-joining, or
 * pre-registering for a second ladder, does not log it again.
 */
export const logPreRegistrationConversion = async ({
  userId,
  preRegistrationId,
  provider,
}: {
  userId: string;
  preRegistrationId: string;
  provider: string | undefined;
}): Promise<void> => {
  try {
    if (loggedThisSession.has(userId)) return;
    loggedThisSession.add(userId);
    if (await AsyncStorage.getItem(loggedKey(userId))) return;
    await AsyncStorage.setItem(loggedKey(userId), new Date().toISOString());

    const registrationMethod = getRegistrationMethod(provider);
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents.CompletedRegistration, {
      content_name: PRE_REGISTRATION_CONTENT_NAME,
      [AppEventsLogger.AppEventParams.ContentID]: preRegistrationId,
      ...(registrationMethod
        ? {
            [AppEventsLogger.AppEventParams.RegistrationMethod]:
              registrationMethod,
          }
        : {}),
    });
  } catch (error) {
    console.error("Failed to log the pre-registration conversion:", error);
  }
};
