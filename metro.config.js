const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Firebase JS SDK v10 + Metro 0.83 (RN 0.81): package exports resolution
// loads firebase/app without firing the firebase/auth component registration.
// Disabling package exports restores the resolution order that registers auth.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
