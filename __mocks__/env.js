// Stand-in for the "@env" module (react-native-dotenv) in tests.
module.exports = new Proxy(
  { __esModule: true },
  { get: (target, key) => (key in target ? target[key] : "test-env-value") },
);
