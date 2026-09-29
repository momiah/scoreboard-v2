// Global test setup for integration tests. Keep this lean — per-test mocks live
// in the test files themselves.

// Silence the noisy native animation warning some RN components emit under jsdom.
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper", () => ({}), {
  virtual: true,
});
