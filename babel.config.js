module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "react-native-reanimated/plugin",
      ["module:react-native-dotenv", {
        moduleName: "@env", // This will be the module you import from in your code
        path: ".env",        // Path to your .env file
      }],
    ],
  };
};
