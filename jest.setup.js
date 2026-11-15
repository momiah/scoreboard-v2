// Global mocks for native modules and Firebase so screens render in Jest.

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("firebase/auth", () => ({
  createUserWithEmailAndPassword: jest.fn(),
  sendEmailVerification: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInWithCredential: jest.fn(),
  fetchSignInMethodsForEmail: jest.fn(),
  getAdditionalUserInfo: jest.fn(() => ({ isNewUser: false })),
  GoogleAuthProvider: { credential: jest.fn(() => ({})) },
  OAuthProvider: jest.fn().mockImplementation(() => ({
    credential: jest.fn(() => ({})),
  })),
  initializeAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(),
  getAuth: jest.fn(() => ({})),
  onAuthStateChanged: jest.fn(() => () => {}),
}));

jest.mock("firebase/firestore", () => ({
  collection: jest.fn((...path) => ({ path: path.slice(1).join("/") })),
  doc: jest.fn((...path) => ({ path: path.slice(1).join("/") })),
  query: jest.fn((ref, ...constraints) => ({ ref, constraints })),
  where: jest.fn((field, op, value) => ({ field, op, value })),
  getDocs: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn(() => () => {}),
  getFirestore: jest.fn(() => ({})),
}));

jest.mock("./services/firebase.config", () => ({
  auth: { currentUser: null, signOut: jest.fn(() => Promise.resolve()) },
  db: {},
  storage: {},
}));

jest.mock("./services/pushNotifications", () => ({
  registerForPushNotificationsAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("./utils/ProfileImageUploadToFirebase", () => ({
  uploadProfileImage: jest.fn(),
}));

jest.mock("react-native-fbsdk-next", () => ({
  AppEventsLogger: {
    logEvent: jest.fn(),
    AppEvents: {
      CompletedRegistration: "fb_mobile_complete_registration",
      Login: "fb_mobile_login",
    },
    AppEventParams: { RegistrationMethod: "fb_registration_method" },
  },
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signOut: jest.fn(() => Promise.resolve()),
    signIn: jest.fn(),
  },
}));

jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock("expo-image-picker", () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: "jpeg" },
}));

jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation(() => ({ size: 0 })),
}));

jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  const navigation = {
    navigate: jest.fn(),
    reset: jest.fn(),
    goBack: jest.fn(),
    canGoBack: jest.fn(() => false),
  };
  return {
    ...actual,
    __mockNavigation: navigation,
    useNavigation: () => navigation,
    useFocusEffect: jest.fn(),
  };
});

// Plain icons: the real ones load fonts asynchronously and trigger act() warnings.
jest.mock("@expo/vector-icons", () => {
  const { Text } = require("react-native");
  const Icon = ({ name }) => require("react").createElement(Text, null, name);
  return new Proxy({}, { get: () => Icon });
});
jest.mock("@expo/vector-icons/Ionicons", () => {
  const { Text } = require("react-native");
  return ({ name }) => require("react").createElement(Text, null, name);
});

// Callables resolve "available" unless a test overrides them via
// require("firebase/functions").__callables[name].
jest.mock("firebase/functions", () => {
  const callables = {
    checkEmailAvailable: jest.fn(() =>
      Promise.resolve({ data: { available: true } }),
    ),
    checkUsernameAvailable: jest.fn(() =>
      Promise.resolve({ data: { available: true } }),
    ),
  };
  return {
    __callables: callables,
    getFunctions: jest.fn(() => ({})),
    httpsCallable: jest.fn((_functions, name) => (data) => {
      const fn = callables[name];
      if (!fn) return Promise.reject(new Error(`No mock for ${name}`));
      return fn(data);
    }),
  };
});

// Native App Check (react-native-firebase) only exists in native builds.
jest.mock(
  "@react-native-firebase/app",
  () => ({ getApp: jest.fn(() => ({ name: "[DEFAULT]" })) }),
  { virtual: true },
);
jest.mock(
  "@react-native-firebase/app-check",
  () => ({
    ReactNativeFirebaseAppCheckProvider: jest.fn().mockImplementation(() => ({
      configure: jest.fn(),
    })),
    initializeAppCheck: jest.fn(() => Promise.resolve({})),
    getToken: jest.fn(() => Promise.resolve({ token: "app-check-token" })),
  }),
  { virtual: true },
);
jest.mock("firebase/app-check", () => ({
  initializeAppCheck: jest.fn(),
  CustomProvider: jest.fn().mockImplementation((options) => ({ options })),
}));
jest.mock("firebase/app", () => ({
  getApp: jest.fn(() => ({ name: "[DEFAULT]" })),
  initializeApp: jest.fn(() => ({})),
}));
