import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReact from "eslint-plugin-react";
import tsParser from "@typescript-eslint/parser";
import tseslint from "@typescript-eslint/eslint-plugin";

const ignorePatterns = [
  "node_modules/**",
  "**/node_modules/**",
  ".expo/**",
  "dist/**",
  "build/**",
  "_d_/**",
  "__drafts__/**",
  "coverage/**",
  ".git/**",
  "android/**",
  "ios/**",
  "web-build/**",
  "babel.config.js",
  "metro.config.js",
  "functions/.eslintrc.js",
  "rankingMedals/**",
  "**/*.d.ts",
  "**/*.min.js",
];

export default [
  { ignores: ignorePatterns },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        Alert: "readonly",
        Dimensions: "readonly",
        Platform: "readonly",
        StyleSheet: "readonly",
        View: "readonly",
        Text: "readonly",
        TouchableOpacity: "readonly",
        Image: "readonly",
        FlatList: "readonly",
        ScrollView: "readonly",
        TextInput: "readonly",
        ActivityIndicator: "readonly",
        Modal: "readonly",
        Button: "readonly",
        SafeAreaView: "readonly",
        Clipboard: "readonly",
        Ionicons: "readonly",
        __DEV__: "readonly",
      },
    },
    settings: {
      react: {
        version: "18.3.1",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        __DEV__: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    settings: {
      react: {
        version: "18.3.1",
      },
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    files: ["functions/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  pluginJs.configs.recommended,
  pluginReact.configs.flat.recommended,
  {
    rules: {
      "no-unused-vars": "warn",
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/display-name": "warn",
      "react/no-unescaped-entities": "warn",
      "no-undef": "warn",
      "no-dupe-keys": "warn",
      "react/jsx-no-undef": "warn",
    },
  },
  {
    ignores: [
      "dist/*",
      "node_modules/*",
      ".expo/*",
      "babel.config.js",
      "metro.config.js",
      "functions/.eslintrc.js",
      "rankingMedals/**/*",
    ],
  },
];
