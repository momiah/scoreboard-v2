import globals from "globals";
import js from "@eslint/js";
import react from "eslint-plugin-react";
import tsParser from "@typescript-eslint/parser";
import tseslint from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: [
      "node_modules/**",
      ".expo/**",
      "dist/**",
      "build/**",
      "coverage/**",
      ".git/**",
      "android/**",
      "ios/**",
      "web-build/**",
      "babel.config.js",
      "metro.config.js",
      "**/*.d.ts",
    ],
  },

  // --------------------
  // JavaScript / JSX
  // --------------------
  {
    files: ["**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        __DEV__: "readonly",
      },
    },
    plugins: {
      react,
    },
    rules: {
      ...js.configs.recommended.rules,

      // 🟡 unused vars = warning
      "no-unused-vars": "warn",

      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },

  // --------------------
  // TypeScript / TSX
  // --------------------
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true },
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
      react,
    },
    rules: {
      ...tseslint.configs.recommended.rules,

      // 🔥 disable base rule
      "no-unused-vars": "off",

      // 🟡 TS unused vars = warning
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],

      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
    },
  },

  react.configs.flat.recommended,
  {
    rules: {
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react/jsx-uses-react": "off",
      "react/display-name": "warn",
      "react/no-unescaped-entities": "warn",
    },
  },
];
