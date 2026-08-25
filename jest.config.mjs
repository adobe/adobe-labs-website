export default {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
  testMatch: [
    '**/?(*.)+(test).[j]s?(x)',
  ],
  verbose: true,
};
