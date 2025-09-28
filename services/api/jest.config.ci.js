/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['json-summary','text','lcov'],
  coverageThreshold: {
    global: { lines: 98, statements: 98, functions: 98, branches: 90 }
  }
};
