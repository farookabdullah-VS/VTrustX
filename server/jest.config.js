module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['./src/test/setup.js'],
  testTimeout: 15000,
  forceExit: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/scripts/**',
    '!src/config/**',
    '!src/test/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
