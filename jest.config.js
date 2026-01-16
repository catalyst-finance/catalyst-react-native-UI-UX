/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        skipLibCheck: true,
        noEmit: true,
      },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  // Ignore React Native specific modules that won't work in Node
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '<rootDir>/src/tests/__mocks__/async-storage.ts',
    '^@react-native-community/netinfo$': '<rootDir>/src/tests/__mocks__/netinfo.ts',
  },
  // Set up global variables
  globals: {
    __DEV__: true,
  },
};
