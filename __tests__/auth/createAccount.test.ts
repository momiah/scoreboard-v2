import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { addDoc, setDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { AppEventsLogger } from "react-native-fbsdk-next";
import { ccImageEndpoint, notificationTypes } from "@shared";

import {
  checkEmailExists,
  checkUsernameExists,
  createCourtChampsAccount,
  FULL_NAME_CHARACTERS_MESSAGE,
  normaliseEmail,
  normaliseFullName,
  signupErrorMessage,
  splitFullName,
  validateEmail,
  validatePassword,
  validatePersonName,
  validateUsername,
} from "../../screens/Authentication/createAccount";
import { auth } from "../../services/firebase.config";
import { registerForPushNotificationsAsync } from "../../services/pushNotifications";
import { uploadProfileImage } from "../../utils/ProfileImageUploadToFirebase";

const mocked = (fn: unknown) => fn as jest.Mock;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const callables = require("firebase/functions").__callables as Record<
  "checkEmailAvailable" | "checkUsernameAvailable",
  jest.Mock
>;
const available = (value: boolean) => ({ data: { available: value } });
const mockAuth = auth as unknown as {
  currentUser: unknown;
  signOut: jest.Mock;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  mockAuth.currentUser = null;
  callables.checkEmailAvailable.mockResolvedValue(available(true));
  callables.checkUsernameAvailable.mockResolvedValue(available(true));
  mocked(setDoc).mockResolvedValue(undefined);
  mocked(addDoc).mockResolvedValue(undefined);
  mocked(sendEmailVerification).mockResolvedValue(undefined);
});

describe("field validators", () => {
  it("normaliseEmail trims and lowercases", () => {
    expect(normaliseEmail("  Mo@Example.COM ")).toBe("mo@example.com");
  });

  it("validateEmail", () => {
    expect(validateEmail("")).toBe("Email is required");
    expect(validateEmail("not-an-email")).toBe("Invalid email format");
    expect(validateEmail("a@b")).toBe("Invalid email format");
    expect(validateEmail("a@b.co")).toBe(true);
    const local = "a".repeat(64);
    const longest = `${local}@${"b".repeat(254 - 64 - 1 - 4)}.com`;
    expect(longest).toHaveLength(254);
    expect(validateEmail(longest)).toBe(true);
    expect(validateEmail(`x${longest}`)).toBe(
      "Email must be 254 characters or fewer",
    );
  });

  it("validatePassword", () => {
    expect(validatePassword("")).toBe("Password is required");
    expect(validatePassword("12345")).toBe(
      "Password must be at least 6 characters",
    );
    expect(validatePassword("123456")).toBe(true);
  });

  it("validatePersonName", () => {
    expect(validatePersonName("")).toBe("This field is required");
    expect(validatePersonName("Mo1")).toMatch(/Only letters/);
    expect(validatePersonName("Mo Mia")).toMatch(/Only letters/);
    expect(validatePersonName("Mo")).toBe(true);
  });

  describe("splitFullName", () => {
    it("requires a first and last name", () => {
      expect(splitFullName("  ")).toEqual({ error: "Full name is required" });
      expect(splitFullName("Mo")).toEqual({
        error: "Enter your first and last name",
      });
      expect(splitFullName("  Mo   ")).toEqual({
        error: "Enter your first and last name",
      });
    });

    it.each([
      ["Mo Mia", "Mo", "Mia"],
      ["  Mo    Mia  ", "Mo", "Mia"],
      ["Mary Jane Smith", "Mary", "Jane Smith"],
      ["Anne-Marie O'Brien", "Anne-Marie", "O'Brien"],
      ["Anne-Marie O’Brien", "Anne-Marie", "O’Brien"],
      ["José Álvarez", "José", "Álvarez"],
      ["Zoë Brontë-Smith", "Zoë", "Brontë-Smith"],
      ["Martin Luther King Jr.", "Martin", "Luther King Jr."],
      ["J. R. R. Tolkien", "J.", "R. R. Tolkien"],
      ["Søren Kierkegaard", "Søren", "Kierkegaard"],
      ["Мария Иванова", "Мария", "Иванова"],
      ["mo mia", "mo", "mia"],
      ["José Alvarez", "José", "Alvarez"],
    ])("accepts %p", (input, firstName, lastName) => {
      expect(splitFullName(input)).toEqual({ firstName, lastName });
    });

    it("accepts an accent typed as a combining mark", () => {
      expect(splitFullName("Jose\u0301 Mia")).toEqual({
        firstName: "Jose\u0301",
        lastName: "Mia",
      });
    });

    it.each([
      "Mo M1a",
      "Mo Mia!",
      "Mo -Mia",
      "Mo 'Mia",
      "Mo .Mia",
      "Mo @mia",
      "Mo Mia_",
      "Mo 😀",
    ])("rejects %p", (input) => {
      expect(splitFullName(input)).toEqual({
        error: FULL_NAME_CHARACTERS_MESSAGE,
      });
    });

    it("limits the full name to 50 characters", () => {
      const fifty = `${"a".repeat(25)} ${"b".repeat(24)}`;
      expect(fifty).toHaveLength(50);
      expect(splitFullName(fifty)).toHaveProperty("firstName");
      expect(splitFullName(`${fifty}b`)).toEqual({
        error: "Full name must be 50 characters or fewer",
      });
    });

    it("measures the limit after collapsing spaces", () => {
      const name = `${"a".repeat(20)}          ${"b".repeat(20)}`;
      expect(splitFullName(name)).toHaveProperty("firstName");
    });

    it("limits first and last names to 30 characters each", () => {
      expect(splitFullName(`${"a".repeat(31)} Mia`)).toEqual({
        error: "First name must be 30 characters or fewer",
      });
      expect(splitFullName(`Mo ${"b".repeat(31)}`)).toEqual({
        error: "Last name must be 30 characters or fewer",
      });
      expect(splitFullName(`${"a".repeat(30)} Mia`)).toHaveProperty(
        "firstName",
      );
    });
  });

  it("normaliseFullName trims and collapses spaces only", () => {
    expect(normaliseFullName("  mARY   jane\tsmith ")).toBe(
      "mARY jane smith",
    );
  });
});

describe("checkUsernameExists", () => {
  it("calls checkUsernameAvailable with the trimmed username", async () => {
    callables.checkUsernameAvailable.mockResolvedValueOnce(available(false));
    await expect(checkUsernameExists(" MoMia ")).resolves.toBe(true);
    expect(httpsCallable).toHaveBeenCalledWith({}, "checkUsernameAvailable");
    expect(callables.checkUsernameAvailable).toHaveBeenCalledWith({
      username: "MoMia",
    });
  });

  it("returns false when available", async () => {
    await expect(checkUsernameExists("momia")).resolves.toBe(false);
  });

  it.each([
    ["a callable error", () => Promise.reject({ code: "functions/unavailable" })],
    ["rate limiting", () => Promise.reject({ code: "functions/resource-exhausted" })],
    ["a malformed response", () => Promise.resolve({ data: {} })],
  ])("fails closed (treats as taken) on %s", async (_label, impl) => {
    callables.checkUsernameAvailable.mockImplementationOnce(impl);
    await expect(checkUsernameExists("momia")).resolves.toBe(true);
  });
});

describe("checkEmailExists", () => {
  it("calls checkEmailAvailable with the normalised email", async () => {
    callables.checkEmailAvailable.mockResolvedValueOnce(available(false));
    await expect(checkEmailExists("  Mo@Example.com ")).resolves.toBe(true);
    expect(httpsCallable).toHaveBeenCalledWith({}, "checkEmailAvailable");
    expect(callables.checkEmailAvailable).toHaveBeenCalledWith({
      email: "mo@example.com",
    });
  });

  it("returns false for an available email", async () => {
    await expect(checkEmailExists("mo@example.com")).resolves.toBe(false);
  });

  it.each([
    ["a callable error", () => Promise.reject({ code: "functions/internal" })],
    ["a missing App Check token", () => Promise.reject({ code: "functions/failed-precondition" })],
    ["a malformed response", () => Promise.resolve({ data: null })],
  ])("throws signup/email-check-failed on %s", async (_label, impl) => {
    callables.checkEmailAvailable.mockImplementationOnce(impl);
    await expect(checkEmailExists("mo@example.com")).rejects.toMatchObject({
      code: "signup/email-check-failed",
      message: "Couldn't check your email. Please try again.",
    });
  });
});

describe("validateUsername", () => {
  it.each([
    ["", "Username is required"],
    ["abc", "Username must be at least 4 characters"],
    ["abcdefghijk", "Username cannot exceed 10 characters"],
    ["ab cd", "Spaces are not allowed"],
    ["ab_cd", "Only letters, numbers, and dashes (-) are allowed"],
    ["ab.cd", "Only letters, numbers, and dashes (-) are allowed"],
    ["josé", "Only letters, numbers, and dashes (-) are allowed"],
    ["-abcd", "Username can't start or end with a dash"],
    ["abcd-", "Username can't start or end with a dash"],
    ["ab--cd", "Username can't have two dashes in a row"],
    ["   ", "Username is required"],
    ["  abc  ", "Username must be at least 4 characters"],
  ])("%p -> %p without calling the server", async (value, message) => {
    await expect(validateUsername(value)).resolves.toBe(message);
    expect(callables.checkUsernameAvailable).not.toHaveBeenCalled();
  });

  it("reports a taken username", async () => {
    callables.checkUsernameAvailable.mockResolvedValueOnce(available(false));
    await expect(validateUsername("mo-mia")).resolves.toBe(
      "Username already exists",
    );
  });

  it("accepts a free username", async () => {
    await expect(validateUsername("mo-mia")).resolves.toBe(true);
  });

  it("trims before checking and checks case-insensitively", async () => {
    await expect(validateUsername("  Mo-Mia1  ")).resolves.toBe(true);
    expect(callables.checkUsernameAvailable).toHaveBeenCalledWith({
      username: "Mo-Mia1",
    });
  });

  it("accepts exactly 4 and 10 characters", async () => {
    await expect(validateUsername("abcd")).resolves.toBe(true);
    await expect(validateUsername("a-b-c-d-e1")).resolves.toBe(true);
  });
});

describe("signupErrorMessage", () => {
  it.each([
    ["auth/email-already-in-use", "Email already registered"],
    ["auth/weak-password", "Password is too weak"],
    ["auth/invalid-email", "Invalid email address"],
    [
      "auth/network-request-failed",
      "Network error. Check your connection and try again.",
    ],
    ["auth/too-many-requests", "Too many attempts. Please try again later."],
    ["auth/operation-not-allowed", "Email sign-up is not available right now."],
    ["signup/username-taken", "Username already exists"],
    [
      "signup/email-check-failed",
      "Couldn't check your email. Please try again.",
    ],
  ])("%s", (code, message) => {
    expect(signupErrorMessage({ code })).toBe(message);
  });

  it("falls back to the error message, then a generic message", () => {
    expect(signupErrorMessage(new Error("boom"))).toBe("boom");
    expect(signupErrorMessage({ code: "auth/unknown" })).toBe(
      "Could not create your account",
    );
    expect(signupErrorMessage(null)).toBe("Could not create your account");
  });
});

describe("createCourtChampsAccount", () => {
  const base = {
    firstName: "Mo",
    lastName: "Mia",
    username: "MoMia",
    country: "United Kingdom",
    city: "London",
    countryCode: "GB",
    handPreference: "Ambidextrous",
  };

  const authUser = () => ({
    uid: "uid-1",
    delete: jest.fn(() => Promise.resolve()),
  });

  describe("email sign-up", () => {
    it("creates the user, sends verification and saves the profile", async () => {
      const user = authUser();
      mocked(createUserWithEmailAndPassword).mockResolvedValue({ user });

      const result = await createCourtChampsAccount({
        ...base,
        email: "  Mo@Example.COM ",
        password: "secret1",
      });

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        auth,
        "mo@example.com",
        "secret1",
      );
      expect(sendEmailVerification).toHaveBeenCalledWith(user);
      expect(setDoc).toHaveBeenCalledTimes(1);
      const [ref, saved] = mocked(setDoc).mock.calls[0];
      expect(ref).toEqual({ path: "users/uid-1" });
      expect(saved).toEqual(
        expect.objectContaining({
          firstName: "Mo",
          lastName: "Mia",
          username: "MoMia",
          usernameLower: "momia",
          email: "mo@example.com",
          provider: "email_password",
          handPreference: "Ambidextrous",
          userId: "uid-1",
          profileImage: ccImageEndpoint,
          location: expect.objectContaining({
            country: "United Kingdom",
            city: "London",
            countryCode: "GB",
          }),
        }),
      );
      expect(result.isSocialSignup).toBe(false);
      expect(result.profile).toBe(saved);
    });

    it("adds the welcome notification and logs analytics", async () => {
      mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: authUser(),
      });
      await createCourtChampsAccount({
        ...base,
        email: "mo@example.com",
        password: "secret1",
      });

      expect(addDoc).toHaveBeenCalledTimes(1);
      const [ref, notification] = mocked(addDoc).mock.calls[0];
      expect(ref).toEqual({ path: "users/uid-1/notifications" });
      expect(notification).toEqual(
        expect.objectContaining({
          recipientId: "uid-1",
          type: notificationTypes.WELCOME.TYPE,
          message: notificationTypes.WELCOME.MESSAGE,
        }),
      );
      expect(AppEventsLogger.logEvent).toHaveBeenCalledWith(
        "fb_mobile_complete_registration",
        { fb_registration_method: "email" },
      );
    });

    it("still finishes when the verification email fails", async () => {
      mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: authUser(),
      });
      mocked(sendEmailVerification).mockRejectedValueOnce(new Error("quota"));

      await expect(
        createCourtChampsAccount({
          ...base,
          email: "mo@example.com",
          password: "secret1",
        }),
      ).resolves.toHaveProperty("isSocialSignup", false);
      expect(setDoc).toHaveBeenCalled();
    });

    it("still finishes when the welcome notification fails", async () => {
      mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: authUser(),
      });
      mocked(addDoc).mockRejectedValueOnce(new Error("rules"));
      await expect(
        createCourtChampsAccount({
          ...base,
          email: "mo@example.com",
          password: "secret1",
        }),
      ).resolves.toBeDefined();
    });

    it("deletes the auth user and rethrows when saving the profile fails", async () => {
      const user = authUser();
      mocked(createUserWithEmailAndPassword).mockResolvedValue({ user });
      const failure = new Error("write failed");
      mocked(setDoc).mockRejectedValueOnce(failure);

      await expect(
        createCourtChampsAccount({
          ...base,
          email: "mo@example.com",
          password: "secret1",
        }),
      ).rejects.toBe(failure);
      expect(user.delete).toHaveBeenCalledTimes(1);
      expect(addDoc).not.toHaveBeenCalled();
    });

    it("rethrows the save error even if the rollback delete fails", async () => {
      const user = authUser();
      user.delete.mockRejectedValueOnce(new Error("requires-recent-login"));
      mocked(createUserWithEmailAndPassword).mockResolvedValue({ user });
      const failure = new Error("write failed");
      mocked(setDoc).mockRejectedValueOnce(failure);

      await expect(
        createCourtChampsAccount({
          ...base,
          email: "mo@example.com",
          password: "secret1",
        }),
      ).rejects.toBe(failure);
    });

    it("rechecks the username after creating the user and rolls back if it was taken meanwhile", async () => {
      const user = authUser();
      mocked(createUserWithEmailAndPassword).mockResolvedValue({ user });
      callables.checkUsernameAvailable
        .mockResolvedValueOnce(available(true))
        .mockResolvedValueOnce(available(false));
      await expect(
        createCourtChampsAccount({
          ...base,
          email: "mo@example.com",
          password: "secret1",
        }),
      ).rejects.toMatchObject({ code: "signup/username-taken" });
      expect(callables.checkUsernameAvailable).toHaveBeenCalledTimes(2);
      expect(setDoc).not.toHaveBeenCalled();
      expect(user.delete).toHaveBeenCalledTimes(1);
    });

    it("checks the username twice on a successful sign-up", async () => {
      mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: authUser(),
      });
      await createCourtChampsAccount({
        ...base,
        email: "mo@example.com",
        password: "secret1",
      });
      expect(callables.checkUsernameAvailable).toHaveBeenCalledTimes(2);
      expect(callables.checkUsernameAvailable).toHaveBeenLastCalledWith({
        username: "MoMia",
      });
    });

    it("throws signup/username-taken before creating the auth user", async () => {
      callables.checkUsernameAvailable.mockResolvedValueOnce(available(false));
      await expect(
        createCourtChampsAccount({
          ...base,
          email: "mo@example.com",
          password: "secret1",
        }),
      ).rejects.toMatchObject({ code: "signup/username-taken" });
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
      expect(setDoc).not.toHaveBeenCalled();
    });

    it("requires a password for email sign-up", async () => {
      await expect(
        createCourtChampsAccount({ ...base, email: "mo@example.com" }),
      ).rejects.toThrow("Password is required");
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });

    it("propagates auth errors such as email-already-in-use", async () => {
      mocked(createUserWithEmailAndPassword).mockRejectedValueOnce({
        code: "auth/email-already-in-use",
      });
      await expect(
        createCourtChampsAccount({
          ...base,
          email: "mo@example.com",
          password: "secret1",
        }),
      ).rejects.toEqual({ code: "auth/email-already-in-use" });
      expect(setDoc).not.toHaveBeenCalled();
    });

    it("uploads the photo when one was picked", async () => {
      mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: authUser(),
      });
      mocked(uploadProfileImage).mockResolvedValueOnce("https://img/1.jpg");
      await createCourtChampsAccount({
        ...base,
        email: "mo@example.com",
        password: "secret1",
        photoUri: "file:///photo.jpg",
      });
      expect(uploadProfileImage).toHaveBeenCalledWith(
        "file:///photo.jpg",
        "uid-1",
      );
      expect(mocked(setDoc).mock.calls[0][1].profileImage).toBe(
        "https://img/1.jpg",
      );
    });

    it("falls back to the default image when the upload fails", async () => {
      mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: authUser(),
      });
      mocked(uploadProfileImage).mockRejectedValueOnce(new Error("storage"));
      await createCourtChampsAccount({
        ...base,
        email: "mo@example.com",
        password: "secret1",
        photoUri: "file:///photo.jpg",
      });
      expect(mocked(setDoc).mock.calls[0][1].profileImage).toBe(
        ccImageEndpoint,
      );
    });

    it("does not store a session or set the current user", async () => {
      mocked(createUserWithEmailAndPassword).mockResolvedValue({
        user: authUser(),
      });
      const setCurrentUser = jest.fn();
      await createCourtChampsAccount({
        ...base,
        email: "mo@example.com",
        password: "secret1",
        setCurrentUser,
      });
      expect(setCurrentUser).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe("social sign-up", () => {
    const socialInput = {
      ...base,
      email: "Mo@Gmail.com",
      socialId: "google-uid",
      socialProvider: "google",
    };

    it("skips auth user creation and verification and stores the session", async () => {
      mockAuth.currentUser = {
        getIdToken: jest.fn(() => Promise.resolve("token-123")),
      };
      const setCurrentUser = jest.fn();

      const result = await createCourtChampsAccount({
        ...socialInput,
        setCurrentUser,
      });

      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
      expect(sendEmailVerification).not.toHaveBeenCalled();
      const saved = mocked(setDoc).mock.calls[0][1];
      expect(mocked(setDoc).mock.calls[0][0]).toEqual({
        path: "users/google-uid",
      });
      expect(saved).toEqual(
        expect.objectContaining({
          provider: "google",
          userId: "google-uid",
          email: "mo@gmail.com",
        }),
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "userToken",
        "token-123",
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith("userId", "google-uid");
      expect(registerForPushNotificationsAsync).toHaveBeenCalledWith(
        "google-uid",
      );
      expect(setCurrentUser).toHaveBeenCalledWith(saved);
      expect(result.isSocialSignup).toBe(true);
      expect(AppEventsLogger.logEvent).toHaveBeenCalledWith(
        "fb_mobile_complete_registration",
        { fb_registration_method: "google" },
      );
    });

    describe("rollback when the profile save fails", () => {
      const signedInUser = (uid = "google-uid") => ({
        uid,
        delete: jest.fn(() => Promise.resolve()),
        getIdToken: jest.fn(() => Promise.resolve("t")),
      });

      beforeEach(async () => {
        mocked(setDoc).mockRejectedValueOnce(new Error("write failed"));
        await AsyncStorage.setItem("userToken", "t");
        await AsyncStorage.setItem("userId", "google-uid");
      });

      it("deletes a newly created user, signs out of Firebase and Google and clears the session", async () => {
        const user = signedInUser();
        mockAuth.currentUser = user;
        await expect(
          createCourtChampsAccount({ ...socialInput, socialIsNewUser: true }),
        ).rejects.toThrow("write failed");
        expect(user.delete).toHaveBeenCalledTimes(1);
        expect(mockAuth.signOut).toHaveBeenCalled();
        expect(GoogleSignin.signOut).toHaveBeenCalled();
        await expect(AsyncStorage.getItem("userToken")).resolves.toBeNull();
        await expect(AsyncStorage.getItem("userId")).resolves.toBeNull();
        expect(addDoc).not.toHaveBeenCalled();
        expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
      });

      it("keeps an existing Firebase user but still signs out", async () => {
        const user = signedInUser();
        mockAuth.currentUser = user;
        await expect(
          createCourtChampsAccount({ ...socialInput, socialIsNewUser: false }),
        ).rejects.toThrow("write failed");
        expect(user.delete).not.toHaveBeenCalled();
        expect(mockAuth.signOut).toHaveBeenCalled();
        expect(GoogleSignin.signOut).toHaveBeenCalled();
      });

      it("never deletes a different signed-in user", async () => {
        const other = signedInUser("someone-else");
        mockAuth.currentUser = other;
        await expect(
          createCourtChampsAccount({ ...socialInput, socialIsNewUser: true }),
        ).rejects.toThrow("write failed");
        expect(other.delete).not.toHaveBeenCalled();
        expect(mockAuth.signOut).toHaveBeenCalled();
      });

      it("skips Google sign-out for Apple and still rethrows if cleanup fails", async () => {
        const user = signedInUser("apple-uid");
        user.delete.mockRejectedValueOnce(new Error("requires-recent-login"));
        mockAuth.currentUser = user;
        mockAuth.signOut.mockRejectedValueOnce(new Error("offline"));
        await expect(
          createCourtChampsAccount({
            ...socialInput,
            socialId: "apple-uid",
            socialProvider: "apple",
            socialIsNewUser: true,
          }),
        ).rejects.toThrow("write failed");
        expect(user.delete).toHaveBeenCalled();
        expect(GoogleSignin.signOut).not.toHaveBeenCalled();
      });
    });

    it("email sign-up failures do not sign out or touch Google", async () => {
      const user = authUser();
      mocked(createUserWithEmailAndPassword).mockResolvedValue({ user });
      mocked(setDoc).mockRejectedValueOnce(new Error("write failed"));
      await expect(
        createCourtChampsAccount({
          ...base,
          email: "mo@example.com",
          password: "secret1",
        }),
      ).rejects.toThrow("write failed");
      expect(user.delete).toHaveBeenCalled();
      expect(GoogleSignin.signOut).not.toHaveBeenCalled();
    });

    it("signs out a social player whose username was taken during sign-up", async () => {
      const user = {
        uid: "google-uid",
        delete: jest.fn(() => Promise.resolve()),
      };
      mockAuth.currentUser = user;
      callables.checkUsernameAvailable
        .mockResolvedValueOnce(available(true))
        .mockResolvedValueOnce(available(false));
      await expect(
        createCourtChampsAccount({ ...socialInput, socialIsNewUser: true }),
      ).rejects.toMatchObject({ code: "signup/username-taken" });
      expect(setDoc).not.toHaveBeenCalled();
      expect(user.delete).toHaveBeenCalled();
      expect(mockAuth.signOut).toHaveBeenCalled();
    });

    it("skips the session when there is no signed-in user", async () => {
      const setCurrentUser = jest.fn();
      await createCourtChampsAccount({ ...socialInput, setCurrentUser });
      expect(setCurrentUser).not.toHaveBeenCalled();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });
});
