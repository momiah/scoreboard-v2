// Jest is used for two layers:
//  • pure-logic helper tests (helpers/**/*.test.js) — no React, run as-is;
//  • integration tests that render screens / exercise services with mocks.
// The jest-expo preset gives us the React Native transform + native-module
// mocks; babel.config.js (babel-preset-expo + the @shared module-resolver)
// still drives the actual transform.
module.exports = {
  preset: "jest-expo",
  setupFiles: ["<rootDir>/test/jest.setup.js"],
  moduleNameMapper: {
    "^@env$": "<rootDir>/test/mocks/env.js",
    "^@shared$": "<rootDir>/node_modules/courtchamps-shared/dist",
    "^@shared/(.*)$": "<rootDir>/node_modules/courtchamps-shared/dist/$1",
    "^@/(.*)$": "<rootDir>/$1",
  },
  // Rely on the jest-expo preset's own transformIgnorePatterns (it already
  // transforms expo-modules-core, react-native, etc.). courtchamps-shared ships
  // compiled CJS, so it needs no transform.
  testPathIgnorePatterns: ["/node_modules/", "/functions/", "/e2e/", "/.maestro/"],
};
