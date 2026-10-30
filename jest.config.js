/** Jest config: jest-expo preset so React Native components can be rendered. */
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/jest.setup.js"],
  moduleNameMapper: {
    "^@shared$": "<rootDir>/node_modules/courtchamps-shared/dist",
    "^@shared/(.*)$": "<rootDir>/node_modules/courtchamps-shared/dist/$1",
    "^@/(.*)$": "<rootDir>/$1",
    "^@env$": "<rootDir>/__mocks__/env.js",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|styled-components|moti|@motify/.*|courtchamps-shared|@gorhom/.*|react-native-.*))",
  ],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/functions/",
    "/__tests__/.*/testUtils\\.tsx$",
  ],
};
