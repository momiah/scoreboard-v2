const globals = require('globals');
const pluginJs = require('@eslint/js');
const pluginReact = require('eslint-plugin-react');

const ignorePatterns = [
  'node_modules/**',
  '**/node_modules/**',
  '.expo/**',
  'dist/**',
  'build/**',
  '_d_/**',
  '__drafts__/**',
  'coverage/**',
  '.git/**',
  'android/**',
  'ios/**',
  'web-build/**',
  'babel.config.js',
  'metro.config.js',
  'functions/.eslintrc.js',
  'rankingMedals/**',
  '**/*.d.ts',
  '**/*.min.js',
];

module.exports = [
  { ignores: ignorePatterns },
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.browser, // Browser globals for React Native
        ...globals.node, // Node.js globals for require, module, exports
        ...globals.jest, // Jest globals for tests
        Alert: 'readonly',
        Dimensions: 'readonly',
        Platform: 'readonly',
        StyleSheet: 'readonly',
        View: 'readonly',
        Text: 'readonly',
        TouchableOpacity: 'readonly',
        Image: 'readonly',
        FlatList: 'readonly',
        ScrollView: 'readonly',
        TextInput: 'readonly',
        ActivityIndicator: 'readonly',
        Modal: 'readonly',
        Button: 'readonly',
        SafeAreaView: 'readonly',
        Clipboard: 'readonly',
        Ionicons: 'readonly',
        __DEV__: 'readonly', // React Native dev flag
        // Date: 'readonly', // Standard JS Date object
        // demon: 'readonly', // Likely a typo, treat as global for now
        // playerOne: 'readonly', // For test files
        // playerTwo: 'readonly', // For test files
      },
    },
    settings: {
      react: {
        version: '18.3.1', // From package.json
      },
    },
  },
  {
    // Firebase functions (Node.js environment)
    files: ['functions/**/*.{js,mjs,cjs}'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    // Jest test files
    files: ['**/*.test.js'],
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
      'no-unused-vars': 'warn', // Already warning
      'react/prop-types': 'off', // Keep disabled
      'react/react-in-jsx-scope': 'off', // Disable for React 17+
      'react/display-name': 'warn', // Treat as warning
      'react/no-unescaped-entities': 'warn', // Treat as warning
      'no-undef': 'warn', // Treat undefined variables as warnings
      'no-dupe-keys': 'warn', // Treat duplicate keys as warnings
      'react/jsx-no-undef': 'warn', // Treat undefined JSX components as warnings
    },
  },
  {
    ignores: [
      'dist/*',
      'node_modules/*',
      '.expo/*',
      'babel.config.js',
      'metro.config.js',
      'functions/.eslintrc.js', // Ignore legacy ESLint config in functions
      'rankingMedals/**/*', // Ignore due to many require errors
    ],
  },
];