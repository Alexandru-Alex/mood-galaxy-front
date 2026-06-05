module.exports = {
  preset: 'jest-expo',
  clearMocks: true,
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  testPathIgnorePatterns: ['/node_modules/', '/.worktrees/'],
  moduleNameMapper: {
    '^@/.*\\.css$': '<rootDir>/src/__mocks__/style-mock.js',
    '\\.css$': '<rootDir>/src/__mocks__/style-mock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-native-reanimated$': '<rootDir>/src/__mocks__/react-native-reanimated.js',
    '^react-native-reanimated/mock$': '<rootDir>/src/__mocks__/react-native-reanimated-mock-stub.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-worklets)',
  ],
};
