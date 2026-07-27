// @react-native-community/toolbar-android is pulled in transitively by
// expo-image-crop -> react-native-vector-icons@6.7.0. Nothing in the app
// uses ToolbarAndroid (RN removed the component years ago), and the
// package's Java no longer compiles against RN 0.81's Fresco. Exclude its
// Android native module from autolinking.
module.exports = {
  dependencies: {
    "@react-native-community/toolbar-android": {
      platforms: {
        android: null,
      },
    },
  },
};
