module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  setupFiles: ['./src/test/setup.js'],
  globalTeardown: './src/test/teardown.js',
  testTimeout: 15000,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/scripts/**',
    '!src/config/**',
    '!src/test/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
