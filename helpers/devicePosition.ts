import * as Location from "expo-location";

export const POSITION_TIMEOUT_MS = 15000;
export const LAST_KNOWN_MAX_AGE_MS = 60000;

export const withTimeout = <T,>(
  promise: Promise<T>,
  ms: number,
): Promise<T | null> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

export const getDevicePosition =
  async (): Promise<Location.LocationObject | null> => {
    const current = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      POSITION_TIMEOUT_MS,
    );
    if (current) return current;
    return Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
    });
  };
