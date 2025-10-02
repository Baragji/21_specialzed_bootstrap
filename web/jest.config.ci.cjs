/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testMatch: ['**/src/tests/**/*.spec.ts', '**/src/tests/**/*.spec.tsx'],
  setupFilesAfterEnv: ['<rootDir>/src/tests/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.jest.json' }
    ]
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json-summary','text','lcov'],
  collectCoverageFrom: ['src/**/*.ts', 'src/**/*.tsx'],
  coverageThreshold: {
    global: { lines: 98, statements: 98, functions: 98, branches: 95 }
  }
};
