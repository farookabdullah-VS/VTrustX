// Test environment setup
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-do-not-use-in-production';
process.env.DB_ENCRYPTION_KEY = 'test-encryption-key-do-not-use-in-production';
process.env.CSRF_SECRET = 'test-csrf-secret';
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_NAME = 'test_db';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
